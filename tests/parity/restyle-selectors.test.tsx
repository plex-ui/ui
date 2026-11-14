// Restyle cost (a report measured in Chromium with invalidation tracking, 14.11): a structural pseudo-class
// (:only-child, :first-child, :last-child, :nth-*) left of a combinator whose subject has no feature of its own (a
// type, class, id or attribute; :is() and :where() count when each of their arguments has one) gives Chromium an
// invalidation set with no feature, so a change of that pseudo-class on any element restyles its whole subtree.
// Inserting one node at the top of a page's scroller restyled 2467 of 3978 elements for a Field rule of that kind.
import { act, cleanup, render } from "@testing-library/react"
import { createElement } from "react"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, test } from "vitest"
import { h } from "vue"
import { RadioGroup as RRadioGroup } from "../../packages/ui/src/components/RadioGroup"
import { RadioGroup, RadioGroupItem } from "../../packages/vue/src/components/RadioGroup"
import { flushVue, mountVue } from "./harness"

const root = `${process.cwd()}/packages/styles/src`
const cssFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : []
})

const STRUCTURAL = /:(first-child|last-child|only-child|nth-child|nth-last-child|first-of-type|last-of-type|only-of-type|nth-of-type)\b/

// Splits at the top level (outside brackets and parentheses)
const splitTop = (text: string, at: (char: string) => boolean) => {
  const parts: string[] = []
  let depth = 0
  let current = ""
  for (const char of text) {
    if (char === "(" || char === "[") depth += 1
    else if (char === ")" || char === "]") depth -= 1
    if (depth === 0 && at(char)) { parts.push(current); current = "" } else current += char
  }
  parts.push(current)
  return parts
}
const compounds = (selector: string) =>
  splitTop(selector.trim().replace(/\s*([>+~])\s*/g, " $1 "), (char) => char === " ").filter((part) => part && !">+~".includes(part))
// Removes functional pseudo-classes with their arguments
const withoutArguments = (compound: string) => {
  let out = ""
  for (let i = 0; i < compound.length; i += 1) {
    const match = /^::?[a-zA-Z-]+\(/.exec(compound.slice(i))
    if (!match) { out += compound[i]; continue }
    let j = i + match[0].length
    for (let depth = 1; j < compound.length && depth; j += 1) {
      if (compound[j] === "(") depth += 1
      else if (compound[j] === ")") depth -= 1
    }
    i = j - 1
  }
  return out
}
const hasFeature = (compound: string): boolean => {
  for (const match of compound.matchAll(/:(is|where)\(/g)) {
    let j = match.index! + match[0].length
    const start = j
    for (let depth = 1; j < compound.length && depth; j += 1) {
      if (compound[j] === "(") depth += 1
      else if (compound[j] === ")") depth -= 1
    }
    const args = splitTop(compound.slice(start, j - 1), (char) => char === ",").map((arg) => compounds(arg).at(-1) ?? "")
    if (args.length && args.every((arg) => arg && hasFeature(arg))) return true
  }
  const own = withoutArguments(compound).replace(/::?[a-zA-Z-]+/g, "")
  return /[.#[]|^[a-zA-Z]/.test(own)
}

const selectors = (css: string) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{};]+)\{/g)]
  .map((match) => match[1].trim())
  .filter((prelude) => prelude && !prelude.startsWith("@"))
  .flatMap((prelude) => splitTop(prelude, (char) => char === ",").map((selector) => selector.trim()))

afterEach(() => cleanup())

describe("selectors that keep a restyle to what changed", () => {
  test("no structural pseudo-class left of a combinator above a subject with no feature", () => {
    const found = cssFiles(root).flatMap((path) => selectors(readFileSync(path, "utf8")).filter((selector) => {
      const parts = compounds(selector.replace(/&/g, ".parent"))
      if (parts.length < 2) return false
      return parts.slice(0, -1).some((part) => STRUCTURAL.test(withoutArguments(part))) && !hasFeature(parts.at(-1)!)
    }).map((selector) => `${path.slice(root.length)}: ${selector}`))
    expect(found).toEqual([])
  })

  test("the check finds the rule it was written for", () => {
    const old = '.Field:where([data-row]) > .Content > .Control > :only-child > label:only-child:not([data-has-label]) > :only-child:has(> [role="radio"])'
    const parts = compounds(old)
    expect(parts.slice(0, -1).some((part) => STRUCTURAL.test(withoutArguments(part)))).toBe(true)
    expect(hasFeature(parts.at(-1)!)).toBe(false)
    expect(hasFeature(":is(.MenuButton, .MenuSubButton)::after")).toBe(true)
  })

  test("a Field row finds its lone radio by the wrapper's attribute, which React and Vue both render", async () => {
    const field = readFileSync(`${root}/components/Field/Field.module.css`, "utf8")
    expect(field).toContain('> label:only-child:not([data-has-label]) > [data-radio-indicator]:only-child:has(> [role="radio"])')
    await act(async () => {
      render(createElement(RRadioGroup, { value: "a", onChange: () => {}, "aria-label": "Choice" }, createElement(RRadioGroup.Item, { value: "a" })))
    })
    expect(document.querySelector('[data-radio-indicator] > [role="radio"]')).not.toBeNull()
    cleanup()
    const { unmount } = mountVue(() => h(RadioGroup, { "modelValue": "a", "aria-label": "Choice" }, () => h(RadioGroupItem, { value: "a" })))
    await flushVue()
    expect(document.querySelector('[data-radio-indicator] > [role="radio"]')).not.toBeNull()
    unmount()
  })
})
