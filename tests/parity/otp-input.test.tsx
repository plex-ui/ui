import { cleanup, fireEvent, render } from "@testing-library/react"
import { createElement } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { OTPInput as ROTPInput } from "../../packages/ui/src/components/OTPInput"
import { OTPInput } from "../../packages/vue/src/components/OTPInput"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair } from "./pair"

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
