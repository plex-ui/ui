import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, type ComponentType, type ReactElement } from "react"
import { describe, expect, test } from "vitest"
import { h, type VNode } from "vue"
import { Menu as ReactMenu } from "../../packages/ui/src/components/Menu"
import { SelectControl as ReactSelectControl } from "../../packages/ui/src/components/SelectControl"
import RCalendarAlt from "../../packages/ui/src/components/Icon/svg/Calendar"
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../../packages/vue/src/components/Menu"
import { SelectControl } from "../../packages/vue/src/components/SelectControl"
import CalendarAlt from "../../packages/vue/src/components/Icon/svg/Calendar"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair as renderPairRaw } from "./pair"

// React-vs-Vue parity for SelectControl. Props are written once in React's
// shape and mapped to Vue: className → class, StartIcon → the same icon from
// each package, children → the default slot, onX handlers → listeners or
// the function props (onClearClick, onInteract).

type Props = Record<string, unknown> & { children?: string }

const toReact = ({ StartIcon, children = "Select...", ...props }: Props) => ({
  ...props,
  ...(StartIcon ? { StartIcon: RCalendarAlt } : {}),
  children,
})

const toVue = ({ className, StartIcon, children = "Select...", onPointerDown, onKeyDown, onPointerEnter, onClick, ...props }: Props) => ({
  ...props,
  ...(className ? { class: className } : {}),
  ...(StartIcon ? { StartIcon: CalendarAlt } : {}),
  ...(onPointerDown ? { onPointerdown: onPointerDown } : {}),
  ...(onKeyDown ? { onKeydown: onKeyDown } : {}),
  ...(onPointerEnter ? { onPointerenter: onPointerEnter } : {}),
  ...(onClick ? { onClick } : {}),
  children,
})

// The CSS modules are unscoped in tests, so SelectControl's `LoadingIndicator`
// class and the indicator's own have the same name: React's clsx keeps both,
// Vue's class merge drops an identical fallthrough class. With scoped modules
// (any real build) they differ and both apps render both.
const sameIndicatorClass = (dom: string) => dom.replaceAll('class="LoadingIndicator LoadingIndicator"', 'class="LoadingIndicator"')

const renderPair: typeof renderPairRaw = async (...args) => {
  const { react, vue } = await renderPairRaw(...args)
  return { react: sameIndicatorClass(react), vue: sameIndicatorClass(vue) }
}

const reactControl = (props: Props) => createElement(ReactSelectControl as ComponentType<Props>, toReact(props))
const vueControl = (props: Props) => {
  const { children, ...vueProps } = toVue(props)
  return h(SelectControl as never, vueProps, { default: () => children })
}

const noop = () => {}
const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]

const cases: Array<[string, Props]> = [
  ["default", {}],
  ["soft", { variant: "soft" }],
  ["ghost", { variant: "ghost" }],
  ...SIZES.map((size): [string, Props] => [`size ${size}`, { size }]),
  ["pill", { pill: true }],
  ["block", { block: true }],
  ["block false", { block: false }],
  ["opticallyAlign start", { opticallyAlign: "start", variant: "ghost" }],
  ["opticallyAlign end", { opticallyAlign: "end", variant: "ghost" }],
  ["disabled", { disabled: true, selected: true }],
  ["disabled false renders aria-disabled", { disabled: false }],
  ["invalid", { invalid: true, selected: true }],
  ["invalid false", { invalid: false }],
  ["selected", { selected: true, children: "Pineapple" }],
  ["start icon", { StartIcon: true, children: "Select date..." }],
  ["dropdown icon chevronDown", { dropdownIconType: "chevronDown", selected: true }],
  ["dropdown icon none", { dropdownIconType: "none" }],
  ["loading", { loading: true, children: "Loading..." }],
  ["loading and selected", { loading: true, selected: true, StartIcon: true }],
  ["clearable, not selected: no clear action", { onClearClick: noop }],
  ["clearable and selected", { onClearClick: noop, selected: true, StartIcon: true }],
  ["clearable, no dropdown icon: solid only child", { onClearClick: noop, selected: true, dropdownIconType: "none" }],
  ["clearable pill", { onClearClick: noop, selected: true, pill: true }],
  ["clearable while loading", { onClearClick: noop, selected: true, loading: true }],
  ["clearable while disabled", { onClearClick: noop, selected: true, disabled: true }],
  ["class, style and attributes land on the span", { className: "w-[200px]", style: { maxWidth: "240px" }, "data-testid": "control", "aria-label": "Date", id: "date" }],
  ["attributes override the control's own", { "data-variant": "custom", tabIndex: 3, role: "combobox" }],
]

describe.each([
  ["animations off (jsdom default)", true],
  ["animations on (browser)", false],
])("SelectControl parity, %s", (_mode, disabled) => {
  test.each(cases)("%s", async (_name, props) => {
    animation.disabled = disabled
    const { react, vue } = await renderPair(reactControl(props), () => vueControl(props))
    expect(vue).toBe(react)
  })
})

describe("SelectControl markup", () => {
  test("the clear action is a ghost Button next to the dropdown icon", async () => {
    const props = { onClearClick: noop, selected: true }
    const { react, vue } = await renderPair(reactControl(props), () => vueControl(props))
    expect(vue).toBe(react)
    expect(react).toContain('aria-label="Clear current value"')
    expect(react).toContain('data-variant="ghost"')
    expect(react).toContain('class="DropdownIcon"')
    expect(react).toContain('data-selected="true"')
  })

  test("loading hides the dropdown icon and clear action", async () => {
    const props = { onClearClick: noop, selected: true, loading: true }
    const { react, vue } = await renderPair(reactControl(props), () => vueControl(props))
    expect(vue).toBe(react)
    expect(react).toContain('aria-busy="true"')
    expect(react).not.toContain("Clear current value")
    expect(react).not.toContain("DropdownIcon")
  })
})

// ---------------------------------------------------------------------------
// Behaviour

type Log = string[]

/** Same handlers for both frameworks, recording what they receive */
const recorder = (log: Log) => ({
  onInteract: () => log.push("interact"),
  onClearClick: () => log.push("clear"),
  onKeyDown: (evt: { key: string }) => log.push(`keydown ${evt.key}`),
  onPointerDown: (evt: { type: string; defaultPrevented: boolean }) => log.push(`pointerdown ${evt.type}`),
  onPointerEnter: () => log.push("pointerenter"),
  onClick: (evt: { type: string }) => log.push(`click ${evt.type}`),
})

const CONTROL = '[role="button"]'
const control = () => document.querySelector(CONTROL) as HTMLElement

type Step = (log: Log) => Promise<void>

/** Renders each framework, runs `steps`, returns the log and final DOM of each */
const behaviour = async (props: (log: Log) => Props, steps: Step) => {
  const reactLog: Log = []
  await act(async () => {
    render(reactControl(props(reactLog)))
  })
  await steps(reactLog)
  const reactFinal = sameIndicatorClass(serializeDom())
  cleanup()

  const vueLog: Log = []
  const { unmount } = mountVue(() => vueControl(props(vueLog)))
  await flushVue()
  await steps(vueLog)
  const vueFinal = sameIndicatorClass(serializeDom())
  unmount()
  return { react: { log: reactLog, dom: reactFinal }, vue: { log: vueLog, dom: vueFinal } }
}

const fire = (target: () => Element, event: keyof typeof fireEvent, init?: object) =>
  interact(() => {
    ;(fireEvent[event] as (element: Element, init?: object) => boolean)(target(), init)
  })

/** Fires an event and records whether the control prevented its default */
const fireAndRecord = (log: Log, event: keyof typeof fireEvent, init?: object) =>
  interact(() => {
    const allowed = (fireEvent[event] as (element: Element, init?: object) => boolean)(control(), init)
    const key = init && "key" in init ? [(init as { key: string }).key] : []
    log.push([String(event), ...key, allowed ? "allowed" : "prevented"].join(" "))
  })

describe("SelectControl behaviour parity", () => {
  test("onInteract: left pointer down interacts and prevents default, right click does nothing", async () => {
    const result = await behaviour(
      (log) => ({ ...recorder(log), onClick: undefined }),
      async (log) => {
        await fireAndRecord(log, "pointerDown", { button: 0 })
        await fireAndRecord(log, "pointerDown", { button: 2 })
        await fireAndRecord(log, "click")
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.log).toEqual(["interact", "pointerDown prevented", "pointerDown allowed", "click allowed"])
  })

  test("onInteract: ArrowDown, ArrowUp and Space interact; Enter does nothing; other keys reach onKeyDown", async () => {
    const result = await behaviour(recorder, async (log) => {
      for (const key of ["ArrowDown", "ArrowUp", " ", "Enter", "a", "Escape", "Tab"]) {
        await fireAndRecord(log, "keyDown", { key })
      }
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react.log).toEqual([
      "interact",
      "keyDown ArrowDown prevented",
      "interact",
      "keyDown ArrowUp prevented",
      "interact",
      "keyDown   prevented",
      "keyDown Enter allowed",
      "keydown a",
      "keyDown a allowed",
      "keydown Escape",
      "keyDown Escape allowed",
      "keydown Tab",
      "keyDown Tab allowed",
    ])
  })

  test("without onInteract: pointer down calls onPointerDown and onClick; keys dispatch a pointer down", async () => {
    const result = await behaviour(
      (log) => ({ ...recorder(log), onInteract: undefined }),
      async (log) => {
        await fireAndRecord(log, "pointerDown", { button: 0 })
        await fireAndRecord(log, "keyDown", { key: "ArrowDown" })
        await fireAndRecord(log, "keyDown", { key: " " })
        // Clicks are ignored: the control opens on pointer down
        await fireAndRecord(log, "click")
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.log).toEqual([
      "pointerdown pointerdown",
      "click pointerdown",
      "pointerDown allowed",
      "pointerdown pointerdown",
      "click pointerdown",
      "keyDown ArrowDown prevented",
      "pointerdown pointerdown",
      "click pointerdown",
      "keyDown   prevented",
      "click allowed",
    ])
  })

  test.each([
    ["disabled", { disabled: true }],
    ["loading", { loading: true }],
  ])("%s: no pointer or keyboard interaction, onKeyDown and onPointerDown are not called", async (_name, extra) => {
    const result = await behaviour(
      (log) => ({ ...recorder(log), ...extra }),
      async (log) => {
        await fireAndRecord(log, "pointerDown", { button: 0 })
        await fireAndRecord(log, "keyDown", { key: "ArrowDown" })
        await fireAndRecord(log, "keyDown", { key: "a" })
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.log).toEqual(["pointerDown allowed", "keyDown ArrowDown allowed", "keyDown a allowed"])
  })

  test("the clear action calls onClearClick without interacting with the control", async () => {
    const clearButton = () => document.querySelector('[aria-label="Clear current value"]')!
    const result = await behaviour(
      (log) => ({ ...recorder(log), selected: true }),
      async (log) => {
        await fire(clearButton, "pointerDown", { button: 0 })
        await fire(clearButton, "click")
        log.push(`focus on clear: ${document.activeElement === clearButton()}`)
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.log).toEqual(["clear", "focus on clear: false"])
  })

  test("Enter and Space on the clear button are left to it; other keys still reach the control", async () => {
    const clearButton = () => document.querySelector('[aria-label="Clear current value"]')!
    const result = await behaviour(
      (log) => ({ ...recorder(log), selected: true }),
      async (log) => {
        for (const key of [" ", "Enter", "ArrowDown", "a"]) {
          await interact(() => {
            const allowed = fireEvent.keyDown(clearButton(), { key })
            log.push(`clear keyDown ${key} ${allowed ? "allowed" : "prevented"}`)
          })
        }
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.log).toEqual([
      "clear keyDown   allowed",
      "clear keyDown Enter allowed",
      "interact",
      "clear keyDown ArrowDown prevented",
      "keydown a",
      "clear keyDown a allowed",
    ])
  })

  test("pointer enter sets the press scale and calls onPointerEnter", async () => {
    const result = await behaviour(recorder, async () => {
      await fire(control, "pointerEnter")
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react.log).toEqual(["pointerenter"])
    expect(result.react.dom).toContain('style="--scale: 0.96"')
  })
})

// ---------------------------------------------------------------------------
// Inside a Menu (the docs Overview example)

describe("SelectControl as a Menu trigger", () => {
  const snapshot = () => serializeDom().replaceAll("--reka-popper-", "--radix-popper-")
  const settle = async () => {
    await interact(() => new Promise((resolve) => setTimeout(resolve, 0)))
    await flushVue()
  }

  const reactMenu = (value: string): ReactElement => (
    <ReactMenu>
      <ReactMenu.Trigger>
        <ReactSelectControl className="w-[200px]" selected={!!value} onClearClick={() => {}} StartIcon={RCalendarAlt}>
          {value || "Select date..."}
        </ReactSelectControl>
      </ReactMenu.Trigger>
      <ReactMenu.Content minWidth={200} width={200}>
        <ReactMenu.RadioGroup value={value} onChange={() => {}}>
          <ReactMenu.RadioItem value="Today">Today</ReactMenu.RadioItem>
          <ReactMenu.RadioItem value="Last week">Last week</ReactMenu.RadioItem>
        </ReactMenu.RadioGroup>
      </ReactMenu.Content>
    </ReactMenu>
  )

  const vueMenu = (value: string): VNode =>
    h(Menu, null, {
      default: () => [
        h(MenuTrigger, null, {
          default: () =>
            h(SelectControl, { class: "w-[200px]", selected: !!value, onClearClick: () => {}, StartIcon: CalendarAlt }, {
              default: () => value || "Select date...",
            }),
        }),
        h(MenuContent, { minWidth: 200, width: 200 }, {
          default: () =>
            h(MenuRadioGroup, { value }, {
              default: () => [
                h(MenuRadioItem, { value: "Today" }, { default: () => "Today" }),
                h(MenuRadioItem, { value: "Last week" }, { default: () => "Last week" }),
              ],
            }),
        }),
      ],
    })

  const run = async (steps: () => Promise<void>, snapshots: string[]) => {
    await settle()
    snapshots.push(snapshot())
    await steps()
    snapshots.push(snapshot())
  }

  test.each([
    ["pointer down opens", () => fire(control, "pointerDown", { button: 0, pointerType: "mouse" })],
    ["ArrowDown opens through a synthetic pointer down", () => fire(control, "keyDown", { key: "ArrowDown" })],
    ["Space opens", () => fire(control, "keyDown", { key: " " })],
  ])("%s", async (_name, step) => {
    const react: string[] = []
    await act(async () => {
      render(reactMenu("Today"))
    })
    await run(async () => {
      await step()
      await settle()
    }, react)
    cleanup()

    const vue: string[] = []
    const { unmount } = mountVue(() => vueMenu("Today"))
    await flushVue()
    await run(async () => {
      await step()
      await settle()
    }, vue)
    unmount()

    expect(vue).toEqual(react)
    expect(react[0]).toContain('aria-haspopup="menu"')
    expect(react[0]).not.toContain('role="menu"')
    expect(react[1]).toContain('role="menu"')
  })
})
