import { readFileSync } from "node:fs"
import { expect, test } from "vitest"
import { buildDocsTreeNavigation } from "../../lib/docs-navigation"
import { RELATED_COMPONENTS } from "../../lib/related-components"

// Owner 10.11 («как лучше организовать? чтобы было понятно что и где искать» → «Делай все 6 пунктов»): Menu, Context
// Menu and Select are one iOS menu opened three ways, so the docs keep them together and say which to use. Select
// Control, the look of Select's button alone, is a section of the Select page (owner 16.11).
const page = (slug: string) => ({ type: "page" as const, name: slug, url: `/components/${slug}` })
const names = { menu: "Menu", "context-menu": "Context Menu", select: "Select", input: "Input", popover: "Popover" }
const components = { name: "Components", children: Object.entries(names).map(([slug, name]) => ({ ...page(slug), name })) }
const empty = { name: "", children: [] }

// Owner 10.11 on the one open «Menus» group: «это хорошая идея делать вложенные контролы???? только в этом одном
// месте? кажется не очень / посмотри как делает Apple и другие». No big kit nests one group in a flat list; Apple, Ant,
// Polaris, Atlassian and Mantine group every page. Owner 16.11 approved groups for every page (lib/component-groups.ts),
// with no nesting: a heading over each group. The three stay where their kind is (Menu and Context Menu with the
// actions, Select with the choices); the note and Related components tie them together.
test("the sidebar lists the three under the headings of their groups, with no group of their own", () => {
  const { tree } = buildDocsTreeNavigation({ docs: empty, components, icons: empty })
  const headings: Record<string, string> = {}
  let heading = ""
  for (const node of tree.children) {
    if (node.type === "separator") heading = String(node.name)
    else if (node.type === "page") headings[String(node.name)] = heading
  }
  expect(headings).toMatchObject({ "Context Menu": "Actions", Menu: "Actions", Select: "Selection", Input: "Text Input", Popover: "Overlays" })
  expect(tree.children.filter((node) => node.type === "folder")).toEqual([])
})

test.each(["components", "vue/components"])("%s: each of the three pages says which to use, right after its usage", (dir) => {
  for (const slug of ["menu", "context-menu", "select"]) {
    const mdx = readFileSync(`${process.cwd()}/content/${dir}/${slug}.mdx`, "utf8")
    const note = `<MenuFamilyNote current="${slug}"${dir === "vue/components" ? ' framework="vue"' : ""} />`
    expect(mdx, slug).toMatch(new RegExp(`</UsageBlock>\\s*${note.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`))
  }
  // The phone row is described once, on Menu
  expect(readFileSync(`${process.cwd()}/content/${dir}/menu.mdx`, "utf8")).toContain("### On a phone")
  // Column configuration is a Popover with switches, not a Select
  expect(readFileSync(`${process.cwd()}/content/${dir}/select.mdx`, "utf8")).not.toContain("### Column configuration")
  expect(readFileSync(`${process.cwd()}/content/${dir}/popover.mdx`, "utf8")).toContain("### Column configuration")
  // Select Control is a section of Select, and the note links it there
  expect(readFileSync(`${process.cwd()}/content/${dir}/select.mdx`, "utf8")).toContain("### Select Control")
})

test("each of the three links the other two first among its related components", () => {
  const family = ["menu", "context-menu", "select"]
  for (const slug of family) {
    expect(RELATED_COMPONENTS[slug].slice(0, 2).sort(), slug).toEqual(family.filter((other) => other !== slug).sort())
  }
})

test("the sidebar has no rules for a Menus group", () => {
  expect(readFileSync(`${process.cwd()}/app/globals.css`, "utf8")).not.toContain('a[href$="/components/menu"]')
})
