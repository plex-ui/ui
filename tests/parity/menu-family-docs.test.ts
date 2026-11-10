import { readFileSync } from "node:fs"
import { expect, test } from "vitest"
import { buildDocsTreeNavigation } from "../../lib/docs-navigation"
import { RELATED_COMPONENTS } from "../../lib/related-components"

// Owner 10.11 («как лучше организовать? чтобы было понятно что и где искать» → «Делай все 6 пунктов»): Menu, Context
// Menu, Select and Select Control are one iOS menu opened three ways and the look of one of them, so the docs keep them
// together and say which to use.
const page = (slug: string) => ({ type: "page" as const, name: slug, url: `/components/${slug}` })
const names = { menu: "Menu", "context-menu": "Context Menu", select: "Select", "select-control": "Select Control", input: "Input", popover: "Popover" }
const components = { name: "Components", children: Object.entries(names).map(([slug, name]) => ({ ...page(slug), name })) }
const empty = { name: "", children: [] }

// Owner 10.11 on the one open «Menus» group: «это хорошая идея делать вложенные контролы???? только в этом одном
// месте? кажется не очень / посмотри как делает Apple и другие». No big kit nests one group in a flat list: shadcn,
// Radix, Carbon and Fluent are flat by name, Apple, Ant, Polaris, Atlassian and Mantine group every page, Material 3
// nests five families. The list stays flat by name, as before; the note and Related components tie the four together.
test("the sidebar lists the four by name among the other components, with no group of their own", () => {
  const { tree } = buildDocsTreeNavigation({ docs: empty, components, icons: empty })
  const list = tree.children.slice(1, 7)
  expect(list.map((node) => node.name)).toEqual(["Context Menu", "Input", "Menu", "Popover", "Select", "Select Control"])
  expect(list.every((node) => node.type === "page")).toBe(true)
})

test.each(["components", "vue/components"])("%s: each of the four pages says which to use, right after its usage", (dir) => {
  for (const slug of ["menu", "context-menu", "select", "select-control"]) {
    const mdx = readFileSync(`${process.cwd()}/content/${dir}/${slug}.mdx`, "utf8")
    const note = `<MenuFamilyNote current="${slug}"${dir === "vue/components" ? ' framework="vue"' : ""} />`
    expect(mdx, slug).toMatch(new RegExp(`</UsageBlock>\\s*${note.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`))
  }
  // The phone row is described once, on Menu
  expect(readFileSync(`${process.cwd()}/content/${dir}/menu.mdx`, "utf8")).toContain("### On a phone")
  // Column configuration is a Popover with switches, not a Select
  expect(readFileSync(`${process.cwd()}/content/${dir}/select.mdx`, "utf8")).not.toContain("### Column configuration")
  expect(readFileSync(`${process.cwd()}/content/${dir}/popover.mdx`, "utf8")).toContain("### Column configuration")
})

test("each of the four links the other three first among its related components", () => {
  const family = ["menu", "context-menu", "select", "select-control"]
  for (const slug of family) {
    expect(RELATED_COMPONENTS[slug].slice(0, 3).sort(), slug).toEqual(family.filter((other) => other !== slug).sort())
  }
})

test("the sidebar has no rules for a Menus group", () => {
  expect(readFileSync(`${process.cwd()}/app/globals.css`, "utf8")).not.toContain('a[href$="/components/menu"]')
})
