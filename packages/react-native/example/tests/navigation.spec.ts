import { expect, test } from "@playwright/test"
import { openGallery } from "./gallery"

for (const platform of ["ios", "android"] as const) {
  test(`a tab bar selects a tab and names its badge (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "tab-bar" })
    const bar = page.getByTestId("tab-bar-interactive")
    const chats = bar.getByRole("tab", { name: "New, 3" })
    await expect(bar.getByRole("tab", { name: "Home" })).toHaveAttribute("aria-selected", "true")
    await chats.click()
    await expect(chats).toHaveAttribute("aria-selected", "true")
    await expect(page.getByTestId("tab-bar-value")).toHaveText("Selected: new")
    // A disabled tab stays unselected
    const calendar = page.getByRole("tab", { name: "Radio" }).and(page.locator("[aria-disabled=true]"))
    await expect(calendar).toHaveCount(1)
  })
}

test("a minimized tab bar shows the selected tab alone and expands on a tap", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "tab-bar" })
  const bar = page.getByTestId("tab-bar-minimized")
  await expect(bar.getByRole("tab")).toHaveCount(2) // the selected tab and the search circle
  const chats = bar.getByRole("tab", { name: "New, 3" })
  expect((await chats.boundingBox())!.width).toBe(40)
  await chats.click()
  await expect(bar.getByRole("tab")).toHaveCount(5)
  // Android's navigation bar does not minimize
  await page.getByTestId("platform-android").click()
  await expect(page.getByTestId("tab-bar-minimized").getByRole("tab")).toHaveCount(5)
})

for (const platform of ["ios", "android"] as const) {
  test(`a prominent tab takes the circle and search joins the tabs (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "tab-bar" })
    const bar = page.getByTestId("tab-bar-both")
    await expect(bar.getByRole("tab")).toHaveCount(5)
    const search = bar.getByRole("tab", { name: "Search" })
    await search.click()
    await expect(search).toHaveAttribute("aria-selected", "true")
    await expect(bar.getByRole("tab", { name: "New playlist" })).toBeVisible()
  })
}

test("a tab bar with an accessory keeps its height when it minimizes", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "tab-bar" })
  const expanded = (await page.getByTestId("tab-bar-accessory").boundingBox())!.height
  const minimized = (await page.getByTestId("tab-bar-accessory-minimized").boundingBox())!.height
  expect(expanded).toBe(151)
  expect(minimized).toBe(expanded)
})

for (const platform of ["ios", "android"] as const) {
  test(`tabs answer the keyboard: arrows move the selection, Space selects (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "segmented" })
    const week = page.getByTestId("segmented-week")
    const month = page.getByTestId("segmented-month")
    // One tab in the Tab order: the selected one
    await expect(week).toHaveAttribute("tabindex", "0")
    await expect(month).toHaveAttribute("tabindex", "-1")
    await week.focus()
    await page.keyboard.press("ArrowRight")
    await expect(month).toHaveAttribute("aria-selected", "true")
    await expect(month).toBeFocused()
    await page.keyboard.press("Home")
    await expect(page.getByTestId("segmented-day")).toHaveAttribute("aria-selected", "true")
    await page.getByTestId("segmented-year").focus()
    await page.keyboard.press(" ")
    await expect(page.getByTestId("segmented-year")).toHaveAttribute("aria-selected", "true")
    // The tab bar too
    await openGallery(page, { platform, scheme: "light", screen: "tab-bar" })
    const bar = page.getByTestId("tab-bar-interactive")
    await bar.getByRole("tab", { name: "Home" }).focus()
    await page.keyboard.press("ArrowRight")
    await expect(page.getByTestId("tab-bar-value")).toHaveText("Selected: new")
  })
}

for (const platform of ["ios", "android"] as const) {
  test(`a segmented control selects a segment and moves its selection (${platform})`, async ({ page }) => {
    await openGallery(page, { platform, scheme: "light", screen: "segmented" })
    const control = page.getByTestId("segmented")
    const month = page.getByTestId("segmented-month")
    await expect(page.getByTestId("segmented-week")).toHaveAttribute("aria-selected", "true")
    await month.click()
    await expect(month).toHaveAttribute("aria-selected", "true")
    await expect(page.getByTestId("segmented-week")).toHaveAttribute("aria-selected", "false")
    // The badge is read with the name, not drawn
    const mailbox = page.getByTestId("segmented-mailbox")
    await expect(mailbox.getByRole("tab", { name: "Unread, 2" })).toBeVisible()
    await expect(mailbox.getByText("2", { exact: true })).toHaveCount(0)
    // Equal segments, as UISegmentedControl
    const widths = await control.getByRole("tab").evaluateAll((tabs) => tabs.map((tab) => Math.round(tab.getBoundingClientRect().width)))
    expect(new Set(widths).size).toBe(1)
    if (platform === "ios") {
      // The thumb lands under the selected segment
      await expect
        .poll(async () => {
          const thumb = await control.evaluate((element) => {
            // The web's thumb is a CSS slide; the glass's lens is an absolute view too, so the slide is found by name
            const slide = element.querySelector("[data-plex-slide]")
            const views = [...element.querySelectorAll("div")].filter((div) => getComputedStyle(div).position === "absolute" && div.getAttribute("role") !== "tab")
            const box = (slide ?? views[0])?.getBoundingClientRect()
            return box ? Math.round(box.left) : -1
          })
          return thumb - Math.round((await month.boundingBox())!.x)
        })
        .toBe(0)
    }
  })
}

test("the large control is 48 high, the small 32 and the bar's row 40", async ({ page }) => {
  await openGallery(page, { platform: "ios", scheme: "light", screen: "bars" })
  const heights = await page.getByRole("tablist").evaluateAll((lists) => lists.map((list) => list.getBoundingClientRect().height))
  expect(heights).toEqual([48, 40])
  await openGallery(page, { platform: "ios", scheme: "light", screen: "segmented" })
  const sizes = await page.getByRole("tablist").evaluateAll((lists) => lists.slice(0, 5).map((list) => list.getBoundingClientRect().height))
  expect(sizes).toEqual([48, 32, 32, 48, 49])
})

test("a toolbar's title is a header, centered on both platforms", async ({ page }) => {
  for (const platform of ["android", "ios"] as const) {
    await openGallery(page, { platform, scheme: "light", screen: "bars" })
    const inbox = page.getByRole("heading", { name: "Inbox", exact: true })
    await expect(inbox).toBeVisible()
    const frame = (await inbox.boundingBox())!
    // The middle of the title is the middle of the bar (393 wide): iOS 26, and Android's centered title
    expect(Math.abs(frame.x + frame.width / 2 - 393 / 2)).toBeLessThan(2)
  }
})

test("a link scrolls a screen and opens an overlay, and the address keeps both", async ({ page }) => {
  await page.goto("/#platform=ios&scheme=light&brand=plex&screen=lists&scroll=1200")
  const lists = page.getByTestId("screen-lists")
  await expect(lists).toBeVisible()
  await expect.poll(() => lists.evaluate((element) => element.scrollTop)).toBe(1200)
  await expect(page).toHaveURL(/scroll=1200/)
  // Once reached, the offset is left alone: a later change of the layout keeps where the reader scrolled to
  await page.mouse.move(200, 500)
  await page.mouse.wheel(0, -900)
  await expect.poll(() => lists.evaluate((element) => element.scrollTop)).toBe(300)
  await page.setViewportSize({ width: 393, height: 700 })
  await page.waitForTimeout(300)
  expect(await lists.evaluate((element) => element.scrollTop)).toBe(300)
  // A control of the gallery drops the link's offset
  await page.getByTestId("scheme-dark").click()
  await expect(page).not.toHaveURL(/scroll=/)

  await page.goto("/#platform=ios&scheme=light&brand=plex&screen=overlays&open=menu")
  await expect(page.getByTestId("menu")).toBeVisible()
  await expect(page).toHaveURL(/open=menu/)
  await page.goto("/#platform=android&scheme=light&brand=plex&screen=overlays&open=toast-success")
  await expect(page.getByText("Payment sent")).toBeVisible()
})
