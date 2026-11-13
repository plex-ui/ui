import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, type ComponentType, type ReactNode } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { h, reactive, type VNode } from "vue"
import { Button as RButton, NavigationButton as RNavigationButton } from "../../packages/ui/src/components/Button"
import { Dialog as RDialog } from "../../packages/ui/src/components/Dialog"
import { Page as RPage } from "../../packages/ui/src/components/Page"
import { Toolbar as RToolbar } from "../../packages/ui/src/components/Toolbar"
import { Button, NavigationButton } from "../../packages/vue/src/components/Button"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "../../packages/vue/src/components/Dialog"
import { Page, PageContent, PageFooter, PageHeader } from "../../packages/vue/src/components/Page"
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarLeading,
  ToolbarTitle,
  ToolbarTrailing,
} from "../../packages/vue/src/components/Toolbar"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

// React-vs-Vue parity for Toolbar: the tree of every layout, the heights it
// reports to Page, and the Sheet host that leaves naming to Dialog.

type Props = Record<string, unknown>
type AnyComponent = ComponentType<Props>

const vueProps = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

type Case = { root?: Props; title?: Props; leading?: boolean; group?: boolean; search?: boolean }

const reactBar = ({ root = {}, title, leading = true, group = false, search = false }: Case) =>
  createElement(
    RToolbar as unknown as AnyComponent,
    root,
    leading && createElement(RToolbar.Leading, null, createElement(RNavigationButton, { action: "back" })),
    title && createElement(RToolbar.Title as unknown as AnyComponent, title, "Orders"),
    search && createElement(RToolbar.Content, { fill: true }, createElement("input", { "aria-label": "Search" })),
    createElement(
      RToolbar.Trailing,
      null,
      group
        ? createElement(
          RToolbar.Group,
          { "aria-label": "Order actions" },
          createElement(RButton as unknown as AnyComponent, { color: "secondary", variant: "soft", uniform: true, pill: true, "aria-label": "Translate" }, "T"),
          createElement(RButton as unknown as AnyComponent, { color: "secondary", variant: "soft", uniform: true, pill: true, "aria-label": "More" }, "M"),
        )
        : createElement(RNavigationButton, { action: "close" }),
    ),
  )

const vueBar = ({ root = {}, title, leading = true, group = false, search = false }: Case) =>
  h(Toolbar as never, vueProps(root), () => [
    leading ? h(ToolbarLeading, null, () => h(NavigationButton, { action: "back" })) : null,
    title ? h(ToolbarTitle, vueProps(title), () => "Orders") : null,
    search ? h(ToolbarContent, { fill: true }, () => h("input", { "aria-label": "Search" })) : null,
    h(ToolbarTrailing, null, () =>
      group
        ? h(ToolbarGroup, { "aria-label": "Order actions" }, () => [
          h(Button, { color: "secondary", variant: "soft", uniform: true, pill: true, "aria-label": "Translate" }, () => "T"),
          h(Button, { color: "secondary", variant: "soft", uniform: true, pill: true, "aria-label": "More" }, () => "M"),
        ])
        : h(NavigationButton, { action: "close" })),
  ])

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("Toolbar parity", () => {
  test.each<[string, Case]>([
    ["inline title", { title: {} }],
    ["subtitle", { title: { subtitle: "24 orders" } }],
    ["start title", { root: { titleAlign: "start" }, title: { subtitle: "24 orders" } }],
    ["large title", { root: { titleStyle: "large" }, title: { subtitle: "24 orders" } }],
    ["compact large", { root: { titleStyle: "compact-large" }, title: {}, leading: false }],
    ["compact medium", { root: { titleStyle: "compact-medium" }, title: {}, leading: false }],
    ["heading level and class", { root: { className: "bar", id: "orders-bar" }, title: { as: "h2", className: "name" } }],
    ["group", { group: true }],
    ["search", { search: true, leading: false }],
    ["solid", { root: { background: "solid" }, title: {} }],
    ["bottom", { root: { placement: "bottom", titleStyle: "large" }, search: true }],
  ])("%s", async (_name, bar) => {
    const { react, vue } = await renderPair(reactBar(bar) as never, () => vueBar(bar))
    expect(vue).toBe(react)
    expect(react).toContain('data-toolbar=""')
  })

  test("a bottom bar has no title layout", async () => {
    const { react } = await renderPair(reactBar({ root: { placement: "bottom", titleStyle: "large" } }) as never, () => vueBar({ root: { placement: "bottom" } }))
    expect(react).toContain('data-placement="bottom"')
    expect(react).not.toContain("data-title-style")
    expect(react).not.toContain("data-title-align")
  })

  test("outside a host the bar has no host and the title is a plain heading", async () => {
    const check = () => {
      expect(document.querySelector("[data-toolbar]")?.hasAttribute("data-host")).toBe(false)
      expect(document.querySelector(".Heading")?.hasAttribute("aria-hidden")).toBe(false)
      expect(document.querySelector(".Heading > h1.Title")?.textContent).toBe("Orders")
    }
    render(reactBar({ title: {} }) as never)
    await act(async () => {})
    check()
    cleanup()
    const { unmount } = mountVue(() => vueBar({ title: {} }))
    await flushVue()
    check()
    unmount()
  })
})

// jsdom does no layout, so the bars report the heights the browser would measure.
const mockBarHeights = () =>
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    if (!this.hasAttribute("data-toolbar")) return 0
    return this.dataset.placement === "bottom" ? 84 : 98
  })

const pageStyle = () => document.querySelector<HTMLElement>(".Page")?.getAttribute("style") ?? ""

describe("Toolbar in Page", () => {
  const reactPage = (top: boolean, bottom: boolean, extra?: ReactNode) =>
    createElement(
      RPage as unknown as AnyComponent,
      null,
      createElement(RPage.Header, null, "Desktop header"),
      top && reactBar({ title: {} }),
      createElement(RPage.Content, null, "Body"),
      bottom && reactBar({ root: { placement: "bottom" }, search: true, leading: false }),
      extra,
    )

  const vuePage = (state: { top: boolean; bottom: boolean }) => () =>
    h(Page as never, null, () => [
      h(PageHeader, null, () => "Desktop header"),
      state.top ? vueBar({ title: {} }) : null,
      h(PageContent, null, () => "Body"),
      state.bottom ? vueBar({ root: { placement: "bottom" }, search: true, leading: false }) : null,
    ])

  test("React: the bars report their heights and clear them when they leave", async () => {
    mockBarHeights()
    const view = render(reactPage(true, true))
    await act(async () => {})
    expect(document.querySelector('[data-toolbar][data-placement="top"]')?.getAttribute("data-host")).toBe("page")
    expect(pageStyle()).toContain("--page-toolbar-height: 98px")
    expect(pageStyle()).toContain("--page-toolbar-bottom-height: 84px")
    expect(document.body.textContent).toContain("Desktop header")

    await act(async () => view.rerender(reactPage(false, true)))
    expect(pageStyle()).not.toContain("--page-toolbar-height")
    expect(pageStyle()).toContain("--page-toolbar-bottom-height: 84px")

    await act(async () => view.rerender(reactPage(false, false)))
    expect(pageStyle()).not.toContain("--page-toolbar")
  })

  test("Vue: the bars report their heights and clear them when they leave", async () => {
    mockBarHeights()
    const state = reactive({ top: true, bottom: true })
    const { unmount } = mountVue(vuePage(state) as () => VNode)
    await flushVue()
    expect(document.querySelector('[data-toolbar][data-placement="top"]')?.getAttribute("data-host")).toBe("page")
    expect(pageStyle()).toContain("--page-toolbar-height: 98px")
    expect(pageStyle()).toContain("--page-toolbar-bottom-height: 84px")

    state.top = false
    await flushVue()
    expect(pageStyle()).not.toContain("--page-toolbar-height")
    expect(pageStyle()).toContain("--page-toolbar-bottom-height: 84px")

    state.bottom = false
    await flushVue()
    expect(pageStyle()).not.toContain("--page-toolbar")
    unmount()
  })

  test.each(["React", "Vue"] as const)("%s: the top bar is marked once content scrolls under it", async (framework) => {
    const view = framework === "React" ? render(reactPage(true, true)) : null
    const vue = framework === "Vue" ? mountVue(vuePage({ top: true, bottom: true }) as () => VNode) : null
    await (framework === "React" ? act(async () => {}) : flushVue())
    const top = () => document.querySelector('[data-toolbar][data-placement="top"]')
    const bottom = () => document.querySelector('[data-toolbar][data-placement="bottom"]')
    expect(top()?.hasAttribute("data-scrolled")).toBe(false)
    const content = document.querySelector<HTMLElement>(".Content")
    if (!content) throw new Error("Page.Content is missing")
    content.scrollTop = 40
    if (framework === "React") await act(async () => { fireEvent.scroll(content) })
    else { content.dispatchEvent(new Event("scroll")); await flushVue() }
    expect(top()?.hasAttribute("data-scrolled")).toBe(true)
    expect(bottom()?.hasAttribute("data-scrolled")).toBe(false)
    content.scrollTop = 0
    if (framework === "React") await act(async () => { fireEvent.scroll(content) })
    else { content.dispatchEvent(new Event("scroll")); await flushVue() }
    expect(top()?.hasAttribute("data-scrolled")).toBe(false)
    view?.unmount()
    vue?.unmount()
  })

  test("a hidden bar reports no height, so the page keeps its own header space", async () => {
    const view = render(reactPage(true, false))
    await act(async () => {})
    expect(pageStyle()).not.toContain("--page-toolbar")
    view.unmount()

    const { unmount } = mountVue(vuePage({ top: true, bottom: false }) as () => VNode)
    await flushVue()
    expect(pageStyle()).not.toContain("--page-toolbar")
    unmount()
  })
})

describe("Toolbar in a Sheet", () => {
  const reactSheet = () => (
    <RDialog open>
      <RDialog.Content mobileVariant="sheet">
        <RToolbar>
          <RToolbar.Leading><RNavigationButton action="close" /></RToolbar.Leading>
          <RToolbar.Title>Orders</RToolbar.Title>
        </RToolbar>
        <RDialog.Header>
          <RDialog.Title>Orders</RDialog.Title>
        </RDialog.Header>
        <RDialog.Body>Rows</RDialog.Body>
      </RDialog.Content>
    </RDialog>
  )

  const vueSheet = () =>
    h(Dialog, { open: true }, () =>
      h(DialogContent, { mobileVariant: "sheet" }, () => [
        h(Toolbar, null, () => [
          h(ToolbarLeading, null, () => h(NavigationButton, { action: "close" })),
          h(ToolbarTitle, null, () => "Orders"),
        ]),
        h(DialogHeader, null, () => h(DialogTitle, null, () => "Orders")),
        h(DialogBody, null, () => "Rows"),
      ]))

  // Runs `check` against the live document of one framework, then returns its serialized DOM.
  const sheetDom = async (framework: "React" | "Vue", check: () => void = () => {}) => {
    if (framework === "React") {
      await act(async () => {
        render(reactSheet())
      })
      check()
      const dom = serializeDom()
      cleanup()
      return dom
    }
    const { unmount } = mountVue(vueSheet)
    await flushVue()
    check()
    const dom = serializeDom()
    unmount()
    return dom
  }

  test.each(["React", "Vue"] as const)("%s: a bottom bar in a Sheet, or in a Page laid out inside one, keeps its soft edge; on a page it has none (plan 172)", async (framework) => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Toolbar/Toolbar.module.css`, "utf8")
    const pageCss = readFileSync(`${process.cwd()}/packages/styles/src/components/Page/Page.module.css`, "utf8")
    const toolbarRule = css.match(/(\.Toolbar\[data-placement="bottom"\]\[data-background="soft"\][^{]*)::before \{\s*display: none;/)?.[1]
    const footerBlock = pageCss.slice(pageCss.indexOf("  .Footer {"))
    const footerRule = footerBlock.match(/&(\[data-background="soft"\][^{]*)::before \{\s*display: none;/)?.[1]
    if (!toolbarRule || !footerRule) throw new Error("the soft bottom rules are missing")
    const hidesToolbar = (el: Element | null) => Boolean(el?.matches(toolbarRule))
    const hidesFooter = (el: Element | null) => Boolean(el?.matches(`.Footer${footerRule}`))
    const bottom = { placement: "bottom", leading: false, background: "soft" }
    const reactTree = (
      <>
        <RPage>
          <RPage.Content>Rows</RPage.Content>
          {reactBar({ root: bottom, search: true, leading: false })}
          <RPage.Footer background="soft">Footer</RPage.Footer>
        </RPage>
        <RDialog open>
          <RDialog.Content mobileVariant="sheet">
            <RDialog.Header><RDialog.Title>Orders</RDialog.Title></RDialog.Header>
            <RDialog.Body>
              <RPage>
                <RPage.Content>Rows</RPage.Content>
                {reactBar({ root: bottom, search: true, leading: false })}
                <RPage.Footer background="soft">Footer</RPage.Footer>
              </RPage>
            </RDialog.Body>
            {reactBar({ root: bottom, search: true, leading: false })}
          </RDialog.Content>
        </RDialog>
      </>
    )
    const vueTree = () => [
      h(Page as never, null, () => [
        h(PageContent, null, () => "Rows"),
        vueBar({ root: bottom, search: true, leading: false }),
        h(PageFooter, { background: "soft" }, () => "Footer"),
      ]),
      h(Dialog, { open: true }, () =>
        h(DialogContent, { mobileVariant: "sheet" }, () => [
          h(DialogHeader, null, () => h(DialogTitle, null, () => "Orders")),
          h(DialogBody, null, () =>
            h(Page as never, null, () => [
              h(PageContent, null, () => "Rows"),
              vueBar({ root: bottom, search: true, leading: false }),
              h(PageFooter, { background: "soft" }, () => "Footer"),
            ])),
          vueBar({ root: bottom, search: true, leading: false }),
        ])),
    ]
    let unmount = () => {}
    if (framework === "React") await act(async () => { render(reactTree) })
    else {
      unmount = mountVue(() => h("div", null, vueTree())).unmount
      await flushVue()
    }
    const sheet = document.querySelector('[data-mobile-variant="sheet"]')
    const bars = [...document.querySelectorAll('[data-toolbar][data-placement="bottom"]')]
    const footers = [...document.querySelectorAll(".Footer")]
    expect(bars).toHaveLength(3)
    expect(footers).toHaveLength(2)
    for (const bar of bars) expect(hidesToolbar(bar)).toBe(!sheet?.contains(bar))
    for (const footer of footers) expect(hidesFooter(footer)).toBe(!sheet?.contains(footer))
    expect(bars.filter((bar) => sheet?.contains(bar)).map((bar) => bar.getAttribute("data-host")).sort()).toEqual(["dialog", "page"])
    unmount()
  })

  test("both frameworks render the same Sheet", async () => {
    expect(await sheetDom("Vue")).toBe(await sheetDom("React"))
  })

  test.each(["React", "Vue"] as const)("%s: the dialog title names the Sheet and the bar title is decorative", async (framework) => {
    await sheetDom(framework, () => {
      const dialog = document.querySelector('[role="dialog"]')
      const bar = dialog?.querySelector(".Panel > [data-toolbar]")
      expect(bar?.getAttribute("data-host")).toBe("dialog")
      expect(bar?.querySelector(".Heading")?.getAttribute("aria-hidden")).toBe("true")
      const title = dialog?.querySelector(".Header h2.Title")
      expect(title?.textContent).toBe("Orders")
      expect(title?.id).toBeTruthy()
      expect(dialog?.getAttribute("aria-labelledby")).toBe(title?.id)
    })
  })
})

describe("Toolbar disabled buttons", () => {
  const secondary = { color: "secondary", variant: "soft", uniform: true, pill: true }
  const reactDisabledBar = () =>
    createElement(
      RToolbar as unknown as AnyComponent,
      { placement: "bottom" },
      createElement(RToolbar.Leading, null, createElement(RButton as unknown as AnyComponent, { ...secondary, "aria-label": "Filter", disabled: true }, "F")),
      createElement(RToolbar.Content, null, createElement(RButton as unknown as AnyComponent, { color: "primary", pill: true, disabled: true }, "Place order")),
      createElement(
        RToolbar.Trailing,
        null,
        createElement(
          RToolbar.Group,
          { "aria-label": "Order actions" },
          createElement(RButton as unknown as AnyComponent, { ...secondary, "aria-label": "Translate", disabled: true }, "T"),
          createElement(RButton as unknown as AnyComponent, { ...secondary, "aria-label": "More" }, "M"),
        ),
        createElement(RNavigationButton, { action: "confirm", disabled: true }),
      ),
    )
  const vueDisabledBar = () =>
    h(Toolbar as never, { placement: "bottom" }, () => [
      h(ToolbarLeading, null, () => h(Button, { ...secondary, "aria-label": "Filter", disabled: true }, () => "F")),
      h(ToolbarContent, null, () => h(Button, { color: "primary", pill: true, disabled: true }, () => "Place order")),
      h(ToolbarTrailing, null, () => [
        h(ToolbarGroup, { "aria-label": "Order actions" }, () => [
          h(Button, { ...secondary, "aria-label": "Translate", disabled: true }, () => "T"),
          h(Button, { ...secondary, "aria-label": "More" }, () => "M"),
        ]),
        h(NavigationButton, { action: "confirm", disabled: true }),
      ]),
    ])

  test("disabled bar buttons render the same disabled DOM in React and Vue", async () => {
    const { react, vue } = await renderPair(reactDisabledBar() as never, () => vueDisabledBar())
    expect(vue).toBe(react)
    // Filter, Place order, Translate and Confirm; More stays enabled.
    expect(react.match(/data-disabled=""/g)?.length).toBe(4)
    expect(react.match(/aria-disabled="true"/g)?.length).toBe(4)
  })

  test("a disabled glass button keeps the glass and dims its ink; a prominent one turns gray", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Toolbar/Toolbar.module.css`, "utf8")
    const rule = (head: string) => css.slice(css.indexOf(head), css.indexOf("}", css.indexOf(head)))
    const glass = rule(".Toolbar :is(.Leading, .Trailing, .Content, .Group) > :where(button, a)[data-disabled][data-variant]:where(")
    expect(glass).toContain("--button-text-color: var(--mobile-label-tertiary, var(--color-text-tertiary));")
    expect(glass).toContain("--button-mobile-material-background: var(--mobile-glass-background);")
    expect(glass).toContain("--button-mobile-material-backdrop-filter: var(--mobile-glass-backdrop-filter);")
    expect(glass).toContain("--button-mobile-material-opacity: 1;")
    const prominent = rule(".Toolbar :is(.Leading, .Trailing, .Content, .Group) > :where(button, a)[data-disabled][data-variant=\"solid\"]")
    expect(prominent).toContain("--button-background-color: var(--toolbar-prominent-disabled-background);")
    expect(prominent).toContain("--button-text-color: var(--toolbar-prominent-disabled-color);")
    // Inside a Group the button glass is cleared, so a disabled item never paints a capsule of its own.
    expect(css).toMatch(/\.Group \{[\s\S]*?& > :where\(button, a\) \{\s*--mobile-glass-background: transparent;/)
    const tokens = readFileSync(`${process.cwd()}/packages/styles/src/styles/variables-components.css`, "utf8")
    expect(tokens).toContain("--toolbar-prominent-disabled-background: light-dark(var(--alpha-12), var(--alpha-20));")
    expect(tokens).toContain("--toolbar-prominent-disabled-color: light-dark(var(--gray-0), var(--alpha-30));")
  })
})

describe("A large title on a page scrolls with the content (iOS 26)", () => {
  const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Toolbar/Toolbar.module.css`, "utf8")
  const reactLarge = (titleStyle: string, title: Record<string, unknown> = {}) => createElement(
    RPage as unknown as AnyComponent,
    null,
    reactBar({ root: { titleStyle }, title }),
    createElement(RPage.Content, null, "Body"),
  )
  const vueLarge = (titleStyle: string, title: Record<string, unknown> = {}) => () => h(Page as never, null, () => [vueBar({ root: { titleStyle }, title }), h(PageContent, null, () => "Body")])
  const mount = async (framework: "React" | "Vue", titleStyle: string, title: Record<string, unknown> = {}) => {
    const view = framework === "React" ? render(reactLarge(titleStyle, title)) : null
    const vue = framework === "Vue" ? mountVue(vueLarge(titleStyle, title) as () => VNode) : null
    await (framework === "React" ? act(async () => {}) : flushVue())
    return () => { view?.unmount(); vue?.unmount() }
  }

  test.each(["React", "Vue"] as const)("%s: the title moves into the content, scrolls with it, and the bar shows it inline once it has gone", async (framework) => {
    // The bar ends at 70; the title's box ends at headingBottom, which the scroll moves.
    let headingBottom = 120
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const bottom = this.hasAttribute("data-toolbar") ? 70 : this.classList.contains("Heading") ? headingBottom : 0
      return { x: 0, y: 0, top: 0, left: 0, right: 0, width: 0, height: bottom, bottom, toJSON: () => ({}) } as DOMRect
    })
    const unmount = await mount(framework, "large")
    const bar = document.querySelector<HTMLElement>('[data-toolbar][data-title-style="large"]')
    // One h1, at the top of the content, where the browser scrolls it with the content and its overscroll.
    expect(document.querySelectorAll("h1")).toHaveLength(1)
    const heading = document.querySelector(".Page > .Content > .Column > .LargeTitle:first-child > .Heading[data-in-content]")
    expect(heading?.querySelector("h1")?.textContent).toBe("Orders")
    expect(bar?.querySelector(":scope > .Heading")).toBeNull()
    expect(bar?.style.getPropertyValue("--toolbar-large-title-travel")).toBe("")
    const copy = bar?.querySelector(":scope > .CollapsedTitle")
    expect(copy?.getAttribute("aria-hidden")).toBe("true")
    expect(copy?.textContent).toBe("Orders")
    expect(bar?.hasAttribute("data-title-collapsed")).toBe(false)
    const content = document.querySelector<HTMLElement>(".Page > .Content")
    if (!content) throw new Error("Page.Content is missing")
    const scrollTo = async (top: number, bottom: number) => {
      headingBottom = bottom
      content.scrollTop = top
      if (framework === "React") await act(async () => { fireEvent.scroll(content) })
      else { content.dispatchEvent(new Event("scroll")); await flushVue() }
    }
    // Under the row but not gone: no inline title yet.
    await scrollTo(30, 90)
    expect(bar?.hasAttribute("data-scrolled")).toBe(true)
    expect(bar?.hasAttribute("data-title-collapsed")).toBe(false)
    await scrollTo(60, 70)
    expect(bar?.hasAttribute("data-title-collapsed")).toBe(true)
    await scrollTo(10, 110)
    expect(bar?.hasAttribute("data-title-collapsed")).toBe(false)
    // The page writes no scroll offset of its own any more.
    expect(document.querySelector<HTMLElement>(".Page")?.getAttribute("style") ?? "").not.toContain("--page-scroll-y")
    unmount()
  })

  // The bar ends at 70; a heading's box ends at headingBottom and is headingHeight tall (0 while it is hidden).
  const measure = (geometry: { bottom: number; height: number }) =>
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const bar = this.hasAttribute("data-toolbar")
      const heading = this.classList.contains("Heading")
      const bottom = bar ? 70 : heading ? geometry.bottom : 0
      const height = bar ? 70 : heading ? geometry.height : 0
      return { x: 0, y: 0, top: bottom - height, left: 0, right: 0, width: 0, height, bottom, toJSON: () => ({}) } as DOMRect
    })
  const scroll = async (framework: "React" | "Vue") => {
    const content = document.querySelector<HTMLElement>(".Page > .Content")
    if (!content) throw new Error("Page.Content is missing")
    if (framework === "React") await act(async () => { fireEvent.scroll(content) })
    else { content.dispatchEvent(new Event("scroll")); await flushVue() }
  }

  test.each(["React", "Vue"] as const)("%s: a bar replaced under the same page and content still shows its title inline once it has gone", async (framework) => {
    const geometry = { bottom: 120, height: 41 }
    measure(geometry)
    const reactPage = (key: string) => createElement(
      RPage as unknown as AnyComponent,
      null,
      createElement(RToolbar as unknown as AnyComponent, { key, titleStyle: "large" }, createElement(RToolbar.Title as unknown as AnyComponent, null, `Orders ${key}`)),
      createElement(RPage.Content, null, "Body"),
    )
    const vueKey = reactive({ value: "a" })
    const view = framework === "React" ? render(reactPage("a")) : null
    if (framework === "Vue") mountVue(() => h(Page as never, null, () => [h(Toolbar as never, { key: vueKey.value, titleStyle: "large" }, () => [h(ToolbarTitle as never, null, () => `Orders ${vueKey.value}`)]), h(PageContent, null, () => "Body")]))
    await (framework === "React" ? act(async () => {}) : flushVue())
    if (framework === "React") await act(async () => { view?.rerender(reactPage("b")) })
    else { vueKey.value = "b"; await flushVue() }
    expect(document.querySelector(".LargeTitle > .Heading[data-in-content] h1")?.textContent).toBe("Orders b")
    geometry.bottom = 70
    await scroll(framework)
    expect(document.querySelector("[data-toolbar]")?.hasAttribute("data-title-collapsed")).toBe(true)
  })

  test.each(["React", "Vue"] as const)("%s: a hidden title has not gone, and a change of layout measures it again", async (framework) => {
    // A wide window hides the bar and the title: both boxes are empty.
    const geometry = { bottom: 0, height: 0 }
    measure(geometry)
    const observers: Array<() => void> = []
    vi.stubGlobal("ResizeObserver", class {
      constructor(private callback: () => void) { observers.push(() => this.callback()) }
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    const unmount = await mount(framework, "large")
    const bar = document.querySelector<HTMLElement>('[data-toolbar][data-title-style="large"]')
    expect(bar?.hasAttribute("data-title-collapsed")).toBe(false)
    // The window narrows to a phone's, already scrolled past the title: no scroll event, only the new layout.
    Object.assign(geometry, { bottom: 60, height: 41 })
    await (framework === "React" ? act(async () => { observers.forEach((notify) => notify()) }) : (observers.forEach((notify) => notify()), flushVue()))
    expect(bar?.hasAttribute("data-title-collapsed")).toBe(true)
    unmount()
    vi.unstubAllGlobals()
  })

  test.each(["React", "Vue"] as const)("%s: the title in the content keeps the large title tokens its bar sets for itself", async (framework) => {
    const root = { titleStyle: "large", style: framework === "React" ? { "--toolbar-large-title-gap": "24px", "--toolbar-large-title-font-size": "40px" } : "--toolbar-large-title-gap: 24px; --toolbar-large-title-font-size: 40px" }
    if (framework === "React") render(createElement(RPage as unknown as AnyComponent, null, reactBar({ root, title: {} }), createElement(RPage.Content, null, "Body")))
    else mountVue(() => h(Page as never, null, () => [vueBar({ root, title: {} }), h(PageContent, null, () => "Body")]))
    await (framework === "React" ? act(async () => {}) : flushVue())
    const heading = document.querySelector<HTMLElement>(".LargeTitle > .Heading[data-in-content]")
    expect(heading?.style.getPropertyValue("--toolbar-large-title-gap")).toBe("24px")
    expect(heading?.style.getPropertyValue("--toolbar-large-title-font-size")).toBe("40px")
  })

  test.each(["React", "Vue"] as const)("%s: a large title in a bar without a page's content stays in the bar", async (framework) => {
    if (framework === "React") render(createElement(RPage as unknown as AnyComponent, null, reactBar({ root: { titleStyle: "large" }, title: {} })))
    else mountVue(() => h(Page as never, null, () => [vueBar({ root: { titleStyle: "large" }, title: {} })]))
    await (framework === "React" ? act(async () => {}) : flushVue())
    expect(document.querySelector("[data-toolbar] > .Heading:not([data-in-content]) > h1")?.textContent).toBe("Orders")
    expect(document.querySelectorAll("h1")).toHaveLength(1)
  })

  test.each(["React", "Vue"] as const)("%s: a subtitle stays as the second line of the inline copy (kit Title 2 Line)", async (framework) => {
    const unmount = await mount(framework, "large", { subtitle: "24 orders" })
    const copy = document.querySelector('[data-toolbar][data-title-style="large"] > .CollapsedTitle')
    expect(copy?.getAttribute("aria-hidden")).toBe("true")
    expect(Array.from(copy?.children ?? [], (line) => `${line.className}:${line.textContent}`)).toEqual(["CollapsedLine:Orders", "CollapsedSubtitle:24 orders"])
    expect(document.querySelectorAll(".Subtitle")).toHaveLength(1)
    unmount()
    const plain = await mount(framework, "large")
    const plainCopy = document.querySelector("[data-toolbar] > .CollapsedTitle")
    expect(plainCopy?.children).toHaveLength(0)
    expect(plainCopy?.textContent).toBe("Orders")
    plain()
    // An empty subtitle keeps one line in both frameworks.
    const empty = await mount(framework, "large", { subtitle: "" })
    expect(document.querySelector("[data-toolbar] > .CollapsedTitle")?.children).toHaveLength(0)
    expect(document.querySelector(".Subtitle")).toBeNull()
    empty()
  })

  test.each(["React", "Vue"] as const)("%s: an inline title on a page and a large title off a page keep one heading", async (framework) => {
    const unmount = await mount(framework, "inline")
    expect(document.querySelector("[data-toolbar] > .CollapsedTitle")).toBeNull()
    unmount()
    if (framework === "React") render(reactBar({ root: { titleStyle: "large" }, title: {} }))
    else mountVue(() => vueBar({ root: { titleStyle: "large" }, title: {} }))
    await (framework === "React" ? act(async () => {}) : flushVue())
    expect(document.querySelector("[data-toolbar] > .CollapsedTitle")).toBeNull()
  })

  test("a bottom bar's edge starts 27px above its items (IMG_5491) and covers fully from their top (owner 07.11); other backgrounds keep no mask", () => {
    const bottom = css.slice(css.indexOf('.Toolbar[data-placement="bottom"] {'))
    expect(bottom).toMatch(/&::before \{[^}]*inset: calc\(var\(--toolbar-bottom-item-top\) - 27px\) 0 0;[^}]*mask-image: linear-gradient\(to bottom, transparent, #000 27px\);/)
    expect(bottom).toMatch(/&:not\(\[data-background="soft"\]\)::before \{\s*inset: 0;\s*-webkit-mask-image: none;\s*mask-image: none;/)
    // A single wide action has more room above it, and the edge moves with it.
    expect(css).toMatch(/:has\(> \.Content\[data-fill\] > :where\(button, a, \[role="link"\]\)\) \{[^}]*--toolbar-bottom-item-top: var\(--toolbar-bottom-fill-padding-top\);/)
  })

  test("a bottom bar on a page leaves the content clear, a sheet's keeps its edge, and glass stands out over content (plan 172)", () => {
    const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")
    // Native iOS 26 draws no band under the bottom controls of a page (Mail, Phone); a sheet fades its list (IMG_5491).
    expect(css).toMatch(/\.Toolbar\[data-placement="bottom"\]\[data-background="soft"\]:not\(\[data-host="dialog"\], \[data-mobile-variant="sheet"\] \*\)::before \{\s*display: none;/)
    // A sheet's bar keeps the glass of the sheet, so the raised shadow no longer ties with Dialog's rule.
    expect(css).toMatch(/\.Toolbar\[data-placement="bottom"\]\[data-content-below\]:not\(\[data-mobile-variant="sheet"\] \*\) \{\s*--mobile-glass-shadow: var\(--mobile-glass-shadow-raised\);/)
    expect(read("components/Page/Page.module.css")).toMatch(/&\[data-background="soft"\]:not\(\[data-mobile-variant="sheet"\] \*\)::before \{\s*display: none;/)
    expect(read("components/TabBar/TabBar.module.css")).toMatch(/&\[data-background="soft"\]::before \{\s*display: none;/)
    expect(read("components/Dialog/Dialog.module.css")).toContain('.Content[data-mobile-variant="sheet"] .Footer::before {\n    inset: -15px 0 0;')
    // The outline darkens what lies under it, as the kit's linear burn does, and the frost turns content into a smudge.
    const materials = read("styles/mobile-materials.css")
    expect(materials).toContain("0 0 0 0.5px light-dark(rgb(0 0 0 / 9%), transparent)")
    // The sides lie over the 9% ring: 20% more comes to 27%, a bar button's darker sides on iOS 27.2 (ref-app glass-bands: b6).
    expect(materials).toContain("1.25px 0 0 -0.75px light-dark(rgb(0 0 0 / 20%), transparent)")
    expect(materials).toContain("--mobile-glass-backdrop-filter: blur(12px);")
    expect(materials).not.toContain("light-dark(var(--gray-100), transparent)")
  })

  test("the bar keeps the row of controls and swaps the large title for the inline one in time, not with the scroll", () => {
    const start = css.indexOf('.Toolbar[data-host="page"][data-title-style="large"] {')
    expect(start).toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf("\n  }\n", start))
    for (const declaration of [
      'grid-template-areas: "leading collapsed trailing";',
      "grid-template-columns: minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr);",
      "grid-template-rows: minmax(var(--toolbar-item-size), auto);",
      // Until the content has made its place, the title stands in the bar's second row
      '"heading heading heading";',
      // The bar ends at the title's last baseline, so the content starts 16pt under it (iOS 27.2: baseline 152, content 168)
      "margin-bottom: calc(-1 * (var(--toolbar-padding-bottom) + var(--toolbar-large-title-descent)));",
      "margin-bottom: calc(-1 * (var(--toolbar-padding-bottom) + var(--toolbar-large-subtitle-descent)));",
      "grid-area: collapsed;",
      "transition: opacity var(--toolbar-large-title-swap-duration);",
    ]) expect(block).toContain(declaration)
    expect(block).toMatch(/& > \.CollapsedTitle \{[^}]*opacity: 0;/)
    expect(block).toMatch(/&\[data-title-collapsed\] > \.CollapsedTitle \{\s*opacity: 1;/)
    expect(block).toMatch(/&\[data-scrolled\]:not\(\[data-title-collapsed\]\)\[data-background="glass"\]::before \{\s*opacity: 0;/)
    expect(block).toMatch(/&\[data-scrolled\]:not\(\[data-title-collapsed\]\)\[data-background="hard"\]::before \{\s*border-bottom-color: transparent;/)
    expect(css).not.toMatch(/page-scroll-y|large-title-travel|large-title-scroll/)
    const tokens = readFileSync(`${process.cwd()}/packages/styles/src/styles/variables-components.css`, "utf8")
    expect(tokens).toContain("--toolbar-large-title-swap-duration: 300ms;")
  })

  test("the title in the content stands where it stood in the bar, and never on a desktop layout", () => {
    expect(css).toMatch(/^\.Toolbar,\n\.Heading\[data-in-content\] \{\s*display: none;/m)
    expect(css).toMatch(/\.Heading\[data-in-content\] \{\s*display: flex;[^}]*margin: calc\(var\(--toolbar-large-title-gap\) - var\(--toolbar-padding-bottom\) - var\(--page-content-padding-top, 16px\)\) 0 calc\(var\(--page-content-padding-top, 16px\) - var\(--toolbar-large-title-descent\)\);/)
    expect(css).toMatch(/\.Heading\[data-in-content\]:has\(> \.Subtitle\) \{\s*margin-top: calc\(var\(--toolbar-large-title-gap\) \+ 3px - var\(--toolbar-padding-bottom\) - var\(--page-content-padding-top, 16px\)\);\s*margin-bottom: calc\(var\(--page-content-padding-top, 16px\) - var\(--toolbar-large-subtitle-descent\)\);/)
    // The place holds the title's margins, so they never merge with the content's.
    expect(readFileSync(`${process.cwd()}/packages/styles/src/components/Page/Page.module.css`, "utf8")).toMatch(/\.LargeTitle \{\s*display: flow-root;/)
  })

  test("the soft edge of a top bar is iOS 27.2's: a veil of the canvas color and a blur that lets go past the bar, once content is under it", () => {
    const tokens = readFileSync(`${process.cwd()}/packages/styles/src/styles/variables-components.css`, "utf8")
    // ref-app edge-uikit-soft-grouped: 55% to 56 above the bar's bottom, 38, 31, 20 at the bottom, 8 12 below, none 24 below
    expect(tokens).toContain("--page-bar-soft-veil: linear-gradient(to bottom, rgb(0 0 0 / 55%) calc(100% - var(--page-bar-soft-tail) - 56px), rgb(0 0 0 / 38%) calc(100% - var(--page-bar-soft-tail) - 32px), rgb(0 0 0 / 31%) calc(100% - var(--page-bar-soft-tail) - 16px), rgb(0 0 0 / 20%) calc(100% - var(--page-bar-soft-tail)), rgb(0 0 0 / 8%) calc(100% - var(--page-bar-soft-tail) + 12px), transparent calc(100% - var(--page-bar-soft-tail) + 24px));")
    expect(tokens).toContain("--page-bar-soft-blur: 10px;")
    expect(tokens).toContain("--page-bar-soft-blur-mask: linear-gradient(to bottom, #000 calc(100% - var(--page-bar-soft-tail) - 16px), transparent calc(100% - var(--page-bar-soft-tail) + 12px));")
    const top = css.slice(css.indexOf('.Toolbar[data-placement="top"] {'))
    expect(top).toMatch(/&\[data-background="soft"\]::before \{\s*-webkit-mask-image: var\(--page-bar-soft-veil\);\s*mask-image: var\(--page-bar-soft-veil\);/)
    expect(top).toMatch(/&\[data-background="soft"\]::after \{[^}]*inset: 0 0 calc\(-1 \* var\(--page-bar-soft-tail, 32px\)\);[^}]*backdrop-filter: blur\(var\(--page-bar-soft-blur\)\);[^}]*mask-image: var\(--page-bar-soft-blur-mask\);/)
    expect(top).toMatch(/&\[data-background="soft"\]:not\(\[data-scrolled\]\)::before,\s*&\[data-background="soft"\]:not\(\[data-scrolled\]\)::after \{\s*opacity: 0;/)
    // The plain fade over the whole height is left to a bar of controls alone, which covers only the status bar (Notes).
    expect(css).toMatch(/:not\(:has\(> \.Heading, > \.CollapsedTitle, > \.Content\[data-fill\]\)\) \{\s*&::before \{\s*inset: 0 0 auto;\s*height: var\(--toolbar-padding-top, 0px\);\s*-webkit-mask-image: linear-gradient\(to bottom, #000, transparent\);\s*mask-image: linear-gradient\(to bottom, #000, transparent\);\s*\}\s*&::after \{\s*display: none;/)
    // The search bar stays flat.
    expect(css).toMatch(/\.Toolbar\[data-placement="top"\]:has\(> \.Content\[data-fill\]\) \{[\s\S]*?&\[data-background="soft"\]::after \{\s*display: none;/)
  })
})

describe("Phone bottom bar after iOS 26 Mail and Contacts (430 x 932)", () => {
  const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")
  test("its tokens: 28 above the home indicator, the search field's magnifier, text and placeholder, the smaller symbol", () => {
    const tokens = read("styles/variables-components.css")
    for (const token of [
      "--toolbar-bottom-padding-bottom: max(16px, calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) - 6px));",
      "--toolbar-search-gutter: 10.54px;",
      "--toolbar-search-icon-gap: 6.43px;",
      "--toolbar-search-icon-size: 23.75px;",
      "--toolbar-search-font-weight: 400;",
      "--toolbar-search-placeholder-color: light-dark(var(--alpha-40), var(--alpha-60));",
      "--toolbar-icon-size-sm: 23.56px;",
    ]) expect(tokens).toContain(token)
  })

  test("on a band (glass, hard, solid) it is the top bar turned over: 10 above, the bar's gutter at the sides and below", () => {
    // Owner 12.11 «паддинги явно не верные»: the soft bar's 4 and 28 are for rounds standing on the content.
    const toolbar = read("components/Toolbar/Toolbar.module.css")
    expect(toolbar).toMatch(/\.Toolbar\[data-placement="bottom"\]:not\(\[data-background="soft"\], \[data-host="dialog"\]\):not\(:has\(> \.Content\[data-fill\] > :where\(button, a, \[role="link"\]\)\)\) \{\s*--toolbar-bottom-gutter: var\(--toolbar-gutter\);\s*--toolbar-bottom-padding-top: var\(--toolbar-padding-bottom\);\s*--toolbar-bottom-padding-bottom: max\(var\(--toolbar-gutter\), calc\(var\(--safe-area-inset-bottom, env\(safe-area-inset-bottom, 0px\)\) - 6px\)\);\s*\}/)
    const tokens = read("styles/variables-components.css")
    expect(tokens).toContain("--toolbar-bottom-padding-top: 4px;")
    expect(tokens).toContain("--toolbar-bottom-gutter: 28px;")
  })

  test("a top bar stands under the status bar, or the gutter from the window's top without one (a page in a browser)", () => {
    // Owner 13.11 «кнопки в тулбаре без паддинга прилипают прямо к верхней границе»: the inset is 0 in a browser
    const inset = "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))"
    const toolbar = read("components/Toolbar/Toolbar.module.css")
    expect(toolbar).toContain(`.Toolbar[data-host="page"][data-placement="top"] {\n    --toolbar-padding-top: max(var(--toolbar-gutter), ${inset});`)
    expect(toolbar).toContain(`:where([data-mobile-placement="fullscreen"]) .Toolbar[data-host="dialog"][data-placement="top"] {\n    --toolbar-padding-top: max(var(--toolbar-gutter), ${inset});`)
    const page = read("components/Page/Page.module.css")
    expect(page).toContain(`padding-block: max(var(--page-gutter), ${inset}) 10px;`)
    expect(page).toContain(`calc(max(var(--page-gutter), ${inset}) + var(--page-bar-height-phone) + 10px)`)
  })

  test("the search field and a button with iconSize=\"sm\" take them, in a Toolbar.Group and a ButtonGroup too", () => {
    const toolbar = read("components/Toolbar/Toolbar.module.css")
    expect(toolbar).toMatch(/\[data-slot="input"\]\[data-variant\] \{[^}]*--input-placeholder-text-color: var\(--toolbar-search-placeholder-color\);[^}]*font-weight: var\(--toolbar-search-font-weight\);/)
    expect(toolbar).toMatch(/\.Toolbar :is\(\.Leading, \.Trailing, \.Content, \.Group\) > :where\(button, a\)\[data-icon-size="sm"\]:not\(\[data-navigation-action\]\) \{\s*--button-icon-size: var\(--toolbar-icon-size-sm\);/)
    expect(read("components/ButtonGroup/ButtonGroup.module.css")).toMatch(/& > :where\(button, a, \[role="link"\]\)\[data-icon-size="sm"\]:where\(:not\(\[data-navigation-action\]\)\) \{\s*--button-icon-size: var\(--toolbar-icon-size-sm\);/)
  })
})

// Owner 09.11 (plan 176 item 6): with leading controls and nothing trailing, an empty trailing column and its gap
// took 12px from the search field or the title.
describe("A bar with leading controls and nothing trailing", () => {
  const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Toolbar/Toolbar.module.css`, "utf8")
  test("has two columns for a filled content or a title from the start edge, and a large title keeps its rows", () => {
    expect(css).toMatch(/\.Toolbar:not\(\[data-title-style="large"\]\):has\(> \.Leading\):not\(:has\(> \.Trailing\)\):is\(\[data-title-align="start"\], \[data-title-style="compact-large"\], \[data-title-style="compact-medium"\], :has\(> \.Content\[data-fill\]\)\) \{\s*grid-template-areas: "leading heading";\s*grid-template-columns: max-content minmax\(0, 1fr\);/)
    expect(css).toMatch(/\.Toolbar:not\(\[data-title-style="large"\]\):has\(> \.Leading\):not\(:has\(> \.Trailing\)\):has\(> \.Content\[data-fill\]\) \{\s*grid-template-areas: "leading content";/)
  })
})
