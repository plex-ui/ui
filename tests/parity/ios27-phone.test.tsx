import { readFileSync } from "node:fs"
import { createElement, type ComponentType } from "react"
import postcss from "postcss"
import { describe, expect, test } from "vitest"
import { h } from "vue"
import { FloatingLabelInput as RFloatingLabelInput } from "../../packages/ui/src/components/FloatingLabelInput"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { FloatingLabelInput } from "../../packages/vue/src/components/FloatingLabelInput"
import { Input } from "../../packages/vue/src/components/Input"
import { renderPair } from "./pair"

// Plan 163: the phone rules taken from the iOS 27 kit (text field clear, empty state, slider label row, sheet title).
// jsdom does not evaluate media queries; the contract is read from the source rules a phone applies.

type Props = Record<string, unknown>
const read = (path: string) => readFileSync(path, "utf8")
const touch = read("packages/styles/src/styles/touch.css")
const noop = () => {}

/** The rules a phone applies (either spelling of the phone query), by selector as written (a nested query keeps its parent's relative selectors). */
const phoneRules = (path: string) => {
  const rules = new Map<string, postcss.Rule>()
  postcss.parse(read(path)).walkAtRules("media", (media) => {
    if (["(max-width: 767px)", "(max-width: 767.98px)", "(width <= 767px)"].includes(media.params)) media.walkRules((rule) => { rules.set(rule.selector, rule) })
  })
  return rules
}
/** The rules outside any media query, by selector. */
const baseRules = (path: string) => {
  const rules = new Map<string, postcss.Rule>()
  postcss.parse(read(path)).walkRules((rule) => {
    let parent = rule.parent
    while (parent && parent.type !== "root") { if (parent.type === "atrule") return; parent = parent.parent }
    rules.set(rule.selector, rule)
  })
  return rules
}
const decls = (rule: postcss.Rule | undefined) =>
  Object.fromEntries((rule?.nodes ?? []).filter((n): n is postcss.Declaration => n.type === "decl").map((d) => [d.prop, d.value]))

describe("the clear button of a phone text field (kit iOS 27 Text Fields 5433:15635)", () => {
  test("Input and FloatingLabelInput render the desktop cross and the phone circle, the same in React and Vue", async () => {
    const pairs: [string, ReturnType<typeof createElement>, () => ReturnType<typeof h>][] = [
      ["Input", createElement(RInput as ComponentType<Props>, { value: "plex", onChange: noop, onClear: noop }), () => h(Input as never, { value: "plex", onClear: noop })],
      ["FloatingLabelInput", createElement(RFloatingLabelInput, { label: "Search", defaultValue: "plex", onClear: noop }), () => h(FloatingLabelInput as never, { label: "Search", defaultValue: "plex", onClear: noop })],
    ]
    for (const [name, react, vue] of pairs) {
      const out = await renderPair(react, vue)
      expect(out.vue, name).toBe(out.react)
      const clear = out.react.slice(out.react.indexOf('aria-label="Clear input"'))
      expect(clear, name).toMatch(/class="ClearIcon"[\s\S]*class="ClearPhoneIcon"/)
    }
  })

  test("Input: the circle replaces the cross and the soft face on a phone, concentric with the field's end", () => {
    expect(decls(baseRules("packages/styles/src/components/Input/Input.module.css").get("> .ClearPhoneIcon"))).toEqual({ display: "none" })
    const rules = phoneRules("packages/styles/src/components/Input/Input.module.css")
    expect(decls(rules.get(".Clear::before,\n  .Clear > .ClearIcon"))).toEqual({ display: "none" })
    expect(decls(rules.get(".Clear > .ClearPhoneIcon"))).toEqual({
      display: "block",
      width: "calc(var(--input-clear-glyph-size, 17px) * 1.2)",
      height: "calc(var(--input-clear-glyph-size, 17px) * 1.2)",
      color: "var(--input-clear-glyph-color, var(--mobile-label-tertiary, var(--color-text-tertiary)))",
    })
    expect(decls(rules.get(".Container > .Clear:last-child"))).toEqual({
      "margin-right": "calc(var(--input-size) / 2 - var(--input-clear-target-size, var(--input-clear-size)) / 2 - var(--input-gutter))",
    })
    // A row puts it 10px inside the row's 16px inset: 26px from the row's edge, as the kit does, with the label
    // beside, above or hidden (plan 169c: a placeholder cell is a vertical row). Its 44px target does not grow the row.
    expect(decls(rules.get(':where([data-row]) .Container > .Clear.Clear:last-child'))).toEqual({
      "margin-right": "calc(10px - var(--input-clear-target-size, var(--input-clear-size)) / 2)",
      "margin-block": "calc((var(--input-size) - var(--input-clear-target-size, var(--input-clear-size))) / 2)",
    })
    expect(touch).toContain("--input-clear-target-size: 44px;")
  })

  test("FloatingLabelInput: the circle centred half the field height from its end", () => {
    const rules = phoneRules("packages/styles/src/components/FloatingLabelInput/FloatingLabelInput.module.css")
    expect(decls(rules.get(".ClearIcon"))).toEqual({ display: "none" })
    expect(decls(baseRules("packages/styles/src/components/FloatingLabelInput/FloatingLabelInput.module.css").get(".ClearPhoneIcon"))).toEqual({ display: "none" })
    expect(decls(rules.get(".ClearPhoneIcon"))).toEqual({
      display: "block",
      width: "calc(var(--floating-input-clear-glyph-size, 17px) * 1.2)",
      height: "calc(var(--floating-input-clear-glyph-size, 17px) * 1.2)",
      color: "var(--floating-input-clear-glyph-color, var(--mobile-label-tertiary, var(--color-text-tertiary)))",
    })
    expect(decls(rules.get(".ClearButton:last-child"))).toEqual({
      "margin-inline-end": "calc(var(--floating-input-height) / 2 - var(--floating-input-clear-size, 1em) / 2 - var(--floating-input-gutter) - 1px)",
    })
  })

  test("a filled field shows its caret, not a ring, while it is edited", () => {
    expect(touch).toContain("--input-soft-border-color-focus: transparent;")
  })
})

describe("EmptyMessage on a phone (kit iOS 27 Empty States 5583:24408)", () => {
  test("22/26 semibold message and 22/26 medium description with no gap, 36px insets and 16px more for the text", () => {
    for (const token of [
      "--empty-message-title-size: 22px;", "--empty-message-title-leading: 26px;", "--empty-message-title-gap: 0px;",
      "--empty-message-title-weight: var(--font-weight-semibold);", "--empty-message-description-size: 22px;",
      "--empty-message-description-leading: 26px;", "--empty-message-description-weight: var(--font-weight-medium);",
      "--empty-message-padding-inline: 36px;", "--empty-message-text-inset: 16px;", "--empty-message-padding-bottom: 36px;",
      "--empty-message-action-size: 52px;",
    ]) expect(touch).toContain(token)
  })

  test("a message that fills its screen puts its buttons at the bottom, only in the phone layout", () => {
    for (const token of ["--empty-message-fill-content-margin: auto;", "--empty-message-fill-action-margin: auto;", "--empty-message-fill-action-width: 100%;"]) expect(touch).toContain(token)
    const rules = phoneRules("packages/styles/src/components/EmptyMessage/EmptyMessage.module.css")
    const fill = rules.get("&:has(> .ActionRow > [data-variant])")
    expect(decls(fill)).toEqual({ "padding-top": "var(--empty-message-fill-action-inset, 0px)" })
    expect(decls(rules.get("> :first-child:not(.ActionRow)"))).toEqual({ "margin-top": "var(--empty-message-fill-content-margin, 0px)" })
    expect(decls(rules.get("> [data-variant]"))).toEqual({ width: "var(--empty-message-fill-action-width, auto)" })
    // None of it applies from 768px up, where a caller's spacing and button widths stand
    expect(baseRules("packages/styles/src/components/EmptyMessage/EmptyMessage.module.css").has("&:has(> .ActionRow > [data-variant])")).toBe(false)
  })
})

describe("the Slider label row on a phone", () => {
  test("reads as an iOS list row: 17/22 label, the value in the secondary label, no border", () => {
    for (const token of [
      "--slider-label-font-size: 17px;", "--slider-value-font-size: 17px;",
      "--slider-value-color: var(--mobile-label-secondary, var(--color-text-secondary));",
      "--slider-value-color-focus: var(--color-text);", "--slider-reset-icon-size: 20px;",
      "--slider-reset-color: var(--mobile-label-secondary, var(--color-text-secondary));",
      "--slider-thumb-background: var(--white);",
    ]) expect(touch).toContain(token)
    const rules = phoneRules("packages/styles/src/components/Slider/Slider.module.css")
    expect(decls(rules.get(".SliderValue"))).toEqual({ height: "auto", "min-height": "44px", padding: "0", border: "0", "margin-inline-end": "0" })
    const reset = rules.get('.SliderWrap .SliderLabel .Reset[data-variant="ghost"]')
    expect(decls(reset)).toEqual({ color: "var(--slider-reset-color, var(--color-text-secondary))" })
    expect(decls(reset?.nodes.find((n): n is postcss.Rule => n.type === "rule" && n.selector === "&::before"))).toEqual({ visibility: "hidden" })
  })
})

describe("a phone sheet whose header has a description (kit iOS 27 Toolbar Title 2 Line)", () => {
  test("shows the two as a toolbar's two-line title", () => {
    const rules = phoneRules("packages/styles/src/components/Dialog/Dialog.module.css")
    const sheet = '.Content[data-mobile-variant="sheet"]'
    expect(decls(rules.get(`${sheet} .Header:has(> .Description) .Title`))).toEqual({
      "font-size": "var(--toolbar-title-compact-font-size)",
      "line-height": "var(--toolbar-title-compact-line-height)",
    })
    expect(decls(rules.get(`${sheet} .Header > .Description`))).toMatchObject({
      color: "var(--mobile-label-secondary, var(--color-text-secondary))",
      "font-size": "var(--toolbar-subtitle-font-size)",
      "font-weight": "var(--toolbar-subtitle-font-weight)",
    })
  })
})

describe("Liquid Glass text buttons on a phone (kit iOS 27 Button - Liquid Glass - Text 5473:21667)", () => {
  test("a Page bar's text button and a sheet header's action take a Toolbar item's 17px Medium label", () => {
    const page = phoneRules("packages/styles/src/components/Page/Page.module.css")
    expect(decls(page.get(".Leading > :is(button, a),\n  .Actions > :is(button, a)"))).toMatchObject({
      "--button-font-size": "var(--toolbar-label-font-size)",
      "--button-line-height": "var(--toolbar-label-line-height)",
      "--button-font-weight": "var(--toolbar-label-font-weight)",
    })
    const dialog = phoneRules("packages/styles/src/components/Dialog/Dialog.module.css")
    expect(decls(dialog.get("& > button"))).toMatchObject({ "--button-font-weight": "var(--toolbar-label-font-weight)", "--button-font-size": "var(--toolbar-label-font-size)" })
  })

  test("a glass Button's label is Medium, and 17px at md and lg, with touch.css only", () => {
    const button = phoneRules("packages/styles/src/components/Button/Button.module.css")
    const glass = '.Button[data-mobile-material="glass"]:where([data-color="primary"], [data-color="secondary"]):where([data-variant="soft"], [data-variant="ghost"])'
    expect(decls(button.get(glass))).toEqual({ "font-weight": "var(--button-glass-font-weight, var(--button-font-weight))" })
    expect(decls(button.get('&:where([data-size="md"], [data-size="lg"])'))).toEqual({
      "font-size": "var(--button-glass-font-size, var(--button-font-size))",
      "line-height": "var(--button-glass-line-height, var(--button-line-height, 1))",
    })
    for (const token of ["--button-glass-font-weight: var(--toolbar-label-font-weight);", "--button-glass-font-size: 17px;", "--button-glass-line-height: 22px;"]) expect(touch).toContain(token)
  })
})

describe("other kit iOS 27 values on a phone", () => {
  test("menus have 34px corners, other page dots the tertiary label, and Progress keeps its 4px rounded track", () => {
    for (const token of ["--menu-radius: 34px;", "--menu-radius-pill: 34px;", "--page-control-dot-color: var(--mobile-label-tertiary);"]) expect(touch).toContain(token)
    expect(touch).not.toMatch(/--progress-(height|radius):/)
    const tokens = read("packages/styles/src/styles/variables-components.css")
    expect(tokens).toContain("--progress-height: 4px;")
    expect(tokens).toContain("--progress-radius: var(--radius-full);")
  })
})

describe("content-area buttons on a phone (kit iOS 27 Button - Content Area 40:58696)", () => {
  test("the small button (3xs to sm) leaves 3px between icon and label, the medium and large ones 4px, with touch.css only", () => {
    const button = baseRules("packages/styles/src/components/Button/Button.module.css")
    const gap = (size: string) => decls(button.get(`&:where([data-size="${size}"])`))["--button-gap"]
    expect(gap("3xs")).toBe("var(--button-gap-sm)")
    for (const size of ["2xs", "xs", "sm"]) expect(gap(size)).toBe("var(--button-touch-gap-sm, var(--button-gap-md))")
    for (const size of ["md", "lg", "xl", "2xl", "3xl"]) expect(gap(size)).toBe("var(--button-gap-lg)")
    // The phone root block of touch.css (the one that also sets the medium and large gap) sets the small one.
    const roots: Record<string, string>[] = []
    postcss.parse(touch).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px)") media.walkRules("html:root", (rule) => { roots.push(decls(rule)) })
    })
    expect(roots.find((d) => "--button-gap-lg" in d)).toMatchObject({ "--button-gap-lg": "4px", "--button-touch-gap-sm": "var(--button-gap-sm)" })
    // The shared tier tokens stay as they are: segmented Tabs space their content with --button-gap-sm and --button-gap-md.
    expect(touch).not.toMatch(/--button-gap-(sm|md):/)
    const tokens = read("packages/styles/src/styles/variables-components.css")
    expect(tokens).toContain("--button-gap-sm: 3px;")
    expect(tokens).toContain("--button-gap-md: 4px;")
  })
})

describe("lists on a phone (kit iOS 27 Lists 507:24675)", () => {
  test("a Sortable row's handle ends the row in the tertiary label color, with touch.css only", () => {
    const sortable = baseRules("packages/styles/src/components/Sortable/Sortable.module.css")
    expect(decls(sortable.get(".Sortable > :has(> .Handle) > .Handle"))).toEqual({
      order: "var(--sortable-handle-order, 0)",
      "margin-inline-start": "var(--sortable-handle-margin-start, var(--sortable-handle-inset))",
      "margin-inline-end": "var(--sortable-handle-margin-end, calc(var(--sortable-handle-inset) * -1))",
    })
    // Only beside a Field row does the handle reach into the row's padding; other content keeps it clear.
    expect(decls(sortable.get('.Sortable[data-handles="true"] > :has(> .Handle) > .Handle:has(+ [data-slot="field"][data-row])'))).toEqual({
      "margin-inline-start": "var(--sortable-handle-field-margin-start, var(--sortable-handle-margin-start, var(--sortable-handle-inset)))",
    })
    const roots: Record<string, string>[] = []
    postcss.parse(touch).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px)") media.walkRules("html:root", (rule) => { roots.push(decls(rule)) })
    })
    expect(roots.find((d) => "--sortable-handle-inset" in d)).toMatchObject({
      "--sortable-handle-order": "1",
      "--sortable-handle-margin-end": "calc(var(--mobile-layout-margin) - 11px)",
      "--sortable-handle-margin-start": "0px",
      "--sortable-handle-field-margin-start": "calc(1px - var(--mobile-layout-margin))",
      "--sortable-handle-color": "var(--mobile-label-tertiary)",
      "--sortable-handle-color-hover": "var(--mobile-label-tertiary)",
    })
    // Desktop keeps the leading grip: no order or margin tokens outside touch.css.
    expect(read("packages/styles/src/styles/variables-components.css")).not.toMatch(/--sortable-handle-(order|margin-start|margin-end|field-margin-start):/)
  })

  // Plan 169a: kit Grouped Table Footer 35:55757 is Tight Leading Footnote 13/16, as native Settings sets it; 13/18 was a mistake
  test("a FieldGroup footer is Tight Leading Footnote, 13/16 (Grouped Table Footer)", () => {
    expect(touch).toContain("--field-group-footer-font-size: 13px;")
    expect(touch).toContain("--field-group-footer-line-height: 16px;")
  })
})
