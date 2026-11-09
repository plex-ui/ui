import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { ToggleGroup as RToggleGroup, type ToggleGroupProps as RToggleGroupProps } from "../../packages/ui/src/components/ToggleGroup"
import { ToggleGroup, ToggleGroupItem } from "../../packages/vue/src/components/ToggleGroup"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair, walkPair } from "./pair"

// React-vs-Vue parity for ToggleGroup: the same group of Buttons with aria-pressed for every prop, presses and
// releases in either framework with the same values, roving focus with the arrow keys, and the iOS Clock tokens.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// The days of the iOS Clock Repeat row, Monday first (IMG_5753): narrow letters, named in full
const DAYS = [
  ["1", "M", "Monday"],
  ["2", "T", "Tuesday"],
  ["3", "W", "Wednesday"],
  ["4", "T", "Thursday"],
  ["5", "F", "Friday"],
  ["6", "S", "Saturday"],
  ["7", "S", "Sunday"],
] as const

type Case = Omit<RToggleGroupProps, "children"> & { disabledItem?: string }
const cases: Array<[string, Case]> = [
  ["defaults", {}],
  ["pressed days", { defaultValue: ["3", "4", "5"] }],
  ["controlled", { value: ["1", "7"] }],
  ["round weekday row", { "pill": true, "uniform": true, "block": true, "aria-label": "Repeat", "defaultValue": ["3"] }],
  ["color and size", { color: "danger", size: "lg", defaultValue: ["2"] }],
  ["disabled group", { disabled: true, defaultValue: ["2"] }],
  ["disabled item", { disabledItem: "6", defaultValue: ["6"] }],
  ["labelled, with an id and a class", { "aria-labelledby": "repeat-label", "id": "repeat", "className": "mt-2" }],
]

const reactGroup = ({ disabledItem, ...props }: Case) => (
  <RToggleGroup {...props}>
    {DAYS.map(([value, letter, name]) => (
      <RToggleGroup.Item key={value} value={value} aria-label={name} disabled={value === disabledItem}>
        {letter}
      </RToggleGroup.Item>
    ))}
  </RToggleGroup>
)

const vueGroup = ({ disabledItem, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby, className, onChange, ...props }: Case) =>
  h(
    ToggleGroup,
    { ...props, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby, "class": className, ...(onChange && { onChange }) },
    {
      default: () =>
        DAYS.map(([value, letter, name]) =>
          h(ToggleGroupItem, { "key": value, value, "aria-label": name, "disabled": value === disabledItem }, { default: () => letter }),
        ),
    },
  )

describe("ToggleGroup DOM parity", () => {
  test.each(cases)("%s", async (_, props) => {
    const pair = await renderPair(reactGroup(props), () => vueGroup(props))
    expect(pair.vue).toBe(pair.react)
  })

  test("a toolbar of buttons, each pressed or not and named in full", async () => {
    await act(async () => {
      render(reactGroup({ "aria-label": "Repeat", "defaultValue": ["3", "4", "5"] }))
    })
    const group = document.querySelector('[role="toolbar"]')
    expect(group?.getAttribute("aria-label")).toBe("Repeat")
    const buttons = [...document.querySelectorAll("button")]
    expect(buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "false", "true", "true", "true", "false", "false"])
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(DAYS.map(([, , name]) => name))
    // A pressed day is a solid button in the group's color, the others soft secondary ones
    expect(buttons.map((button) => `${button.dataset.color} ${button.dataset.variant}`)).toEqual([
      "secondary soft", "secondary soft", "primary solid", "primary solid", "primary solid", "secondary soft", "secondary soft",
    ])
  })
})

describe("pressing", () => {
  test("uncontrolled: both frameworks press and release with the same values", async () => {
    const reactChanges: string[][] = []
    const vueChanges: string[][] = []
    const steps = async (snapshot: () => void) => {
      const button = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!
      await interact(() => fireEvent.click(button("Friday")))
      await interact(() => fireEvent.click(button("Monday")))
      snapshot()
      await interact(() => fireEvent.click(button("Friday")))
      snapshot()
    }
    const { react, vue } = await walkPair(
      () => render(reactGroup({ onChange: (value) => reactChanges.push(value) })),
      () => vueGroup({ onChange: (value) => vueChanges.push(value) }),
      steps,
    )
    expect(vue).toEqual(react)
    // A newly pressed item comes last, as Radix and Reka keep the order of the presses
    expect(reactChanges).toEqual([["5"], ["5", "1"], ["1"]])
    expect(vueChanges).toEqual(reactChanges)
  })

  test("controlled: the value decides what shows pressed", async () => {
    function Controlled() {
      const [value, setValue] = useState<string[]>(["2"])
      return reactGroup({ value, onChange: (next) => setValue(next.filter((day) => day !== "7")) })
    }
    await act(async () => {
      render(<Controlled />)
    })
    const pressed = () => [...document.querySelectorAll('button[aria-pressed="true"]')].map((button) => button.getAttribute("aria-label"))
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Sunday"]')!))
    expect(pressed()).toEqual(["Tuesday"])
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Wednesday"]')!))
    expect(pressed()).toEqual(["Tuesday", "Wednesday"])
    cleanup()

    const value = ref<string[]>(["2"])
    const App = defineComponent(() => () =>
      vueGroup({ value: value.value, onChange: (next) => (value.value = next.filter((day) => day !== "7")) }),
    )
    const { unmount } = mountVue(() => h(App))
    await flushVue()
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Sunday"]')!))
    expect(pressed()).toEqual(["Tuesday"])
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Wednesday"]')!))
    expect(pressed()).toEqual(["Tuesday", "Wednesday"])
    unmount()
  })

  test("a disabled item keeps its state: inert, without Button's disabled look", async () => {
    const steps = async (snapshot: () => void) => {
      const day = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!
      for (const name of ["Tuesday", "Saturday"]) {
        expect(day(name).disabled).toBe(true)
        expect(day(name).getAttribute("aria-disabled")).toBe("true")
        expect(day(name).hasAttribute("data-disabled")).toBe(false)
      }
      expect(day("Tuesday").getAttribute("data-variant")).toBe("solid")
      expect(day("Tuesday").getAttribute("data-color")).toBe("primary")
      expect(day("Saturday").getAttribute("data-variant")).toBe("soft")
      snapshot()
    }
    const { react, vue } = await walkPair(
      () => render(reactGroup({ disabled: true, defaultValue: ["2"] })),
      () => vueGroup({ disabled: true, defaultValue: ["2"] }),
      steps,
    )
    expect(vue).toEqual(react)
  })

  test("a disabled item or group does not change", async () => {
    for (const props of [{ disabledItem: "6" }, { disabled: true }] satisfies Case[]) {
      const onChange = vi.fn()
      await act(async () => {
        render(reactGroup({ ...props, onChange }))
      })
      await interact(() => fireEvent.click(document.querySelector('button[aria-label="Saturday"]')!))
      expect(onChange).not.toHaveBeenCalled()
      cleanup()

      const onVueChange = vi.fn()
      const { unmount } = mountVue(() => vueGroup({ ...props, onChange: onVueChange }))
      await flushVue()
      await interact(() => fireEvent.click(document.querySelector('button[aria-label="Saturday"]')!))
      expect(onVueChange).not.toHaveBeenCalled()
      unmount()
    }
  })
})

// Vue drops an event that fires in the millisecond its listener was added (runtime-dom's `_vts` check), so a test
// that mounts and at once sends focusout through the group lets a millisecond pass first, as any user does
const settle = () => interact(() => new Promise((resolve) => setTimeout(resolve, 2)))

// Radix and Reka move the focus after the keydown, in a timeout
const press = (key: string) =>
  interact(async () => {
    fireEvent.keyDown(document.activeElement!, { key })
    await new Promise((resolve) => setTimeout(resolve))
  })

describe("keyboard", () => {
  test("one tab stop that enters on the first pressed item; the arrow keys move between items", async () => {
    const steps = async (snapshot: () => void) => {
      const buttons = () => [...document.querySelectorAll("button")]
      const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
      expect([group.tabIndex, ...buttons().map((button) => button.tabIndex)]).toEqual([0, -1, -1, -1, -1, -1, -1, -1])
      await interact(() => group.focus())
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Wednesday")
      await press("ArrowRight")
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Thursday")
      await press("ArrowLeft")
      await press("ArrowLeft")
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Tuesday")
      snapshot()
    }
    const { react, vue } = await walkPair(
      () => render(reactGroup({ defaultValue: ["3", "5"] })),
      () => vueGroup({ defaultValue: ["3", "5"] }),
      steps,
    )
    expect(vue).toEqual(react)
  })
})

describe("keyboard and clicks, as Radix composes them", () => {
  test("right to left: the arrow keys follow the reading direction", async () => {
    const steps = async (snapshot: () => void) => {
      const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
      expect(group.getAttribute("dir")).toBe("rtl")
      await interact(() => group.focus())
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
      await press("ArrowLeft")
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Tuesday")
      await press("ArrowRight")
      await press("ArrowRight")
      // The group loops, as Radix ToggleGroup does
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Sunday")
      snapshot()
    }
    const { react, vue } = await walkPair(
      () => render(reactGroup({ dir: "rtl" })),
      () => vueGroup({ dir: "rtl" }),
      steps,
    )
    expect(vue).toEqual(react)
  })

  test("with nothing pressed, focus comes back to the item focused last", async () => {
    const steps = async (snapshot: () => void) => {
      await settle()
      const buttons = () => [...document.querySelectorAll("button")]
      const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
      await interact(() => group.focus())
      await press("ArrowRight")
      await press("ArrowRight")
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Wednesday")
      await interact(() => (document.activeElement as HTMLElement).blur())
      expect([group.tabIndex, ...buttons().map((button) => button.tabIndex)]).toEqual([0, -1, -1, 0, -1, -1, -1, -1])
      await interact(() => group.focus())
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Wednesday")
      snapshot()
    }
    const { react, vue } = await walkPair(
      () => render(reactGroup({})),
      () => vueGroup({}),
      steps,
    )
    expect(vue).toEqual(react)
  })

  test("Shift+Tab out of the group and Tab back enters it on the pressed item again", async () => {
    const steps = async (snapshot: () => void) => {
      await settle()
      const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
      await interact(() => group.focus())
      await press("ArrowRight")
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Tuesday")
      // Radix gives the tab stop to the browser for the Shift+Tab, then back to the group once focus has left
      await interact(() => fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true }))
      expect(group.tabIndex).toBe(-1)
      await interact(() => (document.activeElement as HTMLElement).blur())
      expect(group.tabIndex).toBe(0)
      await interact(() => group.focus())
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
      snapshot()
    }
    const { react, vue } = await walkPair(
      () => render(reactGroup({ defaultValue: ["1"] })),
      () => vueGroup({ defaultValue: ["1"] }),
      steps,
    )
    expect(vue).toEqual(react)
  })

  test("Vue: the caller's focusout and blur listeners on the group still run", async () => {
    const onFocusout = vi.fn()
    const onBlur = vi.fn()
    const { unmount } = mountVue(() =>
      h(ToggleGroup, { onFocusout, onBlur }, {
        default: () => h(ToggleGroupItem, { "value": "1", "aria-label": "Monday" }, { default: () => "M" }),
      }),
    )
    await flushVue()
    await settle()
    const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
    await interact(() => group.focus())
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
    // Entering moved focus from the group to its item: the group's own blur
    expect(onBlur).toHaveBeenCalledTimes(1)
    onFocusout.mockClear()
    onBlur.mockClear()
    await interact(() => (document.activeElement as HTMLElement).blur())
    // Focus left the item, not the group itself: a focusout, no blur on the group
    expect(onFocusout).toHaveBeenCalledTimes(1)
    expect(onBlur).not.toHaveBeenCalled()
    await interact(() => group.focus())
    await interact(() => fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true }))
    // The caller's focusout runs first and can keep Radix's Shift+Tab state, as React's onBlur can
    onFocusout.mockImplementationOnce((event: Event) => event.preventDefault())
    await interact(() => (document.activeElement as HTMLElement).blur())
    expect(group.tabIndex).toBe(-1)
    unmount()
  })

  test("Vue: `.once` focus and focusout listeners can cancel as plain ones do", async () => {
    const onFocusOnce = vi.fn((event: Event) => event.preventDefault())
    const onFocusoutOnce = vi.fn((event: Event) => event.preventDefault())
    const { unmount } = mountVue(() =>
      h(ToggleGroup, { onFocusOnce, onFocusoutOnce }, {
        default: () => h(ToggleGroupItem, { "value": "1", "aria-label": "Monday" }, { default: () => "M" }),
      }),
    )
    await flushVue()
    await settle()
    const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
    // The first focus stays on the group, as with `@focus.prevent`; the next one enters it
    await interact(() => group.focus())
    expect(document.activeElement).toBe(group)
    await interact(() => group.blur())
    await interact(() => group.focus())
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
    expect(onFocusOnce).toHaveBeenCalledTimes(1)
    // The group's blur before the second focus was the first focusout: `.once` has run, Radix's reset runs again
    await interact(() => fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true }))
    await interact(() => (document.activeElement as HTMLElement).blur())
    expect(group.tabIndex).toBe(0)
    expect(onFocusoutOnce).toHaveBeenCalledTimes(1)
    unmount()

    // A `.once` focusout that cancels keeps the Shift+Tab state, as a plain one does
    const keep = vi.fn((event: Event) => event.preventDefault())
    const second = mountVue(() =>
      h(ToggleGroup, { onFocusoutOnce: keep }, {
        default: () => [
          h(ToggleGroupItem, { "value": "1", "aria-label": "Monday" }, { default: () => "M" }),
          h(ToggleGroupItem, { "value": "2", "aria-label": "Tuesday" }, { default: () => "T" }),
        ],
      }),
    )
    await flushVue()
    await settle()
    const monday = document.querySelector<HTMLElement>('button[aria-label="Monday"]')!
    await interact(() => monday.focus())
    await interact(() => fireEvent.keyDown(monday, { key: "Tab", shiftKey: true }))
    await interact(() => monday.blur())
    expect(keep).toHaveBeenCalledTimes(1)
    expect(document.querySelector<HTMLElement>('[role="toolbar"]')!.tabIndex).toBe(-1)
    second.unmount()
  })

  test("Vue: `.once` runs once per event, whatever the callback; a keydown listener added later still cancels", async () => {
    // One callback for both `.once` events: running for focus does not use up the focusout one
    const cancel = vi.fn((event: Event) => event.preventDefault())
    const replacement = vi.fn()
    const onFocusOnce = ref<(event: Event) => void>(cancel)
    const { unmount } = mountVue(() =>
      h(ToggleGroup, { onFocusOnce: onFocusOnce.value, onFocusoutOnce: cancel }, {
        default: () => h(ToggleGroupItem, { "value": "1", "aria-label": "Monday" }, { default: () => "M" }),
      }),
    )
    await flushVue()
    await settle()
    const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
    await interact(() => group.focus())
    expect(document.activeElement).toBe(group)
    await interact(() => group.blur())
    expect(cancel).toHaveBeenCalledTimes(2)
    // A new callback in place of a `.once` one that has run does not run
    onFocusOnce.value = replacement
    await flushVue()
    await settle()
    await interact(() => group.focus())
    expect(replacement).not.toHaveBeenCalled()
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
    unmount()

    // A keydown listener added after the items mounted runs before Reka's arrow keys and can cancel them
    const cancelKeys = ref(false)
    const second = mountVue(() =>
      h(ToggleGroup, null, {
        default: () => [
          h(ToggleGroupItem, {
            "value": "1",
            "aria-label": "Monday",
            ...(cancelKeys.value && { onKeydown: (event: KeyboardEvent) => event.preventDefault() }),
          }, { default: () => "M" }),
          h(ToggleGroupItem, { "value": "2", "aria-label": "Tuesday" }, { default: () => "T" }),
        ],
      }),
    )
    await flushVue()
    await settle()
    cancelKeys.value = true
    await flushVue()
    await settle()
    await interact(() => document.querySelector<HTMLElement>('[role="toolbar"]')!.focus())
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
    await press("ArrowRight")
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
    second.unmount()
  })

  test("an item's focusout that calls preventDefault keeps the Shift+Tab state, as React's item onBlur does", async () => {
    const steps = async (snapshot: () => void) => {
      await settle()
      const group = document.querySelector<HTMLElement>('[role="toolbar"]')!
      await interact(() => group.focus())
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Monday")
      await interact(() => fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true }))
      await interact(() => (document.activeElement as HTMLElement).blur())
      expect(group.tabIndex).toBe(-1)
      snapshot()
    }
    const keep = (event: { preventDefault: () => void }) => event.preventDefault()
    const { react, vue } = await walkPair(
      () =>
        render(
          <RToggleGroup>
            <RToggleGroup.Item value="1" aria-label="Monday" {...({ onBlur: keep } as object)}>
              M
            </RToggleGroup.Item>
          </RToggleGroup>,
        ),
      () =>
        h(ToggleGroup, null, {
          default: () => h(ToggleGroupItem, { "value": "1", "aria-label": "Monday", "onFocusout": keep }, { default: () => "M" }),
        }),
      steps,
    )
    expect(vue).toEqual(react)
  })

  test("a click handler that calls preventDefault keeps the item as it is", async () => {
    const onChange = vi.fn()
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    await act(async () => {
      render(
        <RToggleGroup onChange={onChange}>
          <RToggleGroup.Item value="1" aria-label="Monday" onClick={onClick}>
            M
          </RToggleGroup.Item>
        </RToggleGroup>,
      )
    })
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Monday"]')!))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    expect(document.querySelector("button")!.getAttribute("aria-pressed")).toBe("false")
    cleanup()

    const onVueChange = vi.fn()
    const onVueClick = vi.fn((event: Event) => event.preventDefault())
    const { unmount } = mountVue(() =>
      h(ToggleGroup, { onChange: onVueChange }, {
        default: () => h(ToggleGroupItem, { "value": "1", "aria-label": "Monday", "onClick": onVueClick }, { default: () => "M" }),
      }),
    )
    await flushVue()
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Monday"]')!))
    expect(onVueClick).toHaveBeenCalledTimes(1)
    expect(onVueChange).not.toHaveBeenCalled()
    expect(document.querySelector("button")!.getAttribute("aria-pressed")).toBe("false")
    unmount()

    // `@click.once.prevent`: a once listener runs before the toggle as well
    const onOnceChange = vi.fn()
    const onOnceClick = vi.fn((event: Event) => event.preventDefault())
    const once = mountVue(() =>
      h(ToggleGroup, { onChange: onOnceChange }, {
        default: () => h(ToggleGroupItem, { "value": "1", "aria-label": "Monday", "onClickOnce": onOnceClick }, { default: () => "M" }),
      }),
    )
    await flushVue()
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Monday"]')!))
    expect(onOnceClick).toHaveBeenCalledTimes(1)
    expect(onOnceChange).not.toHaveBeenCalled()
    await interact(() => fireEvent.click(document.querySelector('button[aria-label="Monday"]')!))
    expect(onOnceClick).toHaveBeenCalledTimes(1)
    expect(onOnceChange).toHaveBeenCalledWith(["1"])
    once.unmount()
  })
})

describe("tokens", () => {
  test("a block row spreads its items; a phone round item is the iOS Clock weekday circle", () => {
    const css = read("packages/styles/src/components/ToggleGroup/ToggleGroup.module.css")
    expect(css).toMatch(/gap: var\(--toggle-group-gap\)/)
    expect(css).toMatch(/&:where\(\[data-block\]\) \{[^}]*justify-content: space-between/)
    expect(read("packages/styles/src/styles/variables-components.css")).toMatch(/--toggle-group-gap: 8px;/)
    // A disabled item, pressed or not, is the enabled one at half opacity (iOS 27 kit segmented control)
    expect(css).toMatch(/&:where\(\[disabled\]\) \{\s*opacity: var\(--toggle-group-disabled-opacity\);/)
    expect(read("packages/styles/src/styles/variables-components.css")).toMatch(/--toggle-group-disabled-opacity: 0\.5;/)
    const touch = read("packages/styles/src/styles/touch.css")
    expect(touch).toMatch(/--toggle-group-round-size: 35px;/)
    expect(touch).toMatch(/--toggle-group-round-font-size: 17px;/)
    const round = touch.match(/:where\(\[data-slot="toggle-group"\]\) > :where\(\[data-pill\]\[data-uniform\]\) \{([^}]*)\}/)?.[1] ?? ""
    for (const size of ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]) {
      expect(round).toContain(`--button-uniform-size-${size}: var(--toggle-group-round-size);`)
      expect(round).toContain(`--button-font-size-${size}: var(--toggle-group-round-font-size);`)
    }
  })
})
