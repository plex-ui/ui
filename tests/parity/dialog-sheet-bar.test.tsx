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
  DialogHeader,
  DialogHeaderAction,
  DialogTitle,
} from "../../packages/vue/src/components/Dialog"
import { flushVue, mountVue } from "./harness"

// Plan 170: on a phone the header of a Sheet is its Toolbar (Close leading, the heading, the header actions
// trailing), the same DOM in React and Vue. A dialog opened from a header action is not inside that bar: its
// header stays a dialog header. Plan 176 (owner 09.11): the bar holds the title alone; the description stands
// under it, at the top of the body when there is one.
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

const mount = async (framework: Framework, body = false) => {
  if (framework === "React") await act(async () => { render(body ? <ReactSheetWithBody /> : <ReactSheet />) })
  else mountVue(body ? vueSheetWithBody : vueSheet)
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
