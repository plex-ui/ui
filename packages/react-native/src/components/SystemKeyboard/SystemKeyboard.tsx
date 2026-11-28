import { useEffect, useRef, useState, useSyncExternalStore, type ComponentRef, type ReactNode } from "react"
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { createIcon, type IconComponent } from "../Icon/createIcon"
import { useTheme } from "../../theme/ThemeProvider"
import { clearDrawnKeyboard, setDrawnKeyboard } from "../../internal/keyboard"
import ArrowRightLg from "../../icons/plex/ArrowRightLg"
import CheckMd from "../../icons/plex/CheckMd"
import ChevronDownMd from "../../icons/plex/ChevronDownMd"
import ChevronRightMd from "../../icons/plex/ChevronRightMd"
import Clipboard from "../../icons/plex/Clipboard"
import Grid from "../../icons/plex/Grid"
import MicFilled from "../../icons/plex/MicFilled"
import Search from "../../icons/plex/Search"
import SettingsCog from "../../icons/plex/SettingsCog"
import ArrowBigUp from "../../icons/tabler/ArrowBigUp"
import Backspace from "../../icons/tabler/Backspace"
import CornerDownLeft from "../../icons/tabler/CornerDownLeft"
import Gif from "../../icons/tabler/Gif"
import MoodSmile from "../../icons/tabler/MoodSmile"
import Palette from "../../icons/tabler/Palette"
import Send from "../../icons/tabler/Send"
import Space from "../../icons/tabler/Space"
import Sticker from "../../icons/tabler/Sticker"
import { IOS_GLYPH_SIZE as S, IosDelete, IosDeletePad, IosDone, IosEmoji, IosGlobe, IosGo, IosMic, IosNext, IosReturn, IosSearch, IosSend, IosShift } from "./glyphs"
import { keyboardLayout, type KeySpec, type KeyboardKind, type KeyboardLayout, type KeyboardPlatform, type KeyboardReturnKey } from "./layout"

export { keyboardLayout, type KeyboardKind, type KeyboardLayout, type KeyboardPlatform, type KeyboardReturnKey, type KeySpec } from "./layout"

/** Shift held for a capital: the arrow filled */
const ShiftOn = createIcon("ShiftOn", "0 0 24 24", [
  ["path", { d: "M10.59 3 4 9.59A2 2 0 0 0 5.41 13H8v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7h2.59A2 2 0 0 0 20 9.59L13.41 3a2 2 0 0 0-2.82 0Z", fill: 0 }],
])

/** The glyph of each named key, and its size: the drawn glyph's, as the native keyboard draws it */
const GLYPHS: Record<KeyboardPlatform, Record<string, [IconComponent, number]>> = {
  ios: {
    shift: [IosShift, S.shift],
    "shift-on": [ShiftOn, S.shift],
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
    shift: [ArrowBigUp, 25],
    "shift-on": [ShiftOn, 25],
    delete: [Backspace, 28],
    emoji: [MoodSmile, 24],
    return: [CornerDownLeft, 26],
    next: [ChevronRightMd, 26],
    go: [ArrowRightLg, 26],
    search: [Search, 26],
    send: [Send, 24],
    done: [CheckMd, 28],
    space: [Space, 24],
    hide: [ChevronDownMd, 20],
    apps: [Grid, 23],
    sticker: [Sticker, 23],
    gif: [Gif, 24],
    clipboard: [Clipboard, 23],
    settings: [SettingsCog, 23],
    palette: [Palette, 23],
    mic: [MicFilled, 23],
  },
}

/** The keyboards' own colors: they are the system's, not the app's, so the theme's tokens do not reach them */
const COLORS: Record<KeyboardPlatform, Record<"light" | "dark", Palette>> = {
  ios: {
    light: { panel: "#E2E4E8", key: "#FFFFFF", mod: "#FFFFFF", accent: "#007AFF", ink: "#000000", onAccent: "#FFFFFF", muted: "#3C3C43", divider: "#C2C4C9" },
    dark: { panel: "#171717", key: "#3D3D3D", mod: "#3D3D3D", accent: "#0A84FF", ink: "#FFFFFF", onAccent: "#FFFFFF", muted: "#EBEBF5", divider: "#3A3A3C" },
  },
  android: {
    light: { panel: "#EEEDF4", key: "#FFFFFF", mod: "#DCE2F9", accent: "#DCE2F9", ink: "#1A1B20", onAccent: "#1A1B20", muted: "#74777F", divider: "#C4C6D0" },
    dark: { panel: "#1E1F25", key: "#33343A", mod: "#404659", accent: "#404659", ink: "#E2E2E9", onAccent: "#E2E2E9", muted: "#8E9099", divider: "#44474F" },
  },
}

type Palette = Record<"panel" | "key" | "mod" | "accent" | "ink" | "onAccent" | "muted" | "divider", string>

/** The focused field, as the keyboard reads it */
export type KeyboardField = {
  kind: KeyboardKind
  returnKey: KeyboardReturnKey
  caps: boolean
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

function KeyGlyph({ spec, platform, color }: { spec: KeySpec; platform: KeyboardPlatform; color: string }) {
  const glyph = spec.icon ? GLYPHS[platform][spec.icon] : undefined
  if (!glyph) return null
  const [Glyph, size] = glyph
  return <Glyph size={size} color={color} />
}

function KeyLabel({ spec, platform, palette }: { spec: KeySpec; platform: KeyboardPlatform; palette: Palette }) {
  const theme = useTheme()
  const ios = platform === "ios"
  const ink = spec.fill === "accent" ? palette.onAccent : palette.ink
  const face = (size: number, weight: "regular" | "medium" | "semibold" = "regular", lineHeight = Math.round(size * 1.2)) => ({
    ...theme.font(weight),
    fontSize: size,
    lineHeight,
    letterSpacing: 0,
    color: ink,
  })
  switch (spec.role) {
    case "letter":
      return <Text style={[face(ios ? 25 : 26), ios ? styles.iosLetter : styles.gboardLetter]}>{spec.label}</Text>
    case "layout":
      return <Text style={face(ios ? 18 : 15, ios ? "regular" : "medium")}>{spec.label}</Text>
    case "suggestion":
      return <Text style={face(17)}>{spec.label}</Text>
    case "symbol":
      return <Text style={face(spec.label === ".com" ? 18 : ios ? 22 : 24)}>{spec.label}</Text>
    case "label":
      return <Text style={face(ios ? 20 : 20)}>{spec.label}</Text>
    case "digit":
      if (ios) {
        return (
          <View style={styles.iosDigit}>
            <Text style={face(22, "regular", 26)}>{spec.label}</Text>
            <Text style={[face(10, "semibold", 12), styles.iosLetters]}>{spec.sub || " "}</Text>
          </View>
        )
      }
      return (
        <View style={styles.gboardDigit}>
          <Text style={face(29, "regular", 34)}>{spec.label}</Text>
          {spec.sub ? <Text style={[face(13, "regular", 16), styles.gboardLetters]}>{spec.sub}</Text> : null}
        </View>
      )
    default:
      return null
  }
}

function Key({ spec, platform, palette }: { spec: KeySpec; platform: KeyboardPlatform; palette: Palette }) {
  const theme = useTheme()
  const fill = spec.fill === "none" ? "transparent" : palette[spec.fill]
  // Gboard's sticker and GIF tools stand dimmed by the others
  const dim = spec.role === "hide" || spec.icon === "sticker" || spec.icon === "gif"
  const glyphColor = spec.fill === "accent" ? palette.onAccent : dim ? palette.muted : palette.ink
  if (spec.role === "divider") {
    return <View testID={`keyboard-${spec.id}`} style={[styles.key, frame(spec), { backgroundColor: palette.divider }]} />
  }
  return (
    <View testID={`keyboard-${spec.id}`} style={[styles.key, frame(spec), { backgroundColor: fill, borderRadius: spec.radius }]}>
      {spec.icon ? <KeyGlyph spec={spec} platform={platform} color={glyphColor} /> : <KeyLabel spec={spec} platform={platform} palette={palette} />}
      {spec.hint ? <Text style={[styles.hint, theme.font("regular"), { color: palette.muted }]}>{spec.hint}</Text> : null}
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
        <Key key={spec.id} spec={spec} platform={layout.platform} palette={palette} />
      ))}
    </View>
  )
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
  const window = useWindowDimensions().width
  const [boxWidth, setBoxWidth] = useState(0)
  const width = local ? boxWidth : window
  const layout = enabled && drawing && field && width > 0 ? keyboardLayout({ platform: theme.isAndroid ? "android" : "ios", width, ...field }) : null
  const inset = layout ? layout.height - layout.navigationBar : 0
  const full = layout ? layout.height : 0
  useEffect(() => {
    if (!owning) return
    setDrawnKeyboard(id, inset, full)
  }, [owning, id, inset, full])
  useEffect(() => (owning ? () => clearDrawnKeyboard(id) : undefined), [owning, id])
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
    if (!enabled) return null
    return (
      <View ref={box} style={styles.still} aria-hidden onLayout={(event) => setBoxWidth(Math.round(event.nativeEvent.layout.width))}>
        {layout ? <KeyboardKeys layout={layout} scheme={theme.scheme === "dark" ? "dark" : "light"} /> : null}
      </View>
    )
  }
  if (!layout) return null
  const keyboard = (
    <View ref={box} style={styles.window as never} aria-hidden>
      <KeyboardKeys layout={layout} scheme={theme.scheme === "dark" ? "dark" : "light"} />
    </View>
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
  iosLetter: { marginTop: -2 },
  gboardLetter: { marginTop: -1 },
  iosDigit: { alignItems: "center", marginTop: 2 },
  iosLetters: { letterSpacing: 2, marginTop: -2 },
  gboardDigit: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  gboardLetters: { letterSpacing: 0.5 },
  hint: { position: "absolute", top: 3, right: 4, fontSize: 11, lineHeight: 13 },
})
