import { defineConfig, devices } from "@playwright/test"

const port = 8092

/**
 * Tests of the web build of the example: screenshots of every screen in each platform and scheme, the switches of
 * the gallery, and the tokens of @plexui/styles as Chromium computes them against the values React Native draws.
 */
export default defineConfig({
  testDir: "./tests",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${port}`,
    // A phone: the theme's density layer and the phone layers of the CSS apply as on a device
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, scale: "css", animations: "disabled" } },
  webServer: {
    command: `npm run export:web && node tests/serve.mjs ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
