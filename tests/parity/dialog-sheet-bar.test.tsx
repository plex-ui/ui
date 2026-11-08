import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Button } from "../../packages/vue/src/components/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogHeaderAction,
  DialogTitle,
} from "../../packages/vue/src/components/Dialog"
import { flushVue, mountVue } from "./harness"

// Plan 170: on a phone the header of a Sheet is its Toolbar (Close leading, the heading, the header actions
// trailing), the same DOM in React and Vue. A dialog opened from a header action is not inside that bar: its
// header stays a dialog header.
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

const mount = async (framework: Framework) => {
  if (framework === "React") await act(async () => { render(<ReactSheet />) })
  else mountVue(vueSheet)
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
  test("is the Sheet's Toolbar: Close, the heading with the description as its subtitle, then the actions", async () => {
    await mount(framework)
    const bar = dialogNamed("Outer").querySelector<HTMLElement>("[data-dialog-bar]")!
    expect(bar).toBeTruthy()
    expect(bar.getAttribute("data-placement")).toBe("top")
    const parts = [...bar.children].map((part) => part.textContent)
    expect(parts[0]).toBe("")
    expect(bar.children[0].querySelector("button")?.getAttribute("aria-label")).toBe("Close dialog")
    expect(parts[1]).toBe("OuterOuter note")
    expect(bar.children[1].querySelector("p")?.className).toContain("Subtitle")
    expect(bar.children[2].className).toContain("Trailing")
    expect(bar.children[2].querySelector("button")?.textContent).toBe("Done")
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
