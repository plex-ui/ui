import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import { useLatestValue } from "./useLatestValue"
import { observePhoneSubmenu, samePhoneSubmenuState, type MenuFloatingBoundary, type PhoneSubmenuState } from "../lib/menuSubmenuPlacement"

/** `onParentPress` collapses the submenu when a press lands on the parent it stands over. */
export function usePhoneSubmenu(active: boolean, trigger: RefObject<HTMLElement | null>, content: HTMLElement | null, boundary: MenuFloatingBoundary, onParentPress?: () => void) {
  const [state, setState] = useState<PhoneSubmenuState>({ mobile: false })
  const observer = useRef<ReturnType<typeof observePhoneSubmenu> | null>(null)
  const latestParentPress = useLatestValue(onParentPress)
  const { top, right, bottom, left } = boundary.collisionPadding
  useLayoutEffect(() => {
    const triggerElement = trigger.current
    if (!active || !triggerElement || !content) return
    const current = observePhoneSubmenu(triggerElement, content, {
      collisionBoundary: boundary.collisionBoundary,
      collisionPadding: { top, right, bottom, left },
    }, (next) => setState((previous) => samePhoneSubmenuState(previous, next) ? previous : next), () => latestParentPress.current?.())
    observer.current = current
    return () => { current.dispose(); observer.current = null }
  }, [active, trigger, content, boundary.collisionBoundary, top, right, bottom, left, latestParentPress])
  // The newly rendered header changes height before ResizeObserver runs.
  useLayoutEffect(() => { observer.current?.refresh() })
  return state
}
