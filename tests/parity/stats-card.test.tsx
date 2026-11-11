import { readFileSync } from "node:fs"
import postcss from "postcss"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, type ReactElement } from "react"
import { describe, expect, test, vi } from "vitest"
import { createTextVNode, Fragment, h, type VNode } from "vue"
import { DollarCircle as RDollarCircle } from "../../packages/ui/src/components/Icon"
import { StatsCard as RStatsCard } from "../../packages/ui/src/components/StatsCard"
import { DollarCircle } from "../../packages/vue/src/components/Icon"
import { StatsCard } from "../../packages/vue/src/components/StatsCard"
import { StatCard as RStatCard } from "../../packages/ui/src/components/StatCard"
import { StatCard } from "../../packages/vue/src/components/StatCard"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

// React-vs-Vue parity for StatsCard. ReactNode props are slots in Vue:
// `icon`, `sparkline` and `value` (also a prop for plain values).

type Props = Record<string, unknown>

const toVue = ({ className, ...props }: Props) => ({ ...props, ...(className ? { class: className } : {}) })

const BASE = { label: "Total Revenue", value: "$45,231" }

const cases: [string, Props][] = [
  ["label and value", BASE],
  ["numeric value", { label: "Orders", value: 1234 }],
  ["zero value", { label: "Errors", value: 0 }],
  ["no value", { label: "Pending" }],
  ["description", { ...BASE, description: "of 10 GB" }],
  ["empty description", { ...BASE, description: "" }],
  ["positive trend", { ...BASE, trend: { value: 12.5 } }],
  ["negative trend", { ...BASE, trend: { value: -1.8 } }],
  ["zero trend", { ...BASE, trend: { value: 0 } }],
  ["trend with label", { ...BASE, trend: { value: 12.5, label: "vs last month" } }],
  ["trend in the header with its label", { ...BASE, trend: { value: -3, label: "vs last week" }, trendPosition: "header" }],
  ["inverted positive trend", { ...BASE, trend: { value: 15.3, label: "vs last hour" }, invertTrend: true }],
  ["inverted negative trend", { ...BASE, trend: { value: -4 }, invertTrend: true }],
  ["inverted zero trend", { ...BASE, trend: { value: 0 }, invertTrend: true }],
  ["trend in the header", { ...BASE, trend: { value: 12.5 }, trendPosition: "header" }],
  ["badge trend", { ...BASE, trend: { value: 8.2 }, trendVariant: "badge" }],
  ["badge trend, negative, inverted", { ...BASE, trend: { value: -8.2 }, trendVariant: "badge", invertTrend: true }],
  ["badge trend, positive, inverted", { ...BASE, trend: { value: 8.2 }, trendVariant: "badge", invertTrend: true }],
  ["badge trend, zero", { ...BASE, trend: { value: 0 }, trendVariant: "badge" }],
  ["badge trend in the header", { ...BASE, trend: { value: 8.2, label: "vs last week" }, trendVariant: "badge", trendPosition: "header" }],
  ["trend position header without a trend", { ...BASE, trendPosition: "header" }],
  ["tooltip", { ...BASE, tooltip: "Sum of all revenue streams" }],
  ["empty tooltip", { ...BASE, tooltip: "" }],
  ["progress", { label: "Storage Used", value: "7.2 GB", progress: 72, progressLabel: "72%", description: "of 10 GB" }],
  ["progress without a label", { ...BASE, progress: 30 }],
  ["progress above 100 and below 0", { ...BASE, progress: 140 }],
  ["negative progress", { ...BASE, progress: -5 }],
  ["zero progress", { ...BASE, progress: 0 }],
  ["progress label only", { ...BASE, progressLabel: "n/a" }],
  ["size sm", { ...BASE, size: "sm", trend: { value: -2.6 }, tooltip: "Total inquiries in period" }],
  ["accent variant", { ...BASE, variant: "accent", accentColor: "danger", trend: { value: 12.5, label: "vs last month" } }],
  ["accent color default", { ...BASE, variant: "accent" }],
  ["className and attributes on the root", { ...BASE, "className": "w-80", "id": "revenue", "data-testid": "card", "style": { maxWidth: "320px" } }],
  ["caller attributes win", { ...BASE, "data-variant": "custom" }],
]

// StatCard was renamed StatsCard (owner 11.11): the old import path keeps the same component
test("the old StatCard name and import path give StatsCard", () => {
  expect(RStatCard).toBe(RStatsCard)
  expect(StatCard).toBe(StatsCard)
})

describe("StatsCard markup parity", () => {
  test.each(cases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(createElement(RStatsCard as never, props), () =>
      h(StatsCard as never, toVue(props)),
    )
    expect(vue).toBe(react)
  })

  test("icon slot switches to the icon layout", async () => {
    for (const size of ["default", "sm"]) {
      const props = { ...BASE, size, trend: { value: 12.5 }, tooltip: "Tip", progress: 50 }
      const { react, vue } = await renderPair(<RStatsCard {...(props as never)} icon={<RDollarCircle />} />, () =>
        h(StatsCard as never, props, { icon: () => h(DollarCircle) }),
      )
      expect(vue).toBe(react)
      expect(react).toContain('class="IconWrapper"')
    }
  })

  test("value and sparkline slots take rich content", async () => {
    const { react, vue } = await renderPair(
      <RStatsCard
        label="Latency"
        value={
          <>
            234<small>ms</small>
          </>
        }
        sparkline={<svg viewBox="0 0 10 2" data-testid="spark" />}
      />,
      () =>
        h(
          StatsCard,
          { label: "Latency" },
          {
            value: () => ["234", h("small", null, "ms")],
            sparkline: () => h("svg", { "viewBox": "0 0 10 2", "data-testid": "spark" }),
          },
        ),
    )
    expect(vue).toBe(react)
    expect(react).toContain('class="Sparkline"')
  })

  // Vue turns a slot's "" into an empty Text vnode; React's "" is falsy
  test.each([
    ["an empty string", () => ""],
    ["an empty text vnode in a fragment", () => [h(Fragment, null, [createTextVNode("")])]],
  ])("icon and sparkline slots rendering %s render like React's \"\"", async (_name, slot) => {
    const { react, vue } = await renderPair(<RStatsCard {...BASE} icon="" sparkline="" />, () =>
      h(StatsCard, BASE, { icon: slot, sparkline: slot }),
    )
    expect(vue).toBe(react)
    expect(react).not.toContain("IconWrapper")
    expect(react).not.toContain("Sparkline")
  })

  test("empty slots render like absent ReactNodes", async () => {
    const { react, vue } = await renderPair(<RStatsCard {...BASE} icon={null} sparkline={false} />, () =>
      h(StatsCard, BASE, { icon: () => [], sparkline: () => [] }),
    )
    expect(vue).toBe(react)
    expect(react).not.toContain("IconWrapper")
  })
})

// The info icon's tooltip, hovered: same content and attributes. Reka's
// popper wrapper is normalized as in tooltip-popover.test.tsx.
const normalizePopper = (root: Element) => {
  for (const wrapper of Array.from(root.querySelectorAll("[data-reka-popper-content-wrapper]"))) {
    wrapper.removeAttribute("dir")
  }
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    const style = element.getAttribute("style")!
    if (style.includes("--reka-popper-")) element.setAttribute("style", style.replaceAll("--reka-popper-", "--radix-popper-"))
  }
}

const snapshot = () => {
  const clone = document.body.cloneNode(true) as HTMLElement
  normalizePopper(clone)
  return serializeDom(clone)
}

const settle = async () => {
  for (let i = 0; i < 100; i++) await Promise.resolve()
}

describe("StatsCard tooltip parity", () => {
  test("hovering the info icon opens the tooltip after its delay; leaving closes it", async () => {
    const props = { ...BASE, tooltip: "Sum of all revenue streams", size: "sm" }
    const results: string[][] = []
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
    })
    try {
      const run = async (action: () => void) => {
        await act(async () => {
          vi.setSystemTime(Date.now() + 1)
          action()
          await settle()
        })
        await flushVue()
        await settle()
        await flushVue()
      }
      const script = async (out: string[]) => {
        await run(() => fireEvent.pointerMove(document.querySelector(".InfoIcon")!, { pointerType: "mouse" }))
        out.push(snapshot())
        await run(() => vi.advanceTimersByTime(150))
        out.push(snapshot())
        await run(() => fireEvent.pointerLeave(document.querySelector(".InfoIcon")!, { pointerType: "mouse" }))
        out.push(snapshot())
      }
      for (const mount of [
        async () => {
          await act(async () => void render(createElement(RStatsCard as never, props) as ReactElement))
          return () => cleanup()
        },
        async () => {
          const { unmount } = mountVue(() => h(StatsCard as never, props) as VNode)
          await flushVue()
          return unmount
        },
      ]) {
        const unmount = await mount()
        const out: string[] = []
        await script(out)
        results.push(out)
        unmount()
        vi.clearAllTimers()
      }
    } finally {
      vi.useRealTimers()
    }
    expect(results[1]).toEqual(results[0])
    expect(results[0]![0]).not.toContain('role="tooltip"')
    expect(results[0]![1]).toContain('role="tooltip"')
    expect(results[0]![1]).toContain('"Sum of all revenue streams"')
    expect(results[0]![2]).not.toContain('role="tooltip"')
  })
})

// Shown together on the Overview (owner 11.11), an icon, a trend and a progress bar laid the card out wrong: the icon's
// tile stretched to a narrow bar, and a description beside the trend ran over the value. Then (owner 11.11: "не
// красиво", "две зеленые полоски?", "иконка в квадрате?") the card took the layout of shadcn's metric cards: the icon
// a small tile at the end of the header, the trend and its label one line under the value, the accent one bar.
describe("StatsCard layout", () => {
  const css = postcss.parse(readFileSync("packages/styles/src/components/StatsCard/StatsCard.module.css", "utf8"))
  const declarations = (selector: string) => {
    const found: Record<string, string> = {}
    css.walkRules((rule) => {
      if (rule.selector !== selector) return
      rule.each((node) => { if (node.type === "decl") found[node.prop] = node.value })
    })
    return found
  }

  test("the icon's tile is the square its token sizes, as tall as the label and the value", () => {
    expect(declarations(".IconWrapper")).toMatchObject({ width: "var(--stats-card-icon-wrapper-size)", height: "var(--stats-card-icon-wrapper-size)" })
    expect(declarations(".IconWrapper")).not.toHaveProperty("align-self")
    expect(declarations(".IconWrapper")).not.toHaveProperty("aspect-ratio")
  })

  test("what does not fit beside the value goes to the next line", () => {
    expect(declarations(".ValueRow")).toMatchObject({ "flex-wrap": "wrap" })
  })

  test("the accent is a bar inside the card, not a border bent along its corners, and the progress keeps its fill", () => {
    const accent = css.toString().slice(css.toString().indexOf('&:where([data-variant="accent"])'))
    expect(accent).not.toMatch(/border-inline-start/)
    expect(accent).toMatch(/&::before \{[^}]*width: var\(--stats-card-accent-width\)/)
    expect(accent.slice(0, accent.indexOf("&::before"))).not.toMatch(/--stats-card-progress-fill/)
  })

  test("the icon stands at the end of the header, and the trend with its label on a line under the value", () => {
    const view = render(<RStatsCard {...BASE} icon={<RDollarCircle />} trend={{ value: -3.2, label: "vs last month" }} />)
    const card = view.container.firstElementChild as HTMLElement
    const [header, valueRow, trendRow] = [...card.children] as HTMLElement[]
    expect(header.lastElementChild?.firstElementChild?.querySelector("svg")).not.toBeNull()
    expect(valueRow.textContent).toBe("$45,231")
    expect(trendRow.textContent).toBe("-3.2%vs last month")
    // A fall draws the rise's trend line mirrored
    expect(trendRow.querySelector("svg")?.getAttribute("class")).toMatch(/TrendDown/)
    cleanup()
  })
})
