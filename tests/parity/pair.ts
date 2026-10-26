import { act, cleanup, render } from "@testing-library/react"
import type { ReactElement } from "react"
import type { VNode } from "vue"
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
