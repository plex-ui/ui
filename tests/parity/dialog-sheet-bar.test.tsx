import { readFileSync } from "node:fs"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Button } from "../../packages/vue/src/components/Button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogDescriptionSlot,
  DialogHeader,
  DialogHeaderAction,
  DialogTitle,
} from "../../packages/vue/src/components/Dialog"
import { flushVue, mountVue } from "./harness"

// Plan 170: on a phone the header of a Sheet is its Toolbar (Close leading, the heading, the header actions
// trailing), the same DOM in React and Vue. A dialog opened from a header action is not inside that bar: its
// header stays a dialog header. Plan 176 (owner 09.11): the bar holds the title alone; the description stands
// under it, at the top of the body when there is one, or first at a DescriptionSlot of the content's own (an app
// whose scroller sits in a form so that Enter submits).
type Framework = "React" | "Vue"

const ReactSheet = () => (
  <ReactDialog open>
    <ReactDialog.Content mobileVariant="sheet">
      <ReactDialog.Header>
        <ReactDialog.Title>Outer</ReactDialog.Title>
        <ReactDialog.Description>Outer note</ReactDialog.Description>
        <ReactDialog.HeaderAction>
          <ReactButton color="primary">Done</ReactButton>
          <ReactDialog open>
            <ReactDialog.Content>
              <ReactDialog.Header>
                <ReactDialog.Title>Inner</ReactDialog.Title>
                <ReactDialog.Description>Inner message</ReactDialog.Description>
                <ReactDialog.HeaderAction><ReactButton color="secondary">Inner action</ReactButton></ReactDialog.HeaderAction>
              </ReactDialog.Header>
            </ReactDialog.Content>
          </ReactDialog>
        </ReactDialog.HeaderAction>
      </ReactDialog.Header>
    </ReactDialog.Content>
  </ReactDialog>
)

const vueSheet = () => h(Dialog, { open: true }, () => h(DialogContent, { mobileVariant: "sheet" }, () => h(DialogHeader, null, () => [
  h(DialogTitle, null, () => "Outer"),
  h(DialogDescription, null, () => "Outer note"),
  h(DialogHeaderAction, null, () => [
    h(Button, { color: "primary" }, () => "Done"),
    h(Dialog, { open: true }, () => h(DialogContent, null, () => h(DialogHeader, null, () => [
      h(DialogTitle, null, () => "Inner"),
      h(DialogDescription, null, () => "Inner message"),
      h(DialogHeaderAction, null, () => h(Button, { color: "secondary" }, () => "Inner action")),
    ]))),
  ]),
])))

const ReactSheetWithBody = () => (
  <ReactDialog open>
    <ReactDialog.Content mobileVariant="sheet">
      <ReactDialog.Header className="own-header">
        <ReactDialog.Title>Terms</ReactDialog.Title>
        <ReactDialog.Description>Read them first.</ReactDialog.Description>
      </ReactDialog.Header>
      <ReactDialog.Body><p>Body text</p></ReactDialog.Body>
    </ReactDialog.Content>
  </ReactDialog>
)

const vueSheetWithBody = () => h(Dialog, { open: true }, () => h(DialogContent, { mobileVariant: "sheet" }, () => [
  h(DialogHeader, { class: "own-header" }, () => [
    h(DialogTitle, null, () => "Terms"),
    h(DialogDescription, null, () => "Read them first."),
  ]),
  h(DialogBody, null, () => h("p", null, "Body text")),
]))

const ReactSheetWithOwnScroller = ({ body }: { body: boolean }) => {
  const content = (
    <div className="own-scroller">
      <ReactDialog.DescriptionSlot />
      <p>Form fields</p>
    </div>
  )
  return (
    <ReactDialog open>
      <ReactDialog.Content mobileVariant="sheet">
        <ReactDialog.Header>
          <ReactDialog.Title>Edit</ReactDialog.Title>
          <ReactDialog.Description>Hidden · Out of stock</ReactDialog.Description>
        </ReactDialog.Header>
        {body ? <ReactDialog.Body>{content}</ReactDialog.Body> : <form>{content}</form>}
      </ReactDialog.Content>
    </ReactDialog>
  )
}

const vueSheetWithOwnScroller = (body: boolean) => () => {
  const content = () => h("div", { class: "own-scroller" }, [h(DialogDescriptionSlot), h("p", null, "Form fields")])
  return h(Dialog, { open: true }, () => h(DialogContent, { mobileVariant: "sheet" }, () => [
    h(DialogHeader, null, () => [
      h(DialogTitle, null, () => "Edit"),
      h(DialogDescription, null, () => "Hidden · Out of stock"),
    ]),
    body ? h(DialogBody, null, content) : h("form", null, [content()]),
  ]))
}

type Variant = "bar" | "body" | "own" | "own-in-body"
const mount = async (framework: Framework, variant: Variant | boolean = "bar") => {
  const kind: Variant = variant === true ? "body" : variant === false ? "bar" : variant
  if (framework === "React") {
    const element = kind === "body" ? <ReactSheetWithBody /> : kind === "bar" ? <ReactSheet /> : <ReactSheetWithOwnScroller body={kind === "own-in-body"} />
    await act(async () => { render(element) })
  } else mountVue(kind === "body" ? vueSheetWithBody : kind === "bar" ? vueSheet : vueSheetWithOwnScroller(kind === "own-in-body"))
  await flushVue()
  await flushVue()
}

const dialogNamed = (name: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find((dialog) => dialog.querySelector("h2")?.textContent === name)!

beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: !media.includes("min-width"), media,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  }))
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  // A description the reader sees has a size (jsdom lays nothing out)
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(16)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120)
})
afterEach(() => { vi.unstubAllGlobals() })

describe.each<Framework>(["React", "Vue"])("%s phone Sheet header", (framework) => {
  test("is the Sheet's Toolbar: Close, the title alone, then the actions; the description stands under it", async () => {
    await mount(framework)
    const dialog = dialogNamed("Outer")
    const bar = dialog.querySelector<HTMLElement>("[data-dialog-bar]")!
    expect(bar).toBeTruthy()
    expect(bar.getAttribute("data-placement")).toBe("top")
    const parts = [...bar.children].map((part) => part.textContent)
    expect(parts[0]).toBe("")
    expect(bar.children[0].querySelector("button")?.getAttribute("aria-label")).toBe("Close dialog")
    expect(parts[1]).toBe("Outer")
    expect(bar.children[2].className).toContain("Trailing")
    expect(bar.children[2].querySelector("button")?.textContent).toBe("Done")
    // Without a body the description follows the bar, as the dialog's description
    const under = bar.nextElementSibling as HTMLElement
    expect(under.className).toContain("SheetDescription")
    const description = under.querySelector("p")!
    expect(description.textContent).toBe("Outer note")
    expect(description.className).toContain("Description")
    expect(description.className).not.toContain("Subtitle")
    expect(dialog.getAttribute("aria-describedby")).toBe(description.id)
  })

  test("starts the body with the description when there is one", async () => {
    await mount(framework, true)
    const dialog = dialogNamed("Terms")
    const bar = dialog.querySelector<HTMLElement>("[data-dialog-bar]")!
    expect(bar.textContent).toBe("Terms")
    expect(bar.classList.contains("own-header")).toBe(true)
    const body = dialog.querySelector<HTMLElement>('[class*="Body"]')!
    const slot = body.firstElementChild as HTMLElement
    expect(slot.className).toContain("SheetDescriptionSlot")
    const description = slot.querySelector("p")!
    expect(description.textContent).toBe("Read them first.")
    expect(description.className).not.toContain("Subtitle")
    expect(body.lastElementChild?.textContent).toBe("Body text")
    expect(dialog.querySelectorAll("p").length).toBe(2)
    expect(dialog.getAttribute("aria-describedby")).toBe(description.id)
  })

  test("starts content of its own with the description at a DescriptionSlot, as in a form without a body", async () => {
    await mount(framework, "own")
    const dialog = dialogNamed("Edit")
    const scroller = dialog.querySelector<HTMLElement>(".own-scroller")!
    const slot = scroller.firstElementChild as HTMLElement
    expect(slot.className).toContain("SheetDescriptionSlot")
    const description = slot.querySelector("p")!
    expect(description.textContent).toBe("Hidden · Out of stock")
    // Nothing of it stays in the flow under the bar
    const bar = dialog.querySelector<HTMLElement>("[data-dialog-bar]")!
    expect(bar.nextElementSibling?.className ?? "").not.toContain("SheetDescription")
    expect(dialog.querySelectorAll("p").length).toBe(2)
    expect(dialog.getAttribute("aria-describedby")).toBe(description.id)
  })

  test("puts the description at a DescriptionSlot before the top of the body", async () => {
    await mount(framework, "own-in-body")
    const dialog = dialogNamed("Edit")
    const body = dialog.querySelector<HTMLElement>('[class*="Body"]')!
    expect(body.firstElementChild?.className).toContain("SheetDescriptionSlot")
    expect(body.firstElementChild?.childElementCount).toBe(0)
    const own = dialog.querySelector<HTMLElement>(".own-scroller")!.firstElementChild as HTMLElement
    expect(own.querySelector("p")?.textContent).toBe("Hidden · Out of stock")
  })

  test("leaves a dialog opened from a header action out of the bar", async () => {
    await mount(framework)
    const inner = dialogNamed("Inner")
    expect(inner).toBeTruthy()
    expect(inner.querySelector("[data-dialog-bar]")).toBeNull()
    const description = [...inner.querySelectorAll("p")].find((p) => p.textContent === "Inner message")!
    expect(description.className).toContain("Description")
    expect(description.className).not.toContain("Subtitle")
    const action = [...inner.querySelectorAll("button")].find((button) => button.textContent === "Inner action")!
    expect(action.parentElement?.className).toContain("HeaderAction")
  })
})

// iOS 27.2 draws a grabber only on a sheet that changes height (prefersGrabberVisible; ref-app sheet-large and
// sheet-large-grabber, block 14): a PlexUI Sheet keeps one height, so its bar draws none and keeps the 16 above it
// that native keeps (the controls' centre 38 below the top edge).
describe("a phone Sheet has no grabber, as an iOS 27.2 sheet of one height", () => {
  const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")

  test("the Sheet's top bar draws nothing over itself and sits 16px under the top edge", () => {
    const css = read("components/Toolbar/Toolbar.module.css")
    const bar = css.slice(css.indexOf('.Toolbar[data-host="dialog"][data-placement="top"] {'), css.indexOf('.Toolbar[data-host="dialog"][data-placement="bottom"]'))
    expect(bar).toContain("--toolbar-padding-top: var(--toolbar-sheet-padding-top);")
    expect(bar).not.toContain("::after")
    expect(read("styles/variables-components.css")).toContain("--toolbar-sheet-padding-top: 16px;")
    expect(read("styles/mobile-materials.css")).not.toContain("--mobile-grabber-color")
  })
})
