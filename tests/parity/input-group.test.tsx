import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useState, type ComponentType, type ReactElement } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref, type VNode } from "vue"
import { InputGroup as RInputGroup } from "../../packages/ui/src/components/InputGroup"
import { Menu as RMenu } from "../../packages/ui/src/components/Menu"
import RSearch from "../../packages/ui/src/components/Icon/svg/Search"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "../../packages/vue/src/components/InputGroup"
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../../packages/vue/src/components/Menu"
import Search from "../../packages/vue/src/components/Icon/svg/Search"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair } from "./pair"

// Test CSS modules are unscoped, so InputGroup's `.Button` and Button's own
// `.Button` would both be "Button", and Vue's mergeProps skips a fallthrough
// class identical to the root's. Real builds hash each module separately;
// give the InputGroup one its own name here too.
vi.mock("@plexui/styles/components/InputGroup/InputGroup.module.css", async (importOriginal) => {
  const actual = await importOriginal<{ default: Record<string, string> }>()
  return { default: { ...actual.default, Button: "InputGroupButton" } }
})

type Props = Record<string, unknown>
type AnyComponent = ComponentType<Props>

// React compound parts (`InputGroup.Input`, ...) by name
const part = (name: string) => (RInputGroup as unknown as Record<string, AnyComponent>)[name]!
const RInput = part("Input")
const RTextarea = part("Textarea")
const RAddon = part("Addon")
const RButton = part("Button")
const RText = part("Text")

// React className → Vue class
const vueProps = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const

// The docs' search field: icon before, a text count and a button after
const reactSearch = (groupProps: Props = {}, inputProps: Props = {}) =>
  createElement(
    RInputGroup as unknown as AnyComponent,
    groupProps,
    createElement(RInput, { placeholder: "Search...", ...inputProps }),
    createElement(RAddon, null, createElement(RSearch)),
    createElement(
      RAddon,
      { align: "inline-end" },
      createElement(RText, null, "12 results"),
      createElement(RButton, { uniform: true, "aria-label": "Go" }, createElement(RSearch)),
    ),
  )

const vueSearch = (groupProps: Props = {}, inputProps: Props = {}) =>
  h(InputGroup as never, vueProps(groupProps), () => [
    h(InputGroupInput as never, { placeholder: "Search...", ...vueProps(inputProps) }),
    h(InputGroupAddon, null, () => h(Search)),
    h(InputGroupAddon, { align: "inline-end" }, () => [
      h(InputGroupText, null, () => "12 results"),
      h(InputGroupButton, { "uniform": true, "aria-label": "Go" }, () => h(Search)),
    ]),
  ])

afterEach(() => {
  cleanup()
})

describe("InputGroup parity", () => {
  const groupCases: Array<[string, Props]> = [
    ["defaults", {}],
    ...SIZES.flatMap((size): Array<[string, Props]> => [
      [`size ${size}, outline`, { size }],
      [`size ${size}, soft`, { size, variant: "soft" }],
    ]),
    ["pill", { pill: true }],
    ["disabled", { disabled: true }],
    ["invalid", { invalid: true }],
    ["pill, soft, disabled, invalid", { pill: true, variant: "soft", disabled: true, invalid: true }],
    ["class and attributes", { className: "w-full", id: "search", style: { maxWidth: "320px" }, "aria-label": "Search docs" }],
    ["caller role and data attributes win", { role: "search", "data-slot": "custom", "data-size": "x" }],
  ]

  test.each(groupCases)("group: %s", async (_name, props) => {
    const { react, vue } = await renderPair(reactSearch(props), () => vueSearch(props))
    expect(vue).toBe(react)
  })

  const inputCases: Array<[string, Props, Props]> = [
    ["type and attributes", {}, { type: "email", name: "email", className: "font-mono", maxLength: 40, readOnly: true }],
    ["controlled value", {}, { value: "plex", onChange: () => {} }],
    ["default value", {}, { defaultValue: "plex" }],
    ["own disabled", {}, { disabled: true }],
    ["own disabled false wins over the group", { disabled: true }, { disabled: false }],
    ["group invalid sets aria-invalid", { invalid: true }, {}],
    ["explicit aria-invalid wins", { invalid: true }, { "aria-invalid": "false" }],
  ]

  test.each(inputCases)("input: %s", async (_name, groupProps, inputProps) => {
    const { onChange: _onChange, ...vueInputProps } = inputProps
    const { react, vue } = await renderPair(reactSearch(groupProps, inputProps), () => vueSearch(groupProps, vueInputProps))
    expect(vue).toBe(react)
  })

  const textareaCases: Array<[string, Props, Props]> = [
    ["defaults (3 rows)", {}, {}],
    ["rows, placeholder and default value", {}, { rows: 5, placeholder: "Write...", defaultValue: "Line 1\nLine 2" }],
    ["disabled and invalid from the group", { disabled: true, invalid: true }, {}],
  ]

  test.each(textareaCases)("textarea: %s", async (_name, groupProps, textareaProps) => {
    const react = createElement(
      RInputGroup as unknown as AnyComponent,
      groupProps,
      createElement(RTextarea, textareaProps),
      createElement(RAddon, { align: "block-start" }, createElement(RText, null, "script.js")),
      createElement(RAddon, { align: "block-end" }, createElement(RText, null, "Line 1"), createElement(RButton, { variant: "solid", color: "primary" }, "Run")),
    )
    const vue = () =>
      h(InputGroup as never, groupProps, () => [
        h(InputGroupTextarea as never, textareaProps),
        h(InputGroupAddon, { align: "block-start" }, () => h(InputGroupText, null, () => "script.js")),
        h(InputGroupAddon, { align: "block-end" }, () => [
          h(InputGroupText, null, () => "Line 1"),
          h(InputGroupButton, { variant: "solid", color: "primary" }, () => "Run"),
        ]),
      ])
    const pair = await renderPair(react, vue)
    expect(pair.vue).toBe(pair.react)
  })

  test.each(["inline-start", "inline-end", "block-start", "block-end"])("addon align %s, with attributes", async (align) => {
    const props = { align, className: "gap-1", id: "addon" }
    const { react, vue } = await renderPair(
      createElement(RInputGroup as unknown as AnyComponent, null, createElement(RInput), createElement(RAddon, props, "$")),
      () => h(InputGroup, null, () => [h(InputGroupInput), h(InputGroupAddon as never, vueProps(props), () => "$")]),
    )
    expect(vue).toBe(react)
  })

  test("addon defaults to inline-start", async () => {
    const { react, vue } = await renderPair(
      createElement(RInputGroup as unknown as AnyComponent, null, createElement(RInput), createElement(RAddon, null, "$")),
      () => h(InputGroup, null, () => [h(InputGroupInput), h(InputGroupAddon, null, () => "$")]),
    )
    expect(vue).toBe(react)
    expect(react).toContain('data-align="inline-start"')
  })

  const buttonCases: Array<[string, Props, Props]> = [
    ...SIZES.map((size): [string, Props, Props] => [`button in a ${size} group`, { size }, {}]),
    ["pill from the group", { pill: true }, {}],
    ["own pill false wins", { pill: true }, { pill: false }],
    ["disabled from the group", { disabled: true }, {}],
    ["own disabled false wins", { disabled: true }, { disabled: false }],
    ["color, variant, uniform and attributes", {}, { color: "primary", variant: "solid", uniform: true, "aria-label": "Send", className: "ml-auto", type: "submit" }],
    ["loading", {}, { loading: true }],
  ]

  test.each(buttonCases)("button: %s", async (_name, groupProps, buttonProps) => {
    const { react, vue } = await renderPair(
      createElement(
        RInputGroup as unknown as AnyComponent,
        groupProps,
        createElement(RInput),
        createElement(RAddon, { align: "inline-end" }, createElement(RButton, buttonProps, "Search")),
      ),
      () =>
        h(InputGroup as never, groupProps, () => [
          h(InputGroupInput),
          h(InputGroupAddon, { align: "inline-end" }, () => h(InputGroupButton as never, vueProps(buttonProps), () => "Search")),
        ]),
    )
    expect(vue).toBe(react)
  })

  test("button sizes follow the group", async () => {
    const sizes: string[] = []
    for (const size of SIZES) {
      mountVue(() => h(InputGroup, { size }, () => h(InputGroupAddon, null, () => h(InputGroupButton, null, () => "Go"))))
      await flushVue()
      sizes.push(document.querySelector("button")!.getAttribute("data-size")!)
      document.body.innerHTML = ""
    }
    expect(sizes).toEqual(["3xs", "3xs", "3xs", "3xs", "2xs", "sm", "md", "lg", "xl"])
  })

  test("text with attributes", async () => {
    const props = { className: "tabular-nums", title: "Characters left" }
    const { react, vue } = await renderPair(
      createElement(RInputGroup as unknown as AnyComponent, null, createElement(RInput), createElement(RAddon, null, createElement(RText, props, "280"))),
      () => h(InputGroup, null, () => [h(InputGroupInput), h(InputGroupAddon, null, () => h(InputGroupText as never, vueProps(props), () => "280"))]),
    )
    expect(vue).toBe(react)
  })
})

describe("InputGroup behaviour parity", () => {
  // Mounts one framework, runs `steps`, records the DOM and the focused element
  const runReact = async (element: ReactElement, steps: (snap: () => void) => Promise<void>) => {
    const out: string[] = []
    await act(async () => {
      render(element)
    })
    await steps(() => out.push(`${serializeDom()}\nactive: ${document.activeElement?.tagName}`))
    cleanup()
    return out
  }
  const runVue = async (renderVue: () => VNode, steps: (snap: () => void) => Promise<void>) => {
    const out: string[] = []
    const { unmount } = mountVue(renderVue)
    await flushVue()
    await steps(() => out.push(`${serializeDom()}\nactive: ${document.activeElement?.tagName}`))
    unmount()
    return out
  }
  const mouseDown = async (element: Element) => {
    await interact(() => {
      fireEvent.mouseDown(element)
    })
  }

  test("mousedown on addon text or icons focuses the control; on a button it does not", async () => {
    const steps = async (snap: () => void) => {
      await mouseDown(document.querySelector("[data-slot='input-group-text']")!)
      snap()
      ;(document.activeElement as HTMLElement).blur()
      await mouseDown(document.querySelector("svg")!)
      snap()
      ;(document.activeElement as HTMLElement).blur()
      await mouseDown(document.querySelector("button")!)
      snap()
    }
    const react = await runReact(reactSearch(), steps)
    const vue = await runVue(() => vueSearch(), steps)
    expect(vue).toEqual(react)
    expect(react.map((s) => s.split("active: ")[1])).toEqual(["INPUT", "INPUT", "BODY"])
  })

  test("a caller's mousedown handler runs first and can prevent the focus", async () => {
    const calls: string[] = []
    const onMouseDown = (event: MouseEvent | React.MouseEvent) => {
      calls.push("caller")
      event.preventDefault()
    }
    const steps = async (snap: () => void) => {
      await mouseDown(document.querySelector("[data-slot='input-group-text']")!)
      snap()
    }
    const react = await runReact(reactSearch({ onMouseDown }), steps)
    const vue = await runVue(() => h(InputGroup, { onMousedown: onMouseDown }, () => [
      h(InputGroupInput, { placeholder: "Search..." }),
      h(InputGroupAddon, null, () => h(Search)),
      h(InputGroupAddon, { align: "inline-end" }, () => [
        h(InputGroupText, null, () => "12 results"),
        h(InputGroupButton, { "uniform": true, "aria-label": "Go" }, () => h(Search)),
      ]),
    ]), steps)
    expect(vue).toEqual(react)
    expect(calls).toEqual(["caller", "caller"])
    expect(react[0]).toContain("active: BODY")
  })

  // A wrapper whose root is InputGroup with its own @mousedown, given another
  // @mousedown: Vue merges both into an array on the group
  test("merged mousedown listeners all run, then the frame focuses the control", async () => {
    const calls: string[] = []
    const errors: unknown[] = []
    const onError = (evt: ErrorEvent) => {
      errors.push(evt.error)
      evt.preventDefault()
    }
    const SearchField = defineComponent({
      setup(_props, { slots }) {
        return () => h(InputGroup, { onMousedown: () => calls.push("inner") }, slots)
      },
    })
    window.addEventListener("error", onError)
    try {
      const vue = await runVue(
        () =>
          h(SearchField, { onMousedown: () => calls.push("outer") }, () => [
            h(InputGroupInput, { placeholder: "Search..." }),
            h(InputGroupAddon, null, () => h(InputGroupText, null, () => "USD")),
          ]),
        async (snap) => {
          await mouseDown(document.querySelector("[data-slot='input-group-text']")!)
          snap()
        },
      )
      expect(vue[0]).toContain("active: INPUT")
    } finally {
      window.removeEventListener("error", onError)
    }
    expect(errors).toEqual([])
    expect(calls).toEqual(["inner", "outer"])
  })

  test("typing into a controlled input and a v-model textarea", async () => {
    function ReactApp() {
      const [value, setValue] = useState("72")
      const [text, setText] = useState("")
      return createElement(
        "div",
        null,
        createElement(RInputGroup as unknown as AnyComponent, null, createElement(RInput, { value, onChange: (e: { target: HTMLInputElement }) => setValue(e.target.value) })),
        createElement(RInputGroup as unknown as AnyComponent, null, createElement(RTextarea, { value: text, onChange: (e: { target: HTMLTextAreaElement }) => setText(e.target.value) }), createElement(RAddon, { align: "block-end" }, createElement(RText, null, `${280 - text.length} characters left`))),
      )
    }
    const value = ref("72")
    const text = ref("")
    const steps = async (snap: () => void) => {
      await interact(() => {
        fireEvent.input(document.querySelector("input")!, { target: { value: "80" } })
      })
      await interact(() => {
        fireEvent.input(document.querySelector("textarea")!, { target: { value: "Hello" } })
      })
      snap()
    }
    const react = await runReact(createElement(ReactApp), steps)
    const vue = await runVue(
      () =>
        h("div", null, [
          h(InputGroup, null, () => h(InputGroupInput, { "value": value.value, "onUpdate:value": (v: string) => (value.value = v) })),
          h(InputGroup, null, () => [
            h(InputGroupTextarea, { "value": text.value, "onUpdate:value": (v: string) => (text.value = v) }),
            h(InputGroupAddon, { align: "block-end" }, () => h(InputGroupText, null, () => `${280 - text.value.length} characters left`)),
          ]),
        ]),
      steps,
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain(".value=\"80\"")
    expect(react[0]).toContain("275 characters left")
  })

  test("a unit menu in an addon opens and picks a unit", async () => {
    function ReactApp() {
      const [unit, setUnit] = useState("kg")
      return createElement(
        RInputGroup as unknown as AnyComponent,
        null,
        createElement(RInput, { defaultValue: "72", "aria-label": "Weight" }),
        createElement(
          RAddon,
          { align: "inline-end" },
          createElement(
            RMenu,
            null,
            createElement(RMenu.Trigger, null, createElement(RButton, { "aria-label": "Weight unit" }, unit)),
            createElement(
              RMenu.Content,
              { align: "end" },
              createElement(
                RMenu.RadioGroup,
                { value: unit, onChange: setUnit },
                createElement(RMenu.RadioItem, { value: "kg" }, "Kilograms"),
                createElement(RMenu.RadioItem, { value: "lb" }, "Pounds"),
              ),
            ),
          ),
        ),
      )
    }
    const unit = ref("kg")
    const steps = async (snap: () => void) => {
      snap()
      await interact(() => {
        fireEvent.pointerDown(document.querySelector("button")!, { button: 0, pointerType: "mouse" })
      })
      await interact(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await flushVue()
      const pounds = Array.from(document.querySelectorAll('[role="menuitemradio"]')).find((el) => el.textContent === "Pounds")!
      await interact(() => {
        fireEvent.click(pounds)
      })
      await interact(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await flushVue()
      snap()
    }
    const react = await runReact(createElement(ReactApp), steps)
    const vue = await runVue(
      () =>
        h(InputGroup, null, () => [
          h(InputGroupInput as never, { "defaultValue": "72", "aria-label": "Weight" }),
          h(InputGroupAddon, { align: "inline-end" }, () =>
            h(Menu, null, () => [
              h(MenuTrigger, null, () => h(InputGroupButton, { "aria-label": "Weight unit" }, () => unit.value)),
              h(MenuContent, { align: "end" }, () =>
                h(MenuRadioGroup, { "value": unit.value, "onUpdate:value": (v: string) => (unit.value = v) }, () => [
                  h(MenuRadioItem, { value: "kg" }, () => "Kilograms"),
                  h(MenuRadioItem, { value: "lb" }, () => "Pounds"),
                ]),
              ),
            ]),
          ),
        ]),
      steps,
    )
    const strip = (snapshots: string[]) => snapshots.map((s) => s.replaceAll("--reka-popper-", "--radix-popper-"))
    expect(strip(vue)).toEqual(strip(react))
    expect(react[1]).toContain('"lb"')
  })
})
