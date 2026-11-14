// R13: a row that is an action (owner 14.11 «без шеврона кнопки», «в PlexUI такого нет же?»). A ghost block Button in
// a FieldGroup row takes the row's height, type and inset, starts its words at the row's label, puts an icon after the
// words at the trailing edge, and centres them in a row with data-align="center" (iOS 27.2 simulator: 52pt rows,
// words 20 from the group's edge, arrow.up.right at the trailing edge, a centred Reset to Default).
import { cleanup, render } from "@testing-library/react"
import { createElement } from "react"
import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { h } from "vue"
import { Button as RButton } from "../../packages/ui/src/components/Button"
import { FieldGroup as RFieldGroup } from "../../packages/ui/src/components/FieldGroup"
import { ArrowUpRight as RArrowUpRight } from "../../packages/ui/src/components/Icon"
import { Button } from "../../packages/vue/src/components/Button"
import { FieldGroup } from "../../packages/vue/src/components/FieldGroup"
import { ArrowUpRight } from "../../packages/vue/src/components/Icon"
import { renderPair } from "./pair"

const css = readFileSync(`${process.cwd()}/packages/styles/src/components/FieldGroup/FieldGroup.module.css`, "utf8")

describe("FieldGroup action rows", () => {
  test("a row's button takes the row's size, type and inset and starts its words at the label", () => {
    const rule = css.match(/\.Body > \[data-row\] > button\[data-block\]\[data-variant="ghost"\],[^{]*\{([^}]*--button-size-md[^}]*)\}/)
    expect(rule).not.toBeNull()
    for (const declaration of [
      "--button-size-md: var(--field-row-min-height);",
      "--button-font-size-md: var(--field-row-label-font-size);",
      "--button-line-height-md: var(--field-row-label-line-height);",
      "--button-font-weight: var(--field-row-label-font-weight);",
      "--button-gutter-md: var(--field-row-padding-inline);",
      "--button-touch-radius: 0px;",
      "--button-justify-content: flex-start;",
    ]) expect(rule![1]).toContain(declaration)
    expect(css).toMatch(/& > span > svg:last-child:not\(:first-child\) \{\s*margin-inline-start: auto;/)
    expect(css).toMatch(/\[data-row\]\[data-align="center"\] > button\[data-block\]\[data-variant="ghost"\][^{]*\{\s*--button-justify-content: center;/)
    // A centred row keeps its icon beside the words (Codex #37)
    expect(css).toMatch(/--button-justify-content: center;\s*text-align: center;[^}]*svg:last-child:not\(:first-child\) \{\s*margin-inline-start: 0;/)
  })

  test("React and Vue draw the same rows", async () => {
    const pair = await renderPair(
      createElement(RFieldGroup, null,
        createElement("div", { "data-row": "" }, createElement(RButton, { block: true, color: "info", variant: "ghost" }, "Privacy Policy", createElement(RArrowUpRight))),
        createElement("div", { "data-row": "", "data-align": "center" }, createElement(RButton, { block: true, color: "danger", variant: "ghost" }, "Delete Account"))),
      () => h(FieldGroup, null, () => [
        h("div", { "data-row": "" }, h(Button, { block: true, color: "info", variant: "ghost" }, () => ["Privacy Policy", h(ArrowUpRight)])),
        h("div", { "data-row": "", "data-align": "center" }, h(Button, { block: true, color: "danger", variant: "ghost" }, () => "Delete Account")),
      ]),
    )
    expect(pair.vue).toBe(pair.react)
    // The words are wrapped, so the icon after them is a last child that is not the first: it goes to the edge
    const row = document.createElement("div")
    render(createElement(RButton, { block: true, variant: "ghost" }, "Privacy Policy", createElement(RArrowUpRight)), { container: row })
    expect(row.querySelector("button > span > svg:last-child:not(:first-child)")).not.toBeNull()
    cleanup()
  })
})

// R10: groups one after another space themselves on a phone as an iOS 27.2 inset list (simulator, 402pt): 37 rows
// to rows, 60 to a header, 64 to a prominent one, 49.5 past a one-line footer, 72 past a footer to a header. The
// header (39, prominent 45) and the footer (8 + 16 a line + 6) stand in the gap; the margin gives back the rest.
describe("FieldGroup spacing on a phone", () => {
  const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
  const header = 39, prominent = 45, footer = (lines: number) => 8 + 16 * lines + 6
  const offsets = { header: 16, prominent: 18.3, footer: 17.5 }

  test("the rules give back the header's and the footer's blocks, a group in a wrapper of its own too", () => {
    const group = ":is(.FieldGroup, [role=\"radiogroup\"]:has(> .FieldGroup:only-child))"
    expect(phone).toContain(`${group} + ${group} {\n    margin-top: calc(var(--field-group-gap, 37px) - var(--field-group-gap-footer-offset, 0px) - var(--field-group-gap-header-offset, 0px));`)
    expect(phone).toContain(`:is(.FieldGroup:has(> .Footer), [role="radiogroup"]:has(> .FieldGroup:only-child > .Footer)) + ${group} {\n    --field-group-gap-footer-offset: 17.5px;`)
    expect(phone).toContain(`${group} + :is(.FieldGroup:has(> .Header), [role="radiogroup"]:has(> .FieldGroup:only-child > .Header)) {\n    --field-group-gap-header-offset: 16px;`)
    expect(phone).toMatch(/:has\(> \.FieldGroup\[data-header-prominence="increased"\]:only-child > \.Header\)\) \{\s*--field-group-gap-header-offset: 18\.3px;/)
    expect(phone).toMatch(/:has\(> \.FieldGroup:only-child\) \{\s*--field-group-gap-footer-offset: 0px;\s*--field-group-gap-header-offset: 0px;/)
  })

  test("a group resets the offsets, so a group inside another does not inherit them", () => {
    expect(phone).toMatch(/\.FieldGroup \{[^}]*--field-group-gap-footer-offset: 0px;\s*--field-group-gap-header-offset: 0px;/)
  })

  test.each([
    ["rows to rows", 0, null, 37],
    ["a header", 0, "header", 60],
    ["a prominent header", 0, "prominent", 63.7],
    ["a footer of one line", 1, null, 49.5],
    ["a footer of two lines", 2, null, 65],
    ["a footer then a header", 1, "header", 72],
    ["a footer then a prominent header", 1, "prominent", 75.6],
  ] as const)("%s: rows to rows as the simulator's", (_name, lines, head, native) => {
    const margin = 37 - (lines ? offsets.footer : 0) - (head ? offsets[head] : 0)
    const total = (lines ? footer(lines) : 0) + margin + (head === "header" ? header : head === "prominent" ? prominent : 0)
    expect(Math.abs(total - native)).toBeLessThanOrEqual(1)
  })
})
