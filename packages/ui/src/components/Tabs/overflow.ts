/**
 * Width math for `Tabs overflow="menu"`: how many tabs fit before the menu
 * button. Shared by the React and Vue packages (the Vue copy must match).
 */

/**
 * Slack for subpixels. Widths are fractional (`getBoundingClientRect`), and a
 * tab that fits exactly is sometimes off by the last digit; without the
 * tolerance the strip would flicker between two counts.
 */
const FIT_TOLERANCE_PX = 0.5

/**
 * How many tabs fit. When all of them do, the count is their number and no
 * menu button is needed; otherwise room for the button is taken first.
 */
export function fitCount(widths: number[], moreWidth: number, gap: number, available: number): number {
  const total = widths.reduce((sum, width, index) => sum + width + (index > 0 ? gap : 0), 0)
  if (total <= available + FIT_TOLERANCE_PX) return widths.length

  const budget = available - moreWidth - gap
  let used = 0
  let count = 0
  for (const width of widths) {
    const next = used + width + (count > 0 ? gap : 0)
    if (next > budget + FIT_TOLERANCE_PX) break
    used = next
    count += 1
  }
  return count
}

/**
 * How many tabs stay in the strip when the hidden active tab lends its name
 * to the menu button, which then grows wider than "More". Counted twice: with
 * the narrow button first, and with the wide one if the active tab did not
 * fit. The reserve only grows, so the second count cannot bring the active
 * tab back into the strip.
 */
export function visibleTabCount(
  widths: number[],
  moreWidth: number,
  activeWidth: number,
  activeIndex: number,
  gap: number,
  available: number,
): number {
  const count = fitCount(widths, moreWidth, gap, available)
  if (activeIndex < 0 || activeIndex < count) return count
  return fitCount(widths, Math.max(moreWidth, activeWidth), gap, available)
}
