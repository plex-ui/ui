import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { barSurface, withAlpha } from "../theme/material"
import { useTheme } from "../theme/ThemeProvider"
import type { Theme } from "../theme/types"
import { blurModule } from "./optional"
import { useReduceTransparency } from "./reduceTransparency"

/** The blur of a glass bar, from `--page-bar-glass-filter` (`blur(6px) saturate(180%)`). */
export function glassBarBlur(theme: Theme): number {
  const filter = theme.token("--page-bar-glass-filter")
  const match = typeof filter === "string" ? /blur\(\s*([\d.]+)px\s*\)/.exec(filter) : null
  return match ? Number(match[1]) : 6
}

/**
 * The ease of Android's bar fades: cubic-bezier(0.42, 0, 0.58, 1), solved for `x` by bisection.
 */
function easeBoth(x: number): number {
  const curve = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t
  let low = 0
  let high = 1
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    if (curve(mid, 0.42, 0.58) < x) low = mid
    else high = mid
  }
  return curve((low + high) / 2, 0, 1)
}

/**
 * The eight stops of an Android bar fade toward the bottom: `alpha` at the top of the last `length` px, eased out to
 * clear at the bottom. Each as `[alpha, px from the top of the fade]`.
 */
function fadeStops(alpha: number, length: number): [number, number][] {
  return Array.from({ length: 8 }, (_, i) => [easeBoth(1 - i / 7) * alpha, Math.round(((length * i) / 7) * 100) / 100])
}

/** Black at an alpha: a stop of a mask. */
const black = (alpha: number) => `rgba(0, 0, 0, ${Math.round(alpha * 1000) / 1000})`

/** A mask to the bottom from `fadeStops`: opaque above the last `length` px, eased out to clear (the web). */
function fadeMask(length: number): string {
  const stops = fadeStops(1, length).map(([alpha, from]) => `${black(alpha)} calc(100% - ${Math.round((length - from) * 100) / 100}px)`)
  return `linear-gradient(to bottom, ${stops.join(", ")})`
}

/** The channels of a `#rrggbb` or `rgb(a)()` color; undefined for any other form. */
function channels(color: string): [number, number, number] | undefined {
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]
  }
  const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined
}

/**
 * The color that, at `alpha` over `base`, shows `target` (solved for the source color), each channel kept in range: the
 * fill of a glass that reads as a card over the screen. Falls back to `target` at `alpha`.
 */
function over(target: string, base: string, alpha: number): string {
  const top = channels(target)
  const under = channels(base)
  if (!top || !under) return withAlpha(target, alpha)
  const channel = (i: number) => Math.max(0, Math.min(255, Math.round((top[i] - under[i] * (1 - alpha)) / alpha)))
  return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha})`
}

/**
 * The glass of Android's bar controls, without a liquid-glass effect: `bar` is a top bar's circle or capsule, `tabs`
 * the capsule of the main tabs. A fill that reads as a card over `base` (the screen), a thin lit rim along the top and
 * a darker one along the bottom, and a soft shadow, with the content blurred under it on the web. An opaque card with
 * Reduce Transparency.
 */
export function useAndroidGlass(kind: "bar" | "tabs", base?: string): ViewStyle {
  const theme = useTheme()
  const reduce = useReduceTransparency()
  const dark = theme.scheme === "dark"
  const card = barSurface(theme.material, theme.scheme)
  // A top bar's control: 80% over the screen, a 0.55dp rim, the shadow 8dp soft and 2.33dp down (none at night).
  // The main tabs: 76%, a 0.4dp rim, the shadow 2.67dp soft and 0.85dp down.
  const spec =
    kind === "bar"
      ? {
          alpha: 0.8,
          rim: 0.55,
          top: dark ? "rgba(255, 255, 255, 0.125)" : "#FFFFFF",
          bottom: dark ? "rgba(255, 255, 255, 0.078)" : "#FFFFFF",
          shadow: dark ? null : "0 2.33px 8px rgba(51, 51, 51, 0.086)",
        }
      : {
          alpha: 0.76,
          rim: 0.4,
          top: dark ? "rgba(255, 255, 255, 0.024)" : "rgba(0, 0, 0, 0.067)",
          bottom: dark ? "rgba(255, 255, 255, 0.067)" : "rgba(0, 0, 0, 0.125)",
          shadow: `0 0.85px 2.67px ${dark ? "rgba(255, 255, 255, 0.016)" : "rgba(0, 0, 0, 0.125)"}`,
        }
  const rim = `inset 0 ${spec.rim}px 0 ${spec.top}, inset 0 -${spec.rim}px 0 ${spec.bottom}`
  const boxShadow = spec.shadow ? `${rim}, ${spec.shadow}` : rim
  if (reduce) return { backgroundColor: card, boxShadow }
  const fill = over(card, base ?? theme.colors.background, spec.alpha)
  if (Platform.OS !== "web") return { backgroundColor: fill, boxShadow }
  const token = theme.token("--mobile-glass-backdrop-filter")
  const filter = typeof token === "string" ? token : "blur(12px)"
  return { backgroundColor: fill, boxShadow, backdropFilter: filter, WebkitBackdropFilter: filter } as ViewStyle
}

/**
 * The background of a bar over scrolled content: a fill (a veil of the canvas, or an opaque one) with the content
 * blurred under it where the platform can (a backdrop filter on the web, expo-blur on iOS), and a hairline toward
 * the content.
 */
export function BarBackdrop({
  fill,
  blur = 0,
  line,
  edge,
  style,
}: {
  fill: string
  blur?: number
  line?: string
  edge: "top" | "bottom"
  style?: StyleProp<ViewStyle>
}) {
  const theme = useTheme()
  const hairline: ViewStyle | null = line
    ? edge === "bottom"
      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line }
      : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line }
    : null
  if (Platform.OS === "web") {
    const filter = blur ? `blur(${blur}px) saturate(180%)` : undefined
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: fill }, hairline, filter ? ({ backdropFilter: filter, WebkitBackdropFilter: filter } as ViewStyle) : null, style]}
      />
    )
  }
  const module = blur && theme.isIOS ? blurModule() : null
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, hairline, style]}>
      {module ? <module.BlurView intensity={40} tint={theme.scheme === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
    </View>
  )
}

/**
 * The shadow under an Android opaque bar, over the content: 3dp of black, 12.5% at the bar's edge, 11.4% at 0.57dp,
 * 7% at 0.95dp, 4.7% at 1.33dp and 1.6% from 1.71dp on, as Android's classic bars cast it (measured on a device).
 */
export function BarShadow() {
  const stops = [
    [0.125, 0.19],
    [0.114, 0.57],
    [0.07, 0.95],
    [0.047, 1.33],
    [0.016, 1.71],
    [0.016, 3],
  ]
    .map(([alpha, at]) => `rgba(0, 0, 0, ${alpha}) ${at}px`)
    .join(", ")
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: "100%", start: 0, end: 0, height: 3, backgroundImage: `linear-gradient(to bottom, ${stops})` } as ViewStyle}
    />
  )
}

/** The alpha of the screen's color in Android's fade under its tabs, 0xE8 of 285. */
export const ANDROID_FADE_ALPHA = 232 / 285
/** Its steps over the fade, as fractions of that alpha: 0, 0x60, 0xB0 and 0xE8 of 285. */
export const ANDROID_FADE_STOPS = [0, 96 / 232, 176 / 232, 1] as const

/**
 * The soft scroll edge of a bottom bar (Toolbar.module.css): the canvas color from `tail` above the bar's items down
 * to the screen's edge, fading in over its first `tail`, over a light blur. It covers the content fully from the
 * items' top down, so none shows through a soft or glass item, as the edge of native iOS 26 starts 27pt above them.
 * `top` is where the items start in the bar. `stops` sets the fade in: the fill's alpha at even steps over `tail`
 * (a straight fade from 0 to 1 when left out); `blur` 0 draws no blur.
 */
export function SoftBottomEdge({
  fill,
  top,
  tail,
  blur,
  stops,
}: {
  fill: string
  top: number
  tail: number
  blur: number
  stops?: readonly number[]
}) {
  const place: ViewStyle = { position: "absolute", top: top - tail, left: 0, right: 0, bottom: 0 }
  const at = (index: number) => (stops && stops.length > 1 ? Math.round(((tail * index) / (stops.length - 1)) * 100) / 100 : 0)
  if (Platform.OS === "web") {
    const mask = stops
      ? `linear-gradient(to bottom, ${stops.map((alpha, index) => `${black(alpha)} ${at(index)}px`).join(", ")})`
      : `linear-gradient(to bottom, transparent, #000 ${tail}px)`
    const filter = blur ? `blur(${blur}px)` : undefined
    return (
      <View
        pointerEvents="none"
        style={[place, { backgroundColor: fill }, { maskImage: mask, WebkitMaskImage: mask } as ViewStyle, filter ? ({ backdropFilter: filter, WebkitBackdropFilter: filter } as ViewStyle) : null]}
      />
    )
  }
  const gradient = stops
    ? `linear-gradient(to bottom, ${stops.map((alpha, index) => `${withAlpha(fill, alpha)} ${at(index)}px`).join(", ")})`
    : `linear-gradient(to bottom, ${withAlpha(fill, 0)}, ${fill})`
  return (
    <View pointerEvents="none" style={place}>
      <View style={{ height: tail, backgroundImage: gradient } as ViewStyle} />
      <View style={{ flex: 1, backgroundColor: fill }} />
    </View>
  )
}

/**
 * The soft edge under Android's top bar: the content blurred under the whole bar, its blur eased out over the last
 * 32dp, under the screen's color at 160/255 eased out over the last 56dp. Where there is no blur (native, or `blur`
 * 0), the color alone at 210/255, eased out over the last 48dp, as Android's fallback. Each fade eases with
 * cubic-bezier(0.42, 0, 0.58, 1) in eight steps.
 */
/** A soft edge's strength, 0 to 1: set on each of its layers, as an ancestor's opacity would cut the blur off what it blurs */
type EdgeOpacity = Animated.Value | Animated.AnimatedInterpolation<number> | undefined

export function SoftTopEdge({ fill, blur, opacity }: { fill: string; blur: number; opacity?: EdgeOpacity }) {
  if (Platform.OS === "web") {
    const filter = blur > 0 ? `blur(${blur}px)` : null
    const mask = fadeMask(filter ? 56 : 48)
    const blurMask = fadeMask(32)
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {filter ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, { maskImage: blurMask, WebkitMaskImage: blurMask, backdropFilter: filter, WebkitBackdropFilter: filter } as ViewStyle, { opacity }]}
          />
        ) : null}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(fill, filter ? 160 / 255 : 210 / 255), maskImage: mask, WebkitMaskImage: mask } as ViewStyle, { opacity }]}
        />
      </View>
    )
  }
  const stops = fadeStops(210 / 255, 48).map(([alpha, from]) => `${withAlpha(fill, alpha)} ${from}px`)
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <View style={{ flex: 1, backgroundColor: withAlpha(fill, 210 / 255) }} />
      <View style={{ height: 48, backgroundImage: `linear-gradient(to bottom, ${stops.join(", ")})` } as ViewStyle} />
    </Animated.View>
  )
}

/**
 * iOS 27.2's soft scroll edge under a bottom bar (styles' --page-bar-soft-bottom-*, measured on a scrolled list,
 * owner 13.11): from 34pt above the bar's items down to the screen's edge, a veil of the canvas color (8% 9 into the
 * layer, 15% from 25 to 37, 23% at 45, 31% at 57, 46% from 77 down) over a 10pt blur that takes hold from 12 to 40
 * into it. Over the canvas alone it draws nothing to see, so it stays drawn. Native draws the veil without the blur.
 */
const BOTTOM_REACH = 34
const BOTTOM_VEIL: readonly [number, number][] = [
  [0, 0],
  [0.08, 9],
  [0.15, 25],
  [0.15, 37],
  [0.23, 45],
  [0.31, 57],
  [0.46, 77],
]

export function SoftBottomVeil({ fill, top, opacity }: { fill: string; top: number; opacity?: EdgeOpacity }) {
  const place: ViewStyle = { position: "absolute", top: top - BOTTOM_REACH, left: 0, right: 0, bottom: 0 }
  if (Platform.OS === "web") {
    const veil = `linear-gradient(to bottom, ${BOTTOM_VEIL.map(([alpha, at]) => `${black(alpha)} ${at}px`).join(", ")})`
    const blurMask = "linear-gradient(to bottom, transparent 12px, #000 40px)"
    return (
      <View pointerEvents="none" style={place}>
        <Animated.View style={[StyleSheet.absoluteFill, { backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", maskImage: blurMask, WebkitMaskImage: blurMask } as ViewStyle, { opacity }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: fill, maskImage: veil, WebkitMaskImage: veil } as ViewStyle, { opacity }]} />
      </View>
    )
  }
  const last = BOTTOM_VEIL[BOTTOM_VEIL.length - 1]
  const gradient = `linear-gradient(to bottom, ${BOTTOM_VEIL.map(([alpha, at]) => `${withAlpha(fill, alpha)} ${at}px`).join(", ")})`
  return (
    <Animated.View pointerEvents="none" style={[place, { opacity }]}>
      <View style={{ height: last[1], backgroundImage: gradient } as ViewStyle} />
      <View style={{ flex: 1, backgroundColor: withAlpha(fill, last[0]) }} />
    </Animated.View>
  )
}

/**
 * iOS 27.2's soft scroll edge at the top of a screen with no bar (a SwiftUI scroll view's `.soft` top edge, measured
 * at 3x over a black and white step and plain colors, 28.11): from the screen's edge down to `edge` (the status bar's
 * bottom, or a row's) and 34pt past it. It does not blur the content away: the content stays, lightly softened (σ 3
 * at the screen's edge, 2 by `edge`, 1 18 below it), under a haze of it blurred wide (σ 30) that is 64% of what shows
 * in light and 49% in dark at the screen's edge, 92% of that 14 above `edge`, 58% 2 below it, 18% 18 below and none 34
 * below; over both a veil of the screen's color, 49% in light and 59% in dark at the edge, easing out from 28 above
 * `edge` to nothing 34 below it. Native draws the veil alone.
 */
export const TOP_EDGE_TAIL = 34
/** The veil's strength by `[fraction of the peak, px up from the edge's end]` */
const TOP_VEIL: readonly [number, number][] = [
  [0, 0],
  [0.04, 3],
  [0.077, 6],
  [0.14, 10],
  [0.217, 14],
  [0.305, 18],
  [0.395, 22],
  [0.49, 26],
  [0.58, 30],
  [0.69, 36],
  [0.81, 44],
  [0.89, 52],
  [0.95, 62],
  [0.985, 82],
  [1, 96],
]
/** The veil at the screen's edge, light and dark */
const TOP_VEIL_PEAK = { light: 0.486, dark: 0.588 }
/** The haze's share of what shows, by `[fraction of the peak, px up from the edge's end]` */
const TOP_HAZE: readonly [number, number][] = [
  [0, 0],
  [0.09, 8],
  [0.18, 16],
  [0.39, 24],
  [0.51, 28],
  [0.58, 32],
  [0.73, 36],
  [0.83, 40],
  [0.92, 48],
  [1, 76],
]
/** The haze's share at the screen's edge, light and dark */
const TOP_HAZE_PEAK = { light: 0.64, dark: 0.49 }
/** The haze's blur */
const TOP_HAZE_BLUR = 30
/**
 * The light blur of the content under the haze, in layers over one another so their radii add up (σ 1.2, 2 and 3 in
 * all): each `[σ, px up from the edge's end where it starts, px where it is whole]`
 */
const TOP_SOFTEN: readonly [number, number, number][] = [
  [1.2, 0, 8],
  [1.6, 24, 32],
  [2.24, 36, 48],
]
/** How far above the edge the content is blurred in full (14): a height it is blurred in full down to sets the edge this far under it */
export const TOP_EDGE_WHOLE = TOP_SOFTEN[TOP_SOFTEN.length - 1][2] - TOP_EDGE_TAIL
/** Room under the edge's end where the haze reads the content it blurs (its masks are clear there), as native blurs what lies past it */
const TOP_HAZE_ROOM = 60

export function SoftTopVeil({ fill, edge, opacity }: { fill: string; edge: number; opacity?: EdgeOpacity }) {
  const theme = useTheme()
  const scheme = theme.scheme === "dark" ? "dark" : "light"
  const reach = Math.max(0, edge) + TOP_EDGE_TAIL
  const veil = TOP_VEIL.map(([share, at]) => [+(share * TOP_VEIL_PEAK[scheme]).toFixed(4), at] as const)
  if (Platform.OS === "web") {
    const room = TOP_HAZE_ROOM
    const mask = (stops: readonly (readonly [number, number])[]) => `linear-gradient(to top, ${stops.map(([alpha, at]) => `${black(alpha)} ${at + room}px`).join(", ")})`
    const layer = (filter: string, maskImage: string, key: string) => (
      <Animated.View key={key} style={[StyleSheet.absoluteFill, { backdropFilter: filter, WebkitBackdropFilter: filter, maskImage, WebkitMaskImage: maskImage } as ViewStyle, { opacity }]} />
    )
    return (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: reach + room }}>
        {TOP_SOFTEN.map(([sigma, from, whole]) => layer(`blur(${sigma}px)`, mask([[0, from], [1, whole]]), `soften-${sigma}`))}
        {layer(`blur(${TOP_HAZE_BLUR}px)`, mask(TOP_HAZE.map(([share, at]) => [share * TOP_HAZE_PEAK[scheme], at] as const)), "haze")}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: fill, maskImage: mask(veil), WebkitMaskImage: mask(veil) } as ViewStyle, { opacity }]} />
      </View>
    )
  }
  // Native draws the veil alone
  const last = veil[veil.length - 1]
  const gradient = `linear-gradient(to top, ${veil.map(([alpha, at]) => `${withAlpha(fill, alpha)} ${at}px`).join(", ")})`
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", top: 0, left: 0, right: 0, height: reach, overflow: "hidden", justifyContent: "flex-end" }, { opacity }]}
    >
      <View style={{ flex: 1, backgroundColor: withAlpha(fill, last[0]) }} />
      <View style={{ height: last[1], backgroundImage: gradient } as ViewStyle} />
    </Animated.View>
  )
}

/**
 * The fade under a tab bar's capsule, as apps that mute the content under their tab bar draw it (measured on one at
 * 3x): nothing above the capsule, so the rows over it stay clear; from the capsule's top the screen's color comes in
 * over 60pt (6% 5 in, 25% 21 in, 37% 32 in, 56% 42 in, 69% 51 in, 85% from 60 in) and holds to the screen's edge,
 * with no blur: the text under it stays sharp, only faint.
 */
const TAB_FADE: readonly [number, number][] = [
  [0, 0],
  [0.06, 5],
  [0.25, 21],
  [0.37, 32],
  [0.56, 42],
  [0.69, 51],
  [0.85, 60],
]

export function TabBarFade({ fill, top }: { fill: string; top: number }) {
  const last = TAB_FADE[TAB_FADE.length - 1]
  const gradient = `linear-gradient(to bottom, ${TAB_FADE.map(([alpha, at]) => `${withAlpha(fill, alpha)} ${at}px`).join(", ")})`
  return (
    <View pointerEvents="none" style={{ position: "absolute", top, left: 0, right: 0, bottom: 0 }}>
      <View style={{ height: last[1], backgroundImage: gradient } as ViewStyle} />
      <View style={{ flex: 1, backgroundColor: withAlpha(fill, last[0]) }} />
    </View>
  )
}
