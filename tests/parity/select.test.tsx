import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useSyncExternalStore, type ComponentType, type ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { Fragment, h, reactive, type Component, type VNode } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Plus as RPlus, User as RUser, Workspace as RWorkspace } from "../../packages/ui/src/components/Icon"
import { Select as ReactSelect } from "../../packages/ui/src/components/Select"
import { Button } from "../../packages/vue/src/components/Button"
import { Plus, User, Workspace } from "../../packages/vue/src/components/Icon"
import { Select } from "../../packages/vue/src/components/Select"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// React-vs-Vue parity for Select.
//
// Cases are written once in React's shape. Data is shared; what each
// framework renders itself (icons, custom views, rich descriptions, a custom
// trigger) is named in the case and built per framework.
//
// Normalized here, and only here:
// - Reka's positioning wrapper: `--reka-popper-*` names and `dir="ltr"`
//   (as in tooltip-popover.test.tsx); the content's own properties keep
//   Radix's names in both.
// - The "Show all" row's `data-option-id` embeds the framework's useId
//   (`group-limit-_r_5_` vs `group-limit-v-3`): it becomes `group-limit-[id]`.
// - SelectControl's `LoadingIndicator` class and the indicator's own share a
//   name under the unscoped test CSS modules (see select-control.test.tsx).
//
// Snapshots also record the focused element, every scrollIntoView call and
// the `change` events, so focus, scrolling and callbacks are compared too.

const settle = async () => {
  for (let i = 0; i < 200; i++) await Promise.resolve()
}

const normalize = (root: Element) => {
  for (const wrapper of Array.from(root.querySelectorAll("[data-reka-popper-content-wrapper]"))) {
    wrapper.removeAttribute("dir")
  }
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    const style = element.getAttribute("style")!
    if (style.includes("--reka-popper-")) element.setAttribute("style", style.replaceAll("--reka-popper-", "--radix-popper-"))
  }
  for (const element of Array.from(root.querySelectorAll('[data-option-id^="group-limit-"]'))) {
    element.setAttribute("data-option-id", "group-limit-[id]")
  }
}

const describeFocus = () => {
  const element = document.activeElement
  if (!element || element === document.body) return "focus: body"
  const role = element.getAttribute("role")
  const text = (element.textContent ?? "").trim().slice(0, 40)
  return `focus: <${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}"${role ? ` role="${role}"` : ""}> ${JSON.stringify(text)}`
}

let scrolls: string[] = []
let events: string[] = []

beforeEach(() => {
  scrolls = []
  events = []
  Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
    const id = this.getAttribute("data-option-id")?.replace(/^group-limit-.*/, "group-limit-[id]")
    scrolls.push(`${id ?? this.tagName}:${typeof options === "object" ? options.block : String(options)}`)
  }
})

afterEach(() => {
  vi.useRealTimers()
})

const snapshotDom = () => {
  const clone = document.body.cloneNode(true) as HTMLElement
  normalize(clone)
  const dom = serializeDom(clone).replaceAll('class="LoadingIndicator LoadingIndicator"', 'class="LoadingIndicator"')
  const extra = [describeFocus(), `scrolls: ${scrolls.join(", ")}`, `events: ${events.join(" | ")}`]
  scrolls = []
  events = []
  return `${dom}\n${extra.join("\n")}`
}

// ---------------------------------------------------------------------------
// Data

type Opt = { value: string; label: string; disabled?: boolean; description?: unknown; tooltip?: { content: unknown; maxWidth?: number } }

const fruits: Opt[] = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Mango", value: "mango" },
  { label: "Pineapple", value: "pineapple" },
  { label: "Watermelon", value: "watermelon" },
]

const items: Opt[] = [
  { label: "List item 1", value: "1", disabled: true },
  { label: "List item 2", value: "2" },
  { label: "List item 3", value: "3", disabled: true },
  { label: "List item 4", value: "4" },
  { label: "Other 5", value: "5" },
  { label: "List item 6", value: "6" },
]

const many: Opt[] = Array.from({ length: 20 }, (_, i) => ({ label: `Option ${i + 1}${i % 2 ? " odd" : ""}`, value: `o${i + 1}` }))
const huge: Opt[] = Array.from({ length: 1320 }, (_, i) => ({ label: `Row ${i + 1}`, value: `r${i + 1}` }))

const grouped = [
  {
    label: "Plans",
    options: [
      { label: "Enterprise Plus", value: "1", tooltip: { content: "Advanced features with priority support", maxWidth: 248 } },
      { label: "Enterprise", value: "1o", tooltip: { content: "Full-featured plan" } },
      { label: "Professional Plus", value: "2" },
      { label: "Professional", value: "3", disabled: true },
      { label: "Basic Plus", value: "4" },
      { label: "Basic", value: "5" },
      { label: "Starter", value: "6" },
      { label: "Free", value: "7" },
      { label: "Team Advanced", value: "4a" },
      { label: "Team Standard", value: "4b" },
      { label: "Team Basic", value: "4c" },
      { label: "Business Premium", value: "4d" },
    ],
    optionsLimit: { limit: 7, label: "Show all" },
  },
  {
    label: "Custom Deployments",
    options: [
      { label: "Production US-East", value: "ft1" },
      { label: "Production EU-West", value: "ft2" },
      { label: "Staging US-West", value: "ft3" },
      { label: "Development", value: "ft4" },
    ],
  },
]

const hugeGroup = [{ label: "Everything", options: huge.slice(0, 320), optionsLimit: { limit: 1000, label: "Show all" } }]

// Descriptions and tooltips: plain strings, or framework-rendered rich content
const described = (rich: boolean, framework: "react" | "vue"): Opt[] => {
  const text = (value: string) =>
    !rich
      ? value
      : framework === "react"
        ? <div className="font-normal text-secondary">{value}</div>
        : () => h("div", { class: "font-normal text-secondary" }, value)
  return [
    { value: "owner", label: "Owner", description: text("Can modify project information") },
    { value: "reader", label: "Reader", description: text("Can make API requests"), tooltip: { content: text("Read only") } },
  ]
}

// Values that are not valid in a CSS selector unescaped
const quoted: Opt[] = [
  { label: "Say hi", value: 'say "hi"' },
  { label: "Back slash", value: "back\\slash" },
  { label: "Bracket", value: "a]b" },
  { label: "Digit first", value: "9 lives" },
]

type OptionSet = "fruits" | "items" | "many" | "huge" | "grouped" | "hugeGroup" | "described" | "richDescribed" | "empty" | "quoted"

const optionSet = (name: OptionSet, framework: "react" | "vue") => {
  switch (name) {
    case "fruits":
      return fruits
    case "items":
      return items
    case "many":
      return many
    case "huge":
      return huge
    case "grouped":
      return grouped
    case "hugeGroup":
      return hugeGroup
    case "described":
      return described(false, framework)
    case "richDescribed":
      return described(true, framework)
    case "empty":
      return []
    case "quoted":
      return quoted
  }
}

// ---------------------------------------------------------------------------
// Rendering

type Case = {
  options?: OptionSet
  value?: string | string[]
  multiple?: boolean
  /** Plain props, identical in both frameworks */
  props?: Record<string, unknown>
  startIcon?: boolean
  optionView?: boolean
  triggerView?: boolean
  /** Two actions; "renamed" relabels one (same length), "three" adds one */
  actions?: boolean | "renamed" | "three"
  customTrigger?: "plain" | "prevented"
  richEmpty?: boolean
  labelledBy?: boolean
  describedBy?: boolean
  /** Parent updates `value` from changes (otherwise it keeps its value) */
  controlled?: boolean
  /** Vue gets the custom views, trigger and empty message as props, not slots */
  vueProps?: boolean
}

type Update = (patch: Partial<Case>) => void

const record = (selection: Opt | Opt[]) => {
  const pick = ({ value, label }: Opt) => ({ value, label })
  events.push(`change ${JSON.stringify(Array.isArray(selection) ? selection.map(pick) : pick(selection))}`)
}

const actionLog = (id: string) => events.push(`action ${id}`)

const actionList = (variant: NonNullable<Case["actions"]>, PlusIcon: unknown, WorkspaceIcon: unknown) => [
  { id: "create", label: variant === "renamed" ? "New project" : "Create project", Icon: PlusIcon, onSelect: actionLog },
  { id: "overview", label: "Organization overview", Icon: WorkspaceIcon, className: "custom-action", onSelect: actionLog },
  ...(variant === "three" ? [{ id: "docs", label: "Docs", onSelect: actionLog }] : []),
]

const ReactOptionView = ({ label, value }: Opt) => <span className="option-view" data-value={value}>{label.toUpperCase()}</span>
const VueOptionView = (option: Opt) => h("span", { "class": "option-view", "data-value": option.value }, option.label.toUpperCase())

const ReactTriggerView = (props: Opt | { values: Opt[]; selectedAll: boolean }) =>
  "values" in props ? <em>{props.selectedAll ? "Everything" : props.values.map((v) => v.label).join(" + ")}</em> : <em>{`${props.label}!`}</em>
const vueTriggerView = (props: Opt | { values: Opt[]; selectedAll: boolean }) =>
  "values" in props ? h("em", props.selectedAll ? "Everything" : props.values.map((v) => v.label).join(" + ")) : h("em", `${props.label}!`)

const reactSelect = (c: Case, update: Update): ReactElement => {
  const { options = "fruits", value = c.multiple ? [] : "", multiple } = c
  const onChange = (selection: Opt | Opt[]) => {
    record(selection)
    if (c.controlled) update({ value: Array.isArray(selection) ? selection.map((o) => o.value) : selection.value })
  }
  const extra: Record<string, unknown> = {}
  if (c.startIcon) extra.TriggerStartIcon = RUser
  if (c.optionView) extra.OptionView = ReactOptionView
  if (c.triggerView) extra.TriggerView = ReactTriggerView
  if (c.actions) extra.actions = actionList(c.actions, RPlus, RWorkspace)
  if (c.customTrigger)
    extra.trigger = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
      <ReactButton
        color="secondary"
        data-testid="custom-trigger"
        onClick={(evt: { preventDefault: () => void }) => {
          if (c.customTrigger === "prevented") evt.preventDefault()
        }}
        onDoubleClick={onToggle}
      >
        {open ? "Close" : "Open"}
      </ReactButton>
    )
  if (c.richEmpty) extra.searchEmptyMessage = <strong className="empty">Nothing here</strong>
  if (c.labelledBy) extra["aria-labelledby"] = "fruit-label"
  if (c.describedBy) extra["aria-describedby"] = "fruit-hint"

  return (
    <>
      {c.labelledBy && <label id="fruit-label">Fruit</label>}
      {c.describedBy && <p id="fruit-hint">Pick one</p>}
      {createElement(ReactSelect as unknown as ComponentType<Record<string, unknown>>, {
        options: optionSet(options, "react"),
        value,
        multiple,
        onChange,
        ...c.props,
        ...extra,
      })}
      <button data-testid="outside">Outside</button>
    </>
  )
}

const vueSelect = (c: Case, update: Update): VNode => {
  const { options = "fruits", value = c.multiple ? [] : "", multiple } = c
  const extra: Record<string, unknown> = {}
  const slots: Record<string, unknown> = {}
  // Slots, or React's props (`vueProps`)
  const custom = c.vueProps ? extra : slots
  if (c.startIcon) extra.TriggerStartIcon = User
  if (c.optionView) (c.vueProps ? extra : slots)[c.vueProps ? "OptionView" : "optionView"] = VueOptionView
  if (c.triggerView) (c.vueProps ? extra : slots)[c.vueProps ? "TriggerView" : "triggerView"] = vueTriggerView
  if (c.actions) extra.actions = actionList(c.actions, Plus, Workspace)
  if (c.customTrigger)
    custom.trigger = ({ open, onToggle }: { open: boolean; onToggle: () => void }) =>
      h(
        Button,
        {
          "color": "secondary",
          "data-testid": "custom-trigger",
          "onClick": (evt: MouseEvent) => {
            if (c.customTrigger === "prevented") evt.preventDefault()
          },
          "onDblclick": onToggle,
        },
        { default: () => (open ? "Close" : "Open") },
      )
  if (c.richEmpty) {
    const message = h("strong", { class: "empty" }, "Nothing here")
    if (c.vueProps) extra.searchEmptyMessage = message
    else slots.searchEmptyMessage = () => message
  }
  if (c.labelledBy) extra["aria-labelledby"] = "fruit-label"
  if (c.describedBy) extra["aria-describedby"] = "fruit-hint"

  return h(Fragment, [
    c.labelledBy ? h("label", { id: "fruit-label" }, "Fruit") : null,
    c.describedBy ? h("p", { id: "fruit-hint" }, "Pick one") : null,
    h(
      Select as unknown as Component,
      {
        options: optionSet(options, "vue"),
        value,
        multiple,
        "onChange": record,
        "onUpdate:value": (next: string | string[]) => {
          if (c.controlled) update({ value: next })
        },
        ...c.props,
        ...extra,
      },
      slots,
    ),
    h("button", { "data-testid": "outside" }, "Outside"),
  ])
}

// ---------------------------------------------------------------------------
// Walk: the same script against React, then Vue, with fake timers

type Target = string | (() => Element | null)
const resolve = (target: Target) => {
  const element = typeof target === "string" ? document.querySelector(target) : target()
  if (!element) throw new Error(`No element for ${String(target)}`)
  return element
}

type Tools = {
  snapshot: () => void
  fire: (target: Target, event: keyof typeof fireEvent, init?: object) => Promise<void>
  key: (key: string, target?: Target) => Promise<void>
  type: (value: string) => Promise<void>
  focus: (target: Target) => Promise<void>
  advance: (ms: number) => Promise<void>
  set: (patch: Partial<Case>) => Promise<void>
  open: () => Promise<void>
}

const TRIGGER = '[role="button"]'
const MENU = ".MenuInner"
const SEARCH = 'input[role="combobox"]'
const option = (value: string) => `[data-option-id="${value}"]`
const mouse = { pointerType: "mouse" }

const walk = async (initial: Case, steps: (tools: Tools) => Promise<void>) => {
  let current: Case = { ...initial }
  const listeners = new Set<() => void>()
  const vueState = reactive({ ...initial }) as Case
  let framework: "react" | "vue" = "react"

  const update: Update = (patch) => {
    if (framework === "react") {
      current = { ...current, ...patch }
      for (const listener of listeners) listener()
    } else {
      Object.assign(vueState, patch)
    }
  }

  function ReactApp() {
    const state = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
    )
    return reactSelect(state, update)
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

  // Vue skips a second listener for an event whose timestamp is not later
  // than the listener's attachment; the frozen fake clock moves 1ms first.
  const dispatch = (action: () => void) =>
    run(() => {
      vi.setSystemTime(Date.now() + 1)
      action()
    })

  const tools = (snapshots: string[]): Tools => {
    const fire: Tools["fire"] = (target, event, init) =>
      dispatch(() => {
        ;(fireEvent[event] as (element: Element, init?: object) => boolean)(resolve(target), init)
      })
    return {
      snapshot: () => snapshots.push(snapshotDom()),
      fire,
      key: (key, target = () => document.activeElement) => fire(target, "keyDown", { key }),
      type: (value) => fire(SEARCH, "input", { target: { value } }),
      focus: (target) => dispatch(() => (resolve(target) as HTMLElement).focus()),
      advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
      set: (patch) =>
        run(() => {
          framework === "react" ? update(patch) : Object.assign(vueState, patch)
        }),
      open: async () => {
        await fire(TRIGGER, "pointerDown", { button: 0, ...mouse })
        await run(() => vi.advanceTimersByTime(1))
      },
    }
  }

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    framework = "react"
    const react: string[] = []
    await run(() => {
      render(createElement(ReactApp))
    })
    scrolls = []
    events = []
    await steps(tools(react))
    await run(() => cleanup())
    vi.clearAllTimers()

    framework = "vue"
    Object.assign(vueState, initial)
    const vue: string[] = []
    const { unmount } = mountVue(() => vueSelect(vueState, update))
    await run(() => {})
    scrolls = []
    events = []
    await steps(tools(vue))
    unmount()
    vi.clearAllTimers()

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}

/** Renders a case, optionally opens it, and snapshots both frameworks. */
const pair = (c: Case, { open = false } = {}) =>
  walk(c, async (tools) => {
    if (open) await tools.open()
    await tools.advance(50)
    tools.snapshot()
  })

// ---------------------------------------------------------------------------
// Markup

const closedCases: Array<[string, Case]> = [
  ["placeholder", {}],
  ["selected value", { value: "mango" }],
  ["custom placeholder", { props: { placeholder: "Select a fruit..." } }],
  ["unknown value shows the placeholder", { value: "kiwi" }],
  ["loading", { props: { loading: true } }],
  ["loading with a value keeps the loading placeholder", { value: "mango", props: { loading: true, loadingPlaceholder: "Fetching..." } }],
  ["disabled", { value: "mango", props: { disabled: true } }],
  ["soft", { value: "mango", props: { variant: "soft" } }],
  ["ghost: not block", { value: "mango", props: { variant: "ghost" } }],
  ["ghost, block", { value: "mango", props: { variant: "ghost", block: true } }],
  ["outline, block false", { props: { block: false } }],
  ...["3xs", "sm", "lg", "3xl"].map((size): [string, Case] => [`size ${size}`, { value: "apple", props: { size } }]),
  ["pill", { value: "apple", props: { pill: true } }],
  ["clearable with a value", { value: "apple", props: { clearable: true } }],
  ["clearable without a value", { props: { clearable: true } }],
  ["clearable pill without dropdown icon", { value: "apple", props: { clearable: true, pill: true, dropdownIconType: "none" } }],
  ["dropdown icon chevronDown", { props: { dropdownIconType: "chevronDown" } }],
  ["start icon", { value: "apple", startIcon: true }],
  ["trigger class", { props: { triggerClassName: "w-[200px] font-semibold" } }],
  ["opticallyAlign", { props: { opticallyAlign: "start", variant: "ghost" } }],
  ["name renders the hidden input", { value: "apple", props: { name: "fruit" } }],
  ["id and required", { props: { id: "fruit", required: true } }],
  ["aria-label and aria-invalid", { props: { "aria-label": "Fruit", "aria-invalid": true } }],
  ["aria-labelledby wraps the value", { value: "apple", labelledBy: true }],
  ["aria-describedby", { describedBy: true }],
  ["multiple, nothing selected", { multiple: true, props: { placeholder: "Select fruits..." } }],
  ["multiple, one selected", { multiple: true, value: ["grapes"], props: { name: "fruits" } }],
  ["multiple, two selected", { multiple: true, value: ["mango", "apple"] }],
  ["multiple, all selected", { multiple: true, value: fruits.map((f) => f.value) }],
  ["multiple, loading", { multiple: true, value: ["mango"], props: { loading: true } }],
  ["custom trigger view", { value: "apple", triggerView: true }],
  ["custom multiple trigger view", { multiple: true, value: ["apple", "mango"], triggerView: true }],
  ["custom trigger", { customTrigger: "plain" }],
]

const openCases: Array<[string, Case]> = [
  ["selected value is highlighted and checked", { value: "grapes" }],
  ["no value highlights the first valid option", { options: "items" }],
  ["check position end", { value: "apple", props: { checkPosition: "end" } }],
  ["check position none", { value: "apple", props: { checkPosition: "none" } }],
  ["option class", { value: "apple", props: { optionClassName: "custom-option" } }],
  ["custom option view", { value: "apple", optionView: true }],
  ["descriptions", { options: "described", value: "reader" }],
  ["rich descriptions and tooltip", { options: "richDescribed", value: "reader" }],
  ["groups, tooltips, expandable limit, search", { options: "grouped", value: "2" }],
  ["search placeholder and label", { options: "many", props: { searchPlaceholder: "Find...", searchAriaLabel: "Find an option" } }],
  ["flat hard limit", { options: "huge", value: "r2" }],
  ["hard limit in a group", { options: "hugeGroup" }],
  ["hard limit without a check column", { options: "huge", props: { checkPosition: "none" } }],
  ["list sizes", { props: { listWidth: 320, listMinWidth: 200, listMaxWidth: 400 } }],
  ['list sizes "auto"', { props: { listWidth: "auto", listMinWidth: "auto" } }],
  ["not block: 300px min width, align start", { props: { block: false } }],
  ["side top, align end, offset", { props: { side: "top", align: "end", alignOffset: 4 } }],
  ["actions", { actions: true }],
  ["multiple: every selected option is checked", { multiple: true, value: ["banana", "mango"] }],
  ["no options: empty message", { options: "empty" }],
  ["no options: custom empty message", { options: "empty", props: { searchEmptyMessage: "Nothing to pick" } }],
  ["no options: rich empty message", { options: "empty", richEmpty: true }],
  ["aria-labelledby", { value: "apple", labelledBy: true }],
]

describe.each([
  ["animations off (jsdom default)", true],
  ["animations on (browser)", false],
])("Select markup, %s", (_mode, disabled) => {
  test.each(closedCases)("closed: %s", async (_name, c) => {
    animation.disabled = disabled
    const { react, vue } = await pair(c)
    expect(vue).toEqual(react)
  })

  test.each(openCases)("open: %s", async (_name, c) => {
    animation.disabled = disabled
    const { react, vue } = await pair(c, { open: true })
    expect(vue).toEqual(react)
    expect(react[0]).toContain('role="dialog"')
  })
})

describe("Select markup details", () => {
  test("open: Radix trigger attributes, custom properties, focus on the list", async () => {
    const { react, vue } = await pair({ value: "grapes", props: { name: "fruit" } }, { open: true })
    expect(vue).toEqual(react)
    const dom = react[0]!
    expect(dom).toMatch(/aria-controls="(gen-\d)"[\s\S]*class="MenuList"[^\n]*id="\1"/)
    expect(dom).toContain('aria-haspopup="dialog"')
    expect(dom).toContain('data-state="open"')
    expect(dom).toContain("--radix-popover-content-transform-origin: var(--radix-popper-transform-origin)")
    expect(dom).toContain("--select-list-max-width: auto")
    expect(dom).toMatch(/focus: <div class="MenuInner">/)
    expect(dom).toContain("scrolls: grapes:center")
  })

  test("searchable: the search input is a combobox controlling the list and takes focus", async () => {
    const { react, vue } = await pair({ options: "many" }, { open: true })
    expect(vue).toEqual(react)
    expect(react[0]).toMatch(/aria-controls="(gen-\d)"[^\n]*role="combobox"/)
    expect(react[0]).toContain('autocorrect="off"')
    expect(react[0]).toContain('spellcheck="false"')
    expect(react[0]).toContain('autocomplete="off"')
    expect(react[0]).toMatch(/focus: <input class="Input" role="combobox">/)
  })

  test("closed: an empty menu wrapper sits in the body, as in React", async () => {
    const { react, vue } = await pair({})
    expect(vue).toEqual(react)
    expect(react[0]).toContain('<span class="Menu">')
    expect(react[0]).not.toContain('role="dialog"')
  })

  // Known gap (as in tooltip-popover.test.tsx): Reka resolves @floating-ui/dom
  // 1.8 and Radix 1.7, whose `size` middleware computes the available size
  // differently without the `shift` middleware (avoidCollisions false).
  test("no collision avoidance (floating-ui version gap in the available size)", async () => {
    const { react, vue } = await pair({ props: { avoidCollisions: false } }, { open: true })
    const withoutAvailableSize = (dom: string) => dom.replace(/--radix-popper-available-(width|height): -?\d+px; /g, "")
    expect(vue.map(withoutAvailableSize)).toEqual(react.map(withoutAvailableSize))
  })
})

// ---------------------------------------------------------------------------
// Behaviour

describe("Select pointer behaviour parity", () => {
  test("pointer down opens; moving highlights; leaving clears; pointer up selects and closes", async () => {
    const result = await walk({ value: "apple", controlled: true }, async ({ open, fire, advance, snapshot }) => {
      await open()
      snapshot() // open, apple highlighted
      await fire(option("mango"), "pointerMove", mouse)
      snapshot() // mango highlighted
      await fire(option("mango"), "pointerLeave", mouse)
      snapshot() // nothing highlighted
      await fire(option("grapes"), "pointerMove", mouse)
      await fire(option("grapes"), "pointerUp", mouse)
      snapshot() // closed, change grapes, trigger shows Grapes
      await advance(1)
      snapshot() // focus after the close
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toMatch(/data-highlight=""[^\n]*data-option-id="mango"/)
    expect(result.react[2]).not.toContain("data-highlight")
    expect(result.react[3]).not.toContain('role="dialog"')
    expect(result.react[3]).toContain('events: change {"value":"grapes","label":"Grapes"}')
    expect(result.react[3]).toContain('"Grapes"')
  })

  test("a parent that keeps its value: change is reported, the trigger does not move", async () => {
    const result = await walk({ value: "apple" }, async ({ open, fire, snapshot }) => {
      await open()
      await fire(option("banana"), "pointerUp", mouse)
      snapshot()
      await open()
      snapshot() // apple still checked
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('events: change {"value":"banana","label":"Banana"}')
    expect(result.react[1]).toMatch(/data-option-id="apple" data-selected=""/)
  })

  test("pointer down on the open trigger closes; right click does nothing", async () => {
    const result = await walk({ value: "apple" }, async ({ open, fire, advance, snapshot }) => {
      await fire(TRIGGER, "pointerDown", { button: 2, ...mouse })
      snapshot() // still closed
      await open()
      await fire(TRIGGER, "pointerDown", { button: 0, ...mouse })
      await advance(1)
      snapshot() // closed
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("pointer down or focus outside closes", async () => {
    const result = await walk({ value: "apple" }, async ({ open, fire, focus, advance, snapshot }) => {
      await open()
      await fire(() => document.body, "pointerDown", mouse)
      await advance(1)
      snapshot()
      await open()
      await focus('[data-testid="outside"]')
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[1]).not.toContain('role="dialog"')
    expect(result.react[1]).toContain('focus: <button class=""> "Outside"')
  })

  test("disabled options ignore the pointer", async () => {
    const result = await walk({ options: "items" }, async ({ open, fire, snapshot }) => {
      await open()
      await fire(option("3"), "pointerMove", mouse)
      await fire(option("3"), "pointerUp", mouse)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[0]).toMatch(/events: $/)
  })

  test.each([
    ["disabled", { disabled: true }],
    ["loading", { loading: true }],
  ])("%s: does not open", async (_name, props) => {
    const result = await walk({ value: "apple", props }, async ({ open, key, focus, snapshot }) => {
      await open()
      await focus(TRIGGER)
      await key("ArrowDown")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
  })
})

describe("Select keyboard behaviour parity", () => {
  test("ArrowDown opens; arrows skip disabled options; Enter selects and closes", async () => {
    const result = await walk({ options: "items", value: "2", controlled: true }, async ({ focus, key, advance, snapshot }) => {
      await focus(TRIGGER)
      await key("ArrowDown")
      await advance(50)
      snapshot() // open, 2 highlighted, list focused
      await key("ArrowDown")
      snapshot() // 4 (3 is disabled)
      await key("ArrowDown")
      await key("ArrowDown")
      await key("ArrowDown")
      snapshot() // 6, then stays at the end
      await key("ArrowUp")
      await key("ArrowUp")
      await key("ArrowUp")
      await key("ArrowUp")
      snapshot() // back to 2, stays (1 is disabled)
      await key("ArrowDown")
      await key("Enter")
      snapshot() // closed, change 4
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/focus: <div class="MenuInner">/)
    expect(result.react[1]).toMatch(/data-highlight=""[^\n]*data-option-id="4"/)
    expect(result.react[2]).toMatch(/data-highlight=""[^\n]*data-option-id="6"/)
    expect(result.react[3]).toMatch(/data-highlight=""[^\n]*data-option-id="2"/)
    expect(result.react[4]).toContain('change {"value":"4","label":"List item 4"}')
    expect(result.react[4]).not.toContain('role="dialog"')
  })

  test("ArrowUp and Space open; Space selects; Enter on the trigger does nothing", async () => {
    const result = await walk({ value: "apple", controlled: true }, async ({ focus, key, advance, snapshot }) => {
      await focus(TRIGGER)
      await key("Enter")
      snapshot() // closed
      await key("ArrowUp")
      await advance(1)
      snapshot() // open
      await key("ArrowDown")
      await key(" ")
      await advance(1)
      snapshot() // banana selected, closed
      await focus(TRIGGER)
      await key(" ")
      await advance(1)
      snapshot() // open again
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[1]).toContain('role="dialog"')
    expect(result.react[2]).toContain('change {"value":"banana","label":"Banana"}')
    expect(result.react[3]).toContain('role="dialog"')
  })

  test("Home, End and PageDown do nothing (React has no handler for them)", async () => {
    const result = await walk({ value: "grapes" }, async ({ open, key, snapshot }) => {
      await open()
      await key("Home")
      await key("End")
      await key("PageDown")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/data-highlight=""[^\n]*data-option-id="grapes"/)
  })

  test("Escape closes, from the list and from the trigger", async () => {
    const result = await walk({ value: "apple" }, async ({ open, key, advance, focus, snapshot }) => {
      await open()
      await key("Escape")
      await advance(1)
      snapshot()
      await focus(TRIGGER)
      await key("ArrowDown")
      await advance(1)
      await key("Escape", TRIGGER)
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("Tab loops inside the menu (focus scope), Shift+Tab too", async () => {
    const result = await walk({ actions: true }, async ({ open, key, fire, focus, snapshot }) => {
      await open()
      await key("Tab")
      snapshot() // not at an edge: focus stays (jsdom has no native tabbing)
      await focus(".Action:last-child")
      await key("Tab")
      snapshot() // last tabbable: back to the list
      await fire(MENU, "keyDown", { key: "Tab", shiftKey: true })
      snapshot() // first tabbable: to the last action
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/focus: <div class="MenuInner">/)
    expect(result.react[1]).toMatch(/focus: <div class="MenuInner">/)
    expect(result.react[2]).toMatch(/focus: <div class="Action"> "Organization overview"/)
  })

  test("typeahead in the list highlights, cycles and resets after 500ms", async () => {
    const result = await walk({ value: "apple" }, async ({ open, key, advance, snapshot }) => {
      await open()
      await key("b")
      snapshot() // banana
      await key("b")
      snapshot() // blueberry (cycling)
      await key("l")
      snapshot() // "bbl": no match, stays
      await advance(500)
      await key("w")
      await key("a")
      snapshot() // watermelon
      await key("Enter")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/data-highlight=""[^\n]*data-option-id="banana"/)
    expect(result.react[1]).toMatch(/data-highlight=""[^\n]*data-option-id="blueberry"/)
    expect(result.react[3]).toMatch(/data-highlight=""[^\n]*data-option-id="watermelon"/)
    expect(result.react[4]).toContain('change {"value":"watermelon","label":"Watermelon"}')
  })

  test("typeahead on the closed trigger selects (single only)", async () => {
    const result = await walk({ value: "apple", controlled: true }, async ({ focus, key, advance, snapshot, set }) => {
      await focus(TRIGGER)
      await key("m")
      snapshot() // mango
      await key("p")
      snapshot() // "mp": nothing
      await advance(500)
      await key("b")
      await key("b")
      snapshot() // banana, then blueberry
      await set({ multiple: true, value: ["apple"] })
      await key("m")
      snapshot() // multiple: no typeahead
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('change {"value":"mango","label":"Mango"}')
    expect(result.react[1]).toMatch(/events: $/)
    expect(result.react[2]).toContain('change {"value":"blueberry","label":"Blueberry"}')
    expect(result.react[3]).toMatch(/events: $/)
  })
})

describe("Select search behaviour parity", () => {
  test("typing filters and highlights the first match; Space and letters type; Enter selects", async () => {
    const result = await walk({ options: "many", controlled: true }, async ({ open, type, key, snapshot, advance }) => {
      await open()
      await type("odd")
      snapshot() // odd options, first highlighted, scroll top reset
      await key(" ")
      snapshot() // space with a term is typed, not a selection
      await key("a")
      snapshot() // typeahead is skipped in the search
      await key("ArrowDown")
      await key("Enter")
      await advance(1)
      snapshot() // second odd option selected
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/data-highlight=""[^\n]*data-option-id="o2"/)
    expect(result.react[0]).not.toContain('data-option-id="o1"')
    expect(result.react[3]).toContain('change {"value":"o4","label":"Option 4 odd"}')
  })

  test("no results shows the empty message; clearing the term restores the list", async () => {
    const result = await walk({ options: "many" }, async ({ open, type, key, snapshot }) => {
      await open()
      await type("zzz")
      snapshot()
      await key("ArrowDown")
      await key("Enter")
      snapshot() // nothing to select
      await type("")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"No results found."')
    expect(result.react[2]).toContain('data-option-id="o1"')
  })

  test("Space without a term selects the highlighted option", async () => {
    const result = await walk({ options: "many", value: "o3" }, async ({ open, key, snapshot }) => {
      await open()
      await key(" ")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('change {"value":"o3","label":"Option 3"}')
  })

  test("custom search predicate", async () => {
    const searchPredicate = (option: Opt, term: string) => option.value.endsWith(term)
    const result = await walk({ options: "many", props: { searchPredicate } }, async ({ open, type, snapshot }) => {
      await open()
      await type("1")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-option-id="o11"')
    expect(result.react[0]).not.toContain('data-option-id="o2"')
  })

  test("groups: Show all expands and highlights the first new option; a search hides the limit", async () => {
    const result = await walk({ options: "grouped", value: "2" }, async ({ open, fire, type, snapshot }) => {
      const showAll = '[data-option-id^="group-limit-"]'
      await open()
      await fire(showAll, "pointerMove", mouse)
      snapshot() // the row highlights like an option
      await fire(showAll, "pointerUp", mouse)
      snapshot() // expanded, the first newly shown option (Free) highlighted
      await type("team")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/data-highlight=""[^\n]*data-option-id="group-limit-\[id\]"/)
    expect(result.react[1]).toMatch(/data-highlight=""[^\n]*data-option-id="7"/)
    expect(result.react[1]).not.toContain("group-limit-")
  })

  test("groups: keyboard moves through headings to the Show all row", async () => {
    const result = await walk({ options: "grouped", value: "6" }, async ({ open, key, snapshot }) => {
      await open()
      await key("ArrowDown")
      snapshot() // Show all row
      await key("ArrowDown")
      snapshot() // crosses the heading into the next group
      await key("ArrowUp")
      await key("Enter")
      snapshot() // Enter on the Show all row expands it
    })
    expect(result.vue).toEqual(result.react)
  })
})

describe("Select multiple and clear behaviour parity", () => {
  test("pointer up toggles options and keeps the menu open; an added option comes last", async () => {
    const result = await walk({ multiple: true, value: ["mango"], controlled: true }, async ({ open, fire, key, snapshot }) => {
      await open()
      await fire(option("apple"), "pointerUp", mouse)
      snapshot() // mango + apple, still open
      await fire(option("mango"), "pointerUp", mouse)
      snapshot() // apple
      await key("ArrowDown")
      await key("Enter")
      snapshot() // keyboard toggles too
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('change [{"value":"mango","label":"Mango"},{"value":"apple","label":"Apple"}]')
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[1]).toContain('change [{"value":"apple","label":"Apple"}]')
  })

  test("clear: single reports an empty option, multiple an empty list; the menu stays closed", async () => {
    const clear = '[aria-label="Clear current value"]'
    const result = await walk({ value: "apple", controlled: true, props: { clearable: true } }, async ({ fire, set, snapshot, advance }) => {
      await fire(clear, "pointerDown", { button: 0, ...mouse })
      await fire(clear, "click")
      await advance(1)
      snapshot()
      await set({ multiple: true, value: ["apple", "mango"] })
      await fire(clear, "pointerDown", { button: 0, ...mouse })
      await fire(clear, "click")
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('change {"value":"","label":""}')
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[0]).not.toContain("Clear current value")
    expect(result.react[1]).toContain("change []")
  })
})

describe("Select actions and triggers parity", () => {
  test("actions: pointer up runs the action and closes; Enter on a focused action too", async () => {
    const result = await walk({ actions: true }, async ({ open, fire, focus, key, advance, snapshot }) => {
      await open()
      await fire(".Action", "pointerUp", mouse)
      await advance(1)
      snapshot()
      await open()
      await focus(".Action:last-child")
      await key("Enter")
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain("events: action create")
    expect(result.react[1]).toContain("events: action overview")
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("actions: arrows and letters stay on the action; Escape still closes", async () => {
    const result = await walk({ actions: true, value: "apple" }, async ({ open, focus, key, advance, snapshot }) => {
      await open()
      await focus(".Action")
      await key("ArrowDown")
      await key("b")
      snapshot() // highlight unchanged
      await key("Escape")
      await advance(1)
      snapshot() // closed by the Escape stack
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/data-highlight=""[^\n]*data-option-id="apple"/)
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("custom trigger: click toggles; the render props' onToggle too", async () => {
    const result = await walk({ customTrigger: "plain" }, async ({ fire, advance, snapshot }) => {
      const trigger = '[data-testid="custom-trigger"]'
      await fire(trigger, "click")
      await advance(1)
      snapshot() // open, label "Close"
      await fire(trigger, "click")
      await advance(1)
      snapshot() // closed
      await fire(trigger, "dblClick")
      await advance(1)
      snapshot() // open through onToggle
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[0]).toContain('"Close"')
    expect(result.react[1]).not.toContain('role="dialog"')
    expect(result.react[2]).toContain('role="dialog"')
  })

  test("custom trigger: preventDefault in the child's click keeps it closed", async () => {
    const result = await walk({ customTrigger: "prevented" }, async ({ fire, advance, snapshot }) => {
      await fire('[data-testid="custom-trigger"]', "click")
      await advance(1)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
  })

  test("focusing the hidden input focuses the trigger", async () => {
    const result = await walk({ value: "apple", props: { name: "fruit", id: "fruit" } }, async ({ focus, snapshot }) => {
      await focus("#fruit")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/focus: <span class="SelectControl" role="button">/)
  })

  test("the hidden input follows the value", async () => {
    const result = await walk({ value: "apple", controlled: true, props: { name: "fruit" } }, async ({ open, fire, snapshot }) => {
      await open()
      await fire(option("mango"), "pointerUp", mouse)
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('name="fruit" tabindex="-1" value="mango"')
  })
})

describe("Select Vue API", () => {
  test("update:value carries the value(s), change the option(s)", async () => {
    const updates: unknown[] = []
    const changes: unknown[] = []
    const { unmount } = mountVue(() =>
      h(Select, {
        "options": fruits,
        "value": ["apple"],
        "multiple": true,
        "onUpdate:value": (value: string[]) => updates.push(value),
        "onChange": (selection: Opt[]) => changes.push(selection.map((o) => o.value)),
      }),
    )
    await flushVue()
    fireEvent.pointerDown(document.querySelector(TRIGGER)!, { button: 0 })
    await flushVue()
    await settle()
    fireEvent.pointerUp(document.querySelector(option("mango"))!)
    await flushVue()
    unmount()
    expect(updates).toEqual([["apple", "mango"]])
    expect(changes).toEqual([["apple", "mango"]])
  })

  test.each([
    ["OptionView and TriggerView", { value: "apple", optionView: true, triggerView: true }],
    ["multiple TriggerView", { multiple: true, value: ["apple", "mango"], triggerView: true }],
    ["searchEmptyMessage VNode", { options: "empty" as const, richEmpty: true }],
    ["trigger function", { customTrigger: "plain" as const }],
  ])("React's props work as well as the slots: %s", async (_name, c) => {
    const result = await walk({ ...c, vueProps: true }, async ({ open, fire, advance, snapshot }) => {
      if (c.customTrigger) {
        await fire('[data-testid="custom-trigger"]', "click")
        await advance(1)
      } else {
        await open()
      }
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="dialog"')
  })
})

describe("Select edge behaviour parity", () => {
  test("option values that need CSS escaping: highlight, arrows and Enter work", async () => {
    const result = await walk({ options: "quoted", value: "back\\slash", controlled: true }, async ({ open, key, advance, snapshot }) => {
      await open()
      await advance(50)
      snapshot() // the mount scroll finds the selected option
      await key("ArrowDown")
      await key("ArrowDown")
      snapshot() // 9 lives
      await key("ArrowUp")
      await key("ArrowUp")
      await key("ArrowUp")
      snapshot() // say "hi"
      await key("Enter")
      snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain("scrolls: back\\slash:center")
    expect(result.react[1]).toMatch(/data-highlight=""[^\n]*data-option-id="9 lives"/)
    expect(result.react[2]).toMatch(/data-highlight=""[^\n]*data-option-id="say &quot;hi&quot;"|data-highlight=""[^\n]*data-option-id="say "hi""/)
    expect(result.react[3]).toContain('change {"value":"say \\"hi\\"","label":"Say hi"}')
  })

  test("typeahead skips disabled options", async () => {
    const result = await walk({ options: "items" }, async ({ open, key, advance, snapshot }) => {
      await open()
      await key("l")
      snapshot() // from List item 2 to List item 4 (3 is disabled)
      await key("l")
      snapshot() // List item 6
      await key("l")
      snapshot() // wraps to List item 2 (1 is disabled)
      await advance(500)
      await key("o")
      snapshot() // Other 5
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/data-highlight=""[^\n]*data-option-id="4"/)
    expect(result.react[1]).toMatch(/data-highlight=""[^\n]*data-option-id="6"/)
    expect(result.react[2]).toMatch(/data-highlight=""[^\n]*data-option-id="2"/)
    expect(result.react[3]).toMatch(/data-highlight=""[^\n]*data-option-id="5"/)
  })

  test("actions only re-render when their number changes (React memoizes them by length)", async () => {
    const result = await walk({ actions: true }, async ({ open, set, snapshot }) => {
      await open()
      await set({ actions: "renamed" })
      snapshot() // still "Create project"
      await set({ actions: "three" })
      snapshot() // three actions
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"Create project"')
    expect(result.react[0]).not.toContain('"New project"')
    expect(result.react[1]).toContain('"Docs"')
  })

  test("loading: a custom trigger cannot open it; loading while open keeps it open", async () => {
    const result = await walk({ customTrigger: "plain", props: { loading: true } }, async ({ fire, set, advance, snapshot, open }) => {
      await fire('[data-testid="custom-trigger"]', "click")
      await advance(1)
      snapshot() // closed
      await set({ customTrigger: undefined, props: {} })
      await open()
      await set({ props: { loading: true } })
      snapshot() // still open, trigger loading
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain('role="dialog"')
    expect(result.react[1]).toContain('role="dialog"')
    expect(result.react[1]).toContain('aria-busy="true"')
  })

  test("the menu keeps the value it opened with while a single select closes", async () => {
    const result = await walk({ value: "apple" }, async ({ open, set, snapshot }) => {
      await open()
      await set({ value: "mango" })
      snapshot() // apple still checked, the trigger shows Mango
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toMatch(/data-option-id="apple" data-selected=""/)
    expect(result.react[0]).toContain('"Mango"')
  })
})
