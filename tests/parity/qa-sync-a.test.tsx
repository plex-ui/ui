import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Image as ReactImage } from "../../packages/ui/src/components/Image"
import { CopyTooltip as ReactCopyTooltip, Tooltip as ReactTooltip } from "../../packages/ui/src/components/Tooltip"
import { Image } from "../../packages/vue/src/components/Image"
import { CopyTooltip, TooltipTriggerDecorator } from "../../packages/vue/src/components/Tooltip"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, walkPairWithState } from "./pair"

// React-vs-Vue parity for behaviour fixed on the React side in the QA pass:
// CopyTooltip copies on Enter/Space, Image tracks load/error per src.

// ---------------------------------------------------------------------------
// CopyTooltip (same harness as tooltip-popover.test.tsx: fake timers, both
// frameworks settled after every step, the Reka popper wrapper normalized)

const settle = async () => {
  for (let i = 0; i < 200; i++) await Promise.resolve()
}

const normalizePopper = (root: Element) => {
  for (const wrapper of Array.from(root.querySelectorAll("[data-reka-popper-content-wrapper]"))) {
    wrapper.removeAttribute("dir")
  }
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    const style = element.getAttribute("style")!
    if (style.includes("--reka-popper-")) element.setAttribute("style", style.replaceAll("--reka-popper-", "--radix-popper-"))
  }
}

const snapshotDom = () => {
  const clone = document.body.cloneNode(true) as HTMLElement
  normalizePopper(clone)
  return serializeDom(clone)
}

type Tools = {
  snapshot: () => void
  /** Fires a DOM event on the trigger; returns false when its default was prevented */
  fire: (event: keyof typeof fireEvent, init?: object) => Promise<boolean>
  focus: () => Promise<void>
  advance: (ms: number) => Promise<void>
}

const TRIGGER = '[data-testid="trigger"]'

const copyWalk = async (steps: (tools: Tools) => Promise<void>) => {
  const run = async (action: () => void) => {
    await act(async () => {
      action()
      await settle()
    })
    await flushVue()
    await settle()
    await flushVue()
  }
  // Vue skips a listener whose event is not later than the moment it was
  // attached; with `Date` faked, move the clock 1ms before each DOM event
  const dispatch = (action: () => void) =>
    run(() => {
      vi.setSystemTime(Date.now() + 1)
      action()
    })
  const trigger = () => document.querySelector(TRIGGER) as HTMLElement

  const tools = (snapshots: string[]): Tools => ({
    snapshot: () => snapshots.push(snapshotDom()),
    fire: async (event, init) => {
      let notPrevented = true
      await dispatch(() => {
        notPrevented = (fireEvent[event] as (element: Element, init?: object) => boolean)(trigger(), init)
      })
      return notPrevented
    },
    focus: () => dispatch(() => trigger().focus()),
    advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
  })

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    const react: string[] = []
    await run(() => {
      render(
        <ReactCopyTooltip copyValue="sess_12345abcdefg">
          <ReactTooltip.TriggerDecorator data-testid="trigger">sess_12345abcdefg</ReactTooltip.TriggerDecorator>
        </ReactCopyTooltip>,
      )
    })
    await steps(tools(react))
    await run(() => cleanup())
    vi.clearAllTimers()

    const vue: string[] = []
    const { unmount } = mountVue(() =>
      h(CopyTooltip, { copyValue: "sess_12345abcdefg" }, {
        default: () => h(TooltipTriggerDecorator, { "data-testid": "trigger" }, { default: () => "sess_12345abcdefg" }),
      }),
    )
    await run(() => {})
    await steps(tools(vue))
    unmount()
    vi.clearAllTimers()

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}

describe("CopyTooltip keyboard parity", () => {
  const writeText = vi.fn(async () => {})

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    writeText.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test("focus opens Copy, Enter copies, the timer closes, Space copies again", async () => {
    const prevented: boolean[] = []
    const result = await copyWalk(async ({ fire, focus, advance, snapshot }) => {
      await focus()
      snapshot() // open with "Copy"
      prevented.push(!(await fire("keyDown", { key: "Enter" })))
      snapshot() // "Copied!", not clickable
      await advance(1000)
      snapshot() // closed by the timer
      prevented.push(!(await fire("keyDown", { key: " " })))
      snapshot() // reopened by the key, still "Copied!"
      await advance(1000)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('" Copy"')
    expect(result.react[1]).toContain('" Copied!"')
    expect(result.react[1]).toContain('data-clickable="false"')
    expect(result.react[2]).not.toContain('role="tooltip"')
    expect(result.react[3]).toContain('" Copied!"')
    expect(result.react[4]).not.toContain('role="tooltip"')
    expect(prevented).toEqual([true, true, true, true])
    expect(writeText).toHaveBeenCalledTimes(4)
    expect(writeText).toHaveBeenLastCalledWith("sess_12345abcdefg")
  })

  test("Enter on a closed trigger opens it copied; other keys do nothing", async () => {
    const prevented: boolean[] = []
    const result = await copyWalk(async ({ fire, snapshot }) => {
      prevented.push(!(await fire("keyDown", { key: "a" })))
      snapshot() // closed, nothing copied
      prevented.push(!(await fire("keyDown", { key: "Enter" })))
      snapshot() // open with "Copied!"
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="tooltip"')
    expect(result.react[1]).toContain('" Copied!"')
    expect(prevented).toEqual([false, true, false, true])
    expect(writeText).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// Image: load and error state belong to the src they happened on

describe("Image per-src state parity", () => {
  const walkSrc = (initial: string, force: boolean, steps: (tools: { set: (src: string) => Promise<void>; load: () => Promise<void>; fail: () => Promise<void>; snapshot: () => void }) => Promise<void>) =>
    walkPairWithState(
      { src: initial },
      (state) => <ReactImage src={state.src} forceRenderAfterLoadFail={force} />,
      (state) => h(Image, { src: state.src, forceRenderAfterLoadFail: force }),
      async ({ set, snapshot }) =>
        steps({
          set: (src) => set({ src }),
          load: () => interact(() => fireEvent.load(document.querySelector("img")!)),
          fail: () => interact(() => fireEvent.error(document.querySelector("img")!)),
          snapshot,
        }),
    )

  test("a new src renders again after an error and starts unloaded", async () => {
    const { react, vue } = await walkSrc("/qa-a.png", false, async ({ set, load, fail, snapshot }) => {
      await fail()
      snapshot() // dropped
      await set("/qa-b.png")
      snapshot() // back, not loaded
      await load()
      snapshot() // loaded
      await set("/qa-c.png")
      snapshot() // new src: not loaded
      await set("/qa-b.png")
      snapshot() // loaded before: loaded at once
      await set("/qa-a.png")
      snapshot() // the src that failed stays dropped
    })
    expect(vue).toEqual(react)
    expect(react[0]).not.toContain("<img")
    expect(react[1]).toContain('src="/qa-b.png"')
    expect(react[1]).not.toContain("data-loaded")
    expect(react[2]).toContain("data-loaded")
    expect(react[3]).toContain('src="/qa-c.png"')
    expect(react[3]).not.toContain("data-loaded")
    expect(react[4]).toContain("data-loaded")
    expect(react[5]).not.toContain("<img")
  })

  test("forced render: a new src after an error is not shown as loaded", async () => {
    const { react, vue } = await walkSrc("/qa-d.png", true, async ({ set, fail, snapshot }) => {
      await fail()
      snapshot() // kept and marked loaded
      await set("/qa-e.png")
      snapshot() // new src: not loaded
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("data-loaded")
    expect(react[1]).toContain('src="/qa-e.png"')
    expect(react[1]).not.toContain("data-loaded")
  })
})
