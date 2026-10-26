import { act, cleanup, render } from "@testing-library/react"
import { createElement, useSyncExternalStore, type ReactElement } from "react"
import { vi } from "vitest"
import { reactive, type VNode } from "vue"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

/** Renders a React element, serializes the body, cleans up. */
export const reactDom = async (element: ReactElement) => {
  await act(async () => {
    render(element)
  })
  const dom = serializeDom()
  cleanup()
  return dom
}

/** Mounts a Vue render function, serializes the body, unmounts. */
export const vueDom = async (renderVue: () => VNode) => {
  const { unmount } = mountVue(renderVue)
  await flushVue()
  const dom = serializeDom()
  unmount()
  return dom
}

/** Both serialized DOMs for one case: `expect(pair.vue).toBe(pair.react)`. */
export const renderPair = async (element: ReactElement, renderVue: () => VNode) => ({
  react: await reactDom(element),
  vue: await vueDom(renderVue),
})

/** Runs a DOM interaction for either framework and lets both settle. */
export const interact = async (run: () => void | Promise<void>) => {
  await act(async () => {
    await run()
  })
  await flushVue()
}

/**
 * Mounts React, runs `steps`, then mounts Vue and runs the same `steps`.
 * `snapshot()` records the serialized DOM; returns both lists.
 */
export const walkPair = async (
  mountReact: () => void,
  mountVueApp: () => VNode,
  steps: (snapshot: () => void) => Promise<void>,
) => {
  const react: string[] = []
  await act(async () => {
    mountReact()
  })
  await steps(() => react.push(serializeDom()))
  cleanup()

  const vue: string[] = []
  mountVue(mountVueApp)
  await flushVue()
  await steps(() => vue.push(serializeDom()))

  return { react, vue }
}

type StateWalkTools<T> = {
  /** Updates the shared state and lets both frameworks settle */
  set: (patch: Partial<T>) => Promise<void>
  /** Advances fake timers (timeouts, intervals, animation frames, Date, performance) */
  advance: (ms: number) => Promise<void>
  /** Records the serialized DOM */
  snapshot: () => void
}

/**
 * Runs the same stateful script against a React and a Vue app that read
 * one shared state, with fake timers. Returns the DOM snapshots of each.
 */
export const walkPairWithState = async <T extends object>(
  initial: T,
  reactApp: (state: T) => ReactElement,
  vueApp: (state: T) => VNode,
  steps: (tools: StateWalkTools<T>) => Promise<void>,
) => {
  let current = { ...initial }
  const listeners = new Set<() => void>()
  const vueState = reactive({ ...initial }) as T

  function ReactApp() {
    const state = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
    )
    return reactApp(state)
  }

  const tools: StateWalkTools<T> = {
    set: async (patch) => {
      await interact(() => {
        current = { ...current, ...patch }
        Object.assign(vueState, patch)
        for (const listener of listeners) listener()
      })
    },
    advance: async (ms) => {
      await interact(() => {
        vi.advanceTimersByTime(ms)
      })
    },
    snapshot: () => {},
  }

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    const react: string[] = []
    await act(async () => {
      render(createElement(ReactApp))
    })
    await steps({ ...tools, snapshot: () => react.push(serializeDom()) })
    cleanup()

    current = { ...initial }
    Object.assign(vueState, initial)
    const vue: string[] = []
    mountVue(() => vueApp(vueState))
    await flushVue()
    await steps({ ...tools, snapshot: () => vue.push(serializeDom()) })

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}
