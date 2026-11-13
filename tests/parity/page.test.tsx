import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, createRef, type ComponentType, type ReactNode, type Ref } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString as renderReactToString } from "react-dom/server"
import { afterEach, describe, expect, test, vi } from "vitest"
import { createSSRApp, h, reactive, type VNode } from "vue"
import { renderToString as renderVueToString } from "vue/server-renderer"
import { Badge as RBadge } from "../../packages/ui/src/components/Badge"
import { Page as RPage } from "../../packages/ui/src/components/Page"
import { Badge } from "../../packages/vue/src/components/Badge"
import {
  Page,
  PageActions,
  PageBar,
  PageContent,
  PageFooter,
  PageHeader,
  PageHeading,
  PageLeading,
  PageSubtitle,
  PageTitle,
} from "../../packages/vue/src/components/Page"
import { flushVue, mountVue } from "./harness"
import { renderPair } from "./pair"

// React-vs-Vue parity for Page: the tree every part renders, the widths, and
// the line that follows the scroll position of the content.

type Props = Record<string, unknown>
type AnyComponent = ComponentType<Props>

const part = (name: string) => (RPage as unknown as Record<string, AnyComponent>)[name]!
const vueProps = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

const reactTree = (root: Props = {}, header: Props = {}, content: Props = {}, below?: ReactNode) =>
  createElement(
    RPage as unknown as AnyComponent,
    root,
    createElement(
      part("Header"),
      header,
      createElement(
        part("Bar"),
        null,
        createElement(part("Leading"), { "aria-label": "Navigation" }, "Back"),
        createElement(
          part("Heading"),
          null,
          createElement(part("Title"), null, "Orders"),
          createElement(part("Subtitle"), null, "Today"),
        ),
        createElement(part("Actions"), null, "Add"),
      ),
      below,
    ),
    createElement(part("Content"), content, "Body"),
    createElement(part("Footer"), { className: "actions", "aria-label": "Page actions" }, "Save"),
  )

const vueTree = (root: Props = {}, header: Props = {}, content: Props = {}, below?: () => VNode) =>
  h(Page as never, vueProps(root), () => [
    h(PageHeader, vueProps(header), () => [
      h(PageBar, null, () => [
        h(PageLeading, { "aria-label": "Navigation" }, () => "Back"),
        h(PageHeading, null, () => [h(PageTitle, null, () => "Orders"), h(PageSubtitle, null, () => "Today")]),
        h(PageActions, null, () => "Add"),
      ]),
      below?.(),
    ]),
    h(PageContent, vueProps(content), () => "Body"),
    h(PageFooter, { class: "actions", "aria-label": "Page actions" }, () => "Save"),
  ])

const scrollTo = (element: Element, top: number) => {
  Object.defineProperty(element, "scrollTop", { configurable: true, value: top })
  fireEvent.scroll(element)
}

afterEach(() => cleanup())

describe("Page parity", () => {
  test.each<[string, Props, Props, Props]>([
    ["default", {}, {}, {}],
    ["plain surface", { surface: "plain" }, {}, {}],
    ["grouped surface", { surface: "grouped" }, {}, {}],
    ["wide", { width: "wide" }, {}, {}],
    ["column", { width: "column" }, {}, {}],
    ["fill", {}, {}, { fill: true }],
    ["hard bar", {}, { background: "hard" }, {}],
    ["class and attributes", { className: "app", id: "orders" }, { className: "top" }, { className: "body", id: "scroll" }],
    ["own width", { width: "column", style: { "--page-width": "860px" } }, {}, {}],
  ])("%s", async (_name, root, header, content) => {
    const { react, vue } = await renderPair(reactTree(root, header, content), () => vueTree(root, header, content))
    expect(vue).toBe(react)
    expect(react).toContain(`data-surface="${root.surface ?? "plain"}"`)
    expect(react).not.toContain(" surface=")
  })

  test("the row under the bar stays in the header's column", async () => {
    const { react, vue } = await renderPair(
      reactTree({}, {}, {}, createElement("div", { id: "filters" }, "Filters")),
      () => vueTree({}, {}, {}, () => h("div", { id: "filters" }, "Filters")),
    )
    expect(vue).toBe(react)
    expect(react).toContain("filters")
  })

  test("parts read the same outside a header", async () => {
    const { react, vue } = await renderPair(
      createElement(part("Title"), { className: "lead" }, "Orders"),
      () => h(PageTitle, { class: "lead" }, () => "Orders"),
    )
    expect(vue).toBe(react)
  })
})

describe("Page subtitle SSR", () => {
  const reactSubtitle = (ref?: Ref<HTMLDivElement>) => (
    <RPage.Subtitle id="page-status" className="metadata" aria-label="Page status" ref={ref}>
      <RBadge color="info" size="sm" variant="outline">Draft</RBadge>
      <span>Saved a minute ago</span>
    </RPage.Subtitle>
  )
  const vueSubtitle = () => h(PageSubtitle, {
    id: "page-status", class: "metadata", "aria-label": "Page status",
  }, () => [
    h(Badge, { color: "info", size: "sm", variant: "outline" }, () => "Draft"),
    h("span", "Saved a minute ago"),
  ])

  test.each(["React", "Vue"])("%s: HTML parsing keeps badge and text inside the subtitle", async (framework) => {
    const html = framework === "React"
      ? renderReactToString(reactSubtitle())
      : await renderVueToString(createSSRApp({ render: vueSubtitle }))
    const parsed = document.createElement("template")
    parsed.innerHTML = html
    const subtitle = parsed.content.querySelector("#page-status")
    // A <p> containing Badge's <div> is auto-closed by the HTML parser,
    // moving both children out and inserting a second empty paragraph.
    expect(subtitle?.children).toHaveLength(2)
    expect(subtitle?.querySelector(":scope > .Badge")?.textContent).toBe("Draft")
    expect(subtitle?.querySelector(":scope > span")?.textContent).toBe("Saved a minute ago")
    expect(parsed.content.childElementCount).toBe(1)
    expect(subtitle?.classList.contains("Subtitle")).toBe(true)
    expect(subtitle?.classList.contains("metadata")).toBe(true)
    expect(subtitle?.getAttribute("aria-label")).toBe("Page status")
  })

  test("React: hydration preserves composed subtitle nodes and exposes the div ref", async () => {
    const ref = createRef<HTMLDivElement>()
    const element = reactSubtitle(ref)
    const container = document.createElement("div")
    container.innerHTML = renderReactToString(element)
    document.body.appendChild(container)
    const originalSubtitle = container.querySelector("#page-status")
    const originalBadge = container.querySelector(".Badge")
    const recoverableErrors: string[] = []
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, element, {
          onRecoverableError: (error) => recoverableErrors.push(String(error)),
        })
      })
      expect(recoverableErrors).toEqual([])
      expect(errors).not.toHaveBeenCalled()
      expect(ref.current).toBe(originalSubtitle)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(container.querySelector(".Badge")).toBe(originalBadge)
      expect(ref.current?.contains(originalBadge)).toBe(true)
    } finally {
      await act(async () => root?.unmount())
      container.remove()
      errors.mockRestore()
    }
  })
})

describe("Page footer", () => {
  test.each(["React", "Vue"])("%s: an action outside the scrolling content submits its associated form", async (framework) => {
    const submitted = vi.fn()
    if (framework === "React") {
      render(
        <RPage>
          <RPage.Content>
            <form id="product-form" onSubmit={(event) => { event.preventDefault(); submitted() }}>
              <input name="title" defaultValue="Product" />
            </form>
          </RPage.Content>
          <RPage.Footer>
            <button type="submit" form="product-form">Save</button>
          </RPage.Footer>
        </RPage>,
      )
    } else {
      mountVue(() => h(Page, null, () => [
        h(PageContent, null, () => h("form", {
          id: "product-form",
          onSubmit: (event: Event) => { event.preventDefault(); submitted() },
        }, h("input", { name: "title", value: "Product" }))),
        h(PageFooter, null, () => h("button", { type: "submit", form: "product-form" }, "Save")),
      ]))
    }
    await flushVue()
    const button = document.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(button.form).toBe(document.querySelector("#product-form"))
    expect(document.querySelector(".Content")?.contains(button)).toBe(false)
    expect(document.querySelector(".Footer")?.contains(button)).toBe(true)
    await act(async () => { fireEvent.click(button) })
    expect(submitted).toHaveBeenCalledTimes(1)
  })
})

describe("Page line", () => {
  const cases: [string, () => void][] = [
    ["React", () => void render(reactTree())],
    ["Vue", () => void mountVue(() => vueTree())],
  ]

  test.each(cases)("%s: shows past 4px and goes again at the top", async (_name, mount) => {
    mount()
    await flushVue()
    const header = document.querySelector(".Header")!
    const content = document.querySelector(".Content")!
    expect(header.hasAttribute("data-scrolled")).toBe(false)

    await act(async () => scrollTo(content, 4))
    await flushVue()
    expect(header.hasAttribute("data-scrolled")).toBe(false)

    await act(async () => scrollTo(content, 5))
    await flushVue()
    expect(header.hasAttribute("data-scrolled")).toBe(true)

    await act(async () => scrollTo(content, 0))
    await flushVue()
    expect(header.hasAttribute("data-scrolled")).toBe(false)
  })

  test("a header without a divider still tracks scrolling for its background", async () => {
    render(reactTree({}, { divider: false }))
    await act(async () => scrollTo(document.querySelector(".Content")!, 20))
    expect(document.querySelector(".Header")!.hasAttribute("data-scrolled")).toBe(true)
    expect(document.querySelector(".Header")!.hasAttribute("data-divider")).toBe(false)
    cleanup()

    mountVue(() => vueTree({}, { divider: false }))
    await flushVue()
    scrollTo(document.querySelector(".Content")!, 20)
    await flushVue()
    expect(document.querySelector(".Header")!.hasAttribute("data-scrolled")).toBe(true)
    expect(document.querySelector(".Header")!.hasAttribute("data-divider")).toBe(false)
  })

  test("a caller's scroll listener still runs", async () => {
    const onScroll = vi.fn()
    render(reactTree({}, {}, { onScroll }))
    await act(async () => scrollTo(document.querySelector(".Content")!, 20))
    expect(onScroll).toHaveBeenCalledTimes(1)
    expect(document.querySelector(".Header")!.hasAttribute("data-scrolled")).toBe(true)
    cleanup()

    const vueScroll = vi.fn()
    mountVue(() => vueTree({}, {}, { onScroll: vueScroll }))
    await flushVue()
    scrollTo(document.querySelector(".Content")!, 20)
    await flushVue()
    expect(vueScroll).toHaveBeenCalledTimes(1)
    expect(document.querySelector(".Header")!.hasAttribute("data-scrolled")).toBe(true)
  })
})

describe("Page parts", () => {
  test("a header outside Page says so", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(createElement(part("Header"), null, "x"))).toThrow("Page.Header must be used within Page")
    quiet.mockRestore()
  })
})



describe.each(["React", "Vue"])("%s Page footer measurement", (framework) => {
  test("reserves the current footer height when its actions grow", async () => {
    let notify: (() => void) | undefined
    const observe = vi.fn<(target: Element, options?: ResizeObserverOptions) => void>()
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { notify = callback }
      observe = observe
      disconnect() {}
    })
    let height = 90
    const measure = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function(this: HTMLElement) {
      return this.classList.contains("Footer") ? height : 0
    })
    try {
      if (framework === "React") render(<RPage><RPage.Content>Form</RPage.Content><RPage.Footer background="hard">Save</RPage.Footer></RPage>)
      else mountVue(() => h(Page, null, () => [h(PageContent, null, () => "Form"), h(PageFooter, { background: "hard" }, () => "Save")]))
      await flushVue()
      expect(document.querySelector<HTMLElement>(".Page")?.style.getPropertyValue("--page-footer-height")).toBe("90px")
      expect(document.querySelector(".Footer")?.getAttribute("data-background")).toBe("hard")
      // Padding and safe-area changes alter the border box without changing the content box. (The content
      // is observed too, for the scroll edges of the bars.)
      const footer = document.querySelector(".Footer")
      expect(observe.mock.calls.filter(([target]) => target === footer)).toEqual([[footer, { box: "border-box" }]])
      height = 150
      await act(async () => { notify?.(); await flushVue() })
      expect(document.querySelector<HTMLElement>(".Page")?.style.getPropertyValue("--page-footer-height")).toBe("150px")
    } finally {
      cleanup()
      measure.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})


describe("Page bar measurement", () => {
  test.each(["React", "Vue"])("%s: reserves the wider side and follows resized or replaced actions", async (framework) => {
    // jsdom has no layout. Supply intrinsic slot widths and notify the observer
    // when a translated label or additional action changes a slot's width.
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return Number(this.dataset.measuredWidth ?? 0)
    })
    const observers: SideResizeObserver[] = []
    class SideResizeObserver implements ResizeObserver {
      readonly targets = new Map<Element, ResizeObserverOptions | undefined>()
      constructor(private readonly callback: ResizeObserverCallback) { observers.push(this) }
      observe(target: Element, options?: ResizeObserverOptions) { this.targets.set(target, options) }
      unobserve(target: Element) { this.targets.delete(target) }
      disconnect() { this.targets.clear() }
      notify() { this.callback([], this) }
    }
    vi.stubGlobal("ResizeObserver", SideResizeObserver)
    const state = reactive({ leading: true, leadingWidth: 44, actions: true, actionsWidth: 104, version: 0 })
    const reactBar = () => <RPage.Bar>
      {state.leading && <RPage.Leading data-measured-width={state.leadingWidth}>Back</RPage.Leading>}
      <RPage.Title>Settings</RPage.Title>
      {state.actions && <RPage.Actions key={state.version} data-measured-width={state.actionsWidth}>More and Done</RPage.Actions>}
    </RPage.Bar>
    const vueBar = () => h(PageBar, null, () => [
      state.leading && h(PageLeading, { "data-measured-width": state.leadingWidth }, () => "Back"),
      h(PageTitle, null, () => "Settings"),
      state.actions && h(PageActions, { key: state.version, "data-measured-width": state.actionsWidth }, () => "More and Done"),
    ])
    let rerender = () => {}
    let unmount = () => {}
    try {
      if (framework === "React") {
        const view = render(reactBar())
        rerender = () => view.rerender(reactBar())
        unmount = view.unmount
      } else unmount = mountVue(vueBar).unmount
      const update = async (patch: Partial<typeof state>) => {
        await act(async () => { Object.assign(state, patch); rerender(); await flushVue() })
      }
      await update({})
      const bar = document.querySelector<HTMLElement>(".Bar")
      const reservedWidth = () => bar?.style.getPropertyValue("--page-bar-side-width")
      expect(reservedWidth()).toBe("104px")
      const expectBorderBoxes = () => {
        const options = observers.flatMap((observer) => Array.from(observer.targets.values()))
        expect(options.length).toBeGreaterThan(0)
        expect(options.every((option) => option?.box === "border-box")).toBe(true)
      }
      expectBorderBoxes()
      const previousActions = bar?.querySelector(".Actions")
      const resize = async (target: Element | null | undefined) => {
        const watching = observers.filter((observer) => target && observer.targets.has(target))
        expect(watching.length).toBeGreaterThan(0)
        await act(async () => { watching.forEach((observer) => observer.notify()); await flushVue() })
      }

      await update({ leadingWidth: 136 })
      await resize(bar?.querySelector(".Leading"))
      expect(reservedWidth()).toBe("136px")
      await update({ actionsWidth: 180 })
      await resize(previousActions)
      expect(reservedWidth()).toBe("180px")

      await update({ version: 1, actionsWidth: 60 })
      expect(bar?.querySelector(".Actions")).not.toBe(previousActions)
      expectBorderBoxes()
      expect(reservedWidth()).toBe("136px")
      expect(observers.every((observer) => !previousActions || !observer.targets.has(previousActions))).toBe(true)
      await update({ leading: false })
      expect(reservedWidth()).toBe("60px")
      await update({ actions: false })
      expect(reservedWidth()).toBe("44px")
      expect(observers.every((observer) => observer.targets.size === 0)).toBe(true)
    } finally {
      unmount()
      vi.unstubAllGlobals()
    }
  })
})

test("Page.Footer keeps a caller's callback ref attached across child and scroll updates", async () => {
  const release = vi.fn()
  const attached = vi.fn<(node: HTMLDivElement | null) => () => void>(() => release)
  const screen = (label: string) => <RPage>
    <RPage.Header><RPage.Bar><RPage.Title>Settings</RPage.Title></RPage.Bar></RPage.Header>
    <RPage.Content>Form</RPage.Content>
    <RPage.Footer ref={attached}><button>{label}</button></RPage.Footer>
  </RPage>
  const view = render(screen("Save"))
  const footer = document.querySelector(".Footer")
  expect(attached).toHaveBeenCalledExactlyOnceWith(footer)
  view.rerender(screen("Save changes"))
  expect(footer?.textContent).toBe("Save changes")
  await act(async () => scrollTo(document.querySelector(".Content")!, 20))
  expect(document.querySelector(".Header")?.hasAttribute("data-scrolled")).toBe(true)
  expect(document.querySelector(".Footer")).toBe(footer)
  expect(attached).toHaveBeenCalledTimes(1)
  expect(release).not.toHaveBeenCalled()
  view.unmount()
  expect(release).toHaveBeenCalledTimes(1)
})

describe("Page header measurement", () => {
  test.each(["React", "Vue"])("%s: reserves wrapped metadata and releases a removed header", async (framework) => {
    const measured = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return Number(this.dataset.measuredHeight ?? 0)
    })
    const observers: HeaderObserver[] = []
    class HeaderObserver implements ResizeObserver {
      readonly targets = new Map<Element, ResizeObserverOptions | undefined>()
      constructor(private readonly callback: ResizeObserverCallback) { observers.push(this) }
      observe(target: Element, options?: ResizeObserverOptions) { this.targets.set(target, options) }
      unobserve(target: Element) { this.targets.delete(target) }
      disconnect() { this.targets.clear() }
      notify() { this.callback([], this) }
    }
    vi.stubGlobal("ResizeObserver", HeaderObserver)
    const state = reactive({ visible: true, height: 54, metadata: "Saved just now" })
    const reactPage = () => <RPage>
      {state.visible && <RPage.Header data-measured-height={state.height}>
        <RPage.Bar><RPage.Heading><RPage.Title>Menu</RPage.Title>
          <RPage.Subtitle><span>Draft</span><span>{state.metadata}</span></RPage.Subtitle>
        </RPage.Heading></RPage.Bar>
      </RPage.Header>}
      <RPage.Content>First content row</RPage.Content>
    </RPage>
    const vuePage = () => h(Page, null, () => [
      state.visible && h(PageHeader, { "data-measured-height": state.height }, () => h(PageBar, null, () =>
        h(PageHeading, null, () => [h(PageTitle, null, () => "Menu"),
          h(PageSubtitle, null, () => [h("span", "Draft"), h("span", state.metadata)]),
        ]))),
      h(PageContent, null, () => "First content row"),
    ])
    let rerender = () => {}
    let unmount = () => {}
    try {
      if (framework === "React") {
        const view = render(reactPage())
        rerender = () => view.rerender(reactPage())
        unmount = view.unmount
      } else unmount = mountVue(vuePage).unmount
      const update = async (patch: Partial<typeof state>) => {
        await act(async () => { Object.assign(state, patch); rerender(); await flushVue() })
      }
      await update({})
      const page = document.querySelector<HTMLElement>(".Page")!
      const header = document.querySelector(".Header")!
      const reservation = () => page.style.getPropertyValue("--page-header-height")
      expect(reservation()).toBe("54px")
      expect(header.querySelector(".Subtitle")?.textContent).toBe("DraftSaved just now")
      const observer = observers.find((item) => item.targets.has(header))!
      expect(observer.targets.get(header)).toEqual({ box: "border-box" })

      await update({ height: 78, metadata: "A translated status that wraps onto another line" })
      await act(async () => { observer.notify(); await flushVue() })
      expect(reservation()).toBe("78px")
      await update({ visible: false })
      expect(reservation()).toBe("")
      expect(observer.targets.size).toBe(0)
      await update({ visible: true, height: 64 })
      expect(document.querySelector(".Header")).not.toBe(header)
      expect(reservation()).toBe("64px")
    } finally {
      unmount()
      measured.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})

test("Page.Header preserves a caller's callback ref across metadata and scroll updates", async () => {
  const release = vi.fn()
  const attached = vi.fn<(node: HTMLDivElement | null) => () => void>(() => release)
  const screen = (status: string) => <RPage>
    <RPage.Header ref={attached}><RPage.Bar><RPage.Heading>
      <RPage.Title>Menu</RPage.Title><RPage.Subtitle>{status}</RPage.Subtitle>
    </RPage.Heading></RPage.Bar></RPage.Header>
    <RPage.Content>Body</RPage.Content>
  </RPage>
  const view = render(screen("Draft"))
  const header = document.querySelector(".Header")
  expect(attached).toHaveBeenCalledExactlyOnceWith(header)
  view.rerender(screen("Published"))
  await act(async () => scrollTo(document.querySelector(".Content")!, 20))
  expect(document.querySelector(".Header")).toBe(header)
  expect(header?.querySelector(".Subtitle")?.textContent).toBe("Published")
  expect(attached).toHaveBeenCalledTimes(1)
  expect(release).not.toHaveBeenCalled()
  view.unmount()
  expect(release).toHaveBeenCalledTimes(1)
})
