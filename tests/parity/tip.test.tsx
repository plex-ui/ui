import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { Button as RButton } from "../../packages/ui/src/components/Button"
import { Bookmark as RBookmark } from "../../packages/ui/src/components/Icon"
import { Tip as RTip, type TipProps as RTipProps } from "../../packages/ui/src/components/Tip"
import { Button } from "../../packages/vue/src/components/Button"
import { Bookmark } from "../../packages/vue/src/components/Icon"
import { Tip, TipPopover } from "../../packages/vue/src/components/Tip"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair } from "./pair"

// React-vs-Vue parity for Tip (plan 171, after the TipKit kit): the same DOM for an inline tip in every
// combination of symbol, actions, Close and arrow; a popover tip that names itself, draws the arrow, keeps the
// focus on its control, closes from Close, Escape and a press outside (not from its control or the focus moving),
// sits in the Tab order right after its control; and the kit and native measurements in the CSS.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

// Radix and Reka measure the arrow
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type Case = { icon?: boolean, actions?: boolean, close?: boolean, arrowEdge?: RTipProps["arrowEdge"], description?: boolean }
const cases: Array<[string, Case]> = [
  ["text only", { description: true }],
  ["a title alone", {}],
  ["a symbol, actions and Close", { icon: true, actions: true, close: true, description: true }],
  ["Close without a symbol", { close: true, description: true }],
  ["an arrow at the top", { arrowEdge: "top", description: true }],
  ["an arrow at the leading side", { arrowEdge: "left", description: true, close: true }],
]

const reactTip = (c: Case) => (
  <RTip
    title="Save it for later"
    description={c.description ? "Bookmarked articles wait in your reading list." : undefined}
    icon={c.icon ? <RBookmark /> : undefined}
    actions={c.actions ? <><RButton color="primary" variant="soft">Not now</RButton><RButton color="primary">Turn on</RButton></> : undefined}
    onClose={c.close ? () => {} : undefined}
    arrowEdge={c.arrowEdge}
    className="custom"
  />
)

const vueTip = (c: Case) => () =>
  h(
    Tip,
    {
      title: "Save it for later",
      description: c.description ? "Bookmarked articles wait in your reading list." : undefined,
      onClose: c.close ? () => {} : undefined,
      arrowEdge: c.arrowEdge,
      class: "custom",
    },
    {
      ...(c.icon ? { icon: () => h(Bookmark) } : {}),
      ...(c.actions ? { actions: () => [h(Button, { color: "primary", variant: "soft" }, () => "Not now"), h(Button, { color: "primary" }, () => "Turn on")] } : {}),
    },
  )

describe("an inline Tip", () => {
  test.each(cases)("%s renders the same DOM in React and Vue", async (_name, c) => {
    const pair = await renderPair(reactTip(c), vueTip(c))
    expect(pair.vue).toBe(pair.react)
  })

  test.each(["React", "Vue"] as const)("%s: a note named by its title, its parts in order, Close named Close tip", async (framework) => {
    const onClose = vi.fn()
    if (framework === "React") render(<RTip title="Save it for later" description="Bookmarked articles wait." icon={<RBookmark />} actions={<RButton>Turn on</RButton>} onClose={onClose} />)
    else mountVue(() => h(Tip, { title: "Save it for later", description: "Bookmarked articles wait.", onClose }, { icon: () => h(Bookmark), actions: () => h(Button, null, () => "Turn on") }))
    await flushVue()
    const tip = document.querySelector<HTMLElement>('[role="note"]')!
    expect(tip.className).toContain("Tip")
    const title = document.getElementById(tip.getAttribute("aria-labelledby")!)
    expect(title?.textContent).toBe("Save it for later")
    expect([...tip.children].map((part) => part.className.match(/(Icon|Message|Actions|Close)/)?.[1])).toEqual(["Icon", "Message", "Actions", "Close"])
    const close = tip.querySelector<HTMLButtonElement>('button[aria-label="Close tip"]')!
    await interact(() => { fireEvent.click(close) })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

const ReactPopover = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
  const [open, setOpen] = useState(true)
  return (
    <>
      <RTip.Popover
        open={open}
        onOpenChange={(next) => { setOpen(next); onOpenChange(next) }}
        title="Filter the list"
        description="Show only the items from the last week."
      >
        <RButton data-anchor="">Filter</RButton>
      </RTip.Popover>
      <RButton data-next="">Next</RButton>
    </>
  )
}

const VuePopover = defineComponent({
  props: { onOpenChange: { type: Function, required: true } },
  setup(props) {
    const open = ref(true)
    return () => [
      h(
        TipPopover,
        {
          "open": open.value,
          "onUpdate:open": (next: boolean) => { open.value = next; props.onOpenChange(next) },
          "title": "Filter the list",
          "description": "Show only the items from the last week.",
        },
        () => h(Button, { "data-anchor": "" }, () => "Filter"),
      ),
      h(Button, { "data-next": "" }, () => "Next"),
    ]
  },
})

const press = async (target: Element, pointerType: string) => {
  await interact(async () => {
    fireEvent.pointerDown(target, { button: 0, pointerType, pointerId: 1 })
    fireEvent.mouseDown(target, { button: 0 })
    fireEvent.pointerUp(target, { button: 0, pointerType, pointerId: 1 })
    fireEvent.mouseUp(target, { button: 0 })
    fireEvent.click(target, { button: 0 })
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

const mountPopover = async (framework: "React" | "Vue", onOpenChange: (open: boolean) => void) => {
  if (framework === "React") await act(async () => { render(<ReactPopover onOpenChange={onOpenChange} />) })
  else mountVue(() => h(VuePopover, { onOpenChange }))
  await flushVue()
  await interact(() => {})
}

describe.each(["React", "Vue"] as const)("%s Tip.Popover", (framework) => {
  test("is a dialog named and described by the tip, with the tip and the arrow, and leaves the focus on its control", async () => {
    const anchor = document.createElement("button")
    document.body.appendChild(anchor)
    anchor.focus()
    await mountPopover(framework, () => {})
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.className).toContain("Popover")
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("Filter the list")
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)?.textContent).toBe("Show only the items from the last week.")
    expect(dialog.querySelector(":scope > [class*='Tip']")).toBeTruthy()
    expect(dialog.querySelector("[class*='Arrow']")).toBeTruthy()
    expect(dialog.contains(document.activeElement)).toBe(false)
    anchor.remove()
  })

  test("closes from Close", async () => {
    const changes: boolean[] = []
    await mountPopover(framework, (open) => changes.push(open))
    await interact(() => { fireEvent.click(document.querySelector('button[aria-label="Close tip"]')!) })
    expect(changes).toEqual([false])
    await interact(() => {})
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector("[data-anchor]")).toBeTruthy()
  })

  test("closes from Escape", async () => {
    const changes: boolean[] = []
    await mountPopover(framework, (open) => changes.push(open))
    await interact(() => { fireEvent.keyDown(document.body, { key: "Escape" }) })
    expect(changes).toEqual([false])
  })

  test("closes from a press outside, once the click completes it", async () => {
    const changes: boolean[] = []
    const outside = document.createElement("button")
    document.body.appendChild(outside)
    await mountPopover(framework, (open) => changes.push(open))
    await press(outside, "mouse")
    expect(changes).toEqual([false])
    outside.remove()
  })

  test("stays open when its control is tapped or focused, or the focus moves elsewhere", async () => {
    const changes: boolean[] = []
    await mountPopover(framework, (open) => changes.push(open))
    const control = document.querySelector<HTMLElement>("[data-anchor]")!
    await press(control, "touch")
    await interact(() => { control.focus() })
    await interact(() => { document.querySelector<HTMLElement>("[data-next]")!.focus() })
    expect(changes).toEqual([])
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
  })

  test("Tab and Shift+Tab reach the tip as if it sat right after its control", async () => {
    await mountPopover(framework, () => {})
    const control = document.querySelector<HTMLElement>("[data-anchor]")!
    const close = document.querySelector<HTMLElement>('button[aria-label="Close tip"]')!
    control.focus()
    await interact(() => { fireEvent.keyDown(control, { key: "Tab" }) })
    expect(document.activeElement).toBe(close)
    await interact(() => { fireEvent.keyDown(close, { key: "Tab", shiftKey: true }) })
    expect(document.activeElement).toBe(control)
    close.focus()
    await interact(() => { fireEvent.keyDown(close, { key: "Tab" }) })
    const next = document.querySelector<HTMLElement>("[data-next]")!
    expect(document.activeElement).toBe(next)
    await interact(() => { fireEvent.keyDown(next, { key: "Tab", shiftKey: true }) })
    expect(document.activeElement).toBe(close)
  })

  test("leaves Tab to a control that takes it itself", async () => {
    await mountPopover(framework, () => {})
    const control = document.querySelector<HTMLElement>("[data-anchor]")!
    control.addEventListener("keydown", (event) => event.preventDefault())
    control.focus()
    await interact(() => { fireEvent.keyDown(control, { key: "Tab" }) })
    expect(document.activeElement).toBe(control)
  })

  test("stays open when its control is pressed", async () => {
    const changes: boolean[] = []
    await mountPopover(framework, (open) => changes.push(open))
    const control = document.querySelector<HTMLElement>("[data-anchor]")!
    await interact(() => {
      fireEvent.pointerDown(control, { button: 0, pointerType: "mouse" })
      fireEvent.pointerUp(control, { button: 0, pointerType: "mouse" })
      fireEvent.click(control)
    })
    expect(changes).toEqual([])
  })
})

describe("Tip styles", () => {
  const tokens = read("packages/styles/src/styles/variables-components.css")
  const css = read("packages/styles/src/components/Tip/Tip.module.css")

  test("the TipKit kit layout", () => {
    for (const token of [
      "--tip-popover-width: 300px",
      "--tip-radius: 20px",
      "--tip-padding-top: 22px",
      "--tip-padding-inline: 16px",
      "--tip-padding-bottom: 16px",
      "--tip-gap: 22px",
      "--tip-title-font-size: 17px",
      "--tip-title-line-height: 22px",
      "--tip-description-font-size: 15px",
      "--tip-description-line-height: 20px",
      "--tip-description-gap: 4px",
      "--tip-action-gap: 12px",
      "--tip-close-size: 30px",
      "--tip-close-offset: 19px",
      "--tip-arrow-width: 47px",
      "--tip-arrow-height: 13px",
      "--tip-popover-shadow: 0 10px 30px rgb(0 0 0 / 20%)",
    ]) expect(tokens).toContain(token)
  })

  test("a phone tip takes the shape TipKit's tip and most native cards share (IMG_5726, 5729, 5730), a popover tip in the iOS 27 alert's glass", () => {
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    for (const value of [
      "border-radius: 26px",
      "--tip-padding-top: 14px",
      "--tip-padding-inline: var(--mobile-layout-margin, 16px)",
      "--tip-gap: 11px",
      "--tip-description-gap: 0px",
      "--tip-icon-frame-width: 36px",
      "--tip-close-size: 22px",
      "--tip-close-offset: 17px",
      "--mobile-surface-grouped-secondary",
      "--mobile-label-tertiary",
      "var(--dialog-alert-background",
      "var(--dialog-alert-backdrop-filter",
    ]) expect(phone).toContain(value)
    // Close is a bare glyph; each action is a row of text in its own color under a separator
    expect(phone).toMatch(/\.Tip > \.Close\[data-variant\] \{[^}]*--button-background-color: transparent;/)
    expect(phone).toMatch(/\.Tip > \.Actions > \[data-variant\] \{[^}]*border-top: 1px solid var\(--color-border\);/)
    expect(phone).toContain('.Tip > .Actions > [data-color="primary"] { --tip-action-color: var(--color-text-primary-ghost); }')
    expect(phone).toMatch(/\.Tip > \.Actions > \[data-variant\] \{[^}]*--button-font-weight: var\(--font-weight-normal\);/)
    expect(phone).not.toContain("--dialog-alert-action-height")
  })
})
