import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { ref } from "vue"
import { SidebarOverviewDemo } from "../../components/docs/SidebarDemos"
import { VueSidebarDemo } from "../../components/docs/vue/VueSidebarDemos"
import type { VueDemoControl } from "../../components/docs/vue/VueDemo"
import { flushVue } from "./harness"

const viewport = vi.hoisted(() => ({ mobile: false }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => !viewport.mobile }))
vi.mock("@plexui/vue/composables/useBreakpoints", () => ({ useBreakpoint: () => ref(!viewport.mobile) }))
vi.mock("@plexui/ui/components/Sidebar", async () => await import("../../packages/ui/src/components/Sidebar"))
vi.mock("@plexui/vue/components/Sidebar", async () => await import("../../packages/vue/src/components/Sidebar"))
vi.mock("@plexui/ui/components/Page", async () => await import("../../packages/ui/src/components/Page"))
vi.mock("@plexui/vue/components/Page", async () => await import("../../packages/vue/src/components/Page"))
vi.mock("../../components/docs/VuePreview", async () => ({
  VuePreview: (await import("../../components/docs/VuePreviewRuntime")).default,
}))

// Owner 16.11 («Sidebar: Overview плюс Mobile Menu»): the examples that were settings of one sidebar are the settings
// of its Overview. The Vue demo mounts the page's own template and controls.
const mdx = readFileSync("content/vue/components/sidebar.mdx", "utf8")
const read = (name: string, bindings: Record<string, unknown> = {}): unknown => {
  const prefix = `export const ${name} = `
  const start = mdx.indexOf(prefix) + prefix.length
  const end = mdx.slice(start).search(/\nexport const |\n<UsageBlock>|\n## /)
  return new Function(...Object.keys(bindings), `return ${mdx.slice(start, start + end).trim()}`)(...Object.values(bindings))
}
const helpers = () => {
  const indent = read("indent")
  return { indent, demoHeader: read("demoHeader", { indent }), upgradeCard: read("upgradeCard") }
}
const template = read("overview", helpers()) as string
const controls = read("overviewControls", { COLLAPSIBLE: ["none", "icon", "offcanvas"], LABEL_SIZES: ["sm", "lg"] }) as VueDemoControl[]

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(max-width: 767px)" && viewport.mobile, addEventListener: () => {}, removeEventListener: () => {} }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const interact = async (callback: () => void) => { await act(async () => { callback(); await flushVue() }) }
const mount = async (framework: string) => {
  const view = render(framework === "React"
    ? <SidebarOverviewDemo />
    : <VueSidebarDemo template={template} state={{ activeItem: "Overview", settingsOpen: true, query: "" }} controls={controls} />)
  await interact(() => {})
  return view
}
const control = (view: ReturnType<typeof render>, name: string) =>
  view.container.querySelector<HTMLElement>(`[data-demo-controls] [aria-label="${name}"]`)
const rows = (view: ReturnType<typeof render>) =>
  [...view.container.querySelectorAll<HTMLElement>("[data-demo-stage] aside button")].map((button) => button.textContent?.trim()).filter(Boolean)

describe.each(["React", "Vue"])("%s Sidebar Overview", (framework) => {
  test("carries every setting of a sidebar, each where it acts", async () => {
    const view = await mount(framework)
    const names = [...view.container.querySelectorAll("[data-demo-controls] label, [data-demo-controls] span")].map((label) => label.textContent?.trim())
    for (const name of ["variant", "collapsible", "open", "labelSize", "icons", "badges", "submenus", "search", "footer", "bordered"]) {
      expect(names, name).toContain(name)
    }
    // A Settings row with a submenu, open by default
    expect(rows(view)).toEqual(expect.arrayContaining(["Settings", "General", "Billing", "Members"]))
    // bordered is a setting of the default variant only
    await interact(() => fireEvent.click(within(control(view, "variant")!).getByText("app")))
    expect([...view.container.querySelectorAll("[data-demo-controls] label, [data-demo-controls] span")].map((label) => label.textContent?.trim())).not.toContain("bordered")
  })

  test("search narrows the rows to the ones that match, with their submenu", async () => {
    const view = await mount(framework)
    await interact(() => fireEvent.click(control(view, "search")!))
    const input = view.container.querySelector<HTMLInputElement>("[data-demo-stage] .demo-sidebar-search input")!
    expect(input).not.toBeNull()
    await interact(() => fireEvent.input(input, { target: { value: "bil" } }))
    await interact(() => fireEvent.change(input, { target: { value: "bil" } }))
    expect(rows(view)).toEqual(["Settings", "Billing"])
  })

  test("the footer holds a card or a person menu", async () => {
    const view = await mount(framework)
    await interact(() => fireEvent.click(within(control(view, "footer")!).getByText("user")))
    expect(rows(view)).toContain("SSam Lee")
    await interact(() => fireEvent.click(within(control(view, "footer")!).getByText("card")))
    expect(view.container.querySelector("[data-demo-stage] aside")?.textContent).toContain("Upgrade to Pro")
  })
})
