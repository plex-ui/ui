/**
 * The system keyboard's keys, as iOS 26 and Gboard (Android 16) lay them out on a phone in portrait. Measured from the
 * iOS 26.2 simulator (iPhone 17 Pro, 402pt) and a Pixel 9 emulator with the Play image (411.43dp, Gboard): margins and
 * gaps stay put as the width changes and the keys take the rest, as the native keyboards do. Heights do not change with
 * the width. Every frame is in points from the keyboard's top-left corner.
 */

export type KeyboardPlatform = "ios" | "android"

/** The field's kind of input: what the keyboard offers for it */
export type KeyboardKind = "text" | "email" | "url" | "search" | "number" | "decimal" | "phone" | "password"

/** The return key: the field's `enterKeyHint` (React Native's `returnKeyType`) */
export type KeyboardReturnKey = "default" | "go" | "search" | "send" | "next" | "done" | "join" | "route" | "previous"

export type KeyRole =
  | "letter"
  | "shift"
  | "delete"
  | "layout"
  | "emoji"
  | "space"
  | "return"
  | "symbol"
  | "digit"
  | "label"
  | "globe"
  | "mic"
  | "hide"
  | "tool"
  | "suggestion"
  | "divider"

/** `key`: a key's own fill; `mod`: a function key's (Gboard); `accent`: the tinted return key; `none`: no fill */
export type KeyFill = "key" | "mod" | "accent" | "none"

export type KeySpec = {
  id: string
  role: KeyRole
  x: number
  y: number
  w: number
  h: number
  fill: KeyFill
  radius: number
  /** The key's words: a letter, "123", a digit */
  label?: string
  /** The letters under a phone pad's digit (ABC) */
  sub?: string
  /** Gboard's small digit at the top row's corner */
  hint?: string
  /** A named glyph the renderer draws (shift, delete, return-search…) */
  icon?: string
}

export type KeyboardLayout = {
  platform: KeyboardPlatform
  /** From the keyboard's top to the screen's bottom edge, the home indicator's or the navigation bar's area included */
  height: number
  /** The navigation bar under Gboard (0 on iOS): the keyboard inset Android reports leaves it out */
  navigationBar: number
  /** The top corners' radius (iOS 26's glass panel) */
  radius: number
  keys: KeySpec[]
}

export type KeyboardLayoutOptions = {
  platform: KeyboardPlatform
  kind: KeyboardKind
  returnKey?: KeyboardReturnKey
  /** The screen's width */
  width: number
  /** Capitals: the field starts a sentence with an auto-capitalizing field */
  caps?: boolean
  /** The field has autocorrection: iOS fills the suggestion bar */
  autocorrect?: boolean
  /** The field takes several lines: its default return key is a new line (Android's single-line default is Done) */
  multiline?: boolean
}

const LETTER_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
const PAD_LETTERS = ["", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ"]

/** The return keys iOS 26 tints and the glyph each draws; the others stay a plain key */
const IOS_RETURN: Record<KeyboardReturnKey, { icon: string; accent: boolean }> = {
  default: { icon: "return", accent: false },
  next: { icon: "next", accent: false },
  previous: { icon: "return", accent: false },
  go: { icon: "go", accent: true },
  join: { icon: "go", accent: true },
  route: { icon: "go", accent: true },
  search: { icon: "search", accent: true },
  send: { icon: "send", accent: true },
  done: { icon: "done", accent: true },
}

const ANDROID_RETURN: Record<KeyboardReturnKey, string> = {
  default: "return",
  previous: "return",
  next: "next",
  go: "go",
  join: "go",
  route: "go",
  search: "search",
  send: "send",
  done: "done",
}

const round = (value: number) => Math.round(value * 100) / 100

function key(spec: KeySpec): KeySpec {
  return { ...spec, x: round(spec.x), y: round(spec.y), w: round(spec.w), h: round(spec.h) }
}

// iOS 26: 6.5 at the sides, 6 between keys, rows of 43 every 54 under the 52 of the suggestion bar
const IOS = { side: 6.5, gap: 6, rowTop: 52, rowPitch: 54, rowHeight: 43, radius: 8.5, height: 335, panel: 30 }
// iOS 26's phone pad: three keys of 48 every 54 from 24, 1.67 from the left edge and 7.33 from the right
const IOS_PAD = { left: 1.67, right: 7.33, gap: 6, rowTop: 24, rowPitch: 54, rowHeight: 48, radius: 9.5, height: 308 }
// Gboard: 4.57 at the sides, 5.33 between keys, rows of 47.24 every 59.05 under its 48 of tools; the navigation bar's 24
const GBOARD = { side: 4.57, gap: 5.33, rowTop: 52.19, rowPitch: 59.05, rowHeight: 47.24, radius: 6, height: 336.38, nav: 24 }
// Gboard's number pad: four capsules of 53.33 every 59.05 from 8
const GBOARD_PAD = { side: 4.19, gap: 4.57, rowTop: 8, rowPitch: 59.05, rowHeight: 53.33, height: 292.19 }

function iosText({ kind, returnKey = "default", width, caps, autocorrect }: KeyboardLayoutOptions): KeyboardLayout {
  const { side, gap, rowTop, rowPitch, rowHeight: h, radius } = IOS
  const k = (width - 2 * side - 9 * gap) / 10
  const scale = k / 33.5
  const keys: KeySpec[] = []
  const y = (row: number) => rowTop + row * rowPitch
  const letter = (char: string, x: number, row: number) =>
    keys.push(key({ id: `key-${char}`, role: "letter", x, y: y(row), w: k, h, fill: "key", radius, label: caps ? char.toUpperCase() : char }))
  Array.from(LETTER_ROWS[0]).forEach((char, i) => letter(char, side + i * (k + gap), 0))
  Array.from(LETTER_ROWS[1]).forEach((char, i) => letter(char, side + (k + gap) / 2 + i * (k + gap), 1))
  const third = 7 * k + 6 * gap
  Array.from(LETTER_ROWS[2]).forEach((char, i) => letter(char, (width - third) / 2 + i * (k + gap), 2))
  const shift = 45.5 * scale
  keys.push(key({ id: "shift", role: "shift", x: side, y: y(2), w: shift, h, fill: "key", radius, icon: caps ? "shift-on" : "shift" }))
  keys.push(key({ id: "delete", role: "delete", x: width - side - shift, y: y(2), w: shift, h, fill: "key", radius, icon: "delete" }))
  // The bottom row: 123 and emoji, the space, the field's keys, return
  const small = 43.33 * scale
  const search = kind === "search"
  const back = IOS_RETURN[search && returnKey === "default" ? "go" : returnKey]
  const returnWidth = (search ? 63 : 93) * scale
  const returnX = width - side - returnWidth
  keys.push(key({ id: "layout", role: "layout", x: side, y: y(3), w: small, h, fill: "key", radius, label: "123" }))
  keys.push(key({ id: "emoji", role: "emoji", x: side + small + gap, y: y(3), w: small, h, fill: "key", radius, icon: "emoji" }))
  const spaceX = side + 2 * (small + gap)
  const spaceEnd = returnX - gap
  const extras: Array<{ id: string; label: string; w: number }> =
    kind === "email"
      ? [{ id: "at", label: "@", w: small }, { id: "dot", label: ".", w: small }]
      : kind === "url"
        ? (() => {
            const each = (spaceEnd - spaceX - 2 * gap) / 3
            return [{ id: "dot", label: ".", w: each }, { id: "slash", label: "/", w: each }, { id: "com", label: ".com", w: each }]
          })()
        : search
          ? [{ id: "dot", label: ".", w: k }]
          : []
  const extrasWidth = extras.reduce((sum, extra) => sum + extra.w + gap, 0)
  if (kind !== "url") keys.push(key({ id: "space", role: "space", x: spaceX, y: y(3), w: spaceEnd - spaceX - extrasWidth, h, fill: "key", radius }))
  let at = kind === "url" ? spaceX : spaceEnd - extrasWidth + gap
  for (const extra of extras) {
    keys.push(key({ id: `key-${extra.id}`, role: "symbol", x: at, y: y(3), w: extra.w, h, fill: "key", radius, label: extra.label }))
    at += extra.w + gap
  }
  keys.push(key({ id: "return", role: "return", x: returnX, y: y(3), w: returnWidth, h, fill: back.accent ? "accent" : "key", radius, icon: back.icon }))
  // Under the keys: the globe and the microphone, 42.67 from each side
  keys.push(key({ id: "globe", role: "globe", x: 42.67 - 16, y: 295 - 16, w: 32, h: 32, fill: "none", radius: 0, icon: "globe" }))
  keys.push(key({ id: "mic", role: "mic", x: width - 42.67 - 16, y: 295 - 16, w: 32, h: 32, fill: "none", radius: 0, icon: "mic" }))
  // The suggestion bar: three cells over the keys, the first words of an empty field when it corrects
  const cell = width / 3
  const words = kind === "password" || autocorrect === false ? ["", "", ""] : ["I", "The", "I’m"]
  words.forEach((word, i) => keys.push(key({ id: `suggestion-${i}`, role: "suggestion", x: i * cell, y: 6, w: cell, h: 38, fill: "none", radius: 0, label: word })))
  for (const i of [1, 2]) keys.push(key({ id: `divider-${i}`, role: "divider", x: i * cell - 0.5, y: 12.5, w: 1, h: 25, fill: "none", radius: 0 }))
  return { platform: "ios", height: IOS.height, navigationBar: 0, radius: IOS.panel, keys }
}

function iosPad({ kind, width }: KeyboardLayoutOptions): KeyboardLayout {
  const { left, right, gap, rowTop, rowPitch, rowHeight: h, radius } = IOS_PAD
  const w = (width - left - right - 2 * gap) / 3
  const keys: KeySpec[] = []
  const at = (column: number, row: number) => ({ x: left + column * (w + gap), y: rowTop + row * rowPitch })
  for (let digit = 1; digit <= 9; digit++) {
    const { x, y } = at((digit - 1) % 3, Math.floor((digit - 1) / 3))
    keys.push(key({ id: `key-${digit}`, role: "digit", x, y, w, h, fill: "key", radius, label: String(digit), sub: PAD_LETTERS[digit - 1] }))
  }
  const corner = kind === "decimal" ? "." : kind === "phone" ? "+*#" : ""
  if (corner) keys.push(key({ id: "corner", role: "label", ...at(0, 3), w, h, fill: "none", radius, label: corner }))
  keys.push(key({ id: "key-0", role: "digit", ...at(1, 3), w, h, fill: "key", radius, label: "0" }))
  keys.push(key({ id: "delete", role: "delete", ...at(2, 3), w, h, fill: "none", radius, icon: "delete-pad" }))
  return { platform: "ios", height: IOS_PAD.height, navigationBar: 0, radius: IOS.panel, keys }
}

function gboardText({ kind, returnKey = "default", width, caps }: KeyboardLayoutOptions): KeyboardLayout {
  const { side, gap, rowTop, rowPitch, rowHeight: h, radius } = GBOARD
  const k = (width - 2 * side - 9 * gap) / 10
  const scale = k / 35.43
  const keys: KeySpec[] = []
  const y = (row: number) => rowTop + row * rowPitch
  const letter = (char: string, x: number, row: number, hint?: string) =>
    keys.push(key({ id: `key-${char}`, role: "letter", x, y: y(row), w: k, h, fill: "key", radius, label: caps ? char.toUpperCase() : char, hint }))
  const password = kind === "password"
  Array.from(LETTER_ROWS[0]).forEach((char, i) => letter(char, side + i * (k + gap), 0, password ? undefined : String((i + 1) % 10)))
  Array.from(LETTER_ROWS[1]).forEach((char, i) => letter(char, side + (k + gap) / 2 + i * (k + gap), 1))
  const wide = 55.62 * scale
  Array.from(LETTER_ROWS[2]).forEach((char, i) => letter(char, side + wide + gap + i * (k + gap), 2))
  keys.push(key({ id: "shift", role: "shift", x: side, y: y(2), w: wide, h, fill: "mod", radius, icon: caps ? "shift-on" : "shift" }))
  keys.push(key({ id: "delete", role: "delete", x: width - side - wide, y: y(2), w: wide, h, fill: "mod", radius, icon: "delete" }))
  // ?123, the field's symbol, emoji (not for a password), the space, the period, return
  keys.push(key({ id: "layout", role: "layout", x: side, y: y(3), w: wide, h, fill: "mod", radius: h / 2, label: "?123" }))
  let x = side + wide + gap
  const symbol = kind === "email" ? "@" : kind === "url" ? "/" : ","
  keys.push(key({ id: "key-symbol", role: "symbol", x, y: y(3), w: k, h, fill: "mod", radius, label: symbol }))
  x += k + gap
  if (!password) {
    keys.push(key({ id: "emoji", role: "emoji", x, y: y(3), w: k, h, fill: "key", radius, icon: "emoji" }))
    x += k + gap
  }
  const returnX = width - side - wide
  const dotX = returnX - gap - k
  keys.push(key({ id: "space", role: "space", x, y: y(3), w: dotX - gap - x, h, fill: "key", radius }))
  keys.push(key({ id: "key-dot", role: "symbol", x: dotX, y: y(3), w: k, h, fill: "mod", radius, label: "." }))
  keys.push(key({ id: "return", role: "return", x: returnX, y: y(3), w: wide, h, fill: "mod", radius: h / 2, icon: ANDROID_RETURN[returnKey] }))
  // Over the keys: Gboard's tools, or a row of digits over a password's keys
  const pitch = (width - 2 * 22.7) / 6
  if (password) {
    Array.from("1234567890").forEach((digit, i) =>
      keys.push(key({ id: `top-${digit}`, role: "label", x: side + i * (k + gap), y: 4, w: k, h: 40, fill: "none", radius: 0, label: digit })),
    )
  } else {
    ;["apps", "sticker", "gif", "clipboard", "settings", "palette", "mic"].forEach((tool, i) =>
      keys.push(key({ id: `tool-${tool}`, role: "tool", x: 22.7 + i * pitch - 17, y: 21.9 - 17, w: 34, h: 34, fill: "none", radius: 17, icon: tool })),
    )
  }
  keys.push(key({ id: "hide", role: "hide", x: 43.05 - 12, y: GBOARD.height - GBOARD.nav / 2 - 12, w: 24, h: 24, fill: "none", radius: 0, icon: "hide" }))
  return { platform: "android", height: GBOARD.height, navigationBar: GBOARD.nav, radius: 0, keys }
}

function gboardPad({ kind, returnKey = "default", width }: KeyboardLayoutOptions): KeyboardLayout {
  const { side, gap, rowTop, rowPitch, rowHeight: h } = GBOARD_PAD
  const w = (width - 2 * side - 3 * gap) / 4
  const keys: KeySpec[] = []
  const at = (column: number, row: number) => ({ x: side + column * (w + gap), y: rowTop + row * rowPitch })
  const phone = kind === "phone"
  for (let digit = 1; digit <= 9; digit++) {
    keys.push(
      key({
        id: `key-${digit}`,
        role: "digit",
        ...at((digit - 1) % 3, Math.floor((digit - 1) / 3)),
        w,
        h,
        fill: "key",
        radius: h / 2,
        label: String(digit),
        sub: phone ? PAD_LETTERS[digit - 1] || undefined : undefined,
      }),
    )
  }
  keys.push(key({ id: "corner", role: "symbol", ...at(0, 3), w, h, fill: "key", radius: h / 2, label: phone ? "*#" : "," }))
  keys.push(key({ id: "key-0", role: "digit", ...at(1, 3), w, h, fill: "key", radius: h / 2, label: "0", sub: phone ? "+" : undefined }))
  keys.push(key({ id: "key-dot", role: "symbol", ...at(2, 3), w, h, fill: "key", radius: h / 2, label: "." }))
  keys.push(key({ id: "key-dash", role: "symbol", ...at(3, 0), w, h, fill: "mod", radius: h / 2, label: "–" }))
  keys.push(key({ id: "space", role: "space", ...at(3, 1), w, h, fill: "mod", radius: h / 2, icon: "space" }))
  keys.push(key({ id: "delete", role: "delete", ...at(3, 2), w, h, fill: "mod", radius: h / 2, icon: "delete" }))
  keys.push(key({ id: "return", role: "return", ...at(3, 3), w, h, fill: "mod", radius: h / 2, icon: ANDROID_RETURN[returnKey] }))
  keys.push(key({ id: "hide", role: "hide", x: 43.05 - 12, y: GBOARD_PAD.height - GBOARD.nav / 2 - 12, w: 24, h: 24, fill: "none", radius: 0, icon: "hide" }))
  return { platform: "android", height: GBOARD_PAD.height, navigationBar: GBOARD.nav, radius: 0, keys }
}

const PADS: KeyboardKind[] = ["number", "decimal", "phone"]

/** The keys of the system keyboard for a field, at a screen's width */
export function keyboardLayout(options: KeyboardLayoutOptions): KeyboardLayout {
  const pad = PADS.includes(options.kind)
  if (options.platform === "ios") return pad ? iosPad(options) : iosText(options)
  // React Native's Android field with no returnKeyType ends on Done, unless it takes several lines
  const android = (options.returnKey ?? "default") === "default" && !options.multiline ? { ...options, returnKey: "done" as const } : options
  return pad ? gboardPad(android) : gboardText(android)
}
