import { expect, test } from "@playwright/test"
import { openGallery } from "./gallery"

test("the platform switch draws Material 3 and back", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "buttons" })
  await expect(page.getByText("PRESSABLE")).toBeVisible()
  const solid = page.getByRole("button", { name: "primary" }).first()
  const iosHeight = (await solid.boundingBox())!.height
  await page.getByTestId("platform-android").click()
  await expect(page.getByText("Pressable", { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/platform=android/)
  // Material 3: an S button is 40 high; the phone layer's medium button 34
  const androidHeight = (await solid.boundingBox())!.height
  expect([iosHeight, androidHeight]).toEqual([34, 40])
  await page.getByTestId("platform-ios").click()
  await expect(page.getByText("PRESSABLE")).toBeVisible()
})

test("the scheme switch turns the gallery dark", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "theme" })
  const background = () => page.getByTestId("gallery").evaluate((element) => getComputedStyle(element).backgroundColor)
  const light = await background()
  await page.getByTestId("scheme-dark").click()
  await expect.poll(background).not.toBe(light)
  await expect(page.getByTestId("swatch---color-text")).toContainText("#ffffff")
})

test("a brand theme changes the accent, the primary actions and the face", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "theme" })
  await expect(page.getByTestId("swatch---color-accent")).toContainText("#0285ff")
  await page.getByTestId("brand-violet").click()
  await expect(page.getByTestId("swatch---color-accent")).toContainText("#7c3aed")
  await expect(page.getByTestId("swatch-primary")).toContainText(/#7c3aed/)
  const family = await page.getByText("--color-accent", { exact: true }).evaluate((element) => getComputedStyle(element).fontFamily)
  expect(family).toContain("Georgia")
})

test("buttons press, toggle and announce their state", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "buttons" })
  await page.getByTestId("button-count").click()
  await page.getByTestId("button-count").click()
  await expect(page.getByTestId("button-count")).toHaveText("Pressed 2")
  await expect(page.getByTestId("button-toggle")).toHaveAttribute("aria-selected", "true")
  await page.getByTestId("button-toggle").click()
  await expect(page.getByTestId("button-toggle")).toHaveText("Not selected")
  await expect(page.getByRole("button", { name: "Disabled" }).first()).toBeDisabled()
})

test("an icon button has a name and toggles", async ({ page }) => {
  await openGallery(page, { platform: "android", scheme: "light", screen: "icon-buttons" })
  await page.getByRole("button", { name: "Like" }).click()
  await expect(page.getByRole("button", { name: "Unlike" })).toBeVisible()
  // Material asks for a 48dp target around a 40dp icon button
  const box = (await page.getByRole("button", { name: "Unlike" }).boundingBox())!
  expect(box.height).toBe(40)
})
