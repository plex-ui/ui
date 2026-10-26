import { createElement, type ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { createSSRApp, defineComponent, Fragment, h, type VNode } from "vue"
import { renderToString } from "vue/server-renderer"
import { PlexUIProvider as RProvider } from "../../packages/ui/src/components/PlexUIProvider"
import { TextLink as RTextLink } from "../../packages/ui/src/components/TextLink"
import * as R from "../../packages/ui/src/components/Transition"
import { PlexUIProvider } from "../../packages/vue/src/components/PlexUIProvider"
import { TextLink } from "../../packages/vue/src/components/TextLink"
import * as V from "../../packages/vue/src/components/Transition"
import { useEscCloseStack } from "../../packages/vue/src/composables/useEscCloseStack"
import { useSimulatedProgress } from "../../packages/vue/src/composables/useSimulatedProgress"
import { useTextSelection } from "../../packages/vue/src/composables/useTextSelection"
import { animation } from "./harness"
import { renderPair, walkPairWithState } from "./pair"

// Regression tests for the Codex review of Phase 3

const reactItems = (keys: string[]): ReactNode[] => keys.map((key) => <span key={key}>{key}</span>)
// What `v-for` compiles to: one fragment holding the keyed children
const vueFor = (keys: string[]): VNode[] => [h(Fragment, null, keys.map((key) => h("span", { key }, key)))]

describe("Review fixes (Phase 3)", () => {
  test.each(["TransitionGroup", "SlotTransitionGroup", "Animate", "AnimateLayout", "AnimateLayoutGroup"] as const)(
    "%s accepts v-for children",
    async (name) => {
      for (const disabled of [true, false]) {
        animation.disabled = disabled
        const { react, vue } = await renderPair(
          createElement(R[name] as never, {}, reactItems(["a", "b"])),
          () => h(V[name], null, { default: () => vueFor(["a", "b"]) }),
        )
        expect(vue).toBe(react)
      }
    },
  )

  test("TransitionGroup restarts a pending mount delay when it changes", async () => {
    animation.disabled = false
    const { react, vue } = await walkPairWithState(
      { keys: ["a"], delay: 1000 },
      (state) => createElement(R.TransitionGroup, { enterMountDelay: state.delay, preventInitialTransition: false }, reactItems(state.keys)),
      (state) => h(V.TransitionGroup, { enterMountDelay: state.delay, preventInitialTransition: false }, { default: () => vueFor(state.keys) }),
      async ({ set, advance, snapshot }) => {
        snapshot()
        await advance(100)
        await set({ delay: 0 })
        await advance(1)
        snapshot()
        await set({ keys: ["a", "b"], delay: 500 })
        await advance(100)
        snapshot()
        await advance(500)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).not.toContain('"a"')
    expect(react[1]).toContain('"a"')
  })

  test("SlotTransitionGroup calls back with a slotted svg", async () => {
    animation.disabled = false
    const log: string[][] = [[], []]
    let run = 0
    await walkPairWithState(
      { keys: ["a"] },
      (state) =>
        createElement(
          R.SlotTransitionGroup,
          { preventInitialTransition: false, enterDuration: 10, onEnter: (el: Element) => log[0]!.push(`enter:${el.tagName}`) },
          state.keys.map((key) => <svg key={key} />),
        ),
      (state) => {
        run = 1
        return h(
          V.SlotTransitionGroup,
          { preventInitialTransition: false, enterDuration: 10, onEnter: (el: Element) => log[run]!.push(`enter:${el.tagName}`) },
          { default: () => state.keys.map((key) => h("svg", { key })) },
        )
      },
      async ({ advance }) => {
        await advance(50)
      },
    )
    expect(log[1]).toEqual(log[0])
    expect(log[0]).toEqual(["enter:svg"])
  })

  test("links follow a provider whose link component changes", async () => {
    const ReactRouterLink = ({ to, children }: { to?: string; children?: ReactNode }) => <a data-router="" href={to}>{children}</a>
    // Like the React stand-in, it ignores every other prop
    const VueRouterLink = defineComponent({ inheritAttrs: false, props: { to: String }, setup: (props, { slots }) => () => h("a", { "data-router": "", "href": props.to }, slots.default?.()) })
    const { react, vue } = await walkPairWithState(
      { router: false },
      (state) => <RProvider linkComponent={state.router ? ReactRouterLink : "a"}><RTextLink to="/docs">Docs</RTextLink></RProvider>,
      (state) => h(PlexUIProvider, { linkComponent: state.router ? VueRouterLink : "a" }, { default: () => h(TextLink, { to: "/docs" }, { default: () => "Docs" }) }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ router: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain("data-router")
  })

  test("composables start nothing during server rendering", async () => {
    const setInterval = vi.spyOn(globalThis, "setInterval")
    const escape = vi.fn()
    const selection = vi.fn()
    const Probe = defineComponent({
      setup() {
        const progress = useSimulatedProgress(Date.now(), 1000)
        useEscCloseStack(true, escape)
        useTextSelection(true, selection)
        return () => h("span", progress.value.toFixed(0))
      },
    })
    await renderToString(createSSRApp(Probe))
    expect(setInterval).not.toHaveBeenCalled()
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(escape).not.toHaveBeenCalled()
    expect(selection).not.toHaveBeenCalled()
  })
})
