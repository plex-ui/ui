import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Menu as ReactMenu } from "../../packages/ui/src/components/Menu"
import { CopyTooltip as ReactCopyTooltip, Tooltip as ReactTooltip } from "../../packages/ui/src/components/Tooltip"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../packages/vue/src/components/Menu"
import { CopyTooltip, Tooltip } from "../../packages/vue/src/components/Tooltip"
import { flushVue, mountVue } from "./harness"

const settle = async (action: () => void = () => {}) => {
  await act(async () => {
    action()
    await flushVue()
    for (let i = 0; i < 100; i++) await Promise.resolve()
  })
}
const trigger = () => document.querySelector<HTMLButtonElement>("[data-testid=trigger]")!
const tooltip = () => document.querySelector("[role=tooltip]")
const outside = () => document.querySelector<HTMLButtonElement>("[data-testid=outside]")!

beforeEach(() => {
  // Vue ignores events dated before an invoker was installed. Keep immediate
  // fixture events ordered even when the clock stays in one millisecond.
  let eventTime = Date.now()
  vi.spyOn(Date, "now").mockImplementation(() => ++eventTime)
})

afterEach(() => vi.useRealTimers())

describe.each(["React", "Vue"] as const)("%s Tooltip focus ownership", (framework) => {
  const mountTooltip = async (menu = false) => {
    if (framework === "React") {
      const hint = <ReactTooltip content="Actions" openDelay={0}><button data-testid="trigger">Menu</button></ReactTooltip>
      render(<>{menu ? <ReactMenu><ReactMenu.Trigger>{hint}</ReactMenu.Trigger><ReactMenu.Content><ReactMenu.Item onSelect={() => {}}>Edit</ReactMenu.Item></ReactMenu.Content></ReactMenu> : hint}<button data-testid="outside">Outside</button></>)
    } else {
      const hint = () => h(Tooltip, { content: "Actions", openDelay: 0 }, () => h("button", { "data-testid": "trigger" }, "Menu"))
      mountVue(() => h("div", null, [
        menu ? h(Menu, null, () => [h(MenuTrigger, null, hint), h(MenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Edit"))]) : hint(),
        h("button", { "data-testid": "outside" }, "Outside"),
      ]))
    }
    await settle()
  }

  test.each([false, true])("keyboard focus opens after a cancelled touch, including subsequent visits (previous hover: %s)", async (hovered) => {
    await mountTooltip()
    if (hovered) {
      await settle(() => fireEvent.pointerMove(trigger(), { pointerType: "mouse" }))
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
      await settle()
      expect(tooltip()?.getAttribute("data-state")).toBe("delayed-open")
    }
    await settle(() => fireEvent.pointerDown(trigger(), { pointerType: "touch" }))
    await settle(() => fireEvent.pointerCancel(trigger(), { pointerType: "touch" }))
    for (let i = 0; i < 2; i++) {
      await settle(() => outside().focus())
      await settle(() => fireEvent.keyDown(outside(), { key: "Tab" }))
      await settle(() => trigger().focus())
      expect(tooltip()?.textContent).toBe("Actions")
      expect(tooltip()?.getAttribute("data-state")).toBe("instant-open")
    }
  })

  test.each(["mouse", "touch"])("%s Menu selection restores focus without a hint; keyboard focus still works", async (pointerType) => {
    await mountTooltip(true)
    await settle(() => fireEvent.pointerDown(trigger(), { pointerType, button: 0, ctrlKey: false }))
    await settle(() => fireEvent.pointerUp(trigger(), { pointerType }))
    await settle(() => fireEvent.click(trigger(), { button: 0, detail: 1 }))
    const item = document.querySelector<HTMLElement>("[role=menuitem]")!
    expect(item).not.toBeNull()
    await settle(() => fireEvent.pointerDown(item, { pointerType }))
    await settle(() => fireEvent.pointerUp(item, { pointerType }))
    await settle(() => fireEvent.click(item))
    // FocusScope restores focus on a zero-delay task.
    await new Promise((resolve) => setTimeout(resolve, 20))
    await settle()
    expect(document.activeElement).toBe(trigger())
    expect(trigger().hasAttribute("data-menu-pointer-focus")).toBe(true)
    expect(tooltip()).toBeNull()
    await settle(() => outside().focus())
    await settle(() => fireEvent.keyDown(outside(), { key: "Tab" }))
    await settle(() => trigger().focus())
    expect(tooltip()?.textContent).toBe("Actions")
  })
})

describe.each(["React", "Vue"] as const)("%s CopyTooltip pending feedback", (framework) => {
  const mountCopy = async (onCopy: (copied: boolean) => void) => {
    if (framework === "React") {
      render(<div data-testid="scroll"><ReactCopyTooltip copyValue="secret" onCopy={onCopy}><button data-testid="trigger">Copy</button></ReactCopyTooltip></div>)
    } else {
      mountVue(() => h("div", { "data-testid": "scroll" }, [h(CopyTooltip, { copyValue: "secret", onCopy }, () => h("button", { "data-testid": "trigger" }, "Copy"))]))
    }
    await settle()
  }

  test.each(["Escape", "scroll"])("a write does not reopen after %s dismisses the hint", async (dismiss) => {
    let resolveWrite = () => {}
    const writeText = vi.fn(() => new Promise<void>((resolve) => { resolveWrite = resolve }))
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    const onCopy = vi.fn()
    await mountCopy(onCopy)
    await settle(() => trigger().focus())
    expect(tooltip()).not.toBeNull()
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    expect(writeText).toHaveBeenCalledTimes(1)
    await settle(() => dismiss === "Escape"
      ? fireEvent.keyDown(trigger(), { key: "Escape" })
      : fireEvent.scroll(document.querySelector("[data-testid=scroll]")!))
    expect(tooltip()).toBeNull()
    await settle(resolveWrite)
    expect(onCopy).toHaveBeenCalledExactlyOnceWith(true)
    expect(tooltip()).toBeNull()
  })

  test("scroll cancels delayed touch feedback when no hint was open", async () => {
    let resolveWrite = () => {}
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => new Promise<void>((resolve) => { resolveWrite = resolve }) } })
    const onCopy = vi.fn()
    await mountCopy(onCopy)
    await settle(() => fireEvent.pointerDown(trigger(), { pointerType: "touch" }))
    await settle(() => fireEvent.pointerUp(trigger(), { pointerType: "touch" }))
    await settle(() => fireEvent.click(trigger()))
    expect(tooltip()).toBeNull()
    await settle(() => fireEvent.scroll(document.querySelector("[data-testid=scroll]")!))
    await settle(resolveWrite)
    expect(onCopy).toHaveBeenCalledExactlyOnceWith(true)
    expect(tooltip()).toBeNull()
  })

  test("a repeated keyboard copy clears old success while pending and after failure beyond one second", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    let rejectRepeat: (error: Error) => void = () => {}
    const writeText = vi.fn<() => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectRepeat = reject }))
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => false })
    const onCopy = vi.fn()
    await mountCopy(onCopy)
    await settle(() => trigger().focus())
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    expect(tooltip()?.textContent).toContain("Copied!")
    await settle(() => vi.advanceTimersByTime(500))
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(tooltip()?.textContent.trim()).toBe("Copy")
    await settle(() => vi.advanceTimersByTime(1500))
    expect(tooltip()?.textContent.trim()).toBe("Copy")
    await settle(() => rejectRepeat(new Error("denied")))
    expect(onCopy.mock.calls).toEqual([[true], [false]])
    await settle(() => vi.advanceTimersByTime(1001))
    expect(tooltip()?.textContent.trim()).toBe("Copy")
    expect(document.activeElement).toBe(trigger())
  })

  test("dismissing a repeated pending keyboard copy prevents late success from reopening", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    let resolveRepeat = () => {}
    const writeText = vi.fn<() => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveRepeat = resolve }))
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    const onCopy = vi.fn()
    await mountCopy(onCopy)
    await settle(() => trigger().focus())
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    expect(tooltip()?.textContent).toContain("Copied!")
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    await settle(() => fireEvent.keyDown(trigger(), { key: "Escape" }))
    await settle(resolveRepeat)
    await settle(() => vi.advanceTimersByTime(1001))
    expect(onCopy.mock.calls).toEqual([[true], [true]])
    expect(tooltip()).toBeNull()
  })

  test.each([false, true])("an older write cannot replace a newer result or extend its timer (latest success: %s)", async (latestSuccess) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    let resolveOlder = () => {}
    const writeText = vi.fn<() => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveOlder = resolve }))
      .mockImplementationOnce(() => latestSuccess ? Promise.resolve() : Promise.reject(new Error("denied")))
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => false })
    const onCopy = vi.fn()
    await mountCopy(onCopy)
    await settle(() => trigger().focus())
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    expect(tooltip()?.textContent).toContain("Copied!")
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    expect(tooltip()?.textContent.trim()).toBe(latestSuccess ? "Copied!" : "Copy")
    await settle(() => vi.advanceTimersByTime(500))
    await settle(resolveOlder)
    expect(onCopy.mock.calls).toEqual([[true], [latestSuccess], [true]])
    expect(tooltip()?.textContent.trim()).toBe(latestSuccess ? "Copied!" : "Copy")
    await settle(() => vi.advanceTimersByTime(501))
    if (latestSuccess) expect(tooltip()).toBeNull()
    else expect(tooltip()?.textContent.trim()).toBe("Copy")
  })

  test.each([false, true])("fallback copy restores keyboard focus and still shows success (cancelled gesture: %s)", async (cancelled) => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined })
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => true) })
    const onCopy = vi.fn()
    await mountCopy(onCopy)
    if (cancelled) {
      await settle(() => fireEvent.pointerDown(trigger(), { pointerType: "touch" }))
      await settle(() => fireEvent.pointerCancel(trigger(), { pointerType: "touch" }))
    }
    await settle(() => trigger().focus())
    await settle(() => fireEvent.keyDown(trigger(), { key: "Enter" }))
    expect(document.activeElement).toBe(trigger())
    expect(onCopy).toHaveBeenCalledExactlyOnceWith(true)
    expect(tooltip()?.textContent).toContain("Copied!")
    expect(document.querySelector("textarea")).toBeNull()
  })
})
