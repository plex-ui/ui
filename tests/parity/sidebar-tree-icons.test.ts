import { readdirSync, readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, test } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")

/** The declarations of the rules for `selector` outside any media query. */
const declsOf = (path: string, selector: string, media?: string) => {
  const decls: Record<string, string> = {}
  postcss.parse(read(path)).walkRules((rule) => {
    let parent = rule.parent
    let full = rule.selector
    let params: string | undefined
    while (parent) {
      if (parent.type === "rule") full = full.includes("&") ? full.replace(/&/g, (parent as postcss.Rule).selector) : `${(parent as postcss.Rule).selector} ${full}`
      if (parent.type === "atrule" && (parent as postcss.AtRule).name === "media") params ??= (parent as postcss.AtRule).params
      parent = parent.parent as typeof parent
    }
    if (params !== media || full.replace(/\s+/g, " ") !== selector) return
    rule.each((node) => {
      if (node.type === "decl") decls[node.prop] = node.value.replace(/\s+/g, " ")
    })
  })
  return decls
}

const sidebar = "packages/styles/src/components/Sidebar/Sidebar.module.css"

describe("Sidebar tree", () => {
  test("under a parent with icons the levels step 12px from its text: 38, 50, 62", () => {
    const at = (level: number) => declsOf(sidebar, `.MenuSub[data-has-icons="true"] .MenuSubButton.indent${level}`)["padding-left"]
    expect([at(1), at(2), at(3)]).toEqual(["38px", "50px", "62px"])
  })

  test("a row's focus ring is drawn inside it, so a clipping submenu never cuts its corners", () => {
    expect(declsOf(sidebar, ".MenuButton:focus-visible::before")["box-shadow"]).toMatch(/^inset /)
    expect(declsOf(sidebar, ".MenuSubButton:focus-visible::before")["box-shadow"]).toMatch(/^inset /)
  })

  test("a submenu row's label truncates at its start; a label can start at the group's edge; an open branch leaves a gap", () => {
    const label = declsOf(sidebar, ".MenuSubButtonLabel")
    expect(label).toMatchObject({ "min-width": "0", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap", "text-align": "start" })
    expect(declsOf(sidebar, '.GroupLabel[data-inset="false"]')["padding-inline"]).toBe("0")
    expect(declsOf(sidebar, '.MenuSub[data-state="open"]', "(min-width: 768px)")["padding-bottom"]).toBe("var(--sidebar-menu-sub-open-gap, 4px)")
  })

  test("React and Vue export the label part and the label's inset", () => {
    for (const file of ["packages/ui/src/components/Sidebar/Sidebar.tsx", "packages/vue/src/components/Sidebar/Sidebar.ts"]) {
      const source = read(file)
      expect(source).toContain("SidebarMenuSubButtonLabel")
      expect(source).toContain("s.MenuSubButtonLabel")
      expect(source).toContain('"false"')
    }
    expect(read("packages/ui/src/components/Sidebar/index.tsx")).toContain("SidebarMenuSubButtonLabel,")
    expect(read("packages/vue/src/components/Sidebar/index.ts")).toContain("SidebarMenuSubButtonLabel,")
  })
})

describe("icon modules", () => {
  // A component named as a global (Object, Array, Text…) would shadow it in its own module: Metro then reads the
  // global before the module's binding is set ("Cannot access 'Object' before initialization")
  const globals = new Set([...Object.getOwnPropertyNames(globalThis), "Comment", "Report", "Text", "Storage", "Clipboard"])

  test.each([
    ["React", "packages/ui/src/components/Icon/svg", ".tsx"],
    ["Vue", "packages/vue/src/components/Icon/svg", ".ts"],
  ])("%s: no icon binds the name of a global", (_framework, dir, extension) => {
    const shadowing = readdirSync(`${root}/${dir}`)
      .filter((file) => file.endsWith(extension))
      .filter((file) => {
        const binding = /^const (\w+)/m.exec(read(`${dir}/${file}`))?.[1]
        return binding != null && globals.has(binding)
      })
    expect(shadowing).toEqual([])
    // The export keeps the icon's own name
    expect(read(`${dir}/Object${extension}`)).toContain('displayName = "Object"')
  })
})
