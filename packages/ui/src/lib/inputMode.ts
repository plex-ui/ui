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
