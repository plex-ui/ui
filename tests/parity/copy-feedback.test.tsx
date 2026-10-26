import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { CopyButton as ReactCopyButton } from "../../packages/ui/src/components/Button"
import { CopyButton as VueCopyButton } from "../../packages/vue/src/components/Button"
import { CopyTooltip as ReactCopyTooltip } from "../../packages/ui/src/components/Tooltip"
import { CopyTooltip as VueCopyTooltip } from "../../packages/vue/src/components/Tooltip"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// CopyButton shows its copied state only after the clipboard write succeeds,
// and reports the outcome through `onCopy` (Vue: the `copy` event). A failed
// write used to show the check mark anyway.

const writeText = vi.fn(async (_text: string) => {})

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  // The textarea fallback fails too, so the write as a whole fails
  Object.defineProperty(document, "execCommand", { value: () => false, configurable: true })
  writeText.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})

const clickAndSnapshot = async (flush: () => Promise<void>) => {
  const before = serializeDom()
  await act(async () => {
    fireEvent.click(document.querySelector("button")!)
  })
  await flush()
  return { before, after: serializeDom() }
}

describe("CopyButton follows the clipboard", () => {
  test("a failed write shows no copied state and reports false", async () => {
    writeText.mockRejectedValue(new Error("denied"))

    const onReactCopy = vi.fn()
    render(<ReactCopyButton copyValue="secret" onCopy={onReactCopy} />)
    const react = await clickAndSnapshot(async () => {})
    cleanup()

    const onVueCopy = vi.fn()
    mountVue(() => h(VueCopyButton, { copyValue: "secret", onCopy: onVueCopy }))
    await flushVue()
    const vue = await clickAndSnapshot(flushVue)

    expect(vue).toEqual(react)
    expect(react.after).toBe(react.before)
    expect(react.after).toContain('aria-label="Copy"')
    expect(onReactCopy).toHaveBeenCalledWith(false)
    expect(onVueCopy).toHaveBeenCalledWith(false)
  })

  test("a successful write shows the copied state and reports true", async () => {
    const onReactCopy = vi.fn()
    render(<ReactCopyButton copyValue="secret" onCopy={onReactCopy} />)
    const react = await clickAndSnapshot(async () => {})
    cleanup()

    const onVueCopy = vi.fn()
    mountVue(() => h(VueCopyButton, { copyValue: "secret", onCopy: onVueCopy }))
    await flushVue()
    const vue = await clickAndSnapshot(flushVue)

    expect(vue).toEqual(react)
    expect(react.after).toContain('aria-label="Copied"')
    expect(onReactCopy).toHaveBeenCalledWith(true)
    expect(onVueCopy).toHaveBeenCalledWith(true)
    expect(writeText).toHaveBeenCalledWith("secret")
  })

  test("a second click while the write is in flight does not copy twice", async () => {
    let resolveWrite: () => void = () => {}
    writeText.mockImplementation(() => new Promise<void>((resolve) => (resolveWrite = resolve)))

    const onReactClick = vi.fn()
    render(<ReactCopyButton copyValue="secret" onClick={onReactClick} />)
    fireEvent.click(document.querySelector("button")!)
    fireEvent.click(document.querySelector("button")!)
    await act(async () => resolveWrite())
    cleanup()

    const onVueClick = vi.fn()
    mountVue(() => h(VueCopyButton, { copyValue: "secret", onClick: onVueClick }))
    await flushVue()
    fireEvent.click(document.querySelector("button")!)
    fireEvent.click(document.querySelector("button")!)
    resolveWrite()
    await flushVue()

    expect(onReactClick).toHaveBeenCalledTimes(1)
    expect(onVueClick).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledTimes(2)
  })
})

describe("CopyTooltip after unmount", () => {
  test("a write that settles after the tooltip is gone reports nothing", async () => {
    let resolveWrite: () => void = () => {}
    writeText.mockImplementation(() => new Promise<void>((resolve) => (resolveWrite = resolve)))

    const onReactCopy = vi.fn()
    const { unmount } = render(
      <ReactCopyTooltip copyValue="secret" onCopy={onReactCopy}>
        <button type="button">Copy</button>
      </ReactCopyTooltip>,
    )
    fireEvent.pointerDown(document.querySelector("button")!)
    unmount()
    await act(async () => resolveWrite())

    const onVueCopy = vi.fn()
    const vue = mountVue(() =>
      h(VueCopyTooltip, { copyValue: "secret", onCopy: onVueCopy }, () => h("button", { type: "button" }, "Copy")),
    )
    await flushVue()
    fireEvent.pointerDown(document.querySelector("button")!)
    vue.unmount()
    resolveWrite()
    await flushVue()

    expect(writeText).toHaveBeenCalledTimes(2)
    expect(onReactCopy).not.toHaveBeenCalled()
    expect(onVueCopy).not.toHaveBeenCalled()
  })
})
