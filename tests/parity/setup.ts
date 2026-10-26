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

// jsdom has no `CSS` global; Select and TagInput escape values with
// CSS.escape. This is the CSSOM spec algorithm (as in the common polyfill).
const cssEscape = (value: string) => {
  const string = String(value)
  const first = string.charCodeAt(0)
  if (string.length === 1 && first === 0x2d) return `\\${string}`
  let result = ""
  for (let index = 0; index < string.length; index++) {
    const code = string.charCodeAt(index)
    if (code === 0) {
      result += "\uFFFD"
    } else if (
      (code >= 0x01 && code <= 0x1f) ||
      code === 0x7f ||
      (index === 0 && code >= 0x30 && code <= 0x39) ||
      (index === 1 && code >= 0x30 && code <= 0x39 && first === 0x2d)
    ) {
      result += `\\${code.toString(16)} `
    } else if (
      code >= 0x80 ||
      code === 0x2d ||
      code === 0x5f ||
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      result += string.charAt(index)
    } else {
      result += `\\${string.charAt(index)}`
    }
  }
  return result
}

if (typeof globalThis.CSS?.escape !== "function") {
  ;(globalThis as { CSS?: unknown }).CSS = { ...(globalThis.CSS ?? {}), escape: cssEscape }
}
