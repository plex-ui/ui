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

test("the sidebar keeps the four in one open group, in the order of the note, among the components by name", () => {
  const { tree } = buildDocsTreeNavigation({ docs: empty, components, icons: empty })
  const list = tree.children.slice(1, 4)
  expect(list.map((node) => node.name)).toEqual(["Input", "Menus", "Popover"])
  const group = list[1]
  expect(group.type).toBe("folder")
  if (group.type !== "folder") return
  expect(group.defaultOpen).toBe(true)
  expect(group.children.map((node) => node.name)).toEqual(["Menu", "Context Menu", "Select", "Select Control"])
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

test("the group's name reads as an item and its pages stand in, in the sidebar and the phone drawer", () => {
  const css = readFileSync(`${process.cwd()}/app/globals.css`, "utf8")
  for (const root of ["#nd-docs-layout.plex-docs-shell #nd-sidebar", "#nd-sidebar-mobile"]) {
    expect(css).toContain(`${root} div:has(+ div > a[href$="/components/menu"])`)
    expect(css).toContain(`${root} div:has(> a[href$="/components/menu"]) > a[data-active]`)
  }
  // The docs' CSS compiler drops a rule whose :is() holds a complex selector, so the group's rules spell each root out
  expect(css).not.toMatch(/:is\([^)]*#nd-sidebar[^)]*\) div:has/)
  expect(css).toMatch(/div:has\(> a\[href\$="\/components\/menu"\]\) > a\[data-active\] \{\s*padding-inline-start: 32px !important;/)
})
