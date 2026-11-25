import type { StyleProp, ViewStyle } from "react-native"
import { View } from "react-native"

type CssSlideProps = {
  /** The offset from the side, in points. */
  x: number
  width: number
  /** `left` keeps the screen's left; `start` follows the row's direction (the right in a right-to-left row). */
  side: "left" | "start"
  duration: number
  /** A CSS timing function: `cubic-bezier(…)`. */
  easing: string
  /** No slide: the fill moves at once (reduced motion). */
  still?: boolean
  style?: StyleProp<ViewStyle>
}

// A fill at the start of a right-to-left row moves the other way: the CSS direction turns the sign of its offset, so
// a row whose direction changes moves it over at once, as it moves `start`
const RULE = "[data-plex-slide=start]:dir(rtl){--plex-slide-sign:-1}"
let ruled = false
function addRule() {
  if (ruled) return
  const dom = globalThis as unknown as { document?: { createElement: (tag: string) => { textContent: string }; head?: { appendChild: (node: unknown) => void } } }
  const sheet = dom.document?.createElement("style")
  if (sheet == null || dom.document?.head == null) return
  ruled = true
  sheet.textContent = RULE
  dom.document.head.appendChild(sheet)
}

/**
 * The web's sliding fill (a segmented control's thumb, a tab bar's pill): its place a `translateX` and its width a CSS
 * transition, so the browser runs the slide itself. A slide driven from JavaScript stops for a frame as long as the
 * page's work in it (a screen mounting under the tab it slides to) and then jumps; the compositor keeps the move going.
 * A fill that mounts stands at its place, since a transition starts from a style the browser has already drawn.
 */
export function CssSlide({ x, width, side, duration, easing, still = false, style }: CssSlideProps) {
  if (side === "start") addRule()
  const time = still ? "0ms" : `${duration}ms`
  const motion = {
    transform: side === "start" ? `translateX(calc(var(--plex-slide-sign, 1) * ${x}px))` : `translateX(${x}px)`,
    transitionProperty: "transform, width",
    transitionDuration: `${time}, ${time}`,
    transitionTimingFunction: `${easing}, ${easing}`,
  } as unknown as ViewStyle
  return (
    <View
      {...({ dataSet: { plexSlide: side } } as object)}
      pointerEvents="none"
      style={[style, side === "left" ? { left: 0 } : { start: 0 }, { width }, motion]}
    />
  )
}
