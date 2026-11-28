import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentRef, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { type IconComponent } from "../Icon/createIcon"
import { useTheme } from "../../theme/ThemeProvider"
import { clearDrawnKeyboard, setDrawnKeyboard } from "../../internal/keyboard"
import ChevronDownMd from "../../icons/plex/ChevronDownMd"
import Gif from "../../icons/tabler/Gif"
import {
  GBOARD_GLYPH_SIZE as G,
  GboardApps,
  GboardClipboard,
  GboardDash,
  GboardDelete,
  GboardDone,
  GboardEmoji,
  GboardMic,
  GboardGo,
  GboardNext,
  GboardPadPlus,
  GboardPalette,
  GboardReturn,
  GboardSearch,
  GboardSend,
  GboardSettings,
  GboardShift,
  GboardShiftLock,
  GboardShiftOn,
  GboardSpace,
  GboardSticker,
  IOS_GLYPH_SIZE as S,
  IosDelete,
  IosDeletePad,
  IosDone,
  IosEmoji,
  IosEmojiFilled,
  IosGlobe,
  IosGo,
  IosMic,
  IosNext,
  IosPadHash,
  IosPadPlus,
  IosPadStar,
  IosPasswordKey,
  IosReturn,
  IosSearch,
  IosSend,
  IosShift,
  IosShiftLock,
  IosShiftOn,
} from "./glyphs"
import { keyboardLayout, type KeySpec, type KeyboardKind, type KeyboardLayout, type KeyboardPlatform, type KeyboardReturnKey } from "./layout"

export { keyboardLayout, type KeyboardKind, type KeyboardLayout, type KeyboardPlatform, type KeyboardReturnKey, type KeySpec } from "./layout"

/** Gboard's symbols at their sizes: its @ and / smaller than its comma and period (the emulator's) */
const GBOARD_SYMBOL: Record<string, number> = { "@": 20, "/": 18, "* #": 22 }

const IOS_EMOJI_DARK: [IconComponent, number] = [IosEmojiFilled, S.emoji]

/** The glyph of each named key, and its size: the drawn glyph's, as the native keyboard draws it */
const GLYPHS: Record<KeyboardPlatform, Record<string, [IconComponent, number]>> = {
  ios: {
    shift: [IosShift, S.shift],
    "shift-on": [IosShiftOn, S.shiftOn],
    "shift-lock": [IosShiftLock, S.shiftOn],
    delete: [IosDelete, S.delete],
    "delete-pad": [IosDeletePad, S.deletePad],
    emoji: [IosEmoji, S.emoji],
    return: [IosReturn, S.return],
    next: [IosNext, S.chevron],
    go: [IosGo, S.arrow],
    search: [IosSearch, S.arrow],
    send: [IosSend, S.arrow],
    done: [IosDone, S.done],
    globe: [IosGlobe, S.globe],
    mic: [IosMic, S.mic],
  },
  android: {
    shift: [GboardShift, G.key],
    "shift-on": [GboardShiftOn, G.key],
    "shift-lock": [GboardShiftLock, G.key],
    delete: [GboardDelete, G.key],
    emoji: [GboardEmoji, G.small],
    return: [GboardReturn, G.key],
    next: [GboardNext, G.key],
    go: [GboardGo, G.key],
    search: [GboardSearch, G.key],
    send: [GboardSend, G.key],
    done: [GboardDone, G.key],
    space: [GboardSpace, G.small],
    dash: [GboardDash, G.small],
    // The navigation bar's: a small chevron, 10dp wide
    hide: [ChevronDownMd, 17.3],
    apps: [GboardApps, G.tool],
    sticker: [GboardSticker, G.tool],
    gif: [Gif, 24],
    clipboard: [GboardClipboard, G.tool],
    settings: [GboardSettings, G.tool],
    palette: [GboardPalette, G.tool],
    mic: [GboardMic, G.tool],
  },
}

/** The keyboards' own colors: they are the system's, not the app's, so the theme's tokens do not reach them */
const COLORS: Record<KeyboardPlatform, Record<"light" | "dark", Palette>> = {
  ios: {
    light: { panel: "#E2E4E8", key: "#FFFFFF", mod: "#FFFFFF", accent: "#007AFF", ink: "#000000", onAccent: "#FFFFFF", onMod: "#000000", muted: "#3C3C43", hint: "#3C3C43", dim: "#3C3C43", nav: "#3C3C43", divider: "#C2C4C9", suggestion: "#36383B" },
    dark: { panel: "#171717", key: "#3D3D3D", mod: "#3D3D3D", accent: "#0A84FF", ink: "#FFFFFF", onAccent: "#FFFFFF", onMod: "#FFFFFF", muted: "#EBEBF5", hint: "#EBEBF5", dim: "#EBEBF5", nav: "#EBEBF5", divider: "#3A3A3C", suggestion: "#ACACAC" },
  },
  android: {
    light: { panel: "#EEEDF4", key: "#FFFFFF", mod: "#DCE2F9", accent: "#DCE2F9", ink: "#1A1B20", onAccent: "#404659", onMod: "#404659", muted: "#74777F", hint: "#44464F", dim: "#9E9EA4", nav: "#666666", divider: "#C4C6D0", suggestion: "#1A1B20" },
    dark: { panel: "#1E1F25", key: "#33343A", mod: "#404659", accent: "#404659", ink: "#E2E2E9", onAccent: "#DCE2F9", onMod: "#DCE2F9", muted: "#8E9099", hint: "#C5C6D0", dim: "#68686F", nav: "#FFFFFF", divider: "#44474F", suggestion: "#E2E2E9" },
  },
}

/**
 * `suggestion`: the words of iOS's suggestion bar, a little softer than the keys' (the simulator's 54,56,59 and 172).
 * Gboard's: `onMod` its function keys' glyphs (slate on their blue), `hint` the digits over its top row and the phone
 * pad's letters, `dim` a tool it cannot offer, `nav` the navigation bar's chevron (the emulator's)
 */
type Palette = Record<"panel" | "key" | "mod" | "accent" | "ink" | "onAccent" | "onMod" | "muted" | "hint" | "dim" | "nav" | "divider" | "suggestion", string>

/** The focused field, as the keyboard reads it */
export type KeyboardField = {
  kind: KeyboardKind
  returnKey: KeyboardReturnKey
  /** Capitals for the next letter; `"lock"` is Caps Lock */
  caps: boolean | "lock"
  autocorrect: boolean
  /** A field of several lines (a textarea) */
  multiline?: boolean
}

export type SystemKeyboardProps = {
  /**
   * `auto` draws the keyboard while a field on the page has focus; `hidden` never draws it (a screenshot of a form as it
   * stands). Defaults to `auto`.
   */
  mode?: "auto" | "hidden"
  /** Draws the keyboard for this field with no field focused (a still of the keyboard) */
  field?: Partial<KeyboardField>
}

// ---------------------------------------------------------------------------------------------------------------------
// The field

const NOT_TYPED = ["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]
/** The attributes the keyboard reads off its field */
const ATTRIBUTES = ["type", "inputmode", "enterkeyhint", "readonly", "disabled", "autocapitalize", "autocorrect", "spellcheck", "virtualkeyboardpolicy", "contenteditable"]
const RETURN_KEYS: KeyboardReturnKey[] = ["go", "search", "send", "next", "done", "join", "route", "previous"]

/** Capitals for the next letter: an empty field, or the start of a sentence or a word, as the field asks */
function capsFor(mode: string, value: string) {
  if (mode === "off" || mode === "none") return false
  if (mode === "characters") return true
  if (value.length === 0) return true
  if (mode === "words") return /\s$/.test(value)
  return /[.!?]\s+$/.test(value)
}

/** The part of a DOM element the keyboard reads (the package builds without the DOM's types) */
type DomField = {
  tagName?: string
  type?: string
  value?: string
  readOnly?: boolean
  disabled?: boolean
  isContentEditable?: boolean
  textContent?: string | null
  getAttribute?: (name: string) => string | null
}

type DomDocument = {
  activeElement?: unknown
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

const page = () => (globalThis as { document?: DomDocument }).document

/** The field a keyboard serves, or null for an element that takes no typing */
export function readKeyboardField(element: unknown): KeyboardField | null {
  const field = element as DomField | null
  if (!field || typeof field.getAttribute !== "function") return null
  const attribute = (name: string) => field.getAttribute!(name)
  const tag = field.tagName?.toUpperCase()
  const input = tag === "INPUT"
  const area = tag === "TEXTAREA"
  if (!input && !area && !field.isContentEditable) return null
  if (input && NOT_TYPED.includes(field.type ?? "text")) return null
  if (field.readOnly || field.disabled) return null
  // A field that opens no keyboard: React Native's `showSoftInputOnFocus={false}`, or `inputmode="none"`
  if (attribute("virtualkeyboardpolicy") === "manual") return null
  const mode = attribute("inputmode")
  if (mode === "none") return null
  const type = input ? (field.type ?? "text") : "text"
  const kind: KeyboardKind =
    mode === "numeric" ? "number"
    : mode === "decimal" ? "decimal"
    : mode === "tel" || type === "tel" ? "phone"
    : mode === "email" || type === "email" ? "email"
    : mode === "url" || type === "url" ? "url"
    : mode === "search" || type === "search" ? "search"
    : type === "number" ? "decimal"
    : type === "password" ? "password"
    : "text"
  const hint = attribute("enterkeyhint") as KeyboardReturnKey | null
  const returnKey = hint && RETURN_KEYS.includes(hint) ? hint : "default"
  const value = (input || area ? field.value : field.textContent) ?? ""
  const caps = kind === "text" || kind === "search" ? capsFor(attribute("autocapitalize") ?? "sentences", value) : false
  const autocorrect = attribute("autocorrect") !== "off" && attribute("spellcheck") !== "false"
  return { kind, returnKey, caps, autocorrect, multiline: area }
}

/** The focused field of the document, followed as focus and its value change */
function useFocusedField(enabled: boolean) {
  const [field, setField] = useState<KeyboardField | null>(null)
  useEffect(() => {
    const doc = page()
    if (!enabled || !doc) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const read = () => setField(readKeyboardField(doc.activeElement))
    // Focus moving from one field to the next blurs the first: the keyboard waits for the next before it goes
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(read, 0)
    }
    // A focused field's props may change under it (read-only, its type, its return key): its attributes are watched
    const Observer = (globalThis as { MutationObserver?: new (callback: () => void) => { observe(target: unknown, options: object): void; disconnect(): void } }).MutationObserver
    const watcher = Observer ? new Observer(read) : null
    let watched: unknown = null
    const watch = () => {
      if (!watcher || doc.activeElement === watched) return
      watcher.disconnect()
      watched = doc.activeElement
      if (watched) watcher.observe(watched, { attributes: true, attributeFilter: ATTRIBUTES })
    }
    const focus = () => {
      watch()
      read()
    }
    // A focused field taken off the page sends no focusout: the page's removals are watched for it
    const removals = Observer
      ? new Observer(() => {
          if (doc.activeElement !== watched) focus()
        })
      : null
    removals?.observe(doc, { childList: true, subtree: true })
    focus()
    doc.addEventListener("focusin", focus)
    doc.addEventListener("focusout", later)
    doc.addEventListener("input", read)
    return () => {
      clearTimeout(timer)
      watcher?.disconnect()
      removals?.disconnect()
      doc.removeEventListener("focusin", focus)
      doc.removeEventListener("focusout", later)
      doc.removeEventListener("input", read)
    }
  }, [enabled])
  return enabled ? field : null
}

// ---------------------------------------------------------------------------------------------------------------------
// One keyboard on a page: a hidden one, else the first one mounted draws; the others wait (a still one draws on its own)

let owner: symbol | null = null
const owners: Array<{ id: symbol; rank: number }> = []
const ownerListeners = new Set<() => void>()
// A hidden keyboard wins (a page that wants none), then the first one mounted
const elect = () => {
  const top = Math.max(...owners.map((entry) => entry.rank))
  owner = owners.find((entry) => entry.rank === top)?.id ?? null
  ownerListeners.forEach((listener) => listener())
}
function claim(id: symbol, rank: number) {
  owners.push({ id, rank })
  elect()
  return () => {
    owners.splice(owners.findIndex((entry) => entry.id === id), 1)
    elect()
  }
}
function subscribeOwner(listener: () => void) {
  ownerListeners.add(listener)
  return () => {
    ownerListeners.delete(listener)
  }
}

/** A phone or a tablet: its own keyboard comes up, so none is drawn over it */
/**
 * React DOM's portal on the web, to draw the keyboard on the page's body: inside the app it stays under a modal's
 * layer (a Bottom Sheet's field). A require in a try is an optional dependency to Metro, so a native app needs no
 * react-dom; with none the keyboard draws in place.
 */
type Portal = (children: ReactNode, container: unknown) => ReactNode
const portal: Portal | null = (() => {
  if (Platform.OS !== "web") return null
  try {
    return (require("react-dom") as { createPortal?: Portal }).createPortal ?? null
  } catch {
    return null
  }
})()

declare const require: (name: string) => unknown

function touchScreen() {
  const view = globalThis as { matchMedia?: (query: string) => { matches: boolean }; navigator?: { maxTouchPoints?: number } }
  // A touch screen brings up its own keyboard, a mouse plugged in or not: a keyboard is drawn for a fine pointer alone
  const fine = typeof view.matchMedia === "function" && view.matchMedia("(hover: hover) and (pointer: fine)").matches
  return !fine || (view.navigator?.maxTouchPoints ?? 0) > 0
}

// ---------------------------------------------------------------------------------------------------------------------
// Drawing

function KeyGlyph({ spec, platform, color, dark }: { spec: KeySpec; platform: KeyboardPlatform; color: string; dark: boolean }) {
  // iOS's emoji face is filled at night: a light disc, its eyes and mouth cut out of it
  const glyph = spec.icon === "emoji" && platform === "ios" && dark ? IOS_EMOJI_DARK : spec.icon ? GLYPHS[platform][spec.icon] : undefined
  if (!glyph) return null
  const [Glyph, size] = glyph
  return <Glyph size={size} color={color} />
}

function KeyLabel({ spec, platform, palette }: { spec: KeySpec; platform: KeyboardPlatform; palette: Palette }) {
  const theme = useTheme()
  const ios = platform === "ios"
  const ink = spec.fill === "accent" ? palette.onAccent : spec.fill === "mod" ? palette.onMod : palette.ink
  const face = (size: number, weight: "regular" | "medium" | "semibold" = "regular", lineHeight = Math.round(size * 1.2)) => ({
    ...theme.font(weight),
    fontSize: size,
    lineHeight,
    letterSpacing: 0,
    color: ink,
  })
  // A symbol set off its key's middle, as iOS sets it
  const nudge = spec.nudge ? { transform: [{ translateY: spec.nudge }] } : null
  switch (spec.role) {
    case "letter":
      // iOS draws its capitals smaller than its small letters: a capital 15.3pt tall, a small letter's x-height 13pt
      // (the simulator's keys), Inter's at 21 and 24
      if (ios) {
        const capital = spec.label != null && spec.label !== spec.label.toLowerCase()
        return <Text style={[face(capital ? 21 : 24), capital ? styles.iosCapital : styles.iosLetter]}>{spec.label}</Text>
      }
      return <Text style={[face(26.8), styles.gboardLetter]}>{spec.label}</Text>
    case "layout":
      return <Text style={[face(ios ? 18 : 17, ios ? "regular" : "medium"), ios ? styles.iosLayout : styles.gboardLayout]}>{spec.label}</Text>
    case "suggestion":
      // iOS's 17pt text tracks -0.43
      return <Text style={[face(17), { color: palette.suggestion, letterSpacing: ios ? -0.43 : 0 }]}>{spec.label}</Text>
    case "autofill":
      // The saved passwords: a key and the word, gray as the suggestions
      return (
        <View style={styles.autofill}>
          <IosPasswordKey size={24} color={palette.suggestion} style={styles.autofillKey} />
          <Text style={[face(17), { color: palette.suggestion, letterSpacing: -0.43 }]}>{spec.label}</Text>
        </View>
      )
    case "symbol":
      // iOS's @ and / are smaller than its period; Gboard's @ and / too
      return (
        <Text style={[face(spec.size ?? (spec.label === ".com" ? 18 : !ios ? GBOARD_SYMBOL[spec.label ?? ""] ?? 24 : spec.label === "@" || spec.label === "/" ? 20 : 22)), nudge]}>
          {spec.label}
        </Text>
      )
    case "label":
      if (ios && spec.label === "+*#") {
        // The phone pad's corner: three drawn symbols, 15.5 apart, over the key's middle
        return (
          <View style={styles.padSymbols}>
            <IosPadPlus size={12} color={ink} />
            <IosPadStar size={12} color={ink} />
            <IosPadHash size={12} color={ink} />
          </View>
        )
      }
      return <Text style={[face(20), nudge]}>{spec.label}</Text>
    case "digit":
      if (ios) {
        // A 15.3pt digit and its letters 6.7pt tall, spaced 1.67, under it (the simulator's pad)
        return (
          <View style={styles.iosDigit}>
            <Text style={face(21, "regular", 25)}>{spec.label}</Text>
            <Text style={[face(9.2, "semibold", 11), styles.iosLetters]}>{spec.sub || " "}</Text>
          </View>
        )
      }
      // The phone pad's: the digit 7.8 left of the key's middle, its letters (the 0's plus) in a column 24.4 right of it,
      // both on the digit's middle; the number pad's digit in the middle
      if (spec.sub == null) return <Text style={[face(29, "regular", 34), styles.gboardPadDigit]}>{spec.label}</Text>
      return (
        <View style={StyleSheet.absoluteFill}>
          <Text style={[face(29, "regular", 34), styles.gboardPhoneDigit, { left: spec.w / 2 - 7.8 - 20, top: (spec.h - 34) / 2 + 0.25 }]}>{spec.label}</Text>
          {spec.sub === "+" ? (
            <GboardPadPlus size={9.52} color={ink} style={[styles.gboardPhonePlus, { left: spec.w / 2 + 24.27 - 4.76, top: spec.h / 2 + 2.54 - 4.76 }]} />
          ) : spec.sub ? (
            <Text style={[face(13.6, "regular", 16), styles.gboardLetters, { color: palette.hint, left: spec.w / 2 + 24.4 - 30, top: (spec.h - 16) / 2 + 0.43 }]}>{spec.sub}</Text>
          ) : null}
        </View>
      )
    default:
      return null
  }
}

function Key({ spec, platform, palette, dark }: { spec: KeySpec; platform: KeyboardPlatform; palette: Palette; dark: boolean }) {
  const theme = useTheme()
  const fill = spec.fill === "none" ? "transparent" : palette[spec.fill]
  // Gboard's function keys draw their glyphs slate; a tool it cannot offer stands dimmed; the navigation bar's chevron
  const glyphColor =
    spec.fill === "accent" ? palette.onAccent : spec.fill === "mod" ? palette.onMod : spec.role === "hide" ? palette.nav : spec.dim ? palette.dim : palette.ink
  if (spec.role === "divider") {
    return <View testID={`keyboard-${spec.id}`} style={[styles.key, frame(spec), { backgroundColor: palette.divider }]} />
  }
  return (
    <View testID={`keyboard-${spec.id}`} style={[styles.key, frame(spec), { backgroundColor: fill, borderRadius: spec.radius }]}>
      {spec.icon ? <KeyGlyph spec={spec} platform={platform} color={glyphColor} dark={dark} /> : <KeyLabel spec={spec} platform={platform} palette={palette} />}
      {spec.hint ? <Text style={[styles.hint, theme.font("medium"), { color: palette.hint }]}>{spec.hint}</Text> : null}
    </View>
  )
}

const frame = (spec: KeySpec) => ({ left: spec.x, top: spec.y, width: spec.w, height: spec.h })

/** The keyboard drawn for a field: its keys, at a width */
export function KeyboardKeys({ layout, scheme }: { layout: KeyboardLayout; scheme: "light" | "dark" }) {
  const palette = COLORS[layout.platform][scheme]
  return (
    <View
      testID="keyboard"
      style={[
        styles.panel,
        { height: layout.height, backgroundColor: palette.panel, borderTopLeftRadius: layout.radius, borderTopRightRadius: layout.radius },
      ]}
    >
      {layout.keys.map((spec) => (
        <Key key={spec.id} spec={spec} platform={layout.platform} palette={palette} dark={scheme === "dark"} />
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------------------------------------------------
// The motion

/**
 * How the keyboard comes up and goes, measured frame by frame (the iOS 26.2 and 27.2 simulators' keyboard layout guide,
 * the Android 15 emulator's screen): iOS rides a critically damped spring of ω 23.6 rad/s, which UIKit reports as curve
 * 7 over 0.3833s (the spring is done to 0.1% there), both ways; Gboard AOSP's IME inset animation, PathInterpolator(0.2,
 * 0, 0, 1) over 285ms, both ways.
 */
const IOS_SPRING = 23.6
const IOS_DURATION = 383
const springAt = (seconds: number) => 1 - (1 + IOS_SPRING * seconds) * Math.exp(-IOS_SPRING * seconds)
const IOS_END = springAt(IOS_DURATION / 1000)
const MOTION = {
  ios: { duration: IOS_DURATION, easing: (x: number) => (x >= 1 ? 1 : springAt((x * IOS_DURATION) / 1000) / IOS_END) },
  android: { duration: 285, easing: Easing.bezier(0.2, 0, 0, 1) },
}

function reducedMotion() {
  const match = (globalThis as { matchMedia?: (query: string) => { matches: boolean } }).matchMedia
  return match?.("(prefers-reduced-motion: reduce)").matches ?? false
}

/** The keyboard's way up (1) and down (0), from under the screen's bottom edge; `onGone` once it is down */
function useKeyboardMotion(up: boolean, android: boolean, onGone: () => void) {
  const [progress] = useState(() => new Animated.Value(up ? 1 : 0))
  useEffect(() => {
    const { duration, easing } = MOTION[android ? "android" : "ios"]
    const animation = Animated.timing(progress, { toValue: up ? 1 : 0, duration: reducedMotion() ? 0 : duration, easing, useNativeDriver: false })
    animation.start(({ finished }) => {
      if (finished && !up) onGone()
    })
    return () => animation.stop()
  }, [progress, up, android, onGone])
  return progress
}

function sameField(a: KeyboardField, b: KeyboardField | null) {
  return b != null && a.kind === b.kind && a.returnKey === b.returnKey && a.caps === b.caps && a.autocorrect === b.autocorrect && a.multiline === b.multiline
}

/**
 * The phone's system keyboard, drawn on the web: iOS 26's or Gboard's, in the theme's platform and scheme, for the
 * field that has focus (its type, `inputMode` and `returnKeyType`). It stands at the bottom of the window, as wide as
 * the window, and its height is the keyboard inset overlays rise by (BottomSheet, Dialog, PhoneInput). Its keys do not
 * type: the reader types with their own keyboard. A browser on a touch screen brings up its own keyboard, so nothing
 * is drawn there; on iOS and Android the system's keyboard stands in its place and this draws nothing. One keyboard
 * draws on a page however many are mounted; a hidden one keeps the others from drawing.
 */
export function SystemKeyboard({ mode = "auto", field: still }: SystemKeyboardProps): ReactNode {
  const theme = useTheme()
  const web = Platform.OS === "web"
  const [id] = useState(() => Symbol("keyboard"))
  const [touch] = useState(touchScreen)
  const present = web && !touch
  const enabled = present && mode === "auto"
  // A still keyboard stands at the foot of its own box, on its own: it neither takes the page's keyboard nor its inset
  const local = still != null
  const rank = mode === "hidden" ? 1 : 0
  useEffect(() => (present && !local ? claim(id, rank) : undefined), [present, local, id, rank])
  const owning = useSyncExternalStore(subscribeOwner, () => owner === id, () => false)
  const drawing = local || owning
  const focused = useFocusedField(enabled && drawing && !still)
  const field: KeyboardField | null = still
    ? { kind: still.kind ?? "text", returnKey: still.returnKey ?? "default", caps: still.caps ?? false, autocorrect: still.autocorrect ?? true, multiline: still.multiline ?? false }
    : focused
  // The field the keyboard is up for; while it goes down it keeps the last one's keys, unless another keyboard took the
  // page (a hidden one): the inset is that one's then, and these keys go at once
  const target = enabled && drawing ? field : null
  const [kept, setKept] = useState<KeyboardField | null>(target)
  if (target && !sameField(target, kept)) setKept(target)
  const drawn = target ?? (drawing ? kept : null)
  const forget = useCallback(() => setKept(null), [])
  // It slides up from under the screen's edge as the field takes focus and back as it loses it; from one field to the
  // next it stays, and only its keys change
  const progress = useKeyboardMotion(target != null, theme.isAndroid, forget)
  const window = useWindowDimensions().width
  const [boxWidth, setBoxWidth] = useState(0)
  const width = local ? boxWidth : window
  const layout = drawn && width > 0 ? keyboardLayout({ platform: theme.isAndroid ? "android" : "ios", width, ...drawn }) : null
  const inset = layout ? layout.height - layout.navigationBar : 0
  const full = layout ? layout.height : 0
  // The inset follows the keys, as the system's keyboard layout guide and inset animation move a screen with them
  const shown = useRef(target != null ? 1 : 0)
  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      shown.current = value
    })
    return () => progress.removeListener(listener)
  }, [progress])
  useEffect(() => {
    if (!owning) return
    // The navigation bar under Gboard stands still: the inset is the risen height less it
    const publish = (value: number) => setDrawnKeyboard(id, Math.max(0, full * value - (full - inset)), full * value)
    publish(shown.current)
    const listener = progress.addListener(({ value }) => publish(value))
    return () => progress.removeListener(listener)
  }, [owning, id, inset, full, progress])
  useEffect(() => (owning ? () => clearDrawnKeyboard(id) : undefined), [owning, id])
  const slide = useMemo(() => ({ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [full, 0] }) }] }), [progress, full])
  // A press on the keyboard keeps the field's focus, as a key of the real one does
  const box = useRef<ComponentRef<typeof View>>(null)
  useEffect(() => {
    const element = box.current as unknown as { addEventListener?: (type: string, listener: (event: { preventDefault(): void }) => void) => void; removeEventListener: (type: string, listener: (event: { preventDefault(): void }) => void) => void } | null
    if (!layout || !element?.addEventListener) return
    const keep = (event: { preventDefault(): void }) => event.preventDefault()
    element.addEventListener("mousedown", keep)
    return () => element.removeEventListener("mousedown", keep)
  }, [layout])
  if (local) {
    if (!present) return null
    return (
      <Animated.View ref={box} style={[styles.still, slide]} aria-hidden onLayout={(event) => setBoxWidth(Math.round(event.nativeEvent.layout.width))}>
        {layout ? <KeyboardKeys layout={layout} scheme={theme.scheme === "dark" ? "dark" : "light"} /> : null}
      </Animated.View>
    )
  }
  if (!present) return null
  // The moving box stays mounted with no keys in it: mounted with the keys, its first effects (run twice under Strict
  // Mode) would detach the progress and stop the motion just started for them
  const keyboard = (
    <Animated.View ref={box} style={[styles.window as never, slide]} aria-hidden>
      {layout ? <KeyboardKeys layout={layout} scheme={theme.scheme === "dark" ? "dark" : "light"} /> : null}
    </Animated.View>
  )
  const body = (globalThis as { document?: { body?: unknown } }).document?.body
  return portal && body ? portal(keyboard, body) : keyboard
}

const styles = StyleSheet.create({
  // `fixed` is a web position, which React Native's types do not list; over the app's modals
  window: { position: "fixed" as "absolute", left: 0, right: 0, bottom: 0, zIndex: 2147483000 },
  still: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 1 },
  panel: { width: "100%", overflow: "hidden" },
  key: { position: "absolute", alignItems: "center", justifyContent: "center" },
  iosLetter: { marginTop: -4 },
  iosCapital: { marginTop: -2 },
  gboardLetter: { marginTop: -1, transform: [{ translateY: -1.9 }] },
  iosDigit: { alignItems: "center", marginTop: 2.67 },
  // The letters' spacing follows each letter, the last one's too: a lead as wide keeps them in the middle
  iosLetters: { letterSpacing: 1.67, paddingLeft: 1.67, marginTop: 1.33 },
  iosLayout: { transform: [{ translateX: 0.7 }, { translateY: -0.7 }] },
  gboardLayout: { transform: [{ translateX: 0.6 }, { translateY: -0.6 }] },
  padSymbols: { flexDirection: "row", gap: 3.5, transform: [{ translateX: 0.15 }, { translateY: -2 }] },
  autofill: { flexDirection: "row", alignItems: "center", gap: 2 },
  // The key's glyph is 11.2 of its 24: its box's lead left out, the key and the word stand in the middle together
  autofillKey: { marginLeft: -6.4 },
  gboardPhoneDigit: { position: "absolute", width: 40, textAlign: "center" },
  gboardPadDigit: { transform: [{ translateY: 0.4 }] },
  gboardLetters: { position: "absolute", width: 60, textAlign: "center", letterSpacing: -0.3 },
  gboardPhonePlus: { position: "absolute" },
  // Gboard's digit over a letter of its top row, in its corner
  hint: { position: "absolute", top: 2.94, right: 1.2, fontSize: 11.5, lineHeight: 13 },
})
