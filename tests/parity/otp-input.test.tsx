import { cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useState } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { OTPInput as ROTPInput } from "../../packages/ui/src/components/OTPInput"
import { OTPInput } from "../../packages/vue/src/components/OTPInput"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

afterEach(() => vi.useRealTimers())

const toVue = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

const cases: Array<[string, Props]> = [
  ["default", {}],
  ["length 4 with class", { length: 4, className: "otp" }],
  ["fractional length is floored", { length: 4.7 }],
  ["grouping", { grouping: [3, 3] }],
  ["invalid", { invalid: true }],
  ["error message", { errorMessage: "Wrong code" }],
  ["disabled", { disabled: true, value: "12" }],
  ["controlled value sanitized", { value: "1a2-3" }],
]

describe("OTPInput parity", () => {
  test.each(cases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(createElement(ROTPInput, props as never), () => h(OTPInput, toVue(props) as never))
    expect(vue).toBe(react)
  })
})

describe("OTPInput behaviour parity", () => {
  const walk = async (props: Props, steps: (snap: () => void, cell: (i: number) => HTMLInputElement) => Promise<void>) => {
    const result = { react: [] as string[], vue: [] as string[], reactEvents: [] as string[], vueEvents: [] as string[] }
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] })
    const cell = (i: number) => document.querySelectorAll("input")[i] as HTMLInputElement
    const values = () => Array.from(document.querySelectorAll("input")).map((i) => i.value).join("|")
    render(createElement(ROTPInput, {
      ...props,
      onChange: (v: string) => result.reactEvents.push(`change:${v}`),
      onComplete: (v: string) => result.reactEvents.push(`complete:${v}`),
    } as never))
    await interact(() => {})
    await steps(() => result.react.push(`${serializeDom()}\n${values()}\nactive=${Array.from(document.querySelectorAll("input")).indexOf(document.activeElement as HTMLInputElement)}`), cell)
    cleanup()
    mountVue(() => h(OTPInput, {
      ...toVue(props),
      onChange: (v: string) => result.vueEvents.push(`change:${v}`),
      onComplete: (v: string) => result.vueEvents.push(`complete:${v}`),
    } as never))
    await flushVue()
    await steps(() => result.vue.push(`${serializeDom()}\n${values()}\nactive=${Array.from(document.querySelectorAll("input")).indexOf(document.activeElement as HTMLInputElement)}`), cell)
    return result
  }
  const type = (input: HTMLInputElement, value: string) => interact(() => fireEvent.input(input, { target: { value } }))
  const key = (input: HTMLInputElement, k: string) => interact(() => fireEvent.keyDown(input, { key: k }))

  test("typing moves focus, editing keys clear digits, completion fires", async () => {
    const result = await walk({ length: 4 }, async (snap, cell) => {
      await interact(() => fireEvent.click(cell(0).parentElement!))
      await interact(() => fireEvent.focus(cell(0)))
      for (const [i, d] of [[0, "1"], [1, "2"], [2, "3"]] as const) {
        await type(cell(i), d)
        await interact(() => fireEvent.focus(document.activeElement!))
        snap()
      }
      await type(cell(3), "4")
      snap()
      await key(cell(3), "Backspace")
      snap()
      await key(cell(3), "Backspace")
      snap()
      await key(cell(2), "ArrowLeft")
      await key(cell(1), "Delete")
      snap()
      await key(cell(1), "ArrowRight")
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueEvents).toEqual(result.reactEvents)
    expect(result.reactEvents).toContain("complete:1234")
  })

  test("paste and multi-digit input fill from the cell", async () => {
    const result = await walk({}, async (snap, cell) => {
      await interact(() => {
        const event = new Event("paste", { bubbles: true, cancelable: true })
        Object.assign(event, { clipboardData: { getData: () => "12 34" } })
        cell(1).dispatchEvent(event)
      })
      snap()
      await type(cell(4), "987")
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueEvents).toEqual(result.reactEvents)
  })

  test("controlled value the parent does not update keeps the cells", async () => {
    const result = await walk({ value: "12" }, async (snap, cell) => {
      await type(cell(5), "7") // last cell: no focus move, nothing re-renders
      snap()
      await type(cell(2), "9")
      snap()
      await key(cell(1), "Backspace")
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueEvents).toEqual(result.reactEvents)
    expect(result.react[0]).toContain("1|2||||")
    expect(result.react[1]).toContain("1|2||||")
  })

  test("autoFocus focuses the first cell on mount and whenever autoFocus or disabled change", async () => {
    const active = () => Array.from(document.querySelectorAll("input")).indexOf(document.activeElement as HTMLInputElement)
    const log: number[] = []
    const { react, vue } = await walkPairWithState(
      { autoFocus: true, disabled: true },
      (state) => createElement(ROTPInput, { autoFocus: state.autoFocus, disabled: state.disabled }),
      (state) => h(OTPInput, { autoFocus: state.autoFocus, disabled: state.disabled }),
      async ({ set, advance, snapshot }) => {
        log.push(active())
        await set({ disabled: false })
        log.push(active())
        snapshot()
        await interact(() => (document.activeElement as HTMLElement).blur())
        await advance(16)
        await set({ autoFocus: false })
        log.push(active())
        await set({ autoFocus: true })
        log.push(active())
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(log).toEqual([-1, 0, -1, 0, -1, 0, -1, 0])
  })

  test("a digit stays in the cell it was typed in; clearing a cell does not move the others", async () => {
    const result = await walk({}, async (snap, cell) => {
      await interact(() => fireEvent.click(cell(3).parentElement!))
      await type(cell(3), "5")
      snap() // ___5__, focus on the 5th cell
      for (const [i, d] of [[0, "1"], [1, "2"], [2, "3"], [4, "6"], [5, "7"]] as const) await type(cell(i), d)
      snap()
      await key(cell(2), "Backspace")
      snap() // 12_567
      await type(cell(2), "9")
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueEvents).toEqual(result.reactEvents)
    const values = result.react.map((snapshot) => snapshot.split("\n").at(-2))
    expect(values).toEqual(["|||5||", "1|2|3|5|6|7", "1|2||5|6|7", "1|2|9|5|6|7"])
    expect(result.react[0]).toContain("active=4")
    expect(result.reactEvents).toEqual([
      "change:5", "change:15", "change:125", "change:1235", "change:12356", "change:123567", "complete:123567",
      "change:12567", "change:129567", "complete:129567",
    ])
  })

  test("controlled: a parent taking each value keeps the gaps; another value fills from the start", async () => {
    let setOutside = (_value: string) => {}
    function ReactApp() {
      const [value, setValue] = useState("")
      setOutside = setValue
      return createElement(ROTPInput, { value, onChange: setValue })
    }
    const VueApp = defineComponent({
      setup() {
        const value = ref("")
        setOutside = (next) => (value.value = next)
        return () => h(OTPInput, { "value": value.value, "onUpdate:value": (next: string) => (value.value = next) })
      },
    })
    const runs: string[][] = []
    for (const framework of ["react", "vue"] as const) {
      const values = () => Array.from(document.querySelectorAll("input")).map((i) => i.value).join("|")
      const seen: string[] = []
      if (framework === "react") {
        render(createElement(ReactApp))
        await interact(() => {})
      } else {
        mountVue(() => h(VueApp))
        await flushVue()
      }
      const cell = (i: number) => document.querySelectorAll("input")[i] as HTMLInputElement
      await type(cell(2), "4")
      seen.push(values())
      await key(cell(2), "Backspace")
      await type(cell(4), "8")
      seen.push(values())
      await interact(() => setOutside("31"))
      await flushVue()
      seen.push(values())
      runs.push(seen)
      if (framework === "react") cleanup()
    }
    expect(runs[1]).toEqual(runs[0])
    expect(runs[0]).toEqual(["||4|||", "||||8|", "3|1||||"])
  })

  test("blur clears focus after a frame", async () => {
    const result = await walk({}, async (snap, cell) => {
      await interact(() => fireEvent.focus(cell(2)))
      snap()
      await interact(() => fireEvent.blur(cell(2)))
      await interact(() => vi.advanceTimersByTime(16))
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toBe(result.react[1])
  })
})
