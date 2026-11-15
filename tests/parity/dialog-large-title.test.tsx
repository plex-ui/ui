import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, onMounted, ref, type VNode } from "vue"
import { Dialog as RDialog } from "../../packages/ui/src/components/Dialog"
import { Toolbar as RToolbar } from "../../packages/ui/src/components/Toolbar"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "../../packages/vue/src/components/Dialog"
import { Toolbar, ToolbarRow, ToolbarTitle } from "../../packages/vue/src/components/Toolbar"
import { flushVue, mountVue } from "./harness"

// A large Toolbar title in a Sheet behaves as on a page: it starts Dialog.Body, scrolls with it, and once it has gone
// under the bar the bar shows it inline with its subtitle (console request 14.11: «при скролле он же должен сворачиваться!!!»).
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

const reactSheet = (body = true) => (
  <RDialog open>
    <RDialog.Content mobileVariant="sheet">
      <RToolbar titleStyle="large">
        <RToolbar.Title subtitle="3 open">Orders</RToolbar.Title>
      </RToolbar>
      <RDialog.Header><RDialog.Title>Orders</RDialog.Title></RDialog.Header>
      {body ? <RDialog.Body><p>Rows</p></RDialog.Body> : <p>Rows</p>}
    </RDialog.Content>
  </RDialog>
)

const vueSheet = (body = true) => () =>
  h(Dialog, { open: true }, () =>
    h(DialogContent, { mobileVariant: "sheet" }, () => [
      h(Toolbar, { titleStyle: "large" }, () => h(ToolbarTitle, { subtitle: "3 open" }, () => "Orders")),
      h(DialogHeader, null, () => h(DialogTitle, null, () => "Orders")),
      body ? h(DialogBody, null, () => h("p", null, "Rows")) : h("p", null, "Rows"),
    ]))

const mount = async (framework: "React" | "Vue", body = true) => {
  if (framework === "React") {
    let view: ReturnType<typeof render> | undefined
    await act(async () => { view = render(reactSheet(body)) })
    return () => view?.unmount()
  }
  const app = mountVue(vueSheet(body) as () => VNode)
  await flushVue()
  return () => app.unmount()
}

describe("Dialog large title", () => {
  test.each(["React", "Vue"] as const)("%s: the title starts the body, scrolls with it, and collapses into the bar", async (framework) => {
    let headingBottom = 120
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const bottom = this.hasAttribute("data-toolbar") ? 70 : this.classList.contains("Heading") ? headingBottom : 0
      return { x: 0, y: 0, top: 0, left: 0, right: 0, width: 0, height: bottom, bottom, toJSON: () => ({}) } as DOMRect
    })
    const unmount = await mount(framework)
    const bar = document.querySelector<HTMLElement>('[data-toolbar][data-host="dialog"][data-title-style="large"]')
    const body = document.querySelector<HTMLElement>(".Panel > .Body")
    if (!bar || !body) throw new Error("the bar or the body is missing")
    // The title stands at the top of the body, before its rows, and the bar keeps the inline copy with the subtitle
    expect(body.firstElementChild?.classList.contains("LargeTitle")).toBe(true)
    expect(body.querySelector(":scope > .LargeTitle > .Heading[data-in-content] h1")?.textContent).toBe("Orders")
    expect(bar.querySelector(":scope > .Heading")).toBeNull()
    expect(bar.querySelector(":scope > .CollapsedTitle")?.textContent).toBe("Orders3 open")
    expect(bar.hasAttribute("data-title-collapsed")).toBe(false)
    const scrollTo = async (top: number, bottom: number) => {
      headingBottom = bottom
      body.scrollTop = top
      if (framework === "React") await act(async () => { fireEvent.scroll(body) })
      else { body.dispatchEvent(new Event("scroll")); await flushVue() }
    }
    await scrollTo(30, 90)
    expect(bar.hasAttribute("data-title-collapsed")).toBe(false)
    await scrollTo(60, 70)
    expect(bar.hasAttribute("data-title-collapsed")).toBe(true)
    await scrollTo(0, 120)
    expect(bar.hasAttribute("data-title-collapsed")).toBe(false)
    unmount()
  })

  test.each(["React", "Vue"] as const)("%s: without a body the title stays in the bar", async (framework) => {
    const unmount = await mount(framework, false)
    const bar = document.querySelector<HTMLElement>('[data-toolbar][data-host="dialog"]')
    expect(bar?.querySelector(":scope > .Heading h1")?.textContent).toBe("Orders")
    expect(document.querySelector(".LargeTitle")).toBeNull()
    unmount()
  })

  test.each(["React", "Vue"] as const)("%s: a bar not placed by the panel reports its own height", async (framework) => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute("data-toolbar") ? 70 : 0
    })
    const reactTree = (
      <RDialog open>
        <RDialog.Content mobileVariant="sheet">
          <form>
            <RToolbar><RToolbar.Title>Edit</RToolbar.Title></RToolbar>
          </form>
          <RDialog.Title className="sr-only">Edit</RDialog.Title>
        </RDialog.Content>
      </RDialog>
    )
    const vueTree = () =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, { mobileVariant: "sheet" }, () => [
          h("form", null, h(Toolbar, null, () => h(ToolbarTitle, null, () => "Edit"))),
          h(DialogTitle, { class: "sr-only" }, () => "Edit"),
        ]))
    let unmount = () => {}
    if (framework === "React") await act(async () => { unmount = render(reactTree).unmount })
    else { unmount = mountVue(vueTree as () => VNode).unmount; await flushVue() }
    // No bar is the panel's child, so the height the nested toolbar reports is the header's
    const panel = document.querySelector<HTMLElement>(".Panel")
    expect(panel?.style.getPropertyValue("--dialog-header-height")).toBe("70px")
    unmount()
  })
})

describe("Dialog large title rows", () => {
  test.each(["React", "Vue"] as const)("%s: the bar's rows stand under the title in the body, in their order (Codex #67)", async (framework) => {
    const reactTree = (
      <RDialog open>
        <RDialog.Content mobileVariant="sheet">
          <RToolbar titleStyle="large">
            <RToolbar.Title>Orders</RToolbar.Title>
            <RToolbar.Row><input aria-label="Search" /></RToolbar.Row>
            <RToolbar.Row><span>Segments</span></RToolbar.Row>
          </RToolbar>
          <RDialog.Header><RDialog.Title>Orders</RDialog.Title></RDialog.Header>
          <RDialog.Body><p>Rows</p></RDialog.Body>
        </RDialog.Content>
      </RDialog>
    )
    const vueTree = () =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, { mobileVariant: "sheet" }, () => [
          h(Toolbar, { titleStyle: "large" }, () => [
            h(ToolbarTitle, null, () => "Orders"),
            h(ToolbarRow, null, () => h("input", { "aria-label": "Search" })),
            h(ToolbarRow, null, () => h("span", null, "Segments")),
          ]),
          h(DialogHeader, null, () => h(DialogTitle, null, () => "Orders")),
          h(DialogBody, null, () => h("p", null, "Rows")),
        ]))
    let unmount = () => {}
    if (framework === "React") await act(async () => { unmount = render(reactTree).unmount })
    else { unmount = mountVue(vueTree as () => VNode).unmount; await flushVue(); await flushVue() }
    const body = document.querySelector<HTMLElement>(".Panel > .Body")
    const parts = [...(body?.children ?? [])].map((child) => child.className.split(" ")[0])
    expect(parts.slice(0, 2)).toEqual(["LargeTitle", "LargeTitleRows"])
    const rows = [...(body?.querySelectorAll(":scope > .LargeTitleRows .Row[data-in-content]") ?? [])]
    expect(rows.map((row) => row.textContent || row.querySelector("input")?.getAttribute("aria-label"))).toEqual(["Search", "Segments"])
    expect(document.querySelector("[data-toolbar] .Row")).toBeNull()
    unmount()
  })
})

describe("Dialog large title requests (Codex #68)", () => {
  test("React: with a body the rows mount once, in their place", async () => {
    let mounts = 0
    const Counted = () => {
      useEffect(() => { mounts++ }, [])
      return <input aria-label="Search" />
    }
    await act(async () => {
      render(
        <RDialog open>
          <RDialog.Content mobileVariant="sheet">
            <RToolbar titleStyle="large">
              <RToolbar.Title>Orders</RToolbar.Title>
              <RToolbar.Row><Counted /></RToolbar.Row>
            </RToolbar>
            <RDialog.Title className="sr-only">Orders</RDialog.Title>
            <RDialog.Body><p>Rows</p></RDialog.Body>
          </RDialog.Content>
        </RDialog>,
      )
    })
    expect(document.querySelector(".LargeTitleRows input")).not.toBeNull()
    expect(mounts).toBe(1)
    const input = document.querySelector(".LargeTitleRows input")
    await act(async () => {})
    expect(document.querySelector(".LargeTitleRows input")).toBe(input)
  })

  test("Vue: with a body the rows mount once, in their place", async () => {
    let mounts = 0
    const Counted = defineComponent({ setup() { onMounted(() => { mounts++ }); return () => h("input", { "aria-label": "Search" }) } })
    const app = mountVue(() =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, { mobileVariant: "sheet" }, () => [
          h(Toolbar, { titleStyle: "large" }, () => [h(ToolbarTitle, null, () => "Orders"), h(ToolbarRow, null, () => h(Counted))]),
          h(DialogTitle, { class: "sr-only" }, () => "Orders"),
          h(DialogBody, null, () => h("p", null, "Rows")),
        ])))
    await flushVue()
    await flushVue()
    expect(document.querySelector(".LargeTitleRows input")).not.toBeNull()
    expect(mounts).toBe(1)
    app.unmount()
  })

  test.each(["React", "Vue"] as const)("%s: without a body the rows stay in the bar", async (framework) => {
    const reactTree = (
      <RDialog open>
        <RDialog.Content mobileVariant="sheet">
          <RToolbar titleStyle="large"><RToolbar.Title>Orders</RToolbar.Title><RToolbar.Row><span>Segments</span></RToolbar.Row></RToolbar>
          <RDialog.Title className="sr-only">Orders</RDialog.Title>
        </RDialog.Content>
      </RDialog>
    )
    const vueTree = () =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, { mobileVariant: "sheet" }, () => [
          h(Toolbar, { titleStyle: "large" }, () => [h(ToolbarTitle, null, () => "Orders"), h(ToolbarRow, null, () => h("span", null, "Segments"))]),
          h(DialogTitle, { class: "sr-only" }, () => "Orders"),
        ]))
    let unmount = () => {}
    if (framework === "React") await act(async () => { unmount = render(reactTree).unmount })
    else { unmount = mountVue(vueTree as () => VNode).unmount; await flushVue() }
    expect(document.querySelector("[data-toolbar] > .Row")?.textContent).toBe("Segments")
    unmount()
  })

  test("Vue: a title asks for one place, and gives it back when it goes", async () => {
    const shown = ref(true)
    const app = mountVue(() =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, { mobileVariant: "sheet" }, () => [
          shown.value ? h(Toolbar, { titleStyle: "large" }, () => h(ToolbarTitle, null, () => "Orders")) : null,
          h(DialogTitle, { class: "sr-only" }, () => "Orders"),
          h(DialogBody, null, () => h("p", null, "Rows")),
        ])))
    await flushVue()
    expect(document.querySelector(".Body > .LargeTitle")).not.toBeNull()
    shown.value = false
    await flushVue()
    expect(document.querySelector(".Body > .LargeTitle")).toBeNull()
    app.unmount()
  })
})

describe("Dialog large title CSS", () => {
  const toolbar = readFileSync("packages/styles/src/components/Toolbar/Toolbar.module.css", "utf8")
  const dialog = readFileSync("packages/styles/src/components/Dialog/Dialog.module.css", "utf8")

  test("the bar of a Sheet collapses a large title as a page's does", () => {
    expect(toolbar).toContain('.Toolbar:is([data-host="page"], [data-host="dialog"])[data-title-style="large"] {')
  })

  test("a title kept in the bar keeps its line box over the rows", () => {
    expect(toolbar).toMatch(/& > \.Heading:has\(~ \.Row\) \{\s*margin-bottom: 0;/)
  })

  test("the rows pin under the bar from the body's padding, as on a page", () => {
    expect(dialog).toMatch(/\.LargeTitleRows \{\s*position: sticky;\s*z-index: 6;\s*top: calc\(var\(--toolbar-row-gap\) - var\(--toolbar-padding-bottom\) - 16px\);/)
  })

  test("the body keeps the title's place 16 under the bar, as Page.Content does", () => {
    expect(dialog).toMatch(/\.Content\[data-mobile-variant="sheet"\] \.Panel > \.Body:has\(> \.LargeTitle > \*\) \{\s*padding-top: calc\(16px \+ var\(--dialog-header-height, 0px\)\);/)
    expect(dialog).toMatch(/\.LargeTitle \{\s*display: flow-root;/)
  })
})
