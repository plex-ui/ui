// R11: a dialog with unsaved changes asks before it closes (`confirmClose`). Outside a phone Sheet the question is an
// alert: Close, Dialog.Close and Escape ask, Keep Editing keeps the dialog, Discard Changes closes it after the
// question has left. The phone popover at the bar's Close is checked in the browser (jsdom has no phone layout).
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, describe, expect, test } from "vitest"
import { h, reactive } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Button as VueButton } from "../../packages/vue/src/components/Button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../packages/vue/src/components/Dialog"
import { flushVue, mountVue } from "./harness"

const message = "Are you sure you want to discard this new note?"
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Mount = (dirty: boolean, onOpenChange: (open: boolean) => void) => Promise<void>

const mountReact: Mount = async (dirty, onOpenChange) => {
  await act(async () => {
    render(
      <ReactDialog open onOpenChange={onOpenChange}>
        <ReactDialog.Content confirmClose={dirty && { message }}>
          <ReactDialog.Header><ReactDialog.Title>New Note</ReactDialog.Title></ReactDialog.Header>
          <ReactDialog.Footer>
            <ReactDialog.Close><ReactButton color="primary" variant="soft">Cancel</ReactButton></ReactDialog.Close>
          </ReactDialog.Footer>
        </ReactDialog.Content>
      </ReactDialog>,
    )
  })
}

const mountVueDialog: Mount = async (dirty, onOpenChange) => {
  const state = reactive({ open: true })
  mountVue(() =>
    h(Dialog, { "open": state.open, "onUpdate:open": (open: boolean) => { state.open = open; onOpenChange(open) } }, () =>
      h(DialogContent, { confirmClose: dirty && { message } }, () => [
        h(DialogHeader, null, () => h(DialogTitle, null, () => "New Note")),
        h(DialogFooter, null, () => h(DialogClose, null, () => h(VueButton, { color: "primary", variant: "soft" }, () => "Cancel"))),
      ])))
  await flushVue()
}

const settle = async () => {
  await act(async () => { await wait(0) })
  await flushVue()
}
const click = async (element: Element | null | undefined) => {
  expect(element).toBeTruthy()
  await act(async () => { fireEvent.click(element!) })
  await settle()
}
const buttonNamed = (name: string) => [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === name)
const asking = () => document.body.textContent?.includes(message) ?? false

afterEach(() => cleanup())

describe.each([
  ["React", mountReact],
  ["Vue", mountVueDialog],
] as const)("%s Dialog confirmClose", (_name, mount) => {
  test("the Close button asks; Keep Editing keeps the dialog open", async () => {
    const changes: boolean[] = []
    await mount(true, (open) => changes.push(open))
    await click(document.querySelector('button[aria-label="Close dialog"]'))
    expect(asking()).toBe(true)
    expect(changes).toEqual([])
    await click(buttonNamed("Keep Editing"))
    await act(async () => { await wait(200) })
    await flushVue()
    expect(changes).toEqual([])
    expect(document.querySelector('[data-plex-dialog]:not([data-dialog-confirm-close])')).not.toBeNull()
  })

  test("Dialog.Close asks too, and Discard Changes closes the dialog after the question", async () => {
    const changes: boolean[] = []
    await mount(true, (open) => changes.push(open))
    await click(buttonNamed("Cancel"))
    expect(asking()).toBe(true)
    await click(buttonNamed("Discard Changes"))
    expect(changes).toEqual([])
    await act(async () => { await wait(200) })
    await flushVue()
    expect(changes).toEqual([false])
  })

  test("Escape asks", async () => {
    const changes: boolean[] = []
    await mount(true, (open) => changes.push(open))
    await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape", code: "Escape" }) })
    await settle()
    expect(asking()).toBe(true)
    expect(changes).toEqual([])
  })

  test("Dialog.Close is a button that does not submit, and a prevented click keeps the dialog without asking", async () => {
    const changes: boolean[] = []
    await mount(true, (open) => changes.push(open))
    const cancel = buttonNamed("Cancel")!
    expect(cancel.getAttribute("type")).toBe("button")
    // Prevented before the child's own handlers, as a child that prevents its click
    document.addEventListener("click", (event) => event.preventDefault(), { capture: true, once: true })
    await click(cancel)
    expect(asking()).toBe(false)
    expect(changes).toEqual([])
  })

  test("the alert's title is the question", async () => {
    await mount(true, () => {})
    await click(document.querySelector('button[aria-label="Close dialog"]'))
    const alert = document.querySelector<HTMLElement>("[data-dialog-confirm-close]")
    const labelledBy = alert?.getAttribute("aria-labelledby")
    expect(labelledBy && document.getElementById(labelledBy)?.textContent).toBe(message)
  })

  test("without changes Close closes at once", async () => {
    const changes: boolean[] = []
    await mount(false, (open) => changes.push(open))
    await click(document.querySelector('button[aria-label="Close dialog"]'))
    expect(asking()).toBe(false)
    expect(changes).toEqual([false])
  })
})

describe("Popover named by aria-labelledby", () => {
  test("React and Vue put the owner's name on the popover", async () => {
    const { Popover: ReactPopover } = await import("../../packages/ui/src/components/Popover")
    const { Popover: VuePopover, PopoverContent: VuePopoverContent, PopoverTrigger: VuePopoverTrigger } = await import("../../packages/vue/src/components/Popover")
    await act(async () => {
      render(
        <ReactPopover open>
          <ReactPopover.Trigger><button>Open</button></ReactPopover.Trigger>
          <ReactPopover.Content aria-labelledby="question"><p id="question">Question</p></ReactPopover.Content>
        </ReactPopover>,
      )
    })
    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-labelledby")).toBe("question")
    cleanup()
    mountVue(() => h(VuePopover, { open: true }, () => [
      h(VuePopoverTrigger, null, () => h("button", null, "Open")),
      h(VuePopoverContent, { ariaLabelledby: "question" }, () => h("p", { id: "question" }, "Question")),
    ]))
    await flushVue()
    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-labelledby")).toBe("question")
  })
})

describe("Vue: a touch outside a dialog with changes asks", () => {
  test("a touch press on the overlay shows the question and keeps the dialog", async () => {
    const changes: boolean[] = []
    await mountVueDialog(true, (open) => changes.push(open))
    const overlay = document.querySelector('[class~="Overlay"]') ?? document.body
    await act(async () => {
      fireEvent.pointerDown(overlay, { pointerType: "touch", button: 0 })
      fireEvent.pointerUp(overlay, { pointerType: "touch", button: 0 })
      fireEvent.click(overlay)
    })
    await settle()
    await act(async () => { await wait(50) })
    await flushVue()
    expect(changes).toEqual([])
  })
})

describe("the question at a phone Sheet's Close (iOS 27.2 simulator)", () => {
  const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Dialog/Dialog.module.css`, "utf8")
  const react = readFileSync(`${process.cwd()}/packages/ui/src/components/Dialog/Dialog.tsx`, "utf8")
  const vue = readFileSync(`${process.cwd()}/packages/vue/src/components/Dialog/Dialog.ts`, "utf8")

  test("a 240 glass popover over the Close: 21/29 to the question in 17/22, 17 to a 48px pill 16 from the edges", () => {
    expect(css).toMatch(/\.ConfirmClose \{[^}]*--button-size-md: 48px;[^}]*padding: 21px 16px 16px;/)
    expect(css).toMatch(/\.ConfirmCloseMessage \{[^}]*margin: 0 13px 17px;[^}]*font-size: 17px;[^}]*line-height: 22px;/)
    expect(react).toContain("sideOffset={-anchor.offsetHeight} alignOffset={-6} collisionPadding={10} width={240} minWidth={240}")
    for (const option of ['"sideOffset": -anchor.offsetHeight', '"alignOffset": -6', '"collisionPadding": 10', '"width": 240', '"minWidth": 240'])
      expect(vue).toContain(option)
  })
})
