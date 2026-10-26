import { onBeforeUnmount, toValue, watch, type MaybeRefOrGetter } from "vue"

type Handler = {
  id: symbol
  callback: () => void
}

let handlers: Handler[] = []
let listenerBound = false

const handleKeyDown = (evt: KeyboardEvent) => {
  if (evt.key === "Escape") {
    // Attempt to call the first handler in the stack, if it exists
    const [firstHandler] = handlers

    if (firstHandler) {
      evt.preventDefault()
      firstHandler.callback()
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
 * overlays close one at a time.
 */
export const useEscCloseStack = (listening: MaybeRefOrGetter<boolean>, cb: () => void) => {
  const id = Symbol("esc-close")
  const handler: Handler = { id, callback: cb }
  const unregister = () => {
    handlers = handlers.filter((h) => h.id !== id)
    managerListener()
  }

  watch(
    () => toValue(listening),
    (isListening) => {
      unregister()
      if (!isListening) return
      handlers.unshift(handler)
      managerListener()
    },
    { immediate: true },
  )

  onBeforeUnmount(unregister)
}
