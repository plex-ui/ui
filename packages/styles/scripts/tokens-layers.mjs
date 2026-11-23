// @ts-check
/**
 * Reads the CSS token files into token layers (see build-tokens.mjs). Shared with tests/tokens, which checks the
 * generated file against the CSS.
 */

/**
 * The token files in cascade order. `layered` files sit in `@layer theme`; the others are unlayered and win over it.
 * touch.css imports mobile-surfaces.css and mobile-materials.css before its own rules.
 */
export const TOKEN_FILES = [
  { file: "variables-tailwind-theme.css", layered: true },
  { file: "variables-primitive.css", layered: true },
  { file: "variables-semantic.css", layered: true },
  { file: "variables-components.css", layered: true },
  { file: "variables-tokens-root.css", layered: false },
  { file: "mobile-surfaces.css", layered: false },
  { file: "mobile-materials.css", layered: false },
  { file: "touch.css", layered: false },
]

/** A phone in portrait: below 414px wide, so the wide-phone layer does not apply. */
export const DEFAULT_CONTEXT = { width: 393, highDensity: true, reducedMotion: false }

const ROOT_SELECTORS = new Map([
  // selector (whitespace collapsed) -> [specificity, condition]
  [":root, :where([data-theme])", [[0, 1, 0], {}]],
  [":root", [[0, 1, 0], {}]],
  [":where(:root), :where([data-theme=\"light\"])", [[0, 0, 0], {}]],
  [":where([data-theme=\"dark\"])", [[0, 0, 0], { scheme: "dark" }]],
  ["html:root", [[0, 1, 1], {}]],
  ["@theme static", [[0, 1, 0], {}]],
])

const MEDIA = new Map([
  ["(resolution >= 150dpi), (resolution >= 1.5dppx)", { highDensity: true }],
  ["(prefers-reduced-motion: reduce)", { reducedMotion: true }],
  ["(max-width: 767px)", { maxWidth: 767 }],
  ["(min-width: 414px) and (max-width: 767px)", { minWidth: 414, maxWidth: 767 }],
  ["(max-width: 575px)", { maxWidth: 575 }],
])

/**
 * @param {typeof import("postcss").default} postcss
 * @param {(file: string) => string} read
 */
export function buildLayers(postcss, read) {
  /** @type {Map<string, any>} */
  const layers = new Map()
  let skipped = 0
  let order = 0
  // A run of declarations under one condition: a rule that comes back after another one starts a new layer, so
  // that source order between them holds as in the cascade
  let run = ""
  /** @type {Map<string, number>} */
  const runs = new Map()
  for (const { file, layered } of TOKEN_FILES) {
    const root = postcss.parse(read(file))
    root.walkDecls(/^--/, (decl) => {
      order++
      /** @type {{ condition: Record<string, unknown>, specificity: number[] | undefined, ok: boolean }} */
      const state = { condition: {}, specificity: undefined, ok: true }
      const chain = []
      for (let node = decl.parent; node && node.type !== "root"; node = node.parent) chain.unshift(node)
      for (const node of chain) {
        if (node.type === "atrule" && node.name === "layer" && node.params === "theme" && layered) continue
        if (node.type === "atrule" && node.name === "theme" && node.params === "static") {
          state.specificity = ROOT_SELECTORS.get("@theme static")?.[0]
          continue
        }
        if (node.type === "atrule" && node.name === "media" && MEDIA.has(node.params)) {
          Object.assign(state.condition, MEDIA.get(node.params))
          continue
        }
        // The springs as linear(): a layer of their own, which platforms without CSS easing leave out (resolve.ts)
        if (node.type === "atrule" && node.name === "supports" && node.params === "(transition-timing-function: linear(0, 1))") {
          state.condition.linearEasing = true
          continue
        }
        if (node.type === "rule") {
          const selector = node.selector.replace(/\s+/g, " ").trim()
          const known = ROOT_SELECTORS.get(selector)
          if (known && state.specificity === undefined) {
            state.specificity = known[0]
            Object.assign(state.condition, known[1])
            continue
          }
        }
        state.ok = false
      }
      // `--font-weight-*: initial` resets Tailwind's namespace; `initial` declares nothing on a custom property
      if (!state.ok || !state.specificity || decl.prop.includes("*") || decl.value.trim() === "initial") {
        if (!decl.prop.includes("*") && decl.value.trim() !== "initial") skipped++
        return
      }
      const condition = Object.keys(state.condition).length ? state.condition : undefined
      const id = [file.replace(/\.css$/, ""), ...Object.entries(condition ?? {}).map(([k, v]) => `${k}=${v}`)].join(":") + `@${state.specificity.join("")}`
      if (id !== run) {
        run = id
        runs.set(id, (runs.get(id) ?? 0) + 1)
      }
      const n = runs.get(id) ?? 1
      const key = n > 1 ? `${id}#${n}` : id
      let layer = layers.get(key)
      if (!layer) {
        layer = { id: key, source: file, rank: layered ? 0 : 1, specificity: state.specificity, order, ...(condition ? { when: condition } : {}), tokens: {} }
        layers.set(key, layer)
      }
      // Later declarations of the same name in one layer win, as in CSS
      delete layer.tokens[decl.prop]
      layer.tokens[decl.prop] = normalizeValue(decl.value)
    })
  }
  return { layers: [...layers.values()], skipped }
}

/** The value as the browser keeps it: comments out, whitespace collapsed. */
export function normalizeValue(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Resolves every token of the layers for a context, in light and dark.
 * @param {any[]} layers
 * @param {{ width: number, highDensity: boolean, reducedMotion: boolean }} context
 */
export async function resolveAll(layers, context) {
  const { createTokenResolver } = await import("../src/tokens/resolve.ts")
  const resolver = createTokenResolver(layers, context)
  return { light: resolver.all("light"), dark: resolver.all("dark") }
}
