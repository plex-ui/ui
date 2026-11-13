import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, ref } from "vue"
import * as ReactSidebar from "../../packages/ui/src/components/Sidebar"
import * as VueSidebar from "../../packages/vue/src/components/Sidebar"
import { ResponsiveSidebar, ResponsiveSidebarProvider, SidebarDemoPage } from "../../components/docs/SidebarDemosFrame"
import * as VueFrame from "../../components/docs/vue/VueSidebarDemosFrame"
import { flushVue, mountVue } from "./harness"

const viewport = vi.hoisted(() => ({ mobile: true }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => !viewport.mobile }))
vi.mock("@plexui/vue/composables/useBreakpoints", () => ({ useBreakpoint: () => ref(!viewport.mobile) }))
vi.mock("@plexui/ui/components/Sidebar", async () => await import("../../packages/ui/src/components/Sidebar"))
vi.mock("@plexui/vue/components/Sidebar", async () => await import("../../packages/vue/src/components/Sidebar"))
vi.mock("@plexui/ui/components/Page", async () => await import("../../packages/ui/src/components/Page"))
vi.mock("@plexui/vue/components/Page", async () => await import("../../packages/vue/src/components/Page"))
vi.mock("@plexui/ui/components/Button", async () => await import("../../packages/ui/src/components/Button"))
vi.mock("@plexui/vue/components/Button", async () => await import("../../packages/vue/src/components/Button"))
vi.mock("@plexui/ui/components/Toolbar", async () => await import("../../packages/ui/src/components/Toolbar"))
vi.mock("@plexui/vue/components/Toolbar", async () => await import("../../packages/vue/src/components/Toolbar"))

beforeEach(() => {
  viewport.mobile = true
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(max-width: 767px)" && viewport.mobile,
    addEventListener: () => {}, removeEventListener: () => {},
  }))
})
afterEach(() => vi.unstubAllGlobals())

async function mountFrame(framework: string) {
  const select = vi.fn()
  if (framework === "React") {
    render(<ResponsiveSidebarProvider open={false} collapsible="icon" variant="app">
      <ReactSidebar.SidebarLayout>
        <ResponsiveSidebar>
          <ReactSidebar.SidebarContent><ReactSidebar.SidebarMenu>
            <ReactSidebar.SidebarMenuItem>
              <ReactSidebar.SidebarMenuButton aria-expanded={false}>Group</ReactSidebar.SidebarMenuButton>
              <ReactSidebar.SidebarMenuSub open={false}><li>Nested item</li></ReactSidebar.SidebarMenuSub>
            </ReactSidebar.SidebarMenuItem>
            <ReactSidebar.SidebarMenuItem>
              <ReactSidebar.SidebarMenuButton data-testid="leaf" onClick={select}>Orders</ReactSidebar.SidebarMenuButton>
            </ReactSidebar.SidebarMenuItem>
          </ReactSidebar.SidebarMenu></ReactSidebar.SidebarContent>
        </ResponsiveSidebar>
        <SidebarDemoPage title="Overview"><p>Page content</p></SidebarDemoPage>
      </ReactSidebar.SidebarLayout>
    </ResponsiveSidebarProvider>)
  } else {
    mountVue(() => h(VueFrame.ResponsiveSidebarProvider, { open: false, collapsible: "icon", variant: "app" }, () =>
      h(VueSidebar.SidebarLayout, null, () => [
        h(VueFrame.ResponsiveSidebar, null, () => h(VueSidebar.SidebarContent, null, () => h(VueSidebar.SidebarMenu, null, () => [
          h(VueSidebar.SidebarMenuItem, null, () => [
            h(VueSidebar.SidebarMenuButton, { "aria-expanded": false }, () => "Group"),
            h(VueSidebar.SidebarMenuSub, { open: false }, () => h("li", "Nested item")),
          ]),
          h(VueSidebar.SidebarMenuItem, null, () => h(VueSidebar.SidebarMenuButton, { "data-testid": "leaf", onClick: select }, () => "Orders")),
        ]))),
        h(VueFrame.SidebarDemoPage, { title: "Overview" }, () => h("p", "Page content")),
      ])))
    await flushVue()
  }
  return select
}

async function openMenu() {
  const trigger = document.querySelector<HTMLButtonElement>('main [aria-label="Open menu"]')!
  trigger.focus()
  await act(async () => { fireEvent.click(trigger); await flushVue() })
  return trigger
}

describe.each(["React", "Vue"])("%s responsive sidebar demo", (framework) => {
  test("uses a mobile drawer, preserves disclosure, then closes after selecting a leaf", async () => {
    const select = await mountFrame(framework)
    const navigation = document.querySelector('[role="dialog"]')!
    expect(document.querySelector("aside")).toBeNull()
    expect(navigation.hasAttribute("inert")).toBe(true)
    const trigger = await openMenu()
    expect(navigation.hasAttribute("inert")).toBe(false)
    expect(document.querySelector("main")?.hasAttribute("inert")).toBe(true)
    expect(document.activeElement).toBe(navigation.querySelector('[aria-label="Close menu"]'))
    // A grouped page with a large title, which stands at the top of its content, and the glass Close of iOS 26
    expect(navigation.querySelector('[data-surface="grouped"] > [data-toolbar][data-title-style="large"]')).not.toBeNull()
    expect(navigation.querySelector('[data-surface="grouped"] > .Content .Heading[data-in-content] h1')?.textContent).toBe("Navigation")
    expect(navigation.querySelector('[aria-label="Close menu"]')?.getAttribute("data-navigation-action")).toBe("close")
    await act(async () => { fireEvent.click(navigation.querySelector('[aria-expanded="false"]')!); await flushVue() })
    expect(navigation.hasAttribute("inert")).toBe(false)
    await act(async () => { fireEvent.click(navigation.querySelector('[data-testid="leaf"]')!); await flushVue() })
    expect(select).toHaveBeenCalledOnce()
    expect(navigation.hasAttribute("inert")).toBe(true)
    expect(document.querySelector("main")?.hasAttribute("inert")).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  test("Escape closes the drawer and restores the toolbar trigger", async () => {
    await mountFrame(framework)
    const trigger = await openMenu()
    // From inside the drawer, where focus is: a layer over it takes its own Escape first
    await act(async () => { fireEvent.keyDown(document.activeElement!, { key: "Escape" }); await flushVue() })
    expect(document.querySelector('[role="dialog"]')?.hasAttribute("inert")).toBe(true)
    expect(document.activeElement).toBe(trigger)
  })

  test("desktop keeps the controlled collapsed rail and original content layout", async () => {
    viewport.mobile = false
    await mountFrame(framework)
    expect(document.querySelector("aside")).toBeTruthy()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector('[data-sidebar="collapsed"]')).toBeTruthy()
    expect(document.querySelector('main [aria-label="Open menu"]')).toBeNull()
  })
})
