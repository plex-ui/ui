import { expect, test, type Locator } from "@playwright/test"
import { openGallery } from "./gallery"

const PHONE = { width: 393, height: 852 }

/** The fill, the outline, the label's color and size and the opacity of a sign-in button. */
async function look(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element)
    const label = [...element.querySelectorAll<HTMLElement>("div")].find((node) => node.childElementCount === 0 && /with/.test(node.textContent ?? ""))!
    const outline = [...element.children].find((node) => getComputedStyle(node).borderTopWidth === "1px") as HTMLElement | undefined
    const box = element.getBoundingClientRect()
    return {
      background: style.backgroundColor,
      outline: outline ? getComputedStyle(outline).borderTopColor : null,
      text: getComputedStyle(label).color,
      fontSize: getComputedStyle(label).fontSize,
      opacity: style.opacity,
      height: box.height,
      width: box.width,
      radius: style.borderTopLeftRadius,
      label: label.textContent,
    }
  })
}

for (const platform of ["ios", "android"] as const) {
  test(`sign-in buttons draw the providers' brand looks at the main button's size (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "sign-in" })
    const main = await page.getByTestId("sign-in-main").boundingBox()
    const googleLight = await look(page.getByTestId("google-light"))
    expect(googleLight).toMatchObject({ background: "rgb(255, 255, 255)", outline: "rgb(116, 119, 117)", text: "rgb(31, 31, 31)", fontSize: "14px", label: "Continue with Google" })
    expect(await look(page.getByTestId("google-neutral"))).toMatchObject({ background: "rgb(242, 242, 242)", outline: null, text: "rgb(31, 31, 31)" })
    expect(await look(page.getByTestId("google-dark"))).toMatchObject({ background: "rgb(19, 19, 20)", outline: "rgb(142, 145, 143)", text: "rgb(227, 227, 227)", label: "Sign up with Google" })
    // As tall and wide as the screen's main button, a capsule or a pill
    expect(googleLight.height).toBe(main!.height)
    expect(googleLight.width).toBeCloseTo(main!.width, 0)
    expect(googleLight.radius).toBe(`${main!.height / 2}px`)
    expect(main!.height).toBe(platform === "ios" ? 50 : 48)
    // The four-color G keeps its colors whatever color it is given
    const fills = await page.getByTestId("logo-google").locator("path").evaluateAll((paths) => paths.map((path) => path.getAttribute("fill")))
    expect(fills).toEqual(["#4285F4", "#34A853", "#FBBC05", "#EA4335"])
    // Disabled keeps the brand's colors at 40% and takes no presses
    const disabled = page.getByTestId("google-disabled")
    expect(await look(disabled)).toMatchObject({ background: "rgb(255, 255, 255)", opacity: "0.4" })
    await expect(disabled).toHaveAttribute("aria-disabled", "true")
    if (platform === "ios") {
      expect(await look(page.getByTestId("apple-light"))).toMatchObject({ background: "rgb(0, 0, 0)", text: "rgb(255, 255, 255)", label: "Continue with Apple" })
      expect(await look(page.getByTestId("apple-dark"))).toMatchObject({ background: "rgb(255, 255, 255)", text: "rgb(0, 0, 0)", label: "Sign in with Apple" })
      // Apple's logo is the title's color
      const logo = await page.getByTestId("apple-light").locator("path").first().getAttribute("fill")
      expect(logo).toBe("#FFFFFF")
      await expect(page.getByRole("button", { name: "Continue with Apple" }).first()).toBeVisible()
    } else {
      // Sign in with Apple is an iOS app's button
      await expect(page.getByTestId("apple-light")).toHaveCount(0)
    }
  })

  test(`Apple's button turns white in a dark scheme, never black on dark (${platform})`, async ({ page }) => {
    test.skip(platform === "android", "Sign in with Apple is iOS only")
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "dark", screen: "sign-in" })
    // The disabled pair follows the theme: Apple white, Google dark
    expect(await look(page.getByTestId("apple-disabled"))).toMatchObject({ background: "rgb(255, 255, 255)", text: "rgb(0, 0, 0)" })
    expect(await look(page.getByTestId("google-disabled"))).toMatchObject({ background: "rgb(19, 19, 20)", text: "rgb(227, 227, 227)" })
  })

  test(`a dialog without a title is its message alone (${platform})`, async ({ page }) => {
    await page.setViewportSize(PHONE)
    await openGallery(page, { platform, scheme: "light", screen: "overlays" })
    await page.getByTestId("open-dialog-message").click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAccessibleName("If you turn this off now, you won't be able to turn it on again.")
    await expect(dialog.getByRole("heading")).toHaveCount(0)
    await page.waitForTimeout(450)
    await expect(page).toHaveScreenshot(`dialog-message-${platform}-light.png`)
    await dialog.getByRole("button", { name: "Turn off" }).click()
    await expect(page.getByTestId("dialog-message")).toHaveCount(0)
    await expect(page.getByTestId("overlay-last")).toHaveText("Last: Turn off")
  })
}
