import { createElement, type ReactElement } from "react"
import { describe, expect, test } from "vitest"
import { h } from "vue"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { FieldGroup as RFieldGroup } from "../../packages/ui/src/components/FieldGroup"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { Field } from "../../packages/vue/src/components/Field"
import { FieldGroup } from "../../packages/vue/src/components/FieldGroup"
import { Input } from "../../packages/vue/src/components/Input"
import { renderPair } from "./pair"

// React-vs-Vue parity for a Field row and for FieldGroup.

type Row = { label: string; description?: string; errorMessage?: string; orientation?: "vertical" | "horizontal"; extra?: Record<string, unknown> }

const reactRow = ({ extra, ...props }: Row): ReactElement =>
  createElement(RField, { key: props.label, row: true, ...props, ...extra }, createElement(RInput, {}))
const vueRow = ({ extra, ...props }: Row) => h(Field, { key: props.label, row: true, ...props, ...extra }, () => h(Input, {}))

describe("Field row", () => {
  test.each<[string, Row]>([
    ["plain", { label: "Price" }],
    ["description", { label: "Price", description: "With tax." }],
    ["error", { label: "Price", errorMessage: "Enter a price." }],
    ["stacked", { label: "Address", orientation: "vertical" }],
    ["data attribute", { label: "Price", extra: { "data-kind": "edit" } }],
  ])("%s", async (_, row) => {
    const pair = await renderPair(reactRow(row), () => vueRow(row))
    expect(pair.vue).toBe(pair.react)
  })

  test("is horizontal unless it says otherwise, and marks itself", async () => {
    const pair = await renderPair(reactRow({ label: "Price" }), () => vueRow({ label: "Price" }))
    expect(pair.vue).toContain('data-orientation="horizontal"')
    expect(pair.vue).toContain('data-row=""')
  })

  test("other attributes reach the root only on a row", async () => {
    const off = await renderPair(
      createElement(RField, { label: "Price", ...{ "data-kind": "edit" } }, createElement(RInput, {})),
      () => h(Field, { label: "Price", "data-kind": "edit" }, () => h(Input, {})),
    )
    expect(off.vue).toBe(off.react)
    expect(off.vue).not.toContain("data-kind")
  })
})

describe("FieldGroup", () => {
  test.each<[string, Record<string, string>]>([
    ["rows alone", {}],
    ["title", { title: "Payment" }],
    ["title and description", { title: "Payment", description: "How guests pay." }],
    ["description alone", { description: "How guests pay." }],
  ])("%s", async (_, props) => {
    const rows: Row[] = [{ label: "Price" }, { label: "Size" }]
    const pair = await renderPair(
      createElement(RFieldGroup, props, rows.map(reactRow)),
      () => h(FieldGroup, props, () => rows.map(vueRow)),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("action, footer and classes", async () => {
    const pair = await renderPair(
      createElement(RFieldGroup, {
        title: "Payment",
        action: createElement("button", { type: "button" }, "Add"),
        footer: createElement("p", null, "Note"),
        bodyClassName: "body",
        className: "root",
        "data-part": "group",
      } as Record<string, unknown>, reactRow({ label: "Price" })),
      () =>
        h(
          FieldGroup,
          { title: "Payment", bodyClass: "body", class: "root", "data-part": "group" },
          {
            default: () => vueRow({ label: "Price" }),
            action: () => h("button", { type: "button" }, "Add"),
            footer: () => h("p", "Note"),
          },
        ),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("the title names the group", async () => {
    const pair = await renderPair(createElement(RFieldGroup, { title: "Payment" }), () => h(FieldGroup, { title: "Payment" }))
    expect(pair.vue).toContain('role="group"')
    expect(pair.vue).toContain("aria-labelledby")
  })
})
