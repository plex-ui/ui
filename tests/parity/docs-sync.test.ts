import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"
// @ts-expect-error plain .mjs script without types
import { vueMeta } from "../../scripts/sync-vue-meta.mjs"

// Tests run from the repo root
const fromRoot = (relative: string) => path.resolve(process.cwd(), relative)
const read = (relative: string) => readFileSync(fromRoot(relative), "utf8")

describe("Vue docs stay in sync with the React docs", () => {
  test("content/vue/components/meta.json is up to date (node scripts/sync-vue-meta.mjs)", () => {
    expect(JSON.parse(read("content/vue/components/meta.json"))).toEqual(vueMeta())
  })

  test("every Vue page has a React page with the same slug", () => {
    const react = new Set(readdirSync(fromRoot("content/components")))
    const vue = readdirSync(fromRoot("content/vue/components")).filter((file) => file.endsWith(".mdx"))
    expect(vue.filter((file) => !react.has(file))).toEqual([])
  })
})
