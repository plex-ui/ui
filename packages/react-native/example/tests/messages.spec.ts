import { expect, test, type Locator, type Page } from "@playwright/test"
import { openGallery } from "./gallery"

const PHONE = { width: 393, height: 852 }

/** A screenshot of the whole phone screen once the overlay has finished opening. */
async function expectOverlay(page: Page, name: string) {
  await page.waitForTimeout(450)
  await expect(page).toHaveScreenshot(name)
}

/** Holds a press on an element past the long press (500ms), as a finger does. */
async function longPress(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const box = (await target.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
}

for (const platform of ["ios", "android"] as const) {
  test(`an alert announces danger, runs an action and closes (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "messages" })
    await expect(page.getByTestId("alert-danger")).toHaveAttribute("role", "alert")
    await page.getByTestId("alert-upgrade").click()
    await expect(page.getByTestId("messages-last")).toHaveText("Last: Upgrade")
    await page.getByTestId("alert-storage").getByRole("button", { name: "Dismiss" }).click()
    await expect(page.getByTestId("alert-storage")).toHaveCount(0)
    await page.getByTestId("alert-again").click()
    await expect(page.getByTestId("alert-storage")).toBeVisible()
  })

  test(`a tip closes and runs its action; a popover tip opens at its control (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "messages" })
    const inline = page.getByTestId("tip-inline")
    await expect(inline).toHaveAttribute("role", "note")
    await inline.getByRole("button", { name: "Close tip" }).click()
    await expect(inline).toHaveCount(0)
    await page.getByTestId("tip-again").click()
    await expect(page.getByTestId("tip-inline")).toBeVisible()
    await page.getByTestId("tip-turn-on").click()
    await expect(page.getByTestId("messages-last")).toHaveText("Last: Turn on")

    await page.getByTestId("open-tip-popover").click()
    // The test id marks the overlay; the panel is a dialog named by the tip's title
    const tip = page.getByTestId("tip-popover").getByRole("dialog", { name: "Filter the list" })
    await expect(tip).toBeVisible()
    await expectOverlay(page, `messages-tip-popover-${platform}-light.png`)
    // Under its control, past the arrow
    const control = (await page.getByTestId("open-tip-popover").boundingBox())!
    const panel = (await tip.boundingBox())!
    expect(panel.y).toBeGreaterThan(control.y + control.height)
    await tip.getByRole("button", { name: "Close tip" }).click()
    await expect(page.getByTestId("tip-popover")).toHaveCount(0)
  })

  test(`a popover opens at its trigger, shakes and closes from inside (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "messages" })
    const trigger = page.getByTestId("open-popover")
    await trigger.click()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    const popover = page.getByTestId("popover").getByRole("dialog", { name: "Generate" })
    await expect(popover).toBeVisible()
    await expectOverlay(page, `messages-popover-${platform}-light.png`)
    // Once grown in: below the trigger, 8 from it, at least 300 wide
    const triggerBox = (await trigger.boundingBox())!
    const panel = (await popover.boundingBox())!
    expect(Math.round(panel.y - (triggerBox.y + triggerBox.height))).toBe(8)
    expect(panel.width).toBeGreaterThanOrEqual(300)
    await page.getByTestId("popover-shake").click()
    await expect(popover).toBeVisible()
    await page.getByTestId("popover-done").click()
    await expect(page.getByTestId("popover")).toHaveCount(0)
    await expect(page.getByTestId("messages-last")).toHaveText("Last: Generated")

    // Escape closes it too
    await trigger.click()
    await expect(page.getByTestId("popover")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("popover")).toHaveCount(0)
  })

  test(`a long press shows a tooltip, which hides by itself (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "messages" })
    const button = page.getByTestId("tooltip-button")
    // The content describes the trigger
    await expect(button).toHaveAccessibleDescription("Copy to clipboard")
    await longPress(page, button)
    const tooltip = page.getByTestId("tooltip-icon").getByRole("tooltip")
    await expect(tooltip).toHaveText("Copy to clipboard")
    const triggerBox = (await button.boundingBox())!
    const panel = (await tooltip.boundingBox())!
    expect(panel.y + panel.height).toBeLessThanOrEqual(triggerBox.y)
    await expect(page.getByTestId("tooltip-icon")).toHaveCount(0, { timeout: 3000 })

    // A tap opens text's tooltip, with the dotted underline while open
    await page.getByTestId("tooltip-trigger").click()
    await expect(page.getByTestId("tooltip-text")).toBeVisible()
    await expectOverlay(page, `messages-tooltip-${platform}-light.png`)
  })

  test(`a copy tooltip copies and says so (${platform})`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await openGallery(page, { platform, scheme: "light", screen: "messages" })
    await page.getByTestId("copy-session").click()
    await expect(page.getByTestId("copy-tooltip").getByText("Copied!")).toBeVisible()
    await expect(page.getByTestId("messages-last")).toHaveText("Last: Copied")
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("sess_12345abcdefg")
  })

  test(`a separator marks a grouping, links go where they say (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "messages" })
    const separator = page.getByTestId("separator-semantic")
    await expect(separator).toHaveAttribute("role", "separator")
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal")
    await expect(page.getByRole("separator")).toHaveCount(1)

    const external = page.getByTestId("link-external")
    await expect(external).toHaveAttribute("href", "https://example.com")
    await expect(external).toHaveAttribute("target", "_blank")
    await expect(page.getByRole("link", { name: "responses endpoint" })).toHaveAttribute("href", "#")
    await page.getByRole("button", { name: "contact us" }).click()
    await expect(page.getByTestId("messages-last")).toHaveText("Last: Contact")
  })
}
