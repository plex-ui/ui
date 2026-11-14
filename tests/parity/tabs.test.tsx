import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { Fragment as ReactFragment, useEffect, useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createTextVNode, defineComponent, Fragment, h, onErrorCaptured, ref } from "vue"
import { Bell as ReactBell, Home as ReactHome } from "../../packages/ui/src/components/Icon"
import { SegmentedControl as ReactSegmentedControl } from "../../packages/ui/src/components/SegmentedControl"
import { Tabs as ReactTabs } from "../../packages/ui/src/components/Tabs"
import { Bell, Home } from "../../packages/vue/src/components/Icon"
import { SegmentedControl, SegmentedControlOption, SegmentedControlTab } from "../../packages/vue/src/components/SegmentedControl"
import { Tabs, TabsOption, TabsTab } from "../../packages/vue/src/components/Tabs"
import { equalizeSegments, watchSegments } from "../../packages/vue/src/components/Tabs/segments"
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

  test("mobileMaterial marks the group in both frameworks, the overflow menu one too; left out it adds nothing", async () => {
    for (const material of ["glass", "flat", undefined] as const) {
      for (const overflow of ["scroll", "menu"] as const) {
        const pair = await renderPair(
          <ReactSegmentedControl value="a" mobileMaterial={material} overflow={overflow} aria-label="View">
            <ReactSegmentedControl.Option value="a">A</ReactSegmentedControl.Option>
            <ReactSegmentedControl.Option value="b">B</ReactSegmentedControl.Option>
          </ReactSegmentedControl>,
          () =>
            h(SegmentedControl, { "value": "a", "mobileMaterial": material, "overflow": overflow, "aria-label": "View" }, {
              default: () => [
                h(SegmentedControlOption, { value: "a" }, { default: () => "A" }),
                h(SegmentedControlOption, { value: "b" }, { default: () => "B" }),
              ],
            }),
        )
        expect(pair.vue).toBe(pair.react)
        if (material) expect(pair.react).toContain(`data-mobile-material="${material}"`)
        else expect(pair.react).not.toContain("data-mobile-material")
      }
    }
  })

  test("mobileSegmentWidth marks the group in both frameworks, the overflow menu one too; left out it adds nothing", async () => {
    for (const width of ["equal", "content", undefined] as const) {
      for (const overflow of ["scroll", "menu"] as const) {
        const pair = await renderPair(
          <ReactSegmentedControl value="a" mobileSegmentWidth={width} overflow={overflow} aria-label="View">
            <ReactSegmentedControl.Option value="a">A</ReactSegmentedControl.Option>
            <ReactSegmentedControl.Option value="b">B</ReactSegmentedControl.Option>
          </ReactSegmentedControl>,
          () =>
            h(SegmentedControl, { "value": "a", "mobileSegmentWidth": width, "overflow": overflow, "aria-label": "View" }, {
              default: () => [
                h(SegmentedControlOption, { value: "a" }, { default: () => "A" }),
                h(SegmentedControlOption, { value: "b" }, { default: () => "B" }),
              ],
            }),
        )
        expect(pair.vue).toBe(pair.react)
        if (width) expect(pair.react).toContain(`data-mobile-segment-width="${width}"`)
        else expect(pair.react).not.toContain("data-mobile-segment-width")
      }
    }
  })

  test("a text icon stands in an element, from the prop and from the Vue slot, so a phone can hide it beside a label", async () => {
    const react = (
      <ReactSegmentedControl value="day" aria-label="Time">
        <ReactSegmentedControl.Option value="day" icon="☀">Day</ReactSegmentedControl.Option>
        <ReactSegmentedControl.Option value="night" icon="☾">Night</ReactSegmentedControl.Option>
      </ReactSegmentedControl>
    )
    const prop = await renderPair(react, () =>
      h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
        default: () => [
          h(SegmentedControlOption, { value: "day", icon: "☀" }, { default: () => "Day" }),
          h(SegmentedControlOption, { value: "night", icon: "☾" }, { default: () => "Night" }),
        ],
      }),
    )
    expect(prop.vue).toBe(prop.react)
    expect(prop.react).toMatch(/<span>\s+"☀"/)
    const slot = await renderPair(react, () =>
      h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
        default: () => [
          h(SegmentedControlOption, { value: "day" }, { icon: () => "☀", default: () => "Day" }),
          h(SegmentedControlOption, { value: "night" }, { icon: () => "☾", default: () => "Night" }),
        ],
      }),
    )
    expect(slot.vue).toBe(slot.react)
    // A conditional slot (`<template v-if>`) gives a fragment of text
    const fragment = await renderPair(react, () =>
      h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
        default: () => [
          h(SegmentedControlOption, { value: "day" }, { icon: () => [h(Fragment, ["☀"])], default: () => "Day" }),
          h(SegmentedControlOption, { value: "night" }, { icon: () => [h(Fragment, ["☾"])], default: () => "Night" }),
        ],
      }),
    )
    expect(fragment.vue).toBe(fragment.react)
    // An empty text icon adds no element, so the label does not move
    const empty = await renderPair(
      <ReactSegmentedControl value="day" aria-label="Time">
        <ReactSegmentedControl.Option value="day" icon="">Day</ReactSegmentedControl.Option>
      </ReactSegmentedControl>,
      () =>
        h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
          default: () => [h(SegmentedControlOption, { value: "day", icon: "" }, { default: () => "Day" })],
        }),
    )
    expect(empty.vue).toBe(empty.react)
    expect(empty.react).not.toMatch(/<span>\s+<span class="TabLabel"/)
    expect(empty.react).not.toMatch(/<span class="TabContent">\s+<span>\s+<\/span>/)
    // A React fragment or array of text stands in a span too, as the Vue fragment slot does
    for (const icon of [<>☀</>, ["☀"]]) {
      const wrapped = await renderPair(
        <ReactSegmentedControl value="day" aria-label="Time">
          <ReactSegmentedControl.Option value="day" icon={icon}>Day</ReactSegmentedControl.Option>
        </ReactSegmentedControl>,
        () =>
          h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
            default: () => [h(SegmentedControlOption, { value: "day" }, { icon: () => [h(Fragment, ["☀"])], default: () => "Day" })],
          }),
      )
      expect(wrapped.vue).toBe(wrapped.react)
      expect(wrapped.react).toMatch(/<span>\s+"☀"/)
    }
    // Beside an icon element only the text gets a span; the element stays a direct child of the content
    const mixed = await renderPair(
      <ReactSegmentedControl value="day" aria-label="Time">
        <ReactSegmentedControl.Option value="day" icon={<><ReactHome />☀</>}>Day</ReactSegmentedControl.Option>
      </ReactSegmentedControl>,
      () =>
        h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
          default: () => [h(SegmentedControlOption, { value: "day" }, { icon: () => [h(Home), "☀"], default: () => "Day" })],
        }),
    )
    expect(mixed.vue).toBe(mixed.react)
    expect(mixed.react).toMatch(/<span class="TabContent">\s+<svg/)
    // A Vue VNode icon prop of text, plain or in a fragment
    for (const icon of [createTextVNode("☀"), h(Fragment, ["☀"])]) {
      const vnode = await renderPair(
        <ReactSegmentedControl value="day" aria-label="Time">
          <ReactSegmentedControl.Option value="day" icon="☀">Day</ReactSegmentedControl.Option>
        </ReactSegmentedControl>,
        () =>
          h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
            default: () => [h(SegmentedControlOption, { value: "day", icon }, { default: () => "Day" })],
          }),
      )
      expect(vnode.vue).toBe(vnode.react)
    }
  })

  test("a keyed fragment of icons in the Vue slot keeps its identity: a new key remounts its icon", async () => {
    let mounts = 0
    const Stateful = defineComponent({
      setup() {
        mounts++
        return () => h("svg")
      },
    })
    const key = ref("a")
    mountVue(() =>
      h(SegmentedControl, { "value": "day", "aria-label": "Time" }, {
        default: () => [
          h(SegmentedControlOption, { value: "day" }, {
            icon: () => [h(Fragment, { key: key.value }, [h(Stateful)])],
            default: () => "Day",
          }),
        ],
      }),
    )
    await flushVue()
    expect(mounts).toBe(1)
    key.value = "b"
    await flushVue()
    expect(mounts).toBe(2)
  })

  test("a keyed React fragment of text and an icon keeps its identity: a new key remounts its icon", () => {
    let mounts = 0
    const Stateful = () => {
      useEffect(() => {
        mounts++
      }, [])
      return <svg />
    }
    const view = (key: string) => (
      <ReactSegmentedControl value="day" aria-label="Time">
        <ReactSegmentedControl.Option value="day" icon={<ReactFragment key={key}>☀<Stateful /></ReactFragment>}>Day</ReactSegmentedControl.Option>
      </ReactSegmentedControl>
    )
    const { container, rerender } = render(view("a"))
    expect(mounts).toBe(1)
    // The text still stands in its own span, beside the icon
    expect(container.querySelector(".TabContent > span:not(.TabLabel)")?.textContent).toBe("☀")
    rerender(view("a"))
    expect(mounts).toBe(1)
    rerender(view("b"))
    expect(mounts).toBe(2)
  })

  test("text that comes and goes beside an icon leaves the icon mounted, in an array and in a fragment", () => {
    let mounts = 0
    const Stateful = () => {
      useEffect(() => {
        mounts++
      }, [])
      return <svg />
    }
    const icons = [
      (text: boolean) => [text ? "☀" : "", <Stateful key="icon" />],
      (text: boolean) => <>{text && "☀"}<Stateful /></>,
    ]
    for (const icon of icons) {
      mounts = 0
      const view = (text: boolean) => (
        <ReactSegmentedControl value="day" aria-label="Time">
          <ReactSegmentedControl.Option value="day" icon={icon(text)}>Day</ReactSegmentedControl.Option>
        </ReactSegmentedControl>
      )
      const { container, rerender, unmount } = render(view(true))
      expect(container.querySelector(".TabContent > span:not(.TabLabel)")?.textContent).toBe("☀")
      rerender(view(false))
      expect(container.querySelector(".TabContent > span:not(.TabLabel)")).toBeNull()
      rerender(view(true))
      expect(mounts).toBe(1)
      unmount()
    }
  })

  test("a new selection travels as a lens where the control names one (the phone's large control), in React and Vue", async () => {
    const calls: { target: HTMLElement; keyframes: Keyframe[]; options: KeyframeAnimationOptions; animation: { playState: string } }[] = []
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value(this: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        // Still on its way, 205ms in: the control lets the lens out until it ends, and a switch now sets off from there
        const animation = {
          id: options.id,
          playState: "running",
          currentTime: 205,
          finished: new Promise(() => {}),
          cancel() {},
          pause() { this.playState = "paused" },
          play() { this.playState = "running" },
        }
        calls.push({ target: this, keyframes, options, animation })
        return animation
      },
    })
    Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] })
    // Segments 60pt wide from 4pt in, in a 250pt capsule; jsdom's own sizes come back after
    const sizes = ["clientWidth", "offsetLeft"].map((name) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)] as const)
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.getAttribute("role") === "radiogroup" ? 250 : 60
      },
    })
    Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
      configurable: true,
      get(this: HTMLElement) {
        return 4 + 62 * Array.from(this.parentElement?.querySelectorAll(":scope > [role=radio]") ?? []).indexOf(this)
      },
    })
    // The first measure sets the thumb's transition after four frames
    const wait = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)) })
    // touch.css names the lens's growth on the large control only, and the thumb's insets come from the gutter
    const lens = (thumb: HTMLElement | null) => {
      thumb?.style.setProperty("--segmented-control-thumb-lens-outset", "36px 11px")
      thumb?.style.setProperty("top", "4px")
      thumb?.style.setProperty("bottom", "4px")
    }
    const shape = (call?: (typeof calls)[number]) => call && { keyframes: call.keyframes, options: call.options }
    const running: { id: string; cancel: () => void; cancelled: boolean }[] = []
    try {
      const view = (value: string) => (
        <ReactSegmentedControl value={value} aria-label="Time">
          <ReactSegmentedControl.Option value="day">Day</ReactSegmentedControl.Option>
          <ReactSegmentedControl.Option value="week">Week</ReactSegmentedControl.Option>
        </ReactSegmentedControl>
      )
      const { container, rerender, unmount } = render(view("day"))
      await wait()
      // Without the lens's growth (desktop, the small control) the selection only slides
      rerender(view("week"))
      expect(calls).toHaveLength(0)
      const thumb = container.querySelector<HTMLElement>(".TabsThumb")
      lens(thumb)
      rerender(view("day"))
      expect(calls).toHaveLength(3)
      // The recording's path, Week (66pt in) back to Day (4pt): the centre a share of the way, the lens 36pt wider and
      // 11pt taller at 205ms, then pressed against Day's far side, and the thumb's own box at the end
      const [move, fill, label] = calls
      expect(move?.target).toBe(thumb)
      expect(move?.options).toEqual({ id: "segmented-control-lens", duration: 750 })
      expect(move?.keyframes[0]).toEqual({ offset: 0, transform: "translateX(66px)", width: "60px", top: "4px", bottom: "4px" })
      expect(move?.keyframes[9]).toEqual({ offset: 205 / 750, transform: "translateX(-7.8px)", width: "96px", top: "-1.5px", bottom: "-1.5px" })
      expect(move?.keyframes[17]).toMatchObject({ offset: 430 / 750, width: "53.16px", top: "0.92px", bottom: "0.92px" })
      expect(move?.keyframes.at(-1)).toEqual({ offset: 1, transform: "translateX(4px)", width: "60px", top: "4px", bottom: "4px" })
      // The fill and the edge: clear by 45ms, gray again from 250 to 300ms
      expect(fill?.options).toEqual({ id: "segmented-control-lens", duration: 750 })
      expect(fill?.keyframes.map((keyframe) => keyframe.offset)).toEqual([0, 45 / 750, 250 / 750, 300 / 750, 1])
      expect(Object.keys(fill?.keyframes[1] ?? {})).toEqual(["offset", "backgroundColor", "boxShadow"])
      // The label it lands on dims to 76% and comes back
      expect(label?.target.getAttribute("data-state")).toBe("on")
      expect(label?.target.textContent).toBe("Day")
      expect(label?.keyframes.map((keyframe) => keyframe.opacity)).toEqual([1, 1, 0.77, 0.76, 0.85, 0.93, 0.98, 1, 1])
      // The capsule lets the lens out while it travels, as the segments all fit
      expect(container.querySelector("[role=radiogroup]")?.hasAttribute("data-lens")).toBe(true)
      // The lens holds its first frame while the switch's frame is drawn, and sets off from the next
      expect(calls.map(({ animation }) => animation.playState)).toEqual(["paused", "paused", "paused"])
      await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)) })
      expect(calls.map(({ animation }) => animation.playState)).toEqual(["running", "running", "running"])
      // Switched again mid-flight, the lens sets off from where it is drawn and not from where it was going
      rerender(view("week"))
      expect(calls).toHaveLength(6)
      expect(calls[3]?.keyframes[0]).toEqual({ offset: 0, transform: "translateX(-7.8px)", width: "96px", top: "4px", bottom: "4px" })
      expect(calls[3]?.keyframes.at(-1)).toMatchObject({ transform: "translateX(66px)", width: "60px" })
      unmount()
      calls.length = 0

      const value = ref("week")
      const { container: vue } = mountVue(() =>
        h(SegmentedControl, { "value": value.value, "aria-label": "Time" }, {
          default: () => [
            h(SegmentedControlOption, { value: "day" }, { default: () => "Day" }),
            h(SegmentedControlOption, { value: "week" }, { default: () => "Week" }),
          ],
        }),
      )
      await wait()
      await flushVue()
      lens(vue.querySelector<HTMLElement>(".TabsThumb"))
      value.value = "day"
      await flushVue()
      expect(calls).toHaveLength(3)
      expect(calls.map(shape)).toEqual([move, fill, label].map(shape))

      // A lens still running ends when the next change comes, also when that change comes with reduced motion
      Object.defineProperty(HTMLElement.prototype, "getAnimations", {
        configurable: true,
        value: () => running.filter((animation) => !animation.cancelled),
      })
      for (const id of ["segmented-control-lens", "other"]) {
        const animation = { id, cancelled: false, cancel() { this.cancelled = true } }
        running.push(animation)
      }
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)", media: query, addEventListener() {}, removeEventListener() {} }))
      value.value = "week"
      await flushVue()
      expect(running.map((animation) => animation.cancelled)).toEqual([true, false])
      expect(calls).toHaveLength(3)
    } finally {
      delete (HTMLElement.prototype as { animate?: unknown }).animate
      delete (HTMLElement.prototype as { getAnimations?: unknown }).getAnimations
      for (const [name, descriptor] of sizes) {
        if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
        else delete (HTMLElement.prototype as Record<string, unknown>)[name]
      }
      vi.unstubAllGlobals()
    }
  })

  test("held on a phone, the large control grows, whitens and fades the held label, as iOS 27.2 does", () => {
    const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")
    const touch = read("styles/touch.css")
    const tokens = read("styles/variables-components.css")
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    // Xcode segmented-sheet held: 709 to 757px wide, the glass 253 on the 242 sheet, the held label 203 on 253
    expect(tokens).toContain("--segmented-control-mobile-pressed-scale: 1.07;")
    expect(tokens).toContain("--segmented-control-mobile-glass-background-pressed: light-dark(alpha(var(--gray-0), 85%), var(--alpha-20));")
    expect(tokens).toContain("--segmented-control-mobile-pressed-label-opacity: 0.2;")
    expect(tokens).toContain("--segmented-control-mobile-thumb-lens-outset: 36px 11px;")
    expect(tokens).toContain("--segmented-control-mobile-thumb-lens-background: light-dark(transparent, rgb(0 0 0 / 13%));")
    for (const declaration of [
      "--segmented-control-pressed-scale: var(--segmented-control-mobile-pressed-scale);",
      "--segmented-control-pressed-background: var(--segmented-control-mobile-glass-background-pressed);",
      "--segmented-control-option-pressed-opacity: var(--segmented-control-mobile-pressed-label-opacity);",
      "--segmented-control-option-highlight-background-color: transparent;",
      "--segmented-control-thumb-lens-outset: var(--segmented-control-mobile-thumb-lens-outset);",
      "--segmented-control-thumb-lens-background: var(--segmented-control-mobile-thumb-lens-background);",
      "--segmented-control-thumb-lens-shadow: var(--segmented-control-mobile-thumb-lens-shadow);",
    ]) {
      expect(touch).toContain(declaration)
    }
    // Only the large control slides on the recording's curve; reduced motion keeps the instant move
    expect(touch).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{[^}]*--tabs-thumb-transition-duration: 400ms;/)
    expect(touch).toMatch(/@supports \(transition-timing-function: linear\(0, 1\)\) \{[^}]*--tabs-thumb-transition-easing: linear\(0, 0\.2 3%, /)
    expect(phone).toContain(".Tabs:where([data-orientation=\"horizontal\"])[data-lens] {\n    overflow: visible;")
    expect(phone).toContain(".Tabs:where([data-orientation=\"horizontal\"]):has(> .Tab:where(:not([disabled])):active) {")
    expect(phone).toContain("scale: var(--segmented-control-pressed-scale, 1);")
    expect(phone).toContain("opacity: var(--segmented-control-option-pressed-opacity, 1);")
    // The press transitions stay as light as the reduced-motion reset after them (one class each), so it wins. A
    // browser without linear() gets cubic Béziers, the measured curves come under @supports
    expect(phone).toContain(":where(.Tabs[data-orientation=\"horizontal\"]) .TabContent {\n    transition: opacity var(--segmented-control-press-label-timing, 110ms cubic-bezier(")
    expect(phone).toContain(".Tabs:where([data-orientation=\"horizontal\"]) {\n    transition:\n      scale var(--segmented-control-press-scale-timing, 300ms cubic-bezier(")
    const curves = phone.slice(phone.indexOf("@supports (transition-timing-function: linear(0, 1)) {\n    .Tabs:where([data-orientation=\"horizontal\"]) {"))
    expect(curves).toContain(":where(.Tabs[data-orientation=\"horizontal\"]) .TabContent {\n      transition: opacity var(--segmented-control-press-label-timing, 110ms linear(")
    expect(curves).toContain(".Tabs:where([data-orientation=\"horizontal\"]) {\n      transition:\n        scale var(--segmented-control-press-scale-timing, 300ms linear(")
    // The press sets the timing of the way in (iOS 27.2 held: the capsule 96% grown in 130ms, the label faded over
    // 430ms) and leaves the transitions themselves to the one-class rules
    for (const [rules, scale] of [[phone, "300ms cubic-bezier(0.2, 0.9, "], [curves, "300ms linear(0, 0.08 3.7%, "]]) {
      const pressed = rules.slice(rules.indexOf(":has(> .Tab:where(:not([disabled])):active) {"))
      expect(pressed.slice(0, pressed.indexOf("}"))).toContain(`--segmented-control-press-scale-timing: ${scale}`)
      expect(pressed.slice(0, pressed.indexOf("}"))).not.toMatch(/\btransition:/)
    }
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"))
    expect(reduced).toMatch(/\.Tabs,\n  \.Tab,\n  \.Tab::before,\n  \.TabContent \{\n    transition-duration: 0ms;/)
    expect(css.slice(0, css.indexOf("@media (max-width: 767px)"))).not.toContain("--segmented-control-pressed-scale")
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
    expect(react[3]).toContain("transition: width var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter)), transform var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter))")
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
    expect(react[0]).toContain("height var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter))")
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

  test("the large control and every control in a bar are the glass one of iOS 27.2, Calendar and the sheet's Picker: 48px, a 40px thumb 4px in, 8px apart", () => {
    const touch = read("styles/touch.css")
    const block = touch.match(/html \[data-toolbar\] :is\(\[data-variant="segmented"\], \[data-variant="underline"\]\)\[data-orientation="horizontal"\]:not\(\[data-toolbar-row\] \*\),\s*html \[data-toolbar-row\] [^{]*\{([^}]*)\}/)?.[1] ?? ""
    // One block for the default large control (md and larger, unless flat; in a row of a bar lg and larger), for
    // every control in a bar but its rows and for a row's own glass one (owner 13.11 «Да, стекло»), which a later
    // rule sizes 40
    expect(touch).toContain('html :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"]:where(:not([data-mobile-material="flat"], [data-mobile-size="small"], [data-size="3xs"], [data-size="2xs"], [data-size="xs"], [data-size="sm"], [data-toolbar-row] [data-size="md"])),\n    html [data-toolbar] :is(')
    for (const declaration of [
      "--segmented-control-size: 48px;",
      "--segmented-control-gutter: 4px;",
      // 8px between segments, the selection is its segment, the label 4px inside it (Напоминание 102 in 110)
      "--segmented-control-gap: 8px;",
      "--segmented-control-thumb-outset: 0px;",
      "--segmented-control-option-gutter: 4px;",
      "--segmented-control-font-size: 15px;",
      "--segmented-control-line-height: 20px;",
      "--segmented-control-font-weight: 510;",
      "--segmented-control-active-font-weight: 510;",
      // Glass lighter than the screen under it (native 247 on a 242 sheet); the shadow and blur are the buttons'.
      "--segmented-control-background: var(--segmented-control-mobile-glass-background);",
      "--segmented-control-sheen: none;",
      "--segmented-control-shadow: var(--mobile-glass-shadow);",
      "--segmented-control-backdrop-filter: var(--mobile-glass-backdrop-filter);",
      "--segmented-control-thumb-background: var(--segmented-control-mobile-thumb-background);",
    ]) {
      expect(block).toContain(declaration)
    }
    expect(block).not.toContain("mobile-label-secondary")
    expect(block).not.toMatch(/:\s*light-dark\(/)
    const tokens = read("styles/variables-components.css")
    expect(tokens).toContain("--segmented-control-mobile-thumb-background: light-dark(var(--alpha-08), var(--gray-200));")
    expect(tokens).toContain("--segmented-control-mobile-glass-background: light-dark(alpha(var(--gray-0), 40%), var(--alpha-12));")
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
    // The air beside a label, which a squeezed control narrows (segments.ts)
    expect(phone).toContain("padding-inline: var(--tabs-segment-gutter, var(--segmented-control-option-gutter));")
    // No color of its own: the base colors apply, secondary off (the phone role, touch.css) and primary on.
    expect(phone).not.toMatch(/(^|[^-])color:/)
    expect(css).toMatch(/\.Tab \{\s*position: relative;[^}]*color: var\(--color-text-secondary\);/)
    expect(css).toMatch(/&\[data-state="on"\] \{[^}]*color: var\(--color-text\);/)
    expect(phone).not.toContain("letter-spacing")
    expect(read("styles/touch.css")).not.toContain("--segmented-control-letter-spacing")
  })

  test("on a phone a segment with a symbol and a label shows the symbol, the label kept as its name, and one disabled segment takes the disabled label", () => {
    const touch = read("styles/touch.css")
    const plainSelector = 'html :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"] {'
    const plain = touch.slice(touch.indexOf(plainSelector), touch.indexOf("}", touch.indexOf(plainSelector)))
    // Native UISegmentedControl with one segment disabled: 191 on the 238 track, black at 20%.
    expect(plain).toContain("--segmented-control-option-disabled-color: var(--alpha-20);")
    const css = read("components/Tabs/Tabs.module.css")
    const desktop = css.slice(0, css.indexOf("@media (max-width: 767px)"))
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    // UISegmentedControl draws an action with a title and an image as the image (owner 10.11: «это icons???»)
    const label = phone.match(/\.Tabs\[data-orientation="horizontal"\] \.TabContent:has\(> :not\(\.TabLabel, \.TabBadge\)\) > \.TabLabel \{([^}]*)\}/)?.[1] ?? ""
    expect(label).toContain("clip-path: inset(50%);")
    expect(label).toContain("position: absolute;")
    expect(label).not.toContain("display: none")
    const symbol = phone.match(/\.Tabs\[data-orientation="horizontal"\] \.TabContent > svg:where\(:not\(\[data-no-autosize\]\)\) \{([^}]*)\}/)?.[1] ?? ""
    expect(symbol).toContain("width: var(--segmented-control-symbol-size, var(--segmented-control-icon-size));")
    const segment = phone.match(/\.Tabs:not\(\[data-disabled\]\)\[data-orientation="horizontal"\] > \.Tab\[data-disabled\] \{([^}]*)\}/)?.[1] ?? ""
    expect(segment).toContain("opacity: 1;")
    expect(segment).toContain("color: var(--segmented-control-option-disabled-color, var(--color-text-disabled));")
    // A desktop segment keeps its icon beside the label and a disabled segment its half opacity.
    expect(desktop).not.toContain(":has(> :not(.TabLabel, .TabBadge))")
    expect(desktop).not.toContain("--segmented-control-option-disabled-color")
  })

  test("a small glass control keeps its size and fill under the shared mobile glass, a large flat one is 49px; the large glass block and the bar come last", () => {
    const touch = read("styles/touch.css")
    // In a row of a bar md is the small control too (Toolbar.Row, owner 13.11)
    const small = '[data-size="3xs"], [data-size="2xs"], [data-size="xs"], [data-size="sm"], [data-toolbar-row] [data-size="md"]'
    const tabs = ':is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"]'
    const plainStart = touch.indexOf(`html ${tabs} {`)
    const glassSelector = `html [data-mobile-material="glass"]${tabs}:where([data-mobile-size="small"], ${small}) {`
    const flatSelector = `html [data-mobile-material="flat"]${tabs}:where(:not([data-mobile-size="small"], ${small})) {`
    // A control a component asks to keep small (ColorPicker's Mode) stays out of both large blocks
    const largeStart = touch.indexOf(`html ${tabs}:where(:not([data-mobile-material="flat"], [data-mobile-size="small"], ${small})),`)
    const barSelector = `html [data-toolbar] ${tabs}:not([data-toolbar-row] *),`
    const start = touch.indexOf(glassSelector)
    expect(start).toBeGreaterThan(plainStart)
    const glass = touch.slice(start, touch.indexOf("}", start))
    expect(glass).toContain("--segmented-control-background: var(--mobile-glass-background);")
    // One flat layer of the plain fill over the glass, no sheen: the owner wants no vertical gradient on the control
    expect(glass).toContain("--segmented-control-sheen: linear-gradient(var(--segmented-control-mobile-plain-background), var(--segmented-control-mobile-plain-background));")
    expect(glass).not.toContain("--mobile-glass-sheen")
    expect(glass).toContain("--segmented-control-shadow: var(--mobile-glass-shadow);")
    expect(glass).toContain("--segmented-control-backdrop-filter: var(--mobile-glass-backdrop-filter);")
    // Size, labels and selection stay those of the plain control.
    expect(glass).not.toContain("--segmented-control-size")
    expect(glass).not.toContain("--segmented-control-thumb-background")
    // SwiftUI's .controlSize(.large): 49pt, the thumb 2pt in and the 13pt labels of the small control
    const flatStart = touch.indexOf(flatSelector)
    expect(flatStart).toBeGreaterThan(plainStart)
    const flat = touch.slice(flatStart, touch.indexOf("}", flatStart))
    expect(flat).toContain("--segmented-control-size: 49px;")
    expect(flat).not.toContain("--segmented-control-gutter")
    expect(flat).not.toContain("--segmented-control-font-size")
    // The large glass block shares the bar's selector list and comes after the others, so a bar wins at equal specificity
    expect(largeStart).toBeGreaterThan(start)
    expect(largeStart).toBeGreaterThan(flatStart)
    expect(touch.indexOf(barSelector)).toBeGreaterThan(largeStart)
    const plain = touch.slice(plainStart, touch.indexOf("}", plainStart))
    expect(plain).toContain("--segmented-control-size: 32px;")
  })

  test("a symbol in its segment is 20px, the 17pt symbol of iOS 27.2", () => {
    const touch = read("styles/touch.css")
    const plainSelector = 'html :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"] {'
    const plain = touch.slice(touch.indexOf(plainSelector), touch.indexOf("}", touch.indexOf(plainSelector)))
    expect(plain).toContain("--segmented-control-symbol-size: 20px;")
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    const symbol = phone.match(/\.Tabs\[data-orientation="horizontal"\] \.TabContent > svg:where\(:not\(\[data-no-autosize\]\)\) \{([^}]*)\}/)?.[1] ?? ""
    expect(symbol).toContain("width: var(--segmented-control-symbol-size, var(--segmented-control-icon-size));")
    expect(symbol).toContain("height: var(--segmented-control-symbol-size, var(--segmented-control-icon-size));")
    // Only on a phone: the desktop rule sizes every icon by the control's size.
    expect(css.slice(0, css.indexOf("@media (max-width: 767px)"))).not.toContain("--segmented-control-symbol-size")
  })

  // iOS switches the views of a screen with the segmented control only; it has no underline tabs.
  test("horizontal tabs of either variant are the kit control: segments of one width, scrolling when they do not fit", () => {
    const css = read("components/Tabs/Tabs.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    // One width is measured (segments.ts) and set as the track; without it each segment takes its label
    expect(phone).toMatch(/\.Tabs:where\(\[data-orientation="horizontal"\]\) \{\s*--tabs-equal-segments: 1;\s*\/\*[^*]*\*\/\s*--tabs-fit-segments: 1;\s*display: inline-grid;\s*grid-auto-columns: var\(--tabs-segment-track, minmax\(max-content, auto\)\);\s*grid-auto-flow: column;\s*\}/)
    expect(phone).toMatch(/\.Tabs:where\(\[data-orientation="horizontal"\]\[data-block\]\) \{\s*--tabs-equal-segments: 0;\s*--tabs-fit-segments: 0;\s*display: grid;\s*grid-auto-columns: minmax\(0, 1fr\);\s*\}/)
    // Only a phone asks for it
    expect(css.slice(0, css.indexOf("@media (max-width: 767px)"))).not.toContain("--tabs-equal-segments")
    expect(css.slice(0, css.indexOf("@media (max-width: 767px)"))).not.toContain("--tabs-fit-segments")
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
describe("Segmented Tabs on a phone take one width (segments.ts)", () => {
  type Box = { width: number }
  // jsdom has no layout: each element reports the box a test gives it
  const control = ({ asked = "1", fit = asked, gutter = 9, floors = [], orientation = "horizontal", widths, drawn, offset, client, gap = 0, padding = 0, hidden = [], width = "" }: {
    asked?: string, fit?: string, gutter?: number, floors?: number[], orientation?: string, widths: number[], drawn: number,
    offset: number, client: number, gap?: number, padding?: number, hidden?: number[], width?: string
  }) => {
    const root = document.createElement("div")
    root.setAttribute("data-orientation", orientation)
    const thumb = document.createElement("div")
    root.append(thumb)
    const box = (element: HTMLElement, rect: Box) => { element.getBoundingClientRect = () => ({ width: rect.width } as DOMRect) }
    box(thumb, { width: 999 })
    const segments = widths.map((width) => {
      const segment = document.createElement("button")
      box(segment, { width })
      root.append(segment)
      return segment
    })
    box(root, { width: drawn })
    Object.defineProperty(root, "offsetWidth", { get: () => offset })
    // A thumb still standing where its segment was widens the scrolled area; the fit does not read it
    Object.defineProperty(root, "scrollWidth", { get: () => 9999 })
    Object.defineProperty(root, "clientWidth", { get: () => client })
    const rootValues: Record<string, string> = {
      // The token as written, in rem without touch.css; the air is read from a segment, laid out
      "--tabs-equal-segments": asked, "--tabs-fit-segments": fit, "--segmented-control-option-gutter": "0.75rem", "column-gap": `${gap}px`, "padding-left": `${padding}px`, "padding-right": `${padding}px`,
      "width": width, "box-sizing": "border-box",
    }
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => ({
      getPropertyValue: (name: string) => {
        if (element === root) return rootValues[name] ?? ""
        const index = segments.indexOf(element as HTMLButtonElement)
        if (name === "min-width") return floors[index] === undefined ? "auto" : `${floors[index]}px`
        if (name === "padding-left") return `${gutter}px`
        return name === "display" && hidden.includes(index) ? "none" : ""
      },
    }) as CSSStyleDeclaration)
    return { root, thumb }
  }
  afterEach(() => vi.restoreAllMocks())

  test("the React and Vue copies are the same", () => {
    expect(readFileSync(`${process.cwd()}/packages/vue/src/components/Tabs/segments.ts`, "utf8"))
      .toBe(readFileSync(`${process.cwd()}/packages/ui/src/components/Tabs/segments.ts`, "utf8"))
  })

  test("every segment takes the widest one's width where they fit, the thumb left out", () => {
    const { root, thumb } = control({ widths: [40, 47.8, 53.3, 40], drawn: 221, offset: 221, client: 245 })
    expect(equalizeSegments(root, thumb)).toBe(true)
    expect(root.style.getPropertyValue("--tabs-segment-track")).toBe("minmax(53.3px, 1fr)")
    // Measured again with nothing changed, the thumb has nothing to follow
    expect(equalizeSegments(root, thumb)).toBe(false)
  })

  test("held, the control grows under the finger and the widths are read back at its own size", () => {
    const { root, thumb } = control({ widths: [44, 52.58, 58.63, 44], drawn: 243.1, offset: 221, client: 245 })
    equalizeSegments(root, thumb)
    expect(Number.parseFloat(root.style.getPropertyValue("--tabs-segment-track").slice("minmax(".length))).toBeCloseTo(53.3, 1)
  })

  test("where one width does not fit, each segment keeps its label's width (by content)", () => {
    // Waiters, Bar and Very long name at 375: three of 118 overflow the 343 of room
    const { root, thumb } = control({ widths: [61, 40, 118], drawn: 243, offset: 243, client: 343 })
    root.style.setProperty("--tabs-segment-track", "minmax(10px, 1fr)")
    equalizeSegments(root, thumb)
    expect(root.style.getPropertyValue("--tabs-segment-track")).toBe("")
  })

  test("the gaps and the padding count against the room, a tab that is not drawn does not", () => {
    // 3 × 100 + 2 × 8 = 316 against 320 − 2 × 4 = 312: by content
    const tight = control({ widths: [100, 90, 80], drawn: 312, offset: 312, client: 320, gap: 8, padding: 4 })
    equalizeSegments(tight.root, tight.thumb)
    expect(tight.root.style.getPropertyValue("--tabs-segment-track")).toBe("")
    vi.restoreAllMocks()
    // The fourth tab is in the overflow menu: 3 × 100 + 2 × 2 fits 312
    const menu = control({ widths: [100, 90, 80, 100], drawn: 300, offset: 300, client: 320, gap: 2, padding: 4, hidden: [3] })
    equalizeSegments(menu.root, menu.thumb)
    expect(menu.root.style.getPropertyValue("--tabs-segment-track")).toBe("minmax(100px, 1fr)")
  })

  test("a control at a fraction of a pixel is read unrounded, so equal segments that just fit stay", () => {
    // 4 × 150.59 + 3 × 8 = 626.375 in the 634.375 − 8 laid out; offsetWidth rounds the control to 303 at max-content
    const { root, thumb } = control({ widths: [150.59375, 40, 40, 40], drawn: 302.59375, offset: 303, client: 634, gap: 8, padding: 4, width: "302.59375px" })
    equalizeSegments(root, thumb)
    expect(root.style.getPropertyValue("--tabs-segment-track")).toBe("minmax(150.59375px, 1fr)")
  })

  test("a desktop, block or vertical control is left as it is", () => {
    for (const options of [{ asked: "" }, { asked: "0" }, { orientation: "vertical" }]) {
      const { root, thumb } = control({ ...options, widths: [40, 60], drawn: 120, offset: 120, client: 80 })
      root.style.setProperty("--tabs-segment-track", "minmax(60px, 1fr)")
      root.style.setProperty("--tabs-segment-gutter", "4px")
      equalizeSegments(root, thumb)
      expect(root.style.getPropertyValue("--tabs-segment-track")).toBe("")
      expect(root.style.getPropertyValue("--tabs-segment-gutter")).toBe("")
      vi.restoreAllMocks()
    }
  })

  test("where labels by their widths still overflow, the air beside each narrows by its share, and the thumb follows", () => {
    // 4 × 60 + 3 × 4 = 252 against 220: 32 over, 8 a segment, 4 on each side of its label, so 9 − 4 = 5
    const { root, thumb } = control({ widths: [60, 60, 60, 60], drawn: 252, offset: 252, client: 220, gap: 4 })
    expect(equalizeSegments(root, thumb)).toBe(true)
    expect(root.style.getPropertyValue("--tabs-segment-track")).toBe("")
    expect(root.style.getPropertyValue("--tabs-segment-gutter")).toBe("5px")
    // Measured again at the narrowed air, nothing changes
    expect(equalizeSegments(root, thumb)).toBe(false)
  })

  test("the air is read laid out, so a token set in rem narrows too", () => {
    // Without touch.css the token is 0.75rem, 12px: 3 × 80 + 2 × 2 = 244 in 224, 20 over, 12 − 20 / 6
    const { root, thumb } = control({ widths: [80, 80, 80], drawn: 244, offset: 244, client: 224, gap: 2, gutter: 12 })
    equalizeSegments(root, thumb)
    expect(Number.parseFloat(root.style.getPropertyValue("--tabs-segment-gutter"))).toBeCloseTo(8.667, 2)
  })

  test("a segment held at its least width gives up no more air, so the others narrow further", () => {
    // A short label in a 28px pill segment: [28, 98, 98] with 4px gaps in 216. Shared by three, the air would be 6.33
    // and the first segment would stay 28, 221.33 in all; the two others narrow to 5 and the row fits
    const { root, thumb } = control({ widths: [28, 98, 98], floors: [28, 0, 0], drawn: 232, offset: 232, client: 216, gap: 4 })
    equalizeSegments(root, thumb)
    expect(root.style.getPropertyValue("--tabs-segment-gutter")).toBe("5px")
    vi.restoreAllMocks()
    // Every segment at its least width: nothing narrows, the row scrolls at the least air
    const held = control({ widths: [40, 40, 40], floors: [40, 40, 40], drawn: 120, offset: 120, client: 100 })
    equalizeSegments(held.root, held.thumb)
    expect(held.root.style.getPropertyValue("--tabs-segment-gutter")).toBe("4px")
  })

  test("the air narrows to 4px at least, the large control's own, and what still does not fit scrolls", () => {
    // 52 over: 9 − 52 / 8 = 2.5, held at 4
    const { root, thumb } = control({ widths: [60, 60, 60, 60], drawn: 252, offset: 252, client: 200, gap: 4 })
    equalizeSegments(root, thumb)
    expect(root.style.getPropertyValue("--tabs-segment-gutter")).toBe("4px")
    vi.restoreAllMocks()
    // The large control's air is 4px already: nothing narrows
    const large = control({ widths: [60, 60, 60, 60], drawn: 252, offset: 252, client: 200, gap: 4, gutter: 4 })
    equalizeSegments(large.root, large.thumb)
    expect(large.root.style.getPropertyValue("--tabs-segment-gutter")).toBe("")
  })

  test("labels that fit by their widths keep their air, and a compact control narrows where it overflows", () => {
    // mobileSegmentWidth="content" asks for no one width but for the fit
    const fits = control({ asked: "0", fit: "1", widths: [61, 40, 118], drawn: 243, offset: 243, client: 343 })
    equalizeSegments(fits.root, fits.thumb)
    expect(fits.root.style.getPropertyValue("--tabs-segment-track")).toBe("")
    expect(fits.root.style.getPropertyValue("--tabs-segment-gutter")).toBe("")
    vi.restoreAllMocks()
    // 12 over: 2 on each side of a label, 9 − 2 = 7
    const over = control({ asked: "0", fit: "1", widths: [100, 100, 100], drawn: 300, offset: 300, client: 288 })
    equalizeSegments(over.root, over.thumb)
    expect(over.root.style.getPropertyValue("--tabs-segment-gutter")).toBe("7px")
  })

  test("crossing into the phone block measures again, its room unchanged, and the thumb follows", () => {
    const { root, thumb } = control({ asked: "", widths: [40, 60], drawn: 100, offset: 100, client: 200 })
    document.body.append(root)
    const listeners = new Set<() => void>()
    const phone = { addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) }
    const matchMedia = window.matchMedia
    window.matchMedia = (() => phone) as unknown as typeof window.matchMedia
    const moved = vi.fn()
    const stop = watchSegments(root, () => thumb, moved)
    window.matchMedia = matchMedia
    expect(listeners.size).toBe(1)
    // The screen narrows past 768: the control now asks for one width
    vi.mocked(window.getComputedStyle).mockImplementation((element) => ({
      getPropertyValue: (name: string) => (element === root && name === "--tabs-equal-segments" ? "1" : ""),
    }) as CSSStyleDeclaration)
    for (const listener of listeners) listener()
    expect(root.style.getPropertyValue("--tabs-segment-track")).toBe("minmax(60px, 1fr)")
    expect(moved).toHaveBeenCalledTimes(1)
    stop()
    expect(listeners.size).toBe(0)
    root.remove()
  })

  test("an older browser's media query list is heard through addListener", () => {
    const { root, thumb } = control({ asked: "", widths: [40, 60], drawn: 100, offset: 100, client: 200 })
    document.body.append(root)
    const listeners = new Set<() => void>()
    const phone = { addListener: (fn: () => void) => listeners.add(fn), removeListener: (fn: () => void) => listeners.delete(fn) }
    const matchMedia = window.matchMedia
    window.matchMedia = (() => phone) as unknown as typeof window.matchMedia
    const stop = watchSegments(root, () => thumb, vi.fn())
    window.matchMedia = matchMedia
    expect(listeners.size).toBe(1)
    stop()
    expect(listeners.size).toBe(0)
    root.remove()
  })

  test("once the font has loaded the thumb follows, its track unchanged", async () => {
    const { root, thumb } = control({ asked: "", widths: [40, 60], drawn: 100, offset: 100, client: 200 })
    document.body.append(root)
    const fonts = Object.getOwnPropertyDescriptor(document, "fonts")
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } })
    const moved = vi.fn()
    const stop = watchSegments(root, () => thumb, moved)
    await Promise.resolve()
    await Promise.resolve()
    expect(moved).toHaveBeenCalledTimes(1)
    stop()
    if (fonts) Object.defineProperty(document, "fonts", fonts)
    else delete (document as { fonts?: unknown }).fonts
    root.remove()
  })

  test("a compact control asks for no one width, a phone draws no badge but a narrow page does, and the small control's label stands 9px in", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Tabs/Tabs.module.css`, "utf8")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    expect(phone).toMatch(/\.Tabs:where\(\[data-orientation="horizontal"\]\[data-mobile-segment-width="content"\]\) \{\s*--tabs-equal-segments: 0;\s*\}/)
    // A page that is only narrow keeps its counts: the module hides a badge only in a phone layout, touch.css below
    // 768px, where the page asks for the phone's sizes
    expect(phone).not.toContain("TabBadge {")
    expect(css).toMatch(/:where\(\[data-plex-layout="phone"\]\) \.Tabs\[data-orientation="horizontal"\] \.TabBadge \{[^}]*position: absolute;[^}]*clip-path: inset\(50%\);/)
    const touch = readFileSync(`${process.cwd()}/packages/styles/src/styles/touch.css`, "utf8")
    expect(touch).toMatch(/html :is\(\[data-variant="segmented"\], \[data-variant="underline"\]\)\[data-orientation="horizontal"\] \[data-slot="tab-badge"\] \{[^}]*position: absolute;[^}]*clip-path: inset\(50%\);/)
    const small = touch.slice(touch.indexOf('html :is([data-variant="segmented"], [data-variant="underline"])[data-orientation="horizontal"] {'))
    expect(small.slice(0, small.indexOf("}"))).toContain("--segmented-control-option-gutter: 9px;")
  })

  test("React and Vue measure before the thumb, on every render and when the room, the breakpoint or the font changes", () => {
    const react = readFileSync(`${process.cwd()}/packages/ui/src/components/Tabs/Tabs.tsx`, "utf8")
    expect(react.indexOf("equalizeSegments(rootRef.current, thumbRef.current)")).toBeGreaterThan(-1)
    expect(react.indexOf("equalizeSegments(rootRef.current, thumbRef.current)")).toBeLessThan(react.indexOf("const sizeChanged = prevSizeRef.current !== size"))
    expect(react).toContain("return watchSegments(root, () => thumbRef.current, () => {")
    const vue = readFileSync(`${process.cwd()}/packages/vue/src/components/Tabs/Tabs.ts`, "utf8")
    expect(vue).toMatch(/if \(!root \|\| !thumb\) \{\s*return\s*\}\s*\/\/ [^\n]*\n\s*equalizeSegments\(root, thumb\)/)
    expect(vue).toContain("onUpdated(() => equalizeSegments(rootRef.value, thumbRef.value))")
    expect(vue).toContain("stopWatchingSegments = watchSegments(root, () => thumbRef.value, () => {")
    expect(vue).toContain("onBeforeUnmount(() => stopWatchingSegments?.())")
    // mobileSegmentWidth moves the segments with nothing else changing, so the thumb follows it
    expect(react).toContain("[applyThumbSizing, value, size, gutterSize, pill, flush, mobileSegmentWidth, transitionProperty]")
    expect(vue).toMatch(/\(\) => props\.orientation === "vertical",\s*\/\/[^\n]*\n\s*\(\) => props\.mobileSegmentWidth,\s*\],\s*syncThumb,/)
    const shared = readFileSync(`${process.cwd()}/packages/ui/src/components/Tabs/segments.ts`, "utf8")
    expect(shared).toContain("observer?.observe(box)")
    expect(shared).toContain('window.matchMedia(PHONE_QUERY)')
    expect(shared).toContain('const PHONE_QUERY = "(max-width: 767px)"')
    expect(readFileSync(`${process.cwd()}/packages/styles/src/components/Tabs/Tabs.module.css`, "utf8")).toContain("@media (max-width: 767px)")
  })
})

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
