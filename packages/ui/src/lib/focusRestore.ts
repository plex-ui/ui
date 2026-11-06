/** Keep pointer-restored focus without inheriting a search field's keyboard ring. */
export const createFocusRestore = (doc: Document) => {
  let usingKeyboard = true
  let disposed = false
  let clearPointerFocus: (() => void) | undefined

  const onKeyDown = () => {
    usingKeyboard = true
    clearPointerFocus?.()
  }
  const onPointerDown = () => {
    usingKeyboard = false
  }
  doc.addEventListener("keydown", onKeyDown, true)
  // Enter/Space in Select dispatch a synthetic pointerup, so do not use it
  // (or click) to infer input modality.
  doc.addEventListener("pointerdown", onPointerDown, true)

  return {
    restore(trigger: HTMLElement) {
      clearPointerFocus?.()
      if (disposed || !trigger.isConnected) return
      if (usingKeyboard) {
        trigger.focus()
        return
      }

      let restoring = true
      const clear = () => {
        trigger.removeAttribute("data-menu-pointer-focus")
        trigger.removeEventListener("blur", clear)
        trigger.removeEventListener("focus", onFocus)
        if (clearPointerFocus === clear) clearPointerFocus = undefined
      }
      const onFocus = () => {
        if (!restoring) clear()
      }
      // Shared with Menu: custom Button triggers already recognize this marker.
      trigger.setAttribute("data-menu-pointer-focus", "")
      trigger.addEventListener("blur", clear)
      trigger.addEventListener("focus", onFocus)
      clearPointerFocus = clear
      trigger.focus()
      restoring = false
      if (doc.activeElement !== trigger) clear()
    },
    dispose() {
      disposed = true
      clearPointerFocus?.()
      doc.removeEventListener("keydown", onKeyDown, true)
      doc.removeEventListener("pointerdown", onPointerDown, true)
    },
  }
}
