import { useEffect, useId } from "react"
import { inToastRegion } from "../lib/toastRegion"
import { useLatestValue } from "./useLatestValue"

type Handler = {
  id: string
  callback: React.MutableRefObject<(event: KeyboardEvent) => void>
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
      firstHandler.callback.current?.(evt)
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

const registerHandler = (handler: Handler) => {
  handlers.unshift(handler)
  managerListener()
}

const unregisterHandler = ({ id }: Handler) => {
  handlers = handlers.filter((h) => h.id !== id)
  managerListener()
}

/**
 * Escape closes the most recently registered listener first, so nested overlays close one at a time. The callback
 * gets the key event, already prevented.
 */
export const useEscCloseStack = (listening: boolean, cb: (event: KeyboardEvent) => void) => {
  const id = useId()
  const latestCallback = useLatestValue(cb)

  useEffect(() => {
    if (!listening) {
      return
    }

    const handler = { id, callback: latestCallback, fromToast: inToastRegion(document.activeElement) }
    registerHandler(handler)

    return () => unregisterHandler(handler)
  }, [id, listening, latestCallback])
}
