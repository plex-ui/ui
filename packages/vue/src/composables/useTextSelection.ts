import { onBeforeUnmount, toValue, watch, type MaybeRefOrGetter } from "vue"
import { canUseDOM } from "../lib/environment.js"

type Handler = {
  id: symbol
  callback: (selection: Selection | null) => void
}

let handlers: Handler[] = []
let listenerBound = false

const handleSelectionChange = () => {
  if (!canUseDOM) {
    return
  }

  // Wait until the next tick
  setTimeout(() => {
    const selection = window.getSelection?.()
    const selectionEmpty = !selection || selection.rangeCount === 0

    handlers.forEach(({ callback }) => {
      callback(selectionEmpty ? null : selection)
    })
  })
}

const managerListener = () => {
  if (!canUseDOM) {
    return
  }

  if (handlers.length > 0 && !listenerBound) {
    document.addEventListener("mouseup", handleSelectionChange)
    listenerBound = true
  } else if (handlers.length === 0 && listenerBound) {
    document.removeEventListener("mouseup", handleSelectionChange)
    listenerBound = false
  }
}

/** Calls `cb` with the current selection (or null) after each mouseup while `listening`. */
export const useTextSelection = (
  listening: MaybeRefOrGetter<boolean>,
  cb: (currentSelection: Selection | null) => void,
) => {
  const id = Symbol("text-selection")
  const unregister = () => {
    handlers = handlers.filter((h) => h.id !== id)
    managerListener()
  }

  watch(
    () => toValue(listening),
    (isListening) => {
      unregister()
      if (!isListening) return
      handlers.push({ id, callback: cb })
      managerListener()
    },
    { immediate: true },
  )

  onBeforeUnmount(unregister)
}

export const clearTextSelection = () => {
  if (!canUseDOM) {
    return
  }

  const selection = window.getSelection?.()

  if (!selection || selection.type === "None") {
    return
  }

  selection.removeAllRanges()
}
