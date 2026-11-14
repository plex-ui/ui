import { readFileSync } from "node:fs"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, markRaw, reactive } from "vue"
import { FormRowsTagsDemo } from "../../components/docs/FormRowsDemos"
import { removeTagWithFocus } from "../../components/docs/tagRemovalFocus"
import { vueComponents } from "../../components/docs/vue/registry"
import { MobileTagRow } from "../../components/docs/vue/MobileTagRow"
import { Badge } from "../../packages/vue/src/components/Badge"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

const viewport = vi.hoisted(() => ({ wide: true }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => viewport.wide }))
vi.mock("@plexui/ui/components/Badge", async () => import("../../packages/ui/src/components/Badge"))

const mdx = readFileSync("content/vue/components/settings-forms.mdx", "utf8")
const expression = mdx.slice(mdx.indexOf("export const rowTags = ") + "export const rowTags = ".length, mdx.indexOf("export const withTagRemoval = ")).trim()
const template = new Function("formScreen", `return ${expression}`)((_title: string, fields: string) => `<div>${fields}</div>`)
if (typeof template !== "string") throw new Error("Tags template was not resolved")

beforeEach(() => {
  viewport.wide = true
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const mountExample = async (framework: string) => {
  if (framework === "React") {
    const view = render(<FormRowsTagsDemo />)
    return { setWide: (wide: boolean) => { viewport.wide = wide; view.rerender(<FormRowsTagsDemo />) } }
  }
  const state = reactive({
    wide: viewport.wide,
    MobileTagRow: markRaw(MobileTagRow),
    materials: ["oak", "steel", "linen", "glass", "wool"],
    labels: ["new"],
    materialOptions: ["Oak", "Steel", "Linen", "Glass", "Wool"].map((label) => ({ value: label.toLowerCase(), label })),
    labelOptions: [{ value: "new", label: "New", color: "discovery" }],
    removeTagWithFocus,
  })
  const Example = defineComponent({
    components: { ...vueComponents, Badge },
    setup: () => state,
    template,
  })
  mountVue(() => h(Example))
  await flushVue()
  return { setWide: (wide: boolean) => { viewport.wide = wide; state.wide = wide } }
}

describe.each(["React", "Vue"])("%s Desktop removable tag row", (framework) => {
  test("removing focused tags stays in the same row: next, previous, then Add", async () => {
    await mountExample(framework)
    const page = within(document.body)
    const remove = async (label: string, next: string) => {
      const button = page.getByRole("button", { name: `Remove ${label}` })
      await interact(() => button.focus())
      await interact(() => fireEvent.click(button))
      expect(page.queryByRole("button", { name: `Remove ${label}` })).toBeNull()
      expect(document.activeElement).toBe(page.getByRole("button", { name: next }))
    }
    await remove("Steel", "Remove Linen")
    await remove("Wool", "Remove Glass")
    await remove("Oak", "Remove Linen")
    await remove("Linen", "Remove Glass")
    await remove("Glass", "Add material")
    expect(page.getByRole("button", { name: "Remove New" })).toBeTruthy()
    await remove("New", "Add label")
  })
})

describe.each(["React", "Vue"])("%s Phone tag rows", (framework) => {
  test("the documented form uses summary rows instead of inline removal and opens the matching editor", async () => {
    viewport.wide = false
    await mountExample(framework)
    const page = within(document.body)
    expect(page.queryByRole("button", { name: /^Remove / })).toBeNull()
    expect(page.queryByRole("button", { name: "Add material" })).toBeNull()
    expect(page.getByRole("button", { name: "Labels: New" })).toBeTruthy()
    const materials = page.getByRole("button", { name: "Materials: Oak, Steel, Linen, Glass, Wool" })
    await interact(() => fireEvent.click(materials))
    const editor = await page.findByRole("dialog", { name: "Materials" })
    expect(within(editor).getAllByRole("checkbox", { checked: true })).toHaveLength(5)
    await interact(() => fireEvent.click(within(editor).getByRole("checkbox", { name: "Steel", exact: true })))
    await interact(() => fireEvent.click(within(editor).getByRole("button", { name: "Apply materials" })))
    expect(await page.findByRole("button", { name: "Materials: Oak, Linen, Glass, Wool" })).toBeTruthy()
    expect(page.getByRole("button", { name: "Labels: New" })).toBeTruthy()
  })

  test("a selection made on Phone stays when the form changes Phone to Desktop and back", async () => {
    viewport.wide = false
    const { setWide } = await mountExample(framework)
    const page = within(document.body)
    await interact(() => fireEvent.click(page.getByRole("button", { name: "Materials: Oak, Steel, Linen, Glass, Wool" })))
    const editor = await page.findByRole("dialog", { name: "Materials" })
    await interact(() => fireEvent.click(within(editor).getByRole("button", { name: "Clear all", exact: true })))
    await interact(() => fireEvent.click(within(editor).getByRole("checkbox", { name: "Linen", exact: true })))
    await interact(() => fireEvent.click(within(editor).getByRole("button", { name: "Apply materials" })))
    expect(await page.findByRole("button", { name: "Materials: Linen" })).toBeTruthy()
    await interact(() => setWide(true))
    expect(page.getByRole("button", { name: "Remove Linen" })).toBeTruthy()
    expect(page.queryByRole("button", { name: "Remove Oak" })).toBeNull()
    await interact(() => setWide(false))
    await interact(() => fireEvent.click(page.getByRole("button", { name: "Materials: Linen" })))
    const reopened = await page.findByRole("dialog", { name: "Materials" })
    expect(within(reopened).getByRole("checkbox", { name: "Linen", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(within(reopened).getByRole("checkbox", { name: "Oak", exact: true }).getAttribute("aria-checked")).toBe("false")
  })
})
