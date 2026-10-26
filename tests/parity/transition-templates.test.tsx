import { compile } from "@vue/compiler-dom"
import { createElement, Fragment, type ReactNode } from "react"
import { describe, expect, test } from "vitest"
import * as Vue from "vue"
import { defineComponent, h, type Component } from "vue"
import * as R from "../../packages/ui/src/components/Transition"
import * as V from "../../packages/vue/src/components/Transition"
import { animation } from "./harness"
import { walkPairWithState } from "./pair"

// Transition groups fed by real compiled templates (v-for, v-if), the way the
// docs previews and apps use them, compared with React list rendering

const compiled = (template: string, components: Record<string, Component>) => {
  const { code } = compile(template, { hoistStatic: true })
  const render = new Function("Vue", code)(Vue) as Vue.RenderFunction & { _rc?: boolean }
  render._rc = true
  return defineComponent({ components, props: ["keys"], render })
}

const reactItems = (keys: string[]): ReactNode[] => keys.map((key) => <div key={key} className="py-2">{key}</div>)

describe("Transition groups with compiled v-for children", () => {
  test.each(["AnimateLayoutGroup", "TransitionGroup", "Animate"] as const)("%s removes and adds items", async (name) => {
    for (const disabled of [true, false]) {
      animation.disabled = disabled
      const tag = name === "TransitionGroup" ? "PlexTransitionGroup" : name
      // Only TransitionGroup takes explicit durations; the others use their defaults
      const durations = name === "TransitionGroup" ? ' :exit-duration="300" :enter-duration="300"' : ""
      const VueList = compiled(
        `<${tag}${durations}><div v-for="key in keys" :key="key" class="py-2">{{ key }}</div></${tag}>`,
        { [tag]: V[name] },
      )
      const { react, vue } = await walkPairWithState(
        { keys: ["a", "b"] },
        (state) =>
          createElement(R[name] as never, name === "TransitionGroup" ? { exitDuration: 300, enterDuration: 300 } : {}, reactItems(state.keys)),
        (state) => h(VueList, { keys: state.keys }),
        async ({ set, advance, snapshot }) => {
          snapshot()
          await set({ keys: ["a"] })
          await advance(16)
          snapshot()
          await advance(1000)
          snapshot()
          await set({ keys: ["a", "c"] })
          await advance(1000)
          snapshot()
        },
      )
      expect(vue).toEqual(react)
      expect(react[2]).not.toContain('"b"')
    }
  })

  test.each(["AnimateLayoutGroup", "TransitionGroup", "SlotTransitionGroup", "Animate"] as const)(
    "%s keeps a keyed multi-root <template v-for> item together, like <Fragment key>",
    async (name) => {
      animation.disabled = true
      const tag = name === "TransitionGroup" ? "PlexTransitionGroup" : name
      const VueList = compiled(
        `<${tag}><template v-for="key in keys" :key="key"><dt>{{ key }}</dt><dd>{{ key }}</dd></template></${tag}>`,
        { [tag]: V[name] },
      )
      const reactPairs = (keys: string[]) =>
        keys.map((key) => createElement(Fragment, { key }, createElement("dt", null, key), createElement("dd", null, key)))
      const { react, vue } = await walkPairWithState(
        { keys: ["a", "b"] },
        (state) => createElement(R[name] as never, {}, reactPairs(state.keys)),
        (state) => h(VueList, { keys: state.keys }),
        async ({ set, snapshot }) => {
          snapshot()
          await set({ keys: ["b", "c"] })
          snapshot()
        },
      )
      expect(vue).toEqual(react)
      expect(react[1]).toContain("<dt>")
      expect(react[1]).not.toContain('"a"')
    },
  )
})
