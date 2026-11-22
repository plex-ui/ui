import { expect, test } from "@playwright/test"
import { expectScreen, openGallery, type State } from "./gallery"

/** Every screen of the gallery, by stage. */
const SCREENS = ["theme", "text", "icons", "buttons", "icon-buttons", "bars", "tab-bar", "segmented", "controls", "fields", "overlays", "content", "lists"]

/** Both platforms and both schemes for every screen; all four, and the brand, where the theme shows most. */
const STATES: Omit<State, "screen">[] = [
  { platform: "ios", scheme: "light" },
  { platform: "android", scheme: "dark" },
]
const FULL: Record<string, Omit<State, "screen">[]> = {
  theme: [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
    { platform: "ios", scheme: "light", brand: "violet" },
    { platform: "android", scheme: "dark", brand: "violet" },
  ],
  "bars": [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
  ],
  "tab-bar": [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
  ],
  "segmented": [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light", brand: "violet" },
  ],
  controls: [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
    { platform: "ios", scheme: "light", brand: "violet" },
  ],
  fields: [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
  ],
  content: [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
  ],
  lists: [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
    { platform: "ios", scheme: "light", brand: "violet" },
  ],
  buttons: [
    { platform: "ios", scheme: "dark" },
    { platform: "android", scheme: "light" },
    { platform: "ios", scheme: "light", brand: "violet" },
    { platform: "android", scheme: "light", brand: "violet" },
  ],
}

test("every screen of the gallery has screenshots", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "theme" })
  const tabs = await page.locator('[data-testid^="screen-tab-"]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-testid")!.replace("screen-tab-", "")),
  )
  expect(tabs).toEqual(SCREENS)
})

for (const screen of SCREENS) {
  for (const state of [...STATES, ...(FULL[screen] ?? [])]) {
    const name = [screen, state.platform, state.scheme, state.brand].filter(Boolean).join("-")
    test(`screenshot ${name}`, async ({ page }) => {
      // A skeleton pulses: with reduced motion it stands still for the picture
      if (screen === "content") await page.emulateMedia({ reducedMotion: "reduce" })
      await openGallery(page, { ...state, screen })
      await expectScreen(page, screen, `${name}.png`)
    })
  }
}
