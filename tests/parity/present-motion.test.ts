import { readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, test } from "vitest"
import {
  growsFromButton,
  MENU_SPRING,
  MENU_SPRING_MS,
  presentationSource,
  SHEET_SPRING,
  SHEET_SPRING_MS,
  sourceTransform,
  springEasing,
  watchPresentationSources,
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
    expect(Math.abs(springEasing(SHEET_SPRING).ms - SHEET_SPRING_MS)).toBeLessThanOrEqual(2)
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

  test("the source is the button pressed just now, not a menu item", () => {
    watchPresentationSources(document)
    document.body.innerHTML = `<button id="b"><span id="label">Open</span></button><div role="menu"><button id="m"></button></div>`
    document.getElementById("label")!.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(presentationSource(document)?.id).toBe("b")
    document.getElementById("m")!.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(presentationSource(document)).toBeNull()
  })

  test("the transform lays the panel at its rest over the button, about its transform origin", () => {
    const panel = document.createElement("div")
    const button = document.createElement("button")
    document.body.append(panel, button)
    panel.style.transformOrigin = "50% 0px"
    panel.getBoundingClientRect = () => new DOMRect(0, 400, 400, 400)
    button.getBoundingClientRect = () => new DOMRect(300, 40, 80, 40)
    const transform = sourceTransform(panel, button)
    expect(transform).toBe("translate(140px, -360px) scale(0.2, 0.1)")
    // Mapping the panel's corners with it lands on the button's
    const [tx, ty, sx, sy] = transform!.match(/-?[\d.]+/g)!.map(Number)
    const ox = 200
    const oy = 400
    expect(ox + sx * (0 - ox) + tx).toBeCloseTo(300)
    expect(oy + sy * (400 - oy) + ty).toBeCloseTo(40)
    expect(ox + sx * (400 - ox) + tx).toBeCloseTo(380)
    expect(oy + sy * (800 - oy) + ty).toBeCloseTo(80)
    // A source inside the panel, or one with no size, is none
    panel.append(button)
    expect(sourceTransform(panel, button)).toBeNull()
  })
})
