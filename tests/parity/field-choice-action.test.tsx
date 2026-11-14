// R8: a choice with an action at its end, as Settings › VPN (IMG_5959). A Field row whose control is a radio and that
// has an `action` leads with the radio's mark in the icon column (the check at 34 from the group's edge, the words at
// 56), and the action alone stands at the end. A uniform pill button aligned to the end draws its symbol at the
// row's inset (its pill rule used to take it back to a zero gutter).
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement } from "react"
import { readFileSync } from "node:fs"
import { afterEach, describe, expect, test } from "vitest"
import { h } from "vue"
import { Button as RButton } from "../../packages/ui/src/components/Button"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { InfoCircle as RInfoCircle } from "../../packages/ui/src/components/Icon"
import { RadioGroup as RRadioGroup } from "../../packages/ui/src/components/RadioGroup"
import { Button } from "../../packages/vue/src/components/Button"
import { Field } from "../../packages/vue/src/components/Field"
import { InfoCircle } from "../../packages/vue/src/components/Icon"
import { RadioGroup, RadioGroupItem } from "../../packages/vue/src/components/RadioGroup"
import { renderPair } from "./pair"

const field = readFileSync(`${process.cwd()}/packages/styles/src/components/Field/Field.module.css`, "utf8")
const button = readFileSync(`${process.cwd()}/packages/styles/src/components/Button/Button.module.css`, "utf8")

afterEach(() => cleanup())

const reactRow = (onInfo = () => {}, value = "office", onChange: (value: string) => void = () => {}) =>
  createElement(RRadioGroup, { value, onChange, "aria-label": "Device VPN" },
    createElement(RField, {
      row: true, label: "Office", description: "Northwind Corporate",
      action: createElement(RButton, { color: "info", variant: "ghost", uniform: true, pill: true, opticallyAlign: "end", "aria-label": "Office details", onClick: onInfo }, createElement(RInfoCircle)),
    }, createElement(RRadioGroup.Item, { value: "office" })))

describe("a choice with an action at its end", () => {
  test("the radio leads in the icon column and the action takes its column", () => {
    const radio = '> .Content > .Control > :only-child > label:only-child:not([data-has-label]) [role="radio"]'
    expect(field).toContain(`.Field:where([data-row]:not([data-fill], [data-orientation="vertical"])):has(> .Action):not(:has(> .Icon)):has(${radio}) {\n  --field-group-separator-inset-start: calc(var(--field-row-padding-inline) + var(--field-row-icon-offset) + var(--field-row-icon-size) + var(--field-row-icon-gap));`)
    expect(field).toMatch(/padding-inline-start: calc\(var\(--field-row-padding-inline\) \+ var\(--field-row-icon-offset\) \+ var\(--field-row-icon-size\) \+ var\(--field-row-icon-gap\)\);\n\}\n\n\/\* The action takes/)
    expect(field).toMatch(/> \.Action \{\s*\/\*[^*]*\*\/\s*--button-icon-size-md: var\(--field-row-icon-symbol-size\);\s*\/\*[^*]*\*\/\s*grid-column: -2;/)
    expect(field).toContain(':not(:has(> .Icon)) > .Content > .Control:has(> :only-child > label:only-child:not([data-has-label]) [role="radio"]) {\n  position: absolute;\n  grid-area: auto;\n  inset-inline-start: calc(var(--field-row-padding-inline) + var(--field-row-icon-offset));')
    // On a phone only a fill row puts its action in the second column (Codex #45)
    expect(field).toMatch(/\.Field:where\(\[data-row\]\[data-fill\]\) > \.Action \{\s*grid-column: 2;/)
    expect(field).not.toMatch(/\n  \.Action \{\s*grid-column: 2;/)
    // Another control keeps its column, the action after it, at a row's weight so `columns` keeps its own (Codex #46)
    expect(field).toContain(`.Field:where([data-row]:not([data-fill], [data-orientation="vertical"]):has(> .Action):is(:has(> .Icon), :not(:has(${radio})))) {\n  grid-template-columns: minmax(0, 1fr) auto auto;`)
  })

  test("a RadioGroup of several choices in a row with an action keeps its place", () => {
    const { container } = render(createElement(RField, { row: true, label: "Plan", action: createElement(RButton, { variant: "ghost", "aria-label": "Help" }, "?") },
      createElement(RRadioGroup, { value: "a", onChange: () => {}, "aria-label": "Plan" },
        createElement(RRadioGroup.Item, { value: "a" }, "A"), createElement(RRadioGroup.Item, { value: "b" }, "B"))))
    const single = ':has(> :only-child > label:only-child:not([data-has-label]) [role="radio"])'
    expect(container.querySelector('[class*="Control"]')!.matches(single)).toBe(false)
    cleanup()
    // A single radio without its own label is the choice that leads
    const row = render(reactRow()).container
    expect(row.querySelector('[class*="Control"]')!.matches(single)).toBe(true)
  })

  test("a uniform pill aligned to an edge outweighs the pill's gutter rule", () => {
    expect(button).toMatch(/&:where\(\[data-optically-align="end"\]\)\[data-pill\] \{|&\[data-pill\] \{\s*margin-inline-end/)
    expect(button).toContain('&:where([data-optically-align="start"])[data-uniform] {\n    margin-inline-start: calc(((var(--button-size) - var(--button-icon-size)) / 2) * -1);')
    expect(button).toContain('&:where([data-optically-align="end"])[data-uniform] {\n    margin-inline-end: calc(((var(--button-size) - var(--button-icon-size)) / 2) * -1);')
    // After the pill rules, so it wins at the same weight
    expect(button.indexOf('&:where([data-optically-align="end"])[data-uniform]')).toBeGreaterThan(button.indexOf('&:where([data-optically-align="end"]) {'))
  })

  test("React and Vue draw the same row", async () => {
    const pair = await renderPair(reactRow(),
      () => h(RadioGroup, { "value": "office", "aria-label": "Device VPN" }, () =>
        h(Field, { row: true, label: "Office", description: "Northwind Corporate" }, {
          default: () => h(RadioGroupItem, { value: "office" }),
          action: () => h(Button, { "color": "info", "variant": "ghost", "uniform": true, "pill": true, "opticallyAlign": "end", "aria-label": "Office details" }, () => h(InfoCircle)),
        })))
    expect(pair.vue).toBe(pair.react)
  })

  test("a tap on the row chooses; the info button does not", async () => {
    let info = 0
    const chosen: string[] = []
    const { container } = render(reactRow(() => { info += 1 }, "home", (value) => chosen.push(value)))
    await act(async () => { fireEvent.click(container.querySelector('button[aria-label="Office details"]')!) })
    expect([info, chosen]).toEqual([1, []])
    await act(async () => { fireEvent.click(container.querySelector('[data-row] [class*="Description"]')!) })
    expect(chosen).toEqual(["office"])
  })
})

// R9: a list in a footer, as Live Captions (IMG_5960): bullets inline, wrapping back to the edge, a paragraph's gap apart
describe("a list in a FieldGroup footer", () => {
  const group = readFileSync(`${process.cwd()}/packages/styles/src/components/FieldGroup/FieldGroup.module.css`, "utf8")
  test("no indent, a bullet before each item, a paragraph's gap", () => {
    expect(group).toMatch(/& > :is\(ul, ol\) \{\s*margin: 0;\s*padding: 0;\s*\}/)
    expect(group).toMatch(/& > ul \{\s*list-style: none;/)
    // An ordered list keeps its numbers (Codex #50)
    expect(group).toMatch(/& > ol \{\s*list-style: decimal inside;/)
    expect(group).toMatch(/& > :is\(p, ul, ol\) \+ :is\(ul, ol\),\s*& > :is\(ul, ol\) \+ p \{\s*margin-top: var\(--field-group-footer-paragraph-gap, spacing\(2\)\);/)
    expect(group).toMatch(/& > ul > li::before \{\s*content: "•";\s*margin-inline-end: 0\.6em;/)
  })
})
