import { expect, test } from "@playwright/test"
import { openGallery } from "./gallery"

// A row with a picture taller than the symbol (a 40 photo) is its full height from its first frame: a sheet sized by
// its content does not grow on the second frame
for (const [platform, height] of [["ios", 60], ["android", 56]] as const) {
  test(`a photo row is ${height} from its first frame (${platform})`, async ({ page }) => {
    await page.addInitScript(() => {
      const heights: number[] = []
      ;(window as unknown as { __rowHeights: number[] }).__rowHeights = heights
      const tick = () => {
        const row = document.querySelector('[data-testid="row-photo"]')
        if (row) heights.push(Math.round(row.getBoundingClientRect().height))
        if (heights.length < 30) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await openGallery(page, { platform, scheme: "light", screen: "lists" })
    await expect.poll(() => page.evaluate(() => (window as unknown as { __rowHeights: number[] }).__rowHeights.length)).toBeGreaterThanOrEqual(30)
    const heights = await page.evaluate(() => (window as unknown as { __rowHeights: number[] }).__rowHeights)
    expect(new Set(heights)).toEqual(new Set([height]))
  })
}
