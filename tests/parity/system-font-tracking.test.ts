import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

// The iOS kit lists the tracking that SF Pro applies by size (-0.43pt at 17, -0.26 at 22, -0.23 at 15).
// The system font applies it itself, so a copy in CSS tracks the text twice: native widths match the
// untracked text (iOS2 IMG_5522, 5524, 5525, 5530: within 2px at @3x), the tracked text falls 7 to 16px short.

const root = `${process.cwd()}/packages/styles/src`
const cssFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : []
})

describe("phone text takes the tracking of the system font", () => {
  test("no style sets a pixel tracking of its own", () => {
    const found = cssFiles(root).flatMap((path) => {
      const text = readFileSync(path, "utf8")
      return [...text.matchAll(/(letter-spacing|tracking)[\w-]*:\s*(var\([^,;)\n]+,\s*)?-?\d*\.?\d+px/g)].map((match) => `${path.slice(root.length)}: ${match[0]}`)
    })
    expect(found).toEqual([])
  })

  test("menu and empty-state tokens on a phone leave the tracking to the font", () => {
    const touch = readFileSync(`${root}/styles/touch.css`, "utf8")
    expect(touch).not.toContain("--menu-letter-spacing")
    expect(touch).toContain("--empty-message-title-tracking: normal;")
    expect(touch).not.toContain("--empty-message-description-tracking")
    expect(touch).toContain("--mobile-field-error-letter-spacing: normal;")
  })
})
