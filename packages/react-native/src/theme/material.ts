import type { MaterialColors } from "./types"

/**
 * Material 3 color roles drawn from Plex UI tokens (decision 0017). Primary is the brand accent (`--color-accent`),
 * as Material's primary is the key color of a product; the tonal and neutral roles take the Plex grays, so a Plex
 * app on Android keeps its neutral ink and only its accented controls take the brand color. The steps of the
 * surface containers follow Material's order (lowest to highest), in each theme.
 */
export function materialColors(resolve: (css: string) => string): MaterialColors {
  return {
    primary: resolve("var(--color-background-accent-solid)"),
    onPrimary: resolve("var(--color-text-accent-solid)"),
    primaryContainer: resolve("var(--color-background-accent-soft)"),
    onPrimaryContainer: resolve("var(--color-text-accent)"),
    secondaryContainer: resolve("light-dark(var(--gray-100), var(--gray-300))"),
    onSecondaryContainer: resolve("var(--color-text)"),
    surface: resolve("light-dark(var(--gray-0), var(--gray-0))"),
    surfaceContainerLowest: resolve("light-dark(var(--gray-0), var(--gray-0))"),
    surfaceContainerLow: resolve("light-dark(var(--gray-25), var(--gray-100))"),
    surfaceContainer: resolve("light-dark(var(--gray-50), var(--gray-150))"),
    surfaceContainerHigh: resolve("light-dark(var(--gray-75), var(--gray-200))"),
    surfaceContainerHighest: resolve("light-dark(var(--gray-100), var(--gray-250))"),
    onSurface: resolve("var(--color-text)"),
    onSurfaceVariant: resolve("light-dark(var(--gray-550), var(--gray-700))"),
    outline: resolve("light-dark(var(--gray-450), var(--gray-600))"),
    outlineVariant: resolve("light-dark(var(--gray-200), var(--gray-350))"),
    inverseSurface: resolve("var(--gray-900)"),
    inverseOnSurface: resolve("var(--gray-50)"),
    inversePrimary: resolve("light-dark(var(--accent-200), var(--accent-500))"),
    error: resolve("var(--color-background-danger-solid)"),
    onError: resolve("var(--color-text-danger-solid)"),
    errorContainer: resolve("var(--color-background-danger-soft)"),
    onErrorContainer: resolve("var(--color-text-danger-soft)"),
    scrim: "#000000",
  }
}

/**
 * Material 3 state layers: an overlay of the content color over a container (m3.material.io, Interaction states).
 * Hover 8%, focus 10%, pressed 10%, dragged 16%.
 */
export const stateLayer = { hover: 0.08, focus: 0.1, pressed: 0.1, dragged: 0.16 } as const

/** A color with its alpha multiplied: a state layer or a disabled container. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    const a = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * alpha * 1000) / 1000})`
  }
  const match = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(color)
  if (match) return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${Math.round(Number(match[4]) * alpha * 1000) / 1000})`
  return color
}
