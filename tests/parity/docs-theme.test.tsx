import { readFileSync } from "node:fs"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { DocsRootProvider } from "../../components/layout/DocsRootProvider"

// The Next.js wrapper only adds Next's router; the theme is set up by the base provider it wraps.
vi.mock("fumadocs-ui/provider/next", () => import("fumadocs-ui/provider/base"))

// Plan 178: Safari paints its status bar band with the document's background as a page loads, so a screen preview
// opened in the dark must have the Plex UI tokens (:where([data-theme])) in the dark from the first paint.
describe("Docs theme before the first paint", () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
    document.documentElement.className = ""
    document.documentElement.style.colorScheme = ""
  })

  test("the theme script sets data-theme along with the class, without waiting for an effect", () => {
    window.matchMedia = ((media: string) => ({
      matches: false, media, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    })) as never
    render(<DocsRootProvider><p>page</p></DocsRootProvider>)
    const script = [...document.querySelectorAll("script")].map((node) => node.textContent ?? "").find((text) => text.includes("data-theme"))
    expect(script).toBeDefined()

    // Run it as the browser does before the page paints, with a stored dark theme.
    const html = document.documentElement
    html.removeAttribute("data-theme")
    html.className = ""
    localStorage.setItem("theme", "dark")
    new Function(script!)()
    expect(html.getAttribute("data-theme")).toBe("dark")
    expect(html.classList.contains("dark")).toBe(true)
  })

  test("no effect syncs data-theme after mount any more", () => {
    expect(readFileSync("app/layout.tsx", "utf8")).not.toContain("PlexThemeSync")
  })
})
