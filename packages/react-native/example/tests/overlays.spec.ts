import { expect, test, type Page } from "@playwright/test"
import { openGallery } from "./gallery"

const PHONE = { width: 393, height: 852 }

/** A screenshot of the whole phone screen once the overlay has finished opening. */
async function expectOverlay(page: Page, name: string) {
  await page.waitForTimeout(450)
  await expect(page).toHaveScreenshot(name)
}

for (const platform of ["ios", "android"] as const) {
  test(`a dialog runs its action and closes (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "overlays" })
    await page.getByTestId("open-dialog").click()
    const dialog = page.getByTestId("dialog")
    await expect(dialog.getByRole("alert")).toBeVisible()
    await expect(dialog.getByText("Delete this photo?")).toBeVisible()
    await expectOverlay(page, `dialog-${platform}-light.png`)
    await page.getByTestId("dialog-delete").click()
    await expect(page.getByTestId("dialog")).toHaveCount(0)
    await expect(page.getByTestId("overlay-last")).toHaveText("Last: Deleted")

    await page.getByTestId("open-dialog-three").click()
    await expectOverlay(page, `dialog-three-${platform}-light.png`)
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByTestId("dialog-three")).toHaveCount(0)

    await page.getByTestId("open-dialog-field").click()
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Untitled folder")
    await expectOverlay(page, `dialog-field-${platform}-light.png`)
  })

  test(`a bottom sheet and an action sheet open and close (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "overlays" })
    await page.getByTestId("open-sheet").click()
    await expect(page.getByTestId("sheet").getByText("Share", { exact: true })).toBeVisible()
    await expectOverlay(page, `sheet-${platform}-light.png`)
    // A tap on the dim closes it
    await page.getByTestId("sheet-scrim").click({ position: { x: 20, y: 40 } })
    await expect(page.getByTestId("sheet")).toHaveCount(0)

    await page.getByTestId("open-actions").click()
    await expectOverlay(page, `action-sheet-${platform}-light.png`)
    await page.getByTestId("action-share").click()
    await expect(page.getByTestId("actions")).toHaveCount(0)
    await expect(page.getByTestId("overlay-last")).toHaveText("Last: Share")
  })

  test(`a menu opens under its trigger and runs an item (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "overlays" })
    const trigger = page.getByTestId("open-menu")
    await trigger.click()
    const menu = page.getByTestId("menu").getByRole("menu")
    await expect(menu).toBeVisible()
    await page.waitForTimeout(300)
    const triggerBox = (await trigger.boundingBox())!
    const menuBox = (await menu.boundingBox())!
    expect(Math.round(menuBox.x)).toBe(Math.round(triggerBox.x))
    expect(menuBox.y).toBeGreaterThan(triggerBox.y + triggerBox.height - 1)
    if (platform === "ios") expect(Math.round(menuBox.width)).toBe(250)
    await expectOverlay(page, `menu-${platform}-light.png`)
    await page.getByTestId("menu-rename").click()
    await expect(page.getByTestId("menu")).toHaveCount(0)
    await expect(page.getByTestId("overlay-last")).toHaveText("Last: Rename")
  })

  test(`toasts appear, run their action and leave (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "overlays" })
    await page.getByTestId("toast-success").click()
    const toaster = page.getByTestId("toaster")
    await expect(toaster.getByText("Payment sent")).toBeVisible()
    await expectOverlay(page, `toast-${platform}-light.png`)
    await page.getByTestId("toast-action").click()
    await toaster.getByRole("button", { name: "Undo" }).click()
    await expect(page.getByTestId("overlay-last")).toHaveText("Last: Undo")
    await expect(toaster.getByText("Message deleted")).toHaveCount(0)
  })

  test(`a toast with closeButton closes from its button on Android only (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "overlays" })
    await page.getByTestId("toast-close").click()
    const toaster = page.getByTestId("toaster")
    await expect(toaster.getByText("Connection lost")).toBeVisible()
    const close = toaster.getByRole("button", { name: "Close toast" })
    if (platform === "ios") {
      // iOS banners close with a swipe: the option is ignored
      await expect(close).toHaveCount(0)
      return
    }
    await expectOverlay(page, "toast-close-android-light.png")
    await close.click()
    await expect(toaster.getByText("Connection lost")).toHaveCount(0)
  })
}
