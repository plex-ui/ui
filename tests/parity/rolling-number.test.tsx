import { act, render } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { h } from "vue"
import { RollingNumber as RRollingNumber, rollingNumberParts } from "../../packages/ui/src/components/RollingNumber"
import { RollingNumber } from "../../packages/vue/src/components/RollingNumber"
import { renderPair } from "./pair"

describe("RollingNumber parity", () => {
  test.each([
    ["an integer", { value: 1234, locales: "en-US" }],
    ["currency", { value: 193, locales: "pl-PL", format: { style: "currency", currency: "PLN" } }],
    ["a percent with a fraction", { value: 0.425, locales: "en-US", format: { style: "percent", maximumFractionDigits: 1 } }],
    ["a negative number", { value: -42.5, locales: "en-US", format: { minimumFractionDigits: 2 } }],
    ["class and attributes", { value: 7, locales: "en-US", className: "text-2xl", id: "total" }],
    ["the default locale is fixed", { value: 1234.5 }],
    ["Arabic-Indic digits", { value: 1234, locales: "ar-EG" }],
    ["not a number", { value: Number.NaN }],
  ])("%s", async (_name, props) => {
    const { className, ...rest } = props as Record<string, unknown>
    const pair = await renderPair(<RRollingNumber {...(props as never)} />, () => h(RollingNumber, className ? { ...rest, class: className } : rest))
    expect(pair.vue).toBe(pair.react)
  })
})

describe("RollingNumber", () => {
  test("reads as the written number; each digit is a reel of 0 to 9 turned to it, separators stand still", async () => {
    await act(async () => { render(<RRollingNumber value={1234} locales="en-US" />) })
    const root = document.querySelector("span")!
    expect(root.firstElementChild!.textContent).toBe("1,234")
    const visual = root.children[1]
    expect(visual.getAttribute("aria-hidden")).toBe("true")
    const digits = [...visual.querySelectorAll<HTMLElement>("[data-digit]")]
    expect(digits.map((digit) => digit.dataset.digit)).toEqual(["1", "2", "3", "4"])
    expect(digits[3].lastElementChild!.children).toHaveLength(10)
    expect((digits[3].lastElementChild as HTMLElement).style.getPropertyValue("--rolling-number-digit")).toBe("4")
    expect(visual.children[1].textContent).toBe(",")
  })

  test("a digit keeps its reel by its place around the decimal separator: 99 to 100, 1.2 to 2.34", () => {
    const keys = (value: number, format?: Intl.NumberFormatOptions) => rollingNumberParts(value, "en-US", format).characters.map((character) => character.key)
    expect(keys(99)).toEqual(["i2", "i1"])
    expect(keys(100)).toEqual(["i3", "i2", "i1"])
    expect(keys(1000)).toEqual(["i4", "g3", "i3", "i2", "i1"])
    expect(keys(1.2)).toEqual(["i1", "decimal1-.", "f1"])
    expect(keys(2.34)).toEqual(["i1", "decimal1-.", "f1", "f2"])
  })

  test("the reels hold the locale's own digits", () => {
    const { glyphs, characters } = rollingNumberParts(12, "ar-EG")
    expect(glyphs[1]).toBe("١")
    expect(characters.map((character) => character.digit)).toEqual([1, 2])
    expect(rollingNumberParts(5, "en-US").text).toBe("5")
  })

  test("the reel turns by a tenth of its height per digit, without motion when reduced, and clips without moving the baseline", async () => {
    const { readFileSync } = await import("node:fs")
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/RollingNumber/RollingNumber.module.css`, "utf8")
    expect(css).toContain("transform: translateY(calc(var(--rolling-number-digit, 0) * -10%));")
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*transition: none;/)
    expect(css).toContain("clip-path: inset(0 -0.1em);")
    // A right-to-left page keeps the digits in their order
    expect(css).toMatch(/\.Visual \{\s*direction: ltr;\s*unicode-bidi: isolate;/)
    expect(css).not.toMatch(/\.Digit \{[^}]*overflow/)
  })
})
