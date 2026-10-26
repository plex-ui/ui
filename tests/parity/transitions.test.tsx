import { describe, expect, test } from "vitest"
import { createElement, type ReactNode } from "react"
import { h, type VNode } from "vue"
import * as R from "../../packages/ui/src/components/Transition"
import * as V from "../../packages/vue/src/components/Transition"
import { animation } from "./harness"
import { renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

// React prop names map to Vue ones: className becomes class
const vueProps = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

const reactItems = (keys: string[]): ReactNode[] => keys.map((key) => <span key={key} className="item">{key}</span>)
const vueItems = (keys: string[]): VNode[] => keys.map((key) => h("span", { key, class: "item" }, key))

const animateCases: Array<[string, Props]> = [
  ["defaults", {}],
  ["enter, exit, initial", { enter: { opacity: 1, y: 4, duration: 200, delay: 50 }, exit: { scale: 0.9, rotate: 10 }, initial: { blur: 4, x: -2 } }],
  ["timing functions", { enter: { timingFunction: "linear" }, exit: { timingFunction: "ease-in", skewX: "2deg" } }],
  ["forceCompositeLayer, static, div", { forceCompositeLayer: true, transitionPosition: "static", as: "div" }],
  ["classes", { className: "outer", transitionClassName: "inner" }],
]

const layoutCases: Array<[string, Props]> = [
  ["defaults", {}],
  ["hideOverflow, end anchor, width", { hideOverflow: true, itemAnchor: "end", dimension: "width" }],
  ["layout timings", { layoutEnter: { duration: 100, delay: 20, timingFunction: "linear" }, layoutExit: { duration: 50 }, layoutMove: { delay: 10 } }],
  ["enter and exit", { enter: { y: 8, duration: 250 }, exit: { opacity: 0.5, delay: 30 } }],
  ["classes", { className: "outer", transitionClassName: "inner", as: "div" }],
]

describe.each([
  ["animations off (jsdom default)", true],
  ["animations on (browser)", false],
])("Transition parity, %s", (_mode, disabled) => {
  test.each(animateCases)("Animate: %s", async (_name, props) => {
    animation.disabled = disabled
    const { react, vue } = await renderPair(
      createElement(R.Animate, props, reactItems(["a"])),
      () => h(V.Animate, vueProps(props), { default: () => vueItems(["a"]) }),
    )
    expect(vue).toBe(react)
  })

  test.each(layoutCases)("AnimateLayout: %s", async (_name, props) => {
    animation.disabled = disabled
    const { react, vue } = await renderPair(
      createElement(R.AnimateLayout, props, reactItems(["a"])),
      () => h(V.AnimateLayout, vueProps(props), { default: () => vueItems(["a"]) }),
    )
    expect(vue).toBe(react)
  })

  test.each(layoutCases)("AnimateLayoutGroup: %s", async (_name, props) => {
    animation.disabled = disabled
    const { react, vue } = await renderPair(
      createElement(R.AnimateLayoutGroup, props, reactItems(["a", "b"])),
      () => h(V.AnimateLayoutGroup, vueProps(props), { default: () => vueItems(["a", "b"]) }),
    )
    expect(vue).toBe(react)
  })

  test("AnimateLayoutGroup: unkeyed children", async () => {
    animation.disabled = disabled
    const { react, vue } = await renderPair(
      <R.AnimateLayoutGroup>
        <b>one</b>
        <b>two</b>
      </R.AnimateLayoutGroup>,
      () => h(V.AnimateLayoutGroup, null, { default: () => [h("b", "one"), h("b", "two")] }),
    )
    expect(vue).toBe(react)
  })

  test("SlotTransitionGroup", async () => {
    animation.disabled = disabled
    const { react, vue } = await renderPair(
      createElement(R.SlotTransitionGroup, {}, reactItems(["a", "b"])),
      () => h(V.SlotTransitionGroup, null, { default: () => vueItems(["a", "b"]) }),
    )
    expect(vue).toBe(react)
  })

  test("TransitionGroup with id, tag and style", async () => {
    animation.disabled = disabled
    const { react, vue } = await renderPair(
      createElement(R.TransitionGroup, { transitionId: "list", as: "div", className: "row", style: { color: "red" } }, reactItems(["a"])),
      () => h(V.TransitionGroup, { transitionId: "list", as: "div", class: "row", style: { color: "red" } }, { default: () => vueItems(["a"]) }),
    )
    expect(vue).toBe(react)
  })
})

describe("Transition behaviour parity (animations on, fake timers)", () => {
  // Shows the given keys, then swaps, removes and re-adds them while time passes
  const script = async ({ set, advance, snapshot }: { set: (p: { keys: string[] }) => Promise<void>; advance: (ms: number) => Promise<void>; snapshot: () => void }) => {
    snapshot()
    await set({ keys: ["a", "b"] })
    snapshot()
    await advance(16)
    await advance(16)
    snapshot()
    await advance(1000)
    snapshot()
    await set({ keys: ["b"] })
    snapshot()
    await advance(32)
    snapshot()
    await set({ keys: ["b", "a"] }) // re-added mid-exit: interrupted
    snapshot()
    await advance(1000)
    snapshot()
    await set({ keys: [] })
    await advance(32)
    snapshot()
    await advance(1000)
    snapshot()
  }

  const components = ["Animate", "AnimateLayout", "AnimateLayoutGroup", "SlotTransitionGroup", "TransitionGroup"] as const

  test.each(components)("%s walks through the same states", async (name) => {
    animation.disabled = false
    const ReactComponent = R[name] as never
    const VueComponent = V[name]
    const props = name === "TransitionGroup" || name === "SlotTransitionGroup" ? { enterDuration: 200, exitDuration: 100 } : {}
    const { react, vue } = await walkPairWithState(
      { keys: ["a"] as string[] },
      (state) => createElement(ReactComponent, props, reactItems(state.keys)),
      (state) => h(VueComponent, props, { default: () => vueItems(state.keys) }),
      script,
    )
    expect(vue).toEqual(react)
    expect(react.join("\n")).toContain("data-exiting-active")
    expect(react.join("\n")).toContain("data-entering-active")
  })

  test("TransitionGroup calls the lifecycle callbacks in the same order", async () => {
    animation.disabled = false
    const log: string[][] = [[], []]
    let run = 0
    const callbacks = (target: () => string[]) =>
      Object.fromEntries(
        ["onEnter", "onEnterActive", "onEnterComplete", "onExit", "onExitActive", "onExitComplete"].map((name) => [
          name,
          (el: HTMLElement) => target().push(`${name}:${el.textContent}`),
        ]),
      )
    const { react, vue } = await walkPairWithState(
      { keys: ["a"] as string[] },
      (state) => createElement(R.TransitionGroup, { enterDuration: 50, exitDuration: 50, ...callbacks(() => log[0]!) }, reactItems(state.keys)),
      (state) => {
        run = 1
        return h(V.TransitionGroup, { enterDuration: 50, exitDuration: 50, ...callbacks(() => log[run]!) }, { default: () => vueItems(state.keys) })
      },
      script,
    )
    expect(vue).toEqual(react)
    expect(log[1]).toEqual(log[0])
    expect(log[0]).toContain("onExitComplete:a")
  })

  test("TransitionGroup enterMountDelay and prepend", async () => {
    animation.disabled = false
    const props = { enterDuration: 50, exitDuration: 50, enterMountDelay: 120, insertMethod: "prepend" }
    const { react, vue } = await walkPairWithState(
      { keys: ["a"] as string[] },
      (state) => createElement(R.TransitionGroup, props, reactItems(state.keys)),
      (state) => h(V.TransitionGroup, props, { default: () => vueItems(state.keys) }),
      async ({ set, advance, snapshot }) => {
        await set({ keys: ["a", "b"] })
        snapshot()
        await advance(100)
        snapshot()
        await advance(40)
        snapshot()
        await advance(200)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).not.toContain(">\n    \"b\"")
  })
})
