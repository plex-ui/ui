import { createContext, useContext, useLayoutEffect, useRef } from "react"

/**
 * True in a `Field row` whose control ends the row. It stands there beside
 * buttons and tags, so it takes their shape; a field with its label above stays
 * rounded.
 */
export const FieldRowContext = createContext(false)

/** True when the control ends a `Field row`. */
export const useFieldRow = () => useContext(FieldRowContext)

/** True in a `FieldGroup columns`, where every value starts at one column. */
export const FieldColumnsContext = createContext(false)

/** True when the control's value starts at the column of a `FieldGroup columns`. */
export const useFieldColumns = () => useContext(FieldColumnsContext)

/** The control's own `pill`, or else the shape of its row. */
export const useFieldRowPill = (pill: boolean | undefined) => {
  const inRow = useFieldRow()
  return pill ?? inRow
}

const ANDROID_LOOK = '[data-platform="android"]'
const BLANK = " "

/**
 * In the Plex Android look a text field under its label (a vertical `Field row` with the label shown) is a field of
 * an input card: the label stands in the field while it is empty, which the styles tell by `:placeholder-shown`. That
 * needs a placeholder, so there a field without one gets a blank one; elsewhere (iOS, the desktop) nothing is added.
 * `start` gives it and follows the platform and the field's own placeholder, `sync` checks again after a render,
 * `stop` takes it back.
 */
export function blankPlaceholder(controlId: () => string) {
  let given: HTMLInputElement | HTMLTextAreaElement | null = null
  let observer: MutationObserver | null = null
  const release = () => {
    if (given?.getAttribute("placeholder") === BLANK) given.removeAttribute("placeholder")
    given = null
  }
  let watched: Element | null = null
  const sync = () => {
    if (typeof document === "undefined") return
    const control = document.getElementById(controlId())
    // Watch only this field's own placeholder (and, from `start`, the root's platform), never the whole document
    if (observer && control && control !== watched) {
      observer.observe(control, { attributes: true, attributeFilter: ["placeholder"] })
      watched = control
    }
    const input =
      (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) &&
      control.matches('[data-slot="input"] > input, [data-slot="textarea"] > textarea') &&
      control.closest(ANDROID_LOOK)
        ? control
        : null
    if (given && given !== input) release()
    if (input && !input.hasAttribute("placeholder")) {
      input.setAttribute("placeholder", BLANK)
      given = input
    }
  }
  const start = () => {
    if (!observer && typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
      observer = new MutationObserver(sync)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"] })
    }
    sync()
  }
  const stop = () => {
    observer?.disconnect()
    observer = null
    watched = null
    release()
  }
  return { start, sync, stop }
}

/** `blankPlaceholder` for a Field: on while `active` (a vertical row with its label shown). */
export function useBlankPlaceholder(controlId: string, active: boolean) {
  const current = useRef<ReturnType<typeof blankPlaceholder> | null>(null)
  useLayoutEffect(() => {
    if (!active) return
    const blank = blankPlaceholder(() => controlId)
    blank.start()
    current.current = blank
    return () => {
      blank.stop()
      current.current = null
    }
  }, [active, controlId])
  useLayoutEffect(() => {
    current.current?.sync()
  })
}
