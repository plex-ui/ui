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
    const disabled = page.getByRole("switch", { name: "VPN" })
    await disabled.click({ force: true })
    await expect(disabled).toHaveAttribute("aria-checked", "true")

    const terms = page.getByRole("checkbox", { name: "Subscribe to the newsletter" })
    await terms.click()
    await expect(page.getByTestId("checkbox-value")).toHaveText("Newsletter: true")
    await expect(page.getByRole("checkbox", { name: "Select all" })).toHaveAttribute("aria-checked", "mixed")

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
    const search = page.getByRole("searchbox", { name: "Search" })
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

    await page.getByTestId("select-country").click()
    const menu = page.getByTestId("select-country-menu")
    await expect(menu.getByRole("menuitemradio", { name: "United Kingdom" })).toBeVisible()
    await menu.getByRole("menuitemradio", { name: "Germany" }).click()
    await expect(page.getByTestId("select-value")).toHaveText("Country or region: Germany")
    await expect(page.getByTestId("select-country-menu")).toHaveCount(0)
  })
}

test("the keyboard of the web: Space toggles a switch and a checkbox, the arrows choose a radio", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "controls" })
  const wifi = page.getByRole("switch", { name: "Wi-Fi" })
  await wifi.focus()
  await page.keyboard.press("Space")
  await expect(page.getByTestId("switch-value")).toHaveText("Wi-Fi: off")
  await page.getByRole("checkbox", { name: "Subscribe to the newsletter" }).focus()
  await page.keyboard.press("Space")
  await expect(page.getByTestId("checkbox-value")).toHaveText("Newsletter: true")
  // One radio in the tab order, the chosen one; the arrows move and choose, past the disabled one
  await expect(page.getByRole("radio", { name: "Yearly" })).toHaveAttribute("tabindex", "-1")
  await page.getByRole("radio", { name: "Monthly" }).focus()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByTestId("radio-value")).toHaveText("Plan: yearly")
  await expect(page.getByRole("radio", { name: "Yearly" })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByTestId("radio-value")).toHaveText("Plan: monthly")
  // A description is read with its control
  await expect(page.getByRole("radio", { name: "Monthly" })).toHaveAccessibleDescription("$4.99 a month")
})

// Android's outlined field at rest (owner's review, 26.11): its line is Material 3's `outline` and its label
// `onSurfaceVariant`, so the field reads on its surface. The line needs 3:1 (a control's boundary, WCAG 1.4.11), the
// label 4.5:1 (text), empty (the label on the line's middle) and filled (the label floating on the top line).
for (const scheme of ["light", "dark"] as const) {
  test(`Android's outlined field: its idle line and its label read on the surface (${scheme})`, async ({ page }) => {
    await openGallery(page, { platform: "android", scheme, screen: "fields-more" })
    for (const [name, label] of [["Email address", "empty"], ["Password", "filled"]] as const) {
      const field = page.getByLabel(name, { exact: true })
      const contrast = await field.evaluate((input, labelText) => {
        const rgb = (css: string) => (css.match(/[\d.]+/g) ?? []).map(Number)
        const lum = ([r, g, b]: number[]) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
        const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
        // The field's box: the nearest ancestor that holds the outlined frame and the label
        let box: Element | null = input
        let frame: Element | undefined
        let tag: Element | undefined
        while (box && !(frame && tag)) {
          box = box.parentElement
          if (!box) break
          const all = Array.from(box.querySelectorAll("*"))
          frame = all.find((e) => { const s = getComputedStyle(e); return s.borderTopStyle === "solid" && parseFloat(s.borderTopWidth) > 0 && rgb(s.borderTopColor)[3] !== 0 })
          // The label as drawn, not a hidden copy that sizes the field
          tag = all.find((e) => e.childElementCount === 0 && e.textContent === labelText && e !== input && e.checkVisibility({ opacityProperty: true }))
        }
        let surface: Element | null = box
        while (surface && (getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)" || rgb(getComputedStyle(surface).backgroundColor)[3] === 0)) surface = surface.parentElement
        const back = rgb(getComputedStyle(surface ?? document.body).backgroundColor)
        return {
          line: frame ? ratio(rgb(getComputedStyle(frame).borderTopColor), back) : 0,
          label: tag ? ratio(rgb(getComputedStyle(tag).color), back) : 0,
        }
      }, name)
      expect(contrast.line, `${label} field's line`).toBeGreaterThanOrEqual(3)
      expect(contrast.label, `${label} field's label`).toBeGreaterThanOrEqual(4.5)
    }
  })
}
