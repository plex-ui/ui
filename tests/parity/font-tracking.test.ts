import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

// Owner 12.11: the kit is set in Inter, not Apple's San Francisco, on the desktop and on a phone. Inter tracks by
// size as the Figma kit sets it (Apps 2.4, mode Android & Web); --font-sans-tracking draws that table and every
// element takes it at its own size, so no style sets a pixel tracking of its own. The face, its
// tracking and the accent are each one variable in variables-tokens-root.css. Code is set in Geist Mono, the Figma
// kit's font/font-mono, shipped the same way; SF Mono is named nowhere.

const root = `${process.cwd()}/packages/styles/src`
const cssFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : []
})
const tokens = readFileSync(`${root}/styles/variables-tokens-root.css`, "utf8")
const inter = readFileSync(`${root}/styles/inter.css`, "utf8")
const geistMono = readFileSync(`${root}/styles/geist-mono.css`, "utf8")

describe("the kit face and its tracking", () => {
  test("--font-sans starts with Inter, shipped beside the CSS for every script it covers", () => {
    expect(tokens).toMatch(/--font-sans: "Inter Variable", "Inter", /)
    expect(tokens).not.toMatch(/--font-sans:[^;]*-apple-system/)
    const sources = [...inter.matchAll(/url\("\.\/(inter-fonts\/[\w-]+\.woff2)"\) format\("woff2"\)/g)].map((match) => match[1])
    expect(sources).toHaveLength(14)
    for (const file of sources) expect(existsSync(join(root, "styles", file)), file).toBe(true)
    expect(existsSync(join(root, "styles/inter-fonts/LICENSE"))).toBe(true)
  })

  test("--font-mono starts with Geist Mono, shipped beside the CSS for every script it covers, and no SF Mono", () => {
    expect(tokens).toMatch(/--font-mono: "Geist Mono Variable", "Geist Mono", /)
    expect(tokens).not.toMatch(/SF ?Mono/)
    const sources = [...geistMono.matchAll(/url\("\.\/(geist-mono-fonts\/[\w-]+\.woff2)"\) format\("woff2"\)/g)].map((match) => match[1])
    expect(sources).toHaveLength(12)
    for (const file of sources) expect(existsSync(join(root, "styles", file)), file).toBe(true)
    expect(existsSync(join(root, "styles/geist-mono-fonts/LICENSE"))).toBe(true)
    expect(readFileSync(`${root}/styles/index.css`, "utf8")).toMatch(/@import "\.\/inter";\n@import "\.\/geist-mono";/)
  })

  test("--font-sans-tracking is the Figma kit's Inter tracking at every size of its scale", () => {
    const value = tokens.match(/--font-sans-tracking: (max\([^;]+);/)?.[1] ?? ""
    expect(value).not.toBe("")
    // Evaluate the CSS at a font size: em is the size, px is a pixel, calc/min/max as CSS reads them.
    const at = (size: number) => Function(`return ${value
      .replace(/calc\(/g, "(")
      .replace(/(-?[\d.]+)em/g, `($1*${size})`)
      .replace(/(-?[\d.]+)px/g, "($1)")
      .replace(/\bmin\(/g, "Math.min(")
      .replace(/\bmax\(/g, "Math.max(")}`)() as number
    // Apps 2.4, 3. Typography, mode Android & Web (Inter): Font Tracking by Font Size.
    const kit: Record<number, number> = {
      72: -0.36, 60: -0.3, 48: -0.2, 38: -0.2, 34: -0.2, 28: -0.2, 24: -0.15, 22: -0.15, 20: -0.15,
      18: -0.1, 17: -0.15, 16: -0.15, 15: -0.1, 14: -0.1, 13: -0.05, 12: 0, 11: 0, 10: 0, 9: 0,
    }
    for (const [size, tracking] of Object.entries(kit)) expect(at(Number(size)), `${size}px`).toBeCloseTo(tracking, 4)
    // Between two sizes of the scale the value stays between theirs.
    expect(at(19)).toBeLessThan(-0.1)
    expect(at(19)).toBeGreaterThan(-0.15)
    expect(at(54)).toBeCloseTo(-0.25, 4)
  })

  test("every element, the form controls Tailwind resets by name included, takes the tracking at its own size", () => {
    const rule = tokens.match(/@layer base \{\s*([^{]+)\{\s*letter-spacing: var\(--font-sans-tracking\);/)?.[1] ?? ""
    const selectors = rule.split(",").map((selector) => selector.trim())
    expect(selectors).toEqual([":where(*", "::before", "::after)", "button", "input", "select", "optgroup", "textarea", "::file-selector-button"])
  })

  test("a tracking set by a utility or a style reaches the text inside, monospace keeps its face's spacing", () => {
    expect(tokens).toMatch(/:where\(\[class\*="tracking-"\], \[style\*="letter-spacing"\]\) :where\(\*, ::before, ::after\),[^{]*\{\s*letter-spacing: inherit;/)
    expect(tokens).toMatch(/:where\(code, kbd, samp, pre, \[class\*="font-mono"\], \[style\*="font-mono"\]\),[^{]*\{\s*letter-spacing: normal;/)
  })

  test("no style sets a pixel tracking of its own", () => {
    const found = cssFiles(root).flatMap((path) => {
      const text = readFileSync(path, "utf8")
      return [...text.matchAll(/(letter-spacing|tracking)[\w-]*:\s*(var\([^,;)\n]+,\s*)?-?\d*\.?\d+px/g)].map((match) => `${path.slice(root.length)}: ${match[0]}`)
    })
    expect(found).toEqual([])
  })

  test("phone tokens and component resets take the face's tracking, not normal", () => {
    const touch = readFileSync(`${root}/styles/touch.css`, "utf8")
    expect(touch).not.toContain("--menu-letter-spacing")
    expect(touch).toContain("--empty-message-title-tracking: var(--font-sans-tracking);")
    expect(touch).toContain("--mobile-field-error-letter-spacing: var(--font-sans-tracking);")
    const resets = cssFiles(`${root}/components`).flatMap((path) =>
      /letter-spacing: normal;|letter-spacing: var\(--[\w-]+, normal\)/.test(readFileSync(path, "utf8")) ? [path.slice(root.length)] : [])
    expect(resets).toEqual([])
  })
})

describe("the accent", () => {
  test("is one variable, and the tint roles and the info status read what they should", () => {
    expect(tokens).toMatch(/--color-accent: #0285ff;/)
    const semantic = readFileSync(`${root}/styles/variables-semantic.css`, "utf8")
    const components = readFileSync(`${root}/styles/variables-components.css`, "utf8")
    expect(semantic).toMatch(/--color-ring: light-dark\(var\(--accent-500\), var\(--color-accent\)\);/)
    expect(semantic).toMatch(/--color-background-info-solid: var\(--blue-400\);/)
    expect(components).toMatch(/--toolbar-prominent-background: var\(--color-background-accent-solid\);/)
    expect(components).toMatch(/--link-primary-text-color: light-dark\(var\(--accent-500\), var\(--accent-300\)\);/)
  })
})
