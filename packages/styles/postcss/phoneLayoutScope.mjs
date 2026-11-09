// @ts-check

/**
 * A phone layout without a narrow window (plan 176). The rules of the phone media queries (767px and below) also
 * apply inside an element marked `data-plex-layout="phone"` (PhoneLayout, or a dialog laid out as on a phone), and
 * the rules of the desktop queries (768px and up) do not apply there.
 *
 * Runs after postcss-nested, on flat rules. A copy keeps the specificity of its rule (the scope sits in `:where()`),
 * and follows its media rule, so the cascade inside the scope is the one a narrow window has.
 */

export const PHONE_SCOPE = '[data-plex-layout="phone"]'

const PHONE_FEATURE = /^\(\s*(?:max-width\s*:\s*767(?:\.98)?px|width\s*<=?\s*767(?:\.98)?px)\s*\)$/i
const DESKTOP_FEATURE = /^\(\s*(?:min-width\s*:\s*768px|width\s*>=\s*768px)\s*\)$/i
const MEDIA_TYPE = /^(?:only\s+)?(?:screen|all)$/i
const ROOT_COMPOUND = /^(?::root|html|body)(?=$|[\s>+~.[:#])((?:\[[^\]]*\]|:[\w-]+(?:\([^)]*\))?|\.[\w-]+)*)/

/** Splits on commas outside parentheses and brackets. */
const splitList = (value) => {
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index++) {
    const char = value[index]
    if (char === "(" || char === "[") depth++
    else if (char === ")" || char === "]") depth--
    else if (char === "," && depth === 0) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

/**
 * What the copy of a media rule keeps of its queries once the phone condition is taken out: `true` for none (the
 * copy applies whenever the scope does), the remaining conditions, or `null` when no query is a phone one.
 * @param {string} params
 * @returns {true | string | null}
 */
export const phoneCondition = (params) => {
  const kept = []
  for (const query of splitList(params)) {
    const features = query.split(/\s+and\s+/i).map((part) => part.trim())
    if (!features.some((feature) => PHONE_FEATURE.test(feature))) continue
    const rest = features.filter((feature) => !PHONE_FEATURE.test(feature) && !MEDIA_TYPE.test(feature))
    if (rest.some((feature) => /width/i.test(feature))) continue // another width range: not known inside a frame
    if (!rest.length) return true
    kept.push(rest.join(" and "))
  }
  return kept.length ? kept.join(", ") : null
}

/** @param {string} params */
export const isDesktopMedia = (params) =>
  splitList(params).every((query) => query.split(/\s+and\s+/i).some((feature) => DESKTOP_FEATURE.test(feature.trim())))

/**
 * The selector for elements inside the scope: after a leading `:root`, `html` or `body` (and what it carries), so
 * tokens set on the root are set on the scope instead, or before the selector.
 * @param {string} selector
 */
export const scopeSelector = (selector) => {
  const root = ROOT_COMPOUND.exec(selector)
  if (root) {
    const rest = selector.slice(root[0].length).trim()
    return `${root[0]} :where(${PHONE_SCOPE})${rest ? ` ${rest}` : ""}`
  }
  return `:where(${PHONE_SCOPE}) ${selector}`
}

/**
 * The selector for elements outside the scope: its subject (before any pseudo-element) is not the scope or in it.
 * @param {string} selector
 */
export const unscopeSelector = (selector) => {
  const exclusion = `:not(:where(${PHONE_SCOPE}, ${PHONE_SCOPE} *))`
  const pseudo = selector.search(/::[\w-]+(?:\([^)]*\))?$/)
  return pseudo === -1 ? `${selector}${exclusion}` : `${selector.slice(0, pseudo)}${exclusion}${selector.slice(pseudo)}`
}

const inKeyframes = (rule) => {
  for (let node = rule.parent; node; node = node.parent) {
    if (node.type === "atrule" && /keyframes$/i.test(node.name)) return true
  }
  return false
}

/** @type {import('postcss').PluginCreator<void>} */
export default function phoneLayoutScope() {
  return {
    postcssPlugin: "plexui/components/postcss-phone-layout-scope",
    OnceExit(root, { AtRule }) {
      /** @type {import('postcss').AtRule[]} */
      const media = []
      root.walkAtRules("media", (rule) => {
        media.push(rule)
      })
      for (const rule of media) {
        // A phone rule inside another phone rule is copied with its outer one
        let outer = rule.parent
        let nested = false
        for (; outer; outer = outer.parent) {
          if (outer.type === "atrule" && outer.name === "media" && phoneCondition(outer.params) !== null) nested = true
        }
        const condition = phoneCondition(rule.params)
        if (condition !== null && !nested) {
          const copy = rule.clone()
          copy.walkRules((inner) => {
            if (inKeyframes(inner)) return
            inner.selectors = inner.selectors.map(scopeSelector)
          })
          // A media rule nested in the phone one is copied whole; its own phone condition, if any, is the scope's
          copy.walkAtRules("media", (inner) => {
            const innerCondition = phoneCondition(inner.params)
            if (innerCondition === true) inner.replaceWith(inner.nodes ?? [])
            else if (innerCondition !== null) inner.params = innerCondition
          })
          if (condition === true) rule.after(copy.nodes ?? [])
          else rule.after(new AtRule({ name: "media", params: condition, nodes: copy.nodes ?? [] }))
        } else if (isDesktopMedia(rule.params)) {
          rule.walkRules((inner) => {
            if (inKeyframes(inner)) return
            inner.selectors = inner.selectors.map(unscopeSelector)
          })
        }
      }
    },
  }
}

phoneLayoutScope.postcss = true
