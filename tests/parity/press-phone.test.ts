import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, test } from "vitest"

// One press per kind of element on a phone, as iOS 27.2 highlights them (console 15.11, ref-app press): a row of a list
// fills to its corners in systemGray4 and keeps its words; a borderless button only lightens its label; a filled,
// tinted, gray or outline button lightens or fades without scaling.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

/** The declarations of the phone-media rule for `selector` (nested rules flattened by their `&`) */
const phoneDecls = (path: string, selector: string) => {
  const decls: Record<string, string> = {}
  postcss.parse(read(path)).walkRules((rule) => {
    let parent = rule.parent
    let inPhone = false
    let full = rule.selector
    while (parent) {
      if (parent.type === "rule") full = full.includes("&") ? full.replace(/&/g, (parent as postcss.Rule).selector) : full
      if (parent.type === "atrule" && (parent as postcss.AtRule).name === "media" && (parent as postcss.AtRule).params === "(max-width: 767px)") inPhone = true
      parent = parent.parent as typeof parent
    }
    if (!inPhone || full.replace(/\s+/g, " ") !== selector) return
    rule.each((node) => { if (node.type === "decl") decls[node.prop] = node.value.replace(/\s+/g, " ") })
  })
  return decls
}

const button = "packages/styles/src/components/Button/Button.module.css"
const fieldGroup = "packages/styles/src/components/FieldGroup/FieldGroup.module.css"
const enabled = ':not([data-mobile-material="glass"], [data-mobile-material="clear"], [data-disabled])'

describe("press on a phone", () => {
  test("no button scales; its label lightens 30% toward white in light and 22% in dark, at once", () => {
    const press = phoneDecls(button, `.Button[data-variant]${enabled}:active`)
    expect(press.color).toContain("#fff calc(30% * (1 - var(--button-mobile-material-opacity, 0)))")
    expect(press.color).toContain("#fff calc(22% * (1 - var(--button-mobile-material-opacity, 0)))")
    expect(press["transition-duration"]).toBe("0s")
    // Its layers never take a transform on a phone, nor declare a transition for one (M5): a press starts none
    const layers = '.Button.Button[data-variant]:not([data-mobile-material="glass"], [data-mobile-material="clear"])'
    const both = phoneDecls(button, `${layers}::before, ${layers}::after`)
    expect(both.transform).toBe("none")
    expect(both["transition-property"]).not.toContain("transform")
    expect(phoneDecls(button, `${layers}::after`)["transition-property"]).toBe("none")
  })

  test("a ghost button draws no capsule, a soft or outline one fades its fill, a solid one lightens it", () => {
    expect(phoneDecls(button, `.Button[data-variant="ghost"]${enabled}:active::before`).opacity).toBe("var(--button-press-fill-opacity, var(--button-mobile-material-opacity, 0))")
    expect(phoneDecls(button, `.Button:is([data-variant="soft"], [data-variant="outline"])${enabled}:active::before`).opacity).toBe("var(--button-press-fill-opacity, calc(0.7 + 0.3 * var(--button-mobile-material-opacity, 0)))")
    expect(phoneDecls(button, `.Button[data-variant="solid"]${enabled}:active::before`)["background-color"]).toContain("var(--button-background-color), #fff 30%")
  })

  test("a list row fills in systemGray4 to the card's corners, keeps its words, and is never a pill", () => {
    const row = '.Body > [data-row] > :is(button, a)[data-block][data-variant="ghost"], .Body > [data-sortable] > [data-row] > :is(button, a)[data-block][data-variant="ghost"], .Body > [data-row] > [data-swipe-content] > :is(button, a)[data-block][data-variant="ghost"], .Body > [data-sortable] > [data-row] > [data-swipe-content] > :is(button, a)[data-block][data-variant="ghost"]'
    const press = phoneDecls(fieldGroup, row)
    expect(press["--button-background-color-active"]).toBe("var(--field-row-press-background)")
    expect(press["--button-press-fill-opacity"]).toBe("1")
    expect(press["--button-press-text-color"]).toBe("var(--button-text-color)")
    expect(read("packages/styles/src/styles/variables-components.css")).toMatch(/--field-row-press-background: light-dark\(var\(--alpha-20\), var\(--alpha-12\)\)/)
    expect(read(fieldGroup)).toMatch(/--button-touch-radius: 0px;[^}]*--button-radius: 0px;\s*--control-gutter-pill-scaling: 1;/)
  })

  test("a choice row lights as a list row, a switch row does not", () => {
    const css = read("packages/styles/src/components/Field/Field.module.css")
    const rule = css.slice(css.indexOf("/* A held choice row"), css.indexOf("/* Mobile choice rows keep keyboard focus"))
    expect(rule).toMatch(/&:active:not\(:has\([^{]*\) \{\s*background: var\(--field-row-press-background\);\s*transition-duration: 0s;/)
    expect(rule.slice(rule.indexOf(".Field"))).not.toContain('role="switch"')
  })
})

describe("FieldGroup header and ColorWell xs (console 15.11)", () => {
  test("a header's action stands centred and overflows its line, so it never sets the header's height", () => {
    const css = read(fieldGroup)
    expect(css).toMatch(/\.Header > :not\(\.HeaderText\) \{\s*align-self: center;\s*margin-block: calc\(-1 \* var\(--field-group-header-action-overflow, 8px\)\);/)
    expect(css).toMatch(/\.Header > button\[data-variant="ghost"\]:not\(\[data-uniform\]\) \{[^}]*align-self: flex-end;/)
  })

  test("ColorWell has an xs of 24px", () => {
    expect(read("packages/styles/src/styles/variables-components.css")).toMatch(/--color-well-size-xs: 24px;/)
    expect(read("packages/styles/src/components/ColorPicker/ColorPicker.module.css")).toMatch(/&\[data-size="xs"\] \{\s*--color-well-size: var\(--color-well-size-xs\);/)
  })
})
