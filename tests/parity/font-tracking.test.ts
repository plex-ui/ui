import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

// Owner 12.11: the kit is set in Inter, not Apple's San Francisco, on the desktop and on a phone. Inter tracks by
// size (its dynamic metrics, -0.0223em + 0.185em × e^(-0.1745 × size)); --font-sans-tracking draws that curve
// and every element takes it at its own size, so no style sets a pixel tracking of its own. The face, its
// tracking and the accent are each one variable in variables-tokens-root.css.

const root = `${process.cwd()}/packages/styles/src`
const cssFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : []
})
const tokens = readFileSync(`${root}/styles/variables-tokens-root.css`, "utf8")
const inter = readFileSync(`${root}/styles/inter.css`, "utf8")
const parse = (value: string) => value.match(/^max\(calc\(([\d.]+)px - ([\d.]+)em\), calc\(([\d.]+)px - ([\d.]+)em\), -([\d.]+)em\)$/)

describe("the kit face and its tracking", () => {
  test("--font-sans starts with Inter, shipped beside the CSS for every script it covers", () => {
    expect(tokens).toMatch(/--font-sans: "Inter Variable", "Inter", /)
    expect(tokens).not.toMatch(/--font-sans:[^;]*-apple-system/)
    const sources = [...inter.matchAll(/url\("\.\/(inter-fonts\/[\w-]+\.woff2)"\) format\("woff2"\)/g)].map((match) => match[1])
    expect(sources).toHaveLength(14)
    for (const file of sources) expect(existsSync(join(root, "styles", file)), file).toBe(true)
    expect(existsSync(join(root, "styles/inter-fonts/LICENSE"))).toBe(true)
  })

  test("--font-sans-tracking stays within 0.015px of Inter's dynamic metrics from 10px to 72px", () => {
    const value = tokens.match(/--font-sans-tracking: (max\([^;]+);/)?.[1] ?? ""
    const [, a1, b1, a2, b2, limit] = parse(value)?.map(Number) ?? []
    expect(limit).toBeGreaterThan(0)
    for (let size = 10; size <= 72; size += 1) {
      const drawn = Math.max(a1 - b1 * size, a2 - b2 * size, -limit * size)
      const inter = (-0.0223 + 0.185 * Math.exp(-0.1745 * size)) * size
      expect(Math.abs(drawn - inter), `${size}px`).toBeLessThanOrEqual(0.015)
    }
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
