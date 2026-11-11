import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

// Plan 158: on a phone, a field's parts follow the iOS 26 field row (kit Text Field 553:23047, one 52px row).
// An indicator inside a field is the iOS 27 kit's Regular spinner (5425:3431, 20px), as a standalone one is
// (row 165; it was the iOS 26 kit's Small 22 beside a standalone 30); a trailing addon takes the row's accessory tone; and a phone example keeps a text prefix in a
// column or a unit after the value at the row's edge, never both, so a unit never stands away from its value.

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")
const css = (path: string) => read(`packages/styles/src/${path}`).replace(/\/\*[\s\S]*?\*\//g, "")

describe("an indicator in a field on a phone", () => {
  test("the touch stylesheet sizes indicators at the iOS 27 kit's Regular 20, in a field and standalone", () => {
    const touch = css("styles/touch.css")
    const phone = touch.slice(touch.indexOf("@media (max-width: 767px)"))
    expect(phone).toMatch(/--indicator-default-size:\s*20px;/)
    expect(phone).toMatch(/--control-indicator-size:\s*20px;/)
  })

  test("Input adornments, InputGroup addons and SelectControl take the field size, or the text size on desktop", () => {
    const input = css("components/Input/Input.module.css").match(/^\.Container \{[\s\S]*?\n\}/m)?.[0] ?? ""
    expect(input).toContain("--indicator-default-size: var(--control-indicator-size, 1em);")
    const addon = css("components/InputGroup/InputGroup.module.css").match(/\n\.Addon \{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(addon).toContain("--indicator-default-size: var(--control-indicator-size, 1em);")
    const select = css("components/SelectControl/SelectControl.module.css").match(/\n\.LoadingIndicator \{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(select).toContain("--indicator-default-size: var(--control-indicator-size, 1em);")
  })

  test("the kit's spoke geometry: Regular 20 (4/30 x 10/30), Small up to 16px (2/14 x 4/14), Large from 28px (5/35 x 13/35)", () => {
    const sheet = css("components/Indicator/LoadingIndicator.module.css")
    // The spoke sizes come from container queries, which need the size container the touch stylesheet turns on
    expect(sheet).toContain("container-type: var(--indicator-container-type, normal);")
    expect(css("styles/touch.css")).toMatch(/--indicator-container-type:\s*size;/)
    expect(sheet).toContain("width: var(--indicator-stroke, calc(4 / 30 * 100%));")
    expect(sheet).toMatch(/@container plex-loading-indicator \(max-width: 16px\) \{\s*\.Spoke::before \{\s*width: var\(--indicator-stroke, calc\(2 \/ 14 \* 100%\)\);\s*height: calc\(4 \/ 14 \* 100%\);/)
    expect(sheet).toMatch(/@container plex-loading-indicator \(min-width: 28px\) \{\s*\.Spoke::before \{\s*width: var\(--indicator-stroke, calc\(5 \/ 35 \* 100%\)\);\s*height: calc\(13 \/ 35 \* 100%\);/)
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
// Vue templates in the order the page shows them, as the React blocks are (owner 11.11 moved the sections)
const vueDocs = read("content/vue/components/input-group.mdx")
const vueTemplates = new Map([...vueDocs.matchAll(/export const (\w+Phone) = `([\s\S]*?)`\n/g)].map((match) => [match[1], match[2]]))
const vueBody = vueDocs.slice(vueDocs.indexOf("\n## Examples\n"))
const vuePhone = [...vueTemplates.keys()]
  .sort((a, b) => vueBody.search(new RegExp(`\\b${a}\\b`)) - vueBody.search(new RegExp(`\\b${b}\\b`)))
  .map((name) => vueTemplates.get(name) ?? "")
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
