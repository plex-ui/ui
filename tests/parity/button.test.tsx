import { act, cleanup, fireEvent, render } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { h, reactive, type VNodeArrayChildren } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Button as VueButton } from "../../packages/vue/src/components/Button"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

vi.mock("../../packages/ui/src/components/Transition/getDisableAnimations", async () => {
  const { animation } = await import("./harness")
  return { default: () => animation.disabled }
})
vi.mock("../../packages/vue/src/components/Transition/getDisableAnimations", async () => {
  const { animation } = await import("./harness")
  return { default: () => animation.disabled }
})

type Props = Record<string, unknown>

const COLORS = ["primary", "secondary", "danger", "success", "info", "discovery", "caution", "warning"]
const VARIANTS = ["solid", "soft", "outline", "ghost"]
const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]

// Children are described once and built for each framework
type Child = string | number | { tag: string; props?: Props; children?: Child[] }

const icon: Child = {
  tag: "svg",
  props: { "viewBox": "0 0 20 20", "width": "20", "height": "20", "aria-hidden": "true" },
  children: [{ tag: "path", props: { d: "M0 0h20v20H0z" } }],
}

const toReact = (children: Child[]): ReactNode[] =>
  children.map((child, index) => {
    if (typeof child !== "object") return child
    const { tag, props = {}, children: inner } = child
    const Tag = tag as "span"
    return (
      <Tag key={index} {...props}>
        {inner ? toReact(inner) : undefined}
      </Tag>
    )
  })

const toVue = (children: Child[]): VNodeArrayChildren =>
  children.map((child) => {
    if (typeof child !== "object") return String(child)
    const { tag, props = {}, children: inner } = child
    return h(tag, props, inner ? toVue(inner) : undefined)
  })

// React prop names map to Vue ones: className becomes class
const vueProps = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

const reactDom = (props: Props, children: Child[]) => {
  render(
    <ReactButton color="primary" {...props}>
      {toReact(children)}
    </ReactButton>,
  )
  const dom = serializeDom()
  cleanup()
  return dom
}

const vueDom = async (props: Props, children: Child[]) => {
  const { unmount } = mountVue(() => h(VueButton, vueProps(props), { default: () => toVue(children) }))
  await flushVue()
  const dom = serializeDom()
  unmount()
  return dom
}

const expectParity = async (props: Props, children: Child[] = ["Save"]) => {
  const react = reactDom(props, children)
  const vue = await vueDom(props, children)
  expect(vue).toBe(react)
  return react
}

const cases: Array<[string, Props, Child[]?]> = [
  ...COLORS.flatMap((color) =>
    VARIANTS.map((variant): [string, Props] => [`${color} ${variant}`, { color, variant }]),
  ),
  ...SIZES.map((size): [string, Props] => [`size ${size}`, { size }]),
  ["pill", { pill: true }],
  ["uniform", { uniform: true }, [icon]],
  ["block", { block: true }],
  ["selected", { selected: true }],
  ["disabled", { disabled: true }],
  ["disabled relaxed", { disabled: true, disabledTone: "relaxed" }],
  ["disabledTone without disabled", { disabledTone: "relaxed" }],
  ["disabled false", { disabled: false }],
  ["loading", { loading: true }],
  ["loading false", { loading: false }],
  ["loading but not inert", { loading: true, inert: false }],
  ["inert", { inert: true }],
  ["gutterSize", { gutterSize: "xs" }],
  ["iconSize", { iconSize: "lg" }],
  ["opticallyAlign start", { opticallyAlign: "start" }],
  ["opticallyAlign end", { opticallyAlign: "end" }],
  ["type submit", { type: "submit" }],
  ["className", { className: "custom" }],
  ["extra attributes", { "aria-label": "Save file", "data-testid": "save", "id": "save" }],
  ["icon and text", {}, [icon, "Save"]],
  ["text and icon", {}, ["Save", icon]],
  ["adjacent text merges", {}, ["Save", " ", "draft", 2]],
  ["whitespace sibling", {}, [icon, " "]],
  ["nested element", {}, [{ tag: "span", children: ["Count ", { tag: "b", children: ["3"] }] }, "Save"]],
]

describe.each([
  ["animations off (jsdom default)", true],
  ["animations on (browser)", false],
])("Button parity, %s", (_mode, disabled) => {
  test.each(cases)("%s", async (_name, props, children) => {
    animation.disabled = disabled
    await expectParity(props, children)
  })
})

describe("Button behaviour parity", () => {
  test("click reaches the handler", async () => {
    const onReactClick = vi.fn()
    render(<ReactButton color="primary" onClick={onReactClick}>Save</ReactButton>)
    fireEvent.click(document.querySelector("button")!)

    const onVueClick = vi.fn()
    mountVue(() => h(VueButton, { onClick: onVueClick }, { default: () => "Save" }))
    fireEvent.click(document.querySelectorAll("button")[1]!)

    expect(onReactClick).toHaveBeenCalledTimes(1)
    expect(onVueClick).toHaveBeenCalledTimes(1)
    expect(onVueClick.mock.calls[0]![0]).toBeInstanceOf(MouseEvent)
  })

  test("disabled swallows clicks", () => {
    const onReactClick = vi.fn()
    render(<ReactButton color="primary" disabled onClick={onReactClick}>Save</ReactButton>)
    const onVueClick = vi.fn()
    mountVue(() => h(VueButton, { disabled: true, onClick: onVueClick }, { default: () => "Save" }))

    for (const button of document.querySelectorAll("button")) {
      // Bypass the disabled attribute to prove the handler itself guards
      button.removeAttribute("disabled")
      fireEvent.click(button)
    }

    expect(onReactClick).not.toHaveBeenCalled()
    expect(onVueClick).not.toHaveBeenCalled()
  })

  test("pointer enter sets --scale", () => {
    render(<ReactButton color="primary">Save</ReactButton>)
    mountVue(() => h(VueButton, null, { default: () => "Save" }))
    const [react, vue] = document.querySelectorAll("button")
    for (const button of [react!, vue!]) fireEvent.pointerEnter(button)
    expect(vue!.style.getPropertyValue("--scale")).toBe(react!.style.getPropertyValue("--scale"))
    expect(react!.style.getPropertyValue("--scale")).not.toBe("")
  })

  test("toggling loading walks the same transition states", async () => {
    animation.disabled = false
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] })
    try {
      const steps = async (setLoading: (loading: boolean) => Promise<void>) => {
        const snapshots: string[] = []
        const advance = async (ms: number) => {
          await act(async () => {
            vi.advanceTimersByTime(ms)
          })
          await flushVue()
          snapshots.push(serializeDom())
        }
        await setLoading(true)
        snapshots.push(serializeDom())
        await advance(16) // first frame
        await advance(16) // second frame: entering-active
        await advance(250) // enter done
        await setLoading(false)
        snapshots.push(serializeDom())
        await advance(32) // exiting-active
        await advance(150) // removed
        return snapshots
      }

      const { rerender } = render(<ReactButton color="primary">Save</ReactButton>)
      const react = await steps(async (loading) => {
        await act(async () => {
          rerender(<ReactButton color="primary" loading={loading}>Save</ReactButton>)
        })
      })
      cleanup()

      const state = reactive<{ loading?: boolean }>({})
      mountVue(() => h(VueButton, { loading: state.loading }, { default: () => "Save" }))
      await flushVue()
      const vue = await steps(async (loading) => {
        state.loading = loading
        await flushVue()
      })

      expect(vue).toEqual(react)
      // The walk really passed through the transition states
      expect(react.join("\n")).toContain("data-entering-active")
      expect(react.join("\n")).toContain("data-exiting-active")
    } finally {
      vi.useRealTimers()
    }
  })
})
