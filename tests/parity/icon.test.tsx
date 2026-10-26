import { describe, expect, test } from "vitest"
import { createElement, type ComponentType, type SVGProps } from "react"
import { h, type FunctionalComponent } from "vue"
import * as ReactIcons from "../../packages/ui/src/components/Icon"
import * as VueIcons from "../../packages/vue/src/components/Icon"
import { renderPair } from "./pair"

const reactIcons = ReactIcons as Record<string, ComponentType<SVGProps<SVGSVGElement>>>
const vueIcons = VueIcons as Record<string, FunctionalComponent>
const names = Object.keys(reactIcons).sort()

describe("Icon parity", () => {
  test("the Vue set exports the same names, aliases included", () => {
    expect(Object.keys(vueIcons).sort()).toEqual(names)
    expect(names.length).toBeGreaterThan(650)
  })

  test("every icon renders the same <svg>", async () => {
    const mismatched: string[] = []
    for (const name of names) {
      const { react, vue } = await renderPair(createElement(reactIcons[name]!), () => h(vueIcons[name]!))
      if (react !== vue || !react.includes("<svg")) mismatched.push(name)
    }
    expect(mismatched).toEqual([])
  })

  test("caller attributes override the defaults, as React's {...props} does", async () => {
    const { react, vue } = await renderPair(
      createElement(reactIcons.Mail!, { className: "size-4", width: 16, "aria-hidden": false, "aria-label": "Mail" }),
      () => h(vueIcons.Mail!, { class: "size-4", width: 16, "aria-hidden": false, "aria-label": "Mail" }),
    )
    expect(vue).toBe(react)
    expect(react).toContain('class="size-4"')
    expect(react).toContain('width="16"')
    expect(react).toContain('aria-label="Mail"')
  })
})
