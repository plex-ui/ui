import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { Popover } from "../../packages/ui/src/components/Popover"
import { Dialog } from "../../packages/ui/src/components/Dialog"
import { Menu } from "../../packages/ui/src/components/Menu"
import { animation } from "./harness"

const advance = async (ms = 20) => {
  await act(async () => { vi.advanceTimersByTime(ms) })
  await act(async () => { vi.advanceTimersByTime(0) })
}
const pointer = (target: Element, type: string, pointerType: string, pointerId = 1) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 })
  Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: pointerId } })
  fireEvent(target, event)
}
const popup = (disabled = false) => <Popover><Popover.Trigger><button disabled={disabled} data-trigger>Open</button></Popover.Trigger><Popover.Content><button data-inside>Inside</button></Popover.Content></Popover>
const trigger = () => document.querySelector<HTMLElement>('[data-trigger]')!
const inside = () => document.querySelector<HTMLElement>('[data-inside]')!
const outside = () => document.querySelector<HTMLElement>('[data-outside]')!
const mount = async () => {
  vi.useFakeTimers()
  const view = render(<>{popup()}<button data-outside>Outside</button></>)
  await act(async () => { trigger().focus(); fireEvent.click(trigger()) })
  await advance()
  return view
}
afterEach(async () => { cleanup(); await advance(0); vi.useRealTimers() })

test.each(["mouse", "pen", "touch"])("Popover: %s pointercancel permits subsequent outside focus dismissal", async (pointerType) => {
  await mount()
  await act(async () => {
    pointer(outside(), "pointerdown", pointerType)
    pointer(outside(), "pointercancel", pointerType)
    outside().focus()
  })
  await advance()
  expect(document.querySelector('[data-inside]')).toBeNull()
  expect(document.activeElement).toBe(outside())
})

test.each(["mouse", "pen", "touch"])("Popover: %s cancelled press cannot dismiss on a later inside AT click", async (pointerType) => {
  await mount()
  await act(async () => {
    pointer(outside(), "pointerdown", pointerType)
    pointer(outside(), "pointercancel", pointerType)
    fireEvent.click(inside(), { detail: 0 })
  })
  await advance()
  expect(document.querySelector('[data-inside]')).not.toBeNull()
})

test("Popover: another pointer's cancellation does not commit or discard the active outside press", async () => {
  await mount()
  await act(async () => {
    pointer(outside(), "pointerdown", "pen", 1)
    pointer(outside(), "pointercancel", "pen", 2)
    outside().focus()
  })
  await advance()
  expect(document.querySelector('[data-inside]')).not.toBeNull()
  await act(async () => { fireEvent.click(outside()) })
  await advance()
  expect(document.querySelector('[data-inside]')).toBeNull()
  expect(document.activeElement).toBe(outside())
})

test("Popover: nested Dialog retains focus ownership through Popover Escape and exit", async () => {
  vi.useFakeTimers()
  animation.disabled = false
  render(<Dialog open><Dialog.Content><Dialog.Header><Dialog.Title>Editor</Dialog.Title></Dialog.Header><Dialog.Body>{popup()}</Dialog.Body></Dialog.Content></Dialog>)
  await advance(300)
  await act(async () => { fireEvent.click(trigger()) })
  await advance(300)
  await act(async () => { inside().focus() })
  expect(document.activeElement).toBe(inside())
  await act(async () => { fireEvent.keyDown(inside(), { key: "Escape" }) })
  await advance(300)
  expect(document.querySelector('[data-inside]')).toBeNull()
  expect(document.querySelector('[data-plex-dialog]')).not.toBeNull()
  expect(document.activeElement).toBe(trigger())
})

test("Popover: a disabled trigger cannot steal moved focus after a pending press and animated exit", async () => {
  animation.disabled = false
  const view = await mount()
  await act(async () => {
    pointer(outside(), "pointerdown", "touch")
    pointer(outside(), "pointercancel", "touch")
  })
  view.rerender(<>{popup(true)}<button data-outside>Outside</button></>)
  await act(async () => { fireEvent.keyDown(inside(), { key: "Escape" }); outside().focus() })
  await advance(300)
  expect(document.querySelector('[data-inside]')).toBeNull()
  expect(document.activeElement).toBe(outside())
})


test("Popover: Plex Dialog overlay keeps its dismiss semantics when click propagation is stopped", async () => {
  vi.useFakeTimers()
  const changes: boolean[] = []
  render(<StrictMode><Dialog open><Dialog.Content><Dialog.Header><Dialog.Title>Editor</Dialog.Title></Dialog.Header><Dialog.Body><Popover onOpenChange={(open) => changes.push(open)}><Popover.Trigger><button data-trigger>Open</button></Popover.Trigger><Popover.Content><button data-inside>Inside</button></Popover.Content></Popover></Dialog.Body></Dialog.Content></Dialog></StrictMode>)
  await advance()
  await act(async () => { fireEvent.click(trigger()) })
  await advance()
  const overlay = document.querySelector<HTMLElement>('[class~="Overlay"]')!
  const stopClick = (event: Event) => event.stopPropagation()
  overlay.parentElement!.addEventListener("click", stopClick)
  await act(async () => {
    pointer(overlay, "pointerdown", "touch")
    pointer(overlay, "pointercancel", "touch")
  })
  await advance()
  expect(changes).toEqual([true])
  expect(document.querySelector('[data-inside]')).not.toBeNull()
  await act(async () => {
    pointer(overlay, "pointerdown", "touch")
    pointer(overlay, "pointerup", "touch")
    fireEvent.click(overlay)
  })
  await advance()
  expect(changes).toEqual([true, false])
  expect(document.querySelector('[data-inside]')).toBeNull()
  expect(document.querySelector('[data-plex-dialog]')).not.toBeNull()
})

test.each([{ modal: true, activation: "keyboard" }, { modal: false, activation: "keyboard" }, { modal: true, activation: "assistive" }, { modal: false, activation: "assistive" }])("Popover: nested Menu modal=$modal, $activation owns Escape and focus", async ({ modal, activation }) => {
  vi.useFakeTimers()
  const events: string[] = []
  render(<Popover onOpenChange={(open) => events.push(`popover:${open}`)}><Popover.Trigger><button data-trigger>Open</button></Popover.Trigger><Popover.Content><Menu modal={modal} onOpen={() => events.push("menu:open")} onClose={() => events.push("menu:close")}><Menu.Trigger><button data-menu-trigger>More</button></Menu.Trigger><Menu.Content><Menu.Item onSelect={() => events.push("select")}>Action</Menu.Item></Menu.Content></Menu></Popover.Content></Popover>)
  await act(async () => { trigger().focus(); fireEvent.click(trigger()) })
  await advance()
  const menuTrigger = document.querySelector<HTMLElement>('[data-menu-trigger]')!
  await act(async () => {
    if (activation === "keyboard") { menuTrigger.focus(); fireEvent.keyDown(menuTrigger, { key: "Enter" }) }
    else fireEvent.click(menuTrigger, { detail: 0 })
  })
  await advance()
  const item = document.querySelector<HTMLElement>('[role="menuitem"]')!
  await act(async () => { item.focus(); fireEvent.keyDown(item, { key: "Escape" }) })
  await advance()
  expect(document.querySelector('[role="menu"]')).toBeNull()
  expect(document.querySelector('[data-menu-trigger]')).toBe(menuTrigger)
  expect(document.activeElement).toBe(menuTrigger)
  await act(async () => { fireEvent.keyDown(menuTrigger, { key: "Escape" }) })
  await advance()
  expect(document.querySelector('[data-menu-trigger]')).toBeNull()
  expect(document.activeElement).toBe(trigger())
})
