type HoverPointerEvent = {
  pointerType: string
  currentTarget: EventTarget | null
}

/** Pointer hover is unavailable to touch input and explicitly touch-rendered surfaces. */
export const isHoverPointer = (event: HoverPointerEvent): boolean => {
  if (event.pointerType === "touch") return false
  const target = event.currentTarget
  const doc = target instanceof Document ? target : target instanceof Node ? target.ownerDocument : null
  return doc?.documentElement.dataset.input !== "touch"
}

// The last input of each document: a pointer press or a key. A focus that follows a pointer press is one the press
// gave or a script moved after it (a dialog closed with the mouse returns focus to its trigger), and no focus ring
// shows for it; a key, Tab or an arrow, shows one.
const lastInput = new WeakMap<Document, "pointer" | "keyboard">()
const tracked = new WeakSet<Document>()

/** Starts tracking the last input of a document (once per document). */
export const trackInputModality = (doc: Document | null | undefined): void => {
  if (!doc || tracked.has(doc)) return
  tracked.add(doc)
  doc.addEventListener("pointerdown", () => lastInput.set(doc, "pointer"), { capture: true, passive: true })
  doc.addEventListener("mousedown", () => lastInput.set(doc, "pointer"), { capture: true, passive: true })
  // Any key counts, with a modifier too: a screen reader moves focus with its own keys (Control-Option-arrows), and
  // a tooltip it misses is worse than one more after a shortcut
  doc.addEventListener("keydown", () => lastInput.set(doc, "keyboard"), { capture: true, passive: true })
}

/**
 * Notes a pointer press from the element's own handler: a document that starts being tracked during that press (the
 * first touch on a trigger in an iframe) has already let it pass its capture phase.
 */
export const notePointerInput = (doc: Document | null | undefined): void => {
  if (!doc) return
  trackInputModality(doc)
  lastInput.set(doc, "pointer")
}

/**
 * Whether a focus shows its ring, as the browser's :focus-visible: a focus after a key or with no input yet does, one
 * a pointer press gave or a script moved after it does not. A tooltip opens on the first only.
 */
export const isFocusVisible = (element: Element): boolean => {
  try {
    if (element.matches(":focus-visible")) return true
  } catch {
    // A browser without the selector leaves it to the last input
  }
  return lastInput.get(element.ownerDocument) !== "pointer"
}
