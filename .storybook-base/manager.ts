import { addons } from "@storybook/manager-api"

// Set base path in globalThis BEFORE importing addon-theme
// This ensures the value is available when themes.ts is evaluated
// In production, Vite will replace __STORYBOOK_BASE_PATH__ via define
if (typeof globalThis !== "undefined") {
  const globalObj = globalThis as { __STORYBOOK_BASE_PATH__?: string }
  if (!globalObj.__STORYBOOK_BASE_PATH__) {
    // @ts-ignore - __STORYBOOK_BASE_PATH__ is replaced by Vite at build time, may not exist in dev
    const buildTimePath: string | undefined =
      // @ts-ignore
      typeof __STORYBOOK_BASE_PATH__ !== "undefined" ? __STORYBOOK_BASE_PATH__ : undefined
    globalObj.__STORYBOOK_BASE_PATH__ = buildTimePath || ""
  }
}

import { init as initThemeAddon } from "./addon-theme"

import "./addon-back-to-docs"
import "./addon-title"
import "./addon-toggle-addons"

addons.setConfig({
  navSize: 230,
  toolbar: {
    copy: { hidden: true },
    eject: { hidden: true },
    fullscreen: { hidden: true },
    createStory: { hidden: true },
  },
  sidebar: {
    showRoots: true,
    collapsedRoots: [],
  },
  docs: {
    isCodeExpanded: true,
    source: {
      state: "shown",
    },
  },
})

// Manually initialize local addons
initThemeAddon()

addons.register("view-mode", (api) => {
  const channel = addons.getChannel()

  const setAttr = (mode: "story" | "docs") =>
    document.documentElement.setAttribute("data-view-mode", mode)

  setAttr(api.getUrlState().viewMode === "docs" ? "docs" : "story")

  channel.on("docsRendered", () => setAttr("docs"))
  channel.on("storyRendered", () => {
    const { viewMode } = api.getUrlState() // 'story' | 'docs' | custom tabs :contentReference[oaicite:0]{index=0}
    setAttr(viewMode === "docs" ? "docs" : "story")
  })
})
