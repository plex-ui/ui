import { expect, test } from "@playwright/test"
import { openGallery } from "./gallery"

for (const platform of ["ios", "android"] as const) {
  test(`a switch, a checkbox and a radio group change their values (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "controls" })
    const wifi = page.getByRole("switch", { name: "Wi-Fi" })
    await expect(wifi).toHaveAttribute("aria-checked", "true")
    await wifi.click()
    await expect(wifi).toHaveAttribute("aria-checked", "false")
    await expect(page.getByTestId("switch-value")).toHaveText("Wi-Fi: off")
    // A disabled switch does not move
    const disabled = page.getByRole("switch", { name: "Disabled on" })
    await disabled.click({ force: true })
    await expect(disabled).toHaveAttribute("aria-checked", "true")

    const terms = page.getByRole("checkbox", { name: "Accept the terms" })
    await terms.click()
    await expect(page.getByTestId("checkbox-value")).toHaveText("Terms: true")
    await expect(page.getByRole("checkbox", { name: "Indeterminate" })).toHaveAttribute("aria-checked", "mixed")

    const yearly = page.getByRole("radio", { name: "Yearly" })
    await yearly.click()
    await expect(yearly).toHaveAttribute("aria-checked", "true")
    await expect(page.getByRole("radio", { name: "Monthly" })).toHaveAttribute("aria-checked", "false")
    await expect(page.getByTestId("radio-value")).toHaveText("Plan: yearly")
    await page.getByRole("radio", { name: "Lifetime" }).click({ force: true })
    await expect(page.getByTestId("radio-value")).toHaveText("Plan: yearly")
  })

  test(`a field clears, shows its error and a select chooses an option (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "fields" })
    const search = page.getByRole("textbox", { name: "Search" })
    await expect(search).toHaveValue("Coffee")
    await page.getByRole("button", { name: "Clear" }).first().click()
    await expect(search).toHaveValue("")
    await search.fill("Tea")
    await expect(search).toHaveValue("Tea")

    const email = page.getByRole("textbox", { name: "Email" })
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByText("Enter a full address")).toBeVisible()
    await email.fill("hello@plexui.com")
    await expect(page.getByText("Enter a full address")).toHaveCount(0)

    await page.getByTestId("select-fruit").click()
    const menu = page.getByTestId("select-fruit-menu")
    await expect(menu.getByRole("menuitem", { name: "Banana" })).toBeVisible()
    await menu.getByRole("menuitem", { name: "Cherry" }).click()
    await expect(page.getByTestId("select-value")).toHaveText("Fruit: cherry")
    await expect(page.getByTestId("select-fruit-menu")).toHaveCount(0)
  })
}

test("the keyboard of the web: Space toggles a switch and a checkbox, the arrows choose a radio", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "controls" })
  const wifi = page.getByRole("switch", { name: "Wi-Fi" })
  await wifi.focus()
  await page.keyboard.press("Space")
  await expect(page.getByTestId("switch-value")).toHaveText("Wi-Fi: off")
  await page.getByRole("checkbox", { name: "Accept the terms" }).focus()
  await page.keyboard.press("Space")
  await expect(page.getByTestId("checkbox-value")).toHaveText("Terms: true")
  // One radio in the tab order, the chosen one; the arrows move and choose, past the disabled one
  await expect(page.getByRole("radio", { name: "Yearly" })).toHaveAttribute("tabindex", "-1")
  await page.getByRole("radio", { name: "Monthly" }).focus()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByTestId("radio-value")).toHaveText("Plan: yearly")
  await expect(page.getByRole("radio", { name: "Yearly" })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByTestId("radio-value")).toHaveText("Plan: monthly")
  // A description is read with its control
  await expect(page.getByRole("radio", { name: "Monthly" })).toHaveAccessibleDescription("Billed every month")
})
