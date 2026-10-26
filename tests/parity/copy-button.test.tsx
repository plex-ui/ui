import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { CopyButton as ReactCopyButton } from "../../packages/ui/src/components/Button"
import { CopyButton as VueCopyButton } from "../../packages/vue/src/components/Button"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

const writeText = vi.fn(async () => {})

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  writeText.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
})

// Click, then let the copied state run out: snapshots at each step
const walk = async (mount: () => void, flush: () => Promise<void>) => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "Date"] })
  mount()
  await flush()
  const snapshots = [serializeDom()]
  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms)
    })
    await flush()
    snapshots.push(serializeDom())
  }
  await act(async () => {
    fireEvent.click(document.querySelector("button")!)
  })
  await flush()
  snapshots.push(serializeDom())
  await advance(32)
  await advance(500)
  await act(async () => {
    fireEvent.click(document.querySelector("button")!) // ignored while copied
  })
  await advance(600) // 1132ms: still copied
  await advance(200) // 1332ms: back to copy
  await advance(500)
  vi.useRealTimers()
  return snapshots
}

describe.each([
  ["animations off (jsdom default)", true],
  ["animations on (browser)", false],
])("CopyButton parity, %s", (_mode, disabled) => {
  test("copy, copied, back", async () => {
    animation.disabled = disabled
    const onReactClick = vi.fn()
    const react = await walk(
      () => render(<ReactCopyButton copyValue="npm i @plexui/ui" color="secondary" variant="soft" onClick={onReactClick}>Copy</ReactCopyButton>),
      async () => {},
    )
    cleanup()
    const reactWrites = writeText.mock.calls.length

    const onVueClick = vi.fn()
    const vue = await walk(
      () => mountVue(() => h(VueCopyButton, { copyValue: "npm i @plexui/ui", color: "secondary", variant: "soft", onClick: onVueClick }, { default: () => "Copy" })),
      flushVue,
    )

    expect(vue).toEqual(react)
    expect(react.join("\n")).not.toBe(react[0])
    expect(onReactClick).toHaveBeenCalledTimes(1)
    expect(onVueClick).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls.length).toBe(reactWrites * 2)
    expect(writeText).toHaveBeenLastCalledWith("npm i @plexui/ui")
  })

  test("children receive the copied state", async () => {
    animation.disabled = disabled
    const react = await walk(
      () => render(<ReactCopyButton copyValue={() => "value"}>{({ copied }) => (copied ? "Copied" : "Copy")}</ReactCopyButton>),
      async () => {},
    )
    cleanup()
    const vue = await walk(
      () => mountVue(() => h(VueCopyButton, { copyValue: () => "value" }, { default: ({ copied }: { copied: boolean }) => (copied ? "Copied" : "Copy") })),
      flushVue,
    )
    expect(vue).toEqual(react)
    expect(react.join("\n")).toContain('"Copied"')
  })

  test("icon-only is named Copy, then Copied while the check shows", async () => {
    animation.disabled = disabled
    const react = await walk(() => render(<ReactCopyButton copyValue="value" variant="ghost" uniform />), async () => {})
    cleanup()
    const vue = await walk(() => mountVue(() => h(VueCopyButton, { copyValue: "value", variant: "ghost", uniform: true })), flushVue)
    expect(vue).toEqual(react)
    expect(react[0]).toContain('aria-label="Copy"')
    expect(react[1]).toContain('aria-label="Copied"')
    expect(react[react.length - 1]).toContain('aria-label="Copy"')
  })

  test("an explicit aria-label wins on an icon-only button", async () => {
    animation.disabled = disabled
    const react = await walk(() => render(<ReactCopyButton copyValue="value" aria-label="Copy token" />), async () => {})
    cleanup()
    const vue = await walk(() => mountVue(() => h(VueCopyButton, { "copyValue": "value", "aria-label": "Copy token" })), flushVue)
    expect(vue).toEqual(react)
    expect(react.every((snapshot) => snapshot.includes('aria-label="Copy token"'))).toBe(true)
  })
})
