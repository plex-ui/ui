import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive, type VNode } from "vue"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../packages/vue/src/components/Dialog"
import { animation, flushVue, mountVue } from "./harness"
import { interact } from "./pair"

type Framework = "React" | "Vue"

beforeEach(() => {
  animation.disabled = false
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(async () => {
  cleanup()
  await flushVue()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const settle = async () => {
  // Transitions stage on animation frames before starting their duration timer.
  await interact(() => { vi.advanceTimersByTime(50) })
  await interact(() => { vi.advanceTimersByTime(350) })
  await interact(() => { vi.advanceTimersByTime(0) })
}
const click = async (element: HTMLElement) => interact(() => fireEvent.click(element))

const reactDialog = (name: string, child?: ReactNode, onCloseAutoFocus?: (event: Event) => void) => (
  <ReactDialog>
    <ReactDialog.Trigger><button type="button">Open {name}</button></ReactDialog.Trigger>
    <ReactDialog.Content mobileVariant="sheet" onCloseAutoFocus={onCloseAutoFocus}>
      <ReactDialog.Header>
        <ReactDialog.Title>{name}</ReactDialog.Title>
        <ReactDialog.Description>Edit {name}.</ReactDialog.Description>
      </ReactDialog.Header>
      <ReactDialog.Body>{child ?? <button type="button">Inside {name}</button>}</ReactDialog.Body>
    </ReactDialog.Content>
  </ReactDialog>
)
const vueDialog = (name: string, child?: () => VNode, onCloseAutoFocus?: (event: Event) => void) => h(Dialog, null, () => [
  h(DialogTrigger, null, () => h("button", { type: "button" }, `Open ${name}`)),
  h(DialogContent, { mobileVariant: "sheet", onCloseAutoFocus }, () => [
    h(DialogHeader, null, () => [
      h(DialogTitle, null, () => name),
      h(DialogDescription, null, () => `Edit ${name}.`),
    ]),
    h(DialogBody, null, () => child?.() ?? h("button", { type: "button" }, `Inside ${name}`)),
  ]),
])

describe.each<Framework>(["React", "Vue"])("%s animated Dialog accessibility lifecycle", (framework) => {
  test("repeated closes release hidden ancestors and preserve both sibling triggers", async () => {
    if (framework === "React") await act(async () => { render(<main>{reactDialog("Materials")}{reactDialog("Labels")}</main>) })
    else { mountVue(() => h("main", [vueDialog("Materials"), vueDialog("Labels")])); await flushVue() }
    const page = within(document.body)
    for (const name of ["Materials", "Materials", "Materials", "Labels"]) {
      const trigger = page.getByRole("button", { name: `Open ${name}` })
      await interact(() => trigger.focus())
      await click(trigger)
      await settle()
      const dialog = page.getByRole("dialog", { name, exact: true })
      expect(trigger.closest('[aria-hidden="true"]')).not.toBeNull()
      await click(within(dialog).getByRole("button", { name: "Close dialog" }))
      expect(dialog.isConnected).toBe(true)
      expect(dialog.closest("[inert]")).not.toBeNull()
      expect(trigger.getAttribute("aria-expanded")).toBe("false")
      await settle()
      expect(dialog.isConnected).toBe(false)
      expect(trigger.closest('[aria-hidden="true"]')).toBeNull()
      expect(document.activeElement).toBe(trigger)
      expect(page.getByRole("button", { name: "Open Materials" })).toBeTruthy()
      expect(page.getByRole("button", { name: "Open Labels" })).toBeTruthy()
    }
  })

  test("a nested Sheet releases only its own accessibility lock across repeated exits", async () => {
    if (framework === "React") await act(async () => { render(<main>{reactDialog("Product", reactDialog("Materials"))}</main>) })
    else { mountVue(() => h("main", [vueDialog("Product", () => vueDialog("Materials"))])); await flushVue() }
    const page = within(document.body)
    const outerTrigger = page.getByRole("button", { name: "Open Product" })
    await interact(() => outerTrigger.focus())
    await click(outerTrigger)
    await settle()
    const parent = page.getByRole("dialog", { name: "Product", exact: true })
    for (let cycle = 0; cycle < 3; cycle++) {
      const trigger = page.getByRole("button", { name: "Open Materials" })
      await interact(() => trigger.focus())
      await click(trigger)
      await settle()
      const child = page.getByRole("dialog", { name: "Materials", exact: true })
      expect(parent.closest('[aria-hidden="true"]')).not.toBeNull()
      await click(within(child).getByRole("button", { name: "Close dialog" }))
      expect(child.isConnected).toBe(true)
      await settle()
      expect(child.isConnected).toBe(false)
      expect(parent.closest('[aria-hidden="true"]')).toBeNull()
      expect(outerTrigger.closest('[aria-hidden="true"]')).not.toBeNull()
      expect(document.activeElement).toBe(trigger)
      expect(page.getByRole("dialog", { name: "Product", exact: true })).toBe(parent)
      await interact(() => outerTrigger.focus())
      expect(parent.contains(document.activeElement)).toBe(true)
    }
    await click(within(parent).getByRole("button", { name: "Close dialog" }))
    await settle()
    expect(parent.isConnected).toBe(false)
    expect(outerTrigger.closest('[aria-hidden="true"]')).toBeNull()
    expect(document.activeElement).toBe(outerTrigger)
  })

  test("reopening during exit reuses the surface without leaking its accessibility ownership", async () => {
    if (framework === "React") await act(async () => { render(reactDialog("Materials")) })
    else { mountVue(() => vueDialog("Materials")); await flushVue() }
    const page = within(document.body)
    const trigger = page.getByRole("button", { name: "Open Materials" })
    await interact(() => trigger.focus())
    await click(trigger)
    await settle()
    const dialog = page.getByRole("dialog", { name: "Materials", exact: true })
    await click(within(dialog).getByRole("button", { name: "Close dialog" }))
    await interact(() => { vi.advanceTimersByTime(50) })
    expect(dialog.isConnected).toBe(true)
    expect(dialog.getAttribute("data-state")).toBe("closed")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await click(trigger)
    await settle()
    expect(page.getByRole("dialog", { name: "Materials", exact: true })).toBe(dialog)
    expect(dialog.closest("[inert]")).toBeNull()
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    await click(within(dialog).getByRole("button", { name: "Close dialog" }))
    await settle()
    expect(dialog.isConnected).toBe(false)
    expect(trigger.closest('[aria-hidden="true"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test("focus moved into another Sheet during exit stays with the newer owner", async () => {
    if (framework === "React") await act(async () => { render(<main>{reactDialog("Materials")}{reactDialog("Labels")}</main>) })
    else { mountVue(() => h("main", [vueDialog("Materials"), vueDialog("Labels")])); await flushVue() }
    const page = within(document.body)
    const firstTrigger = page.getByRole("button", { name: "Open Materials" })
    const nextTrigger = page.getByRole("button", { name: "Open Labels" })
    await interact(() => firstTrigger.focus())
    await click(firstTrigger)
    await settle()
    const first = page.getByRole("dialog", { name: "Materials", exact: true })
    await click(within(first).getByRole("button", { name: "Close dialog" }))
    await click(nextTrigger)
    await settle()
    const next = page.getByRole("dialog", { name: "Labels", exact: true })
    expect(first.isConnected).toBe(false)
    expect(next.contains(document.activeElement)).toBe(true)
    expect(firstTrigger.closest('[aria-hidden="true"]')).not.toBeNull()
    await click(within(next).getByRole("button", { name: "Close dialog" }))
    await settle()
    expect(next.isConnected).toBe(false)
    expect(firstTrigger.closest('[aria-hidden="true"]')).toBeNull()
  })

  test("an active Sheet traps and loops focus, then releases it during logical exit", async () => {
    if (framework === "React") await act(async () => { render(<main><button type="button">Outside</button>{reactDialog("Materials")}</main>) })
    else { mountVue(() => h("main", [h("button", { type: "button" }, "Outside"), vueDialog("Materials")])); await flushVue() }
    const page = within(document.body)
    const outside = page.getByRole("button", { name: "Outside" })
    await click(page.getByRole("button", { name: "Open Materials" }))
    await settle()
    const dialog = page.getByRole("dialog", { name: "Materials", exact: true })
    const first = within(dialog).getByRole("button", { name: "Close dialog" })
    const last = within(dialog).getByRole("button", { name: "Inside Materials" })
    await interact(() => last.focus())
    await interact(() => fireEvent.keyDown(last, { key: "Tab" }))
    expect(document.activeElement).toBe(first)
    await interact(() => fireEvent.keyDown(first, { key: "Tab", shiftKey: true }))
    expect(document.activeElement).toBe(last)
    await interact(() => outside.focus())
    expect(dialog.contains(document.activeElement)).toBe(true)
    await click(first)
    expect(dialog.isConnected).toBe(true)
    await interact(() => outside.focus())
    expect(document.activeElement).toBe(outside)
    await settle()
    expect(dialog.isConnected).toBe(false)
    expect(document.activeElement).toBe(outside)
  })

  test("replacing an earlier input then changing validation while blurred preserves the current input selection", async () => {
    const state = reactive({ textMode: false, error: false })
    const reactTree = () => <ReactDialog open>
      <ReactDialog.Content showClose={false}>
        <ReactDialog.Title>Verification</ReactDialog.Title>
        <ReactDialog.Description>Enter your code.</ReactDialog.Description>
        {state.textMode
          ? <input key="text" aria-label="Current code" value="A48B" readOnly />
          : <input key="digits" aria-label="Previous code" value="12" readOnly />}
        {state.error ? <p key="error">Incorrect code.</p> : <p key="hint">Check your inbox.</p>}
      </ReactDialog.Content>
    </ReactDialog>
    let refresh = () => {}
    if (framework === "React") {
      const view = render(reactTree())
      refresh = () => view.rerender(reactTree())
    } else {
      mountVue(() => h(Dialog, { open: true }, () => h(DialogContent, { showClose: false }, () => [
        h(DialogTitle, null, () => "Verification"),
        h(DialogDescription, null, () => "Enter your code."),
        state.textMode
          ? h("input", { key: "text", "aria-label": "Current code", value: "A48B", readonly: true })
          : h("input", { key: "digits", "aria-label": "Previous code", value: "12", readonly: true }),
        state.error ? h("p", { key: "error" }, "Incorrect code.") : h("p", { key: "hint" }, "Check your inbox."),
      ])))
      await flushVue()
    }
    await settle()
    const page = within(document.body)
    const previous = page.getByRole<HTMLInputElement>("textbox", { name: "Previous code" })
    await interact(() => previous.focus())
    await interact(() => { state.textMode = true; refresh() })
    expect(previous.isConnected).toBe(false)
    const input = page.getByRole<HTMLInputElement>("textbox", { name: "Current code" })
    await interact(() => { input.focus(); input.setSelectionRange(4, 4) })
    const select = vi.spyOn(input, "select")
    // Switching to a parent document's demo control blurs the iframe input with
    // no relatedTarget. A later validation update must not select its whole value.
    await interact(() => input.blur())
    expect(document.activeElement).toBe(document.body)
    await interact(() => { state.error = true; refresh() })
    await settle()
    expect(page.getByRole("textbox", { name: "Current code" })).toBe(input)
    expect(input.value).toBe("A48B")
    expect([input.selectionStart, input.selectionEnd]).toEqual([4, 4])
    expect(select).not.toHaveBeenCalled()
  })

  test("removing the focused last candidate keeps focus on a focusable dialog boundary", async () => {
    const state = reactive({ candidate: true })
    const reactTree = () => <ReactDialog open>
      <ReactDialog.Content showClose={false} mobileVariant="sheet">
        <ReactDialog.Title>Materials</ReactDialog.Title>
        <ReactDialog.Description>Edit materials.</ReactDialog.Description>
        {state.candidate ? <button type="button">Temporary action</button> : null}
      </ReactDialog.Content>
    </ReactDialog>
    let removeCandidate = () => { state.candidate = false }
    if (framework === "React") {
      const view = render(reactTree())
      removeCandidate = () => { state.candidate = false; view.rerender(reactTree()) }
    } else {
      mountVue(() => h(Dialog, { open: true }, () => h(DialogContent, { showClose: false, mobileVariant: "sheet" }, () => [
        h(DialogTitle, null, () => "Materials"),
        h(DialogDescription, null, () => "Edit materials."),
        state.candidate ? h("button", { type: "button" }, "Temporary action") : null,
      ])))
      await flushVue()
    }
    await settle()
    const page = within(document.body)
    const dialog = page.getByRole("dialog", { name: "Materials", exact: true })
    await interact(() => page.getByRole("button", { name: "Temporary action" }).focus())
    await interact(removeCandidate)
    await settle()
    expect(page.queryByRole("button", { name: "Temporary action" })).toBeNull()
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1")
  })

  test.each([false, true])("custom close autofocus runs once on detached content and preserves preventScroll (animations disabled: %s)", async (disabled) => {
    animation.disabled = disabled
    const returnTarget = document.createElement("button")
    document.body.append(returnTarget)
    const focus = vi.spyOn(returnTarget, "focus")
    const calls: Array<{ target: EventTarget | null; connected: boolean; cancelable: boolean }> = []
    const restoreFocus = (event: Event) => {
      calls.push({ target: event.target, connected: event.target instanceof Node && event.target.isConnected, cancelable: event.cancelable })
      event.preventDefault()
      returnTarget.focus({ preventScroll: true })
    }
    if (framework === "React") await act(async () => { render(reactDialog("Materials", undefined, restoreFocus)) })
    else { mountVue(() => vueDialog("Materials", undefined, restoreFocus)); await flushVue() }
    const page = within(document.body)
    const trigger = page.getByRole("button", { name: "Open Materials" })
    await interact(() => trigger.focus())
    await click(trigger)
    await settle()
    const dialog = page.getByRole("dialog", { name: "Materials", exact: true })
    await click(within(dialog).getByRole("button", { name: "Close dialog" }))
    await settle()
    expect(calls).toEqual([{ target: dialog, connected: false, cancelable: true }])
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    expect(document.activeElement).toBe(returnTarget)
  })

  test("a declined controlled close stays open, and accepting it releases the surface once", async () => {
    const changes = vi.fn<(open: boolean) => void>()
    const closedFocus = vi.fn<(event: Event) => void>((event) => event.preventDefault())
    const state = reactive({ open: true })
    const reactTree = () => <ReactDialog open={state.open} onOpenChange={changes}>
      <ReactDialog.Trigger><button type="button">Open Materials</button></ReactDialog.Trigger>
      <ReactDialog.Content mobileVariant="sheet" onCloseAutoFocus={closedFocus}>
        <ReactDialog.Title>Materials</ReactDialog.Title>
        <ReactDialog.Description>Edit materials.</ReactDialog.Description>
      </ReactDialog.Content>
    </ReactDialog>
    let setClosed = () => { state.open = false }
    if (framework === "React") {
      const view = render(reactTree())
      setClosed = () => { state.open = false; view.rerender(reactTree()) }
    } else {
      mountVue(() => h(Dialog, { open: state.open, "onUpdate:open": changes }, () => [
        h(DialogTrigger, null, () => h("button", { type: "button" }, "Open Materials")),
        h(DialogContent, { mobileVariant: "sheet", onCloseAutoFocus: closedFocus }, () => [
          h(DialogTitle, null, () => "Materials"),
          h(DialogDescription, null, () => "Edit materials."),
        ]),
      ]))
      await flushVue()
    }
    await settle()
    const page = within(document.body)
    const trigger = page.getByRole("button", { name: "Open Materials", hidden: true })
    const dialog = page.getByRole("dialog", { name: "Materials", exact: true })
    await click(within(dialog).getByRole("button", { name: "Close dialog" }))
    await settle()
    expect(changes.mock.calls).toEqual([[false]])
    expect(dialog.isConnected).toBe(true)
    expect(dialog.closest("[inert]")).toBeNull()
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(closedFocus).not.toHaveBeenCalled()
    await interact(setClosed)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(dialog.isConnected).toBe(true)
    await settle()
    expect(dialog.isConnected).toBe(false)
    expect(trigger.closest('[aria-hidden="true"]')).toBeNull()
    expect(changes.mock.calls).toEqual([[false]])
    expect(closedFocus).toHaveBeenCalledTimes(1)
    expect(document.activeElement).not.toBe(trigger)
  })
})
