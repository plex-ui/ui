import { onBeforeUnmount, onMounted, ref, type Ref } from "vue"
import { isDev } from "../lib/constants.js"

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"

export const cache = new Map<string, number>()
let rootStyles: CSSStyleDeclaration | null = null

// Fallbacks mirror defaults from postcss.config.mjs
const FALLBACK_BREAKPOINTS: Record<Breakpoint, number> = {
  "xs": 380,
  "sm": 576,
  "md": 768,
  "lg": 1024,
  "xl": 1280,
  "2xl": 1536,
} as const

const resolveBreakpoint = (bp: Breakpoint): number => {
  if (!cache.has(bp)) {
    rootStyles ||= getComputedStyle(document.documentElement)

    const value = parseInt(
      rootStyles.getPropertyValue(`--breakpoint-${bp}`).trim().replace("px", ""),
      10,
    )

    if (!value) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn(
          `--breakpoint-${bp} is not defined in :root. Falling back to default breakpoint map.\n` +
            "This usually means your postcss breakpoints and Breakpoint types are out of sync.",
        )
      }

      // If the breakpoint is not in the fallback map, use the default "lg" breakpoint.
      const validBp = bp in FALLBACK_BREAKPOINTS ? bp : "lg"
      // Return early and don't cache fallbacks in case CSS variables load later
      return FALLBACK_BREAKPOINTS[validBp]
    }

    cache.set(bp, value)
  }

  return cache.get(bp)!
}

/**
 * True while the viewport is at least as wide as `bp` (from `--breakpoint-*`).
 * It starts `false` on the server and the client alike (so hydration matches)
 * and reads the media query on mount, like React's hook.
 */
export const useBreakpoint = (bp: Breakpoint): Ref<boolean> => {
  const query = () => `(min-width: ${resolveBreakpoint(bp)}px)`
  const matches = ref(false)
  let mediaQueryList: MediaQueryList | undefined

  const update = () => {
    matches.value = !!mediaQueryList?.matches
  }

  onMounted(() => {
    mediaQueryList = window.matchMedia(query())
    update()
    mediaQueryList.addEventListener("change", update)
  })
  onBeforeUnmount(() => mediaQueryList?.removeEventListener("change", update))

  return matches
}
