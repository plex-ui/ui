import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, type ComponentType, type ReactNode } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { h, type VNode } from "vue"
import { Page as RPage } from "../../packages/ui/src/components/Page"
import {
  Page,
  PageActions,
  PageBar,
  PageContent,
  PageFooter,
  PageHeader,
  PageHeading,
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
    ["wide", { width: "wide" }, {}, {}],
    ["column", { width: "column" }, {}, {}],
    ["fill", {}, {}, { fill: true }],
    ["class and attributes", { className: "app", id: "orders" }, { className: "top" }, { className: "body", id: "scroll" }],
    ["own width", { width: "column", style: { "--page-width": "860px" } }, {}, {}],
  ])("%s", async (_name, root, header, content) => {
    const { react, vue } = await renderPair(reactTree(root, header, content), () => vueTree(root, header, content))
    expect(vue).toBe(react)
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

  test("a header with divider off stays plain", async () => {
    render(reactTree({}, { divider: false }))
    await act(async () => scrollTo(document.querySelector(".Content")!, 20))
    expect(document.querySelector(".Header")!.hasAttribute("data-scrolled")).toBe(false)
    cleanup()

    mountVue(() => vueTree({}, { divider: false }))
    await flushVue()
    scrollTo(document.querySelector(".Content")!, 20)
    await flushVue()
    expect(document.querySelector(".Header")!.hasAttribute("data-scrolled")).toBe(false)
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

