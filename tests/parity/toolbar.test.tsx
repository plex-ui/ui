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
import { Page, PageContent, PageHeader } from "../../packages/vue/src/components/Page"
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
    expect(tokens).toContain("--toolbar-prominent-disabled-background: light-dark(rgb(0 0 0 / 13%), rgb(255 255 255 / 22%));")
    expect(tokens).toContain("--toolbar-prominent-disabled-color: light-dark(rgb(255 255 255), rgb(255 255 255 / 30%));")
  })
})
