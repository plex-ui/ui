import { formatColor } from "@plexui/styles/tokens"

/**
 * CSS colors the token resolver does not read, written as hex or rgba for it: the resolver takes hex, `rgb()`, a
 * few names and its own mixes, while a brand may be given in any CSS Color 4 syntax (`hsl()`, `oklch()`, `navy`).
 */

type RGBA = { r: number; g: number; b: number; a: number }

// The CSS named colors (CSS Color 4), as six hex digits
const NAMED = Object.fromEntries(
  (
    "aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 " +
    "blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 " +
    "chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c cyan:00ffff darkblue:00008b " +
    "darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b darkmagenta:8b008b " +
    "darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f " +
    "darkslateblue:483d8b darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 " +
    "deepskyblue:00bfff dimgray:696969 dimgrey:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 " +
    "fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f " +
    "grey:808080 honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa " +
    "lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff " +
    "lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a " +
    "lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 " +
    "lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa mediumblue:0000cd " +
    "mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a " +
    "mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 " +
    "navajowhite:ffdead navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 " +
    "palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 " +
    "peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f " +
    "royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d " +
    "silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f " +
    "steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 " +
    "white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32"
  )
    .split(" ")
    .map((pair) => pair.split(":") as [string, string]),
)

const FUNCTIONS = ["hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch"] as const
type ColorFunction = (typeof FUNCTIONS)[number]

/** A number, a percentage (the share of `percentOf`) or an angle (in degrees); `none` is 0. */
function component(raw: string, percentOf: number): number | undefined {
  if (raw === "none") return 0
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg|rad|grad|turn)?$/i.exec(raw)
  if (!match) return undefined
  const value = Number(match[1])
  switch (match[2]?.toLowerCase()) {
    case "%":
      return (value / 100) * percentOf
    case "rad":
      return (value * 180) / Math.PI
    case "grad":
      return value * 0.9
    case "turn":
      return value * 360
    default:
      return value
  }
}

/** The three channels and the alpha of a color function, legacy commas or the modern slash. */
function splitArgs(args: string): [string[], string | undefined] | undefined {
  const text = args.trim()
  if (text.includes(",")) {
    const parts = text.split(",").map((part) => part.trim())
    return parts.length === 3 || parts.length === 4 ? [parts.slice(0, 3), parts[3]] : undefined
  }
  const [channels, alpha, extra] = text.split("/").map((part) => part.trim())
  if (extra !== undefined) return undefined
  const parts = channels.split(/\s+/).filter(Boolean)
  return parts.length === 3 ? [parts, alpha] : undefined
}

const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.sign(v) * Math.abs(v) ** (1 / 2.4) - 0.055)

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360
  const f = (n: number) => {
    const k = (n + hue / 30) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

function hwbToRgb(h: number, w: number, b: number): [number, number, number] {
  if (w + b >= 1) {
    const gray = w / (w + b)
    return [gray, gray, gray]
  }
  return hslToRgb(h, 1, 0.5).map((c) => c * (1 - w - b) + w) as [number, number, number]
}

/** Oklab to linear-light sRGB (Björn Ottosson's matrices, as CSS Color 4). */
function oklabToLinear(l: number, a: number, b: number): [number, number, number] {
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ]
}

/** CIE Lab (D50) to linear-light sRGB, through XYZ and the Bradford adaptation to D65. */
function labToLinear(l: number, a: number, b: number): [number, number, number] {
  const k = 24389 / 27
  const e = 216 / 24389
  const fy = (l + 16) / 116
  const fx = a / 500 + fy
  const fz = fy - b / 200
  const x = (fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * 0.3457 / 0.3585
  const y = l > k * e ? fy ** 3 : l / k
  const z = (fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * (1 - 0.3457 - 0.3585) / 0.3585
  const x65 = 0.9554734527042182 * x - 0.023098536874261423 * y + 0.0632593086610217 * z
  const y65 = -0.028369706963208136 * x + 1.0099954580058226 * y + 0.021041398966943008 * z
  const z65 = 0.012314001688319899 * x - 0.020507696433477912 * y + 1.3303659366080753 * z
  return [
    3.2409699419045226 * x65 - 1.537383177570094 * y65 - 0.4986107602930034 * z65,
    -0.9692436362808796 * x65 + 1.8759675015077202 * y65 + 0.04155505740717559 * z65,
    0.05563007969699366 * x65 - 0.20397695888897652 * y65 + 1.0569715142428786 * z65,
  ]
}

const inGamut = (rgb: number[]) => rgb.every((c) => c >= -0.0001 && c <= 1.0001)

/**
 * Oklch into sRGB, its chroma lowered until it fits (the gamut mapping of CSS Color 4, without its tolerance), so
 * a vivid brand keeps its hue and lightness.
 */
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const at = (chroma: number) => {
    const rad = (h * Math.PI) / 180
    return oklabToLinear(l, chroma * Math.cos(rad), chroma * Math.sin(rad)).map(gamma) as [number, number, number]
  }
  if (l >= 1) return [1, 1, 1]
  if (l <= 0) return [0, 0, 0]
  let rgb = at(c)
  if (inGamut(rgb)) return rgb
  let [low, high] = [0, c]
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    rgb = at(mid)
    if (inGamut(rgb)) low = mid
    else high = mid
  }
  return at(low)
}

function linearToOklch(linear: [number, number, number]): [number, number, number] {
  const [r, g, b] = linear
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

/** A color function of literal channels as RGBA (0-255), or undefined when it holds anything else. */
function evalFunction(name: ColorFunction, args: string): RGBA | undefined {
  const split = splitArgs(args)
  if (!split) return undefined
  const [raw, rawAlpha] = split
  const alpha = rawAlpha === undefined ? 1 : component(rawAlpha, 1)
  if (alpha === undefined) return undefined
  let rgb: [number, number, number]
  if (name === "hsl" || name === "hsla" || name === "hwb") {
    const h = component(raw[0], 1)
    // The modern syntax takes a plain number as a percentage
    const share = (part: string) => (/^[\d.+-]+$/.test(part) ? component(part, 1)! / 100 : component(part, 1))
    const x = share(raw[1])
    const y = share(raw[2])
    if (h === undefined || x === undefined || y === undefined) return undefined
    rgb = name === "hwb" ? hwbToRgb(h, x, y) : hslToRgb(h, Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)))
  } else {
    const lab = name === "lab" || name === "lch"
    const l = component(raw[0], lab ? 100 : 1)
    const a = component(raw[1], lab ? (name === "lab" ? 125 : 150) : 0.4)
    const b = component(raw[2], lab ? 125 : 0.4)
    if (l === undefined || a === undefined || b === undefined) return undefined
    if (name === "oklab" || name === "oklch") {
      const [L, C, H] = name === "oklch" ? [l, a, b] : [l, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360]
      rgb = oklchToRgb(L, C, H)
    } else {
      const [A, B] = name === "lch" ? [a * Math.cos((b * Math.PI) / 180), a * Math.sin((b * Math.PI) / 180)] : [a, b]
      const linear = labToLinear(l, A, B)
      rgb = inGamut(linear.map(gamma)) ? (linear.map(gamma) as [number, number, number]) : oklchToRgb(...linearToOklch(linear))
    }
  }
  const to255 = (v: number) => Math.min(255, Math.max(0, v * 255))
  return { r: to255(rgb[0]), g: to255(rgb[1]), b: to255(rgb[2]), a: Math.min(1, Math.max(0, alpha)) }
}

const FUNCTION_CALL = new RegExp(`\\b(${FUNCTIONS.join("|")})\\(([^()]*)\\)`, "gi")

/** Every color function of literal channels in a CSS value, written as hex or rgba. */
function replaceFunctions(value: string): string {
  return value.replace(FUNCTION_CALL, (call, name: string, args: string) => {
    const color = evalFunction(name.toLowerCase() as ColorFunction, args)
    return color ? formatColor(color) : call
  })
}

const namedHex = (ident: string) => {
  const hex = NAMED[ident.toLowerCase()]
  return hex ? `#${hex}` : undefined
}

/**
 * A brand color as the resolver reads it: a color function or a named color as hex or rgba. Names are written out
 * only where a color stands: the whole value, or an argument of `light-dark()` or `color-mix()` (a name elsewhere
 * may be a font or a keyword).
 */
export function normalizeCssColor(value: string): string {
  const text = replaceFunctions(value.trim())
  const whole = namedHex(text)
  if (whole) return whole
  let out = ""
  const stack: string[] = []
  for (let i = 0; i < text.length; ) {
    const char = text[i]
    if (char === '"' || char === "'") {
      const end = text.indexOf(char, i + 1)
      const stop = end === -1 ? text.length : end + 1
      out += text.slice(i, stop)
      i = stop
      continue
    }
    const ident = /^-*[a-z_][\w-]*/i.exec(text.slice(i))
    if (ident) {
      const word = ident[0]
      const next = text[i + word.length]
      if (next === "(") stack.push(word.toLowerCase())
      const inside = stack[stack.length - 1]
      const hex = next !== "(" && !word.startsWith("-") && (inside === "light-dark" || inside === "color-mix") ? namedHex(word) : undefined
      out += hex ?? word
      i += word.length
      continue
    }
    if (char === "(" && !/[\w-]$/.test(out)) stack.push("")
    if (char === ")") stack.pop()
    out += char
    i++
  }
  return out
}
