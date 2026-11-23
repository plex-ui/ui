import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue"

// Vue port of packages/ui/src/lib/fieldRow.ts.

/**
 * True in a `Field row` whose control ends the row. It stands there beside
 * buttons and tags, so it takes their shape; a field with its label above stays
 * rounded.
 */
const FieldRowKey: InjectionKey<ComputedRef<boolean>> = Symbol("PlexUIFieldRow")

export const provideFieldRow = (inRow: () => boolean) => provide(FieldRowKey, computed(inRow))

/** True when the control ends a `Field row`. */
export const useFieldRow = () => {
  const inRow = inject(FieldRowKey, null)
  return computed(() => inRow?.value ?? false)
}

/** True in a `FieldGroup columns`, where every value starts at one column. */
const FieldColumnsKey: InjectionKey<ComputedRef<boolean>> = Symbol("PlexUIFieldColumns")

export const provideFieldColumns = (columns: () => boolean) => provide(FieldColumnsKey, computed(columns))

/** True when the control's value starts at the column of a `FieldGroup columns`. */
export const useFieldColumns = () => {
  const columns = inject(FieldColumnsKey, null)
  return computed(() => columns?.value ?? false)
}

/** The control's own `pill`, or else the shape of its row. */
export const useFieldRowPill = (pill: () => boolean | undefined) => {
  const inRow = useFieldRow()
  return computed(() => pill() ?? inRow.value)
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
