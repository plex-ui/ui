import type { Theme } from "../theme/types"

/** A CSS box token of one to four lengths (`8px 20px 6px`) as its four sides. */
export function cssBox(theme: Theme, name: string, fallback: [number, number, number, number]) {
  const value = theme.token(name)
  const parts = typeof value === "number" ? [value] : typeof value === "string" ? value.trim().split(/\s+/).map((part) => parseFloat(part)) : []
  const [top, right = top, bottom = top, left = right] = parts.length && !parts.some(Number.isNaN) ? parts : fallback
  return { top, right, bottom, left }
}
