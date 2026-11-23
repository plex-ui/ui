import { useLayoutEffect, useRef, useState } from "react"
import { I18nManager, Platform } from "react-native"

type DomElement = { nodeType?: number }
type DomGlobals = {
  getComputedStyle?: (element: unknown) => { direction?: string }
  document?: { documentElement?: { dir?: string } }
}

/**
 * Whether a row runs right to left there. A phone asks I18nManager (it holds until the app reloads). React Native
 * Web's I18nManager always says left to right while its rows and `start` / `end` follow the CSS direction, so the web
 * asks the element (an event's `currentTarget`, a ref), else the document.
 */
export function isRTL(node?: unknown): boolean {
  if (Platform.OS !== "web") return I18nManager.isRTL === true
  const dom = globalThis as unknown as DomGlobals
  const element = node as DomElement | null | undefined
  if (element && element.nodeType === 1 && typeof dom.getComputedStyle === "function") return dom.getComputedStyle(element).direction === "rtl"
  return dom.document?.documentElement?.dir === "rtl"
}

/** The arrow key that moves to the next item of a row: the right arrow, the left one in a right-to-left row. */
export const nextKey = (rtl: boolean) => (rtl ? "ArrowLeft" : "ArrowRight")
export const previousKey = (rtl: boolean) => (rtl ? "ArrowRight" : "ArrowLeft")

/**
 * Whether a part runs right to left, for what draws a direction (a chevron, a back arrow): give `ref` to a view of
 * the part. A phone knows it at once; the web reads the view's CSS direction once it is mounted.
 */
export function useRTL<T = unknown>() {
  const ref = useRef<T>(null)
  const [rtl, setRTL] = useState(() => isRTL())
  useLayoutEffect(() => {
    const next = isRTL(ref.current)
    setRTL((current) => (current === next ? current : next))
  }, [])
  return { ref, rtl }
}

/** The transform that mirrors a glyph of a direction in a right-to-left row. */
export const mirrored = (rtl: boolean) => (rtl ? { transform: [{ scaleX: -1 as const }] } : null)

/**
 * Padding on the screen's own left and right (a landscape phone's safe area): a phone in a right-to-left layout
 * turns `paddingLeft` over to the right, so the sides are given to it the other way round; the web keeps them.
 */
export function physicalPadding(left: number, right: number) {
  const swapped = Platform.OS !== "web" && I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL
  return swapped ? { paddingLeft: right, paddingRight: left } : { paddingLeft: left, paddingRight: right }
}
