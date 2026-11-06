import { useCallback, useEffect, useRef, type RefObject } from "react"

type OutsidePointerEvent = CustomEvent<{ originalEvent: PointerEvent }>
const outsideEvents = ["pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"]
const dismissableSurfaces = new Set<Element>()

// Plex Dialog overlays are dismiss affordances even when a parent stops click
// propagation. Other outside elements retain the ordinary intercepted-click rule.
export const usePopoverDismissableSurface = () => {
  const current = useRef<HTMLElement | null>(null)
  const setSurface = useCallback((node: HTMLElement | null) => {
    if (current.current) dismissableSurfaces.delete(current.current)
    current.current = node
    if (node) dismissableSurfaces.add(node)
  }, [])
  useEffect(() => {
    if (current.current) dismissableSurfaces.add(current.current)
    return () => { if (current.current) dismissableSurfaces.delete(current.current) }
  }, [])
  return setSurface
}

/** Defers only the outside press delivered by Radix's public layer/branch filter. */
export const useDeferredOutsidePress = (dismiss: () => void, triggerRef: RefObject<HTMLElement | null>) => {
  const pending = useRef<(() => void) | undefined>(undefined)
  const reset = useCallback(() => {
    pending.current?.()
    pending.current = undefined
  }, [])
  useEffect(() => reset, [reset])
  const isTrigger = (target: EventTarget | null) => target instanceof Node && !!triggerRef.current?.contains(target)

  const onPointerDownOutside = (event: OutsidePointerEvent) => {
    reset()
    const original = event.detail.originalEvent
    if (isTrigger(original.target)) {
      event.preventDefault()
      return
    }
    if (original.button !== 0) return
    event.preventDefault()
    const doc = (original.target as Node | null)?.ownerDocument ?? document
    const intercepted = new Map<string, boolean>()
    let active = true
    let finishTimer: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      if (!active) return
      const blocked = [...intercepted.values()].some(Boolean)
      reset()
      if (!blocked) dismiss()
    }
    const capture = (event: Event) => {
      const target = event.target
      const surface = target instanceof Node && [...dismissableSurfaces].some((node) => node.contains(target))
      if (!surface) intercepted.set(event.type, true)
      if (event.type === "click") finishTimer = setTimeout(finish, 0)
    }
    const bubble = (event: Event) => { intercepted.set(event.type, false) }
    const cancel = (event: PointerEvent) => { if (event.pointerId === original.pointerId) reset() }
    for (const name of outsideEvents) {
      doc.addEventListener(name, capture, true)
      doc.addEventListener(name, bubble)
    }
    doc.addEventListener("click", finish)
    doc.addEventListener("pointerdown", reset, true)
    doc.addEventListener("pointercancel", cancel, true)
    pending.current = () => {
      active = false
      clearTimeout(finishTimer)
      for (const name of outsideEvents) {
        doc.removeEventListener(name, capture, true)
        doc.removeEventListener(name, bubble)
      }
      doc.removeEventListener("click", finish)
      doc.removeEventListener("pointerdown", reset, true)
      doc.removeEventListener("pointercancel", cancel, true)
    }
  }
  const onFocusOutside = (event: CustomEvent<{ originalEvent: FocusEvent }>) => {
    if (pending.current || isTrigger(event.detail.originalEvent.target)) event.preventDefault()
  }
  return { onPointerDownOutside, onFocusOutside, reset }
}
