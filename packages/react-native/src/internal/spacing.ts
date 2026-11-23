import type { Theme } from "../theme/types"

/** A length of the spacing scale: `spacing(n)` of the CSS, n times `--spacing` (4). */
export function space(theme: Theme, steps: number): number {
  const value = theme.value(`spacing(${steps})`)
  return typeof value === "number" ? value : steps * 4
}
