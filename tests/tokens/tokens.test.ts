import { readFileSync } from "node:fs"
import { join } from "node:path"
import postcss from "postcss"
import { describe, expect, it } from "vitest"
import { buildLayers, normalizeValue, TOKEN_FILES, DEFAULT_CONTEXT } from "../../packages/styles/scripts/tokens-layers.mjs"
import {
  createTokenResolver,
  mixColors,
  resolveValue,
  type TokenLayer,
} from "../../packages/styles/src/tokens/resolve"
import { resolvedTokens, skippedDeclarations, tokenLayers } from "../../packages/styles/src/tokens/tokens.generated"
import { defaultTokenContext } from "../../packages/styles/src/tokens"

const STYLES = join(__dirname, "../../packages/styles/src/styles")
const read = (file: string) => readFileSync(join(STYLES, file), "utf8")

describe("tokens.generated.ts", () => {
  it("is built from the current CSS (run `npm run generate:tokens`)", () => {
    const { layers, skipped } = buildLayers(postcss, read)
    expect(tokenLayers).toEqual(layers)
    expect(skippedDeclarations).toBe(skipped)
  })

  it("holds the values the resolver gives", () => {
    const resolver = createTokenResolver(tokenLayers, defaultTokenContext)
    expect(resolvedTokens.light).toEqual(resolver.all("light"))
    expect(resolvedTokens.dark).toEqual(resolver.all("dark"))
    expect(defaultTokenContext).toEqual(DEFAULT_CONTEXT)
  })

  it("has every custom property of the CSS, with the value as written", () => {
    // Walked here on its own: a root declaration must be in a layer of its file with the same value
    const rootLike = /(^|[\s,(]):root\b|data-theme|^html:root$/
    let root = 0
    let contextual = 0
    for (const { file } of TOKEN_FILES) {
      postcss.parse(read(file)).walkDecls(/^--/, (decl) => {
        if (decl.prop.includes("*") || decl.value.trim() === "initial") return
        let selector: string | undefined
        let inTheme = false
        for (let node = decl.parent; node && node.type !== "root"; node = node.parent) {
          if (node.type === "rule") selector = selector ?? (node as postcss.Rule).selector.replace(/\s+/g, " ")
          if (node.type === "atrule" && (node as postcss.AtRule).name === "theme") inTheme = true
        }
        const isRoot =
          (inTheme && !selector) ||
          (selector !== undefined && rootLike.test(selector) && !/\[data-(slot|surface|row|variant)/.test(selector))
        if (!isRoot) {
          contextual++
          return
        }
        root++
        const value = normalizeValue(decl.value)
        const found = tokenLayers.some((layer: TokenLayer) => layer.source === file && layer.tokens[decl.prop] === value)
        expect(found, `${file} ${decl.prop}: ${value}`).toBe(true)
      })
    }
    expect(root).toBeGreaterThan(1900)
    expect(contextual).toBe(skippedDeclarations)
  })

  it("resolves the core tokens of both themes", () => {
    expect(resolvedTokens.light["--gray-0"]).toBe("#ffffff")
    expect(resolvedTokens.dark["--gray-0"]).toBe("#0d0d0d")
    expect(resolvedTokens.light["--color-text"]).toBe("#0d0d0d")
    expect(resolvedTokens.dark["--color-text"]).toBe("#ffffff")
    // alpha(var(--alpha-base), 8%) of #0d0d0d / #ffffff
    expect(resolvedTokens.light["--alpha-08"]).toBe("rgba(13, 13, 13, 0.08)")
    expect(resolvedTokens.dark["--alpha-08"]).toBe("rgba(255, 255, 255, 0.08)")
    // color-mix(in srgb, #0285ff, black 20%)
    expect(resolvedTokens.light["--accent-500"]).toBe("#026acc")
    expect(resolvedTokens.light["--radius-md"]).toBe(8)
    expect(resolvedTokens.light["--spacing"]).toBe(4)
    expect(resolvedTokens.light["--motion-enter"]).toBe(250)
    // A phone takes the touch layer: a 44px control
    expect(resolvedTokens.light["--control-size-md"]).toBe(44)
    expect(resolvedTokens.light["--shadow-100"]).toMatch(/^0 1px 2px -1px rgba\(0, 0, 0, 0\.08\)/)
  })

  it("follows a brand accent in the steps drawn from it", () => {
    const brand = createTokenResolver(tokenLayers, defaultTokenContext, { "--color-accent": "#ff0000" })
    expect(brand.get("--color-background-accent-solid", "light")).toBe("#ff0000")
    expect(brand.get("--accent-500", "light")).toBe("#cc0000")
    expect(brand.get("--accent-50", "light")).toBe("#ffe6e6")
  })

  it("applies the layers of a context", () => {
    const desktop = createTokenResolver(tokenLayers, { ...defaultTokenContext, width: 1280 })
    expect(desktop.get("--control-size-md", "light")).toBe(32)
    const reduced = createTokenResolver(tokenLayers, { ...defaultTokenContext, reducedMotion: true })
    expect(reduced.get("--motion-enter", "light")).toBe(0)
  })
})

describe("resolve.ts", () => {
  const none = () => undefined
  const light = { scheme: "light" as const }

  it("mixes colors as CSS Color 5", () => {
    const red = { r: 255, g: 0, b: 0, a: 1 }
    const blue = { r: 0, g: 0, b: 255, a: 1 }
    expect(mixColors("srgb", red, undefined, blue, undefined)).toEqual({ r: 127.5, g: 0, b: 127.5, a: 1 })
    // Percentages below 100% in sum multiply the alpha
    expect(mixColors("srgb", red, 30, blue, 20)?.a).toBeCloseTo(0.5)
    expect(resolveValue("color-mix(in oklab, #ff0000 40%, transparent)", none, light)).toBe("rgba(255, 0, 0, 0.4)")
    expect(resolveValue("color-mix(in oklab, white, black)", none, light)).toBe("#636363")
  })

  it("evaluates math, units and fallbacks", () => {
    expect(resolveValue("calc(2 * 0.75rem + 1px)", none, light)).toBe(25)
    expect(resolveValue("max(21px, calc(0px - 13px))", none, light)).toBe(21)
    expect(resolveValue("clamp(10px, 50px, 30px)", none, light)).toBe(30)
    expect(resolveValue("var(--missing, 12px)", none, light)).toBe(12)
    expect(resolveValue("rgb(0 0 0 / 10%)", none, light)).toBe("rgba(0, 0, 0, 0.1)")
    expect(resolveValue("rgba(255, 255, 255, 0.5)", none, light)).toBe("rgba(255, 255, 255, 0.5)")
    expect(resolveValue("light-dark(#fff, #000)", none, { scheme: "dark" })).toBe("#000000")
    expect(resolveValue("calc(0.6px - 0.05em)", none, { scheme: "light", fontSize: 10 })).toBe(0.1)
  })

  it("leaves min() and max() of a unit it does not know unresolved", () => {
    expect(() => resolveValue("min(100vw, 400px)", none, light)).not.toThrow()
    expect(resolveValue("min(100vw, 400px)", none, light)).toBe("min(100vw, 400px)")
  })

  it("expands spacing() as the PostCSS functions do", () => {
    const tokens: Record<string, string> = { "--spacing": "0.25rem" }
    const lookup = (name: string) => tokens[name]
    expect(resolveValue("spacing(3)", lookup, light)).toBe(12)
    expect(resolveValue("calc(spacing(2) + 1px)", lookup, light)).toBe(9)
  })

  it("treats a cycle as invalid", () => {
    const tokens: Record<string, string> = {
      "--a": "var(--b)",
      "--b": "var(--a)",
      // A cycle with its own fallbacks is invalid all the same (CSS Variables 1, Resolving Dependency Cycles)
      "--self": "var(--self, 12px)",
      "--c": "var(--d, 1px)",
      "--d": "var(--c, 2px)",
      // A property outside a cycle that refers to it takes its own fallback
      "--outside": "var(--c, 3px)",
    }
    const lookup = (name: string) => tokens[name]
    expect(resolveValue(tokens["--a"], lookup, light, "--a")).toBeUndefined()
    expect(resolveValue(tokens["--self"], lookup, light, "--self")).toBeUndefined()
    expect(resolveValue(tokens["--c"], lookup, light, "--c")).toBeUndefined()
    expect(resolveValue(tokens["--outside"], lookup, light, "--outside")).toBe(3)
  })
})
