import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

// Phone colors: the form follows iOS 26, the color is PlexUI. The iOS background and label roles take the
// nearest PlexUI gray or alpha of each theme, and the labels stay translucent, as the native labels are.
// Native labels measured on iPhone (iOS2 IMG_5534 light, IMG_5530 dark, 430pt @3x): secondary 138 on a white
// card and 133 on #f2f2f7, 152 on a #1c1c1e card and 141 on black; tertiary chevrons 197 on white, 89 on #1c1c1e.

const styles = `${process.cwd()}/packages/styles/src/styles`
const surfaces = readFileSync(`${styles}/mobile-surfaces.css`, "utf8")
const primitive = readFileSync(`${styles}/variables-primitive.css`, "utf8")
const declarations = surfaces.replace(/\/\*[\s\S]*?\*\//g, "")

const token = (name: string) => declarations.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
const hexPair = (name: string) => {
  const match = primitive.match(new RegExp(`${name}: light-dark\\(#([0-9a-f]{6}), #([0-9a-f]{6})\\)`))
  if (!match) throw new Error(`${name} is not a light-dark hex pair`)
  return [match[1], match[2]].map((hex) => Number.parseInt(hex.slice(0, 2), 16))
}
const alphaOf = (name: string) => Number(primitive.match(new RegExp(`${name}: alpha\\(var\\(--alpha-base\\), (\\d+)%\\)`))?.[1]) / 100
// The level of a translucent alpha token over a surface in one theme (0 light, 1 dark).
const over = (alpha: string, surface: string, theme: 0 | 1) => {
  const base = hexPair("--alpha-base")[theme]
  const under = hexPair(surface)[theme]
  return alphaOf(alpha) * base + (1 - alphaOf(alpha)) * under
}

describe("phone colors use PlexUI tokens", () => {
  test("no mobile role is a raw iOS color", () => {
    expect(declarations).not.toMatch(/rgb\(|hsl\(|#[0-9a-f]{3,8}\b/i)
    const roles = [...declarations.matchAll(/(--mobile-[\w-]+):\s*([^;]+);/g)]
    expect(roles.length).toBeGreaterThan(12)
    for (const [, name, value] of roles) {
      expect(`${name}: ${value}`).toMatch(/^--mobile-[\w-]+: (var\(--(gray|alpha)-\d+\)|light-dark\(var\(--gray-\d+\), var\(--gray-\d+\)\)|var\(--mobile-label-secondary\))$/)
    }
  })

  test("labels are translucent PlexUI alphas next to the native labels in both themes", () => {
    expect(token("--mobile-label-secondary")).toBe("var(--alpha-50)")
    expect(token("--mobile-label-tertiary")).toBe("var(--alpha-25)")
    expect(token("--mobile-label-quaternary")).toBe("var(--alpha-15)")
    expect(token("--mobile-accessory-secondary")).toBe("var(--mobile-label-secondary)")
    const near = (value: number, native: number) => expect(Math.abs(value - native)).toBeLessThanOrEqual(11)
    // light: a white card is gray-0, the grouped canvas gray-75; dark: a card is gray-150.
    near(over("--alpha-50", "--gray-0", 0), 138)
    near(over("--alpha-50", "--gray-75", 0), 133)
    near(over("--alpha-50", "--gray-150", 1), 152)
    near(over("--alpha-25", "--gray-0", 0), 197)
    near(over("--alpha-25", "--gray-150", 1), 89)
    // The neighbors are further from native: dark secondary at 60% or 40%, tertiary at 30% or 20%.
    expect(Math.abs(over("--alpha-60", "--gray-150", 1) - 152)).toBeGreaterThan(Math.abs(over("--alpha-50", "--gray-150", 1) - 152))
    expect(Math.abs(over("--alpha-40", "--gray-0", 0) - 138)).toBeGreaterThan(Math.abs(over("--alpha-50", "--gray-0", 0) - 138))
    expect(Math.abs(over("--alpha-30", "--gray-150", 1) - 89)).toBeGreaterThan(Math.abs(over("--alpha-25", "--gray-150", 1) - 89))
    expect(Math.abs(over("--alpha-20", "--gray-0", 0) - 197)).toBeGreaterThan(Math.abs(over("--alpha-25", "--gray-0", 0) - 197))
  })

  test("an off switch track is the tertiary label (iOS IMG_5442, iOS2 IMG_5526)", () => {
    const touch = readFileSync(`${styles}/touch.css`, "utf8")
    expect(touch).toContain("--switch-track-color: var(--mobile-label-tertiary, var(--alpha-25));")
    expect(touch).toContain("--switch-track-color-hover: var(--alpha-30);")
    // A disabled phone switch keeps these colors at half opacity (kit iOS 27 Toggles, plan 173): no disabled track of its own.
    expect(touch).not.toContain("--switch-track-color-disabled:")
    // native: 197 on a white card, 101 on a #2c2c2e sheet card (the elevated card is gray-300 here)
    expect(Math.abs(over("--alpha-25", "--gray-0", 0) - 197)).toBeLessThanOrEqual(4)
    expect(Math.abs(over("--alpha-25", "--gray-300", 1) - 101)).toBeLessThanOrEqual(4)
  })

  test("a row disclosure is tertiary, a pop-up value and its chevrons secondary (iOS IMG_5512, IMG_5442)", () => {
    const docs = `${process.cwd()}/components/docs`
    const rows = readFileSync(`${docs}/FormRowsDemos.module.css`, "utf8")
    const settings = readFileSync(`${docs}/SettingsChecklistDemo.module.css`, "utf8")
    const popup = readFileSync(`${process.cwd()}/packages/styles/src/components/SelectControl/SelectControl.module.css`, "utf8")
    const rule = (css: string, selector: string) => css.slice(css.indexOf(selector)).match(/\{([^}]*)\}/)?.[1] ?? ""
    expect(rule(rows, "[data-account-row]) [data-row-disclosure] {")).toContain("color: var(--mobile-label-tertiary, var(--color-text-tertiary));")
    expect(rule(settings, ".Disclosure {")).toContain("color: var(--mobile-label-tertiary, var(--color-text-tertiary));")
    expect(popup).toContain("color: var(--mobile-accessory-secondary, var(--color-text-secondary));")
    // The value of a pop-up at the end of a labeled row is secondary too (IMG_5442, IMG_5523); in columns it is the
    // row's data and stays primary (IMG_5489), and a disabled one steps down to tertiary.
    const trailing = ':where([data-row][data-orientation="horizontal"]:not([data-field-columns] *)) .SelectControl'
    // A screen that shows its values in the primary label sets --field-row-popup-value-color (Files, IMG_5686; plan 170)
    expect(rule(popup, `${trailing}[data-selected="true"]:not([data-disabled]) {`)).toContain("color: var(--field-row-popup-value-color, var(--mobile-label-secondary, var(--color-text-secondary)));")
    expect(rule(popup, `${trailing}[data-disabled] .DropdownIcon:not(.DropdownIconChevron) {`)).toContain("color: var(--mobile-label-tertiary, var(--color-text-disabled));")
    expect(popup).toContain(`${trailing}[data-disabled][data-variant],\n`)
    // In columns the value stays primary and its chevrons are tertiary (IMG_5489: value 0, chevrons 197)
    const columns = ':where([data-field-columns] [data-row][data-orientation="horizontal"])'
    expect(rule(popup, `${columns} .SelectControl[data-disabled] .DropdownIcon:not(.DropdownIconChevron) {`)).toContain("color: var(--mobile-label-tertiary, var(--color-text-tertiary));")
    expect(popup).toContain(`${columns} .DropdownIcon:not(.DropdownIconChevron),\n`)
    for (const page of ["content/components/settings-forms.mdx", "content/vue/components/settings-forms.mdx"]) {
      const mdx = readFileSync(`${process.cwd()}/${page}`, "utf8")
      expect(rule(mdx, ".grouped-form-screen [data-row-disclosure] {")).toContain("color: var(--mobile-label-tertiary, var(--color-text-tertiary));")
    }
  })
})
