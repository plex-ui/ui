import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"
// @ts-expect-error plain .mjs script without types
import { vueMeta } from "../../scripts/sync-vue-meta.mjs"
import { COMPONENT_GROUPS, COMPONENT_PAGE_ORDER, NATIVE_ONLY_GROUPS } from "../../lib/component-groups"

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

describe("MDX frontmatter", () => {
  // Every page under content/, recursively
  const pages = (dir: string): string[] =>
    readdirSync(fromRoot(dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? pages(path.join(dir, entry.name))
        : entry.name.endsWith(".mdx")
          ? [path.join(dir, entry.name)]
          : [],
    )

  // An unquoted YAML value may not contain ": " or " #" (a mapping or a
  // comment); the page then fails to load (e.g. a dash replaced by a colon)
  test("unquoted values are plain YAML scalars", () => {
    const invalid = pages("content").flatMap((file) => {
      const frontmatter = read(file).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ""
      return frontmatter
        .split("\n")
        .filter((line) => {
          const value = line.match(/^\w+: (.*)$/)?.[1]
          return value !== undefined && !/^["'[{|>]/.test(value) && (value.includes(": ") || value.includes(" #"))
        })
        .map((line) => `${file}: ${line}`)
    })
    expect(invalid).toEqual([])
  })
})

describe("the component pages are in their groups (owner 16.11)", () => {
  test("every page is in exactly one group, and meta.json lists them in the groups' order", () => {
    const meta = JSON.parse(read("content/components/meta.json")) as { pages: string[] }
    expect(meta.pages).toEqual(["index", ...COMPONENT_PAGE_ORDER])
    expect(new Set(COMPONENT_PAGE_ORDER).size).toBe(COMPONENT_PAGE_ORDER.length)
  })

  test("a group lists its pages in alphabetical order", () => {
    for (const group of COMPONENT_GROUPS) expect([...group.slugs], group.label).toEqual([...group.slugs].sort())
  })
})

describe("the React Native pages are in the sidebar's groups", () => {
  test("a React Native page is in its React page's group, or in NATIVE_ONLY_GROUPS when it has no React page", () => {
    const meta = JSON.parse(read("content/react-native/components/meta.json")) as { pages: string[] }
    const groupIds = new Set(COMPONENT_GROUPS.map((group) => group.id))
    const pages = meta.pages.filter((slug) => slug !== "index")
    const ungrouped = pages.filter((slug) => !COMPONENT_PAGE_ORDER.includes(slug) && !NATIVE_ONLY_GROUPS[slug])
    expect(ungrouped).toEqual([])
    // A page with a React page keeps its group; the native-only list names real groups and pages
    expect(Object.keys(NATIVE_ONLY_GROUPS).filter((slug) => COMPONENT_PAGE_ORDER.includes(slug) || !pages.includes(slug))).toEqual([])
    expect(Object.values(NATIVE_ONLY_GROUPS).filter((id) => !groupIds.has(id))).toEqual([])
  })
})
