// Plan 176 item 3: the toast region is a layer of its own above a modal Dialog. The Dialog's aria-hidden on the
// rest of the page leaves it readable, its focus trap does not pull focus back out of a toast, and a press on a
// toast's close or action is not a press outside that closes the Dialog. Toast CSS: a full-width banner on a phone,
// a visible close face with a 24+ target, and presses that pass the body's pointer-events: none.
import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, test, vi } from "vitest"
import { h, ref } from "vue"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import * as RToast from "../../packages/ui/src/components/Toast"
import { Dialog, DialogContent, DialogTitle } from "../../packages/vue/src/components/Dialog"
import * as VToast from "../../packages/vue/src/components/Toast"
import { useEscCloseStack } from "../../packages/ui/src/hooks/useEscCloseStack"
import { useEscCloseStack as useVueEscCloseStack } from "../../packages/vue/src/composables/useEscCloseStack"
import { flushVue, mountVue } from "./harness"

const nextTask = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
const settle = async () => {
  await flushVue()
  await nextTask()
  await nextTask()
  await flushVue()
}
const dialogOpen = () => !!document.querySelector('[role="dialog"]')
// A Dialog ignores a press in its first 300ms, the second click of the double click that opened it
const pastDoubleClick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 320)))

type Mount = () => { open: () => void; toaster: () => void }

const reactMount = (late = false): Mount => () => {
  let show = () => {}
  let mountToaster = () => {}
  const Example = () => {
    const [open, setOpen] = useState(false)
    const [toaster, setToaster] = useState(!late)
    show = () => setOpen(true)
    mountToaster = () => setToaster(true)
    return (
      <>
        <main data-page="">Page</main>
        {toaster && <RToast.Toaster />}
        <ReactDialog open={open} onOpenChange={setOpen}>
          <ReactDialog.Content><ReactDialog.Title>Edit draft</ReactDialog.Title><input aria-label="Name" /></ReactDialog.Content>
        </ReactDialog>
      </>
    )
  }
  render(<Example />)
  return { open: () => show(), toaster: () => mountToaster() }
}

const vueMount = (late = false): Mount => () => {
  const open = ref(false)
  const toaster = ref(!late)
  mountVue(() => h("div", null, [
    h("main", { "data-page": "" }, "Page"),
    toaster.value ? h(VToast.Toaster) : null,
    h(Dialog, { "open": open.value, "onUpdate:open": (next: boolean) => { open.value = next } }, {
      default: () => h(DialogContent, null, { default: () => [h(DialogTitle, null, { default: () => "Edit draft" }), h("input", { "aria-label": "Name" })] }),
    }),
  ]))
  return { open: () => { open.value = true }, toaster: () => { toaster.value = true } }
}

type Run = { hidden: boolean | null; pageHidden: boolean | null; focus: string | null; open: boolean; removed: string | null; undo: number }

/** Mounts a Toaster, then opens a modal Dialog, shows a toast and works its controls. */
const scenario = async (mount: () => { open: () => void }, toast: typeof RToast.toast): Promise<Run> => {
  const onUndo = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
  const { open } = mount()
  await settle()
  await act(async () => open())
  await settle()
  await act(async () => {
    toast("Draft saved", { action: { label: "Undo", onClick: onUndo }, closeButton: true, duration: Infinity })
  })
  await settle()
  const section = document.querySelector<HTMLElement>("section[aria-label^='Notifications']")!
  const page = document.querySelector("[data-page]")
  const action = section.querySelector<HTMLButtonElement>("button[data-action]")!
  const close = section.querySelector<HTMLButtonElement>("button[data-close-button]")!
  // Focus moves into the toast and stays there
  await act(async () => action.focus())
  await settle()
  const focus = document.activeElement?.textContent ?? null
  await pastDoubleClick()
  // A press on the action, then on the close button, by mouse and by touch
  for (const [button, pointerType] of [[action, "mouse"], [close, "touch"]] as const) {
    await act(async () => {
      fireEvent.pointerDown(button, { pointerType, button: 0 })
      fireEvent.pointerUp(button, { pointerType, button: 0 })
      fireEvent.click(button)
    })
    await settle()
  }
  return {
    hidden: section.closest('[aria-hidden="true"]') !== null,
    pageHidden: page ? page.closest('[aria-hidden="true"]') !== null : null,
    focus,
    open: dialogOpen(),
    removed: section.querySelector("[data-sonner-toast]")?.getAttribute("data-removed") ?? null,
    undo: onUndo.mock.calls.length,
  }
}

describe("Toast region above a modal Dialog", () => {
  test("stays readable, keeps its focus and takes presses without closing the Dialog, the same in React and Vue", async () => {
    const react = await scenario(reactMount(), RToast.toast)
    RToast.toast.dismiss()
    await settle()
    cleanup()

    const vue = await scenario(vueMount(), VToast.toast as unknown as typeof RToast.toast)
    VToast.toast.dismiss()
    await settle()

    expect(vue).toEqual(react)
    expect(react).toEqual({ hidden: false, pageHidden: true, focus: "Undo", open: true, removed: "true", undo: 1 })
  })
})

describe("Toast region: Escape, a late Toaster, no modal", () => {
  type Case = { open: boolean; focusBack: boolean }
  const escape = async (mount: Mount, toast: typeof RToast.toast): Promise<Case> => {
    const { open } = mount()
    await settle()
    await act(async () => open())
    await settle()
    const name = document.querySelector<HTMLInputElement>('input[aria-label="Name"]')!
    await act(async () => name.focus())
    await act(async () => { toast("Draft saved", { action: { label: "Undo", onClick: () => {} }, duration: Infinity }) })
    await settle()
    const action = document.querySelector<HTMLButtonElement>("button[data-action]")!
    await act(async () => action.focus())
    await act(async () => { fireEvent.keyDown(action, { key: "Escape", code: "Escape" }) })
    await settle()
    return { open: dialogOpen(), focusBack: document.activeElement === name }
  }

  test("Escape in a toast returns focus to the dialog and leaves it open, the same in React and Vue", async () => {
    const react = await escape(reactMount(), RToast.toast)
    RToast.toast.dismiss()
    await settle()
    cleanup()
    const vue = await escape(vueMount(), VToast.toast as unknown as typeof RToast.toast)
    VToast.toast.dismiss()
    await settle()
    expect(vue).toEqual(react)
    expect(react).toEqual({ open: true, focusBack: true })
  })

  const late = async (mount: Mount, toast: typeof RToast.toast) => {
    const { open, toaster } = mount()
    await settle()
    await act(async () => open())
    await settle()
    await act(async () => toaster())
    await settle()
    await act(async () => { toast("Draft saved", { closeButton: true, duration: Infinity }) })
    await settle()
    await pastDoubleClick()
    const close = document.querySelector<HTMLButtonElement>("button[data-close-button]")!
    await act(async () => {
      fireEvent.pointerDown(close, { pointerType: "mouse", button: 0 })
      fireEvent.pointerUp(close, { pointerType: "mouse", button: 0 })
      fireEvent.click(close)
    })
    await settle()
    return { open: dialogOpen(), removed: document.querySelector("[data-sonner-toast]")?.getAttribute("data-removed") ?? null }
  }

  test("a Toaster mounted after the dialog opened: a press on its toast still does not close the dialog", async () => {
    const react = await late(reactMount(true), RToast.toast)
    RToast.toast.dismiss()
    await settle()
    cleanup()
    const vue = await late(vueMount(true), VToast.toast as unknown as typeof RToast.toast)
    VToast.toast.dismiss()
    await settle()
    expect(vue).toEqual(react)
    expect(react).toEqual({ open: true, removed: "true" })
  })

  test("without a modal, a document listener still hears a press in a toast", async () => {
    const heard: string[] = []
    const listen = (event: Event) => heard.push(event.type)
    render(<RToast.Toaster />)
    await settle()
    document.addEventListener("pointerdown", listen)
    await act(async () => { RToast.toast("Saved", { duration: Infinity }) })
    await settle()
    fireEvent.pointerDown(document.querySelector("[data-sonner-toast]")!, { pointerType: "mouse", button: 0 })
    document.removeEventListener("pointerdown", listen)
    RToast.toast.dismiss()
    await settle()
    expect(heard).toEqual(["pointerdown"])
  })

  test("a custom toast that changes its own words is read again, the same in React and Vue", async () => {
    const read = () => [...document.querySelectorAll('[data-toast-announcer="polite"] > div')].map((line) => line.textContent)
    let setReact = (_: string) => {}
    const Live = () => {
      const [words, setWords] = useState("Uploading 1 file")
      setReact = setWords
      return <span>{words}</span>
    }
    render(<RToast.Toaster />)
    await settle()
    await act(async () => { RToast.toast.custom(() => <Live />, { duration: Infinity }) })
    await settle()
    await act(async () => setReact("Uploaded 1 file"))
    await settle()
    const react = read()
    RToast.toast.dismiss()
    await settle()
    cleanup()

    const words = ref("Uploading 1 file")
    const LiveVue = { setup: () => () => h("span", null, words.value) }
    mountVue(() => h(VToast.Toaster))
    await settle()
    VToast.toast.custom(LiveVue, { duration: Infinity })
    await settle()
    words.value = "Uploaded 1 file"
    await settle()
    const vue = read()
    VToast.toast.dismiss()
    await settle()
    expect(vue).toEqual(react)
    expect(react).toEqual(["Uploading 1 file", "Uploaded 1 file"])
  })
})

describe("Escape stack and the toast region", () => {
  test("Escape in a toast reaches only a layer the toast opened, the same in React and Vue", async () => {
    const region = document.createElement("ol")
    region.setAttribute("data-sonner-toaster", "true")
    const trigger = document.createElement("button")
    region.append(trigger)
    const page = document.createElement("button")
    document.body.append(region, page)
    const press = (target: Element) => fireEvent.keyDown(target, { key: "Escape", code: "Escape" })
    const run = async (mount: (name: string, calls: string[]) => void) => {
      const calls: string[] = []
      page.focus()
      mount("under", calls)
      await settle()
      press(trigger)
      trigger.focus()
      mount("opened from the toast", calls)
      await settle()
      press(trigger)
      return calls
    }
    const react = await run((name, calls) => {
      const Layer = () => { useEscCloseStack(true, () => calls.push(name)); return null }
      render(<Layer />)
    })
    cleanup()
    const vue = await run((name, calls) => {
      mountVue(() => h({ setup: () => { useVueEscCloseStack(true, () => calls.push(name)); return () => null } }))
    })
    expect(vue).toEqual(react)
    expect(react).toEqual(["opened from the toast"])
  })
})

describe("Toast CSS", () => {
  const css = readFileSync("packages/styles/src/components/Toast/Toast.module.css", "utf8")

  test("the region takes presses over a modal's pointer-events: none", () => {
    expect(css).toMatch(/\.Toaster:where\(\[data-sonner-toaster\]\) \{[^}]*pointer-events: auto;/)
  })

  test("on a phone a toast is as wide as its message, in the middle, a glass capsule (owner 14.11)", () => {
    const phone = css.slice(css.indexOf("@media (width <= 600px)"))
    expect(phone).toMatch(/\.Toast \{\s*width: max-content !important;\s*max-width: calc\(100vw - var\(--mobile-offset-left, 14px\) - var\(--mobile-offset-right, 14px\)\) !important;/)
    expect(phone).not.toMatch(/width: auto !important;/)
    const mobile = css.slice(css.indexOf("@media (max-width: 767px) {"))
    expect(mobile).toMatch(/&:not\(:has\(> \.Content > \.Description\)\) \{\s*border-radius: 21\.5px !important;/)
    expect(mobile).toMatch(/background: var\(--toast-mobile-background, var\(--normal-bg\)\) !important;/)
    const materials = readFileSync("packages/styles/src/styles/mobile-materials.css", "utf8")
    expect(materials).toContain("--toast-mobile-background: light-dark(rgb(255 255 255 / 65%), var(--alpha-12));")
  })

  test("the close button is a kit button: plain 28px on a desktop, a soft filled circle in a 44px target on a phone (owner 13.11)", () => {
    const desktop = css.slice(css.indexOf("@media (min-width: 768px) and (pointer: fine)"))
    // The message, 16, the buttons 8 apart, 8, the close button: one 28px kit button size, 6px corners
    expect(desktop).toMatch(/\.Toast\[data-styled="true"\] > \.Content ~ \* \{\s*order: var\(--toast-trailing-order, 3\);\s*margin-inline: 8px 0 !important;/)
    expect(desktop).toMatch(/\.Toast\[data-styled="true"\] > \.Content \+ \* \{\s*margin-inline-start: var\(--toast-trailing-start, 16px\) !important;/)
    expect(desktop).toMatch(/> :is\(\.ActionButton, \.CancelButton\) \{\s*height: var\(--toast-control-size\) !important;\s*padding: 0 var\(--control-gutter-sm\) !important;\s*border-radius: var\(--control-radius-sm\) !important;/)
    expect(desktop).toMatch(/> \[data-close-button\] \{\s*position: relative !important;[^}]*order: 4;\s*width: var\(--toast-control-size\) !important;\s*height: var\(--toast-control-size\) !important;/)
    expect(desktop).toMatch(/:not\(\[data-rich-colors="true"\]\) > \[data-close-button\] \{\s*background: transparent !important;\s*color: var\(--color-text-secondary-ghost\) !important;/)
    // A description puts the buttons under the message at the end; the close button stays on the title's line
    expect(desktop).toMatch(/:has\(> \.Content > \.Description\) \{\s*\/\*[^*]*\*\/\s*flex-wrap: wrap;\s*align-items: flex-start !important;\s*row-gap: 12px !important;/)
    // Only a toast with a description wraps: a long title alone keeps its icon and buttons on its row
    expect(desktop).not.toMatch(/--toast-close-room: 0px;\s*flex-wrap: wrap;/)
    expect(desktop).toContain("min-width: calc(100% - var(--toast-icon-room) - var(--toast-close-room));")
    // It moves them there through variables the toast sets, not through a rule under its :has()
    expect(desktop).toMatch(/--toast-trailing-order: 4;\s*--toast-trailing-start: auto;/)
    // The cancel is a soft secondary button everywhere
    expect(css).toMatch(/\.CancelButton \{\s*background: var\(--color-background-secondary-soft-alpha\) !important;\s*color: var\(--color-text-secondary-soft\) !important;/)
    // On a phone the 20px face is filled as the cancel is, not ringed
    expect(css).toMatch(/&::before \{\s*position: absolute;\s*z-index: -1;\s*inset: 12px;\s*border-radius: 50%;\s*background: var\(--color-background-secondary-soft-alpha\);/)
    expect(css).not.toContain("var(--gray4)")
  })
})
