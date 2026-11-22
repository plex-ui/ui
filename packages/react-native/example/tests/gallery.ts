import { expect, type Page } from "@playwright/test"

export type State = { platform: "ios" | "android"; scheme: "light" | "dark"; brand?: "plex" | "violet"; screen: string }

/** Opens a state of the gallery and waits for its screen and fonts. */
export async function openGallery(page: Page, { platform, scheme, brand = "plex", screen }: State) {
  await page.goto(`/#platform=${platform}&scheme=${scheme}&brand=${brand}&screen=${screen}`)
  await expect(page.getByTestId(`screen-${screen}`)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

/** A screenshot of a whole screen: the page grows to the height of its content, so nothing is scrolled away. */
export async function expectScreen(page: Page, screen: string, name: string) {
  const content = page.getByTestId(`screen-${screen}`)
  const { top, height } = await content.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    height: element.scrollHeight,
  }))
  await page.setViewportSize({ width: 393, height: Math.ceil(top + height) })
  await expect(content).toHaveScreenshot(name)
}
