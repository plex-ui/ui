import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

// Row 168: a `:has()` whose argument matches the `style` attribute (`[style*=...]`) makes Chromium restyle the whole
// page on every inline style change anywhere in it, such as each frame of a sheet drag or a slider: on Form examples
// 3358 elements per frame instead of 1–5. Mark the element with an attribute of its own and match that.

const css = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : css(path)
    return name.endsWith(".css") ? [path] : []
  })

/** The arguments of every `:has(...)` in a stylesheet, with nested parentheses kept. */
const hasArguments = (source: string) => {
  const found: string[] = []
  for (let start = source.indexOf(":has("); start !== -1; start = source.indexOf(":has(", start + 1)) {
    let depth = 0
    for (let end = start + 4; end < source.length; end++) {
      if (source[end] === "(") depth++
      else if (source[end] === ")" && --depth === 0) {
        found.push(source.slice(start + 5, end))
        break
      }
    }
  }
  return found
}

describe("no :has() matches the style attribute (plan 168)", () => {
  test("the scan reads each :has() argument whole, nested parentheses included", () => {
    expect(hasArguments(`a:has(> b:not([style*="x"])) c, d:has(e)`)).toEqual([`> b:not([style*="x"])`, "e"])
  })

  test("in the docs and the library styles", () => {
    const files = [join(process.cwd(), "app/globals.css"), ...css(join(process.cwd(), "components")), ...css(join(process.cwd(), "packages/styles/src"))]
    expect(files.length).toBeGreaterThan(20)
    const found = files.flatMap((file) => hasArguments(readFileSync(file, "utf8")).map((argument) => ({ file, argument })))
    // The docs find an open Dialog by its own attribute; the scan sees it, so it cannot pass by reading nothing.
    expect(found.some(({ argument }) => argument === "[data-plex-dialog]")).toBe(true)
    const offending = found.filter(({ argument }) => /\[\s*style\b/i.test(argument)).map(({ file, argument }) => `${file}: :has(${argument})`)
    expect(offending).toEqual([])
  })
})
