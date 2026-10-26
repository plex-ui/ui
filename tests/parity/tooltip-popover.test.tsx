import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useSyncExternalStore, type ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive, type VNode } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Popover as ReactPopover, usePopoverController as useReactPopoverController } from "../../packages/ui/src/components/Popover"
import { CopyTooltip as ReactCopyTooltip, Tooltip as ReactTooltip } from "../../packages/ui/src/components/Tooltip"
import { Button as VueButton } from "../../packages/vue/src/components/Button"
import { Popover, PopoverContent, PopoverTrigger, usePopoverController } from "../../packages/vue/src/components/Popover"
import {
  CopyTooltip,
  Tooltip,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
  TooltipTriggerDecorator,
} from "../../packages/vue/src/components/Tooltip"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// React-vs-Vue parity for Tooltip, CopyTooltip and Popover.
//
// Floating content is positioned by floating-ui in both (Radix's and Reka's
// popper). Two differences live in Reka's positioning wrapper, which neither
// port renders, and are normalized here (and only here):
// - Reka names the popper custom properties `--reka-popper-*`, Radix
//   `--radix-popper-*` (wrapper declarations and the content's `var()`s);
// - Reka sets `dir="ltr"` on the wrapper.
// Everything else, including the content element, must match as rendered.
//
// Reka resolves positions over more microtasks than Radix, so every step
// lets both settle before a snapshot.

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

const describeFocus = () => {
  const element = document.activeElement
  if (!element || element === document.body) return "focus: body"
  const role = element.getAttribute("role")
  return `focus: <${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}"${role ? ` role="${role}"` : ""}> ${JSON.stringify(element.textContent)}`
}

/** The serialized body (popper wrapper normalized, live DOM untouched) plus the focused element. */
const snapshotDom = () => {
  const clone = document.body.cloneNode(true) as HTMLElement
  normalizePopper(clone)
  return `${serializeDom(clone)}\n${describeFocus()}`
}

const reactDom = async (element: ReactElement) => {
  await act(async () => {
    render(element)
    await settle()
  })
  const dom = snapshotDom()
  cleanup()
  return dom
}

const vueDom = async (renderVue: () => VNode) => {
  const { unmount } = mountVue(renderVue)
  await flushVue()
  await settle()
  await flushVue()
  const dom = snapshotDom()
  unmount()
  return dom
}

const pair = async (element: ReactElement, renderVue: () => VNode) => ({
  react: await reactDom(element),
  vue: await vueDom(renderVue),
})

type Target = string | (() => Element | null)
const resolve = (target: Target) => {
  const element = typeof target === "string" ? document.querySelector(target) : target()
  if (!element) throw new Error(`No element for ${String(target)}`)
  return element
}

type Tools<T> = {
  /** Records the serialized DOM and the focused element */
  snapshot: () => void
  /** Fires a DOM event (testing-library's `fireEvent`) and lets both frameworks settle */
  fire: (target: Target, event: keyof typeof fireEvent, init?: object) => Promise<void>
  /** Focuses or blurs an element */
  focus: (target: Target) => Promise<void>
  blur: (target: Target) => Promise<void>
  /** Advances the fake clock */
  advance: (ms: number) => Promise<void>
  /** Updates the state both apps read */
  set: (patch: Partial<T>) => Promise<void>
}

/**
 * Runs `steps` against a React app, then against a Vue app, both reading one
 * shared state, with fake timers. Returns the snapshots of each.
 */
const walk = async <T extends object>(
  initial: T,
  reactApp: (state: T) => ReactElement,
  vueApp: (state: T) => VNode,
  steps: (tools: Tools<T>) => Promise<void>,
) => {
  let current = { ...initial }
  const listeners = new Set<() => void>()
  const vueState = reactive({ ...initial }) as T

  function ReactApp() {
    const state = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
    )
    return reactApp(state)
  }

  const run = async (action: () => void) => {
    await act(async () => {
      action()
      await settle()
    })
    await flushVue()
    await settle()
    await flushVue()
  }

  // Vue's event invoker skips a listener when the event's timestamp is not
  // later than the moment the listener was attached (`e._vts <= attached`),
  // which guards against listeners added during the same event. With `Date`
  // faked and frozen, every second Vue listener on an event's path would be
  // skipped, so the clock moves 1ms (no timers run) before each DOM event.
  const dispatch = (action: () => void) =>
    run(() => {
      vi.setSystemTime(Date.now() + 1)
      action()
    })

  const tools = (snapshots: string[]): Tools<T> => ({
    snapshot: () => snapshots.push(snapshotDom()),
    fire: (target, event, init) =>
      dispatch(() => {
        ;(fireEvent[event] as (element: Element, init?: object) => boolean)(resolve(target), init)
      }),
    focus: (target) => dispatch(() => (resolve(target) as HTMLElement).focus()),
    blur: (target) => dispatch(() => (resolve(target) as HTMLElement).blur()),
    advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
    set: (patch) =>
      run(() => {
        current = { ...current, ...patch }
        Object.assign(vueState, patch)
        for (const listener of listeners) listener()
      }),
  })

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    const react: string[] = []
    await run(() => {
      render(createElement(ReactApp))
    })
    await steps(tools(react))
    await run(() => cleanup())
    vi.clearAllTimers()

    current = { ...initial }
    Object.assign(vueState, initial)
    const vue: string[] = []
    const { unmount } = mountVue(() => vueApp(vueState))
    await run(() => {})
    await steps(tools(vue))
    unmount()
    vi.clearAllTimers()

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}

const TRIGGER = '[data-testid="trigger"]'
const mouse = { pointerType: "mouse" }

// ---------------------------------------------------------------------------
// Tooltip

type TooltipCase = {
  content?: string | null
  forceOpen?: boolean
  maxWidth?: number | "none"
  openDelay?: number
  interactive?: boolean
  compact?: boolean
  preventUnintentionalClickToClose?: true
  align?: "start" | "center" | "end"
  alignOffset?: number
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  gutterSize?: "sm" | "md" | "lg"
  contentClassName?: string
}

type Callbacks = { onPointerDown?: (event: Event) => void; onClick?: (event: Event) => void }

const reactTooltip = ({ content = "Tooltip text", ...props }: TooltipCase, callbacks: Callbacks = {}) => (
  <ReactTooltip content={content} {...props} {...callbacks}>
    <ReactButton color="secondary" variant="ghost" data-testid="trigger">
      Trigger
    </ReactButton>
  </ReactTooltip>
)

const vueTooltip = ({ content = "Tooltip text", ...props }: TooltipCase, callbacks: Callbacks = {}) =>
  h(
    Tooltip,
    { content, ...props, onPointerdown: callbacks.onPointerDown, onClick: callbacks.onClick },
    { default: () => h(VueButton, { "color": "secondary", "variant": "ghost", "data-testid": "trigger" }, { default: () => "Trigger" }) },
  )

const tooltipCases: Array<[string, TooltipCase]> = [
  ["closed", {}],
  ["forced open", { forceOpen: true }],
  ["forced closed", { forceOpen: false }],
  ["null content never opens", { content: null }],
  ["compact", { forceOpen: true, compact: true }],
  ["numeric maxWidth", { forceOpen: true, maxWidth: 180 }],
  ['maxWidth "none"', { forceOpen: true, maxWidth: "none" }],
  ["gutter sm", { forceOpen: true, gutterSize: "sm" }],
  ["gutter lg", { forceOpen: true, gutterSize: "lg" }],
  ["side bottom, offset 12", { forceOpen: true, side: "bottom", sideOffset: 12 }],
  ["side right, align start, offset 6", { forceOpen: true, side: "right", align: "start", alignOffset: 6 }],
  ["align end", { forceOpen: true, align: "end" }],
  ["content class", { forceOpen: true, contentClassName: "custom-tooltip" }],
  ["interactive", { forceOpen: true, interactive: true }],
]

describe("Tooltip parity", () => {
  test.each(tooltipCases)("%s", async (_name, props) => {
    const { react, vue } = await pair(reactTooltip(props), () => vueTooltip(props))
    expect(vue).toBe(react)
  })

  test("open tooltip: trigger described by the hidden copy, Radix custom properties", async () => {
    const { react, vue } = await pair(reactTooltip({ forceOpen: true }), () => vueTooltip({ forceOpen: true }))
    expect(vue).toBe(react)
    expect(react).toContain('aria-describedby="gen-1"')
    expect(react).toMatch(/<span id="gen-1" role="tooltip"/)
    expect(react).toContain("--radix-tooltip-content-transform-origin: var(--radix-popper-transform-origin)")
    expect(react).not.toContain("[missing]")
  })

  test("rich content is copied into the hidden tooltip text", async () => {
    const { react, vue } = await pair(
      <ReactTooltip content={<strong className="tip">Bold tip</strong>} forceOpen>
        <button data-testid="trigger">Trigger</button>
      </ReactTooltip>,
      () =>
        h(
          Tooltip,
          { forceOpen: true },
          {
            default: () => h("button", { "data-testid": "trigger" }, "Trigger"),
            content: () => h("strong", { class: "tip" }, "Bold tip"),
          },
        ),
    )
    expect(vue).toBe(react)
    expect(react.match(/<strong class="tip">/g)).toHaveLength(2)
  })

  test("attributes on Tooltip land on the trigger, merged Radix-style", async () => {
    const { react, vue } = await pair(
      <ReactTooltip content="Tip" {...({ "className": "outer", "data-extra": "x" } as object)}>
        <button className="inner" data-testid="trigger" data-extra="child">
          Trigger
        </button>
      </ReactTooltip>,
      () =>
        h(
          Tooltip,
          { "content": "Tip", "class": "outer", "data-extra": "x" },
          { default: () => h("button", { "class": "inner", "data-testid": "trigger", "data-extra": "child" }, "Trigger") },
        ),
    )
    expect(vue).toBe(react)
    expect(react).toContain('class="outer inner"')
    expect(react).toContain('data-extra="child"')
  })

  test("a text child renders nothing, as Radix's Slot does", async () => {
    const { react, vue } = await pair(<ReactTooltip content="Tip">Just text</ReactTooltip>, () =>
      h(Tooltip, { content: "Tip" }, { default: () => "Just text" }),
    )
    expect(vue).toBe(react)
    expect(react).not.toContain("Just text")
  })

  test.each([
    ["plain text", "Simple text with tooltip", undefined],
    ["not focusable", "Simple text with tooltip", false],
  ] as const)("TriggerDecorator, %s", async (_name, text, focusable) => {
    const { react, vue } = await pair(
      <ReactTooltip content="Tip" forceOpen>
        <ReactTooltip.TriggerDecorator focusable={focusable} className="decorated">
          {text}
        </ReactTooltip.TriggerDecorator>
      </ReactTooltip>,
      () =>
        h(Tooltip, { content: "Tip", forceOpen: true }, {
          default: () => h(TooltipTriggerDecorator, { focusable, class: "decorated" }, { default: () => text }),
        }),
    )
    expect(vue).toBe(react)
    expect(react).toContain('class="TriggerDecorator decorated"')
  })

  test("TriggerDecorator merges into an element child", async () => {
    const { react, vue } = await pair(
      <ReactTooltip content="Tip">
        <ReactTooltip.TriggerDecorator className="decorated">
          <a href="#docs" className="link" tabIndex={-1}>
            Docs
          </a>
        </ReactTooltip.TriggerDecorator>
      </ReactTooltip>,
      () =>
        h(Tooltip, { content: "Tip" }, {
          default: () =>
            h(TooltipTriggerDecorator, { class: "decorated" }, {
              default: () => h("a", { href: "#docs", class: "link", tabindex: -1 }, "Docs"),
            }),
        }),
    )
    expect(vue).toBe(react)
    expect(react).toContain('class="TriggerDecorator decorated link"')
    expect(react).toContain('tabindex="-1"')
  })

  test.each([
    ["open, clickable", { open: true, clickable: true }],
    ["open, not clickable", { open: true, clickable: false }],
    ["closed", { open: false, clickable: undefined }],
  ] as const)("composed Root/Trigger/Content: %s", async (_name, { open, clickable }) => {
    const { react, vue } = await pair(
      <ReactTooltip.Root open={open} onOpenChange={() => {}}>
        <ReactTooltip.Trigger>
          <button data-testid="trigger">Trigger</button>
        </ReactTooltip.Trigger>
        <ReactTooltip.Content clickable={clickable} compact gutterSize="sm" className="composed">
          Composed
        </ReactTooltip.Content>
      </ReactTooltip.Root>,
      () =>
        h(TooltipRoot, { open }, {
          default: () => [
            h(TooltipTrigger, null, { default: () => h("button", { "data-testid": "trigger" }, "Trigger") }),
            h(TooltipContent, { clickable, compact: true, gutterSize: "sm", class: "composed" }, { default: () => "Composed" }),
          ],
        }),
    )
    expect(vue).toBe(react)
  })

  test("Trigger without asChild renders a button", async () => {
    const { react, vue } = await pair(
      <ReactTooltip.Root open onOpenChange={() => {}}>
        <ReactTooltip.Trigger asChild={false} className="plain">
          Plain trigger
        </ReactTooltip.Trigger>
        <ReactTooltip.Content>Tip</ReactTooltip.Content>
      </ReactTooltip.Root>,
      () =>
        h(TooltipRoot, { open: true }, {
          default: () => [
            h(TooltipTrigger, { asChild: false, class: "plain" }, { default: () => "Plain trigger" }),
            h(TooltipContent, null, { default: () => "Tip" }),
          ],
        }),
    )
    expect(vue).toBe(react)
    expect(react).toContain('<button aria-describedby="gen-1" class="plain" data-state="instant-open">')
  })
})

describe("Tooltip behaviour parity", () => {
  const tooltipWalk = (props: TooltipCase, steps: (tools: Tools<TooltipCase>) => Promise<void>, callbacks?: Callbacks) =>
    walk(
      props,
      (state) => reactTooltip(state, callbacks),
      (state) => vueTooltip(state, callbacks),
      steps,
    )

  test("hover opens after the delay, leaving closes", async () => {
    const result = await tooltipWalk({}, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(100)
      snapshot() // still closed
      await advance(60)
      snapshot() // delayed-open
      await fire(TRIGGER, "pointerLeave", mouse)
      snapshot() // closed
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="tooltip"')
    expect(result.react[1]).toContain('data-state="delayed-open"')
    expect(result.react[2]).not.toContain('role="tooltip"')
  })

  test("touch pointers do not open it", async () => {
    const result = await tooltipWalk({}, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", { pointerType: "touch" })
      await advance(500)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="tooltip"')
  })

  test("re-hovering within the skip delay opens instantly, later it waits again", async () => {
    const result = await tooltipWalk({ openDelay: 200 }, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(200)
      await fire(TRIGGER, "pointerLeave", mouse)
      await advance(100)
      await fire(TRIGGER, "pointerMove", mouse)
      snapshot() // instant-open
      await fire(TRIGGER, "pointerLeave", mouse)
      await advance(400)
      await fire(TRIGGER, "pointerMove", mouse)
      snapshot() // closed: delayed again
      await advance(200)
      snapshot() // delayed-open
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-state="instant-open"')
    expect(result.react[1]).not.toContain('role="tooltip"')
    expect(result.react[2]).toContain('data-state="delayed-open"')
  })

  test("focus opens at once, blur closes", async () => {
    const result = await tooltipWalk({}, async ({ focus, blur, snapshot }) => {
      await focus(TRIGGER)
      snapshot()
      await blur(TRIGGER)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-state="instant-open"')
    expect(result.react[1]).not.toContain('role="tooltip"')
  })

  test("pointer down and click on the trigger close it", async () => {
    const result = await tooltipWalk({}, async ({ focus, fire, snapshot }) => {
      await focus(TRIGGER)
      await fire(TRIGGER, "pointerDown", mouse)
      snapshot()
      await fire(TRIGGER, "pointerUp", mouse)
      await focus(TRIGGER) // already focused: stays closed
      await fire(TRIGGER, "pointerMove", mouse)
      await fire(TRIGGER, "click")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="tooltip"')
    expect(result.react[1]).not.toContain('role="tooltip"')
  })

  test("Escape closes", async () => {
    const result = await tooltipWalk({}, async ({ focus, fire, snapshot }) => {
      await focus(TRIGGER)
      snapshot()
      await fire(() => document.activeElement, "keyDown", { key: "Escape", code: "Escape" })
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="tooltip"')
    expect(result.react[1]).not.toContain('role="tooltip"')
  })

  test("pointer down outside closes", async () => {
    const result = await tooltipWalk({}, async ({ focus, fire, advance, snapshot }) => {
      await focus(TRIGGER)
      await advance(1) // the outside listener is attached on the next task
      await fire(() => document.body, "pointerDown", mouse)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="tooltip"')
  })

  test("preventUnintentionalClickToClose keeps it open for 400ms after opening", async () => {
    const result = await tooltipWalk({ preventUnintentionalClickToClose: true }, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(150)
      await fire(TRIGGER, "pointerDown", mouse)
      await fire(TRIGGER, "click")
      snapshot() // still open
      await advance(400)
      await fire(TRIGGER, "click")
      snapshot() // closed
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="tooltip"')
    expect(result.react[1]).not.toContain('role="tooltip"')
  })

  test("the trigger's own preventDefault keeps it open; pointerdown and click are reported", async () => {
    const reactCalls: string[] = []
    const vueCalls: string[] = []
    let calls = reactCalls
    const result = await walk(
      {},
      () => (
        <ReactTooltip
          content="Tip"
          onPointerDown={() => calls.push("pointerdown")}
          onClick={(event) => {
            calls.push("click")
            event.preventDefault()
          }}
        >
          <button data-testid="trigger" onPointerDown={(event) => event.preventDefault()}>
            Trigger
          </button>
        </ReactTooltip>
      ),
      () => {
        calls = vueCalls
        return h(
          Tooltip,
          {
            content: "Tip",
            onPointerdown: () => calls.push("pointerdown"),
            onClick: (event: MouseEvent) => {
              calls.push("click")
              event.preventDefault()
            },
          },
          { default: () => h("button", { "data-testid": "trigger", "onPointerdown": (event: Event) => event.preventDefault() }, "Trigger") },
        )
      },
      async ({ focus, fire, snapshot }) => {
        await focus(TRIGGER)
        await fire(TRIGGER, "pointerDown", mouse)
        await fire(TRIGGER, "click")
        snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="tooltip"')
    expect(vueCalls).toEqual(reactCalls)
    expect(reactCalls).toEqual(["pointerdown", "click"])
  })

  test("re-entering an interactive tooltip keeps its delayed-open state", async () => {
    const result = await tooltipWalk({ interactive: true }, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(150)
      await fire(TRIGGER, "pointerLeave", mouse)
      await fire(TRIGGER, "pointerMove", mouse) // in transit: ignored, ends the transit
      await fire(TRIGGER, "pointerMove", mouse) // opens again, instantly
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-state="delayed-open"')
  })

  test("content switching to null closes it (conditionally enabled)", async () => {
    const result = await tooltipWalk({ content: "Disabled for reasons" }, async ({ focus, set, snapshot }) => {
      await focus(TRIGGER)
      snapshot()
      await set({ content: null })
      snapshot()
      await set({ content: "Disabled for reasons" })
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="tooltip"')
    expect(result.react[1]).not.toContain('role="tooltip"')
    expect(result.react[2]).toContain('role="tooltip"')
  })

  test("controlled Root reports open changes once per change", async () => {
    const reactChanges: boolean[] = []
    const vueChanges: boolean[] = []
    const result = await walk(
      { open: false },
      (state) => (
        <ReactTooltip.Root open={state.open} onOpenChange={(open) => reactChanges.push(open)} delayDuration={100}>
          <ReactTooltip.Trigger>
            <button data-testid="trigger">Trigger</button>
          </ReactTooltip.Trigger>
          <ReactTooltip.Content>Tip</ReactTooltip.Content>
        </ReactTooltip.Root>
      ),
      (state) =>
        h(TooltipRoot, { "open": state.open, "onUpdate:open": (open: boolean) => vueChanges.push(open), "delayDuration": 100 }, {
          default: () => [
            h(TooltipTrigger, null, { default: () => h("button", { "data-testid": "trigger" }, "Trigger") }),
            h(TooltipContent, null, { default: () => "Tip" }),
          ],
        }),
      async ({ fire, focus, advance, set, snapshot }) => {
        await fire(TRIGGER, "pointerMove", mouse)
        await advance(100) // asks to open, stays closed (controlled)
        snapshot()
        await set({ open: true })
        await focus(TRIGGER) // already open: no report
        snapshot()
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        await set({ open: false })
        snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([true, false])
  })
})

// ---------------------------------------------------------------------------
// CopyTooltip

describe("CopyTooltip parity", () => {
  const writeText = vi.fn(async () => {})

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    writeText.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const copyWalk = (steps: (tools: Tools<object>) => Promise<void>, props: { side?: "bottom"; align?: "start" } = {}) =>
    walk(
      {},
      () => (
        <ReactCopyTooltip copyValue="sess_12345abcdefg" {...props}>
          <ReactTooltip.TriggerDecorator data-testid="trigger">sess_12345abcdefg</ReactTooltip.TriggerDecorator>
        </ReactCopyTooltip>
      ),
      () =>
        h(CopyTooltip, { copyValue: "sess_12345abcdefg", ...props }, {
          default: () => h(TooltipTriggerDecorator, { "data-testid": "trigger" }, { default: () => "sess_12345abcdefg" }),
        }),
      steps,
    )

  test("closed", async () => {
    const result = await copyWalk(async ({ snapshot }) => snapshot())
    expect(result.vue).toEqual(result.react)
  })

  test("hover, copy, copied, auto close, instant reopen", async () => {
    const result = await copyWalk(async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(150)
      snapshot() // "Copy", clickable
      await fire(TRIGGER, "pointerDown", mouse)
      await fire(TRIGGER, "pointerUp", mouse)
      await fire(TRIGGER, "click")
      snapshot() // "Copied!", not clickable
      await advance(999)
      snapshot() // still copied
      await advance(1)
      snapshot() // closed by the timer
      await fire(TRIGGER, "pointerLeave", mouse)
      await advance(1000)
      await fire(TRIGGER, "pointerMove", mouse)
      snapshot() // the provider never heard of that close: instant reopen with "Copy"
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-clickable="true"')
    expect(result.react[0]).toContain('" Copy"')
    expect(result.react[1]).toContain('data-clickable="false"')
    expect(result.react[1]).toContain('" Copied!"')
    expect(result.react[2]).toContain('" Copied!"')
    expect(result.react[3]).not.toContain('role="tooltip"')
    expect(result.react[4]).toContain('data-state="instant-open"')
    expect(result.react[4]).toContain('" Copy"')
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenLastCalledWith("sess_12345abcdefg")
  })

  test("pressing the tooltip copies too; Escape closes", async () => {
    const result = await copyWalk(
      async ({ fire, focus, advance, snapshot }) => {
        await focus(TRIGGER)
        await fire(".Tooltip", "pointerDown", mouse)
        snapshot()
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        snapshot()
        await advance(1000)
        snapshot()
      },
      { side: "bottom", align: "start" },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('" Copied!"')
    expect(result.react[1]).not.toContain('role="tooltip"')
    expect(writeText).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// Popover

type PopoverContentCase = {
  width?: number | "auto"
  minWidth?: number | "auto"
  maxWidth?: number
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  align?: "start" | "center" | "end"
  alignOffset?: number
  translucent?: boolean
  className?: string
  avoidCollisions?: boolean
  autoFocus?: boolean
}

type PopoverCase = {
  open?: boolean
  showOnHover?: boolean
  hoverOpenDelay?: number
  content?: PopoverContentCase
}

type PopoverCallbacks = {
  onOpenChange?: (open: boolean) => void
  onPointerDown?: (event: Event) => void
  onClick?: (event: Event) => void
  /** Click handler on the trigger's child */
  onChildClick?: (event: Event) => void
}

const ReactControls = () => {
  const { close, shake } = useReactPopoverController()
  return (
    <div className="mt-3 flex gap-2">
      <button className="shake" onClick={shake}>
        Shake
      </button>
      <button className="close" onClick={close}>
        Close
      </button>
    </div>
  )
}

const VueControls = defineComponent({
  setup() {
    const { close, shake } = usePopoverController()
    return () =>
      h("div", { class: "mt-3 flex gap-2" }, [
        h("button", { class: "shake", onClick: shake }, "Shake"),
        h("button", { class: "close", onClick: close }, "Close"),
      ])
  },
})

const reactPopover = ({ open, showOnHover, hoverOpenDelay, content = {} }: PopoverCase, callbacks: PopoverCallbacks = {}) => (
  <ReactPopover open={open} onOpenChange={callbacks.onOpenChange} showOnHover={showOnHover} hoverOpenDelay={hoverOpenDelay}>
    <ReactPopover.Trigger onPointerDown={callbacks.onPointerDown} onClick={callbacks.onClick}>
      <ReactButton color="primary" data-testid="trigger" onClick={(event) => callbacks.onChildClick?.(event)}>
        Generate
      </ReactButton>
    </ReactPopover.Trigger>
    <ReactPopover.Content {...content}>
      <div className="p-4">
        <p className="text-sm">Popover content</p>
        <ReactControls />
      </div>
    </ReactPopover.Content>
  </ReactPopover>
)

const vuePopover = ({ open, showOnHover, hoverOpenDelay, content = {} }: PopoverCase, callbacks: PopoverCallbacks = {}) => {
  const { className, ...contentProps } = content
  return h(
    Popover,
    { "open": open, "onUpdate:open": callbacks.onOpenChange, showOnHover, hoverOpenDelay },
    {
      default: () => [
        h(PopoverTrigger, { onPointerdown: callbacks.onPointerDown, onClick: callbacks.onClick }, {
          default: () =>
            h(VueButton, { "color": "primary", "data-testid": "trigger", "onClick": (event: MouseEvent) => callbacks.onChildClick?.(event) }, {
              default: () => "Generate",
            }),
        }),
        h(PopoverContent, { ...contentProps, class: className }, {
          default: () => h("div", { class: "p-4" }, [h("p", { class: "text-sm" }, "Popover content"), h(VueControls)]),
        }),
      ],
    },
  )
}

const popoverCases: Array<[string, PopoverCase]> = [
  ["closed", {}],
  ["open", { open: true }],
  ["width, min and max width", { open: true, content: { width: 320, minWidth: 200, maxWidth: 500 } }],
  ['min width "auto"', { open: true, content: { minWidth: "auto", width: "auto" } }],
  ["side top", { open: true, content: { side: "top" } }],
  ["side right, offset 16", { open: true, content: { side: "right", sideOffset: 16 } }],
  ["align start (default alignOffset -5)", { open: true, content: { align: "start" } }],
  ["align end, alignOffset 10", { open: true, content: { align: "end", alignOffset: 10 } }],
  ["align center", { open: true, content: { align: "center" } }],
  ["translucent", { open: true, content: { translucent: true } }],
  ["panel class", { open: true, content: { className: "flex p-1.5" } }],
  ["open on hover, open", { open: true, showOnHover: true }],
  ["no auto focus", { open: true, content: { autoFocus: false } }],
]

describe.each([
  ["animations off (jsdom default)", true],
  ["animations on (browser)", false],
])("Popover parity, %s", (_mode, disabled) => {
  test.each(popoverCases)("%s", async (_name, props) => {
    const { animation } = await import("./harness")
    animation.disabled = disabled
    const { react, vue } = await pair(reactPopover(props), () => vuePopover(props))
    expect(vue).toBe(react)
  })
})

describe("Popover markup", () => {
  // Known gap: Reka resolves @floating-ui/dom 1.8 and Radix 1.7, whose `size`
  // middleware computes the available width differently when there is no
  // `shift` middleware (avoidCollisions false): -80px vs -40px here for the
  // same zero-size layout. Everything else matches.
  test("no collision avoidance (floating-ui version gap in the available size)", async () => {
    const props = { open: true, content: { avoidCollisions: false } }
    const { react, vue } = await pair(reactPopover(props), () => vuePopover(props))
    const withoutAvailableSize = (dom: string) => dom.replace(/--radix-popper-available-(width|height): -?\d+px; /g, "")
    expect(withoutAvailableSize(vue)).toBe(withoutAvailableSize(react))
    expect(react).toContain("--radix-popper-available-width: -80px")
    expect(vue).toContain("--radix-popper-available-width: -40px")
  })

  test("open: trigger controls the dialog, Radix custom properties, focus on the panel", async () => {
    const { react, vue } = await pair(reactPopover({ open: true }), () => vuePopover({ open: true }))
    expect(vue).toBe(react)
    expect(react).toMatch(/aria-controls="(gen-1)"[^\n]*\n[\s\S]*<div class="Popover"[^>]*id="gen-1"/)
    expect(react).toContain('role="dialog"')
    expect(react).toContain('tabindex="-1"')
    expect(react).toContain("--radix-popover-content-available-width: var(--radix-popper-available-width)")
    expect(react).toMatch(/focus: <div class="Popover" role="dialog">/)
  })
})

describe("Popover behaviour parity", () => {
  const popoverWalk = (props: PopoverCase, steps: (tools: Tools<PopoverCase>) => Promise<void>, callbacks?: PopoverCallbacks) =>
    walk(
      props,
      (state) => reactPopover(state, callbacks),
      (state) => vuePopover(state, callbacks),
      steps,
    )

  // What a browser does for a mouse press on the trigger
  const press = async ({ fire, focus }: Tools<PopoverCase>, target: Target = TRIGGER) => {
    await fire(target, "pointerDown", mouse)
    await focus(target)
    await fire(target, "pointerUp", mouse)
    await fire(target, "click")
  }

  test("clicking the trigger opens and closes; focus moves in and back", async () => {
    const result = await popoverWalk({}, async (tools) => {
      const { fire, advance, snapshot } = tools
      await fire(TRIGGER, "click")
      await advance(0)
      snapshot() // open, panel focused
      await advance(1)
      await press(tools)
      await advance(1)
      snapshot() // closed, trigger focused
      await press(tools)
      await advance(1)
      snapshot() // open again
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/focus: <div class="Popover" role="dialog">/)
    expect(result.react[1]).not.toContain('role="dialog"')
    expect(result.react[1]).toMatch(/focus: <button class="Button"/)
    expect(result.react[2]).toContain('role="dialog"')
  })

  test("Escape closes and returns focus to the trigger", async () => {
    const result = await popoverWalk({}, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "click")
      await advance(1)
      await fire(() => document.activeElement, "keyDown", { key: "Escape", code: "Escape" })
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[0]).toMatch(/focus: <button class="Button"/)
  })

  test("pointer down outside closes without moving focus to the trigger", async () => {
    const result = await popoverWalk({}, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "click")
      await advance(1)
      await fire(() => document.body, "pointerDown", mouse)
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[0]).toContain("focus: body")
  })

  test("the controller shakes and closes from inside the content", async () => {
    const result = await popoverWalk({}, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "click")
      await advance(1)
      await fire(".shake", "click")
      snapshot() // shake cleared, waiting for the frame
      await advance(40)
      snapshot() // data-animate="shake"
      await fire(".shake", "click")
      snapshot() // cleared again
      await advance(40)
      await fire(".close", "click")
      await advance(1)
      snapshot() // closed
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('data-animate="shake"')
    expect(result.react[1]).toContain('data-animate="shake"')
    expect(result.react[2]).not.toContain('data-animate="shake"')
    expect(result.react[3]).not.toContain('role="dialog"')
  })

  test("the content slot's { close, shake } match usePopoverController()", async () => {
    type Controller = { close: () => void; shake: () => void }
    const result = await walk(
      {},
      () => reactPopover({}),
      () =>
        h(Popover, null, {
          default: () => [
            h(PopoverTrigger, null, {
              default: () => h(VueButton, { "color": "primary", "data-testid": "trigger" }, { default: () => "Generate" }),
            }),
            h(PopoverContent, null, {
              default: ({ close, shake }: Controller) =>
                h("div", { class: "p-4" }, [
                  h("p", { class: "text-sm" }, "Popover content"),
                  h("div", { class: "mt-3 flex gap-2" }, [
                    h("button", { class: "shake", onClick: shake }, "Shake"),
                    h("button", { class: "close", onClick: close }, "Close"),
                  ]),
                ]),
            }),
          ],
        }),
      async ({ fire, advance, snapshot }) => {
        await fire(TRIGGER, "click")
        await advance(1)
        await fire(".shake", "click")
        await advance(40)
        snapshot()
        await fire(".close", "click")
        await advance(1)
        snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-animate="shake"')
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("Shift+Tab on the panel moves focus to its last focusable element", async () => {
    const result = await popoverWalk({}, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "click")
      await advance(1)
      await fire('[role="dialog"]', "keyDown", { key: "Tab", shiftKey: true })
      snapshot()
      // In jsdom the trigger has no size, so the popper hides the panel
      // (`visibility: hidden`) and neither focus scope finds a tabbable
      // element to loop to: focus stays put in both
      await fire(() => document.activeElement, "keyDown", { key: "Tab" })
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/focus: <button class="close">/)
    expect(result.react[1]).toMatch(/focus: <button class="close">/)
  })

  test("preventDefault in the trigger child's click keeps it closed; trigger events are reported", async () => {
    const reactCalls: string[] = []
    const vueCalls: string[] = []
    let calls = reactCalls
    const callbacks: PopoverCallbacks = {
      onOpenChange: (open) => calls.push(`open ${open}`),
      onPointerDown: () => calls.push("pointerdown"),
      onClick: () => calls.push("click"),
      onChildClick: (event) => {
        calls.push("child click")
        event.preventDefault()
      },
    }
    const result = await walk(
      {},
      () => reactPopover({}, callbacks),
      () => {
        calls = vueCalls
        return vuePopover({}, callbacks)
      },
      async ({ fire, snapshot }) => {
        await fire(TRIGGER, "pointerDown", mouse)
        await fire(TRIGGER, "click")
        snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(vueCalls).toEqual(reactCalls)
    expect(reactCalls).toEqual(["pointerdown", "child click", "click"])
  })

  test("controlled: the trigger asks, the owner decides", async () => {
    const reactChanges: boolean[] = []
    const vueChanges: boolean[] = []
    let changes = reactChanges
    const result = await walk(
      { open: false } as PopoverCase,
      (state) => reactPopover(state, { onOpenChange: (open) => changes.push(open) }),
      (state) => {
        changes = vueChanges
        return vuePopover(state, { onOpenChange: (open) => changes.push(open) })
      },
      async ({ fire, set, advance, snapshot }) => {
        await fire(TRIGGER, "click")
        snapshot() // still closed
        await set({ open: true })
        await advance(1)
        snapshot() // open
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        snapshot() // still open
        await set({ open: false })
        await advance(1)
        snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([true, false])
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[2]).toContain('role="dialog"')
  })

  test("hover: opens after the delay without taking focus, ignores clicks for 500ms", async () => {
    const result = await popoverWalk({ showOnHover: true }, async (tools) => {
      const { fire, advance, snapshot } = tools
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(100)
      snapshot() // closed
      await advance(50)
      snapshot() // open, focus untouched
      await fire(TRIGGER, "click")
      snapshot() // click right after opening is ignored
      await advance(500)
      await fire(TRIGGER, "click")
      await advance(1)
      snapshot() // now it toggles closed
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[1]).toContain('role="dialog"')
    expect(result.react[1]).toContain("focus: body")
    expect(result.react[2]).toContain('role="dialog"')
    expect(result.react[3]).not.toContain('role="dialog"')
  })

  test("hover: leaving before the delay cancels; touch never opens", async () => {
    const result = await popoverWalk({ showOnHover: true, hoverOpenDelay: 300 }, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(200)
      await fire(TRIGGER, "pointerLeave", mouse)
      await advance(500)
      snapshot()
      await fire(TRIGGER, "pointerMove", { pointerType: "touch" })
      await advance(500)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("hover: focus opens at once, blur closes after 50ms", async () => {
    const result = await popoverWalk({ showOnHover: true }, async ({ focus, blur, advance, snapshot }) => {
      await focus(TRIGGER)
      snapshot()
      await blur(TRIGGER)
      await advance(40)
      snapshot() // still open
      await advance(10)
      snapshot() // closed
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[0]).toMatch(/focus: <button class="Button"/)
    expect(result.react[1]).toContain('role="dialog"')
    expect(result.react[2]).not.toContain('role="dialog"')
  })

  test("hover: Tab moves into the panel, closing returns focus to the trigger", async () => {
    const result = await popoverWalk({ showOnHover: true }, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(150)
      await fire(() => document.body, "keyDown", { key: "Tab" })
      snapshot() // first button focused
      await fire(() => document.activeElement, "keyDown", { key: "Escape" })
      await advance(1)
      snapshot() // closed, trigger focused
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/focus: <button class="shake">/)
    expect(result.react[1]).not.toContain('role="dialog"')
    expect(result.react[1]).toMatch(/focus: <button class="Button"/)
  })

  test("hover: leaving the trigger and the grace area closes it", async () => {
    const result = await popoverWalk({ showOnHover: true }, async ({ fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerMove", mouse)
      await advance(150)
      await fire(TRIGGER, "pointerLeave", { ...mouse, clientX: 0, clientY: 0 })
      await fire(() => document.body, "pointerMove", { ...mouse, clientX: 2, clientY: 1 })
      snapshot() // inside the grace triangle: still open
      await fire(() => document.body, "pointerMove", { ...mouse, clientX: 200, clientY: 200 })
      await advance(1)
      snapshot() // outside: closed
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[1]).not.toContain('role="dialog"')
  })
})
