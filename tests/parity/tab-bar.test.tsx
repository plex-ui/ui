import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive, ref, type VNode } from "vue"
import { Calendar as RCalendar, Home as RHome, Images as RImages, SettingsCog as RSettingsCog } from "../../packages/ui/src/components/Icon"
import { Page as RPage } from "../../packages/ui/src/components/Page"
import { TabBar as RTabBar, type TabBarProps as RTabBarProps } from "../../packages/ui/src/components/TabBar"
import { Calendar, Home, Images, SettingsCog } from "../../packages/vue/src/components/Icon"
import { Page, PageContent } from "../../packages/vue/src/components/Page"
import { TabBar, TabBarItem } from "../../packages/vue/src/components/TabBar"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair } from "./pair"

// React-vs-Vue parity for TabBar: the same navigation for every prop, selection, the separate search tab,
// minimizing and expanding by a tap and by the Page scroll, the height reserved on the Page, and the kit tokens.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

type Tab = { value: string; label: string; icon: "home" | "calendar" | "photos" | "settings"; href?: string; disabled?: boolean; badge?: string | number }
const TABS: Tab[] = [
  { value: "home", label: "Home", icon: "home" },
  { value: "calendar", label: "Calendar", icon: "calendar" },
  { value: "photos", label: "Photos", icon: "photos" },
  { value: "settings", label: "Settings", icon: "settings" },
]
const reactIcons = { home: <RHome />, calendar: <RCalendar />, photos: <RImages />, settings: <RSettingsCog /> }
const vueIcons = { home: Home, calendar: Calendar, photos: Images, settings: SettingsCog }

// The prominent tab names its symbol by key: React takes the icon in the prop, Vue in the `prominent-icon` slot.
// The accessory is text: React takes it in the prop, Vue in the `accessory` slot.
type Case = Omit<RTabBarProps, "children" | "prominent" | "accessory"> & { tabs?: Tab[]; prominent?: { value: string; label: string; icon: Tab["icon"] }; accessory?: string }

const reactBar = ({ tabs = TABS, prominent, ...props }: Case) => (
  <RTabBar {...props} prominent={prominent && { ...prominent, icon: reactIcons[prominent.icon] }}>
    {tabs.map(({ icon, ...tab }) => <RTabBar.Item key={tab.value} {...tab} icon={reactIcons[icon]} />)}
  </RTabBar>
)

const vueProps = (props: Case) => {
  const { "aria-label": ariaLabel, onValueChange, onMinimizedChange, prominent, accessory: _accessory, ...rest } = props
  delete rest.tabs
  return {
    ...rest,
    ...(prominent && { prominent: { value: prominent.value, label: prominent.label } }),
    ...(ariaLabel !== undefined && { ariaLabel }),
    ...(onValueChange && { onValueChange }),
    ...(onMinimizedChange && { "onUpdate:minimized": onMinimizedChange }),
  }
}

const vueSlots = (props: Case) => ({
  "default": () => (props.tabs ?? TABS).map(({ icon, ...tab }) => h(TabBarItem, { key: tab.value, ...tab }, { icon: () => h(vueIcons[icon]) })),
  ...(props.prominent && { "prominent-icon": () => h(vueIcons[props.prominent!.icon]) }),
  ...(props.accessory !== undefined && { accessory: () => props.accessory }),
})

const vueBar = (props: Case) => h(TabBar, vueProps(props), vueSlots(props))

const cases: Array<[string, Case]> = [
  ["four tabs, the first selected", { defaultValue: "home" }],
  ["no tab selected", {}],
  ["three tabs and search, search selected", { tabs: TABS.slice(0, 3), search: { value: "search" }, defaultValue: "search" }],
  ["a search tab named in its own words", { tabs: TABS.slice(0, 2), search: { value: "find", label: "Find" }, defaultValue: "home" }],
  ["minimized on the second tab", { tabs: TABS.slice(0, 3), search: { value: "search" }, defaultValue: "calendar", defaultMinimized: true }],
  ["three tabs and a prominent tab, the prominent selected", { tabs: TABS.slice(0, 3), prominent: { value: "library", label: "Library", icon: "photos" }, defaultValue: "library" }],
  ["a prominent tab and search, search last in the capsule", { tabs: TABS.slice(0, 2), search: { value: "search" }, prominent: { value: "library", label: "Library", icon: "photos" }, defaultValue: "search" }],
  ["minimized beside a prominent tab", { tabs: TABS.slice(0, 3), prominent: { value: "library", label: "Library", icon: "photos" }, defaultValue: "home", defaultMinimized: true }],
  ["minimized, the prominent tab selected", { tabs: TABS.slice(0, 3), prominent: { value: "library", label: "Library", icon: "photos" }, defaultValue: "library", defaultMinimized: true }],
  ["minimized, search selected in the capsule beside a prominent tab", { tabs: TABS.slice(0, 2), search: { value: "search" }, prominent: { value: "library", label: "Library", icon: "photos" }, defaultValue: "search", defaultMinimized: true }],
  ["a link and a disabled tab", { tabs: [{ ...TABS[0], href: "/home" }, { ...TABS[1], disabled: true }, { ...TABS[2], href: "/photos", disabled: true }], defaultValue: "home" }],
  ["named", { "aria-label": "Sections", "defaultValue": "photos" }],
  ["badges: a count and a word, a count of 0 and an empty one shown as none", { tabs: [{ ...TABS[0], badge: 3 }, { ...TABS[1], badge: "New" }, { ...TABS[2], badge: 0 }, { ...TABS[3], badge: "" }], defaultValue: "home" }],
  ["a badge on the minimized tab", { tabs: [TABS[0], { ...TABS[1], badge: 12 }], search: { value: "search" }, defaultValue: "calendar", defaultMinimized: true }],
  ["an accessory above the tabs", { accessory: "Now Playing", defaultValue: "home" }],
  ["minimized, the accessory between the circles", { tabs: TABS.slice(0, 3), search: { value: "search" }, accessory: "Now Playing", defaultValue: "calendar", defaultMinimized: true }],
]

describe("TabBar DOM parity", () => {
  test.each(cases)("%s", async (_, props) => {
    const pair = await renderPair(reactBar(props), () => vueBar(props))
    expect(pair.vue).toBe(pair.react)
  })

  test("a navigation of buttons and links, the selected tab the current page", async () => {
    await act(async () => { render(reactBar({ tabs: [{ ...TABS[0], href: "/home" }, ...TABS.slice(1, 3)], search: { value: "search" }, defaultValue: "home" })) })
    const nav = document.querySelector("nav")
    expect(nav?.getAttribute("aria-label")).toBe("Tabs")
    expect([...document.querySelectorAll("nav a, nav button")].map((tab) => `${tab.tagName} ${tab.getAttribute("aria-current") ?? "-"} ${tab.getAttribute("aria-label") ?? tab.textContent}`)).toEqual([
      "A page Home", "BUTTON - Calendar", "BUTTON - Photos", "BUTTON - Search",
    ])
    expect([...document.querySelectorAll("nav span[aria-hidden]")].every((icon) => icon.firstElementChild?.tagName === "svg")).toBe(true)
    expect(document.querySelector("[role=tablist], [role=tab]")).toBeNull()
  })

  test("a badge is read after the label, and the accessory comes before the tabs", async () => {
    await act(async () => { render(reactBar({ tabs: [TABS[0], { ...TABS[1], badge: 3 }], accessory: "Now Playing", defaultValue: "home" })) })
    expect(document.querySelector("[data-value=calendar]")?.textContent).toBe("Calendar 3")
    expect(document.querySelector("nav")?.hasAttribute("data-accessory")).toBe(true)
    expect(document.querySelector("nav")?.firstElementChild?.textContent).toBe("Now Playing")
  })

  test.each([["false", false], ["null", null], ["an empty text", ""]] as const)("no accessory leaves no capsule: %s is nothing", async (_, accessory) => {
    await act(async () => { render(<RTabBar accessory={accessory} defaultValue="home"><RTabBar.Item value="home" label="Home" icon={<RHome />} /></RTabBar>) })
    expect(document.querySelector("nav")?.hasAttribute("data-accessory")).toBe(false)
    expect(document.querySelector("nav")?.childElementCount).toBe(1)
  })

  test("Vue: an accessory slot that renders nothing and a null badge leave nothing, as in React", async () => {
    mountVue(() => h(TabBar, { defaultValue: "home" }, {
      "default": () => [
        h(TabBarItem, { value: "home", label: "Home", badge: null as unknown as string }, { icon: () => h(Home) }),
        h(TabBarItem, { value: "calendar", label: "Calendar", badge: 0 }, { icon: () => h(Calendar) }),
      ],
      "accessory": () => [],
    }))
    await flushVue()
    expect(document.querySelector("nav")?.hasAttribute("data-accessory")).toBe(false)
    expect(document.querySelector("nav")?.childElementCount).toBe(1)
    expect([...document.querySelectorAll("[data-value]")].map((tab) => tab.textContent)).toEqual(["Home", "Calendar"])
  })
})

type SetMinimized = (next: boolean) => Promise<void>
const ACCESSORY_BAR: Case = { tabs: TABS.slice(0, 2), search: { value: "search" }, accessory: "Now Playing", defaultValue: "home" }

describe.each([
  ["React", async (): Promise<SetMinimized> => {
    let setMinimized: (next: boolean) => void = () => {}
    function Host() {
      const [minimized, set] = useState(false)
      setMinimized = set
      return reactBar({ ...ACCESSORY_BAR, minimized })
    }
    await act(async () => { render(<Host />) })
    return async (next) => { await act(async () => { setMinimized(next) }) }
  }],
  ["Vue", async (): Promise<SetMinimized> => {
    const state = reactive({ minimized: false })
    mountVue(() => vueBar({ ...ACCESSORY_BAR, minimized: state.minimized }))
    await flushVue()
    return async (next) => { state.minimized = next; await flushVue() }
  }],
] as const)("%s TabBar accessory", (_, mount) => {
  test("reads where it stands: above the tabs, and minimized between the circles, the same element moved", async () => {
    const setMinimized = await mount()
    const order = () => [...document.querySelector("nav")!.children].map((child) => child.textContent || child.getAttribute("aria-label"))
    const capsule = document.querySelector("nav")!.firstElementChild
    expect(order()).toEqual(["Now Playing", "HomeCalendar", "Search"])
    await setMinimized(true)
    expect(order()).toEqual(["HomeCalendar", "Now Playing", "Search"])
    expect(document.querySelector("nav")!.children[1]).toBe(capsule)
    await setMinimized(false)
    expect(order()).toEqual(["Now Playing", "HomeCalendar", "Search"])
    expect(document.querySelector("nav")!.firstElementChild).toBe(capsule)
  })
})

// Moving a node that holds the focus sends it to the body; the bar keeps it where it was, in both frameworks.
describe.each([
  ["React", async (): Promise<SetMinimized> => {
    let setMinimized: (next: boolean) => void = () => {}
    function Host() {
      const [minimized, set] = useState(false)
      setMinimized = set
      return (
        <RTabBar defaultValue="home" search={{ value: "search" }} accessory={<button type="button">Play</button>} minimized={minimized}>
          {TABS.slice(0, 2).map(({ icon, ...tab }) => <RTabBar.Item key={tab.value} {...tab} icon={reactIcons[icon]} />)}
        </RTabBar>
      )
    }
    await act(async () => { render(<Host />) })
    return async (next) => { await act(async () => { setMinimized(next) }) }
  }],
  ["Vue", async (): Promise<SetMinimized> => {
    const state = reactive({ minimized: false })
    mountVue(() => h(TabBar, { defaultValue: "home", search: { value: "search" }, minimized: state.minimized }, {
      default: () => TABS.slice(0, 2).map(({ icon, ...tab }) => h(TabBarItem, { key: tab.value, ...tab }, { icon: () => h(vueIcons[icon]) })),
      accessory: () => h("button", { type: "button" }, "Play"),
    }))
    await flushVue()
    return async (next) => { state.minimized = next; await flushVue() }
  }],
] as const)("%s TabBar accessory and focus", (_, mount) => {
  test("a tab or the accessory keeps the focus while the bar minimizes and expands", async () => {
    const setMinimized = await mount()
    const home = document.querySelector<HTMLElement>("[data-value=home]")!
    const play = [...document.querySelectorAll<HTMLElement>("nav button")].find((button) => button.textContent === "Play")!
    home.focus()
    await setMinimized(true)
    expect(document.activeElement).toBe(home)
    play.focus()
    await setMinimized(false)
    expect(document.activeElement).toBe(play)
    await setMinimized(true)
    expect(document.activeElement).toBe(play)
    home.focus()
    await setMinimized(false)
    expect(document.activeElement).toBe(home)
  })
})

type Mounted = { tab: (value: string) => HTMLElement; bar: () => HTMLElement; values: string[]; minimized: boolean[] }

const query = (values: string[], minimized: boolean[]): Mounted => ({
  tab: (value) => {
    const element = document.querySelector<HTMLElement>(`[data-value="${value}"]`)
    if (!element) throw new Error(`The tab bar must render the ${value} tab`)
    return element
  },
  bar: () => {
    const element = document.querySelector<HTMLElement>("nav")
    if (!element) throw new Error("The tab bar must render its navigation")
    return element
  },
  values,
  minimized,
})

type Mode = { controlled?: "follow" | "ignore"; controlledMinimized?: "follow" | "ignore" }

const mountReact = async (props: Case, mode: Mode = {}): Promise<Mounted> => {
  const values: string[] = []
  const minimized: boolean[] = []
  function Host() {
    const [value, setValue] = useState(props.defaultValue)
    const [isMinimized, setMinimized] = useState(props.defaultMinimized ?? false)
    return reactBar({
      ...props,
      ...(mode.controlled && { defaultValue: undefined, value }),
      ...(mode.controlledMinimized && { defaultMinimized: undefined, minimized: isMinimized }),
      onValueChange: (next) => { values.push(next); if (mode.controlled === "follow") setValue(next) },
      onMinimizedChange: (next) => { minimized.push(next); if (mode.controlledMinimized === "follow") setMinimized(next) },
    })
  }
  await act(async () => { render(<Host />) })
  return query(values, minimized)
}

const mountVueBar = async (props: Case, mode: Mode = {}): Promise<Mounted> => {
  const values: string[] = []
  const minimized: boolean[] = []
  const Host = defineComponent({
    setup: () => {
      const value = ref(props.defaultValue)
      const isMinimized = ref(props.defaultMinimized ?? false)
      return () => h(TabBar, {
        ...vueProps(props),
        ...(mode.controlled && { defaultValue: undefined, value: value.value }),
        ...(mode.controlledMinimized && { defaultMinimized: undefined, minimized: isMinimized.value }),
        "onUpdate:value": (next: string) => { values.push(next); if (mode.controlled === "follow") value.value = next },
        "onUpdate:minimized": (next: boolean) => { minimized.push(next); if (mode.controlledMinimized === "follow") isMinimized.value = next },
      }, vueSlots(props))
    },
  })
  mountVue(() => h(Host))
  await flushVue()
  return query(values, minimized)
}

const frameworks = [["React", mountReact], ["Vue", mountVueBar]] as const
const click = (element: HTMLElement) => interact(() => { fireEvent.click(element) })
const selected = () => [...document.querySelectorAll("[aria-current=page]")].map((tab) => tab.getAttribute("data-value"))

describe.each(frameworks)("%s TabBar", (_, mount) => {
  test("a tap selects a tab and reports it once; the selected tab again reports it again", async () => {
    const bar = await mount({ defaultValue: "home" })
    await click(bar.tab("photos"))
    expect(selected()).toEqual(["photos"])
    await click(bar.tab("photos"))
    expect(bar.values).toEqual(["photos", "photos"])
  })

  test("a controlled tab changes only when the owner passes it back", async () => {
    const ignored = await mount({ defaultValue: "home" }, { controlled: "ignore" })
    await click(ignored.tab("calendar"))
    expect(ignored.values).toEqual(["calendar"])
    expect(selected()).toEqual(["home"])
    cleanup()
    document.body.innerHTML = ""
    const followed = await mount({ defaultValue: "home" }, { controlled: "follow" })
    await click(followed.tab("calendar"))
    expect(selected()).toEqual(["calendar"])
  })

  test("a disabled tab cannot be selected", async () => {
    const bar = await mount({ tabs: [TABS[0], { ...TABS[1], disabled: true }], defaultValue: "home" })
    expect(bar.tab("calendar").hasAttribute("disabled")).toBe(true)
    await click(bar.tab("calendar"))
    expect(bar.values).toEqual([])
    expect(selected()).toEqual(["home"])
  })

  test("the search tab is a tab of its own, named by its label", async () => {
    const bar = await mount({ tabs: TABS.slice(0, 3), search: { value: "search" }, defaultValue: "home" })
    expect(bar.tab("search").getAttribute("aria-label")).toBe("Search")
    expect(bar.tab("search").textContent).toBe("")
    await click(bar.tab("search"))
    expect(selected()).toEqual(["search"])
    expect(bar.values).toEqual(["search"])
  })

  test("minimized, a tap on the tab that stays brings the others back and selects nothing", async () => {
    const bar = await mount({ tabs: TABS.slice(0, 3), search: { value: "search" }, defaultValue: "calendar", defaultMinimized: true })
    expect(bar.bar().hasAttribute("data-minimized")).toBe(true)
    expect(bar.tab("calendar").getAttribute("aria-expanded")).toBe("false")
    expect(bar.tab("home").hasAttribute("aria-expanded")).toBe(false)
    expect(bar.tab("search").hasAttribute("aria-expanded")).toBe(false)
    await click(bar.tab("calendar"))
    expect(bar.bar().hasAttribute("data-minimized")).toBe(false)
    expect(bar.tab("calendar").hasAttribute("aria-expanded")).toBe(false)
    expect(bar.minimized).toEqual([false])
    expect(bar.values).toEqual([])
  })

  test("the prominent tab is a tab of its own, named by its label; search then joins the capsule", async () => {
    const bar = await mount({ tabs: TABS.slice(0, 2), search: { value: "search" }, prominent: { value: "library", label: "Library", icon: "photos" }, defaultValue: "home" })
    expect(bar.tab("library").getAttribute("aria-label")).toBe("Library")
    expect(bar.tab("library").textContent).toBe("")
    expect(bar.tab("library").querySelector("svg")).not.toBeNull()
    expect(bar.tab("search").textContent).toBe("Search")
    expect(bar.tab("search").parentElement).toBe(bar.tab("home").parentElement)
    expect(bar.bar().hasAttribute("data-prominent")).toBe(true)
    expect(bar.bar().hasAttribute("data-search")).toBe(false)
    await click(bar.tab("library"))
    expect(selected()).toEqual(["library"])
    expect(bar.values).toEqual(["library"])
  })

  test("minimized, search still selects search", async () => {
    const bar = await mount({ tabs: TABS.slice(0, 3), search: { value: "search" }, defaultValue: "calendar", defaultMinimized: true })
    await click(bar.tab("search"))
    expect(selected()).toEqual(["search"])
    expect(bar.bar().hasAttribute("data-minimized")).toBe(true)
  })

  test("a controlled minimized state changes only when the owner passes it back", async () => {
    const ignored = await mount({ defaultValue: "home", defaultMinimized: true }, { controlledMinimized: "ignore" })
    await click(ignored.tab("home"))
    expect(ignored.minimized).toEqual([false])
    expect(ignored.bar().hasAttribute("data-minimized")).toBe(true)
    cleanup()
    document.body.innerHTML = ""
    const followed = await mount({ defaultValue: "home", defaultMinimized: true }, { controlledMinimized: "follow" })
    await click(followed.tab("home"))
    expect(followed.bar().hasAttribute("data-minimized")).toBe(false)
  })
})

// jsdom does no layout, so the bar reports the height the browser measures on a 402pt phone.
const mockBarHeight = () =>
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.tagName === "NAV" ? 95 : 0
  })

const pageStyle = () => document.querySelector<HTMLElement>(".Page")?.getAttribute("style") ?? ""

const reactPage = (props: Case) => (
  <RPage>
    <RPage.Content>Body</RPage.Content>
    {reactBar(props)}
  </RPage>
)
const vuePage = (props: Case) => () => h(Page as never, null, () => [h(PageContent, null, () => "Body"), vueBar(props)]) as VNode

describe.each(["React", "Vue"] as const)("%s TabBar in Page", (framework) => {
  const mount = async (props: Case) => {
    const minimized: boolean[] = []
    const withSpy = { ...props, onMinimizedChange: (next: boolean) => minimized.push(next) }
    const view = framework === "React" ? render(reactPage(withSpy)) : null
    const vue = framework === "Vue" ? mountVue(vuePage(withSpy)) : null
    await (framework === "React" ? act(async () => {}) : flushVue())
    const content = document.querySelector<HTMLElement>(".Content")
    if (!content) throw new Error("Page.Content is missing")
    const scrollTo = async (top: number) => {
      content.scrollTop = top
      if (framework === "React") await act(async () => { fireEvent.scroll(content) })
      else { content.dispatchEvent(new Event("scroll")); await flushVue() }
    }
    const isMinimized = () => document.querySelector("nav")?.hasAttribute("data-minimized")
    return { minimized, scrollTo, isMinimized, unmount: () => { view?.unmount(); vue?.unmount() } }
  }

  test("the bar reserves its height on the page and clears it when it leaves", async () => {
    mockBarHeight()
    const props: Case = { defaultValue: "home" }
    const page = (show: boolean) => (
      <RPage>
        <RPage.Content>Body</RPage.Content>
        {show && reactBar(props)}
      </RPage>
    )
    const state = reactive({ show: true })
    const view = framework === "React" ? render(page(true)) : null
    const vue = framework === "Vue" ? mountVue(() => h(Page as never, null, () => [h(PageContent, null, () => "Body"), state.show ? vueBar(props) : null]) as VNode) : null
    await (framework === "React" ? act(async () => {}) : flushVue())
    expect(document.querySelector("nav")?.getAttribute("data-host")).toBe("page")
    expect(pageStyle()).toContain("--page-toolbar-bottom-height: 95px")
    if (view) await act(async () => view.rerender(page(false)))
    else { state.show = false; await flushVue() }
    expect(document.querySelector("nav")).toBeNull()
    expect(pageStyle()).not.toContain("--page-toolbar-bottom-height")
    view?.unmount()
    vue?.unmount()
  })

  test("onScrollDown minimizes after 8px down, expands after 8px up and at the top", async () => {
    const page = await mount({ tabs: TABS.slice(0, 3), search: { value: "search" }, defaultValue: "home", minimizeBehavior: "onScrollDown" })
    await page.scrollTo(7)
    expect(page.isMinimized()).toBe(false)
    await page.scrollTo(20)
    expect(page.isMinimized()).toBe(true)
    // Further down, and a small bounce back up, keep it minimized.
    await page.scrollTo(300)
    await page.scrollTo(294)
    expect(page.isMinimized()).toBe(true)
    await page.scrollTo(285)
    expect(page.isMinimized()).toBe(false)
    await page.scrollTo(320)
    expect(page.isMinimized()).toBe(true)
    await page.scrollTo(0)
    expect(page.isMinimized()).toBe(false)
    expect(page.minimized).toEqual([true, false, true, false])
    page.unmount()
  })

  test("a tap on the minimized tab expands the bar until the content scrolls down again", async () => {
    const page = await mount({ defaultValue: "home", minimizeBehavior: "onScrollDown" })
    await page.scrollTo(40)
    expect(page.isMinimized()).toBe(true)
    const home = document.querySelector<HTMLElement>('[data-value="home"]')
    if (!home) throw new Error("The home tab is missing")
    await click(home)
    expect(page.isMinimized()).toBe(false)
    await page.scrollTo(60)
    expect(page.isMinimized()).toBe(true)
    page.unmount()
  })

  test("never minimizes by itself", async () => {
    const page = await mount({ defaultValue: "home" })
    await page.scrollTo(200)
    expect(page.isMinimized()).toBe(false)
    expect(page.minimized).toEqual([])
    page.unmount()
  })
})

describe("TabBar tokens follow the iOS 26 and 27 kits, Tab Bar - iPhone (507:24689, 3:70967), and iOS 27.2", () => {
  test("the bar, the capsule, the tabs and the search circle", () => {
    const tokens = read("packages/styles/src/styles/variables-components.css")
    for (const line of [
      "--tab-bar-gutter: 21px;",
      "--tab-bar-gap: 8px;",
      "--tab-bar-padding-top: 12px;",
      "--tab-bar-padding-bottom: max(21px, calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) - 13px));",
      "--tab-bar-minimized-padding-top: 19px;",
      "--tab-bar-minimized-gutter: 28px;",
      "--tab-bar-minimized-padding-bottom: max(28px, calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) - 6px));",
      "--tab-bar-capsule-padding-block: 4px;",
      "--tab-bar-capsule-padding-inline: 10px;",
      // iOS 27.2 hugs three tabs in a 275 capsule (ref-app tabs3); the kit's 94 made 302.
      "--tab-bar-item-width: 85px;",
      "--tab-bar-item-height: 54px;",
      "--tab-bar-pill-outset: 6px;",
      // The native magnifier draws 22.33; a PlexUI icon draws about 0.8 of its box.
      "--tab-bar-icon-size: 28px;",
      "--tab-bar-label-font-size: 10px;",
      "--tab-bar-label-line-height: 12px;",
      "--tab-bar-search-size: 62px;",
      "--tab-bar-minimized-size: 48px;",
      "--tab-bar-item-color: light-dark(var(--gray-750), var(--gray-850));",
      "--tab-bar-item-color-selected: var(--color-text);",
      "--tab-bar-item-background-selected: var(--alpha-08);",
    ]) expect(tokens).toContain(line)
  })

  test("the badge and the bottom accessory, as iOS 27.2 draws them (ref-app tabs4-badge, tabs-accessory)", () => {
    const tokens = read("packages/styles/src/styles/variables-components.css")
    for (const line of [
      "--tab-bar-badge-size: 18px;",
      "--tab-bar-badge-padding-inline: 5px;",
      "--tab-bar-badge-font-size: 12px;",
      "--tab-bar-badge-font-weight: var(--font-weight-normal);",
      "--tab-bar-badge-top: 2.33px;",
      "--tab-bar-badge-start: 11.67px;",
      "--tab-bar-badge-background: var(--color-background-danger-solid);",
      "--tab-bar-badge-color: var(--color-text-danger-solid);",
      "--tab-bar-minimized-badge-top: 2px;",
      "--tab-bar-minimized-badge-start: 9.67px;",
      "--tab-bar-accessory-height: 48px;",
      "--tab-bar-accessory-gap: 8px;",
      "--tab-bar-minimized-accessory-gap: 13.33px;",
    ]) expect(tokens).toContain(line)
    const css = read("packages/styles/src/components/TabBar/TabBar.module.css")
    // The bar grows by the accessory in both states, so it keeps one height (151) and the Page does not move.
    expect(css).toContain("padding-top: calc(var(--tab-bar-padding-top) + var(--tab-bar-accessory-height) + var(--tab-bar-accessory-gap));")
    expect(css).toContain("padding-top: calc(var(--tab-bar-minimized-padding-top) + var(--tab-bar-accessory-height) + var(--tab-bar-accessory-gap));")
    expect(css).toContain("left: calc(50% + var(--tab-bar-badge-start));")
    // Minimized, the badge keeps to the circle (ref-app tabs-minimize-badge): 2 below its top, 9.67 past its middle.
    expect(css).toContain("top: calc(var(--tab-bar-minimized-badge-top) - var(--tab-bar-capsule-padding-block));")
    expect(css).toContain("left: calc(50% + var(--tab-bar-minimized-badge-start));")
  })

  test("phone only, on the shared mobile glass with its raised shadow", () => {
    const css = read("packages/styles/src/components/TabBar/TabBar.module.css")
    expect(css.indexOf(".TabBar {\n  display: none;\n}")).toBe(css.indexOf(".TabBar {"))
    expect(css).toContain("@media (max-width: 767.98px) {")
    // The capsule sizes itself from 85px tabs and then shrinks them together: 275px for three, 360px for four.
    expect(css).toContain("flex: 0 1 auto;\n    flex-direction: column;")
    expect(css).toContain("width: var(--tab-bar-item-width);")
    // The search and the prominent circles carry the glass over the reset of every tab; the accessory is glass too.
    expect(css).toContain(".Tabs,\n  .Accessory,\n  .Item:is(.Search, .Prominent) {")
    // Minimized, the circles keep 28px from the sides and the bottom of the 95px bar (kit iOS 27).
    expect(css).toContain("padding: var(--tab-bar-minimized-padding-top) var(--tab-bar-minimized-gutter) var(--tab-bar-minimized-padding-bottom);")
    for (const line of [
      "background-color: var(--mobile-glass-background);",
      "background-image: var(--mobile-glass-sheen);",
      "box-shadow: var(--mobile-glass-shadow-raised);",
      "backdrop-filter: var(--mobile-glass-backdrop-filter);",
    ]) expect(css).toContain(line)
  })
})
