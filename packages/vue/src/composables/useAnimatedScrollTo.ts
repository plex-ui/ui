import { onBeforeUnmount, type Ref } from "vue"
import { prefersReducedMotion } from "../lib/helpers.js"

const clamp0 = (n: number) => Math.max(0, n)

/** Returns `scrollTo(top)` that eases `target` to a scroll position, interruptible by the user. */
export const useAnimatedScrollTo = (target: Ref<HTMLElement | null | undefined>) => {
  let rafId: number | null = null
  let listenerCleanup: (() => void) | null = null
  let isAnimating = false
  let userInterrupted = false

  const addInteractionListeners = (container: HTMLElement) => {
    const handleInteract = () => {
      userInterrupted = true
    }

    container.addEventListener("wheel", handleInteract, { passive: true })
    container.addEventListener("touchstart", handleInteract, { passive: true })
    container.addEventListener("touchmove", handleInteract, { passive: true })

    listenerCleanup = () => {
      container.removeEventListener("wheel", handleInteract)
      container.removeEventListener("touchstart", handleInteract)
      container.removeEventListener("touchmove", handleInteract)
      listenerCleanup = null
    }
  }

  const cancelAnimation = () => {
    if (rafId) cancelAnimationFrame(rafId)
    isAnimating = false
    userInterrupted = false
    listenerCleanup?.()
  }

  onBeforeUnmount(cancelAnimation)

  return (targetScrollTop: number) => {
    const container = target.value
    if (!container) {
      return
    }

    // Skip animation for reduced motion users
    if (prefersReducedMotion()) {
      container.scrollTop = targetScrollTop
      cancelAnimation()
      return
    }

    // If already animating, cancel current animation and restart
    if (isAnimating) {
      cancelAnimation()
    }

    // Clamp boundaries
    const maxY = clamp0(container.scrollHeight - container.clientHeight)
    const targetY = clamp0(Math.min(targetScrollTop, maxY))
    let currentY = container.scrollTop

    isAnimating = true
    userInterrupted = false
    addInteractionListeners(container)

    // Controls how quickly the scroll converges toward the target (per second).
    // Higher = snappier, lower = smoother and slower.
    const scrollResponsiveness = 11
    // Distance at which currentY will round to target, in pixels.
    const epsilonPx = 0.5
    let prevTime = performance.now()

    const step = (currentTime: number) => {
      const element = target.value

      if (!element || userInterrupted) {
        cancelAnimation()
        return
      }

      // Time elapsed since the last frame, in seconds (clamped to 60ms).
      // Used to make the scroll animation frame-rate independent.
      const deltaSeconds = clamp0(Math.min(0.06, (currentTime - prevTime) / 1000))
      prevTime = currentTime
      // Fraction of remaining distance to cover this frame,
      // based on exponential convergence toward the target scroll position.
      // Behaves like an ease-out: fast initially, then smoothly slows as it nears the target.
      const alpha = 1 - Math.exp(-scrollResponsiveness * deltaSeconds)
      const diffY = targetY - currentY
      const nextY = currentY + diffY * alpha
      currentY = clamp0(Math.min(nextY, maxY))

      element.scrollTop = currentY

      // Check remaining distance for rounding completion
      const remaining = Math.abs(targetY - currentY)
      if (remaining <= epsilonPx) {
        element.scrollTop = targetY
        cancelAnimation()
        return
      }

      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
  }
}
