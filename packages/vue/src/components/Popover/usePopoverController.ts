import { waitForAnimationFrame } from "../../lib/helpers.js"
import { usePopoverContext } from "./usePopoverContext.js"

// Vue port of packages/ui/src/components/Popover/usePopoverController.tsx.
// Call these from setup() of a component rendered inside PopoverContent; in a
// template, PopoverContent's default slot receives the same `{ close, shake }`.

export const usePopoverClose = () => {
  const { setOpen } = usePopoverContext()
  return () => setOpen(false)
}

export const usePopoverShake = () => {
  const { setShake } = usePopoverContext()
  return () => {
    // Sequence: (1) ensure shake is cleared, then (2) set on the next tick.
    // Vue renders the cleared state before the animation frame, which is
    // what React's flushSync() forces.
    setShake(false)
    waitForAnimationFrame(() => setShake(true))
  }
}

export const usePopoverController = (): {
  /** Plays a short shake animation on the popover. */
  shake: () => void
  /** Imperatively closes the popover. */
  close: () => void
} => {
  const shake = usePopoverShake()
  const close = usePopoverClose()
  return { close, shake }
}
