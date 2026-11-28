import { expect, test, type Page } from "@playwright/test"
import native from "./keyboard-native.json"
import { openGallery } from "./gallery"

// The drawn keyboard against the native ones: every key's frame within 1pt of the iOS 26.2 simulator's (iPhone 17 Pro,
// 402pt) and the Pixel 9 emulator's Gboard (411.43dp), measured from their screenshots
type Frame = { x: number; y: number; w: number; h: number }
type Native = { device: { width: number; height: number }; layouts: Record<string, { height: number; keys: Frame[] }> }

const CASES = {
  ios: [
    ["Name", "default"],
    ["Email", "email"],
    ["Website", "url"],
    ["Search", "web"],
    ["Code", "number"],
    ["Amount", "decimal"],
    ["Phone", "phone"],
  ],
  android: [
    ["Name", "text"],
    ["Email", "email"],
    ["Website", "url"],
    ["Password", "password"],
    ["Code", "number"],
    ["Amount", "decimal"],
    ["Phone", "phone"],
  ],
} as const

async function drawnKeys(page: Page) {
  return page.getByTestId("keyboard").evaluate((panel) => {
    const box = panel.getBoundingClientRect()
    const keys = Array.from(panel.querySelectorAll<HTMLElement>("[data-testid^='keyboard-']"))
      .filter((key) => {
        const fill = getComputedStyle(key).backgroundColor
        return fill !== "rgba(0, 0, 0, 0)" && fill !== "transparent" && !key.dataset.testid!.startsWith("keyboard-divider")
      })
      .map((key) => {
        const rect = key.getBoundingClientRect()
        return { x: rect.left - box.left, y: rect.top - box.top, w: rect.width, h: rect.height }
      })
    return { height: box.height, bottom: window.innerHeight - box.bottom, keys }
  })
}

for (const platform of ["ios", "android"] as const) {
  const reference = native[platform] as Native
  for (const [label, layout] of CASES[platform]) {
    test(`the drawn keyboard matches the native one: ${platform} ${layout}`, async ({ page }) => {
      await page.setViewportSize({ width: Math.round(reference.device.width), height: Math.round(reference.device.height) })
      await openGallery(page, { platform, scheme: "light", screen: "keyboard" })
      await expect(page.getByTestId("keyboard")).toHaveCount(0)
      await page.getByLabel(label, { exact: true }).focus()
      await expect(page.getByTestId("keyboard")).toBeVisible()
      // Up once it has slid in
      await expect.poll(async () => (await drawnKeys(page)).bottom).toBe(0)
      const drawn = await drawnKeys(page)
      const expected = reference.layouts[layout]
      expect(drawn.bottom).toBe(0)
      expect(Math.abs(drawn.height - expected.height)).toBeLessThanOrEqual(1)
      expect(drawn.keys).toHaveLength(expected.keys.length)
      const off = expected.keys.flatMap((key) => {
        const mine = drawn.keys.reduce((best, k) => (Math.hypot(k.x - key.x, k.y - key.y) < Math.hypot(best.x - key.x, best.y - key.y) ? k : best))
        const distance = Math.max(Math.abs(mine.x - key.x), Math.abs(mine.y - key.y), Math.abs(mine.w - key.w), Math.abs(mine.h - key.h))
        return distance > 1 ? [`native ${JSON.stringify(key)} drawn ${JSON.stringify(mine)}`] : []
      })
      expect(off).toEqual([])
    })
  }
}

test("the keyboard follows focus: it goes on blur, stays from field to field, and skips a field that opens none", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "keyboard" })
  const keyboard = page.getByTestId("keyboard")
  await page.getByLabel("Name", { exact: true }).focus()
  await expect(keyboard).toBeVisible()
  // On the page's body, over the app and its modals' layers
  expect(await keyboard.evaluate((panel) => panel.parentElement?.parentElement === document.body)).toBe(true)
  // Capitals at the start of an empty, auto-capitalizing field; lower case once a word is typed
  await expect(page.getByTestId("keyboard-key-q")).toHaveText("Q")
  await page.keyboard.type("hello")
  await expect(page.getByTestId("keyboard-key-q")).toHaveText("q")
  // A press on the keyboard keeps the field's focus
  await page.getByTestId("keyboard-key-w").click()
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused()
  await page.getByLabel("Email", { exact: true }).focus()
  await expect(page.getByTestId("keyboard-key-at")).toBeVisible()
  await expect(page.getByTestId("keyboard-key-q")).toHaveText("q")
  await page.getByLabel("No keyboard", { exact: true }).focus()
  await expect(keyboard).toHaveCount(0)
  await page.getByLabel("Code", { exact: true }).focus()
  await expect(page.getByTestId("keyboard-key-0")).toBeVisible()
  await page.getByLabel("Code", { exact: true }).blur()
  await expect(keyboard).toHaveCount(0)
})

/** How far the keyboard's top stands over the window's bottom, every frame */
async function recordRise(page: Page) {
  await page.evaluate(() => {
    const view = window as unknown as { rise: (number | null)[] }
    view.rise = []
    const tick = () => {
      const panel = document.querySelector("[data-testid='keyboard']")
      view.rise.push(panel ? Math.round((window.innerHeight - panel.getBoundingClientRect().top) * 10) / 10 : null)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  return () => page.evaluate(() => (window as unknown as { rise: (number | null)[] }).rise.filter((value): value is number => value != null))
}

for (const platform of ["ios", "android"] as const) {
  test(`the keyboard slides up from under the window's edge and back down: ${platform}`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "keyboard" })
    const rise = await recordRise(page)
    const keyboard = page.getByTestId("keyboard")
    await page.getByLabel("Name", { exact: true }).focus()
    await expect.poll(async () => (await drawnKeys(page)).bottom).toBe(0)
    const up = await rise()
    const height = up[up.length - 1]
    // Frames on its way, each higher than the one before (iOS's spring, Gboard's 285ms curve)
    const between = up.filter((value) => value > 1 && value < height - 1)
    expect(between.length).toBeGreaterThan(5)
    expect(up.every((value, index) => index === 0 || value >= up[index - 1] - 0.1)).toBe(true)
    // On blur it is still there, going down, and then gone
    await page.getByLabel("Name", { exact: true }).blur()
    await expect(keyboard).toHaveCount(1)
    await expect(keyboard).toHaveCount(0)
    const all = await rise()
    expect(all.slice(up.length).some((value) => value > 1 && value < height - 1)).toBe(true)
  })
}

test("with reduced motion the keyboard stands up at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGallery(page, { platform: "ios", scheme: "light", screen: "keyboard" })
  const rise = await recordRise(page)
  await page.getByLabel("Name", { exact: true }).focus()
  await expect.poll(async () => (await drawnKeys(page)).bottom).toBe(0)
  const up = await rise()
  const height = up[up.length - 1]
  expect(up.filter((value) => value > 1 && value < height - 1).length).toBeLessThanOrEqual(1)
})

test("the return key follows the field's returnKeyType", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "keyboard" })
  const fill = () => page.getByTestId("keyboard-return").evaluate((key) => getComputedStyle(key).backgroundColor)
  await page.getByLabel("Name", { exact: true }).focus()
  expect(await fill()).toBe("rgb(255, 255, 255)")
  await page.getByLabel("Message", { exact: true }).focus()
  expect(await fill()).toBe("rgb(0, 122, 255)")
  await page.getByLabel("Email", { exact: true }).focus()
  expect(await fill()).toBe("rgb(255, 255, 255)")
})

test("no keyboard is drawn on a touch screen", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 393, height: 852 } })
  const page = await context.newPage()
  await openGallery(page, { platform: "ios", scheme: "light", screen: "keyboard" })
  await page.getByLabel("Name", { exact: true }).focus()
  await page.waitForTimeout(200)
  await expect(page.getByTestId("keyboard")).toHaveCount(0)
  await context.close()
})
