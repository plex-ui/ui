import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, createRef, useSyncExternalStore, type ComponentType, type ReactElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createApp, defineComponent, h, reactive, ref, Transition, type Component, type VNode, type VNodeChild } from "vue"
import { Badge as ReactBadge } from "../../packages/ui/src/components/Badge"
import * as ReactIcons from "../../packages/ui/src/components/Icon"
import * as ReactSidebar from "../../packages/ui/src/components/Sidebar"
import { Badge as VueBadge } from "../../packages/vue/src/components/Badge"
import * as VueIcons from "../../packages/vue/src/components/Icon"
import * as VueSidebar from "../../packages/vue/src/components/Sidebar"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// React-vs-Vue parity for Sidebar: every part, the provider's collapse state
// (controlled and uncontrolled), collapsible modes, the Cmd/Ctrl+B shortcut,
// mobile mode (matchMedia stubbed the same way for both), tooltips in the
// collapsed rail, asChild, the content overflow attribute and useSidebar.
//
// Trees are described once (`n(part, props, ...children)`) and rendered by
// each framework with its own components: `class` becomes `className` for
// React, `onOpenChange` becomes `onUpdate:open` for Vue, children become the
// default slot. Open tooltips are positioned by Radix's / Reka's popper; the
// wrapper's `--reka-popper-*` names and `dir` are normalized as in
// tooltip-popover.test.tsx.

// ---------------------------------------------------------------------------
// Environment: matchMedia (mobile flag) and ResizeObserver

let mobile = false
const mediaListeners = new Set<() => void>()
const MOBILE_QUERY = "(max-width: 767px)"

class FakeResizeObserver {
  static instances = new Set<FakeResizeObserver>()
  constructor(readonly callback: () => void) {}
  observe() {
    FakeResizeObserver.instances.add(this)
  }
  unobserve() {}
  disconnect() {
    FakeResizeObserver.instances.delete(this)
  }
}

beforeEach(() => {
  mobile = false
  mediaListeners.clear()
  FakeResizeObserver.instances.clear()
  vi.stubGlobal("ResizeObserver", FakeResizeObserver)
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === MOBILE_QUERY ? mobile : false
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
    addListener: (listener: () => void) => mediaListeners.add(listener),
    removeListener: (listener: () => void) => mediaListeners.delete(listener),
    dispatchEvent: () => true,
  }))
  document.cookie = "sidebar:state=; path=/; max-age=0"
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Tree descriptions rendered by both frameworks

type Props = Record<string, unknown>
type Spec = string | { t: string; p?: Props; c: Spec[] }

const n = (t: string, p?: Props | null, ...c: Spec[]): Spec => ({ t, p: p ?? undefined, c })

// Shows the useSidebar() context
const contextText = (context: ReactSidebar.SidebarContextValue | VueSidebar.SidebarContextValue) =>
  [
    `state=${context.state}`,
    `open=${context.open}`,
    `openMobile=${context.openMobile}`,
    `isMobile=${context.isMobile}`,
    `collapsible=${context.collapsible}`,
  ].join(" ")

function ReactProbe() {
  const context = ReactSidebar.useSidebar()
  return (
    <div data-probe="">
      <output>{contextText(context)}</output>
      <button data-testid="set-open-false" onClick={() => context.setOpen(false)}>
        setOpen(false)
      </button>
      <button data-testid="set-open-true" onClick={() => context.setOpen(true)}>
        setOpen(true)
      </button>
      <button data-testid="set-open-mobile" onClick={() => context.setOpenMobile(true)}>
        setOpenMobile(true)
      </button>
      <button data-testid="toggle" onClick={() => context.toggleSidebar()}>
        toggleSidebar()
      </button>
    </div>
  )
}

const VueProbe = defineComponent({
  setup() {
    const context = VueSidebar.useSidebar()
    return () =>
      h("div", { "data-probe": "" }, [
        h("output", null, contextText(context)),
        h("button", { "data-testid": "set-open-false", "onClick": () => context.setOpen(false) }, "setOpen(false)"),
        h("button", { "data-testid": "set-open-true", "onClick": () => context.setOpen(true) }, "setOpen(true)"),
        h("button", { "data-testid": "set-open-mobile", "onClick": () => context.setOpenMobile(true) }, "setOpenMobile(true)"),
        h("button", { "data-testid": "toggle", "onClick": () => context.toggleSidebar() }, "toggleSidebar()"),
      ])
  },
})

const reactTypes: Record<string, unknown> = { ...ReactIcons, ...ReactSidebar, Badge: ReactBadge, Probe: ReactProbe }
const vueTypes: Record<string, unknown> = { ...VueIcons, ...VueSidebar, Badge: VueBadge, Probe: VueProbe }

const VUE_PROP_NAMES: Record<string, string> = {
  onOpenChange: "onUpdate:open",
  onOpenMobileChange: "onUpdate:openMobile",
  onKeyDown: "onKeydown",
}

const toReact = (spec: Spec): ReactNode => {
  if (typeof spec === "string") return spec
  const type = (reactTypes[spec.t] ?? spec.t) as ComponentType<Props> | string
  const { class: className, ...rest } = spec.p ?? {}
  const props: Props = className === undefined ? rest : { ...rest, className }
  return createElement(type, props, ...spec.c.map(toReact))
}

const toVue = (spec: Spec): VNodeChild => {
  if (typeof spec === "string") return spec
  const props: Props = {}
  for (const [key, value] of Object.entries(spec.p ?? {})) props[VUE_PROP_NAMES[key] ?? key] = value
  const type = vueTypes[spec.t] as Component | undefined
  if (!type) return h(spec.t, props, spec.c.map(toVue))
  return spec.c.length ? h(type, props, { default: () => spec.c.map(toVue) }) : h(type, props)
}

const reactTree = (spec: Spec) => toReact(spec) as ReactElement
const vueTree = (spec: Spec) => toVue(spec) as VNode

// ---------------------------------------------------------------------------
// Rendering and walking

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

const pair = async (spec: Spec) => {
  await act(async () => {
    render(reactTree(spec))
    await settle()
  })
  const react = snapshotDom()
  cleanup()

  const { unmount } = mountVue(() => vueTree(spec))
  await flushVue()
  await settle()
  await flushVue()
  const vue = snapshotDom()
  unmount()
  return { react, vue }
}

type Target = string | (() => Element | null)
const resolve = (target: Target) => {
  const element = typeof target === "string" ? document.querySelector(target) : target()
  if (!element) throw new Error(`No element for ${String(target)}`)
  return element
}

type WalkOptions = {
  /** Starts both apps in the mobile viewport */
  mobile?: boolean
  /** Runs before each framework mounts */
  beforeMount?: () => void
}

type Tools<T> = {
  /** Records the serialized DOM */
  snapshot: () => void
  /** Records a line of text (callback calls, event results) */
  note: (text: string) => void
  /** Fires a DOM event; returns false when a listener called preventDefault() */
  fire: (target: Target, event: keyof typeof fireEvent, init?: object) => Promise<boolean>
  focus: (target: Target) => Promise<void>
  /** Dispatches a bubbling, cancelable event with these fields (touches, timeStamp) */
  dispatch: (target: Target, type: string, fields: Record<string, unknown>) => Promise<boolean>
  /** Advances the fake clock */
  advance: (ms: number) => Promise<void>
  /** Updates the state both apps read */
  set: (patch: Partial<T>) => Promise<void>
  /** Switches the stubbed viewport between mobile and desktop */
  setMobile: (value: boolean) => Promise<void>
}

/**
 * Runs `steps` against a React app, then against a Vue app, both reading one
 * shared state (`apply` updates it from inside the apps), with fake timers.
 */
const walk = async <T extends object>(
  initial: T,
  reactApp: (state: T, apply: (patch: Partial<T>) => void) => ReactElement,
  vueApp: (state: T, apply: (patch: Partial<T>) => void) => VNode,
  steps: (tools: Tools<T>) => Promise<void>,
  options: WalkOptions = {},
) => {
  let current = { ...initial }
  const listeners = new Set<() => void>()
  const vueState = reactive({ ...initial }) as T
  const apply = (patch: Partial<T>) => {
    current = { ...current, ...patch }
    Object.assign(vueState, patch)
    for (const listener of listeners) listener()
  }

  function ReactApp() {
    const state = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
    )
    return reactApp(state, apply)
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

  // Vue skips a listener when the event is not later than the listener's
  // attach time; with a frozen fake Date, move the clock 1ms per event
  const tools = (snapshots: string[]): Tools<T> => ({
    snapshot: () => snapshots.push(snapshotDom()),
    note: (text) => snapshots.push(text),
    fire: async (target, event, init) => {
      let result = true
      await run(() => {
        vi.setSystemTime(Date.now() + 1)
        result = (fireEvent[event] as (element: Element | Window, init?: object) => boolean)(
          target === "window" ? (window as never) : resolve(target),
          init,
        )
      })
      return result
    },
    focus: (target) =>
      run(() => {
        vi.setSystemTime(Date.now() + 1)
        ;(resolve(target) as HTMLElement).focus()
      }),
    dispatch: async (target, type, fields) => {
      let result = true
      await run(() => {
        const event = new Event(type, { bubbles: true, cancelable: true })
        for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value })
        result = resolve(target).dispatchEvent(event)
      })
      return result
    },
    advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
    set: (patch) => run(() => apply(patch)),
    setMobile: (value) =>
      run(() => {
        mobile = value
        for (const listener of mediaListeners) listener()
      }),
  })

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    mobile = options.mobile ?? false
    document.cookie = "sidebar:state=; path=/; max-age=0"
    options.beforeMount?.()
    const react: string[] = []
    await run(() => {
      render(createElement(ReactApp))
    })
    await steps(tools(react))
    await run(() => cleanup())
    vi.clearAllTimers()

    mobile = options.mobile ?? false
    document.cookie = "sidebar:state=; path=/; max-age=0"
    options.beforeMount?.()
    current = { ...initial }
    Object.assign(vueState, initial)
    const vue: string[] = []
    const { unmount } = mountVue(() => vueApp(vueState, apply))
    await run(() => {})
    await steps(tools(vue))
    unmount()
    vi.clearAllTimers()

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}

/** A walk over one tree description built from the shared state. */
const walkSpec = <T extends object>(
  initial: T,
  spec: (state: T, apply: (patch: Partial<T>) => void) => Spec,
  steps: (tools: Tools<T>) => Promise<void>,
  options?: WalkOptions,
) =>
  walk(
    initial,
    (state, apply) => reactTree(spec(state, apply)),
    (state, apply) => vueTree(spec(state, apply)),
    steps,
    options,
  )

// ---------------------------------------------------------------------------
// Fixtures

const navItem = (label: string, icon: string, buttonProps: Props = {}, ...extra: Spec[]) =>
  n(
    "SidebarMenuItem",
    null,
    n(
      "SidebarMenuButton",
      { tooltip: label, ...buttonProps },
      n("SidebarMenuButtonIcon", null, n(icon)),
      n("SidebarMenuButtonLabel", null, label),
      ...extra,
    ),
  )

const fullSidebar = (providerProps: Props = {}, sidebarProps: Props = {}, ...extraContent: Spec[]) =>
  n(
    "SidebarProvider",
    providerProps,
    n(
      "SidebarLayout",
      { class: "h-full" },
      n(
        "Sidebar",
        sidebarProps,
        n("SidebarHeader", null, n("span", { class: "wordmark" }, "App"), n("SidebarTrigger")),
        n(
          "SidebarContent",
          null,
          n(
            "SidebarGroup",
            null,
            n("SidebarGroupLabel", { size: "sm" }, "Project"),
            n("SidebarGroupAction", { title: "Add" }, n("Plus")),
            n(
              "SidebarGroupContent",
              null,
              n(
                "SidebarMenu",
                null,
                navItem("Overview", "Home", { isActive: true }),
                navItem("Projects", "Folder", {}, n("SidebarMenuBadge", null, n("Badge", { size: "sm", color: "info" }, "New"))),
                n(
                  "SidebarMenuItem",
                  { expanded: true },
                  n(
                    "SidebarMenuButton",
                    null,
                    n("SidebarMenuButtonIcon", null, n("Code")),
                    n("SidebarMenuButtonLabel", { shortLabel: "Docs" }, "Documentation"),
                    n("SidebarMenuChevron"),
                  ),
                  n("SidebarMenuAction", null, n("DotsHorizontal")),
                  n(
                    "SidebarMenuSub",
                    { hasIcons: true },
                    n("SidebarMenuSubItem", null, n("SidebarMenuSubButton", { indent: 1, isActive: true }, "Introduction")),
                    n("SidebarMenuSubItem", null, n("SidebarMenuSubButton", { indent: 2 }, "Installation")),
                  ),
                ),
                n("SidebarMenuItem", null, n("SidebarMenuSkeleton")),
                ...extraContent,
              ),
            ),
          ),
          n("SidebarSeparator"),
          n(
            "SidebarGroup",
            { defaultOpen: false },
            n("SidebarGroupLabel", null, "Resources"),
            n(
              "SidebarGroupContent",
              null,
              n("SidebarMenu", null, navItem("Logs", "Code"), navItem("Console", "Terminal")),
            ),
          ),
        ),
        n(
          "SidebarFooter",
          null,
          n(
            "SidebarCard",
            { dismissible: true },
            n("SidebarCardHeader", null, n("SidebarCardTitle", null, "Plan")),
            n("SidebarCardTitleLink", { href: "#plans" }, "Upgrade to Pro"),
            n("SidebarCardContent", null, "Unlock higher rate limits."),
            n("SidebarCardFooter", null, n("button", { type: "button" }, "View Plans")),
          ),
          n("SidebarFooterLinks", null, n("a", { href: "#privacy" }, "Privacy")),
        ),
        n("SidebarRail"),
      ),
      n("SidebarInset", null, n("h1", null, "Overview")),
    ),
  )

// ---------------------------------------------------------------------------
// Markup

describe("Sidebar markup", () => {
  const cases: Array<[string, Spec, boolean?]> = [
    ["full sidebar, defaults (expanded, offcanvas)", fullSidebar()],
    ["defaultOpen false (collapsed)", fullSidebar({ defaultOpen: false })],
    ["collapsible icon, expanded: no tooltips", fullSidebar({ collapsible: "icon" })],
    ["collapsible icon, collapsed: tooltips wrap the buttons", fullSidebar({ collapsible: "icon", defaultOpen: false })],
    ['collapsible "none": no trigger', fullSidebar({ collapsible: "none" })],
    ["controlled open false wins over defaultOpen", fullSidebar({ open: false, defaultOpen: true })],
    ["controlled open true wins over defaultOpen", fullSidebar({ open: true, defaultOpen: false })],
    [
      "provider class and style (custom properties merged, caller wins)",
      fullSidebar({ "class": "h-full app", "style": { "--sidebar-width": "300px", "height": "500px" }, "data-testid": "dropped" }),
    ],
    ["side right, docs variant, class and attributes", fullSidebar({}, { "side": "right", "variant": "docs", "class": "custom", "id": "nav", "data-toggle": "x", "data-testid": "aside" })],
    ["mobile, offcanvas: no aside, trigger opens the menu", fullSidebar(), true],
    ["mobile, icon collapsed: aside, no tooltips", fullSidebar({ collapsible: "icon", defaultOpen: false }), true],
  ]

  test.each(cases)("%s", async (_name, spec, isMobile) => {
    mobile = !!isMobile
    const { react, vue } = await pair(spec)
    expect(vue).toBe(react)
  })

  test("collapsed rail: each button with a tooltip is a closed tooltip trigger", async () => {
    const { react, vue } = await pair(fullSidebar({ collapsible: "icon", defaultOpen: false }))
    expect(vue).toBe(react)
    // Four tooltip triggers, plus the closed Resources group
    expect(react.match(/data-state="closed"/g)).toHaveLength(5)
    expect(react).toContain('aria-label="Expand sidebar"')
    expect(react).toContain('data-sidebar="collapsed"')
  })

  test('variant "app": 260 wide, its own class, the default stays 240', async () => {
    const { react, vue } = await walkSpec(
      {},
      () => fullSidebar({ collapsible: "icon", variant: "app" }),
      async ({ snapshot }) => snapshot(),
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain("--sidebar-width: 260px")
    expect(react[0]).toMatch(/class="[^"]*App/)
    const plain = await walkSpec({}, () => fullSidebar({ collapsible: "icon" }), async ({ snapshot }) => snapshot())
    expect(plain.react[0]).toContain("--sidebar-width: 240px")
    expect(plain.react[0]).not.toMatch(/class="[^"]*App/)
  })

  test("mobile offcanvas hides the aside, desktop keeps it", async () => {
    mobile = true
    const { react } = await pair(fullSidebar())
    expect(react).not.toContain("<aside")
    expect(react).toContain("<main")
  })

  test("data-toggle is dropped and caller attributes win over the part's own", async () => {
    const spec = n(
      "SidebarProvider",
      null,
      n("SidebarHeader", { "data-toggle": "x", "class": "h", "data-x": "1" }, "Header"),
      n("SidebarMenuItem", { "expanded": true, "data-expanded": "caller" }, "Item"),
      n("SidebarMenuButton", { "isActive": true, "aria-current": "step", "type": "submit" }, "Button"),
      n("SidebarTrigger", { "aria-label": "Toggle", "type": "submit" }),
    )
    const { react, vue } = await pair(spec)
    expect(vue).toBe(react)
    expect(react).not.toContain("data-toggle")
    expect(react).toContain('data-expanded="caller"')
    expect(react).toContain('aria-current="step"')
    expect(react).toContain('aria-label="Toggle"')
  })

  const parts: Array<[string, Spec]> = [
    ["SidebarGroup defaultOpen false", n("SidebarGroup", { defaultOpen: false }, "Group")],
    ["SidebarGroup open true over defaultOpen false", n("SidebarGroup", { open: true, defaultOpen: false }, "Group")],
    ["SidebarGroup open false", n("SidebarGroup", { open: false, class: "g" }, "Group")],
    ["SidebarGroupLabel lg (default)", n("SidebarGroupLabel", { class: "label" }, "Label")],
    [
      "SidebarGroupLabel asChild merges into the child",
      n("SidebarGroupLabel", { asChild: true, size: "sm", class: "outer", title: "slot" }, n("a", { href: "#x", class: "inner", title: "child" }, "Link")),
    ],
    ["SidebarMenuItem expanded false", n("SidebarMenuItem", { expanded: false }, "Item")],
    ["SidebarMenuButton inactive", n("SidebarMenuButton", { class: "b" }, "Item")],
    ["SidebarMenuButton active", n("SidebarMenuButton", { isActive: true }, "Item")],
    [
      "SidebarMenuButton asChild puts the button attributes on the child, the inner span inside it",
      n("SidebarMenuButton", { asChild: true, isActive: true, class: "outer", title: "t" }, n("a", { href: "#home", class: "inner" }, "Home")),
    ],
    [
      "SidebarMenuButton asChild with a component child wraps the component's content",
      n("SidebarMenuButton", { asChild: true, isActive: true, class: "outer" }, n("Badge", { color: "info", class: "inner" }, "New")),
    ],
    [
      "SidebarMenuButton asChild with an empty element child",
      n("SidebarMenuButton", { asChild: true, title: "t" }, n("a", { href: "#empty" })),
    ],
    [
      "SidebarMenuButton asChild without a single element child merges into the inner span",
      n("SidebarMenuButton", { asChild: true, isActive: true, class: "outer" }, n("a", { href: "#a" }, "A"), n("a", { href: "#b" }, "B")),
    ],
    ["SidebarMenuButtonLabel with shortLabel and class", n("SidebarMenuButtonLabel", { shortLabel: "Short", class: "c", title: "only-long" }, "A long label")],
    ["SidebarMenuButtonLabel empty shortLabel", n("SidebarMenuButtonLabel", { shortLabel: "" }, "Label")],
    ["SidebarMenuChevron ignores children", n("SidebarMenuChevron", { class: "ml-auto" }, "ignored")],
    ["SidebarMenuSkeleton without icon, label width", n("SidebarMenuSkeleton", { showIcon: false, labelWidth: "80%", class: "s" }, "ignored")],
    ["SidebarMenuSub closed, no icons", n("SidebarMenuSub", { open: false }, n("SidebarMenuSubItem", null, "Sub"))],
    ...([0, 1, 2, 3] as const).map((indent): [string, Spec] => [
      `SidebarMenuSubButton indent ${indent}`,
      n("SidebarMenuSubButton", { indent, isActive: indent === 2 }, `Level ${indent}`),
    ]),
    ["SidebarMenuSubButton unknown indent", n("SidebarMenuSubButton", { indent: 5 }, "Deep")],
    [
      "SidebarMenuSubButton asChild",
      n("SidebarMenuSubButton", { asChild: true, indent: 1, isActive: true, class: "outer" }, n("a", { href: "#a", class: "inner" }, "Link")),
    ],
    ["SidebarSeparator", n("SidebarSeparator", { class: "sep" })],
    ["SidebarCard elevated, not dismissible", n("SidebarCard", { variant: "elevated" }, n("SidebarCardContent", null, "Body"))],
    ["SidebarCardTitleLink", n("SidebarCardTitleLink", { href: "#x", class: "l", target: "_blank" }, "Read more")],
    ["SidebarTrigger with a custom icon", n("SidebarTrigger", { class: "t" }, n("SidebarCollapseLeft"))],
    ["SidebarMobileMenuButton closed", n("SidebarMobileMenuButton", { class: "m" }, "ignored")],
    ["SidebarMobile", n("SidebarMobile", { class: "drawer" }, n("SidebarMobileHeader", null, "Header"), n("SidebarMobileFooter", null, "Footer"))],
    ["SidebarMobile contained", n("SidebarMobile", { contained: true, id: "drawer" }, "Drawer")],
    ["SidebarInput", n("SidebarInput", { placeholder: "Search", class: "search", size: "sm" })],
    ["SidebarInput with value and a clear button", n("SidebarInput", { value: "plex", onClear: () => {}, variant: "soft", onChange: () => {} })],
    ["SidebarInset, SidebarLayout, SidebarRail", n("SidebarLayout", null, n("SidebarRail", { class: "r" }), n("SidebarInset", { class: "i" }, "Main"))],
  ]

  test.each(parts)("%s", async (_name, part) => {
    const { react, vue } = await pair(n("SidebarProvider", { collapsible: "icon" }, part))
    expect(vue).toBe(react)
  })

  test("SidebarMenuButton asChild: the link is the button", async () => {
    const { react, vue } = await pair(
      n("SidebarProvider", null, n("SidebarMenuButton", { asChild: true, isActive: true }, n("a", { href: "#home" }, "Home"))),
    )
    expect(vue).toBe(react)
    expect(react).toMatch(/<a aria-current="page" class="MenuButton" data-active="true" href="#home">\s*<span class="MenuButtonInner">/)
  })

  test("a closed SidebarMenuSub is inert, an open one is not", async () => {
    const sub = (open: boolean) => n("SidebarMenuSub", { open }, n("SidebarMenuSubItem", null, n("SidebarMenuSubButton", null, "Sub")))
    const { react, vue } = await pair(n("SidebarProvider", null, sub(false), sub(true)))
    expect(vue).toBe(react)
    expect(react.match(/ inert=""/g)).toHaveLength(1)
    expect(react).toMatch(/data-state="closed" inert=""/)
  })

  test("asChild with a text child: React's Slot throws (radix-ui 1.8.1), Vue renders nothing and warns", async () => {
    const spec = n("SidebarProvider", null, n("SidebarGroupLabel", { asChild: true }, "Text"))
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      await expect(
        act(async () => {
          render(reactTree(spec))
        }),
      ).rejects.toThrow(/failed to slot onto its children/)
    } finally {
      error.mockRestore()
      cleanup()
    }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      const { unmount } = mountVue(() => vueTree(spec))
      await flushVue()
      expect(document.body.textContent).toBe("")
      expect(document.body.querySelector("[data-size]")).toBeNull()
      expect(warn.mock.calls.map((call) => String(call[0]))).toContainEqual(
        expect.stringMatching(/failed to slot onto its children/),
      )
      unmount()
    } finally {
      warn.mockRestore()
    }
  })

  test("SidebarMenuButton asChild with a lone text child wraps it without a warning", async () => {
    const spec = n("SidebarProvider", null, n("SidebarMenuButton", { asChild: true }, "Text"))
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      const { unmount } = mountVue(() => vueTree(spec))
      await flushVue()
      expect(document.body.textContent).toBe("Text")
      expect(warn.mock.calls.map((call) => String(call[0])).join("\n")).not.toMatch(/failed to slot/)
      unmount()
    } finally {
      warn.mockRestore()
    }
  })

  test("SidebarInput passes slots and the start adornment can be replaced", async () => {
    const react = await (async () => {
      await act(async () => {
        render(
          <ReactSidebar.SidebarProvider>
            <ReactSidebar.SidebarInput startAdornment={<ReactIcons.Filter />} endAdornment={<span>⌘K</span>} placeholder="Find" />
          </ReactSidebar.SidebarProvider>,
        )
      })
      const dom = snapshotDom()
      cleanup()
      return dom
    })()
    const { unmount } = mountVue(() =>
      h(VueSidebar.SidebarProvider, null, {
        default: () =>
          h(VueSidebar.SidebarInput, { placeholder: "Find" } as never, {
            startAdornment: () => h(VueIcons.Filter),
            endAdornment: () => h("span", null, "⌘K"),
          }),
      }),
    )
    await flushVue()
    const vue = snapshotDom()
    unmount()
    expect(vue).toBe(react)
    expect(react).toContain("⌘K")
  })

  test("SidebarInput forwards the imperative API to the input (React: ref)", async () => {
    const reactRef = createRef<HTMLInputElement>()
    await act(async () => {
      render(
        <ReactSidebar.SidebarProvider>
          <ReactSidebar.SidebarInput ref={reactRef} placeholder="Search" />
        </ReactSidebar.SidebarProvider>,
      )
    })
    await act(async () => reactRef.current!.focus())
    const react = { isInput: reactRef.current === document.querySelector("input"), focused: document.activeElement?.tagName }
    cleanup()

    const vueRef = ref<{ focus: () => void; input: HTMLInputElement | null } | null>(null)
    const { unmount } = mountVue(() =>
      h(VueSidebar.SidebarProvider, null, {
        default: () => h(VueSidebar.SidebarInput, { ref: vueRef, placeholder: "Search" } as never),
      }),
    )
    await flushVue()
    vueRef.value!.focus()
    const vue = { isInput: vueRef.value!.input === document.querySelector("input"), focused: document.activeElement?.tagName }
    unmount()
    expect(vue).toEqual(react)
    expect(react).toEqual({ isInput: true, focused: "INPUT" })
  })

  test("rich tooltip content: React node vs #tooltip slot", async () => {
    await act(async () => {
      render(
        <ReactSidebar.SidebarProvider defaultOpen={false} collapsible="icon">
          <ReactSidebar.SidebarMenuButton tooltip={<strong>Rich</strong>}>Item</ReactSidebar.SidebarMenuButton>
        </ReactSidebar.SidebarProvider>,
      )
    })
    const react = snapshotDom()
    cleanup()
    const { unmount } = mountVue(() =>
      h(VueSidebar.SidebarProvider, { defaultOpen: false, collapsible: "icon" }, {
        default: () =>
          h(VueSidebar.SidebarMenuButton, null, { default: () => "Item", tooltip: () => h("strong", null, "Rich") }),
      }),
    )
    await flushVue()
    const vue = snapshotDom()
    unmount()
    expect(vue).toBe(react)
    expect(react).toContain('data-state="closed"')
  })
})

// ---------------------------------------------------------------------------
// Collapse state

const TRIGGER = 'button[class*="Trigger"]'
const probeSpec = (providerProps: Props, ...children: Spec[]) =>
  n("SidebarProvider", providerProps, n("Sidebar", null, n("SidebarHeader", null, n("SidebarTrigger"))), n("Probe"), ...children)

describe("Sidebar collapse state", () => {
  test("uncontrolled: the trigger toggles, aria-label and tooltips follow, cookie is written", async () => {
    const { react, vue } = await walkSpec(
      {},
      () => fullSidebar({ collapsible: "icon" }, {}, n("Probe")),
      async ({ snapshot, fire, note }) => {
        snapshot()
        await fire(TRIGGER, "click")
        snapshot()
        note(document.cookie)
        await fire(TRIGGER, "click")
        snapshot()
        note(document.cookie)
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-sidebar="expanded"')
    expect(react[1]).toContain('data-sidebar="collapsed"')
    expect(react[1]).toContain('aria-label="Expand sidebar"')
    expect(react[2]).toBe("sidebar:state=false")
    expect(react[4]).toBe("sidebar:state=true")
  })

  test("controlled: onOpenChange / update:open drives the state", async () => {
    const calls: string[] = []
    const { react, vue } = await walkSpec(
      { open: true },
      (state, apply) =>
        probeSpec({
          open: state.open,
          onOpenChange: (open: boolean) => {
            calls.push(String(open))
            apply({ open })
          },
        }),
      async ({ snapshot, fire, note, set }) => {
        snapshot()
        await fire(TRIGGER, "click")
        snapshot()
        note(calls.splice(0).join(","))
        await set({ open: true })
        snapshot()
        await fire('[data-testid="set-open-false"]', "click")
        snapshot()
        note(calls.splice(0).join(","))
      },
    )
    expect(vue).toEqual(react)
    expect(react[2]).toBe("false")
    expect(react[1]).toContain('open=false')
    expect(react[3]).toContain('open=true')
  })

  test("controlled without updating the prop: the state stays", async () => {
    const calls: string[] = []
    const { react, vue } = await walkSpec(
      { open: true },
      (state) => probeSpec({ open: state.open, onOpenChange: (open: boolean) => calls.push(String(open)) }),
      async ({ snapshot, fire, note }) => {
        await fire(TRIGGER, "click")
        await fire(TRIGGER, "click")
        snapshot()
        note(calls.splice(0).join(","))
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-sidebar="expanded"')
    // `open` never changes, so every toggle asks for the same value
    expect(react[1]).toBe("false,false")
  })

  test("open prop without a listener: controlled, the toggle leaves the internal state alone", async () => {
    const { react, vue } = await walkSpec(
      { open: true as boolean | undefined },
      (state) => probeSpec({ open: state.open }),
      async ({ snapshot, fire, set }) => {
        await fire(TRIGGER, "click")
        snapshot()
        // Releasing control shows the internal state, still at defaultOpen
        await set({ open: undefined })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-sidebar="expanded"')
    expect(react[1]).toContain('data-sidebar="expanded"')
  })

  test("a listener without `open` is only notified: the provider keeps its own state", async () => {
    const calls: string[] = []
    const { react, vue } = await walkSpec(
      {},
      () => probeSpec({ defaultOpen: true, onOpenChange: (open: boolean) => calls.push(String(open)) }),
      async ({ snapshot, fire, note }) => {
        await fire(TRIGGER, "click")
        snapshot()
        await fire(TRIGGER, "click")
        snapshot()
        note(calls.splice(0).join(","))
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-sidebar="collapsed"')
    expect(react[1]).toContain('data-sidebar="expanded"')
    expect(react[2]).toBe("false,true")
  })

  test("a caller click listener on SidebarTrigger runs before the toggle; preventDefault cancels it", async () => {
    const calls: string[] = []
    let cancel = false
    const listener = (name: string) => (event: Event) => {
      calls.push(name)
      if (cancel) event.preventDefault()
    }
    const { react, vue } = await walkSpec(
      {},
      () =>
        n(
          "SidebarProvider",
          null,
          n("SidebarTrigger", { onClick: listener("click") }),
          n("SidebarMobileMenuButton", { onClick: listener("mobile") }),
        ),
      async ({ snapshot, fire, note }) => {
        cancel = true
        await fire(TRIGGER, "click")
        await fire('button[class*="MobileMenuButton"]', "click")
        snapshot()
        cancel = false
        await fire(TRIGGER, "click")
        await fire('button[class*="MobileMenuButton"]', "click")
        snapshot()
        note(calls.splice(0).join(","))
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-sidebar="expanded"')
    expect(react[0]).toContain('data-mobile-menu="hidden"')
    expect(react[1]).toContain('data-sidebar="collapsed"')
    expect(react[1]).toContain('data-mobile-menu="visible"')
    expect(react[2]).toBe("click,mobile,click,mobile")
  })

  test("SidebarGroup: open sets data-state; a click inside does not toggle it", async () => {
    const { react, vue } = await walkSpec(
      { open: false },
      (state) =>
        n(
          "SidebarProvider",
          null,
          n("SidebarGroup", { open: state.open }, n("button", { "data-testid": "inside" }, "Inside")),
        ),
      async ({ snapshot, fire, set }) => {
        snapshot()
        await fire('[data-testid="inside"]', "click")
        snapshot()
        await set({ open: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-state="closed"')
    expect(react[1]).toContain('data-state="closed"')
    expect(react[2]).toContain('data-state="open"')
  })

  test("Vue SidebarGroup declares no update:open event (React has no onOpenChange)", () => {
    expect(VueSidebar.SidebarGroup.emits).toBeUndefined()
  })

  test("useSidebar: setOpen, setOpenMobile and toggleSidebar from a consumer", async () => {
    const { react, vue } = await walkSpec(
      {},
      () => probeSpec({ collapsible: "icon" }),
      async ({ snapshot, fire }) => {
        await fire('[data-testid="set-open-false"]', "click")
        snapshot()
        await fire('[data-testid="toggle"]', "click")
        snapshot()
        await fire('[data-testid="set-open-mobile"]', "click")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('state=collapsed')
    expect(react[1]).toContain('state=expanded')
    expect(react[2]).toContain('data-mobile-menu="visible"')
  })

  test("Vue: SidebarProvider's default slot receives the context React's useSidebar returns", async () => {
    await act(async () => {
      render(
        <ReactSidebar.SidebarProvider defaultOpen={false} collapsible="icon">
          <ReactProbeText />
        </ReactSidebar.SidebarProvider>,
      )
    })
    const react = snapshotDom()
    cleanup()
    const { unmount } = mountVue(() =>
      h(VueSidebar.SidebarProvider, { defaultOpen: false, collapsible: "icon" }, {
        default: (context: VueSidebar.SidebarContextValue) => h("output", null, contextText(context)),
      }),
    )
    await flushVue()
    const vue = snapshotDom()
    unmount()
    expect(vue).toBe(react)
    expect(react).toContain('state=collapsed')
  })

  test("useSidebar outside a provider throws in both", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<ReactProbe />)).toThrow("useSidebar must be used within a SidebarProvider")
    error.mockRestore()
    cleanup()

    const app = createApp({})
    expect(() => app.runWithContext(() => VueSidebar.useSidebar())).toThrow(
      "useSidebar must be used within a SidebarProvider",
    )
  })
})

function ReactProbeText() {
  return <output>{contextText(ReactSidebar.useSidebar())}</output>
}

// ---------------------------------------------------------------------------
// Keyboard shortcut

describe("Sidebar keyboard shortcut", () => {
  test("Cmd/Ctrl+B toggles; other modifiers, other keys and editable targets do not", async () => {
    const { react, vue } = await walkSpec(
      {},
      () =>
        fullSidebar(
          {},
          {},
          n("SidebarMenuItem", null, n("input", { placeholder: "Search" }), n("textarea", { "data-testid": "area" })),
        ),
      async ({ snapshot, fire, note }) => {
        const press = async (target: string, init: object) => note(`prevented:${!(await fire(target, "keyDown", init))}`)
        await press("body", { key: "b", ctrlKey: true })
        snapshot()
        await press("body", { key: "b", metaKey: true })
        snapshot()
        await press("body", { key: "b", ctrlKey: true, shiftKey: true })
        await press("body", { key: "b", ctrlKey: true, altKey: true })
        await press("body", { key: "B", ctrlKey: true })
        await press("body", { key: "b" })
        await press('input[placeholder="Search"]', { key: "b", ctrlKey: true })
        await press('[data-testid="area"]', { key: "b", metaKey: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toBe("prevented:true")
    expect(react[1]).toContain('data-sidebar="collapsed"')
    expect(react[3]).toContain('data-sidebar="expanded"')
    expect(react.slice(4, 10)).toEqual(Array(6).fill("prevented:false"))
  })

  test('collapsible "none" ignores the shortcut', async () => {
    const { react, vue } = await walkSpec(
      {},
      () => probeSpec({ collapsible: "none" }),
      async ({ snapshot, fire, note }) => {
        note(`prevented:${!(await fire("body", "keyDown", { key: "b", ctrlKey: true }))}`)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toBe("prevented:false")
    expect(react[1]).toContain('data-sidebar="expanded"')
  })

  test("the shortcut follows a collapsible change after mount", async () => {
    const { react, vue } = await walkSpec(
      { collapsible: "none" as string },
      (state) => probeSpec({ collapsible: state.collapsible }),
      async ({ snapshot, fire, set }) => {
        await fire("body", "keyDown", { key: "b", ctrlKey: true })
        await set({ collapsible: "icon" })
        await fire("body", "keyDown", { key: "b", ctrlKey: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-sidebar="collapsed"')
  })

  test("unmounting removes the listener", async () => {
    const { react, vue } = await walkSpec(
      { show: true },
      (state) => (state.show ? probeSpec({}) : n("div", null, "gone")),
      async ({ fire, set, note }) => {
        await set({ show: false })
        note(`prevented:${!(await fire("body", "keyDown", { key: "b", ctrlKey: true }))}`)
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toBe("prevented:false")
  })
})

// ---------------------------------------------------------------------------
// Mobile

describe("Sidebar mobile", () => {
  const mobileSpec = (providerProps: Props = {}) =>
    n(
      "SidebarProvider",
      providerProps,
      n("header", null, n("SidebarMobileMenuButton"), n("SidebarTrigger")),
      n("Sidebar", null, n("SidebarContent", null, "Desktop")),
      n("SidebarMobile", { contained: true }, n("SidebarMobileHeader", null, "Menu"), n("button", { "data-testid": "inside" }, "Inside")),
      n("Probe"),
    )

  test("menu button, trigger, Escape, backdrop and the shortcut drive openMobile", async () => {
    const { react, vue } = await walkSpec(
      {},
      () => mobileSpec(),
      async ({ snapshot, fire, note }) => {
        snapshot()
        await fire('button[class*="MobileMenuButton"]', "click")
        snapshot()
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        snapshot()
        await fire(TRIGGER, "click")
        snapshot()
        await fire('[class*="MobileBackdrop"]', "click")
        snapshot()
        note(`prevented:${!(await fire("body", "keyDown", { key: "b", metaKey: true }))}`)
        snapshot()
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        snapshot()
        note(document.cookie)
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('isMobile=true')
    expect(react[0]).not.toContain("<aside")
    expect(react[0]).toContain('aria-label="Open menu"')
    expect(react[1]).toContain('data-mobile-menu="visible"')
    expect(react[1]).toContain('aria-label="Close menu"')
    expect(react[2]).toContain('data-mobile-menu="hidden"')
    expect(react[3]).toContain('data-mobile-menu="visible"')
    expect(react[4]).toContain('data-mobile-menu="hidden"')
    expect(react[5]).toBe("prevented:true")
    expect(react[6]).toContain('data-mobile-menu="visible"')
    expect(react[7]).toContain('data-mobile-menu="hidden"')
    // The desktop state never changed
    expect(react[8]).toBe("")
  })

  const focused = () => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName ?? "none"
  const drawerSpec = (providerProps: Props = {}, drawerProps: Props = {}, insideProps: Props = {}) =>
    n(
      "SidebarProvider",
      providerProps,
      n("SidebarInset", null, n("SidebarMobileMenuButton", { "data-testid": "menu" }), n("p", null, "Page")),
      n(
        "SidebarMobile",
        { contained: true, ...drawerProps },
        n("SidebarMobileHeader", null, "Menu"),
        n("button", { "data-testid": "inside", ...insideProps }, "Inside"),
      ),
    )

  test("the open drawer is a modal dialog: focus moves in, the page is inert, Escape closes it and focus goes back", async () => {
    const { react, vue } = await walkSpec(
      {},
      () => drawerSpec(),
      async ({ snapshot, fire, focus, note }) => {
        snapshot()
        await focus('[data-testid="menu"]')
        await fire('[data-testid="menu"]', "click")
        snapshot()
        note(focused())
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        snapshot()
        note(focused())
        // Escape outside the drawer leaves it to the page
        await fire('[data-testid="menu"]', "click")
        await fire("body", "keyDown", { key: "Escape" })
        snapshot()
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    const drawer = (html: string) => html.match(/<div[^>]*role="dialog"[^>]*>/)?.[0] ?? ""
    const main = (html: string) => html.match(/<main[^>]*>/)?.[0] ?? ""
    expect(drawer(react[0])).toContain('aria-label="Menu"')
    expect(drawer(react[0])).toContain('tabindex="-1"')
    expect(drawer(react[0])).toContain('inert=""')
    expect(drawer(react[0])).not.toContain("aria-modal")
    expect(main(react[0])).not.toContain("inert")
    expect(drawer(react[1])).toContain('aria-modal="true"')
    expect(drawer(react[1])).not.toContain("inert")
    expect(main(react[1])).toContain('inert=""')
    expect(react[2]).toBe("inside")
    expect(react[3]).toContain('data-mobile-menu="hidden"')
    expect(react[4]).toBe("menu")
    expect(react[5]).toContain('data-mobile-menu="visible"')
  })

  test("Tab from the last control of the open drawer goes to the first, Shift+Tab from the first to the last", async () => {
    const { react, vue } = await walkSpec(
      {},
      () =>
        n(
          "SidebarProvider",
          null,
          n("SidebarInset", null, n("SidebarMobileMenuButton", { "data-testid": "menu" })),
          n("SidebarMobile", { contained: true }, n("button", { "data-testid": "first" }, "First"), n("button", { "data-testid": "last" }, "Last")),
        ),
      async ({ fire, focus, note }) => {
        await fire('[data-testid="menu"]', "click")
        note(focused())
        note(`prevented:${!(await fire(() => document.activeElement, "keyDown", { key: "Tab", shiftKey: true }))}`)
        note(focused())
        note(`prevented:${!(await fire(() => document.activeElement, "keyDown", { key: "Tab" }))}`)
        note(focused())
        await focus('[data-testid="first"]')
        note(`prevented:${!(await fire(() => document.activeElement, "keyDown", { key: "Tab" }))}`)
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["first", "prevented:true", "last", "prevented:true", "first", "prevented:false"])
  })

  test("when what opened the drawer can no longer take focus, closing it focuses the menu button", async () => {
    const { react, vue } = await walkSpec(
      {},
      () =>
        n(
          "SidebarProvider",
          null,
          n("SidebarInset", null, n("SidebarMobileMenuButton", { "data-testid": "menu" })),
          // Stands for a row of another drawer that closed while this one was open
          n("div", { "data-testid": "holder" }, n("SidebarTrigger", { "data-testid": "opener" })),
          n("SidebarMobile", { contained: true }, n("button", { "data-testid": "inside" }, "Inside")),
        ),
      async ({ fire, focus, note }) => {
        // An opener that can still take focus gets it back
        await focus('[data-testid="opener"]')
        await fire('[data-testid="opener"]', "click")
        note(focused())
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        note(focused())
        // One that has gone inert hands it to the menu button
        await fire('[data-testid="opener"]', "click")
        note(focused())
        document.querySelector('[data-testid="holder"]')!.setAttribute("inert", "")
        await fire(() => document.activeElement, "keyDown", { key: "Escape" })
        note(focused())
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["inside", "opener", "inside", "menu"])
  })

  test("a drawer unmounted while open hands focus to a menu button that stays on the page", async () => {
    const { react, vue } = await walkSpec(
      { second: true },
      (state) =>
        n(
          "div",
          null,
          n("SidebarProvider", null, n("SidebarInset", null, n("SidebarMobileMenuButton", { "data-testid": "first-menu" }))),
          ...(state.second
            ? [
                n(
                  "SidebarProvider",
                  null,
                  // A header outside the inset: not inert while the drawer is open
                  n("header", null, n("SidebarMobileMenuButton", { "data-testid": "second-menu" })),
                  n("div", { "data-testid": "holder" }, n("SidebarTrigger", { "data-testid": "opener" })),
                  n("SidebarMobile", { contained: true }, n("button", { "data-testid": "inside" }, "Inside")),
                ),
              ]
            : []),
        ),
      async ({ fire, focus, note, set }) => {
        await focus('[data-testid="opener"]')
        await fire('[data-testid="opener"]', "click")
        note(focused())
        document.querySelector('[data-testid="holder"]')!.setAttribute("inert", "")
        await set({ second: false })
        note(focused())
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["inside", "first-menu"])
  })

  test("only the drawer unmounted while open hands focus to its own provider's menu button first", async () => {
    const { react, vue } = await walkSpec(
      { drawer: true },
      (state) =>
        n(
          "div",
          null,
          // Earlier on the page: picked only when the drawer's own provider has no menu button
          n("SidebarProvider", null, n("SidebarInset", null, n("SidebarMobileMenuButton", { "data-testid": "first-menu" }))),
          n(
            "SidebarProvider",
            null,
            n("header", null, n("SidebarMobileMenuButton", { "data-testid": "second-menu" })),
            n("div", { "data-testid": "holder" }, n("SidebarTrigger", { "data-testid": "opener" })),
            ...(state.drawer ? [n("SidebarMobile", { contained: true }, n("button", { "data-testid": "inside" }, "Inside"))] : []),
          ),
        ),
      async ({ fire, focus, note, set }) => {
        await focus('[data-testid="opener"]')
        await fire('[data-testid="opener"]', "click")
        note(focused())
        document.querySelector('[data-testid="holder"]')!.setAttribute("inert", "")
        await set({ drawer: false })
        note(focused())
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["inside", "second-menu"])
  })

  test("Vue: a provider leaving through a <Transition> hands focus to a menu button once it has gone", async () => {
    // React has no leaving transition: what unmounts leaves the page at once
    mobile = true
    const shown = ref(true)
    const { SidebarProvider, SidebarInset, SidebarMobileMenuButton, SidebarMobile } = VueSidebar
    mountVue(() =>
      h("div", null, [
        h(SidebarProvider, null, () => h(SidebarInset, null, () => h(SidebarMobileMenuButton, { "data-testid": "first-menu" }))),
        h(Transition, { duration: 30 }, () =>
          shown.value
            ? h("div", null, [
                h(SidebarProvider, null, () => [
                  h("header", null, [h(SidebarMobileMenuButton, { "data-testid": "second-menu" })]),
                  h(SidebarMobile, { contained: true }, () => h("button", { "data-testid": "inside" }, "Inside")),
                ]),
              ])
            : null,
        ),
      ]),
    )
    await flushVue()
    const secondMenu = document.querySelector<HTMLElement>('[data-testid="second-menu"]')!
    secondMenu.focus()
    secondMenu.click()
    await flushVue()
    expect(focused()).toBe("inside")
    shown.value = false
    await flushVue()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(document.querySelector('[data-testid="second-menu"]')).toBeNull()
    expect(focused()).toBe("first-menu")
  })

  test("back at phone width with the drawer still open, focus moves into it again", async () => {
    const { react, vue } = await walkSpec(
      {},
      () =>
        n(
          "SidebarProvider",
          null,
          n("SidebarInset", null, n("SidebarMobileMenuButton", { "data-testid": "menu" }), n("button", { "data-testid": "page" }, "Page")),
          n("SidebarMobile", null, n("button", { "data-testid": "inside" }, "Inside")),
        ),
      async ({ fire, focus, note, setMobile }) => {
        await fire('[data-testid="menu"]', "click")
        note(focused())
        await setMobile(false)
        await focus('[data-testid="page"]')
        note(focused())
        await setMobile(true)
        note(focused())
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["inside", "page", "inside"])
  })

  test("an Escape a layer inside the drawer or your onKeyDown has prevented keeps it open", async () => {
    const preventEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") event.preventDefault()
    }
    for (const [drawerProps, insideProps] of [[{}, { onKeyDown: preventEscape }], [{ onKeyDown: preventEscape }, {}]] as const) {
      const { react, vue } = await walkSpec(
        {},
        () => drawerSpec({}, drawerProps, insideProps),
        async ({ snapshot, fire }) => {
          await fire('[data-testid="menu"]', "click")
          await fire(() => document.activeElement, "keyDown", { key: "Escape" })
          snapshot()
        },
        { mobile: true },
      )
      expect(vue).toEqual(react)
      expect(react[0]).toContain('data-mobile-menu="visible"')
    }
  })

  test("openMobile is controlled and onOpenMobileChange reports each request; defaultOpenMobile starts it open", async () => {
    const log: string[] = []
    const { react, vue } = await walkSpec(
      { open: false, follow: false },
      (state, apply) =>
        drawerSpec({
          openMobile: state.open,
          onOpenMobileChange: (value: boolean) => {
            log.push(String(value))
            if (state.follow) apply({ open: value })
          },
        }),
      async ({ snapshot, fire, set, note }) => {
        log.length = 0
        await fire('[data-testid="menu"]', "click")
        snapshot()
        await set({ follow: true })
        await fire('[data-testid="menu"]', "click")
        snapshot()
        await set({ open: false })
        snapshot()
        note(log.join(","))
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-mobile-menu="hidden"')
    expect(react[1]).toContain('data-mobile-menu="visible"')
    expect(react[2]).toContain('data-mobile-menu="hidden"')
    expect(react[3]).toBe("true,true")

    const initial = await walkSpec(
      {},
      () => drawerSpec({ defaultOpenMobile: true }),
      async ({ snapshot, note }) => {
        snapshot()
        note(focused())
      },
      { mobile: true },
    )
    expect(initial.vue).toEqual(initial.react)
    expect(initial.react[0]).toContain('data-mobile-menu="visible"')
    expect(initial.react[1]).toBe("inside")
  })

  test("a swipe in from the edge opens the drawer, a swipe back closes it, a vertical one leaves it", async () => {
    // jsdom lays nothing out: the provider's right edge is at 0 and the drawer travels the window's width
    const touch = (x: number, y = 10) => [{ clientX: x, clientY: y }]
    const root = '[data-mobile-menu]'
    const { react, vue } = await walkSpec(
      {},
      () => drawerSpec(),
      async ({ snapshot, dispatch, advance, note }) => {
        await dispatch("main", "touchstart", { touches: touch(-5), timeStamp: 0 })
        await dispatch("main", "touchmove", { touches: touch(-8, 100), timeStamp: 50 })
        await dispatch("main", "touchend", { touches: [], timeStamp: 60 })
        snapshot()
        await dispatch("main", "touchstart", { touches: touch(-5), timeStamp: 100 })
        note(`moved:${await dispatch("main", "touchmove", { touches: touch(-205), timeStamp: 200 })}`)
        snapshot()
        await dispatch("main", "touchend", { touches: [], timeStamp: 210 })
        await advance(20)
        snapshot()
        await dispatch(root, "touchstart", { touches: touch(-500), timeStamp: 300 })
        await dispatch(root, "touchmove", { touches: touch(-300), timeStamp: 400 })
        await dispatch(root, "touchend", { touches: [], timeStamp: 410 })
        await advance(20)
        snapshot()
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-mobile-menu="hidden"')
    expect(react[0]).not.toContain("data-mobile-dragging")
    // The finger moved 200 of 1024px: the move is the drawer's, not the page's
    expect(react[1]).toBe("moved:false")
    expect(react[2]).toContain("data-mobile-dragging")
    expect(react[2]).toContain("--sidebar-drawer-progress: 0.1953125")
    expect(react[3]).toContain('data-mobile-menu="visible"')
    expect(react[3]).not.toContain("data-mobile-dragging")
    expect(react[3]).not.toContain("--sidebar-drawer-progress")
    expect(react[4]).toContain('data-mobile-menu="hidden"')
  })

  test("disclosure={false} leaves the chevron out of the drawer rows", async () => {
    const row = n("SidebarMenu", null, n("SidebarMenuItem", null, n("SidebarMenuButton", null, "Inbox")), n("SidebarMenuSub", null, n("SidebarMenuSubItem", null, n("SidebarMenuSubButton", null, "Files"))))
    const { react, vue } = await pair(n("SidebarProvider", null, n("SidebarMobile", { contained: true, disclosure: false }, row)))
    expect(vue).toBe(react)
    expect(react).not.toContain("MenuDisclosure")
  })

  test("the drag styles: the drawer, the backdrop and the App page follow --sidebar-drawer-progress", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Sidebar/Sidebar.module.css`, "utf8")
    expect(css).toMatch(/\.MobileSidebar \{[^}]*--sidebar-drawer-edge: right;/)
    expect(css).toMatch(/\.App \.MobileSidebar \{\s*--sidebar-drawer-edge: left;/)
    expect(css).toMatch(/:global\(\[data-mobile-dragging\]\[data-mobile-menu\]\) \.MobileSidebar\.MobileSidebar \{\s*left: calc\(\(1 - var\(--sidebar-drawer-progress, 0\)\) \* 100%\);/)
    // The App drag rules outweigh its open state, whose shade rule comes later
    expect(css).toContain(".App.App[data-mobile-dragging][data-mobile-menu] .MobileSidebar::after {")
    expect(css).toContain("opacity: var(--sidebar-drawer-progress, 0);")
    expect(css).toContain("transform: translateX(calc(var(--sidebar-drawer-width) * var(--sidebar-drawer-progress, 0)));")
    expect(css).toContain("opacity: calc(1 - var(--sidebar-drawer-progress, 0));")
  })

  test("Escape does nothing while the mobile menu is closed", async () => {
    const { react, vue } = await walkSpec(
      {},
      () => mobileSpec({ collapsible: "icon" }),
      async ({ snapshot, fire }) => {
        await fire("body", "keyDown", { key: "Escape" })
        snapshot()
      },
      { mobile: true },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain("<aside")
  })

  test("crossing the breakpoint re-renders: aside, tooltips and trigger label", async () => {
    const { react, vue } = await walkSpec(
      {},
      () => fullSidebar({ collapsible: "offcanvas", defaultOpen: false }),
      async ({ snapshot, setMobile }) => {
        snapshot()
        await setMobile(true)
        snapshot()
        await setMobile(false)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain("<aside")
    expect(react[1]).not.toContain("<aside")
    expect(react[1]).toContain("<main")
    expect(react[2]).toContain('data-state="closed"')
  })
})

// ---------------------------------------------------------------------------
// Tooltips in the collapsed rail

describe("Sidebar tooltips", () => {
  test("focus and hover open the tooltip on the right; expanding removes it", async () => {
    const { react, vue } = await walkSpec(
      {},
      () =>
        n(
          "SidebarProvider",
          { collapsible: "icon", defaultOpen: false },
          n("SidebarTrigger"),
          n("SidebarMenu", null, navItem("Overview", "Home", { "data-testid": "overview" }), navItem("Projects", "Folder", { "data-testid": "projects" })),
        ),
      async ({ snapshot, fire, focus, advance }) => {
        await focus('[data-testid="overview"]')
        snapshot()
        await fire('[data-testid="overview"]', "blur")
        await advance(300)
        await fire('[data-testid="projects"]', "pointerMove", { pointerType: "mouse" })
        await advance(100)
        snapshot()
        await advance(100)
        snapshot()
        await fire(TRIGGER, "click")
        await advance(300)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('role="tooltip"')
    expect(react[0]).toContain('data-side="right"')
    expect(react[0]).toMatch(/"Overview"/)
    expect(react[2]).toContain('role="tooltip"')
    expect(react[3]).not.toContain('role="tooltip"')
  })

  test("the row stays the same element through collapse, so its label can fade", async () => {
    const { react, vue } = await walkSpec(
      {},
      () =>
        n(
          "SidebarProvider",
          { collapsible: "icon" },
          n("SidebarTrigger"),
          n("SidebarMenu", null, navItem("Overview", "Home", { "data-testid": "overview" })),
        ),
      async ({ snapshot, fire, advance }) => {
        document.querySelector('[data-testid="overview"]')!.setAttribute("data-mark", "kept")
        await fire(TRIGGER, "click")
        await advance(300)
        snapshot()
        await fire(TRIGGER, "click")
        await advance(300)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-mark="kept"')
    expect(react[1]).toContain('data-mark="kept"')
  })

  test("a caller's pointer listeners on the row still run", async () => {
    const reactEnter = vi.fn()
    const reactLeave = vi.fn()
    render(
      <ReactSidebar.SidebarProvider collapsible="icon" defaultOpen={false}>
        <ReactSidebar.SidebarMenuButton tooltip="Overview" onPointerEnter={reactEnter} onPointerLeave={reactLeave}>
          Overview
        </ReactSidebar.SidebarMenuButton>
      </ReactSidebar.SidebarProvider>,
    )
    const reactRow = document.querySelector("button")!
    fireEvent.pointerEnter(reactRow)
    fireEvent.pointerLeave(reactRow)
    cleanup()

    const vueEnter = vi.fn()
    const vueLeave = vi.fn()
    const { unmount } = mountVue(() =>
      h(
        VueSidebar.SidebarProvider,
        { collapsible: "icon", defaultOpen: false },
        {
          default: () =>
            h(
              VueSidebar.SidebarMenuButton,
              { tooltip: "Overview", onPointerenter: vueEnter, onPointerleave: vueLeave } as never,
              { default: () => "Overview" },
            ),
        },
      ),
    )
    await flushVue()
    const vueRow = document.querySelector("button")!
    vueRow.dispatchEvent(new Event("pointerenter"))
    vueRow.dispatchEvent(new Event("pointerleave"))
    unmount()

    expect([reactEnter.mock.calls.length, reactLeave.mock.calls.length]).toEqual([1, 1])
    expect([vueEnter.mock.calls.length, vueLeave.mock.calls.length]).toEqual([1, 1])
  })
})

// ---------------------------------------------------------------------------
// Content overflow, card dismiss, search input

describe("Sidebar parts behaviour", () => {
  test("SidebarContent marks the sidebar while its content overflows", async () => {
    const size = { scrollHeight: 500, clientHeight: 300 }
    const scroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight")
    const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight")
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => size.scrollHeight })
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => size.clientHeight })
    try {
      const { react, vue } = await walkSpec(
        {},
        () => n("SidebarProvider", null, n("Sidebar", null, n("SidebarContent", { class: "c" }, "Content"))),
        async ({ snapshot, note }) => {
          snapshot()
          size.scrollHeight = 200
          for (const observer of FakeResizeObserver.instances) observer.callback()
          snapshot()
          note(`observers:${FakeResizeObserver.instances.size}`)
        },
        {
          beforeMount: () => {
            size.scrollHeight = 500
          },
        },
      )
      expect(vue).toEqual(react)
      expect(react[0]).toContain('data-content-scrollable="true"')
      expect(react[1]).toContain('data-content-scrollable="false"')
      expect(react[2]).toBe("observers:1")
    } finally {
      if (scroll) Object.defineProperty(HTMLElement.prototype, "scrollHeight", scroll)
      if (client) Object.defineProperty(HTMLElement.prototype, "clientHeight", client)
    }
  })

  test("SidebarCard dismiss calls onDismiss / emits dismiss", async () => {
    const calls: string[] = []
    const { react, vue } = await walkSpec(
      {},
      () => n("SidebarProvider", null, n("SidebarCard", { dismissible: true, onDismiss: () => calls.push("dismiss") }, "Card")),
      async ({ fire, note }) => {
        await fire('button[aria-label="Dismiss"]', "click")
        note(calls.splice(0).join(","))
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toBe("dismiss")
  })

  test("SidebarInput: typing, clearing and the Ctrl+B guard", async () => {
    const { react, vue } = await walk(
      { query: "" },
      (state, apply) => (
        <ReactSidebar.SidebarProvider>
          <ReactSidebar.SidebarInput
            placeholder="Search"
            value={state.query}
            onChange={(event) => apply({ query: event.target.value })}
            onClear={() => apply({ query: "" })}
          />
        </ReactSidebar.SidebarProvider>
      ),
      (state, apply) =>
        h(VueSidebar.SidebarProvider, null, {
          default: () =>
            h(VueSidebar.SidebarInput, {
              "placeholder": "Search",
              "value": state.query,
              "onUpdate:value": (query: string) => apply({ query }),
              "onClear": () => apply({ query: "" }),
            } as never),
        }),
      async ({ snapshot, fire, note }) => {
        await fire("input", "input", { target: { value: "ui" } })
        snapshot()
        note((document.querySelector("input") as HTMLInputElement).value)
        await fire('button[aria-label="Clear input"]', "click")
        snapshot()
        note((document.querySelector("input") as HTMLInputElement).value)
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain("Clear input")
    expect(react[1]).toBe("ui")
    expect(react[2]).not.toContain("Clear input")
    expect(react[3]).toBe("")
  })
})

describe("Sidebar drawer on a phone is an iOS 26 grouped list", () => {
  const leaf = n(
    "SidebarMenuItem",
    null,
    n("SidebarMenuButton", null, n("SidebarMenuButtonIcon", null, n("Bell")), n("SidebarMenuButtonLabel", null, "Inbox"), n("SidebarMenuBadge", null, "4")),
  )
  const disclosures = (html: string) => html.match(/class="MenuDisclosure"/g)?.length ?? 0

  test("a row inside SidebarMobile ends with the PlexUI Disclosure; the same row outside it has none", async () => {
    const menu = () => n("SidebarMenu", null, leaf)
    const { react, vue } = await pair(n("SidebarProvider", null, n("SidebarMobile", { contained: true }, menu()), n("nav", null, menu())))
    expect(vue).toBe(react)
    expect(disclosures(react)).toBe(1)
    // After the count, inside the row's inner span: the glyph of the Disclosure icon
    expect(react).toMatch(/class="MenuBadge">\s*"4"\s*<span aria-hidden="true" class="MenuDisclosure">\s*<svg[^>]*viewBox="0 0 20 20"/)
  })

  test("submenu rows carry it too, inside the child element with asChild", async () => {
    const { react, vue } = await pair(
      n(
        "SidebarProvider",
        null,
        n(
          "SidebarMobile",
          { contained: true },
          n(
            "SidebarMenuSub",
            null,
            n("SidebarMenuSubItem", null, n("SidebarMenuSubButton", { indent: 1 }, "Files")),
            n("SidebarMenuSubItem", null, n("SidebarMenuSubButton", { asChild: true, indent: 1 }, n("a", { href: "#skills" }, "Skills"))),
            n("SidebarMenuSubItem", null, n("SidebarMenuButton", { asChild: true }, n("a", { href: "#logs" }, "Logs"))),
          ),
        ),
      ),
    )
    expect(vue).toBe(react)
    expect(disclosures(react)).toBe(3)
    expect(react).toMatch(/href="#skills">\s*"Skills"\s*<span aria-hidden="true" class="MenuDisclosure">/)
    expect(react).toMatch(/href="#logs">\s*<span class="MenuButtonInner">\s*"Logs"\s*<span aria-hidden="true" class="MenuDisclosure">/)
  })

  test("the styles: cards, 52px rows, section headers, separators, counts and chevrons; the App drawer keeps its look", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Sidebar/Sidebar.module.css`, "utf8")
    const start = css.indexOf("Mobile drawer list")
    const block = css.slice(start, css.indexOf("/* Desktop breakpoint", start))
    expect(css.slice(start, css.indexOf("@media", start))).toMatch(/\.MenuDisclosure \{\s*display: none;\s*\}/)
    expect(block).toContain(".MobileSidebar:not(:where(.App *)) {")
    for (const declaration of [
      "--sidebar-list-inset: var(--sidebar-mobile-list-inset, var(--mobile-list-inset, 20px));",
      "--sidebar-menu-item-height: var(--sidebar-mobile-list-row-height, 52px);",
      "--sidebar-menu-text: var(--color-text);",
      "background: var(--sidebar-mobile-background, var(--mobile-surface-grouped-primary, var(--color-surface-secondary)));",
      "border-radius: var(--sidebar-mobile-list-radius, 26px);",
      "var(--mobile-surface-secondary, var(--mobile-surface-grouped-secondary, var(--color-surface)))",
      "min-height: var(--sidebar-mobile-list-header-height, 44px);",
      "font-size: var(--sidebar-mobile-list-header-font-size, 20px);",
      "font-weight: var(--sidebar-mobile-list-header-font-weight, var(--font-weight-semibold));",
      "inset-inline: var(--sidebar-row-inset) var(--sidebar-list-inset);",
      "inset-inline-start: calc(var(--sidebar-row-inset) + var(--sidebar-list-icon-column));",
      "color: var(--mobile-label-tertiary, var(--color-text-tertiary));",
      "margin-inline-start: var(--sidebar-mobile-list-disclosure-gap, 8px);",
      "--sidebar-row-inset: calc(var(--sidebar-list-inset) + var(--sidebar-list-icon-column));",
    ]) expect(block).toContain(declaration)
    // Counts and the submenu chevron are secondary labels
    expect(block.match(/color: var\(--mobile-label-secondary, var\(--color-text-secondary\)\);/g)).toHaveLength(2)
    // Rows that open a menu, expand or carry their own controls lead nowhere
    expect(block).toContain(":is([aria-haspopup], [aria-expanded], :has(.MenuChevron)) .MenuDisclosure")
    expect(block).toContain("> :is(.MenuButton, .MenuSubButton):has(~ :not(.MenuSub)) .MenuDisclosure")
    expect(block).toContain("> * > :is(.MenuButton, .MenuSubButton):has(~ *) .MenuDisclosure")
    const tokens = readFileSync(`${process.cwd()}/packages/styles/src/styles/variables-components.css`, "utf8")
    expect(tokens).toContain("--toolbar-large-title-gap: 13.3px;")
  })

  test("the mobile menu button fills hover, press and the open menu like its neighbours in both themes", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Sidebar/Sidebar.module.css`, "utf8")
    const rule = css.slice(css.indexOf(".MobileMenuButton::before {"), css.indexOf("}", css.indexOf(".MobileMenuButton::before {")))
    expect(rule).toContain("background: var(--sidebar-accent);")
    expect(rule).not.toContain("--color-surface")
  })

  test("the drawer search is the kit Sidebar Search Field: a 44px capsule with a 26px magnifier", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Sidebar/Sidebar.module.css`, "utf8")
    const start = css.indexOf("Phone drawer search")
    const block = css.slice(start, css.indexOf("/* ====", start))
    expect(block).toContain("@media (max-width: 767px) {\n  .MobileSidebar .Input > [data-slot=\"input\"][data-variant] {")
    for (const declaration of [
      "--input-size: 44px;",
      "--input-gap: 4px;",
      "--input-adornment-offset: 0px;",
      "--input-placeholder-text-color: var(--mobile-label-secondary, var(--color-text-secondary));",
      "border-radius: var(--radius-full);",
      "width: 26px;",
      "height: 26px;",
      "color: var(--mobile-label-secondary, var(--color-text-secondary));",
    ]) expect(block).toContain(declaration)
  })
})
