// Shared with packages/ui/src/components/ColorPicker/shared.ts: keep the two copies the same.
/** A color as the picker holds it: channels 0 to 255 and an alpha from 0 to 1. */
export type Rgba = { r: number; g: number; b: number; a: number }

/** The three ways to choose a color, as the segments of the system picker. */
export type ColorPickerMode = "grid" | "spectrum" | "sliders"

export const COLOR_PICKER_MODES: readonly { value: ColorPickerMode; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "spectrum", label: "Spectrum" },
  { value: "sliders", label: "Sliders" },
]

/** The kit's Color Grid (515:48178): a row of grays, then nine rows from dark to light, twelve hues across. */
export const COLOR_PICKER_GRID: readonly (readonly string[])[] = [
  ["#fefffe", "#ebebeb", "#d6d6d6", "#c2c2c2", "#adadad", "#999999", "#858585", "#707070", "#5c5c5c", "#474747", "#333333", "#000000"],
  ["#00374a", "#011d57", "#11053b", "#2e063d", "#3c071b", "#5c0701", "#5a1c00", "#583300", "#563d00", "#666100", "#4f5504", "#263e0f"],
  ["#004d65", "#012f7b", "#1a0a52", "#450d59", "#551029", "#831100", "#7b2900", "#7a4a00", "#785800", "#8d8602", "#6f760a", "#38571a"],
  ["#016e8f", "#0042a9", "#2c0977", "#61187c", "#791a3d", "#b51a00", "#ad3e00", "#a96800", "#a67b01", "#c4bc00", "#9ba50e", "#4e7a27"],
  ["#008cb4", "#0056d6", "#371a94", "#7a219e", "#99244f", "#e22400", "#da5100", "#d38301", "#d19d01", "#f5ec00", "#c3d117", "#669d34"],
  ["#00a1d8", "#0061fd", "#4d22b2", "#982abc", "#b92d5d", "#ff4015", "#ff6a00", "#ffab01", "#fcc700", "#fefb41", "#d9ec37", "#76bb40"],
  ["#01c7fc", "#3a87fd", "#5e30eb", "#be38f3", "#e63b7a", "#fe6250", "#fe8648", "#feb43f", "#fecb3e", "#fff76b", "#e4ef65", "#96d35f"],
  ["#52d6fc", "#74a7ff", "#864ffd", "#d357fe", "#ee719e", "#ff8c82", "#fea57d", "#fec777", "#fed977", "#fff994", "#eaf28f", "#b1dd8b"],
  ["#93e3fc", "#a7c6ff", "#b18cfe", "#e292fe", "#f4a4c0", "#ffb5af", "#ffc5ab", "#fed9a8", "#fde4a8", "#fffbb9", "#f1f7b7", "#cde8b5"],
  ["#cbf0ff", "#d2e2fe", "#d8c9fe", "#efcafe", "#f9d3e0", "#ffdad8", "#ffe2d6", "#feecd4", "#fef1d5", "#fdfbdd", "#f6fadb", "#deeed4"],
]

export const COLOR_PICKER_GRID_COLUMNS = 12
const GRID = COLOR_PICKER_GRID.flat()

/** Saved colors fill pages of two rows of six, with the Add button after the last one, as iOS 27.2's picker lays them
 * out (UIColorPickerViewController on an iPhone 17; the iOS 26 kit's Swatches 515:52724 had rows of five). */
export const COLOR_PICKER_SWATCHES_PER_PAGE = 12
export const COLOR_PICKER_SWATCHES_PER_ROW = 6

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const byte = (value: number) => clamp(Math.round(value), 0, 255)

/** Reads `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`, in either case; anything else is `null`. */
export function parseColor(input: string | null | undefined): Rgba | null {
  const match = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec((input ?? "").trim())
  if (!match) return null
  let hex = match[1]
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join("")
  const channel = (index: number) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  return { r: channel(0), g: channel(1), b: channel(2), a: hex.length === 8 ? channel(3) / 255 : 1 }
}

const two = (value: number) => byte(value).toString(16).padStart(2, "0")

/** `#rrggbb`, or `#rrggbbaa` when the color is not opaque. */
export function formatColor({ r, g, b, a }: Rgba): string {
  const opaque = Math.round(clamp(a, 0, 1) * 255) === 255
  return `#${two(r)}${two(g)}${two(b)}${opaque ? "" : two(clamp(a, 0, 1) * 255)}`
}

/** The six digits the Hex field shows, as the system picker does: upper case, no `#`. */
export const hexDigits = ({ r, g, b }: Rgba) => `${two(r)}${two(g)}${two(b)}`.toUpperCase()

/** A CSS color for a fill. */
export const cssColor = ({ r, g, b, a }: Rgba, alpha = a) => `rgb(${byte(r)} ${byte(g)} ${byte(b)} / ${Math.round(clamp(alpha, 0, 1) * 1000) / 10}%)`

export const sameRgb = (one: Rgba, other: Rgba) => byte(one.r) === byte(other.r) && byte(one.g) === byte(other.g) && byte(one.b) === byte(other.b)

/** Whole percent of opacity, as the Opacity field shows it. */
export const alphaPercent = (a: number) => Math.round(clamp(a, 0, 1) * 100)

/** The grid cell of a color, or -1 when the grid has no such color. */
export const gridIndex = (color: Rgba) => GRID.findIndex((hex) => {
  const cell = parseColor(hex)
  return cell !== null && sameRgb(cell, color)
})

export const gridColor = (index: number) => GRID[index]

/** The cell an arrow key, Home or End moves to from `index`, or `index` itself at an edge. */
export function gridMove(index: number, key: string): number {
  const columns = COLOR_PICKER_GRID_COLUMNS
  const column = index % columns
  const next: Record<string, number> = {
    ArrowRight: column < columns - 1 ? index + 1 : index,
    ArrowLeft: column > 0 ? index - 1 : index,
    ArrowDown: index + columns < GRID.length ? index + columns : index,
    ArrowUp: index - columns >= 0 ? index - columns : index,
    Home: index - column,
    End: index - column + columns - 1,
  }
  return next[key] ?? index
}

/** The item a key moves to in a list of `count` items (saved colors), or `index` itself. */
export function listMove(index: number, count: number, key: string): number {
  const next: Record<string, number> = {
    ArrowRight: Math.min(count - 1, index + 1),
    ArrowDown: Math.min(count - 1, index + 1),
    ArrowLeft: Math.max(0, index - 1),
    ArrowUp: Math.max(0, index - 1),
    Home: 0,
    End: count - 1,
  }
  return next[key] ?? index
}

/** Pages of saved colors: the colors and the Add button after them, twelve to a page. */
export const swatchPageCount = (count: number) => Math.max(1, Math.ceil((count + 1) / COLOR_PICKER_SWATCHES_PER_PAGE))

function rgbToHsl({ r, g, b }: Rgba) {
  const [red, green, blue] = [r / 255, g / 255, b / 255]
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: null, s: 0, l: lightness }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const sector = max === red ? ((green - blue) / delta + 6) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4
  return { h: sector * 60, s: saturation, l: lightness }
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const sector = (((hue % 360) + 360) % 360) / 60
  const second = chroma * (1 - Math.abs((sector % 2) - 1))
  const [red, green, blue] =
    sector < 1 ? [chroma, second, 0] : sector < 2 ? [second, chroma, 0] : sector < 3 ? [0, chroma, second]
      : sector < 4 ? [0, second, chroma] : sector < 5 ? [second, 0, chroma] : [chroma, 0, second]
  const match = lightness - chroma / 2
  return { r: byte((red + match) * 255), g: byte((green + match) * 255), b: byte((blue + match) * 255) }
}

/**
 * A point of the spectrum: hue from top to bottom, and from white at the leading edge through the full hue at the
 * middle to black at the trailing edge, as the system picker draws it (UIColorPickerViewController overview image).
 */
export type SpectrumPoint = { x: number; y: number }

export function spectrumColor({ x, y }: SpectrumPoint, alpha: number): Rgba {
  return { ...hslToRgb(clamp(y, 0, 1) * 360, 1, 1 - clamp(x, 0, 1)), a: alpha }
}

/** Where a color sits on the spectrum; a gray keeps the hue of `previous`, as it has none. */
export function spectrumPoint(color: Rgba, previous?: SpectrumPoint): SpectrumPoint {
  const { h, l } = rgbToHsl(color)
  return { x: 1 - l, y: h === null ? previous?.y ?? 0 : h / 360 }
}

/** The track of the Opacity slider: the color from clear to opaque over the kit's 12% to 88% (515:47434). */
export const opacityTrack = (color: Rgba) => `linear-gradient(to right, ${cssColor(color, 0)} 12%, ${cssColor(color, 1)} 88%)`

export type ColorChannel = "r" | "g" | "b"

export const COLOR_PICKER_CHANNELS: readonly { channel: ColorChannel; label: string }[] = [
  { channel: "r", label: "Red" },
  { channel: "g", label: "Green" },
  { channel: "b", label: "Blue" },
]

/** The track of a channel slider: the color with that channel from 0 to 255. */
export const channelTrack = (color: Rgba, channel: ColorChannel) =>
  `linear-gradient(to right, ${cssColor({ ...color, [channel]: 0 }, 1)}, ${cssColor({ ...color, [channel]: 255 }, 1)})`

/** A number typed in a field, kept within `min` and `max`; text with no number is `null`. */
export function parseNumber(text: string, min: number, max: number): number | null {
  const number = Number.parseFloat(text.replace(/[%\s]/g, ""))
  return Number.isFinite(number) ? clamp(Math.round(number), min, max) : null
}

/** The EyeDropper API (Chromium), when the browser has it. */
type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> }

export function eyeDropper(): EyeDropperConstructor | null {
  if (typeof window === "undefined") return null
  return (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper ?? null
}
