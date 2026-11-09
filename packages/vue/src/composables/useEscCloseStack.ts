import { onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from "vue"
import { inToastRegion } from "../lib/toastRegion.js"

type Handler = {
  id: symbol
  callback: (event: KeyboardEvent) => void
  /** Opened from a toast (a Popover in a custom toast): Escape in the toast closes it */
  fromToast: boolean
}

let handlers: Handler[] = []
let listenerBound = false

const handleKeyDown = (evt: KeyboardEvent) => {
  if (evt.key === "Escape") {
    // Attempt to call the first handler in the stack, if it exists
    const [firstHandler] = handlers

    // Escape in a toast returns focus to where it came from (the toast's own handler); it closes nothing under
    // the toast, only what the toast itself opened
    if (firstHandler && (firstHandler.fromToast || !inToastRegion(evt.target))) {
      evt.preventDefault()
      firstHandler.callback(evt)
    }
  }
}

const managerListener = () => {
  if (handlers.length > 0 && !listenerBound) {
    document.body.addEventListener("keydown", handleKeyDown)
    listenerBound = true
  } else if (handlers.length === 0 && listenerBound) {
    document.body.removeEventListener("keydown", handleKeyDown)
    listenerBound = false
  }
}

/**
 * Escape closes the most recently registered listener first, so nested
 * overlays close one at a time. The callback gets the key event, already prevented.
 */
export const useEscCloseStack = (listening: MaybeRefOrGetter<boolean>, cb: (event: KeyboardEvent) => void) => {
  const id = Symbol("esc-close")
  const handler: Handler = { id, callback: cb, fromToast: false }
  const unregister = () => {
    handlers = handlers.filter((h) => h.id !== id)
    managerListener()
  }

  // Register on mount, like React's effect: nothing global happens during SSR
  onMounted(() => {
    watch(
      () => toValue(listening),
      (isListening) => {
        unregister()
        if (!isListening) return
        handler.fromToast = inToastRegion(document.activeElement)
        handlers.unshift(handler)
        managerListener()
      },
      { immediate: true },
    )
  })

  onBeforeUnmount(unregister)
}
