import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useEffect, type ComponentType, type ReactNode } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, onMounted, reactive, ref, type VNode } from "vue"
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
  ToolbarRow,
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

type Case = { root?: Props; title?: Props; leading?: boolean; group?: boolean; search?: boolean; row?: boolean }

const reactBar = ({ root = {}, title, leading = true, group = false, search = false, row = false }: Case) =>
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
    row && createElement(RToolbar.Row, { className: "views" }, createElement("div", { role: "radiogroup", "aria-label": "Orders" }, "All")),
  )

const vueBar = ({ root = {}, title, leading = true, group = false, search = false, row = false }: Case) =>
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
    row ? h(ToolbarRow, { class: "views" }, () => h("div", { role: "radiogroup", "aria-label": "Orders" }, "All")) : null,
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
    ["hard", { root: { background: "hard" }, title: {} }],
    ["bottom", { root: { placement: "bottom", titleStyle: "large" }, search: true }],
    ["row", { title: {}, row: true }],
    ["row under a search field", { search: true, leading: false, row: true }],
    ["row under a compact title", { root: { titleStyle: "compact-large" }, title: {}, leading: false, row: true }],
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

  test.each(["React", "Vue"] as const)("%s: a bottom bar in a Sheet, or in a Page laid out inside one, keeps its soft edge; on a page it has iOS 27.2's (owner 13.11)", async (framework) => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Toolbar/Toolbar.module.css`, "utf8")
    const pageCss = readFileSync(`${process.cwd()}/packages/styles/src/components/Page/Page.module.css`, "utf8")
    const toolbarRule = css.match(/(\.Toolbar\[data-placement="bottom"\]\[data-background="soft"\][^{]*) \{\s*&::before,\s*&::after \{\s*inset: calc\(var\(--toolbar-bottom-item-top\) - var\(--page-bar-soft-bottom-reach\)\) 0 0;/)?.[1]
    const footerBlock = pageCss.slice(pageCss.indexOf("  .Footer {"))
    const footerRule = footerBlock.match(/&(\[data-background="soft"\][^{]*) \{\s*&::before,\s*&::after \{\s*inset: calc\(var\(--page-footer-padding-top\) - var\(--page-bar-soft-bottom-reach\)\) 0 0;/)?.[1]
    if (!toolbarRule || !footerRule) throw new Error("the soft bottom rules are missing")
    const drawsPageEdge = (el: Element | null) => Boolean(el?.matches(toolbarRule))
    const drawsFooterEdge = (el: Element | null) => Boolean(el?.matches(`.Footer${footerRule}`))
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
    for (const bar of bars) expect(drawsPageEdge(bar)).toBe(!sheet?.contains(bar))
    for (const footer of footers) expect(drawsFooterEdge(footer)).toBe(!sheet?.contains(footer))
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
  const reactLarge = (titleStyle: string, title: Record<string, unknown> = {}, row = false) => createElement(
    RPage as unknown as AnyComponent,
    null,
    reactBar({ root: { titleStyle }, title, row }),
    createElement(RPage.Content, null, "Body"),
  )
  const vueLarge = (titleStyle: string, title: Record<string, unknown> = {}, row = false) => () => h(Page as never, null, () => [vueBar({ root: { titleStyle }, title, row }), h(PageContent, null, () => "Body")])
  const mount = async (framework: "React" | "Vue", titleStyle: string, title: Record<string, unknown> = {}, row = false) => {
    const view = framework === "React" ? render(reactLarge(titleStyle, title, row)) : null
    const vue = framework === "Vue" ? mountVue(vueLarge(titleStyle, title, row) as () => VNode) : null
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

  test.each(["React", "Vue"] as const)("%s: the title in the content keeps the large title tokens its bar sets for itself, and their changes", async (framework) => {
    const style = (size: string) => (framework === "React" ? { "--toolbar-large-title-gap": "24px", "--toolbar-large-title-font-size": size } : `--toolbar-large-title-gap: 24px; --toolbar-large-title-font-size: ${size}`)
    const vueRoot = reactive({ titleStyle: "large", style: style("40px") as unknown })
    const reactPage = (size: string) => createElement(RPage as unknown as AnyComponent, null, reactBar({ root: { titleStyle: "large", style: style(size) }, title: {} }), createElement(RPage.Content, null, "Body"))
    const view = framework === "React" ? render(reactPage("40px")) : null
    if (framework === "Vue") mountVue(() => h(Page as never, null, () => [vueBar({ root: { ...vueRoot }, title: {} }), h(PageContent, null, () => "Body")]))
    await (framework === "React" ? act(async () => {}) : flushVue())
    const heading = () => document.querySelector<HTMLElement>(".LargeTitle > .Heading[data-in-content]")
    expect(heading()?.style.getPropertyValue("--toolbar-large-title-gap")).toBe("24px")
    expect(heading()?.style.getPropertyValue("--toolbar-large-title-font-size")).toBe("40px")
    // A token that only the page sets stays inherited.
    expect(heading()?.style.getPropertyValue("--toolbar-large-title-line-height")).toBe("")
    // The bar's own token changes after it has mounted, with no change of size.
    if (framework === "React") await act(async () => { view?.rerender(reactPage("48px")) })
    else { vueRoot.style = style("48px"); await flushVue() }
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(heading()?.style.getPropertyValue("--toolbar-large-title-font-size")).toBe("48px")
  })

  test.each(["React", "Vue"] as const)("%s: a token the bar and the page both set stays the bar's when the page changes it", async (framework) => {
    const gap = (value: string) => (framework === "React" ? { "--toolbar-large-title-gap": value } : `--toolbar-large-title-gap: ${value}`)
    const vuePage = reactive({ style: gap("24px") as unknown })
    const reactPage = (value: string) => createElement(RPage as unknown as AnyComponent, { style: gap(value) }, reactBar({ root: { titleStyle: "large", style: gap("24px") }, title: {} }), createElement(RPage.Content, null, "Body"))
    const view = framework === "React" ? render(reactPage("24px")) : null
    if (framework === "Vue") mountVue(() => h(Page as never, { ...vuePage }, () => [vueBar({ root: { titleStyle: "large", style: gap("24px") }, title: {} }), h(PageContent, null, () => "Body")]))
    await (framework === "React" ? act(async () => {}) : flushVue())
    const heading = () => document.querySelector<HTMLElement>(".LargeTitle > .Heading[data-in-content]")
    expect(heading()?.style.getPropertyValue("--toolbar-large-title-gap")).toBe("")
    if (framework === "React") await act(async () => { view?.rerender(reactPage("40px")) })
    else { vuePage.style = gap("40px"); await flushVue() }
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(heading()?.style.getPropertyValue("--toolbar-large-title-gap")).toBe("24px")
  })

  test.each(["React", "Vue"] as const)("%s: a row under a large title stands under it in the content, and the bar keeps its controls", async (framework) => {
    const unmount = await mount(framework, "large", {}, true)
    const place = document.querySelector(".LargeTitle")
    // The title, then the rows in a place of their own, at the top of the content: the content starts under the rows,
    // the title scrolls away and the rows pin under the bar.
    expect(Array.from(place?.parentElement?.children ?? [], (child) => child.className.split(" ")[0])).toEqual(["LargeTitle", "LargeTitleRows"])
    expect(Array.from(place?.children ?? [], (child) => child.className.split(" ")[0])).toEqual(["Heading"])
    const row = document.querySelector(".LargeTitleRows > .Row")
    expect([row?.hasAttribute("data-in-content"), row?.hasAttribute("data-toolbar-row"), row?.classList.contains("views")]).toEqual([true, true, true])
    expect(row?.querySelector('[role="radiogroup"]')?.textContent).toBe("All")
    expect(document.querySelector("[data-toolbar] > .Row")).toBeNull()
    unmount()
    // Without a large title the row is the bar's own, under its controls.
    const inline = await mount(framework, "inline", {}, true)
    expect(document.querySelector("[data-toolbar] > .Row:not([data-in-content])")).not.toBeNull()
    expect(document.querySelector(".LargeTitle")).toBeNull()
    inline()
  })

  test.each(["React", "Vue"] as const)("%s: under a large title a row waits for its place in the content and mounts its children once (Codex #5)", async (framework) => {
    // A switcher that holds its own selection keeps it when the content comes later: the row never stands in the bar
    // first, so it is never moved into the content.
    let mounts = 0
    const content = ref(false)
    let rerender = (_content: boolean) => {}
    if (framework === "React") {
      function Views() { useEffect(() => { mounts += 1 }, []); return createElement("span", null, "views") }
      const tree = (withContent: boolean) => createElement(
        RPage as unknown as AnyComponent,
        null,
        createElement(RToolbar as unknown as AnyComponent, { titleStyle: "large" },
          createElement(RToolbar.Title, null, "Orders"),
          createElement(RToolbar.Row, null, createElement(Views))),
        withContent ? createElement(RPage.Content, null, "Body") : null,
      )
      const view = render(tree(false))
      rerender = (withContent) => view.rerender(tree(withContent))
    } else {
      const Views = defineComponent({ setup() { onMounted(() => { mounts += 1 }); return () => h("span", null, "views") } })
      mountVue(() => h(Page as never, null, () => [
        h(Toolbar, { titleStyle: "large" }, () => [h(ToolbarTitle, null, () => "Orders"), h(ToolbarRow, null, () => h(Views))]),
        content.value ? h(PageContent, null, () => "Body") : null,
      ]))
      rerender = (withContent) => { content.value = withContent }
    }
    await (framework === "React" ? act(async () => {}) : flushVue())
    expect([document.querySelectorAll(".Row").length, mounts]).toEqual([0, 0])
    if (framework === "React") await act(async () => { rerender(true) })
    else { rerender(true); await flushVue() }
    expect(document.querySelector(".LargeTitleRows > .Row[data-in-content] > span")?.textContent).toBe("views")
    expect(mounts).toBe(1)
  })

  test.each(["React", "Vue"] as const)("%s: several rows stand in their order, in the bar and under a large title (owner 13.11)", async (framework) => {
    // Buttons and the title, a search field, then a segmented control, as iOS 27.2 sets a safeAreaBar under the search
    // field of the bar's drawer.
    const rowsOf = (selector: string) => Array.from(document.querySelectorAll(selector), (row) => row.classList[1])
    // Under a large title the rows stand in the order of their anchors in the bar (followRowOrder).
    // The DOM order, which the keyboard and a screen reader follow, not a CSS order (Codex #7).
    const orderOf = () => Array.from(document.querySelectorAll<HTMLElement>(".LargeTitleRows > .Row[data-in-content]"), (row) => {
      expect(row.style.order).toBe("")
      return row.classList[1]
    })
    for (const titleStyle of ["inline", "large"]) {
      const view = framework === "React"
        ? render(createElement(RPage as unknown as AnyComponent, null,
          createElement(RToolbar as unknown as AnyComponent, { titleStyle },
            createElement(RToolbar.Title, null, "Orders"),
            createElement(RToolbar.Row, { className: "search" }, "Search"),
            createElement(RToolbar.Row, { className: "views" }, "Views")),
          createElement(RPage.Content, null, "Body")))
        : null
      const vue = framework === "Vue"
        ? mountVue(() => h(Page as never, null, () => [
          h(Toolbar as never, { titleStyle }, () => [
            h(ToolbarTitle, null, () => "Orders"),
            h(ToolbarRow, { class: "search" }, () => "Search"),
            h(ToolbarRow, { class: "views" }, () => "Views"),
          ]),
          h(PageContent, null, () => "Body"),
        ]))
        : null
      await (framework === "React" ? act(async () => {}) : flushVue())
      if (titleStyle === "inline") {
        expect(rowsOf("[data-toolbar] > .Row:not([data-in-content])")).toEqual(["search", "views"])
        expect(document.querySelector(".LargeTitleRows")).toBeNull()
      } else {
        expect(orderOf()).toEqual(["search", "views"])
        expect(document.querySelector("[data-toolbar] > .Row")).toBeNull()
      }
      view?.unmount()
      vue?.unmount()
    }
  })

  test.each(["React", "Vue"] as const)("%s: under a large title a row shown later keeps its place among the rows", async (framework) => {
    // A search field shown over a segmented control already in the content stands over it, not after it (the Vue
    // Overview showed it under the control: each row is portaled as it mounts).
    // The DOM order, which the keyboard and a screen reader follow, not a CSS order (Codex #7).
    const orderOf = () => Array.from(document.querySelectorAll<HTMLElement>(".LargeTitleRows > .Row[data-in-content]"), (row) => {
      expect(row.style.order).toBe("")
      return row.classList[1]
    })
    const search = ref(false)
    let show = async (_on: boolean) => {}
    if (framework === "React") {
      const tree = (on: boolean) => createElement(RPage as unknown as AnyComponent, null,
        createElement(RToolbar as unknown as AnyComponent, { titleStyle: "large" },
          createElement(RToolbar.Title, null, "Orders"),
          on && createElement(RToolbar.Row, { className: "search" }, "Search"),
          createElement(RToolbar.Row, { className: "views" }, "Views")),
        createElement(RPage.Content, null, "Body"))
      const view = render(tree(false))
      show = async (on) => { await act(async () => { view.rerender(tree(on)) }) }
    } else {
      mountVue(() => h(Page as never, null, () => [
        h(Toolbar as never, { titleStyle: "large" }, () => [
          h(ToolbarTitle, null, () => "Orders"),
          search.value ? h(ToolbarRow, { class: "search" }, () => "Search") : null,
          h(ToolbarRow, { class: "views" }, () => "Views"),
        ]),
        h(PageContent, null, () => "Body"),
      ]))
      show = async (on) => { search.value = on; await flushVue() }
    }
    await (framework === "React" ? act(async () => {}) : flushVue())
    expect(orderOf()).toEqual(["views"])
    // A field focused in the row already there keeps its focus: only the row that came later moves (Codex #8).
    const field = document.createElement("input")
    document.querySelector(".LargeTitleRows > .views")?.appendChild(field)
    field.focus()
    await show(true)
    await Promise.resolve()
    expect(orderOf()).toEqual(["search", "views"])
    expect(document.activeElement).toBe(field)
    field.remove()
    await show(false)
    await Promise.resolve()
    expect(orderOf()).toEqual(["views"])
    expect(document.querySelectorAll("[data-toolbar-row-anchor]")).toHaveLength(1)
  })

  test.each(["React", "Vue"] as const)("%s: rows under a large title pin under the bar once scrolled up to it, and the bar's background reaches under them (owner 13.11)", async (framework) => {
    // The rows' place is 42 tall and stands right under the title's (its bottom at 150 less the scroll), until the
    // sticky offset holds it at 70, under the bar's controls: then it stands off the title's bottom.
    let scrolled = 0
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const titleBottom = 150 - scrolled
      const top = this.classList.contains("LargeTitleRows") ? Math.max(titleBottom, 70) : this.classList.contains("LargeTitle") ? titleBottom - 40 : 0
      const bottom = this.classList.contains("LargeTitle") ? titleBottom : top
      return { x: 0, y: top, top, left: 0, right: 0, width: 0, height: bottom - top, bottom, toJSON: () => ({}) } as DOMRect
    })
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      // An empty place is display: none (Page.module.css), so it has no height.
      return this.classList.contains("LargeTitleRows") && this.childElementCount > 0 ? 42 : 0
    })
    const unmount = await mount(framework, "large", {}, true)
    const content = document.querySelector<HTMLElement>(".Page > .Content")
    const page = document.querySelector<HTMLElement>(".Page")
    const bar = document.querySelector<HTMLElement>('[data-toolbar][data-placement="top"]')
    if (!content || !page || !bar) throw new Error("the page is missing")
    const scrollTo = async (top: number) => {
      scrolled = top
      if (framework === "React") await act(async () => { content.dispatchEvent(new Event("scroll")) })
      else { content.dispatchEvent(new Event("scroll")); await flushVue() }
    }
    // Under the title: not pinned, the bar keeps its own background.
    expect(bar.hasAttribute("data-rows-pinned")).toBe(false)
    expect(page.style.getPropertyValue("--page-toolbar-rows-height")).toBe("42px")
    await scrollTo(80)
    expect(bar.hasAttribute("data-rows-pinned")).toBe(false)
    // Stuck under the controls: the bar takes them in.
    await scrollTo(120)
    expect(bar.hasAttribute("data-rows-pinned")).toBe(true)
    // Back down with the title: free again.
    await scrollTo(40)
    expect(bar.hasAttribute("data-rows-pinned")).toBe(false)
    await scrollTo(200)
    unmount()
    // Without rows nothing pins, and an inline bar never does.
    const plain = await mount(framework, "large")
    expect(document.querySelector("[data-toolbar]")?.hasAttribute("data-rows-pinned")).toBe(false)
    expect(document.querySelector<HTMLElement>(".Page")?.style.getPropertyValue("--page-toolbar-rows-height")).toBe("")
    plain()
  })

  test.each(["React", "Vue"] as const)("%s: the title changing its height pins the rows with no scroll (Codex #7)", async (framework) => {
    // Scrolled just short of pinning, the subtitle goes: the title's bottom rises and the rows stick, with no scroll
    // and no change to the rows' or the content's size. Only the title's own box says so.
    let shrunk = 0
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const titleBottom = 70 - shrunk
      const top = this.classList.contains("LargeTitleRows") ? Math.max(titleBottom, 70) : this.classList.contains("LargeTitle") ? titleBottom - 40 : 0
      const bottom = this.classList.contains("LargeTitle") ? titleBottom : top
      return { x: 0, y: top, top, left: 0, right: 0, width: 0, height: bottom - top, bottom, toJSON: () => ({}) } as DOMRect
    })
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("LargeTitleRows") && this.childElementCount > 0 ? 42 : 0
    })
    const watched: Array<{ target: Element; notify: () => void }> = []
    vi.stubGlobal("ResizeObserver", class {
      constructor(private callback: () => void) {}
      observe(target: Element) { watched.push({ target, notify: () => this.callback() }) }
      unobserve() {}
      disconnect() {}
    })
    const unmount = await mount(framework, "large", {}, true)
    const bar = document.querySelector<HTMLElement>('[data-toolbar][data-placement="top"]')
    expect(bar?.hasAttribute("data-rows-pinned")).toBe(false)
    shrunk = 22
    const title = watched.filter(({ target }) => target.classList.contains("LargeTitle"))
    expect(title.length).toBeGreaterThan(0)
    await (framework === "React" ? act(async () => { title.forEach(({ notify }) => notify()) }) : (title.forEach(({ notify }) => notify()), flushVue()))
    expect(bar?.hasAttribute("data-rows-pinned")).toBe(true)
    unmount()
    vi.unstubAllGlobals()
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

  test("a bottom bar on a page draws iOS 27.2's soft edge once content runs on under it, a sheet's keeps its own, and glass stands out over content (owner 13.11)", () => {
    const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")
    // ref-app bottomedge-soft: no band, the top bar's veil and blur turned over, from 34pt above the items; a sheet
    // fades its list (IMG_5491).
    const pageSoft = css.slice(css.indexOf('.Toolbar[data-placement="bottom"][data-background="soft"]:not([data-host="dialog"], [data-mobile-variant="sheet"] *) {'))
    expect(pageSoft).toMatch(/^[^]*?&::before \{\s*-webkit-mask-image: var\(--page-bar-soft-bottom-veil\);/)
    expect(pageSoft).toMatch(/^[^]*?&::after \{[^}]*backdrop-filter: blur\(var\(--page-bar-soft-blur\)\);[^}]*mask-image: var\(--page-bar-soft-bottom-blur-mask\);/)
    expect(pageSoft).toMatch(/^[^]*?&:not\(\[data-content-below\]\)::before,\s*&:not\(\[data-content-below\]\)::after \{\s*opacity: 0;/)
    // A sheet's bar keeps the glass of the sheet, so the raised shadow no longer ties with Dialog's rule.
    expect(css).toMatch(/\.Toolbar\[data-placement="bottom"\]\[data-content-below\]:not\(\[data-mobile-variant="sheet"\] \*\) \{\s*--mobile-glass-shadow: var\(--mobile-glass-shadow-raised\);/)
    expect(read("components/Page/Page.module.css")).toMatch(/&\[data-background="soft"\]:not\(\[data-mobile-variant="sheet"\] \*\) \{\s*&::before,\s*&::after \{\s*inset: calc\(var\(--page-footer-padding-top\) - var\(--page-bar-soft-bottom-reach\)\) 0 0;/)
    const tokens = read("styles/variables-components.css")
    expect(tokens).toContain("--page-bar-soft-bottom-reach: 34px;")
    expect(tokens).toContain("--page-bar-soft-bottom-veil: linear-gradient(to bottom, transparent, rgb(0 0 0 / 8%) 9px, rgb(0 0 0 / 15%) 25px, rgb(0 0 0 / 15%) 37px, rgb(0 0 0 / 23%) 45px, rgb(0 0 0 / 31%) 57px, rgb(0 0 0 / 46%) 77px);")
    expect(tokens).toContain("--page-bar-soft-bottom-blur-mask: linear-gradient(to bottom, transparent 12px, #000 40px);")
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

  test("rows stand across the bar under its controls in their order, and under a large title in a place of their own that pins them under the bar (owner 13.11)", () => {
    // Between the bar's gutters, 10 under the controls and 10 apart, in their order (auto-placed, no row of their
    // own); they never widen the bar.
    expect(css).toMatch(/\.Row \{\s*display: flex;\s*grid-column: 1 \/ -1;[^}]*contain: inline-size;/)
    expect(css).not.toMatch(/\.Row \{[^}]*grid-row/)
    expect(css).toMatch(/\.Toolbar:not\(\[data-title-style="large"\]\):has\(> \.Row\) \{\s*row-gap: var\(--toolbar-row-gap\);/)
    expect(readFileSync(`${process.cwd()}/packages/styles/src/styles/variables-components.css`, "utf8")).toContain("--toolbar-row-gap: 10px;")
    // In the content: a place of their own after the title's, 16 under its baseline and 16 above the content, sticky
    // under the controls, 10 under them as in the bar, over the content (iOS 27.2 segrow-large-scrolled).
    const page = readFileSync(`${process.cwd()}/packages/styles/src/components/Page/Page.module.css`, "utf8")
    expect(page).toMatch(/\.LargeTitleRows \{\s*position: sticky;\s*z-index: 6;\s*top: calc\(var\(--toolbar-row-gap\) - var\(--toolbar-padding-bottom\) - var\(--page-content-padding-top, 16px\)\);\s*display: flex;\s*flex-direction: column;\s*gap: var\(--toolbar-row-gap\);\s*margin-bottom: var\(--page-content-padding-top, 16px\);/)
    // A target scrolled into view lands under the pinned rows, where the bar's background ends (Codex #7).
    expect(page).toMatch(/\.Content:has\(> \.Column > \.LargeTitleRows > \*\) \{\s*scroll-padding-top: calc\(\s*var\(--page-top\) \+ var\(--page-content-padding-top\) \+ var\(--toolbar-row-gap\) \+ var\(--page-toolbar-rows-height, 0px\)\s*\);/)
    expect(page).not.toContain(".LargeTitle:has(")
    expect(css).toMatch(/\.Row\[data-in-content\] \{\s*--toolbar-item-size: var\(--toolbar-top-item-size\);\s*display: flex;\s*\}/)
    // Pinned, the bar's background, edge and line reach under them, its bottom padding under the last one.
    expect(css).toMatch(/&\[data-rows-pinned\]::before,\s*&\[data-rows-pinned\]::after \{\s*margin-bottom: calc\(-1 \* \(var\(--toolbar-row-gap\) \+ var\(--page-toolbar-rows-height, 0px\)\)\);/)
    // A search field in a row is the bar's (44 of glass), in the bar and in the content.
    expect(css).toContain(':is(.Toolbar :is(.Leading, .Trailing, .Content), .Row) > [data-slot="input"][data-variant] {')
    // A row's segmented control keeps its own size, in the bar and in the content alike: native's small one at md (32),
    // the large glass one from lg (owner 13.11 «маленький будет - верно?»). Its button groups are the bar's capsules.
    const touch = readFileSync(`${process.cwd()}/packages/styles/src/styles/touch.css`, "utf8")
    expect(touch.split('html [data-toolbar] :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"]:not([data-toolbar-row] *)')).toHaveLength(4)
    expect(touch.split('[data-size="sm"], [data-toolbar-row] [data-size="md"])')).toHaveLength(6)
    expect(touch).not.toContain('[data-toolbar-row]) :is(')
    // A row's control at its default size is glass, 40 with a 34 selection 3 inside it (IMG_5550; owner 13.11 «Да,
    // стекло»), in the large control's rule and its motion; sm keeps the small plain one, flat too
    const row = 'html [data-toolbar-row] :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"][data-size="md"]:not([data-mobile-material="flat"], [data-mobile-size="small"])'
    expect(touch.split(row)).toHaveLength(5)
    expect(touch).toContain(`${row} {\n      --segmented-control-size: 40px;\n      --segmented-control-gutter: 3px;\n      --segmented-control-option-gutter: 12px;\n    }`)
    expect(touch.indexOf(`${row} {\n      --segmented-control-size: 40px;`)).toBeGreaterThan(touch.indexOf("--segmented-control-size: 48px;"))
    const group = readFileSync(`${process.cwd()}/packages/styles/src/components/ButtonGroup/ButtonGroup.module.css`, "utf8")
    // The glass context, the capsule, a field among glass buttons, and the floating field group (not in a bar)
    expect(group.split('[data-toolbar] *, [data-toolbar-row] *)')).toHaveLength(5)
  })

  test("the title in the content stands where it stood in the bar, and never on a desktop layout", () => {
    expect(css).toMatch(/^\.Toolbar,\n\.Heading\[data-in-content\],\n\.Row\[data-in-content\] \{\s*display: none;/m)
    expect(css).toMatch(/\.Heading\[data-in-content\] \{\s*display: flex;[^}]*margin: calc\(var\(--toolbar-large-title-gap\) - var\(--toolbar-padding-bottom\) - var\(--page-content-padding-top, 16px\)\) 0 calc\(var\(--page-content-padding-top, 16px\) - var\(--toolbar-large-title-descent\)\);/)
    // With a subtitle only the content moves: the title keeps its top (owner 13.11).
    expect(css).toMatch(/\.Heading\[data-in-content\]:has\(> \.Subtitle\) \{\s*margin-bottom: calc\(var\(--page-content-padding-top, 16px\) - var\(--toolbar-large-subtitle-descent\)\);\s*\}/)
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

  test("the background never moves the items: a band (glass, hard) only starts 10 above them (owner 13.11)", () => {
    // ref-app bottomedge-soft and bottomedge-hard: the items stand at the same place over both edges, the round 27.3pt
    // from the side and 28 above the screen's edge; the hard edge's hairline lies 9.3 above them (owner 12.11
    // «паддинги явно не верные»: the band starts 10 above, as the top bar's air under its items).
    const toolbar = read("components/Toolbar/Toolbar.module.css")
    expect(toolbar).toMatch(/\.Toolbar\[data-placement="bottom"\]:not\(\[data-background="soft"\], \[data-background="blur"\], \[data-host="dialog"\]\):not\(:has\(> \.Content\[data-fill\] > :where\(button, a, \[role="link"\]\)\)\) \{\s*--toolbar-bottom-padding-top: var\(--toolbar-padding-bottom\);\s*\}/)
    // Only the top: no background sets the sides or the bottom of a bottom bar.
    expect(toolbar).not.toMatch(/\[data-background[^{]*\{[^}]*--toolbar-bottom-(gutter|padding-bottom):/)
    const tokens = read("styles/variables-components.css")
    expect(tokens).toContain("--toolbar-bottom-padding-top: 4px;")
    expect(tokens).toContain("--toolbar-bottom-gutter: 28px;")
  })

  test("a top bar stands under the status bar, or without one keeps the air above its row that it keeps below it (a page in a browser)", () => {
    // Owner 13.11 «кнопки в тулбаре без паддинга прилипают прямо к верхней границе»: the inset is 0 in a browser; owner
    // 14.11 «паддинг над топбаром больше чем должен быть»: the 16 of the gutter, so 10 above as below
    const inset = "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))"
    const toolbar = read("components/Toolbar/Toolbar.module.css")
    expect(toolbar).toContain(`.Toolbar[data-host="page"][data-placement="top"] {\n    --toolbar-padding-top: max(var(--toolbar-padding-bottom), ${inset});`)
    expect(toolbar).toContain(`:where([data-mobile-placement="fullscreen"]) .Toolbar[data-host="dialog"][data-placement="top"] {\n    --toolbar-padding-top: max(var(--toolbar-padding-bottom), ${inset});`)
    const page = read("components/Page/Page.module.css")
    expect(page).toContain(`padding-block: max(10px, ${inset}) 10px;`)
    expect(page).toContain(`calc(max(10px, ${inset}) + var(--page-bar-height-phone) + 10px)`)
  })

  test("the search field and a button with iconSize=\"sm\" take them, in a Toolbar.Group and a ButtonGroup too", () => {
    const toolbar = read("components/Toolbar/Toolbar.module.css")
    expect(toolbar).toMatch(/\[data-slot="input"\]\[data-variant\] \{[^}]*--input-placeholder-text-color: var\(--toolbar-search-placeholder-color\);[^}]*font-weight: var\(--toolbar-search-font-weight\);/)
    expect(toolbar).toMatch(/\.Toolbar :is\(\.Leading, \.Trailing, \.Content, \.Group\) > :where\(button, a\)\[data-icon-size="sm"\]:not\(\[data-navigation-action\]\) \{\s*--button-icon-size: var\(--toolbar-icon-size-sm\);/)
    expect(read("components/ButtonGroup/ButtonGroup.module.css")).toMatch(/& > :where\(button, a, \[role="link"\]\):where\(\[data-variant\]\)\[data-icon-size="sm"\]:where\(:not\(\[data-navigation-action\]\)\) \{\s*--button-icon-size: var\(--toolbar-icon-size-sm\);/)
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
