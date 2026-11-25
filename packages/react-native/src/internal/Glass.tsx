import { useState } from "react"
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native"
import { useTheme, useThemeOverrides } from "../theme/ThemeProvider"
import { blurModule, liquidGlassModule } from "./optional"
import { useReduceTransparency } from "./reduceTransparency"

export type GlassProps = ViewProps & {
  /** Corner radius of the glass. */
  radius?: number
  /** `"raised"` casts the deeper shadow of glass that stands over content (a menu, a toast). @default "regular" */
  elevation?: "regular" | "raised"
  /** Tints the glass, as the prominent bar button. */
  tint?: string
  /** Native glass reacts to touches (iOS 26 interactive glass). */
  interactive?: boolean
  /** A fill token for the glass instead of `--mobile-glass-background` (menus, alerts and toasts set their own). */
  fillToken?: string
  /**
   * A backdrop-filter token for the blur instead of the surface's own: the menu's, the toast's and the alert's fill
   * tokens bring theirs (`--menu-mobile-backdrop-filter` and so on), other glass `--mobile-glass-backdrop-filter`.
   */
  filterToken?: string
  /**
   * A box-shadow token instead of the surface's own: `--menu-shadow`, `--toast-mobile-shadow` and
   * `--dialog-alert-shadow` with their fill tokens, otherwise the glass shadow of `elevation`.
   */
  shadowToken?: string
  /** A blur radius in px in place of the filter token's, where the glass is drawn by a blur (the web, iOS before 26). */
  blur?: number
  style?: StyleProp<ViewStyle>
}

/**
 * In a browser the glass is a fill over a CSS blur, which shows far more of what is under it than iOS's own: a menu is
 * almost opaque there, and a chip's label must read over any photo. So on the web the plain glass and the menu take
 * these denser fills and blurs (each a token a theme may set; the shared web tokens stay as they are). A brand that
 * sets the shared token itself keeps it.
 */
const WEB_DENSE: Record<string, { fill: string; light: string; dark: string; filter: string; blur: string }> = {
  "--mobile-glass-background": {
    fill: "--mobile-glass-web-background",
    light: "rgba(250, 250, 252, 0.62)",
    dark: "rgba(52, 52, 56, 0.74)",
    filter: "--mobile-glass-web-backdrop-filter",
    blur: "blur(8px) saturate(180%)",
  },
  // Pressed, a step deeper, as the shared tokens step from 55% to 75%
  "--mobile-glass-background-active": {
    fill: "--mobile-glass-web-background-active",
    light: "rgba(238, 238, 242, 0.8)",
    dark: "rgba(72, 72, 76, 0.84)",
    filter: "--mobile-glass-web-backdrop-filter",
    blur: "blur(8px) saturate(180%)",
  },
  "--menu-mobile-background": {
    fill: "--menu-mobile-web-background",
    light: "rgba(255, 255, 255, 0.9)",
    dark: "rgba(28, 28, 30, 0.9)",
    filter: "--menu-mobile-web-backdrop-filter",
    blur: "blur(30px)",
  },
}

/**
 * The web's plain glass drawn as iOS 26's Liquid Glass reads (measured on its tab bars and bar buttons): a lighter fill
 * than a tint of white in the dark, a sheen down the glass (a shade under its top edge in the light, a lift toward its
 * bottom in the dark), a bright rim on every side, and a lens at the edge, where what is under the glass is blurred and
 * lit more, as Liquid Glass bends it there (a browser cannot bend it). Each part a token a theme may set.
 */
const WEB_LIQUID = {
  sheen: { token: "--mobile-glass-web-sheen", light: "linear-gradient(to bottom, rgb(0 0 0 / 3.5%), rgb(0 0 0 / 0) 35%)", dark: "linear-gradient(to bottom, rgb(255 255 255 / 0), rgb(255 255 255 / 5%))" },
  shadow: {
    token: "--mobile-glass-web-shadow",
    light:
      "0 8px 24px rgb(0 0 0 / 6%), 0 0 0 0.5px rgb(0 0 0 / 12%), inset 0 1px 0 rgb(255 255 255), inset 0 -1px 0 rgb(255 255 255 / 90%), inset 1px 0 0 rgb(255 255 255 / 70%), inset -1px 0 0 rgb(255 255 255 / 70%)",
    dark: "0 8px 24px rgb(0 0 0 / 25%), inset 0 1px 0 rgb(255 255 255 / 36%), inset 0 -1px 0 rgb(255 255 255 / 20%), inset 1px 0 0 rgb(255 255 255 / 12%), inset -1px 0 0 rgb(255 255 255 / 12%)",
  },
  shadowRaised: {
    token: "--mobile-glass-web-shadow-raised",
    light:
      "0 8px 40px rgb(0 0 0 / 12%), 0 0 0 0.5px rgb(0 0 0 / 12%), inset 0 1px 0 rgb(255 255 255), inset 0 -1px 0 rgb(255 255 255 / 90%), inset 1px 0 0 rgb(255 255 255 / 70%), inset -1px 0 0 rgb(255 255 255 / 70%)",
    dark: "0 8px 40px rgb(0 0 0 / 30%), inset 0 1px 0 rgb(255 255 255 / 36%), inset 0 -1px 0 rgb(255 255 255 / 20%), inset 1px 0 0 rgb(255 255 255 / 12%), inset -1px 0 0 rgb(255 255 255 / 12%)",
  },
  lens: { token: "--mobile-glass-web-lens-filter", value: "blur(3px) brightness(1.12) saturate(200%)" },
}

/**
 * The lens: the glass's edge only, fading in over 14 from its sides and 9 from its top and bottom (a small glass keeps
 * a half and a third of its radius), along the glass's own shape. A ring whose hole is the glass's outline drawn
 * smaller, blurred so its inner edge fades; bands across the box would leave a square in a round glass. The outline is
 * the corner radius as the browser draws it, so no larger than half the glass's shorter side (a capsule's 999 is its
 * height's half). A round glass (a bar button, a progress ring) keeps a thin rim of it: a ring as deep as a bar's
 * reads on a small circle as a halo around a darker middle.
 */
const lensMask = (width: number, height: number, radius: number) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const round = r > 0 && Math.abs(width - height) <= 1 && r >= Math.min(width, height) / 2 - 0.5
  const inline = round ? r / 6 : Math.min(14, r > 0 ? r / 2 : 14)
  const block = round ? r / 8 : Math.min(9, r > 0 ? r / 3 : 9)
  const x = inline / 2
  const y = block / 2
  const w = Math.max(0, width - 2 * x)
  const h = Math.max(0, height - 2 * y)
  const rx = Math.max(0, Math.min(r - x, w / 2))
  const ry = Math.max(0, Math.min(r - y, h / 2))
  const f = (n: number) => +n.toFixed(2)
  const hole =
    `M${f(x + rx)} ${f(y)}H${f(x + w - rx)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x + w)} ${f(y + ry)}V${f(y + h - ry)}` +
    `A${f(rx)} ${f(ry)} 0 0 1 ${f(x + w - rx)} ${f(y + h)}H${f(x + rx)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x)} ${f(y + h - ry)}` +
    `V${f(y + ry)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x + rx)} ${f(y)}Z`
  // The outer edge stands 20 past the box, so the blur fades only the hole's edge; the glass's radius clips the rest
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f(width)}" height="${f(height)}">` +
    `<filter id="e" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="${f(inline / 4)} ${f(block / 4)}"/></filter>` +
    `<path filter="url(#e)" fill-rule="evenodd" d="M-20 -20H${f(width + 20)}V${f(height + 20)}H-20Z${hole}"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** The filter and the shadow of the glass surfaces of the phone layer, by their fill (mobile-materials.css, touch.css). */
const SURFACES: Record<string, { filter: string; shadow: string }> = {
  "--menu-mobile-background": { filter: "--menu-mobile-backdrop-filter", shadow: "--menu-shadow" },
  "--toast-mobile-background": { filter: "--toast-mobile-backdrop-filter", shadow: "--toast-mobile-shadow" },
  "--dialog-alert-background": { filter: "--dialog-alert-backdrop-filter", shadow: "--dialog-alert-shadow" },
}

/**
 * expo-blur's intensity for a CSS blur radius: 5 per px, so the 12px of the bar glass keeps the 60 it was tuned at,
 * the menus' and toasts' 18px take 90 and the alert's 10px 50.
 */
const intensityOf = (radius: number) => Math.max(0, Math.min(100, Math.round(radius * 5)))

/**
 * The glass of iOS 26: native Liquid Glass on iOS 26 and later (expo-glass-effect), a blur under the fill of the
 * Plex UI phone layer elsewhere (`--mobile-glass-*` tokens and each surface's own filter and shadow). Where nothing
 * blurs (no expo-blur, Android) and with Reduce Transparency, the fill stands on an opaque elevated surface: a tint
 * over live content cannot be read (dark glass is white at 12%), and HIG materials turn opaque then. Material 3 has
 * no glass: on Android the components draw their tonal containers instead and do not use this.
 */
export function Glass({
  radius = 0,
  elevation = "regular",
  tint,
  interactive,
  fillToken,
  filterToken,
  shadowToken,
  blur,
  style,
  children,
  ...rest
}: GlassProps) {
  const theme = useTheme()
  // The web lens's mask follows the glass's shape, so it needs the glass's size
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const reduceTransparency = useReduceTransparency()
  const overrides = useThemeOverrides()
  const shape: ViewStyle = { borderRadius: radius, borderCurve: "continuous" }
  const surface = fillToken ? SURFACES[fillToken] : undefined
  const shadow = theme.token(shadowToken ?? surface?.shadow ?? (elevation === "raised" ? "--mobile-glass-shadow-raised" : "--mobile-glass-shadow"))
  const boxShadow = typeof shadow === "string" ? shadow : undefined
  const native = liquidGlassModule()
  // iOS 26's own glass turns frostier by itself with Reduce Transparency
  if (native) {
    const { GlassView } = native
    return (
      <GlassView
        {...rest}
        glassEffectStyle="regular"
        colorScheme={theme.scheme}
        tintColor={tint}
        isInteractive={interactive}
        style={[shape, style]}
      >
        {children}
      </GlassView>
    )
  }
  const web = Platform.OS === "web"
  const fillName = fillToken ?? "--mobile-glass-background"
  const filterName = filterToken ?? surface?.filter ?? "--mobile-glass-backdrop-filter"
  const dense = web && !theme.isAndroid ? WEB_DENSE[fillName] : undefined
  const denseFill = dense != null && tint == null && overrides?.[fillName] == null
  // Glass with a fill of its own and the plain glass's filter (the large segmented control) blurs as the plain glass
  // does on the web, so a brand's --mobile-glass-web-backdrop-filter reaches it too
  const plainFilter = web && !theme.isAndroid && dense == null && filterToken == null && filterName === "--mobile-glass-backdrop-filter" && overrides?.[filterName] == null
  const denseFilter = (dense != null && filterToken == null && overrides?.[filterName] == null) || plainFilter
  const webFilter = dense ?? WEB_DENSE["--mobile-glass-background"]
  const fill = tint ?? (denseFill ? theme.color(dense.fill, theme.scheme === "dark" ? dense.dark : dense.light) : theme.color(fillName))
  const filterValue = denseFilter ? (theme.token(webFilter.filter) ?? webFilter.blur) : theme.token(filterName)
  const filter = blur != null ? `blur(${blur}px)` : typeof filterValue === "string" ? filterValue : "blur(12px)"
  const module = web || Platform.OS !== "ios" ? null : blurModule()
  const opaque = reduceTransparency || (!web && module == null)
  if (web && !opaque) {
    // The plain glass (bars, bar buttons, the tab bar, the large segmented control) reads as Liquid Glass; menus,
    // toasts and alerts keep their frosted panels
    const liquid = !theme.isAndroid && (fillName === "--mobile-glass-background" || fillName === "--mobile-glass-background-active" || plainFilter)
    const scheme = theme.scheme === "dark" ? "dark" : "light"
    const own = (part: { token: string; light: string; dark: string }) => {
      const value = theme.token(part.token)
      return typeof value === "string" ? value : part[scheme]
    }
    const ownShadow = shadowToken == null && surface == null && overrides?.["--mobile-glass-shadow"] == null && overrides?.["--mobile-glass-shadow-raised"] == null
    const liquidShadow = liquid && ownShadow ? own(elevation === "raised" ? WEB_LIQUID.shadowRaised : WEB_LIQUID.shadow) : boxShadow
    const sheen = liquid && tint == null ? own(WEB_LIQUID.sheen) : undefined
    const lensToken = theme.token(WEB_LIQUID.lens.token)
    const lensFilter = typeof lensToken === "string" ? lensToken : WEB_LIQUID.lens.value
    const mask = size != null && size.width > 0 && size.height > 0 ? lensMask(size.width, size.height, radius) : undefined
    // An Animated.View, so a panel can move its own glass (a transform above the blur would stop it)
    return (
      <Animated.View
        {...rest}
        style={[
          shape,
          { backgroundColor: fill, boxShadow: liquidShadow },
          { backdropFilter: filter, WebkitBackdropFilter: filter, backgroundImage: sheen } as ViewStyle,
          style,
        ]}
      >
        {liquid && lensFilter !== "none" ? (
          <View
            pointerEvents="none"
            aria-hidden
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout
              if (size?.width !== width || size?.height !== height) setSize({ width, height })
            }}
            style={[
              StyleSheet.absoluteFill,
              shape,
              // Until the glass has a size, no lens: a lens unmasked would blur the whole glass
              mask == null
                ? null
                : ({ backdropFilter: lensFilter, WebkitBackdropFilter: lensFilter, maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" } as ViewStyle),
            ]}
          />
        ) : null}
        {children}
      </Animated.View>
    )
  }
  const radiusPx = Number(/blur\(\s*([\d.]+)px\s*\)/.exec(filter)?.[1] ?? 12)
  return (
    <View {...rest} style={[shape, { boxShadow }, style]}>
      <View style={[StyleSheet.absoluteFill, shape, { overflow: "hidden" }]} pointerEvents="none">
        {opaque ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color("--mobile-surface-elevated-plain-primary", theme.colors.surfaceElevated) }]} />
        ) : module ? (
          <module.BlurView
            intensity={intensityOf(radiusPx)}
            tint={theme.scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      </View>
      {children}
    </View>
  )
}
