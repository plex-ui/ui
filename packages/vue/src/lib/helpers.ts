import { canUseDOM, hasDocument } from "./environment"

// Ports of packages/ui/src/lib/helpers.ts. Keep the behaviour identical:
// the parity tests compare the DOM these produce with the React output.

export const handlePressableMouseEnter = (evt: Event) => {
  const target = evt.currentTarget

  if (!(target instanceof HTMLElement)) {
    return
  }

  const elementWidth = target.offsetWidth

  let scale = 0.985

  if (elementWidth <= 80) {
    scale = 0.96
  } else if (elementWidth <= 150) {
    scale = 0.97
  } else if (elementWidth <= 220) {
    scale = 0.98
  } else if (elementWidth > 600) {
    scale = 0.995
  }

  target.style.setProperty("--scale", scale.toString())
}

export const waitForAnimationFrame = (cb: () => void, options?: { frames: number }) => {
  const runAfterTick = () => {
    const id = setTimeout(cb)
    return () => {
      clearTimeout(id)
    }
  }

  if (!canUseDOM || typeof window.requestAnimationFrame !== "function") {
    return runAfterTick()
  }

  const visibilityHidden = hasDocument && document.visibilityState === "hidden"
  if (visibilityHidden) {
    return runAfterTick()
  }

  let frames = options?.frames ?? 2
  let animationFrame = window.requestAnimationFrame(function recurse() {
    frames -= 1
    if (frames === 0) {
      cb()
    } else {
      animationFrame = window.requestAnimationFrame(recurse)
    }
  })

  return () => {
    if (typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(animationFrame)
    }
  }
}

export const toCssVariables = (
  variables: Record<string, string | number | undefined>,
): Record<string, string> => {
  return Object.keys(variables).reduce(
    (acc, variable) => {
      const value = variables[variable]
      // Accept 0 as a valid value
      if (value || value === 0) {
        // Add the prefix if it wasn't already provided
        const prefix = variable.startsWith("--") ? "" : "--"
        acc[`${prefix}${variable}`] = typeof value === "number" ? `${value}px` : value
      }

      return acc
    },
    {} as Record<string, string>,
  )
}
