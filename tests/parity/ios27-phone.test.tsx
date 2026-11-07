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
    if (media.params === "(max-width: 767px)" || media.params === "(width <= 767px)") media.walkRules((rule) => { rules.set(rule.selector, rule) })
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
    // A horizontal row puts it 10px inside the row's 16px inset: 26px from the row's edge, as the kit does
    expect(decls(rules.get(':where([data-row]:not([data-orientation="vertical"])) .Container > .Clear.Clear:last-child'))).toEqual({
      "margin-right": "calc(10px - var(--input-clear-target-size, var(--input-clear-size)) / 2)",
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
