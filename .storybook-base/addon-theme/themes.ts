import { create, themes, type ThemeVars } from "@storybook/theming"
import { type Theme } from "./constants"

// Get base path dynamically at runtime
// This function determines the base path from various sources:
// 1. Build-time replacement via Vite define (__STORYBOOK_BASE_PATH__)
// 2. Runtime global variable (set by manager.ts before this module loads)
// 3. window.location.pathname analysis (for GitHub Pages when build-time replacement fails)
// 4. Fallback to empty string (local dev)
function getBasePath(): string {
  // First, try to use __STORYBOOK_BASE_PATH__ directly (replaced by Vite at build time)
  // @ts-expect-error - May not be defined in dev mode, will be replaced by Vite in production
  if (typeof __STORYBOOK_BASE_PATH__ !== "undefined") {
    // @ts-expect-error - Variable is replaced by Vite define in production
    const buildTimePath = __STORYBOOK_BASE_PATH__
    if (buildTimePath) {
      return buildTimePath
    }
  }

  // Fallback to globalThis (set by manager.ts before this module loads)
  const globalObj = globalThis as { __STORYBOOK_BASE_PATH__?: string }
  if (globalObj.__STORYBOOK_BASE_PATH__ !== undefined && globalObj.__STORYBOOK_BASE_PATH__ !== "") {
    return globalObj.__STORYBOOK_BASE_PATH__
  }

  // Runtime detection: analyze window.location.pathname for GitHub Pages
  // This is a fallback when build-time replacement doesn't work
  // For GitHub Pages, the pathname will be like /storybook/... or /storybook/index.html
  if (typeof window !== "undefined" && window.location) {
    const pathname = window.location.pathname
    // Extract base path from pathname
    // Pattern: /storybook/... -> base path is /storybook
    const pathSegments = pathname.split("/").filter(Boolean)
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0]
      // Check if this looks like a repo name (not a route)
      // Common patterns: /storybook/index.html, /storybook/iframe.html, /storybook/?path=...
      if (
        pathname.includes("/index.html") ||
        pathname.includes("/iframe.html") ||
        pathname.includes("?path=") ||
        pathname.endsWith("/") ||
        pathname === `/${firstSegment}`
      ) {
        return `/${firstSegment}`
      }
    }
  }

  // Final fallback: empty string (local dev)
  return ""
}

// Get logo paths dynamically at runtime
function getLogoPath(logoName: string): string {
  const basePath = getBasePath()
  if (basePath) {
    // Ensure basePath doesn't end with / to avoid double slashes
    const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
    return `${cleanBasePath}/${logoName}`
  }
  return `/${logoName}`
}

// Create theme factory function that generates themes with correct logo paths at runtime
function createThemes(): Record<Theme, ThemeVars> {
  const logoPath = getLogoPath("logo-storybook.svg")
  const logoDarkPath = getLogoPath("logo-storybook-dark.svg")

  const light = create({
    base: "light",
    // Logo
    brandTitle: "Plex UI",
    brandImage: logoPath,
    brandUrl: "#",
    brandTarget: "_self",

    // Typography
    fontBase: `ui-sans-serif, -apple-system, system-ui, "Segoe UI", "Noto Sans", "Helvetica",
      "Arial", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`,
    fontCode: `ui-monospace, "SFMono-Regular", "SF Mono", "Menlo", "Monaco", "Consolas",
      "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`,

    // Variables
    colorPrimary: "#3A10E5",
    colorSecondary: "#585C6D",

    // UI
    appBg: "#ffffff",
    appContentBg: "#ffffff",
    appPreviewBg: "#ffffff",
    appBorderColor: "#ededed",
    appBorderRadius: 6,

    // Toolbar default and active colors
    barTextColor: "#6e6e80",
    barBg: "#ffffff",
  })

  const dark = create({
    ...themes.dark,
    // Logo
    brandTitle: "Plex UI",
    brandImage: logoDarkPath,
    brandUrl: "#",
    brandTarget: "_self",

    // Typography
    fontBase: `ui-sans-serif, -apple-system, system-ui, "Segoe UI", "Noto Sans", "Helvetica",
      "Arial", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`,
    fontCode: `ui-monospace, "SFMono-Regular", "SF Mono", "Menlo", "Monaco", "Consolas",
      "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`,

    // Variables
    colorPrimary: "#3A10E5",
    colorSecondary: "#585C6D",

    // UI
    appBg: "#212121",
    appContentBg: "#212121",
    appPreviewBg: "#212121",
    appBorderColor: "#393939",
    appBorderRadius: 6,

    // Toolbar default and active colors
    barTextColor: "#c1c1c1",
    barBg: "#212121",
  })

  return {
    light,
    dark,
  }
}

// Export themes - they will be created with correct paths at runtime
export const THEMES: Record<Theme, ThemeVars> = createThemes()
