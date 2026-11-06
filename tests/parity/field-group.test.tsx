import { createElement, type ReactElement } from "react"
import { describe, expect, test } from "vitest"
import { h } from "vue"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { FieldGroup as RFieldGroup } from "../../packages/ui/src/components/FieldGroup"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { InputGroup as RInputGroup } from "../../packages/ui/src/components/InputGroup"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Field } from "../../packages/vue/src/components/Field"
import { FieldGroup } from "../../packages/vue/src/components/FieldGroup"
import { Input } from "../../packages/vue/src/components/Input"
import { InputGroup } from "../../packages/vue/src/components/InputGroup"
import { Select } from "../../packages/vue/src/components/Select"
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

describe("Field row action", () => {
  const reactAction = (row: boolean) =>
    createElement(
      RField,
      { label: "Tags", row, fill: true, action: createElement("button", { type: "button" }, "Add") },
      createElement("div"),
    )
  const vueAction = (row: boolean) =>
    h(Field, { label: "Tags", row, fill: true }, {
      default: () => h("div"),
      action: () => h("button", { type: "button" }, "Add"),
    })

  test("stands in the row", async () => {
    const pair = await renderPair(reactAction(true), () => vueAction(true))
    expect(pair.vue).toBe(pair.react)
    expect(pair.vue).toMatch(/<button[^>]*>\s*"Add"/)
  })

  test("is for a row only", async () => {
    const pair = await renderPair(reactAction(false), () => vueAction(false))
    expect(pair.vue).toBe(pair.react)
    expect(pair.vue).not.toContain("Add")
  })
})

describe("Field row shape", () => {
  const options = [{ value: "en", label: "English" }]
  const render = (field: Record<string, unknown>, control: Record<string, unknown> = {}) =>
    renderPair(
      createElement(RField, { label: "Name", ...field }, createElement(RInput, control)),
      () => h(Field, { label: "Name", ...field }, () => h(Input, control)),
    )
  const renderSelect = (field: Record<string, unknown>) =>
    renderPair(
      createElement(RField, { label: "Language", ...field }, createElement(RSelect, { value: "en", options, onChange: () => {} })),
      () => h(Field, { label: "Language", ...field }, () => h(Select, { value: "en", options })),
    )

  test("the end of a row is a pill", async () => {
    const pair = await render({ row: true })
    expect(pair.vue).toBe(pair.react)
    expect(pair.vue).toContain("data-pill")
  })

  test("a Select takes it too", async () => {
    const row = await renderSelect({ row: true })
    expect(row.react).toContain("data-pill")
    expect(row.vue).toContain("data-pill")
    const plain = await renderSelect({})
    expect(plain.react).not.toContain("data-pill")
    expect(plain.vue).not.toContain("data-pill")
  })

  test("an InputGroup takes it too", async () => {
    const pair = await renderPair(
      createElement(RField, { label: "Price", row: true }, createElement(RInputGroup, {}, createElement("input"))),
      () => h(Field, { label: "Price", row: true }, () => h(InputGroup, {}, () => h("input"))),
    )
    expect(pair.react).toContain("data-pill")
    expect(pair.vue).toContain("data-pill")
  })

  test("the control's own pill wins", async () => {
    const pair = await render({ row: true }, { pill: false })
    expect(pair.vue).toBe(pair.react)
    expect(pair.vue).not.toContain("data-pill")
  })

  test("a label above stays rounded", async () => {
    const pair = await render({ row: true, orientation: "vertical" })
    expect(pair.vue).toBe(pair.react)
    expect(pair.vue).not.toContain("data-pill")
  })

  test("a field outside a row stays rounded", async () => {
    const pair = await render({})
    expect(pair.vue).toBe(pair.react)
    expect(pair.vue).not.toContain("data-pill")
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

  test.each([undefined, null, false, ""])("empty footer %s adds no spacing wrapper", async (footer) => {
    const pair = await renderPair(
      createElement(RFieldGroup, { title: "Payment", footer }),
      () => h(FieldGroup, { title: "Payment" }, { footer: () => footer }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("Footer")
  })

  test("the title names the group", async () => {
    const pair = await renderPair(createElement(RFieldGroup, { title: "Payment" }), () => h(FieldGroup, { title: "Payment" }))
    expect(pair.vue).toContain('role="group"')
    expect(pair.vue).toContain("aria-labelledby")
  })
})
