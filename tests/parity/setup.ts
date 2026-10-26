import { vi } from "vitest"

// Every parity test file gets both packages' animation switch, driven by
// `animation.disabled` from the harness: jsdom's default (animations off)
// unless a test flips it to compare the browser path.
vi.mock("../../packages/ui/src/components/Transition/getDisableAnimations", async () => {
  const { animation } = await import("./harness")
  return { default: () => animation.disabled }
})
vi.mock("../../packages/vue/src/components/Transition/getDisableAnimations", async () => {
  const { animation } = await import("./harness")
  return { default: () => animation.disabled }
})
