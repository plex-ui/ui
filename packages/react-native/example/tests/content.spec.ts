import { expect, test } from "@playwright/test"
import { openGallery } from "./gallery"

for (const platform of ["ios", "android"] as const) {
  test(`chips toggle and remove, an avatar is a named button (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "content" })
    const open = page.getByRole("checkbox", { name: "Open now" })
    await expect(open).toHaveAttribute("aria-checked", "false")
    await open.click()
    await expect(open).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("chip-value")).toHaveText("Filters: Nearby, Open now")
    await page.getByRole("checkbox", { name: "Nearby" }).click()
    await expect(page.getByTestId("chip-value")).toHaveText("Filters: Open now")
    if (platform === "android") {
      await page.getByRole("button", { name: "Remove Mobile" }).click()
    } else {
      // iOS's token: no cross; a first press selects the chip, a second removes it, and Delete removes a focused one
      const mobile = page.getByRole("button", { name: "Mobile", exact: true })
      const plex = page.getByTestId("screen-content").getByRole("button", { name: "Plex", exact: true })
      await mobile.click()
      await expect(mobile).toHaveAttribute("aria-pressed", "true")
      // Choosing another token lets the first go: its next press chooses it again, not removes it
      await plex.click()
      await expect(mobile).toHaveAttribute("aria-pressed", "false")
      await mobile.click()
      await expect(page.getByText("Mobile", { exact: true })).toHaveCount(1)
      await mobile.click()
      const design = page.getByRole("button", { name: "Design", exact: true })
      await design.focus()
      await page.keyboard.press("Backspace")
      await expect(design).toHaveCount(0)
    }
    await expect(page.getByText("Mobile", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Grace Hopper" })).toBeVisible()
    await expect(page.getByRole("img", { name: "Ada" }).first()).toBeVisible()
  })

  test(`a list row opens, a slider and a page control move (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "lists" })
    await page.getByRole("button", { name: "Language, English" }).click()
    await expect(page.getByTestId("list-value")).toHaveText("Opened: language")
    // A disabled row does not open
    await page.getByRole("button", { name: "Screen Time" }).click({ force: true })
    await expect(page.getByTestId("list-value")).toHaveText("Opened: language")
    await page.getByRole("button", { name: "Sunset over the hills, Sintra" }).click()
    await expect(page.getByTestId("list-value")).toHaveText("Opened: photo card")

    const volume = page.getByRole("slider", { name: "Volume" })
    await expect(volume).toHaveAttribute("aria-valuenow", "60")
    await volume.focus()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.getByTestId("slider-value")).toHaveText("Volume: 62, brightness: 30")
    await page.keyboard.press("End")
    await expect(volume).toHaveAttribute("aria-valuenow", "100")
    // A press on the track takes the value under it; the step of 10 rounds it
    const brightness = page.getByTestId("slider-brightness")
    const track = page.getByRole("slider", { name: "Brightness" })
    await track.scrollIntoViewIfNeeded()
    const box = (await track.boundingBox())!
    await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2)
    await expect(page.getByTestId("slider-value")).toHaveText("Volume: 100, brightness: 100")
    await expect(brightness).toBeVisible()

    const pages = page.getByTestId("pages-four")
    await pages.scrollIntoViewIfNeeded()
    const dots = (await pages.boundingBox())!
    // A tap on the trailing side of the current (first) dot shows the next page
    await page.mouse.click(dots.x + dots.width - 6, dots.y + dots.height / 2)
    await expect(page.getByTestId("pages-value")).toHaveText("Page 2 of 4")
    await pages.focus()
    await page.keyboard.press("End")
    await expect(page.getByTestId("pages-value")).toHaveText("Page 4 of 4")
    await expect(pages).toHaveAttribute("aria-valuetext", "Page 4 of 4")
  })

  test(`a range, marks, a reset and a vertical slider (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "lists" })
    const more = page.getByTestId("slider-more-value")
    // Each thumb of a range is a slider of its own, named Minimum and Maximum as Radix names the web's
    const low = page.getByRole("slider", { name: "Price Minimum" })
    const high = page.getByRole("slider", { name: "Price Maximum" })
    await expect(low).toHaveAttribute("aria-valuetext", "$100")
    await low.focus()
    await page.keyboard.press("ArrowRight")
    await expect(more).toContainText("Price: 110–300")
    // A thumb stops minStepsBetweenThumbs (5 x 10) short of the other
    await page.keyboard.press("End")
    await expect(more).toContainText("Price: 250–300")
    await high.focus()
    await page.keyboard.press("Home")
    await expect(more).toContainText("Price: 250–300")
    // A press on the track moves the nearest thumb
    const track = low.locator("..")
    await track.scrollIntoViewIfNeeded()
    const box = (await track.boundingBox())!
    await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2)
    await expect(more).toContainText("Price: 250–500")
    // The pressed thumb takes the focus, so the arrows go on moving it
    await expect(high).toBeFocused()
    await page.mouse.click(box.x + 2, box.y + box.height / 2)
    await expect(more).toContainText("Price: 0–500")
    await expect(low).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await expect(more).toContainText("Price: 10–500")

    // The marks stand under the track
    // On Android a hidden accent copy of each mark blends in as a thumb nears it: the first copy is the one a screen
    // reader reads
    for (const mark of ["Small", "Default", "Large"]) await expect(page.getByText(mark, { exact: true }).first()).toBeVisible()

    // The reset shows once the value leaves it, and brings it back
    const reset = page.getByRole("button", { name: "Reset to default" })
    await expect(reset).toHaveCount(0)
    const volume = page.getByRole("slider", { name: "Volume" })
    await volume.focus()
    await page.keyboard.press("ArrowLeft")
    await expect(page.getByTestId("slider-value")).toHaveText("Volume: 59, brightness: 30")
    await reset.click()
    await expect(page.getByTestId("slider-value")).toHaveText("Volume: 60, brightness: 30")
    await expect(reset).toHaveCount(0)

    // A vertical slider runs from the bottom up
    const bass = page.getByRole("slider", { name: "Bass" })
    await expect(bass).toHaveAttribute("aria-orientation", "vertical")
    await expect(low).toHaveAttribute("aria-orientation", "horizontal")
    await bass.scrollIntoViewIfNeeded()
    await bass.focus()
    await page.keyboard.press("ArrowUp")
    await expect(more).toContainText("bass: 41")
    const column = (await bass.boundingBox())!
    await page.mouse.click(column.x + column.width / 2, column.y + 2)
    await expect(more).toContainText("bass: 100")
    await page.mouse.click(column.x + column.width / 2, column.y + column.height - 2)
    await expect(more).toContainText("bass: 0")
  })
}

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true })

  test("a tap on a range slider focuses the thumb it moved", async ({ page }) => {
    await openGallery(page, { platform: "android", scheme: "light", screen: "lists" })
    const more = page.getByTestId("slider-more-value")
    const low = page.getByRole("slider", { name: "Price Minimum" })
    const high = page.getByRole("slider", { name: "Price Maximum" })
    const track = low.locator("..")
    await track.scrollIntoViewIfNeeded()
    const box = (await track.boundingBox())!
    // A tap's emulated mouse events come after the touch ends; the focus the release gave stays
    await page.touchscreen.tap(box.x + box.width - 2, box.y + box.height / 2)
    await expect(more).toContainText("Price: 100–500")
    await expect(high).toBeFocused()
    await page.keyboard.press("ArrowLeft")
    await expect(more).toContainText("Price: 100–490")
  })
})
