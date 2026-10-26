import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { FloatingLabelInput as RFloatingLabelInput } from "../../packages/ui/src/components/FloatingLabelInput"
import { FloatingLabelInput } from "../../packages/vue/src/components/FloatingLabelInput"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair } from "./pair"

type Props = Record<string, unknown>

// React node props become Vue slots; className becomes class; callbacks become listeners
const toVue = (props: Props) => {
  const { className, startAdornment, endAdornment, onClear, onRevealedChange, ...rest } = props
  const slots: Record<string, () => unknown> = {}
  if (startAdornment) slots.startAdornment = () => h("span", { class: "start" }, String(startAdornment))
  if (endAdornment) slots.endAdornment = () => h("span", { class: "end" }, String(endAdornment))
  return {
    props: {
      ...rest,
      ...(className ? { class: className } : {}),
      ...(onClear ? { onClear } : {}),
      ...(onRevealedChange ? { onRevealedChange } : {}),
    },
    slots,
  }
}
const toReact = (props: Props) => {
  const { startAdornment, endAdornment, ...rest } = props
  return {
    ...rest,
    ...(startAdornment ? { startAdornment: <span className="start">{String(startAdornment)}</span> as ReactNode } : {}),
    ...(endAdornment ? { endAdornment: <span className="end">{String(endAdornment)}</span> as ReactNode } : {}),
  }
}

const pair = (props: Props) => {
  const vue = toVue(props)
  return renderPair(createElement(RFloatingLabelInput, toReact(props) as never), () => h(FloatingLabelInput, vue.props as never, vue.slots))
}

const noop = () => {}
const cases: Array<[string, Props]> = [
  ["default", { label: "Email" }],
  ["explicit id, name, class, attributes", { label: "Email", id: "email", name: "email", className: "w-full", placeholder: " ", autoComplete: "email" }],
  ["controlled value", { label: "Email", id: "e", value: "a@b.co", onChange: noop }],
  ["defaultValue", { label: "Email", id: "e", defaultValue: "a@b.co" }],
  ["error message", { label: "Email", id: "e", errorMessage: "Required" }],
  ["description", { label: "Email", id: "e", description: "We never share it" }],
  ["error, description and aria-describedby", { label: "Email", id: "e", errorMessage: "Required", description: "Hint", "aria-describedby": "extra" }],
  ["invalid without message", { label: "Email", invalid: true }],
  ["invalid false with message", { label: "Email", id: "e", invalid: false, errorMessage: "Required" }],
  ["disabled", { label: "Email", disabled: true, defaultValue: "x" }],
  ["readOnly", { label: "Email", readOnly: true, defaultValue: "x" }],
  ["clear button with a value", { label: "Search", defaultValue: "plex", onClear: noop }],
  ["clear button hidden when empty", { label: "Search", onClear: noop }],
  ["clear button hidden when disabled", { label: "Search", defaultValue: "x", onClear: noop, disabled: true }],
  ["password gets a reveal toggle", { label: "Password", type: "password" }],
  ["password with end adornment has none", { label: "Password", type: "password", endAdornment: "kbd" }],
  ["revealable forced on text", { label: "SSN", revealable: true }],
  ["revealable off on password", { label: "Password", type: "password", revealable: false }],
  ["start adornment floats the label", { label: "Amount", startAdornment: "$" }],
  ["multiline", { label: "Comments", id: "c", multiline: true, rows: 4, placeholder: "dropped like React" }],
  ["autofill extensions allowed", { label: "Email", allowAutofillExtensions: true }],
]

describe("FloatingLabelInput parity", () => {
  test.each(cases)("%s", async (_name, props) => {
    const { react, vue } = await pair(props)
    expect(vue).toBe(react)
  })
})

describe("FloatingLabelInput behaviour parity", () => {
  // Runs the same interaction on both, returning snapshots and reported events
  const walk = async (props: Props, steps: (snap: () => void, input: () => HTMLInputElement) => Promise<void>) => {
    const runs: string[][] = []
    for (const framework of ["react", "vue"] as const) {
      const snaps: string[] = []
      if (framework === "react") {
        render(createElement(RFloatingLabelInput, toReact(props) as never))
        await interact(() => {})
      } else {
        const vue = toVue(props)
        mountVue(() => h(FloatingLabelInput, vue.props as never, vue.slots))
        await flushVue()
      }
      await steps(() => snaps.push(serializeDom()), () => document.querySelector("input, textarea") as HTMLInputElement)
      runs.push(snaps)
      if (framework === "react") cleanup()
    }
    return { react: runs[0]!, vue: runs[1]! }
  }

  test("typing, focus and blur", async () => {
    const { react, vue } = await walk({ label: "Email", id: "e" }, async (snap, input) => {
      await interact(() => fireEvent.focus(input()))
      snap()
      await interact(() => fireEvent.input(input(), { target: { value: "a" } }))
      snap()
      await interact(() => fireEvent.input(input(), { target: { value: "" } }))
      snap()
      await interact(() => fireEvent.blur(input()))
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[1]).toContain("data-has-value")
    expect(react[0]).toContain("data-focused")
  })

  test("reveal toggle swaps the type and reports it", async () => {
    const reactRevealed = vi.fn()
    const vueRevealed = vi.fn()
    const clicks = async (snap: () => void) => {
      const toggle = () => document.querySelector('button[aria-label="Show"], button[aria-label="Hide"]') as HTMLButtonElement
      await interact(() => fireEvent.click(toggle()))
      snap()
      await interact(() => fireEvent.click(toggle()))
      snap()
    }
    render(<RFloatingLabelInput label="Password" type="password" onRevealedChange={reactRevealed} />)
    const react: string[] = []
    await clicks(() => react.push(serializeDom()))
    cleanup()
    mountVue(() => h(FloatingLabelInput, { label: "Password", type: "password", onRevealedChange: vueRevealed }))
    await flushVue()
    const vue: string[] = []
    await clicks(() => vue.push(serializeDom()))
    expect(vue).toEqual(react)
    expect(react[0]).toContain('type="text"')
    expect(vueRevealed.mock.calls).toEqual(reactRevealed.mock.calls)
    expect(reactRevealed.mock.calls).toEqual([[true], [false]])
  })

  test("clear button and container mousedown", async () => {
    const reactClear = vi.fn()
    const vueClear = vi.fn()
    for (const [mount, clear] of [
      [() => render(<RFloatingLabelInput label="Search" defaultValue="plex" onClear={reactClear} />), reactClear],
      [() => mountVue(() => h(FloatingLabelInput, { label: "Search", defaultValue: "plex", onClear: vueClear })), vueClear],
    ] as const) {
      mount()
      await act(async () => {})
      await flushVue()
      await interact(() => fireEvent.click(document.querySelector('button[aria-label="Clear input"]')!))
      expect(clear).toHaveBeenCalledTimes(1)
      const footprint = document.querySelector("[data-has-value]")!
      await interact(() => fireEvent.mouseDown(footprint))
      expect(document.activeElement).toBe(document.querySelector("input"))
      cleanup()
      document.body.innerHTML = ""
    }
  })

  test("v-model:value reports typed values", async () => {
    const values: string[] = []
    mountVue(() => h(FloatingLabelInput, { "label": "Name", "onUpdate:value": (v: string) => values.push(v) }))
    await flushVue()
    await interact(() => fireEvent.input(document.querySelector("input")!, { target: { value: "Ada" } }))
    expect(values).toEqual(["Ada"])
  })
})
