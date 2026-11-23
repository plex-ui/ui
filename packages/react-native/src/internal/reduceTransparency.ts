import { useSyncExternalStore } from "react"
import { AccessibilityInfo, Platform } from "react-native"

/*
 * Reduce Transparency (iOS) or `prefers-reduced-transparency` (the web), read once for every glass surface: the
 * setting is global, so one listener serves them all.
 */

type MediaQuery = { matches: boolean; addEventListener?: (type: "change", listener: (event: { matches: boolean }) => void) => void }

let reduced = false
let started = false
const listeners = new Set<() => void>()

function set(value: boolean) {
  if (value === reduced) return
  reduced = value
  listeners.forEach((listener) => listener())
}

function start() {
  if (started) return
  started = true
  if (Platform.OS === "web") {
    const matchMedia = (globalThis as { matchMedia?: (query: string) => MediaQuery }).matchMedia
    const media = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-transparency: reduce)") : null
    if (!media) return
    set(media.matches)
    media.addEventListener?.("change", (event) => set(event.matches))
    return
  }
  AccessibilityInfo.isReduceTransparencyEnabled?.()
    .then(set)
    .catch(() => {})
  AccessibilityInfo.addEventListener?.("reduceTransparencyChanged", set)
}

function subscribe(listener: () => void) {
  start()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const current = () => reduced
const never = () => false

/** Whether the person asked for less transparency: glass then draws an opaque surface (HIG Materials). */
export function useReduceTransparency() {
  return useSyncExternalStore(subscribe, current, never)
}
