import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useState, type ComponentType } from "react"
import { afterEach, describe, expect, test } from "vitest"
import { h, ref, type VNode } from "vue"
import { NavigationButton as RNavigationButton } from "../../packages/ui/src/components/Button"
import { Page as RPage } from "../../packages/ui/src/components/Page"
import { Toolbar as RToolbar, type ToolbarSearchPlacement } from "../../packages/ui/src/components/Toolbar"
import { NavigationButton } from "../../packages/vue/src/components/Button"
import { Page, PageContent } from "../../packages/vue/src/components/Page"
import { Toolbar, ToolbarContent, ToolbarLeading, ToolbarTitle, ToolbarTrailing } from "../../packages/vue/src/components/Toolbar"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// A screen's search placed by `Toolbar.Content search` (owner 23.11): written in the bottom bar, the field stays there
// ("bottom", and "auto" on iOS) or becomes a search button of the top bar that opens the field over it ("top", and
// "auto" in the Plex Android look). React and Vue build the same DOM and behave alike.

type AnyComponent = ComponentType<Record<string, unknown>>
type Search = boolean | ToolbarSearchPlacement

function ReactScreen({ search }: { search: Search }) {
  const [query, setQuery] = useState("")
  return createElement(
    RPage as unknown as AnyComponent,
    null,
    createElement(
      RToolbar as unknown as AnyComponent,
      null,
      createElement(RToolbar.Leading, null, createElement(RNavigationButton, { action: "close" })),
      createElement(RToolbar.Title as unknown as AnyComponent, null, "Orders"),
      createElement(RToolbar.Trailing, null, createElement(RNavigationButton, { action: "confirm", label: "Done" })),
    ),
    createElement(RPage.Content, null, createElement("p", { "data-query": "" }, query)),
    createElement(
      RToolbar as unknown as AnyComponent,
      { placement: "bottom" },
      createElement(RToolbar.Content as unknown as AnyComponent, { fill: true, search },
        createElement("input", { "aria-label": "Search orders", value: query, onChange: (event: { target: HTMLInputElement }) => setQuery(event.target.value) })),
    ),
  )
}

const vueScreen = (search: Search) => {
  const query = ref("")
  return () => h(Page as never, null, () => [
    h(Toolbar as never, null, () => [
      h(ToolbarLeading, null, () => h(NavigationButton, { action: "close" })),
      h(ToolbarTitle, null, () => "Orders"),
      h(ToolbarTrailing, null, () => h(NavigationButton, { action: "confirm", label: "Done" })),
    ]),
    h(PageContent, null, () => h("p", { "data-query": "" }, query.value)),
    h(Toolbar as never, { placement: "bottom" }, () => h(ToolbarContent, { fill: true, search }, () =>
      h("input", { "aria-label": "Search orders", "value": query.value, "onInput": (event: Event) => { query.value = (event.target as HTMLInputElement).value } }))),
  ])
}

const mount = async (framework: "React" | "Vue", search: Search) => {
  if (framework === "React") {
    render(createElement(ReactScreen, { search }))
    await act(async () => {})
    return () => cleanup()
  }
  const { unmount } = mountVue(vueScreen(search) as () => VNode)
  await flushVue()
  return unmount
}

const settle = (framework: "React" | "Vue") => (framework === "React" ? act(async () => {}) : flushVue())

const topBar = () => document.querySelector<HTMLElement>('[data-toolbar][data-placement="top"]')
const bottomBar = () => document.querySelector<HTMLElement>('[data-toolbar][data-placement="bottom"]')
const trigger = () => document.querySelector<HTMLButtonElement>("[data-toolbar-search-trigger]")
const field = () => document.querySelector<HTMLInputElement>('input[aria-label="Search orders"]')

const setAndroid = (android: boolean) => {
  if (android) document.documentElement.setAttribute("data-platform", "android")
  else document.documentElement.removeAttribute("data-platform")
}

afterEach(() => {
  cleanup()
  setAndroid(false)
})

describe("Toolbar.Content search", () => {
  test.each<[string, boolean, Search]>([
    ["auto on iOS", false, true],
    ["bottom in the Plex Android look", true, "bottom"],
  ])("%s keeps the field in the bottom bar", async (_, android, search) => {
    setAndroid(android)
    for (const framework of ["React", "Vue"] as const) {
      const unmount = await mount(framework, search)
      expect(trigger()).toBeNull()
      expect(bottomBar()?.contains(field())).toBe(true)
      expect(topBar()?.hasAttribute("data-search")).toBe(false)
      unmount()
    }
  })

  test.each<[string, boolean, Search]>([
    ["top on iOS", false, "top"],
    ["auto in the Plex Android look", true, true],
  ])("%s makes the field a search button of the top bar and the bottom bar leaves", async (_, android, search) => {
    setAndroid(android)
    const doms: string[] = []
    for (const framework of ["React", "Vue"] as const) {
      const unmount = await mount(framework, search)
      const bar = topBar()
      expect(bar?.hasAttribute("data-search")).toBe(true)
      // The button stands first among the trailing actions, named after the field, before the confirm
      const trailing = trigger()?.closest("[data-toolbar-search-button]")?.parentElement
      expect(trailing?.parentElement).toBe(bar)
      expect(trailing?.firstElementChild?.hasAttribute("data-toolbar-search-button")).toBe(true)
      expect(trailing?.lastElementChild?.getAttribute("data-navigation-action")).toBe("confirm")
      expect(trigger()?.getAttribute("aria-label")).toBe("Search orders")
      expect(trigger()?.getAttribute("aria-expanded")).toBe("false")
      // The field waits in the layer over the bar; the bottom bar holds nothing else, so it draws nothing
      expect(field()?.closest("[data-toolbar-search-layer]")?.parentElement).toBe(bar)
      expect(bottomBar()).toBeNull()
      expect(document.querySelector("[data-toolbar-vacant]")?.hasAttribute("hidden")).toBe(true)
      doms.push(serializeDom())
      unmount()
    }
    expect(doms[1]).toBe(doms[0])
  })

  test.each(["React", "Vue"] as const)("%s: the button opens the field, Back closes it, clears it and gives the button the focus", async (framework) => {
    setAndroid(true)
    const unmount = await mount(framework, true)
    fireEvent.click(trigger()!)
    await settle(framework)
    expect(topBar()?.hasAttribute("data-search-open")).toBe(true)
    expect(trigger()?.getAttribute("aria-expanded")).toBe("true")
    expect(document.activeElement).toBe(field())

    fireEvent.input(field()!, { target: { value: "ann" } })
    await settle(framework)
    expect(document.querySelector("[data-query]")?.textContent).toBe("ann")

    const back = document.querySelector<HTMLButtonElement>('[data-toolbar-search-layer] button[aria-label="Close search"]')
    fireEvent.click(back!)
    await settle(framework)
    expect(topBar()?.hasAttribute("data-search-open")).toBe(false)
    expect(field()?.value).toBe("")
    expect(document.querySelector("[data-query]")?.textContent).toBe("")
    expect(document.activeElement).toBe(trigger())
    unmount()
  })

  test.each(["React", "Vue"] as const)("%s: Escape closes the open search first", async (framework) => {
    setAndroid(true)
    const unmount = await mount(framework, true)
    fireEvent.click(trigger()!)
    await settle(framework)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
    await settle(framework)
    expect(topBar()?.hasAttribute("data-search-open")).toBe(false)
    expect(document.activeElement).toBe(trigger())
    unmount()
  })

  test.each(["React", "Vue"] as const)("%s: the placement follows the platform both ways, and the places leave with it", async (framework) => {
    const unmount = await mount(framework, true)
    expect(trigger()).toBeNull()
    setAndroid(true)
    await settle(framework)
    await settle(framework)
    expect(trigger()).not.toBeNull()
    expect(bottomBar()).toBeNull()
    setAndroid(false)
    await settle(framework)
    await settle(framework)
    expect(trigger()).toBeNull()
    expect(topBar()?.hasAttribute("data-search")).toBe(false)
    expect(document.querySelector("[data-toolbar-search-layer], [data-toolbar-search-button]")).toBeNull()
    expect(bottomBar()?.contains(field())).toBe(true)
    unmount()
  })
})
