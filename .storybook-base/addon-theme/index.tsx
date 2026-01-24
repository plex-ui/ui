// organize-imports-ignore
// @ts-expect-error -- React import is required here
import React from "react"
import { addons, types } from "@storybook/manager-api"
import { THEMES } from "./themes"
import { getThemeStore } from "./themeStore"
import { Tool } from "./Tool"

export const init = () => {
  // Get initial theme from storage
  const initialTheme = getThemeStore()

  // Apply initial theme with dynamically determined logo paths
  // THEMES are created at module load time, but paths are determined at runtime
  // This ensures correct paths for both local dev and GitHub Pages
  addons.setConfig({
    theme: {
      ...THEMES[initialTheme],
    },
  })

  // Register the toolbar action
  addons.register("oai-storybook/theme-toggle", (api) => {
    addons.add("oai-storybook/theme-toggle", {
      title: "Theme toggle",
      type: types.TOOL,
      match: ({ viewMode }) => viewMode === "story" || viewMode === "docs",
      render: () => <Tool api={api} />,
    })
  })
}
