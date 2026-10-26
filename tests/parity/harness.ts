import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, expect, vi } from "vitest"
import { createApp, nextTick, type VNode } from "vue"

// Shared state for the animation-mode mocks. Each test file mocks both
// packages' getDisableAnimations to read `animation.disabled`, so a case can
// run in jsdom's default (animations off) and in the browser's mode.
export const animation = { disabled: true }

let vueWarnings: string[] = []
let unmountVue: Array<() => void> = []

beforeEach(() => {
  vueWarnings = []
  const warn = console.warn
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(" ")
    if (message.includes("[Vue warn]")) vueWarnings.push(message)
    else warn(...args)
  })
})

afterEach(() => {
  cleanup()
  for (const unmount of unmountVue) unmount()
  unmountVue = []
  document.body.innerHTML = ""
  vi.restoreAllMocks()
  expect(vueWarnings, "Vue warnings").toEqual([])
  animation.disabled = true
})

/** Mounts a Vue render function into a fresh container, like RTL's render. */
export const mountVue = (render: () => VNode) => {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const app = createApp({ render })
  app.mount(container)
  const unmount = () => {
    app.unmount()
    container.remove()
  }
  unmountVue.push(unmount)
  return { container, unmount }
}

/** Lets Vue flush renders, watchers and post-mount teleports. */
export const flushVue = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}
