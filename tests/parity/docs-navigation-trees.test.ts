import { expect, test } from "vitest"
import { buildDocsTreeNavigation } from "../../lib/docs-navigation"

// fumadocs caches the list of pages its page arrows step through (useFooterItems) under the tree's `$id`, for the
// life of the process. The React and React Native layouts each build a tree; without ids of their own both were "0",
// and a server that had rendered a React Native page gave React pages its arrows (Button → Menu, not Button Group).
const empty = { name: "", children: [] }
const tree = (prefix: string) => buildDocsTreeNavigation({
  docs: empty,
  components: { name: "Components", children: [{ type: "page" as const, name: "Button", url: `${prefix}/components/button` }] },
  icons: empty,
}).tree

test("the React and React Native trees have ids of their own, the same on every render", () => {
  expect(tree("").$id).toBe("docs")
  expect(tree("/react-native").$id).toBe("docs-react-native")
  expect(tree("").$id).toBe(tree("").$id)
})

// Owner 23.11: the sidebar lists the section of the top nav, the components, the docs or the icons, not all three
const sections = (section?: "components" | "docs" | "icons") =>
  buildDocsTreeNavigation(
    {
      docs: empty,
      components: { name: "Components", children: [{ type: "page" as const, name: "Button", url: "/components/button" }] },
      icons: { name: "Icons", children: [{ type: "page" as const, name: "Lucide", url: "/icons/lucide" }] },
    },
    section,
  ).tree
const groups = (root: ReturnType<typeof sections>) => root.children.filter((node) => node.type === "separator").map((node) => node.name)

test("each section's sidebar lists its own pages, under a tree id of its own", () => {
  expect(groups(sections("components"))).not.toContain("Get Started")
  expect(groups(sections("components"))).not.toContain("Icons")
  expect(groups(sections("docs"))).toEqual(["Get Started", "Foundations", "AI & Distribution"])
  expect(groups(sections("icons"))).toEqual(["Icons"])
  expect(new Set([sections("components").$id, sections("docs").$id, sections("icons").$id]).size).toBe(3)
  // Without a section, as the home page's drawer: every group
  expect(groups(sections())).toEqual(expect.arrayContaining(["Get Started", "Icons"]))
})
