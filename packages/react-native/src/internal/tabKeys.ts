import { useRef } from "react"
import { Platform } from "react-native"
import { isRTL, previousKey } from "./direction"

type Entry = { value: string; disabled?: boolean }
type Focusable = { focus?: () => void }
type KeyEvent = { key: string; preventDefault: () => void; currentTarget?: unknown }

/**
 * The keyboard of a tab list on the web, as the WAI-ARIA tabs pattern and Radix: one tab in the Tab order (the
 * selected one), the arrows, Home and End move to the next enabled tab and select it (the left arrow to the next one
 * in a right-to-left row), Space and Enter select the focused one. A phone has no keyboard focus to rove, so it
 * returns nothing there.
 */
export function useTabKeys(entries: Entry[], value: string | undefined, select: (value: string) => void) {
  const nodes = useRef(new Map<string, Focusable>())
  if (Platform.OS !== "web") return (_entry: Entry) => ({})
  const enabled = entries.filter((entry) => !entry.disabled)
  const current = enabled.some((entry) => entry.value === value) ? value : enabled[0]?.value
  const move = (from: string, key: string, rtl: boolean) => {
    const index = enabled.findIndex((entry) => entry.value === from)
    const next =
      key === "Home" ? enabled[0] : key === "End" ? enabled[enabled.length - 1] : enabled[(index + (key === previousKey(rtl) ? -1 : 1) + enabled.length) % enabled.length]
    if (!next) return
    nodes.current.get(next.value)?.focus?.()
    select(next.value)
  }
  return (entry: Entry) => ({
    ref: (node: Focusable | null) => {
      if (node) nodes.current.set(entry.value, node)
      else nodes.current.delete(entry.value)
    },
    tabIndex: entry.disabled || entry.value !== current ? -1 : 0,
    onKeyDown: (event: KeyEvent) => {
      if (entry.disabled) return
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault()
        select(entry.value)
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
        event.preventDefault()
        move(entry.value, event.key, isRTL(event.currentTarget))
      }
    },
  })
}
