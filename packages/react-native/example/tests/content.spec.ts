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
    await page.getByRole("button", { name: "Remove Mobile" }).click()
    await expect(page.getByText("Mobile", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Grace Hopper" })).toBeVisible()
    await expect(page.getByRole("img", { name: "Ada" }).first()).toBeVisible()
  })

  test(`a list row opens, a slider and a page control move (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "lists" })
    await page.getByRole("button", { name: "Language, English" }).click()
    await expect(page.getByTestId("list-value")).toHaveText("Opened: language")
    // A disabled row does not open
    await page.getByRole("button", { name: "Unavailable" }).click({ force: true })
    await expect(page.getByTestId("list-value")).toHaveText("Opened: language")
    await page.getByRole("button", { name: "Sunset over the hills, a photo card" }).click()
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
}
