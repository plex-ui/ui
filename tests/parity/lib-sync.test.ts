import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

// Framework-agnostic lib modules are copied from packages/ui into
// packages/vue (Vue users must not install React). This keeps the copies
// identical apart from the `.js` import specifiers @plexui/vue uses.
const COPIES = [
  "ids",
  "constants",
  "assert",
  "utilityTypes",
  "casing",
  "safeBase64",
  "userAgent",
  "dateUtils",
  "copyToClipboard",
  "environment",
]

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const withoutJsSpecifiers = (source: string) => source.replace(/(from |import )"(\.{1,2}\/[^"]+)\.js"/g, '$1"$2"')

describe("packages/vue/src/lib copies match packages/ui/src/lib", () => {
  test.each(COPIES)("%s.ts", (name) => {
    const ui = read(`../../packages/ui/src/lib/${name}.ts`)
    const vue = withoutJsSpecifiers(read(`../../packages/vue/src/lib/${name}.ts`))
    expect(vue).toBe(ui)
  })
})
