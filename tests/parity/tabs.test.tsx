import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, onErrorCaptured, ref } from "vue"
import { Bell as ReactBell, Home as ReactHome } from "../../packages/ui/src/components/Icon"
import { SegmentedControl as ReactSegmentedControl } from "../../packages/ui/src/components/SegmentedControl"
import { Tabs as ReactTabs } from "../../packages/ui/src/components/Tabs"
import { Bell, Home } from "../../packages/vue/src/components/Icon"
import { SegmentedControl, SegmentedControlOption, SegmentedControlTab } from "../../packages/vue/src/components/SegmentedControl"
import { Tabs, TabsOption, TabsTab } from "../../packages/vue/src/components/Tabs"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair, walkPairWithState } from "./pair"

// ---------------------------------------------------------------------------
// One declarative spec renders the same tree in both frameworks
// ---------------------------------------------------------------------------

type BadgeObject = {
  content: number | string | "element"
  color?: "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
  variant?: "soft" | "solid"
  pill?: boolean
  loading?: boolean
}

type TabSpec = {
  value: string
  label?: string
  /** "component" (Vue icon prop as a component), "vnode", "slot", "text" */
  icon?: "component" | "vnode" | "slot" | "text"
  /** "element" is <strong>new</strong> in both frameworks */
  badge?: number | string | null | "element" | BadgeObject
  /** Vue only: pass the badge content through the `badge` slot instead of the prop */
  badgeSlot?: boolean
  disabled?: boolean
  ariaLabel?: string
  /** Extra attributes on the tab (React rest props / Vue fallthrough attrs), in Vue spelling */
  attrs?: Record<string, unknown>
}

type GroupSpec = {
  value?: string
  variant?: "segmented" | "underline"
  orientation?: "horizontal" | "vertical"
  size?: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  gutterSize?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl"
  disabled?: boolean
  block?: boolean
  pill?: boolean
  flush?: boolean
  className?: string
  /** Extra attributes on the group, in Vue spelling */
  attrs?: Record<string, unknown>
  tabs: TabSpec[]
}

// Vue attribute names to React prop names
const REACT_NAMES: Record<string, string> = { class: "className", tabindex: "tabIndex", onMousedown: "onMouseDown" }
const reactAttrs = (attrs: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.entries(attrs).map(([key, value]) => [REACT_NAMES[key] ?? key, value]))

type Handlers = { onChange?: (value: string) => void; onClick?: () => void; onVueChange?: (value: string) => void }

const reactBadgeContent = (content: BadgeObject["content"]) => (content === "element" ? <strong>new</strong> : content)
const vueBadgeContent = (content: BadgeObject["content"]) => (content === "element" ? h("strong", "new") : content)

const reactBadge = (badge: TabSpec["badge"]) => {
  if (badge === "element") return <strong>new</strong>
  if (badge && typeof badge === "object") return { ...badge, content: reactBadgeContent(badge.content) }
  return badge
}

const vueBadge = (badge: TabSpec["badge"]) => {
  if (badge === "element") return h("strong", "new")
  if (badge && typeof badge === "object") return { ...badge, content: vueBadgeContent(badge.content) }
  return badge
}

const reactIcon = (icon: TabSpec["icon"], value: string) => {
  if (!icon) return undefined
  if (icon === "text") return "*"
  return value === "notifications" ? <ReactBell /> : <ReactHome />
}

const reactTab = (tab: TabSpec, Tab: typeof ReactTabs.Tab = ReactTabs.Tab) => (
  <Tab
    key={tab.value}
    value={tab.value}
    icon={reactIcon(tab.icon, tab.value)}
    badge={reactBadge(tab.badge)}
    disabled={tab.disabled}
    aria-label={tab.ariaLabel}
    {...reactAttrs(tab.attrs)}
  >
    {tab.label}
  </Tab>
)

const reactTabs = (spec: GroupSpec, handlers: Handlers = {}, Root: typeof ReactTabs = ReactTabs) => (
  <Root
    value={spec.value as string}
    onChange={handlers.onChange}
    onClick={handlers.onClick}
    variant={spec.variant}
    orientation={spec.orientation}
    size={spec.size}
    gutterSize={spec.gutterSize}
    disabled={spec.disabled}
    block={spec.block}
    pill={spec.pill}
    flush={spec.flush}
    className={spec.className}
    aria-label="Sections"
    {...reactAttrs(spec.attrs)}
  >
    {spec.tabs.map((tab) => reactTab(tab, Root.Tab))}
  </Root>
)

const vueTab = (tab: TabSpec, Tab: typeof TabsTab = TabsTab) => {
  const IconComponent = tab.value === "notifications" ? Bell : Home
  const slots: Record<string, () => unknown> = {}
  if (tab.label !== undefined) slots.default = () => tab.label
  if (tab.icon === "slot") slots.icon = () => h(IconComponent)
  const badge = vueBadge(tab.badge)
  let badgeProp = badge
  if (tab.badgeSlot) {
    // The slot carries the content, the prop object the styling
    const content = typeof badge === "object" && badge && "content" in badge ? badge.content : badge
    slots.badge = () => content
    badgeProp = typeof badge === "object" && badge && "content" in badge ? { ...badge, content: "ignored" } : undefined
  }
  const icon =
    tab.icon === "component" ? IconComponent : tab.icon === "vnode" ? h(IconComponent) : tab.icon === "text" ? "*" : undefined
  return h(
    Tab,
    {
      "key": tab.value,
      "value": tab.value,
      icon,
      "badge": badgeProp as never,
      "disabled": tab.disabled,
      "aria-label": tab.ariaLabel,
      ...tab.attrs,
    },
    slots,
  )
}

const vueTabs = (spec: GroupSpec, handlers: Handlers = {}, Root: typeof Tabs = Tabs, Tab: typeof TabsTab = TabsTab) => {
  const { className, ...attrs } = { ...spec.attrs, className: spec.className }
  return h(
    Root,
    {
      "value": spec.value,
      "onUpdate:value": handlers.onChange,
      "onChange": handlers.onVueChange,
      "onClick": handlers.onClick,
      "variant": spec.variant,
      "orientation": spec.orientation,
      "size": spec.size,
      "gutterSize": spec.gutterSize,
      "disabled": spec.disabled,
      "block": spec.block,
      "pill": spec.pill,
      "flush": spec.flush,
      "class": className,
      "aria-label": "Sections",
      ...attrs,
    },
    { default: () => spec.tabs.map((tab) => vueTab(tab, Tab)) },
  )
}

const pairOf = (spec: GroupSpec) => renderPair(reactTabs(spec), () => vueTabs(spec))

const SECTIONS: TabSpec[] = [
  { value: "overview", label: "Overview" },
  { value: "analytics", label: "Analytics" },
  { value: "reports", label: "Reports" },
  { value: "settings", label: "Settings" },
]

const ICONS = (icon: TabSpec["icon"]): TabSpec[] => [
  { value: "home", label: "Home", icon },
  { value: "settings", label: "Settings", icon },
  { value: "notifications", label: "Notifications", icon },
]

const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const
const GUTTERS = ["2xs", "xs", "sm", "md", "lg", "xl"] as const

// ---------------------------------------------------------------------------
// Static rendering
// ---------------------------------------------------------------------------

describe("Tabs renders the same DOM as React", () => {
  const cases: [string, GroupSpec][] = [
    ["defaults (segmented, pill, md) with a selected tab", { value: "analytics", tabs: SECTIONS }],
    ["no value selects nothing", { tabs: SECTIONS }],
    ["value that matches no tab", { value: "missing", tabs: SECTIONS }],
    ["underline", { value: "overview", variant: "underline", tabs: SECTIONS }],
    ["underline flush", { value: "overview", variant: "underline", flush: true, tabs: SECTIONS }],
    ["flush is ignored on segmented", { value: "overview", flush: true, tabs: SECTIONS }],
    ["pill is ignored on underline", { value: "overview", variant: "underline", pill: true, tabs: SECTIONS }],
    ["segmented without pill", { value: "overview", pill: false, tabs: SECTIONS }],
    ["block segmented", { value: "overview", block: true, tabs: SECTIONS }],
    ["block underline", { value: "overview", variant: "underline", block: true, tabs: SECTIONS }],
    ["vertical segmented", { value: "reports", orientation: "vertical", tabs: SECTIONS }],
    ["vertical underline", { value: "reports", variant: "underline", orientation: "vertical", tabs: SECTIONS }],
    ["disabled group", { value: "overview", disabled: true, tabs: SECTIONS }],
    [
      "disabled tab",
      { value: "overview", tabs: SECTIONS.map((tab) => (tab.value === "reports" ? { ...tab, disabled: true } : tab)) },
    ],
    [
      "selected tab that is disabled",
      { value: "reports", tabs: SECTIONS.map((tab) => (tab.value === "reports" ? { ...tab, disabled: true } : tab)) },
    ],
    ["class and extra attributes on the group", { value: "overview", className: "my-tabs", attrs: { "id": "sections", "data-testid": "tabs", "style": { maxWidth: "400px" } }, tabs: SECTIONS }],
    ["caller data attributes override the group's own", { value: "overview", attrs: { "data-variant": "custom", "role": "tablist" }, tabs: SECTIONS }],
    ["dir attribute", { value: "overview", attrs: { dir: "rtl" }, tabs: SECTIONS }],
    ["icons as components", { value: "home", size: "lg", tabs: ICONS("component") }],
    ["icons as vnodes", { value: "home", size: "lg", tabs: ICONS("vnode") }],
    ["icons in the icon slot", { value: "home", variant: "underline", tabs: ICONS("slot") }],
    ["text icons", { value: "home", tabs: ICONS("text") }],
    [
      "icon-only tabs with aria-label",
      {
        value: "settings",
        tabs: ICONS("component").map(({ label, ...tab }) => ({ ...tab, ariaLabel: label })),
      },
    ],
    [
      "badges: number, string, zero, element, null",
      {
        value: "a",
        tabs: [
          { value: "a", label: "All", badge: 128 },
          { value: "b", label: "Beta", badge: "new" },
          { value: "c", label: "Zero", badge: 0 },
          { value: "d", label: "Element", badge: "element" },
          { value: "e", label: "Null", badge: null },
          { value: "f", label: "Empty", badge: "" },
        ],
      },
    ],
    [
      "badges: object forms",
      {
        value: "all",
        variant: "underline",
        size: "lg",
        tabs: [
          { value: "all", label: "All", badge: { content: 128 } },
          { value: "unread", label: "Unread", badge: { content: 12, color: "info" } },
          { value: "flagged", label: "Flagged", badge: { content: 3, color: "danger", variant: "solid", pill: true } },
          { value: "pill-off", label: "Pill off", badge: { content: 1, pill: false } },
          { value: "loading", label: "Loading", badge: { content: 9, color: "success", loading: true } },
          { value: "rich", label: "Rich", badge: { content: "element", color: "discovery" } },
        ],
      },
    ],
    [
      "badges with every color",
      {
        value: "secondary",
        tabs: (["secondary", "success", "danger", "warning", "info", "discovery", "caution"] as const).map((color) => ({
          value: color,
          label: color,
          badge: { content: 1, color, variant: "solid" as const },
        })),
      },
    ],
    ["icon, label and badge together", { value: "home", tabs: [{ value: "home", label: "Home", icon: "component", badge: { content: 4, color: "info" } }] }],
    [
      "extra attributes on a tab, including a class that replaces Tab",
      {
        value: "overview",
        tabs: [
          { value: "overview", label: "Overview", attrs: { "data-testid": "first", "title": "First" } },
          { value: "analytics", label: "Analytics", attrs: { class: "custom-tab" } },
          { value: "reports", label: "Reports", attrs: { "role": "tab", "aria-checked": "mixed", "data-state": "custom", "tabindex": "0" } },
        ],
      },
    ],
    ["tab without label", { value: "overview", tabs: [{ value: "overview" }, { value: "analytics", label: "" }] }],
    ...SIZES.map((size): [string, GroupSpec] => [`size ${size}`, { value: "overview", size, tabs: SECTIONS }]),
    ...GUTTERS.map((gutterSize): [string, GroupSpec] => [`gutter size ${gutterSize}`, { value: "overview", gutterSize, tabs: SECTIONS }]),
  ]

  test.each(cases)("%s", async (_name, spec) => {
    const pair = await pairOf(spec)
    expect(pair.vue).toBe(pair.react)
  })

  test("badge slot replaces the content and keeps the object styling", async () => {
    const reactSpec: GroupSpec = {
      value: "a",
      tabs: [
        { value: "a", label: "All", badge: { content: "element", color: "danger", variant: "solid", pill: true } },
        { value: "b", label: "Beta", badge: 7 },
      ],
    }
    const vueSpec: GroupSpec = { ...reactSpec, tabs: reactSpec.tabs.map((tab) => ({ ...tab, badgeSlot: true })) }
    const pair = await renderPair(reactTabs(reactSpec), () => vueTabs(vueSpec))
    expect(pair.vue).toBe(pair.react)
    expect(pair.vue).toContain('data-color="danger"')
    expect(pair.vue).not.toContain("ignored")
  })

  test("SegmentedControl and Tabs.Option aliases", async () => {
    const spec: GroupSpec = { value: "b", size: "xs", tabs: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }
    const segmented = await renderPair(
      <ReactSegmentedControl value="b" size="xs" aria-label="Sections">
        <ReactSegmentedControl.Option value="a">A</ReactSegmentedControl.Option>
        <ReactSegmentedControl.Tab value="b">B</ReactSegmentedControl.Tab>
      </ReactSegmentedControl>,
      () =>
        h(SegmentedControl, { "value": "b", "size": "xs", "aria-label": "Sections" }, {
          default: () => [
            h(SegmentedControlOption, { value: "a" }, { default: () => "A" }),
            h(SegmentedControlTab, { value: "b" }, { default: () => "B" }),
          ],
        }),
    )
    expect(segmented.vue).toBe(segmented.react)
    expect(SegmentedControl).toBe(Tabs)
    expect(SegmentedControlOption).toBe(TabsTab)

    const option = await renderPair(
      <ReactTabs value="b" size="xs" aria-label="Sections">
        <ReactTabs.Option value="a">A</ReactTabs.Option>
        <ReactTabs.Option value="b">B</ReactTabs.Option>
      </ReactTabs>,
      () => vueTabs(spec, {}, Tabs, TabsOption),
    )
    expect(option.vue).toBe(option.react)
  })

  test("TabsTab outside Tabs throws, like the Radix item", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    // Vue also warns that the failed component has no render function
    vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(() => render(<ReactTabs.Tab value="a">A</ReactTabs.Tab>)).toThrow("`ToggleGroupItem` must be used within `ToggleGroup`")
    let captured: unknown
    const Boundary = defineComponent({
      setup(_props, { slots }) {
        onErrorCaptured((error) => {
          captured = error
          return false
        })
        return () => slots.default?.()
      },
    })
    mountVue(() => h(Boundary, null, { default: () => h(TabsTab, { value: "a" }, { default: () => "A" }) }))
    expect((captured as Error).message).toBe("`TabsTab` must be used within `Tabs`")
    consoleError.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Interaction: selection, emitted values, keyboard
// ---------------------------------------------------------------------------

type Call = [string, ...unknown[]]

type Tools = {
  /** Clicks the tab with this label (or aria-label) */
  click: (label: string) => Promise<void>
  /** Focuses the tab with this label */
  focus: (label: string) => Promise<void>
  /** Focuses the group element, as Tab from outside does */
  focusGroup: () => Promise<void>
  /** Presses a key on the focused element and lets focus move */
  key: (key: string, init?: Record<string, unknown>) => Promise<void>
  /** Activates the focused tab the way a browser does for Enter/Space */
  activate: () => Promise<void>
  /** Records the DOM, the focused tab and the calls so far */
  snapshot: () => void
}

const findTab = (label: string) => {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>("[role=radio]"))
  const tab = tabs.find((el) => el.textContent === label || el.getAttribute("aria-label") === label)
  if (!tab) throw new Error(`No tab ${label}`)
  return tab
}

const focusedLabel = () => {
  const active = document.activeElement as HTMLElement | null
  if (!active || active === document.body) return "(body)"
  return active.getAttribute("role") === "radiogroup" ? "(group)" : (active.textContent || active.getAttribute("aria-label") || "?")
}

const fakeTimers = () =>
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })

// Radix moves roving focus in a setTimeout, Reka in nextTick. One frame per
// step keeps both runs on the same animation-frame grid, so the thumb is
// compared too.
const settle = () =>
  interact(() => {
    vi.advanceTimersByTime(16)
  })

const makeTools = (calls: Call[], out: string[]): Tools => ({
  click: async (label) => {
    await interact(() => {
      const tab = findTab(label)
      fireEvent.mouseDown(tab)
      tab.focus()
      fireEvent.mouseUp(tab)
      fireEvent.click(tab)
    })
    await settle()
  },
  focus: async (label) => {
    await interact(() => findTab(label).focus())
    await settle()
  },
  focusGroup: async () => {
    await interact(() => document.querySelector<HTMLElement>("[role=radiogroup]")!.focus())
    await settle()
  },
  key: async (key, init = {}) => {
    await interact(() => {
      fireEvent.keyDown(document.activeElement!, { key, ...init })
    })
    await settle()
  },
  activate: async () => {
    await interact(() => {
      fireEvent.click(document.activeElement!)
    })
    await settle()
  },
  snapshot: () => {
    out.push(`${serializeDom()}\nfocused: ${focusedLabel()}\ncalls: ${JSON.stringify(calls)}`)
  },
})

type WalkMode = "controlled" | "fixed" | "uncontrolled"

/**
 * Mounts the spec in React, runs `steps`, then in Vue. "controlled" stores
 * each change in parent state, "fixed" ignores changes, "uncontrolled"
 * passes no value.
 */
const walkTabs = async (spec: GroupSpec, mode: WalkMode, steps: (tools: Tools) => Promise<void>) => {
  fakeTimers()
  try {
    return await walkTabsWithTimers(spec, mode, steps)
  } finally {
    vi.useRealTimers()
  }
}

const walkTabsWithTimers = async (spec: GroupSpec, mode: WalkMode, steps: (tools: Tools) => Promise<void>) => {
  const reactCalls: Call[] = []
  const react: string[] = []

  function ReactApp() {
    const [value, setValue] = useState(spec.value)
    return reactTabs(
      { ...spec, value: mode === "uncontrolled" ? undefined : value },
      {
        onChange: (next) => {
          reactCalls.push(["change", next])
          if (mode === "controlled") setValue(next)
        },
        onClick: () => reactCalls.push(["click"]),
      },
    )
  }

  await act(async () => {
    render(<ReactApp />)
  })
  // Vue drops events stamped at or before its listener was attached, and
  // fake Date does not move by itself: start one frame after mount
  await settle()
  await steps(makeTools(reactCalls, react))
  cleanup()

  const vueCalls: Call[] = []
  const vueChanges: unknown[] = []
  const vue: string[] = []
  const VueApp = defineComponent({
    setup() {
      const value = ref(spec.value)
      return () =>
        vueTabs(
          { ...spec, value: mode === "uncontrolled" ? undefined : value.value },
          {
            onChange: (next) => {
              vueCalls.push(["change", next])
              if (mode === "controlled") value.value = next
            },
            onVueChange: (next) => vueChanges.push(next),
            onClick: () => vueCalls.push(["click"]),
          },
        )
    },
  })
  mountVue(() => h(VueApp))
  await flushVue()
  await settle()
  await steps(makeTools(vueCalls, vue))

  // `change` mirrors `update:value` one to one
  expect(vueChanges).toEqual(vueCalls.filter(([name]) => name === "change").map(([, value]) => value))
  return { react, vue, reactCalls }
}

describe("Tabs behaves like React", () => {
  test("click selects in controlled mode; clicking the selected or a disabled tab changes nothing", async () => {
    const spec: GroupSpec = {
      value: "overview",
      tabs: SECTIONS.map((tab) => (tab.value === "reports" ? { ...tab, disabled: true } : tab)),
    }
    const { react, vue, reactCalls } = await walkTabs(spec, "controlled", async ({ click, snapshot }) => {
      snapshot()
      await click("Analytics")
      snapshot()
      await click("Analytics")
      snapshot()
      await click("Reports")
      snapshot()
      await click("Settings")
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(reactCalls).toEqual([["change", "analytics"], ["click"], ["click"], ["click"], ["change", "settings"], ["click"]])
    expect(react.at(-1)).toMatch(/aria-checked="true"[^\n]*>\n {6}<span class="TabContent">\n {8}<span class="TabLabel">\n {10}"Settings"/)
  })

  test("fixed value: change is emitted but selection stays", async () => {
    const { react, vue, reactCalls } = await walkTabs({ value: "overview", tabs: SECTIONS }, "fixed", async ({ click, snapshot }) => {
      await click("Reports")
      snapshot()
      await click("Settings")
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(reactCalls).toEqual([["change", "reports"], ["click"], ["change", "settings"], ["click"]])
  })

  test("uncontrolled: selection is internal and clicking the selected tab clears it", async () => {
    const { react, vue, reactCalls } = await walkTabs({ tabs: SECTIONS }, "uncontrolled", async ({ click, snapshot }) => {
      snapshot()
      await click("Reports")
      snapshot()
      await click("Reports")
      snapshot()
      await click("Overview")
      snapshot()
    })
    expect(vue).toEqual(react)
    // Radix reports uncontrolled changes from an effect, after the group's click
    expect(reactCalls).toEqual([["click"], ["change", "reports"], ["click"], ["click"], ["change", "overview"]])
  })

  test("disabled group ignores clicks and takes no tab stop", async () => {
    const { react, vue, reactCalls } = await walkTabs({ value: "overview", disabled: true, tabs: SECTIONS }, "controlled", async ({ click, snapshot }) => {
      await click("Reports")
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(reactCalls).toEqual([["click"]])
    expect(react[0]).toContain('role="radiogroup" style="outline: none" tabindex="-1"')
  })

  test("a caller click handler that calls preventDefault() cancels the selection", async () => {
    const spec: GroupSpec = { value: "overview", tabs: SECTIONS }
    const cancel = (event: Event) => event.preventDefault()
    const reactOut: string[] = []
    const reactChange = vi.fn()
    render(
      <ReactTabs value="overview" onChange={reactChange} aria-label="Sections">
        <ReactTabs.Tab value="overview">Overview</ReactTabs.Tab>
        <ReactTabs.Tab value="analytics" {...({ onClick: cancel } as object)}>
          Analytics
        </ReactTabs.Tab>
      </ReactTabs>,
    )
    fireEvent.click(findTab("Analytics"))
    reactOut.push(serializeDom())
    cleanup()

    const vueChange = vi.fn()
    mountVue(() =>
      h(Tabs, { "value": spec.value, "onUpdate:value": vueChange, "aria-label": "Sections" }, {
        default: () => [
          h(TabsTab, { value: "overview" }, { default: () => "Overview" }),
          h(TabsTab, { value: "analytics", onClick: cancel }, { default: () => "Analytics" }),
        ],
      }),
    )
    await flushVue()
    fireEvent.click(findTab("Analytics"))
    await flushVue()
    expect(serializeDom()).toBe(reactOut[0])
    expect(reactChange).not.toHaveBeenCalled()
    expect(vueChange).not.toHaveBeenCalled()
  })

  test("Vue: a `.once` click listener that calls preventDefault() cancels the selection too", async () => {
    const vueChange = vi.fn()
    const cancelOnce = vi.fn((event: Event) => event.preventDefault())
    mountVue(() =>
      h(Tabs, { "value": "overview", "onUpdate:value": vueChange, "aria-label": "Sections" }, {
        default: () => [
          h(TabsTab, { value: "overview" }, { default: () => "Overview" }),
          h(TabsTab, { value: "analytics", onClickOnce: cancelOnce }, { default: () => "Analytics" }),
        ],
      }),
    )
    await flushVue()
    fireEvent.click(findTab("Analytics"))
    await flushVue()
    expect(cancelOnce).toHaveBeenCalledTimes(1)
    expect(vueChange).not.toHaveBeenCalled()
    fireEvent.click(findTab("Analytics"))
    await flushVue()
    expect(vueChange).toHaveBeenCalledWith("analytics")
  })

  test("arrow keys, Home and End move focus without selecting; Enter/Space activation selects", async () => {
    const spec: GroupSpec = {
      value: "overview",
      tabs: SECTIONS.map((tab) => (tab.value === "analytics" ? { ...tab, disabled: true } : tab)),
    }
    const { react, vue, reactCalls } = await walkTabs(spec, "controlled", async ({ focus, key, activate, snapshot }) => {
      await focus("Overview")
      snapshot()
      // Skips the disabled tab
      await key("ArrowRight")
      snapshot()
      await key("ArrowDown")
      snapshot()
      // No wrap-around: loop is off
      await key("ArrowRight")
      snapshot()
      await key("Home")
      snapshot()
      await key("End")
      snapshot()
      await key("ArrowLeft")
      snapshot()
      await key("ArrowUp")
      snapshot()
      await key("PageDown")
      snapshot()
      await key("PageUp")
      snapshot()
      // Modifier keys are left to the browser
      await key("ArrowRight", { shiftKey: true })
      snapshot()
      await key("End")
      await activate()
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react.map((step) => step.match(/focused: (.*)/)![1])).toEqual([
      "Overview",
      "Reports",
      "Settings",
      "Settings",
      "Overview",
      "Settings",
      "Reports",
      "Overview",
      "Settings",
      "Overview",
      "Overview",
      "Settings",
    ])
    expect(reactCalls).toEqual([["change", "settings"], ["click"]])
  })

  test("vertical tabs take both arrow axes (orientation is not passed to the focus group)", async () => {
    const { react, vue } = await walkTabs({ value: "overview", orientation: "vertical", tabs: SECTIONS }, "controlled", async ({ focus, key, snapshot }) => {
      await focus("Overview")
      await key("ArrowDown")
      snapshot()
      await key("ArrowRight")
      snapshot()
      await key("ArrowUp")
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react.map((step) => step.match(/focused: (.*)/)![1])).toEqual(["Analytics", "Reports", "Analytics"])
  })

  test("tabbing into the group focuses the selected tab, then the last focused one", async () => {
    const { react, vue } = await walkTabs({ value: "reports", tabs: SECTIONS }, "fixed", async ({ focus, focusGroup, key, snapshot }) => {
      await focusGroup()
      snapshot()
      await focus("Settings")
      await key("Tab", { shiftKey: true })
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("focused: Reports")
  })

  test("tabbing into an uncontrolled group with no selection focuses the first tab", async () => {
    const { react, vue } = await walkTabs({ tabs: SECTIONS }, "uncontrolled", async ({ focusGroup, snapshot }) => {
      await focusGroup()
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("focused: Overview")
  })

  // The label of the tab that holds the roving tab stop in a snapshot
  const tabStop = (step: string) => step.match(/<button[^>]*tabindex="0"[^>]*>[\s\S]*?\n\s*"(\w+)"/)?.[1]

  test("a caller mousedown handler that calls preventDefault() keeps the tab stop and click-focus state", async () => {
    const prevent = (event: Event) => event.preventDefault()
    const tabs = SECTIONS.map((tab) => (tab.value === "analytics" ? { ...tab, attrs: { onMousedown: prevent } } : tab))
    const { react, vue } = await walkTabs({ value: "overview", tabs }, "fixed", async ({ focus, focusGroup, snapshot }) => {
      await focus("Overview")
      await interact(() => {
        fireEvent.mouseDown(findTab("Analytics"))
      })
      await settle()
      snapshot()
      // No click focus is pending, so entering the group still moves focus in
      await focusGroup()
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(tabStop(react[0])).toBe("Overview")
    expect(react[1]).toContain("focused: Overview")
  })

  test("a caller focus handler that calls preventDefault() keeps the tab stop", async () => {
    const prevent = (event: Event) => event.preventDefault()
    const tabs = SECTIONS.map((tab) => (tab.value === "analytics" ? { ...tab, attrs: { onFocus: prevent } } : tab))
    const { react, vue } = await walkTabs({ value: "overview", tabs }, "fixed", async ({ focus, snapshot }) => {
      await focus("Overview")
      await focus("Analytics")
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("focused: Analytics")
    expect(tabStop(react[0])).toBe("Overview")
  })

  test("a group focus handler that calls preventDefault() cancels entry focus", async () => {
    const prevent = (event: Event) => event.preventDefault()
    const { react, vue } = await walkTabs(
      { value: "reports", tabs: SECTIONS, attrs: { onFocus: prevent } },
      "fixed",
      async ({ focusGroup, snapshot }) => {
        await focusGroup()
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain("focused: (group)")
  })

  test("pointer enter sets --scale on the tab", () => {
    render(reactTabs({ value: "a", tabs: [{ value: "a", label: "A" }] }))
    mountVue(() => vueTabs({ value: "a", tabs: [{ value: "a", label: "A" }] }))
    const [reactTab, vueTab] = Array.from(document.querySelectorAll<HTMLElement>("[role=radio]"))
    for (const tab of [reactTab!, vueTab!]) fireEvent.pointerEnter(tab)
    expect(vueTab!.style.getPropertyValue("--scale")).toBe(reactTab!.style.getPropertyValue("--scale"))
    expect(reactTab!.style.getPropertyValue("--scale")).toBe("0.96")
  })
})

// ---------------------------------------------------------------------------
// Thumb positioning: jsdom has no layout or ResizeObserver, so both are
// stubbed identically for the two frameworks
// ---------------------------------------------------------------------------

type Layout = {
  /** Width of the group's visible area; defaults to its content */
  rootWidth?: number
  rootHeight?: number
  /** Multiplies tab sizes, to simulate a font or size change */
  scale: number
}

const layout: Layout = { scale: 1 }
const scrollCalls: string[] = []
const observers: { callback: ResizeObserverCallback; disconnected: boolean }[] = []

const tabsOf = (root: Element) => Array.from(root.querySelectorAll<HTMLElement>(":scope > [role=radio]"))
const tabWidth = (tab: Element) => Math.round(((tab.textContent ?? "").length * 7 + 24.6) * layout.scale)
const TAB_HEIGHT = 28
const GUTTER = 2

const metric = (el: HTMLElement, name: string): number => {
  const isRoot = el.getAttribute("role") === "radiogroup"
  const isTab = el.getAttribute("role") === "radio"
  if (isRoot) {
    const tabs = tabsOf(el)
    const contentWidth = tabs.reduce((sum, tab) => sum + tabWidth(tab), 0) + GUTTER * 2
    const contentHeight = tabs.length * TAB_HEIGHT * layout.scale + GUTTER * 2
    switch (name) {
      case "clientWidth":
        return layout.rootWidth ?? contentWidth
      case "clientHeight":
        return layout.rootHeight ?? contentHeight
      case "scrollWidth":
        return contentWidth
      case "scrollHeight":
        return contentHeight
      default:
        return 0
    }
  }
  if (isTab) {
    const siblings = tabsOf(el.parentElement!)
    const index = siblings.indexOf(el)
    switch (name) {
      case "clientWidth":
        return tabWidth(el)
      case "clientHeight":
        return TAB_HEIGHT * layout.scale
      case "offsetWidth":
        return tabWidth(el)
      case "offsetLeft":
        return GUTTER + siblings.slice(0, index).reduce((sum, tab) => sum + tabWidth(tab), 0)
      case "offsetTop":
        return GUTTER + index * TAB_HEIGHT * layout.scale
      default:
        return 0
    }
  }
  return 0
}

const METRICS = ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "offsetWidth", "offsetLeft", "offsetTop"] as const

/** Fires every live ResizeObserver with the group's current content box */
const resize = async () => {
  await interact(() => {
    for (const observer of observers.filter((o) => !o.disconnected)) {
      const root = document.querySelector<HTMLElement>("[role=radiogroup]")!
      const width = root.scrollWidth
      const height = root.scrollHeight
      const entry = { contentBoxSize: [{ inlineSize: width, blockSize: height }], contentRect: { width, height } }
      observer.callback([entry as unknown as ResizeObserverEntry], {} as ResizeObserver)
    }
  })
}

describe("Tabs thumb positioning matches React", () => {
  beforeEach(() => {
    layout.scale = 1
    layout.rootWidth = undefined
    layout.rootHeight = undefined
    scrollCalls.length = 0
    observers.length = 0
    for (const name of METRICS) {
      vi.spyOn(HTMLElement.prototype, name, "get").mockImplementation(function (this: HTMLElement) {
        return metric(this, name)
      })
    }
    // Tabs scroll their own row (scrollTo on the root): scrollIntoView would scroll the page to the control too
    Object.defineProperty(Element.prototype, "scrollTo", {
      configurable: true,
      writable: true,
      value(this: Element, options: unknown) {
        scrollCalls.push(`${this.getAttribute("role")} ${JSON.stringify(options)}`)
      },
    })
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value(this: Element) {
        scrollCalls.push(`page scrolled to ${this.textContent}`)
      },
    })
    vi.stubGlobal(
      "ResizeObserver",
      class {
        entry: { callback: ResizeObserverCallback; disconnected: boolean }
        constructor(callback: ResizeObserverCallback) {
          this.entry = { callback, disconnected: false }
          observers.push(this.entry)
        }
        observe() {}
        unobserve() {}
        disconnect() {
          this.entry.disconnected = true
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
    delete (Element.prototype as { scrollTo?: unknown }).scrollTo
  })

  type State = {
    value?: string
    size: GroupSpec["size"]
    orientation: GroupSpec["orientation"]
    variant: GroupSpec["variant"]
    gutterSize?: GroupSpec["gutterSize"]
    pill: boolean
    flush: boolean
  }

  // Every key is listed: walkPairWithState only resets keys present here
  const initial: State = {
    value: "overview",
    size: "md",
    orientation: "horizontal",
    variant: "segmented",
    gutterSize: undefined,
    pill: true,
    flush: false,
  }

  const walkThumb = (state: Partial<State>, steps: Parameters<typeof walkPairWithState<State>>[3], tabs = SECTIONS) => {
    // Each run starts from the same layout; the React run's resize
    // observers are disconnected on cleanup, so resize() reaches Vue only
    const start = { ...initial, ...state }
    return walkPairWithState<State>(
      start,
      (s) => reactTabs({ ...s, tabs }),
      (s) => vueTabs({ ...s, tabs }),
      async (tools) => {
        layout.scale = 1
        await steps(tools)
      },
    )
  }

  test("mount, selection, size, gutter, pill and flush changes", async () => {
    const { react, vue } = await walkThumb({}, async ({ set, advance, snapshot }) => {
      snapshot() // before the first frame: no thumb styles
      await advance(16)
      snapshot()
      await advance(16)
      snapshot() // measured, no transition yet
      await advance(32)
      snapshot() // transition applied
      await set({ value: "reports" })
      await advance(32)
      snapshot()
      await advance(32)
      snapshot()
      // Size change: transition off, measure, then restore it
      layout.scale = 1.25
      await set({ size: "lg" })
      snapshot()
      await advance(32)
      snapshot()
      await advance(32)
      snapshot()
      await set({ gutterSize: "xl" })
      await advance(64)
      snapshot()
      await set({ pill: false })
      await advance(64)
      snapshot()
      await set({ variant: "underline", flush: true })
      await advance(64)
      snapshot()
      // Selection and size in the same update take the size path
      layout.scale = 1
      await set({ value: "settings", size: "sm" })
      snapshot()
      await advance(64)
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[1]).not.toContain("TabsThumb\" style")
    expect(react[3]).toContain("transition: width var(--tabs-thumb-transition-duration, 200ms) var(--cubic-enter), transform var(--tabs-thumb-transition-duration, 200ms) var(--cubic-enter)")
    expect(react[3]).toContain("translateX(2px)")
  })

  test("variant change alone does not re-measure (not an effect dependency)", async () => {
    const { react, vue } = await walkThumb({}, async ({ set, advance, snapshot }) => {
      await advance(64)
      snapshot()
      layout.scale = 2
      await set({ variant: "underline" })
      await advance(64)
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[1].match(/TabsThumb" style="[^"]*"/)?.[0]).toBe(react[0].match(/TabsThumb" style="[^"]*"/)?.[0])
  })

  test("vertical orientation and switching orientation", async () => {
    const { react, vue } = await walkThumb({ orientation: "vertical", value: "analytics" }, async ({ set, advance, snapshot }) => {
      await advance(64)
      snapshot()
      await set({ value: "settings" })
      await advance(64)
      snapshot()
      await set({ orientation: "horizontal" })
      await advance(64)
      snapshot()
      await set({ orientation: "vertical" })
      await advance(64)
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("height var(--tabs-thumb-transition-duration, 200ms) var(--cubic-enter)")
    expect(react[0]).toMatch(/translateY\(30px\)/)
  })

  test("resize observer re-measures instantly and keeps the transition", async () => {
    const { react, vue } = await walkThumb({ value: "analytics" }, async ({ advance, snapshot }) => {
      await resize()
      snapshot() // first observation measures right away
      await advance(64)
      layout.scale = 1.5
      await resize()
      snapshot()
      // Same content box: ignored
      layout.scale = 1.5
      await resize()
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[1]).toContain("transition: width var(--tabs-thumb-transition-duration, 200ms)")
  })

  test("uncontrolled selection moves the thumb only on the next resize", async () => {
    const { react, vue } = await walkThumb({ value: undefined }, async ({ advance, snapshot }) => {
      await advance(64)
      snapshot() // nothing selected: no measurement
      await interact(() => {
        fireEvent.click(findTab("Reports"))
      })
      await advance(64)
      snapshot()
      layout.scale = 1.1
      await resize()
      snapshot()
    })
    expect(vue).toEqual(react)
    expect(react[1]).not.toContain("translateX")
    expect(react[2]).toContain("translateX")
  })

  test("scrollable tabs scroll the active one into view once the transition is set", async () => {
    const tabs: TabSpec[] = ["Overview", "Analytics", "Reports", "Settings", "Members", "Billing", "Security", "Integrations"].map(
      (label, i) => ({ value: String(i + 1), label }),
    )
    const runs: string[][] = []
    const { react, vue } = await walkThumb(
      { value: "1" },
      async ({ set, advance, snapshot }) => {
        layout.rootWidth = 260
        scrollCalls.length = 0
        await advance(64) // mount: measured without scrolling
        await set({ value: "8" })
        await advance(64)
        await set({ value: "5" })
        await advance(64)
        await set({ value: "2" }) // inside the visible band: no scroll
        await advance(64)
        snapshot()
        runs.push(scrollCalls.splice(0))
      },
      tabs,
    )
    expect(vue).toEqual(react)
    expect(runs[1]).toEqual(runs[0])
    // The row scrolls to center Integrations, then back to Members; the page never moves (owner 08.11)
    expect(runs[0]).toHaveLength(2)
    const lefts = runs[0].map((call) => {
      expect(call).toMatch(/^\w+ \{"left":-?[\d.]+,"behavior":"smooth"\}$/)
      return Number(call.match(/"left":(-?[\d.]+)/)?.[1])
    })
    expect(lefts[0]).toBeGreaterThan(lefts[1])
  })

  test.each(["horizontal", "vertical"] as const)(
    "%s scrolling respects reduced motion changed after mount",
    async (orientation) => {
      let reducedMotion = false
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
        media: query,
      }))
      const runs: string[][] = []
      const { react, vue } = await walkThumb(
        { value: "overview", orientation },
        async ({ set, advance, snapshot }) => {
          reducedMotion = false
          layout.rootWidth = 100
          layout.rootHeight = 60
          scrollCalls.length = 0
          await advance(64)
          await set({ value: "settings" })
          await advance(64)
          reducedMotion = true
          await set({ value: "overview" })
          await advance(64)
          reducedMotion = false
          await set({ value: "settings" })
          await advance(64)
          snapshot()
          runs.push(scrollCalls.splice(0))
        },
      )
      expect(vue).toEqual(react)
      expect(runs[1]).toEqual(runs[0])
      expect(runs[0].map((call) => call.match(/"behavior":"([^"]+)"/)?.[1])).toEqual([
        "smooth", "auto", "smooth",
      ])
    },
  )

  test("vertical scrollable tabs scroll on the block axis", async () => {
    const runs: string[][] = []
    const { react, vue } = await walkThumb(
      { value: "overview", orientation: "vertical" },
      async ({ set, advance, snapshot }) => {
        layout.rootHeight = 60
        scrollCalls.length = 0
        await advance(64)
        await set({ value: "settings" })
        await advance(64)
        snapshot()
        runs.push(scrollCalls.splice(0))
      },
    )
    expect(vue).toEqual(react)
    expect(runs[1]).toEqual(runs[0])
    expect(runs[0]).toHaveLength(1)
    expect(runs[0][0]).toMatch(/^\w+ \{"top":-?[\d.]+,"behavior":"smooth"\}$/)
  })
})

describe("Segmented Tabs on a phone follow the iOS 26 kit", () => {
  const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")

  test("in content the track is the plain control of iOS 27.2 (SwiftUI Picker .segmented): 32px, no glass, primary labels", () => {
    const touch = read("styles/touch.css")
    const plainSelector = 'html :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"] {'
    const block = touch.slice(touch.indexOf(plainSelector), touch.indexOf("}", touch.indexOf(plainSelector)))
    for (const declaration of [
      // A 32pt capsule, the thumb 2pt inside it, segments 4pt apart (iPhone 17, 402pt).
      "--segmented-control-size: 32px;",
      "--segmented-control-gutter: 2px;",
      "--segmented-control-gap: 4px;",
      "--segmented-control-thumb-outset: 0px;",
      "--segmented-control-option-radius: calc(var(--segmented-control-size) / 2 - var(--segmented-control-gutter));",
      "--segmented-control-font-size: 13px;",
      "--segmented-control-line-height: 18px;",
      "--segmented-control-font-weight: 510;",
      "--segmented-control-active-font-weight: 590;",
      // The tertiary fill and a plain thumb: no sheen, rim, shadow or blur.
      "--segmented-control-background: var(--segmented-control-mobile-plain-background);",
      "--segmented-control-sheen: none;",
      "--segmented-control-shadow: none;",
      "--segmented-control-backdrop-filter: none;",
      "--segmented-control-thumb-background: var(--segmented-control-mobile-plain-thumb-background);",
      "--segmented-control-thumb-shadow: none;",
      // Every label primary; the weight marks the selection.
      "--color-text-secondary: var(--color-text);",
    ]) {
      expect(block).toContain(declaration)
    }
    expect(block).not.toContain("mobile-glass")
    // In the kit's layer, where a component's own segmented control (the composer's) can outrank it.
    const layer = touch.lastIndexOf("@layer components {", touch.indexOf(plainSelector))
    expect(layer).toBeGreaterThan(-1)
    expect(touch.slice(layer, touch.indexOf(plainSelector))).not.toMatch(/^  \}/m)
    // light-dark() resolves per theme only on root tokens: an element selector under html would miss dark.
    expect(block).not.toMatch(/:\s*light-dark\(/)
    const tokens = read("styles/variables-components.css")
    expect(tokens).toContain("--segmented-control-mobile-plain-background: light-dark(var(--alpha-06), var(--alpha-12));")
    expect(tokens).toContain("--segmented-control-mobile-plain-thumb-background: light-dark(var(--gray-0), var(--alpha-25));")
  })

  test("in a bar the track is the glass control of iOS 27.2 and Calendar (IMG_5433): 48px of the shared glass, a 40px thumb outset 4px", () => {
    const touch = read("styles/touch.css")
    const block = touch.match(/html \[data-toolbar\] :is\(\[data-variant="segmented"\], \[data-variant="underline"\]\)\[data-orientation="horizontal"\] \{([^}]*)\}/)?.[1] ?? ""
    for (const declaration of [
      "--segmented-control-size: 48px;",
      "--segmented-control-gutter: 4px;",
      "--segmented-control-gap: 0px;",
      "--segmented-control-thumb-outset: 4px;",
      // 14px from the label to the selection's edge, the label inset of a toolbar text button.
      "--segmented-control-option-gutter: 10px;",
      "--segmented-control-font-size: 15px;",
      "--segmented-control-line-height: 20px;",
      "--segmented-control-font-weight: 510;",
      "--segmented-control-active-font-weight: 510;",
      // The same glass as toolbar buttons, resolved on the control so a bar or sheet can tune it.
      "--segmented-control-background: var(--mobile-glass-background);",
      "--segmented-control-sheen: var(--mobile-glass-sheen);",
      "--segmented-control-shadow: var(--mobile-glass-shadow);",
      "--segmented-control-backdrop-filter: var(--mobile-glass-backdrop-filter);",
      "--segmented-control-thumb-background: var(--segmented-control-mobile-thumb-background);",
    ]) {
      expect(block).toContain(declaration)
    }
    // Every label is primary, as iOS 27.2 and Calendar draw both segments.
    expect(block).toContain("--color-text-secondary: var(--color-text);")
    expect(block).not.toContain("mobile-label-secondary")
    expect(block).not.toMatch(/:\s*light-dark\(/)
    const tokens = read("styles/variables-components.css")
    expect(tokens).toContain("--segmented-control-mobile-thumb-background: light-dark(var(--alpha-08), var(--gray-200));")
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    const material = [...phone.matchAll(/\.Tabs:where\(\[data-orientation="horizontal"\]\) \{([^}]*)\}/g)].map((match) => match[1]).join("")
    expect(material).toContain("padding-inline: calc(var(--segmented-control-gutter) + var(--segmented-control-thumb-outset, 0px));")
    expect(material).toContain("background-image: var(--segmented-control-sheen, none);")
    expect(material).toContain("box-shadow: var(--segmented-control-shadow, none);")
    expect(material).toContain("backdrop-filter: var(--segmented-control-backdrop-filter, none);")
    // The material follows the underline track, whose background shorthand would otherwise clear the sheen.
    expect(phone.lastIndexOf("background-image: var(--segmented-control-sheen, none);")).toBeGreaterThan(phone.indexOf("background: var(--segmented-control-background);"))
    const thumb = phone.match(/\.Tabs:where\(\[data-orientation="horizontal"\]\) > \.TabsThumb \{([^}]*)\}/)?.[1] ?? ""
    expect(thumb).toContain("box-sizing: content-box;")
    expect(thumb).toContain("margin-left: calc(-1 * var(--segmented-control-thumb-outset, 0px));")
    expect(thumb).toContain("padding-inline: var(--segmented-control-thumb-outset, 0px);")
  })

  test("the selected label is the primary color and the others the secondary role, which a phone makes primary in content and in a bar, untracked: the system font tracks it", () => {
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)")).match(/\.Tabs\[data-orientation="horizontal"\] \.Tab \{([^}]*)\}/)?.[1] ?? ""
    expect(phone).toContain("padding-inline: var(--segmented-control-option-gutter);")
    // No color of its own: the base colors apply, secondary off (the phone role, touch.css) and primary on.
    expect(phone).not.toMatch(/(^|[^-])color:/)
    expect(css).toMatch(/\.Tab \{\s*position: relative;[^}]*color: var\(--color-text-secondary\);/)
    expect(css).toMatch(/&\[data-state="on"\] \{[^}]*color: var\(--color-text\);/)
    expect(phone).not.toContain("letter-spacing")
    expect(read("styles/touch.css")).not.toContain("--segmented-control-letter-spacing")
  })

  test("a symbol alone in its segment is 20px, the 17pt symbol of iOS 27.2; beside a label it keeps the icon size", () => {
    const touch = read("styles/touch.css")
    const plainSelector = 'html :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"] {'
    const plain = touch.slice(touch.indexOf(plainSelector), touch.indexOf("}", touch.indexOf(plainSelector)))
    expect(plain).toContain("--segmented-control-symbol-size: 20px;")
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    const symbol = phone.match(/\.Tabs\[data-orientation="horizontal"\] \.TabContent > svg:where\(:only-child:not\(\[data-no-autosize\]\)\) \{([^}]*)\}/)?.[1] ?? ""
    expect(symbol).toContain("width: var(--segmented-control-symbol-size, var(--segmented-control-icon-size));")
    expect(symbol).toContain("height: var(--segmented-control-symbol-size, var(--segmented-control-icon-size));")
    // Only on a phone: the desktop rule sizes every icon by the control's size.
    expect(css.slice(0, css.indexOf("@media (max-width: 767px)"))).not.toContain("--segmented-control-symbol-size")
  })

  // iOS switches the views of a screen with the segmented control only; it has no underline tabs.
  test("horizontal tabs of either variant are the kit control: segments of one width, scrolling when they do not fit", () => {
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    expect(phone).toMatch(/\.Tabs:where\(\[data-orientation="horizontal"\]\) \{\s*display: inline-grid;\s*grid-auto-columns: minmax\(max-content, 1fr\);\s*grid-auto-flow: column;\s*\}/)
    expect(phone).toMatch(/\.Tabs:where\(\[data-orientation="horizontal"\]\[data-block\]\) \{\s*display: grid;\s*grid-auto-columns: minmax\(0, 1fr\);\s*\}/)
    const track = phone.match(/\.Tabs:where\(\[data-variant="underline"\]\[data-orientation="horizontal"\]\) \{([^}]*)\}/)?.[1] ?? ""
    expect(track).toContain("padding: var(--segmented-control-gutter);")
    expect(track).toContain("border: 0;")
    expect(track).toContain("border-radius: var(--segmented-control-radius);")
    expect(track).toContain("background: var(--segmented-control-background);")
    const thumb = phone.match(/\.Tabs:where\(\[data-variant="underline"\]\[data-orientation="horizontal"\]\) > \.TabsThumb \{([^}]*)\}/)?.[1] ?? ""
    expect(thumb).toContain("top: var(--segmented-control-gutter);")
    expect(thumb).toContain("height: auto;")
    expect(thumb).toContain("background: var(--segmented-control-thumb-background);")
  })

  test("vertical tabs are list rows (kit Row 550:50430): 52px, no thumb, the checkmark shows on the selected row only", () => {
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    expect(phone).toMatch(/\.Tabs:where\(\[data-orientation="vertical"\]\) > \.TabsThumb \{\s*display: none;\s*\}/)
    const row = phone.match(/\.Tabs\[data-orientation="vertical"\] \.Tab \{([^}]*)/)?.[1] ?? ""
    expect(row).toContain("min-height: var(--field-row-min-height, 52px);")
    expect(row).toContain("padding: 0 var(--mobile-list-inset, 20px);")
    // The line between rows stops at the list inset on both ends, as between iOS 27 list rows.
    expect(phone).toMatch(/\.Tab \+ \.Tab::after \{[^}]*inset-inline: var\(--mobile-list-inset, 20px\);/)
    expect(row).toContain("font-weight: inherit;")
    expect(phone).toMatch(/\.Tab > \.TabCheckmark \{\s*display: block;[^}]*visibility: hidden;/)
    expect(phone).toMatch(/\.Tab\[data-state="on"\] > \.TabCheckmark \{\s*visibility: visible;\s*\}/)
    // Off a phone the checkmark never shows.
    expect(css.slice(0, css.indexOf("@media (max-width: 767px)"))).toMatch(/\.Tab > \.TabCheckmark \{\s*display: none;\s*\}/)
    // iOS 27.2 list rows (UIKit and SwiftUI, iPhone 17): the checkmark's ink 15 x 14.3pt ending 24.3pt from the cell's
    // edge, a symbol in a 24px column and the text and the separator 60pt in.
    const mark = phone.match(/\.Tabs\[data-orientation="vertical"\] \.Tab > \.TabCheckmark \{([^}]*)\}/)?.[1] ?? ""
    expect(mark).toContain("width: 26px;")
    expect(mark).toContain("height: 26px;")
    expect(mark).toContain("margin-block: -2px;")
    expect(mark).toContain("margin-inline: auto -2px;")
    const list = phone.match(/\.Tabs:where\(\[data-orientation="vertical"\]\) \{([^}]*)\}/)?.[1] ?? ""
    expect(list).toContain("--segmented-control-icon-size: 24px;")
    expect(list).toContain("--segmented-control-icon-offset: 0px;")
    expect(list).toContain("--segmented-control-content-gap: 16px;")
    expect(phone).toContain("inset-inline-start: calc(var(--mobile-list-inset, 20px) + 40px);")
  })

  test("only vertical tabs carry the checkmark, one per tab, hidden from screen readers (React = Vue)", async () => {
    const vertical = await pairOf({ value: "reports", orientation: "vertical", tabs: SECTIONS })
    expect(vertical.vue).toBe(vertical.react)
    expect(vertical.react.match(/TabCheckmark/g)?.length).toBe(SECTIONS.length)
    const horizontal = await pairOf({ value: "reports", variant: "underline", tabs: SECTIONS })
    expect(horizontal.vue).toBe(horizontal.react)
    expect(horizontal.react).not.toContain("TabCheckmark")
    render(
      <ReactTabs value="reports" orientation="vertical" aria-label="Sections" onChange={() => {}}>
        <ReactTabs.Tab value="overview">Overview</ReactTabs.Tab>
        <ReactTabs.Tab value="reports">Reports</ReactTabs.Tab>
      </ReactTabs>,
    )
    const marks = document.querySelectorAll('button > svg[aria-hidden="true"]:last-child')
    expect(marks).toHaveLength(2)
  })
})

// The docs name the component by its iOS name, Segmented Control (owner 10.11), and Tabs stays findable.
describe("docs name", () => {
  const file = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

  test("both manifests list the page as Segmented Control with the Tabs names as aliases, and the MCP lookup matches them", () => {
    for (const [manifest, aliases] of [
      ["packages/mcp/src/data/manifest.json", ["Tabs", "Tabs.Tab", "Tabs.Option"]],
      ["packages/mcp/src/data/manifest-vue.json", ["Tabs", "TabsTab", "TabsOption"]],
    ] as const) {
      const components: { slug: string; name: string; aliases?: string[] }[] = JSON.parse(file(manifest)).components
      const page = components.find((component) => component.slug === "segmented-control")
      expect(page?.name).toBe("Segmented Control")
      expect(page?.aliases).toEqual(aliases)
      expect(components.some((component) => component.slug === "tabs")).toBe(false)
    }
  })

  test("the MCP lookups find it by its Tabs names in both frameworks", async () => {
    const { findComponent, searchComponents } = await import("../../packages/mcp/src/lookup")
    for (const [manifest, names] of [
      ["packages/mcp/src/data/manifest.json", ["Tabs", "Tabs.Tab", "Tabs.Option", "SegmentedControl", "SegmentedControl.Option", "segmented-control"]],
      ["packages/mcp/src/data/manifest-vue.json", ["Tabs", "TabsTab", "TabsOption", "SegmentedControl", "SegmentedControlOption"]],
    ] as const) {
      const components = JSON.parse(file(manifest)).components
      for (const name of names) {
        expect(findComponent(components, name)?.slug).toBe("segmented-control")
        expect(searchComponents(components, name).map((component: { slug: string }) => component.slug)).toContain("segmented-control")
      }
    }
  })

  test("the old pages, their anchor and the old Vue registry item redirect to the renamed ones", () => {
    const config = file("next.config.mjs")
    for (const [from, to] of [
      ["/components/tabs", "/components/segmented-control"],
      ["/vue/components/tabs", "/vue/components/segmented-control"],
      ["/r/vue/tabs.json", "/r/vue/segmented-control.json"],
    ]) {
      expect(config).toContain(`source: '${from}',\n        destination: '${to}',\n        permanent: true,`)
    }
    for (const page of ["content/components/segmented-control.mdx", "content/vue/components/segmented-control.mdx"]) {
      expect(file(page)).toContain('<span id="migration-from-segmentedcontrol" />\n\n### Also exported as Tabs')
    }
  })
})
