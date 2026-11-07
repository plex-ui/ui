import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

// Plan 158: on a phone, a field's parts follow the iOS 26 field row (kit Text Field 553:23047, one 52px row).
// An indicator inside a field is the kit's Small progress indicator (5425:3443, 22px), not the standalone
// Regular 30; a trailing addon takes the row's accessory tone; and a phone example keeps a text prefix in a
// column or a unit after the value at the row's edge, never both, so a unit never stands away from its value.

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")
const css = (path: string) => read(`packages/styles/src/${path}`).replace(/\/\*[\s\S]*?\*\//g, "")

describe("an indicator in a field on a phone", () => {
  test("the touch stylesheet sizes field indicators at the kit's Small 22, standalone ones at 30", () => {
    const touch = css("styles/touch.css")
    const phone = touch.slice(touch.indexOf("@media (max-width: 767px)"))
    expect(phone).toMatch(/--indicator-default-size:\s*30px;/)
    expect(phone).toMatch(/--control-indicator-size:\s*22px;/)
  })

  test("Input adornments, InputGroup addons and SelectControl take the field size, or the text size on desktop", () => {
    const input = css("components/Input/Input.module.css").match(/^\.Container \{[\s\S]*?\n\}/m)?.[0] ?? ""
    expect(input).toContain("--indicator-default-size: var(--control-indicator-size, 1em);")
    const addon = css("components/InputGroup/InputGroup.module.css").match(/\n\.Addon \{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(addon).toContain("--indicator-default-size: var(--control-indicator-size, 1em);")
    const select = css("components/SelectControl/SelectControl.module.css").match(/\n\.LoadingIndicator \{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(select).toContain("--indicator-default-size: var(--control-indicator-size, 1em);")
  })

  test("22px selects the small spoke geometry", () => {
    expect(css("components/Indicator/LoadingIndicator.module.css")).toMatch(/@container plex-loading-indicator \(max-width: 22px\)/)
  })
})

describe("inline addons in a phone row", () => {
  test("take the accessory tone while enabled, as Input's prefix and unit do", () => {
    const field = css("components/Field/Field.module.css")
    const rule = field.match(/[^{}]*\[data-align\^="inline"\],\s*[^{}]*\{\s*color: var\(--mobile-accessory-secondary, var\(--color-text-secondary\)\);/)?.[0] ?? ""
    expect(rule).toContain('.Field:where([data-row]:not([data-orientation="vertical"])) .Control > [data-slot="input-group"]:not([data-disabled]) > [data-align^="inline"],')
  })
})

// The phone code of each Input Group example: React MDX `// Phone` blocks and Vue `...Phone` templates.
const reactPhone = [...read("content/components/input-group.mdx").matchAll(/\/\/ Phone[^\n]*\n([\s\S]*?)`\} previewMinHeight/g)].map((match) => match[1])
const vuePhone = [...read("content/vue/components/input-group.mdx").matchAll(/export const \w+Phone = `([\s\S]*?)`\n/g)].map((match) => match[1])
const groups = (code: string) => [...code.matchAll(/<FieldGroup([^>]*)>([\s\S]*?)<\/FieldGroup>/g)].map(([, attrs, body]) => ({ columns: /\bcolumns\b/.test(attrs), body }))
const rows = (body: string) => [...body.matchAll(/<Field row[\s\S]*?<\/Field>/g)].map((match) => match[0])
// A row without the bindings of the demo controls, to compare rows between examples.
const plain = (row: string) => row.replace(/\s+(disabled|invalid|errorMessage|:disabled|:invalid|:error-message)=("[^"]*"|\{[^}]*\})/g, "").replace(/\s+/g, " ")
// The shape of an example: each group's title, columns and footer, and its row labels.
const shape = (code: string) => groups(code).map(({ columns, body }, index) => {
  const head = [...code.matchAll(/<FieldGroup([^>]*)>/g)][index]?.[1] ?? ""
  const footer = /footer=/.test(head) || /^\s*<template #footer>/.test(body)
  return `${head.match(/title="([^"]*)"/)?.[1] ?? ""}|${columns}|${footer}|${rows(body).map((row) => row.match(/label="([^"]*)"/)?.[1]).join(",")}`
})
const prefix = (row: string) => /<InputGroup\.?Addon(?: align="inline-start")?>\s*<InputGroup\.?Text>/.test(row)
const unit = (row: string) => /<InputGroup\.?Addon align="inline-end">\s*<InputGroup\.?Text>/.test(row)

describe.each([
  ["React", reactPhone],
  ["Vue", vuePhone],
])("%s Input Group phone examples", (_, blocks) => {
  test("cover every example", () => {
    expect(blocks).toHaveLength(9)
  })

  test("a row keeps a prefix in a column or a unit at the row's edge, never both", () => {
    const all = blocks.flatMap((block) => groups(block).flatMap((group) => rows(group.body)))
    expect(all.filter(prefix).length).toBeGreaterThan(2)
    expect(all.filter(unit).length).toBeGreaterThan(0)
    for (const block of blocks) {
      for (const group of groups(block)) {
        for (const row of rows(group.body)) {
          expect(prefix(row) && unit(row), row).toBe(false)
          if (prefix(row)) expect(group.columns, row).toBe(true)
          if (unit(row)) expect(group.columns, row).toBe(false)
        }
      }
    }
  })

  test("no row repeats between examples", () => {
    const all = blocks.flatMap((block) => groups(block).flatMap((group) => rows(group.body).map(plain)))
    expect(all.length).toBeGreaterThan(12)
    expect(new Set(all).size).toBe(all.length)
  })
})

test("React and Vue phone examples have the same groups and rows", () => {
  expect(vuePhone.map(shape)).toEqual(reactPhone.map(shape))
})
