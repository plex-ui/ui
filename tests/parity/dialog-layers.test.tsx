// Plan 176 item 1: what an owner can tell the Dialog. Escape and a press outside ask the owner first, the layers
// take a class, a style, data attributes and a stack order, the layer covers the part of the window a phone keyboard
// leaves, steps of a flow come in as a push, and the phone layout follows a prop or a PhoneLayout at any width.
import { readFileSync } from "node:fs"
import postcss from "postcss"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState, type ReactNode } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive, ref } from "vue"
import { Dialog as ReactDialog, type DialogContentProps as ReactContentProps } from "../../packages/ui/src/components/Dialog"
import { PhoneLayout as ReactPhoneLayout } from "../../packages/ui/src/components/PhoneLayout"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogSteps,
  DialogTitle,
} from "../../packages/vue/src/components/Dialog"
import { PhoneLayout } from "../../packages/vue/src/components/PhoneLayout"
import phoneLayoutScope, {
  phoneCondition,
  scopeSelector,
  unscopeSelector,
} from "../../packages/styles/postcss/phoneLayoutScope.mjs"
import * as reactSteps from "../../packages/ui/src/components/Dialog/dialogSteps"
import { watchDialogViewport as reactWatchViewport } from "../../packages/ui/src/components/Dialog/dialogViewport"
import * as vueSteps from "../../packages/vue/src/components/Dialog/dialogSteps"
import { watchDialogViewport as vueWatchViewport } from "../../packages/vue/src/components/Dialog/dialogViewport"
import platformUILightDark, { themedSelectors } from "../../packages/styles/postcss/parseLightDark.mjs"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

type Props = Record<string, unknown>

const reactDialog = (content: Props, body: ReactNode = <p>Body</p>) => (
  <ReactDialog open>
    <ReactDialog.Content {...(content as ReactContentProps)}>
      <ReactDialog.Header>
        <ReactDialog.Title>Edit profile</ReactDialog.Title>
      </ReactDialog.Header>
      {body}
    </ReactDialog.Content>
  </ReactDialog>
)

const vueDialog = (content: Props, body: () => unknown = () => h("p", null, "Body")) =>
  h(Dialog, { open: true }, {
    default: () =>
      h(DialogContent, content, {
        default: () => [h(DialogHeader, null, { default: () => h(DialogTitle, null, { default: () => "Edit profile" }) }), body()],
      }),
  })

const both = async (content: Props, vueContent: Props = content) => {
  await act(async () => {
    render(reactDialog(content))
  })
  const react = serializeDom()
  cleanup()
  const { unmount } = mountVue(() => vueDialog(vueContent))
  await flushVue()
  const vue = serializeDom()
  unmount()
  return { react, vue }
}

const nextTask = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
const pastDoubleClick = () => new Promise((resolve) => setTimeout(resolve, 320))
const dialogOpen = () => !!document.querySelector('[role="dialog"]')

describe("Dialog asks the owner before it closes", () => {
  const pressEscape = async () => {
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape", code: "Escape" })
    })
    await flushVue()
  }

  test.each([
    ["a prevented Escape keeps it open", true, [true]],
    ["Escape without a veto closes it", false, [false, false]],
  ] as const)("%s", async (_name, veto, expected) => {
    const run = async (mount: (props: Props, changes: boolean[]) => void) => {
      const keys: string[] = []
      const changes: boolean[] = []
      const onEscapeKeyDown = (event: KeyboardEvent) => {
        keys.push(`${event.key}:${event.cancelable}:${event.defaultPrevented}`)
        if (veto) event.preventDefault()
      }
      mount({ onEscapeKeyDown }, changes)
      await flushVue()
      await pressEscape()
      return { keys, open: dialogOpen(), changes }
    }
    const react = await run((props, changes) => {
      const Example = () => {
        const [open, setOpen] = useState(true)
        return (
          <ReactDialog open={open} onOpenChange={(next) => { changes.push(next); setOpen(next) }}>
            <ReactDialog.Content {...(props as ReactContentProps)}><ReactDialog.Title>Form</ReactDialog.Title></ReactDialog.Content>
          </ReactDialog>
        )
      }
      render(<Example />)
    })
    cleanup()
    const vue = await run((props, changes) => {
      const open = ref(true)
      mountVue(() => h(Dialog, { "open": open.value, "onUpdate:open": (next: boolean) => { changes.push(next); open.value = next } }, {
        default: () => h(DialogContent, props, { default: () => h(DialogTitle, null, { default: () => "Form" }) }),
      }))
    })
    expect(vue).toEqual(react)
    // The handler gets a copy it can cancel, not the event the stack already prevented
    expect(react.keys).toEqual(["Escape:true:false"])
    expect(react.open).toBe(veto)
    expect([react.open, ...react.changes]).toEqual(expected)
  })

  test.each([
    ["a prevented press outside keeps it open", true],
    ["a press outside without a veto closes it", false],
  ] as const)("%s", async (_name, veto) => {
    const overlay = () => document.querySelector('[class~="Overlay"]')!
    const run = async (mount: (props: Props) => void) => {
      const targets: string[] = []
      mount({
        onInteractOutside: (event: CustomEvent<{ originalEvent: Event }>) => {
          targets.push(`${event.type}:${(event.detail.originalEvent.target as Element).className}`)
          if (veto) event.preventDefault()
        },
      })
      await flushVue()
      await nextTask()
      await pastDoubleClick()
      await act(async () => {
        fireEvent.pointerDown(overlay(), { pointerType: "mouse" })
        fireEvent.pointerUp(overlay(), { pointerType: "mouse" })
        fireEvent.click(overlay())
      })
      await nextTask()
      await flushVue()
      return { targets: [...new Set(targets)], open: dialogOpen() }
    }
    const react = await run((props) => {
      const Example = () => {
        const [open, setOpen] = useState(true)
        return (
          <ReactDialog open={open} onOpenChange={setOpen}>
            <ReactDialog.Content {...(props as ReactContentProps)}><ReactDialog.Title>Form</ReactDialog.Title></ReactDialog.Content>
          </ReactDialog>
        )
      }
      render(<Example />)
    })
    cleanup()
    const vue = await run((props) => {
      const open = ref(true)
      mountVue(() => h(Dialog, { "open": open.value, "onUpdate:open": (next: boolean) => { open.value = next } }, {
        default: () => h(DialogContent, props, { default: () => h(DialogTitle, null, { default: () => "Form" }) }),
      }))
    })
    expect(vue).toEqual(react)
    expect(react.targets.some((target) => target.includes("Overlay"))).toBe(true)
    expect(react.open).toBe(veto)
  })

  test("a press outside asks the owner when its click completes it: a form that changed meanwhile keeps it open", async () => {
    const overlay = () => document.querySelector('[class~="Overlay"]')!
    const run = async (mount: (props: Props) => void) => {
      const form = { dirty: false }
      mount({ onInteractOutside: (event: Event) => { if (form.dirty) event.preventDefault() } })
      await flushVue()
      await nextTask()
      await pastDoubleClick()
      await act(async () => {
        fireEvent.pointerDown(overlay(), { pointerType: "mouse" })
      })
      form.dirty = true
      await act(async () => {
        fireEvent.pointerUp(overlay(), { pointerType: "mouse" })
        fireEvent.click(overlay())
      })
      await nextTask()
      await flushVue()
      return dialogOpen()
    }
    const react = await run((props) => {
      const Example = () => {
        const [open, setOpen] = useState(true)
        return (
          <ReactDialog open={open} onOpenChange={setOpen}>
            <ReactDialog.Content {...(props as ReactContentProps)}><ReactDialog.Title>Form</ReactDialog.Title></ReactDialog.Content>
          </ReactDialog>
        )
      }
      render(<Example />)
    })
    cleanup()
    const vue = await run((props) => {
      const open = ref(true)
      mountVue(() => h(Dialog, { "open": open.value, "onUpdate:open": (next: boolean) => { open.value = next } }, {
        default: () => h(DialogContent, props, { default: () => h(DialogTitle, null, { default: () => "Form" }) }),
      }))
    })
    expect({ react, vue }).toEqual({ react: true, vue: true })
  })

  test.each([
    ["a touch on a button outside that takes focus", "panel"],
    ["a touch on the overlay while focus moves out", "overlay"],
  ] as const)("%s asks the owner once, when its click completes it", async (_name, touched) => {
    const run = async (mount: (props: Props) => void) => {
      const panel = document.createElement("button")
      panel.textContent = "Panel"
      document.body.append(panel)
      let calls = 0
      mount({
        onOpenAutoFocus: (event: Event) => event.preventDefault(),
        onInteractOutside: (event: Event) => { calls += 1; event.preventDefault() },
      })
      await flushVue()
      await nextTask()
      await pastDoubleClick()
      const target = () => (touched === "panel" ? panel : document.querySelector('[class~="Overlay"]')!)
      await act(async () => {
        fireEvent.pointerDown(target(), { pointerType: "touch" })
        fireEvent.pointerUp(target(), { pointerType: "touch" })
        fireEvent.mouseDown(target())
        panel.focus()
      })
      await flushVue()
      await nextTask()
      await act(async () => { fireEvent.click(target()) })
      await nextTask()
      await flushVue()
      panel.remove()
      return { calls, open: dialogOpen() }
    }
    const react = await run((props) => {
      const Example = () => {
        const [open, setOpen] = useState(true)
        return (
          <ReactDialog open={open} onOpenChange={setOpen}>
            <ReactDialog.Content {...(props as ReactContentProps)}><ReactDialog.Title>Form</ReactDialog.Title></ReactDialog.Content>
          </ReactDialog>
        )
      }
      render(<Example />)
    })
    cleanup()
    const vue = await run((props) => {
      const open = ref(true)
      mountVue(() => h(Dialog, { "open": open.value, "onUpdate:open": (next: boolean) => { open.value = next } }, {
        default: () => h(DialogContent, props, { default: () => h(DialogTitle, null, { default: () => "Form" }) }),
      }))
    })
    expect({ react, vue }).toEqual({ react: { calls: 1, open: true }, vue: { calls: 1, open: true } })
  })
  test("a touch outside that never clicks does not outlive the dialog: reopened, focus moving out asks the owner", async () => {
    const run = async (mount: (props: Props) => { close: () => void; reopen: () => void }) => {
      const panel = document.createElement("button")
      panel.textContent = "Panel"
      document.body.append(panel)
      let calls = 0
      const controls = mount({
        onOpenAutoFocus: (event: Event) => event.preventDefault(),
        onInteractOutside: (event: Event) => { calls += 1; event.preventDefault() },
      })
      await flushVue()
      await nextTask()
      await act(async () => {
        fireEvent.pointerDown(panel, { pointerType: "touch" })
        fireEvent.pointerUp(panel, { pointerType: "touch" })
      })
      await act(async () => { controls.close() })
      await flushVue()
      await nextTask()
      await act(async () => { controls.reopen() })
      await flushVue()
      await nextTask()
      await pastDoubleClick()
      await act(async () => { panel.focus() })
      await flushVue()
      await nextTask()
      panel.remove()
      return calls
    }
    const react = await run((props) => {
      let set: (open: boolean) => void = () => {}
      const Example = () => {
        const [open, setOpen] = useState(true)
        set = setOpen
        return (
          <ReactDialog open={open} onOpenChange={setOpen}>
            <ReactDialog.Content {...(props as ReactContentProps)}><ReactDialog.Title>Form</ReactDialog.Title></ReactDialog.Content>
          </ReactDialog>
        )
      }
      render(<Example />)
      return { close: () => set(false), reopen: () => set(true) }
    })
    cleanup()
    const vue = await run((props) => {
      const open = ref(true)
      mountVue(() => h(Dialog, { "open": open.value, "onUpdate:open": (next: boolean) => { open.value = next } }, {
        default: () => h(DialogContent, props, { default: () => h(DialogTitle, null, { default: () => "Form" }) }),
      }))
      return { close: () => { open.value = false }, reopen: () => { open.value = true } }
    })
    expect({ react, vue }).toEqual({ react: 1, vue: 1 })
  })
})

describe("Dialog layers", () => {
  test("zIndex, rootProps, overlayProps and data attributes land on the layers, the same in React and Vue", async () => {
    const content = {
      "zIndex": 2000,
      "rootProps": { "className": "root-layer", "style": { outline: "1px solid red" }, "data-testid": "root" },
      "overlayProps": { "className": "veil", "data-testid": "veil" },
      "data-flow": "checkout",
    }
    const { react, vue } = await both(content, {
      "zIndex": 2000,
      "rootProps": { "class": "root-layer", "style": { outline: "1px solid red" }, "data-testid": "root" },
      "overlayProps": { "class": "veil", "data-testid": "veil" },
      "data-flow": "checkout",
    })
    expect(vue).toBe(react)
    const layer = document.createElement("div")
    layer.innerHTML = react
    const overlay = layer.querySelector('[data-testid="veil"]') as HTMLElement
    const root = layer.querySelector('[data-testid="root"]') as HTMLElement
    expect(overlay.className).toContain("veil")
    expect(overlay.className).toContain("Overlay")
    expect(overlay.getAttribute("style")).toContain("--dialog-z-index: 2000")
    expect(root.className).toContain("root-layer")
    expect(root.className).toContain("Content")
    expect(root.getAttribute("data-flow")).toBe("checkout")
    expect(root.getAttribute("style")).toContain("--dialog-z-index: 2000")
    expect(root.getAttribute("style")).toContain("outline: 1px solid red")
  })

  test("the layers stack by the variable, 50 by default", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Dialog/Dialog.module.css`, "utf8")
    const rules = postcss.parse(css).nodes.filter((node) => node.type === "rule") as postcss.Rule[]
    for (const name of [".Overlay", ".Content"]) {
      const rule = rules.find((node) => node.selector === name)!
      const zIndex = rule.nodes.find((node) => node.type === "decl" && node.prop === "z-index") as postcss.Declaration
      expect(zIndex.value).toBe("var(--dialog-z-index, 50)")
    }
    // Every viewport height the panel reads follows the layer's height
    expect(css).not.toMatch(/(?<!, )100dvh/)
  })
})

describe("Dialog over a phone keyboard", () => {
  afterEach(() => {
    delete (window as { visualViewport?: unknown }).visualViewport
  })

  test("the layer covers the visual viewport while a keyboard shortens it, and lets go once it is gone", async () => {
    const run = async (mount: () => void) => {
      const listeners = new Map<string, () => void>()
      const viewport = {
        scale: 1,
        height: 400,
        offsetTop: 120,
        addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
        removeEventListener: (type: string) => listeners.delete(type),
      }
      Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true })
      vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(800)
      mount()
      await flushVue()
      const content = () => document.querySelector<HTMLElement>("[data-plex-dialog]")!
      const open = {
        attribute: content().hasAttribute("data-visual-viewport"),
        top: content().style.getPropertyValue("--dialog-viewport-top"),
        height: content().style.getPropertyValue("--dialog-viewport-height"),
      }
      viewport.height = 800
      viewport.offsetTop = 0
      await act(async () => listeners.get("resize")?.())
      const closed = { attribute: content().hasAttribute("data-visual-viewport"), height: content().style.getPropertyValue("--dialog-viewport-height") }
      return { open, closed }
    }
    const react = await run(() => render(reactDialog({ mobileVariant: "sheet" })))
    cleanup()
    const vue = await run(() => mountVue(() => vueDialog({ mobileVariant: "sheet" })))
    expect(vue).toEqual(react)
    expect(react).toEqual({
      open: { attribute: true, top: "120px", height: "400px" },
      closed: { attribute: false, height: "" },
    })
  })
})

describe("Dialog over a phone keyboard inside a PhoneLayout", () => {
  afterEach(() => {
    delete (window as { visualViewport?: unknown }).visualViewport
  })

  test.each([["React", reactWatchViewport], ["Vue", vueWatchViewport]] as const)("%s: the layer covers the part of the box the keyboard leaves visible", (_name, watch) => {
    const listeners = new Map<string, () => void>()
    const viewport = {
      scale: 1,
      height: 400,
      offsetTop: 0,
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
    }
    Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true })
    vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(800)
    const box = document.createElement("div")
    vi.spyOn(box, "clientHeight", "get").mockReturnValue(600)
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 700, height: 600, left: 0, right: 375, width: 375, x: 0, y: 100, toJSON: () => ({}) })
    const content = document.createElement("div")
    box.append(content)
    document.body.append(box)
    const stop = watch(content, box)
    const read = () => ({
      attribute: content.hasAttribute("data-visual-viewport"),
      top: content.style.getPropertyValue("--dialog-viewport-top"),
      height: content.style.getPropertyValue("--dialog-viewport-height"),
    })
    // The keyboard leaves the top 400 of the window: 300 of the box, from its top
    expect(read()).toEqual({ attribute: true, top: "0px", height: "300px" })
    viewport.height = 800
    listeners.get("resize")?.()
    expect(read()).toEqual({ attribute: false, top: "", height: "600px" })
    stop()
    expect(read()).toEqual({ attribute: false, top: "", height: "" })
    box.remove()
  })

  test.each([["React", reactWatchViewport], ["Vue", vueWatchViewport]] as const)("%s: a box drawn at half its size measures in its own pixels, from inside its border", (_name, watch) => {
    const viewport = { scale: 1, height: 250, offsetTop: 0, addEventListener: () => {}, removeEventListener: () => {} }
    Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true })
    vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(800)
    const box = document.createElement("div")
    // 600 tall with a 10px border, drawn at scale(.5): 310 on screen, its padding box from 105
    vi.spyOn(box, "clientHeight", "get").mockReturnValue(600)
    vi.spyOn(box, "offsetHeight", "get").mockReturnValue(620)
    vi.spyOn(box, "clientTop", "get").mockReturnValue(10)
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 410, height: 310, left: 0, right: 200, width: 200, x: 0, y: 100, toJSON: () => ({}) })
    const content = document.createElement("div")
    box.append(content)
    document.body.append(box)
    const stop = watch(content, box)
    // 145 screen pixels of the box stay above the keyboard: 290 of its own
    expect(content.style.getPropertyValue("--dialog-viewport-top")).toBe("0px")
    expect(content.style.getPropertyValue("--dialog-viewport-height")).toBe("290px")
    stop()
    box.remove()
  })
})

describe("Dialog phone layout at any window width", () => {
  test("layout=\"phone\" puts the phone scope above the dialog's transition, the same in React and Vue", async () => {
    const { react, vue } = await both({ layout: "phone", mobileVariant: "sheet" })
    expect(vue).toBe(react)
    const scope = document.createElement("div")
    scope.innerHTML = react
    const phone = scope.querySelector('[data-plex-layout="phone"]')!
    expect(phone.className).toContain("PhoneScope")
    expect(phone.querySelector('[class~="Transition"] [data-plex-dialog]')).not.toBeNull()
    // The header of a phone sheet is its Toolbar at a desktop width too
    expect(phone.querySelector("[data-dialog-bar]")).not.toBeNull()
  })

  test("the phone layout follows a change of the layout prop, the same in React and Vue", async () => {
    const read = () => ({ scope: !!document.querySelector('[data-plex-layout="phone"]'), bar: !!document.querySelector("[data-dialog-bar]") })
    const react: Array<ReturnType<typeof read>> = []
    const { rerender } = render(reactDialog({ layout: "auto", mobileVariant: "sheet" }))
    await act(async () => {})
    react.push(read())
    rerender(reactDialog({ layout: "phone", mobileVariant: "sheet" }))
    await act(async () => {})
    react.push(read())
    rerender(reactDialog({ layout: "auto", mobileVariant: "sheet" }))
    await act(async () => {})
    react.push(read())
    cleanup()
    const layout = ref<"auto" | "phone">("auto")
    mountVue(() => vueDialog({ layout: layout.value, mobileVariant: "sheet" }))
    const vue: Array<ReturnType<typeof read>> = []
    await flushVue()
    vue.push(read())
    layout.value = "phone"
    await flushVue()
    vue.push(read())
    layout.value = "auto"
    await flushVue()
    vue.push(read())
    expect(vue).toEqual(react)
    expect(react).toEqual([{ scope: false, bar: false }, { scope: true, bar: true }, { scope: false, bar: false }])
  })

  test("a dialog inside a PhoneLayout portals into the box and lays out as a phone sheet", async () => {
    await act(async () => {
      render(<ReactPhoneLayout className="frame">{reactDialog({ mobileVariant: "sheet" })}</ReactPhoneLayout>)
    })
    const react = serializeDom()
    const reactFrame = document.querySelector(".frame")!
    expect(reactFrame.getAttribute("data-plex-layout")).toBe("phone")
    expect(reactFrame.querySelector("[data-plex-dialog] [data-dialog-bar]")).not.toBeNull()
    expect(document.querySelector('[class~="PhoneScope"]')).toBeNull()
    cleanup()
    mountVue(() => h(PhoneLayout, { class: "frame" }, { default: () => vueDialog({ mobileVariant: "sheet" }) }))
    await flushVue()
    const vueFrame = document.querySelector(".frame")!
    expect(vueFrame.querySelector("[data-plex-dialog] [data-dialog-bar]")).not.toBeNull()
    expect(serializeDom()).toBe(react)
  })
})

describe("Dialog steps", () => {
  test("a new step comes in while the one before leaves, the same in React and Vue", async () => {
    animation.disabled = false
    const snapshot = () =>
      Array.from(document.querySelectorAll('[class~="Steps"] > *')).map((step) => ({
        text: step.textContent,
        exiting: step.hasAttribute("data-exiting"),
        direction: (step as HTMLElement).dataset.exitDirection ?? null,
      }))

    let setReactStep: (step: string) => void = () => {}
    const ReactFlow = () => {
      const [step, setStep] = useState("email")
      setReactStep = setStep
      return reactDialog({}, <ReactDialog.Steps step={step}><p>{step === "email" ? "Email" : "Code"}</p></ReactDialog.Steps>)
    }
    await act(async () => {
      render(<ReactFlow />)
    })
    await act(async () => setReactStep("code"))
    const react = snapshot()
    cleanup()

    const state = reactive({ step: "email" })
    mountVue(() => vueDialog({}, () => h(DialogSteps, { step: state.step }, { default: () => h("p", null, state.step === "email" ? "Email" : "Code") })))
    await flushVue()
    state.step = "code"
    await flushVue()
    const vue = snapshot()

    expect(vue).toEqual(react)
    expect(react).toEqual(expect.arrayContaining([
      { text: "Code", exiting: false, direction: null },
      { text: "Email", exiting: true, direction: "forward" },
    ]))
  })

  const stepsFixture = (heights: number[]) => {
    const steps = document.createElement("div")
    steps.dataset.direction = "forward"
    const items = heights.map((height) => {
      const item = document.createElement("div")
      Object.defineProperty(item, "offsetHeight", { value: height, configurable: true })
      const step = document.createElement("div")
      step.setAttribute("data-dialog-step", "")
      step.tabIndex = -1
      item.append(step)
      steps.append(item)
      return item
    })
    document.body.append(steps)
    return { steps, items }
  }

  test.each([["React", reactSteps], ["Vue", vueSteps]] as const)("%s: a step still leaving from a step before stays covered to its edge", (_name, helpers) => {
    const { steps, items: [a, b] } = stepsFixture([500, 100, 100])
    const cover = () => steps.style.getPropertyValue("--dialog-steps-exit-height")
    helpers.leaveStep(a)
    a.setAttribute("data-exiting", "")
    expect(cover()).toBe("500px")
    // The next step forward before the first one has left
    helpers.leaveStep(b)
    b.setAttribute("data-exiting", "")
    expect(cover()).toBe("500px")
    helpers.releaseStepHeight(a)
    a.remove()
    expect(cover()).toBe("100px")
    helpers.releaseStepHeight(b)
    expect(cover()).toBe("")
    steps.remove()
  })

  test.each([["React", reactSteps], ["Vue", vueSteps]] as const)("%s: a step that comes back while it still leaves takes the focus once it is not inert", async (_name, helpers) => {
    const { steps, items: [a, b] } = stepsFixture([100, 100])
    b.querySelector<HTMLElement>("[data-dialog-step]")!.focus()
    ;(a as HTMLElement & { inert: boolean }).inert = true
    helpers.enterStep(a)
    expect(document.activeElement).toBe(b.querySelector("[data-dialog-step]"))
    ;(a as HTMLElement & { inert: boolean }).inert = false
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(a.querySelector("[data-dialog-step]"))
    steps.remove()
  })

  test("the push reaches the panel's edges and a step stays opaque over the one under it", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Dialog/Dialog.module.css`, "utf8")
    expect(css).toContain("margin-inline: calc(-1 * var(--dialog-steps-gutter, 0px));")
    expect(css).toContain("transform: translateX(calc(100% * var(--dialog-steps-sign)));")
    expect(css).toContain("transform: translateX(calc(-30% * var(--dialog-steps-sign)));")
    expect(css).toContain("background: var(--dialog-steps-background, var(--dialog-panel-background, var(--color-surface-elevated)));")
  })
})

describe("phone layout scope (postcss)", () => {
  const run = async (css: string) => (await postcss([phoneLayoutScope()]).process(css, { from: undefined })).css

  test("phone rules are copied under the scope after their media rule; desktop rules leave the scope", async () => {
    const out = await run(`
.Panel { padding: 20px; }
@media (width <= 767px) { .Content .Panel { padding: 0; } :root { --gap: 8px; } }
@media (min-width: 768px) { .Panel::before { content: ""; } }
@media (max-width: 767px) and (hover: hover) { .Panel:hover { color: red; } }
@media (max-width: 767px) { @keyframes slide { from { opacity: 0; } } }
@media (min-width: 400px) and (max-width: 767px) { .Mid { color: blue; } }`)
    expect(out).toContain(':where([data-plex-layout="phone"]) .Content .Panel { padding: 0; }')
    expect(out).toContain(':root :where([data-plex-layout="phone"]) { --gap: 8px; }')
    expect(out).toContain('.Panel:not(:where([data-plex-layout="phone"], [data-plex-layout="phone"] *))::before')
    expect(out).toMatch(/@media \(hover: hover\) \{ :where\(\[data-plex-layout="phone"\]\) \.Panel:hover/)
    expect(out).toContain("from { opacity: 0; }")
    // Another width range is not known inside a frame: no copy
    expect(out).not.toContain(':where([data-plex-layout="phone"]) .Mid')
  })

  test("selectors keep their specificity", () => {
    expect(scopeSelector(".A > .B")).toBe(':where([data-plex-layout="phone"]) .A > .B')
    expect(scopeSelector("html[data-theme=dark] .A")).toBe('html[data-theme=dark] :where([data-plex-layout="phone"]) .A')
    expect(unscopeSelector(".A .B")).toBe('.A .B:not(:where([data-plex-layout="phone"], [data-plex-layout="phone"] *))')
    expect(phoneCondition("(max-width: 767px)")).toBe(true)
    expect(phoneCondition("screen and (width <= 767px) and (prefers-reduced-motion: reduce)")).toBe("(prefers-reduced-motion: reduce)")
    expect(phoneCondition("(min-width: 768px)")).toBeNull()
  })

  test("light-dark() on a selector that starts on the root element puts the theme on the root itself", async () => {
    expect(themedSelectors("html:root", "dark")).toEqual(['html:root:where([data-theme="dark"])'])
    expect(themedSelectors(':root :where([data-plex-layout="phone"])', "dark")).toEqual([
      ':root:where([data-theme="dark"]) :where([data-plex-layout="phone"])',
      ':root :where([data-theme="dark"]) :where([data-plex-layout="phone"])',
    ])
    expect(themedSelectors(".Panel", "dark")).toEqual([':where([data-theme="dark"]) .Panel'])
    const out = (await postcss([phoneLayoutScope(), platformUILightDark()]).process("@media (max-width: 767px) { :root { --surface: light-dark(white, black); } }", { from: undefined })).css
    expect(out).toContain(':root:where([data-theme="dark"]) :where([data-plex-layout="phone"])')
    // No built style sheet asks for an element above the root
    for (const file of ["styles/touch.css", "styles/mobile-surfaces.css", "styles/mobile-materials.css"]) {
      const built = readFileSync(`${process.cwd()}/packages/styles/dist/es/${file}`, "utf8")
      expect(built).not.toMatch(/:where\(\[data-theme="dark"\]\) (?::root|html)/)
    }
  })

  test("the built Dialog style sheet carries the phone scope", () => {
    const built = readFileSync(`${process.cwd()}/packages/styles/dist/es/components/Dialog/Dialog.module.css`, "utf8")
    expect(built).toContain(':where([data-plex-layout="phone"]) .Content[data-mobile-variant="sheet"]')
  })
})

// A Vue component that reads its own phone layout, for the composable
describe("PhoneLayout", () => {
  test("renders the same box in React and Vue", async () => {
    await act(async () => {
      render(<ReactPhoneLayout id="phone" style={{ height: 600 }}>Inside</ReactPhoneLayout>)
    })
    const react = serializeDom()
    cleanup()
    mountVue(() => h(defineComponent({ render: () => h(PhoneLayout, { id: "phone", style: { height: "600px" } }, { default: () => "Inside" }) })))
    await flushVue()
    expect(serializeDom()).toBe(react)
    expect(react).toContain('data-plex-layout="phone"')
  })
})
