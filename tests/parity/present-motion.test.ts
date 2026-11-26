import { readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, test } from "vitest"
import {
  growsFromButton,
  MENU_SPRING,
  MENU_SPRING_MS,
  SHEET_EXIT_MS,
  SHEET_SPRING,
  SHEET_SPRING_MS,
  springEasing,
} from "../../packages/ui/src/lib/presentMotion"

const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), "utf8")

afterEach(() => {
  document.body.innerHTML = ""
})

describe("Sheet and menu presentation (lib/presentMotion)", () => {
  test("React and Vue run the same helper", () => {
    expect(read("packages/vue/src/lib/presentMotion.ts")).toBe(read("packages/ui/src/lib/presentMotion.ts"))
  })

  test("the runtime springs settle when the CSS springs do", () => {
    const css = read("packages/styles/src/styles/variables-semantic.css")
    // The sheet's spring is cut at 500ms, 0.1% from its rest: its speed settles within 40ms more
    expect(springEasing(SHEET_SPRING).ms - SHEET_SPRING_MS).toBeGreaterThanOrEqual(0)
    expect(springEasing(SHEET_SPRING).ms - SHEET_SPRING_MS).toBeLessThanOrEqual(40)
    expect(Math.abs(springEasing(MENU_SPRING).ms - MENU_SPRING_MS)).toBeLessThanOrEqual(2)
    expect(css).toContain(`--spring-sheet-duration: ${SHEET_SPRING_MS}ms;`)
    expect(css).toContain(`--spring-menu-duration: ${MENU_SPRING_MS}ms;`)
  })

  test("a spring with a start speed leaves at it", () => {
    const { easing, ms } = springEasing({ duration: 0.33, bounce: 0 }, 5)
    const [, value, share] = easing.match(/^linear\(0, ([\d.]+) ([\d.]+)%/) ?? []
    const slope = Number(value) / ((Number(share) / 100) * (ms / 1000))
    expect(slope).toBeGreaterThan(4)
    expect(slope).toBeLessThan(6)
    expect(easing.endsWith(", 1)")).toBe(true)
  })

  test("a sheet let go of toward its rest never passes it, however fast it comes", () => {
    const values = (easing: string) => [...easing.matchAll(/(?:\(|, )([\d.]+)/g)].map((match) => Number(match[1]))
    expect(Math.max(...values(springEasing({ duration: 0.33, bounce: 0 }, 200).easing))).toBeGreaterThan(1)
    expect(Math.max(...values(springEasing({ duration: 0.33, bounce: 0 }, 200, true).easing))).toBeLessThanOrEqual(1)
  })

  test("nothing grows out of its button with reduced motion or in the Plex Android look", () => {
    const button = document.createElement("button")
    document.body.append(button)
    expect(growsFromButton(button)).toBe(true)
    document.documentElement.setAttribute("data-platform", "android")
    expect(growsFromButton(button)).toBe(false)
    expect(growsFromButton(undefined)).toBe(false)
    document.documentElement.removeAttribute("data-platform")
  })

  test("a sheet comes and goes on iOS's measured spring, with no bounce, the same time both ways", () => {
    expect(SHEET_SPRING).toEqual({ duration: 0.34, bounce: 0 })
    expect(SHEET_SPRING_MS).toBe(500)
    expect(SHEET_EXIT_MS).toBe(SHEET_SPRING_MS)
    const css = read("packages/styles/src/styles/variables-semantic.css")
    const sampled = css.match(/--spring-sheet: (linear\([^;]*\));/)?.[1] ?? ""
    // Half its way at 91ms (18.2%), 90% at 210ms (42%) of 500, as measured; never past its end
    const points = [...sampled.matchAll(/([\d.]+) ([\d.]+)%/g)].map(([, value, at]) => [Number(value), Number(at)])
    const at = (share: number) => points.find(([value]) => value >= share)![1]
    expect(at(0.5)).toBeGreaterThanOrEqual(17)
    expect(at(0.5)).toBeLessThanOrEqual(19.5)
    expect(at(0.9)).toBeGreaterThanOrEqual(41)
    expect(at(0.9)).toBeLessThanOrEqual(44)
    expect(Math.max(...points.map(([value]) => value))).toBeLessThanOrEqual(1)
  })

  test("the panel and the scrim move on the sheet's spring both ways, where the dialog times the sheet so", () => {
    const css = read("packages/styles/src/components/Dialog/Dialog.module.css").replace(/\s+/g, " ")
    expect(css).toContain('.Content[data-mobile-placement="bottom"] .Panel[data-sheet-motion] { --dialog-enter-duration: var(--spring-sheet-duration); --dialog-enter-easing: var(--spring-sheet); --dialog-exit-duration: var(--spring-sheet-duration); --dialog-exit-easing: var(--spring-sheet); }')
    expect(css).toContain(".Transition:is([data-entering-active], [data-entering][data-interrupted]):has(.Panel[data-sheet-motion]) .Overlay { transition: opacity var(--spring-sheet-duration) var(--spring-sheet); }")
    expect(css).toContain(".Transition:is([data-exiting-active], [data-exiting][data-interrupted]):has(.Panel[data-sheet-motion]) .Overlay { transition: opacity var(--spring-sheet-duration) var(--spring-sheet); }")
    for (const file of ["packages/ui/src/components/Dialog/Dialog.tsx", "packages/vue/src/components/Dialog/Dialog.ts"]) {
      const source = read(file)
      expect(source).toContain('setAttribute("data-sheet-motion", "")')
      expect(source).toMatch(/enterDuration: SHEET_SPRING_MS,\s+exitDuration: draggedClose\.(current|value) \? SHEET_EXIT_MS : SHEET_SPRING_MS,/)
    }
  })

  test("nothing grows out of a button any more: the sheet helpers are gone from React and Vue", () => {
    for (const file of ["packages/ui/src/components/Dialog/Dialog.tsx", "packages/vue/src/components/Dialog/Dialog.ts", "packages/ui/src/lib/presentMotion.ts"]) {
      const source = read(file)
      expect(source).not.toMatch(/sourceTransform|presentationSource|data-presented-from/)
    }
  })
})
