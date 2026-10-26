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

  test("the React and Vue docs have the same component pages", () => {
    const pages = (dir: string) =>
      readdirSync(fromRoot(dir))
        .filter((file) => file.endsWith(".mdx"))
        .sort()
    expect(pages("content/vue/components")).toEqual(pages("content/components"))
  })
})
