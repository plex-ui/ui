import { expect, test } from "@playwright/test"
import { openGallery } from "./gallery"

for (const platform of ["ios", "android"] as const) {
  test(`a bar reads its value, a stepper steps and removes, a number reads as written (${platform})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openGallery(page, { platform, scheme: "light", screen: "progress" })

    const upload = page.getByTestId("progress-upload")
    await expect(upload).toHaveAttribute("role", "progressbar")
    await expect(upload).toHaveAttribute("aria-valuenow", "66")
    await expect(upload).toHaveAttribute("aria-valuetext", "66%")
    await page.getByTestId("progress-more").click()
    await expect(upload).toHaveAttribute("aria-valuenow", "76")
    await expect(page.getByText("76%", { exact: true })).toBeVisible()

    // A spin button: the arrows step, End goes to the most, and the minus stops at the least
    const copies = page.getByTestId("stepper-copies")
    await expect(copies).toHaveAttribute("role", "spinbutton")
    await expect(copies).toHaveAttribute("aria-valuenow", "1")
    await copies.focus()
    await page.keyboard.press("ArrowUp")
    await page.keyboard.press("ArrowUp")
    await expect(copies).toHaveAttribute("aria-valuenow", "3")
    await expect(page.getByText("3 copies", { exact: true })).toBeVisible()
    await page.keyboard.press("End")
    await expect(copies).toHaveAttribute("aria-valuenow", "20")
    await page.keyboard.press("Home")
    await page.keyboard.press("ArrowDown")
    await expect(copies).toHaveAttribute("aria-valuenow", "1")

    // With the value shown: a press on the plus steps, at one Delete removes (here back to one)
    const bag = page.getByTestId("stepper-bag")
    await expect(bag).toHaveAttribute("aria-valuenow", "2")
    await bag.focus()
    await page.keyboard.press("ArrowDown")
    await expect(bag).toHaveAttribute("aria-valuenow", "1")
    await expect(bag).toHaveAttribute("aria-keyshortcuts", "Delete")

    const total = page.getByTestId("rolling-total")
    await expect(total).toHaveAttribute("aria-label", "$1,284.00")
    await page.getByTestId("rolling-25").click()
    await expect(total).toHaveAttribute("aria-label", "$1,309.00")
  })
}
