import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import type { ReactNode } from "react"
import { renderToString as renderReactToString } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"
import { createSSRApp, defineComponent, h, reactive, renderSlot } from "vue"
import { renderToString as renderVueToString } from "vue/server-renderer"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Tooltip as ReactTooltip } from "../../packages/ui/src/components/Tooltip"
import { Button as VueButton } from "../../packages/vue/src/components/Button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHeaderAction,
  DialogTitle,
  DialogTrigger,
} from "../../packages/vue/src/components/Dialog"
import { Tooltip } from "../../packages/vue/src/components/Tooltip"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

type ContentProps = {
  width?: number | string
  showClose?: boolean
  className?: string
  placement?: "center" | "top" | "bottom" | "start" | "end" | "fullscreen"
  mobilePlacement?: "center" | "bottom" | "fullscreen"
  mobileVariant?: "alert" | "sheet"
  surface?: "plain" | "grouped"
}

// Click handlers on the Trigger and Close children; preventDefault() in one
// must cancel the dialog action in both frameworks
type ClickHandler = (event: { preventDefault(): void }) => void
type ChildClicks = { onTriggerClick?: ClickHandler; onCloseClick?: ClickHandler }

const ReactExample = ({
  open,
  onOpenChange,
  content = {},
  onTriggerClick,
  onCloseClick,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  content?: ContentProps
} & ChildClicks) => (
  <ReactDialog open={open} onOpenChange={onOpenChange}>
    <ReactDialog.Trigger>
      <ReactButton color="primary" onClick={(event) => onTriggerClick?.(event)}>
        Open dialog
      </ReactButton>
    </ReactDialog.Trigger>
    <ReactDialog.Content {...content}>
      <ReactDialog.Header className="header">
        <ReactDialog.Title>Unsaved changes</ReactDialog.Title>
        <ReactDialog.Description>Save before leaving?</ReactDialog.Description>
      </ReactDialog.Header>
      <p>Body</p>
      <ReactDialog.Footer>
        <ReactDialog.Close>
          <ReactButton color="secondary" variant="soft" onClick={(event) => onCloseClick?.(event)}>
            Cancel
          </ReactButton>
        </ReactDialog.Close>
        <ReactButton color="primary">Save</ReactButton>
      </ReactDialog.Footer>
    </ReactDialog.Content>
  </ReactDialog>
)

const vueExample = (
  state: { open?: boolean; content?: ContentProps },
  onOpenChange?: (open: boolean) => void,
  { onTriggerClick, onCloseClick }: ChildClicks = {},
) => {
  const { className, ...content } = state.content ?? {}
  return h(
    Dialog,
    { "open": state.open, "onUpdate:open": onOpenChange },
    {
      default: () => [
        h(DialogTrigger, null, {
          default: () => h(VueButton, { onClick: (event: MouseEvent) => onTriggerClick?.(event) }, { default: () => "Open dialog" }),
        }),
        h(DialogContent, { ...content, class: className }, {
          default: () => [
            h(DialogHeader, { class: "header" }, {
              default: () => [
                h(DialogTitle, null, { default: () => "Unsaved changes" }),
                h(DialogDescription, null, { default: () => "Save before leaving?" }),
              ],
            }),
            h("p", null, "Body"),
            h(DialogFooter, null, {
              default: () => [
                h(DialogClose, null, {
                  default: () =>
                    h(
                      VueButton,
                      { color: "secondary", variant: "soft", onClick: (event: MouseEvent) => onCloseClick?.(event) },
                      { default: () => "Cancel" },
                    ),
                }),
                h(VueButton, null, { default: () => "Save" }),
              ],
            }),
          ],
        }),
      ],
    },
  )
}

const reactDom = async (props: { open?: boolean; content?: ContentProps }) => {
  await act(async () => {
    render(<ReactExample {...props} />)
  })
  const dom = serializeDom()
  cleanup()
  return dom
}

const vueDom = async (props: { open?: boolean; content?: ContentProps }) => {
  const { unmount } = mountVue(() => vueExample(props))
  await flushVue()
  const dom = serializeDom()
  unmount()
  return dom
}

const cases: Array<[string, { open?: boolean; content?: ContentProps }]> = [
  ["closed", {}],
  ["open", { open: true }],
  ["open, numeric width", { open: true, content: { width: 640 } }],
  ["open, string width", { open: true, content: { width: "40rem" } }],
  ["open, no close button", { open: true, content: { showClose: false } }],
  ["open, panel class", { open: true, content: { className: "custom" } }],
  ["open, placement top", { open: true, content: { placement: "top" } }],
  ["open, placement bottom", { open: true, content: { placement: "bottom" } }],
  ["open, placement start", { open: true, content: { placement: "start" } }],
  ["open, placement end", { open: true, content: { placement: "end", width: 400 } }],
  ["open, placement fullscreen", { open: true, content: { placement: "fullscreen" } }],
  ["open, centered with a bottom sheet on phones", { open: true, content: { mobilePlacement: "bottom" } }],
  ["open, side panel, full screen on phones", { open: true, content: { placement: "end", mobilePlacement: "fullscreen" } }],
  ["open, mobile alert", { open: true, content: { mobileVariant: "alert" } }],
  ["open, mobile sheet", { open: true, content: { mobileVariant: "sheet" } }],
  ["open, mobile sheet without close", { open: true, content: { mobileVariant: "sheet", showClose: false } }],
  ["open, mobile fullscreen sheet", { open: true, content: { mobileVariant: "sheet", mobilePlacement: "fullscreen" } }],
  ["open, explicit center", { open: true, content: { placement: "center" } }],
]

// A press this soon after opening is the second click of a double click: the dialog ignores it
const pastDoubleClick = () => new Promise((resolve) => setTimeout(resolve, 320))

describe("Dialog parity", () => {
  test.each(["React", "Vue"])("%s: sheet bar measurements follow conditional and replaced slots", async (framework) => {
    // jsdom has no layout or ResizeObserver. Supply geometry, then drive the same
    // size notifications a browser emits when a bar's contents wrap or expand.
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("measured-header")) return this.classList.contains("expanded") ? 118 : 70
      if (this.classList.contains("measured-footer")) return this.classList.contains("expanded") ? 144 : 90
      return 0
    })
    const observers: BarResizeObserver[] = []
    class BarResizeObserver implements ResizeObserver {
      readonly targets = new Map<Element, ResizeObserverOptions | undefined>()
      constructor(private readonly callback: ResizeObserverCallback) { observers.push(this) }
      observe(target: Element, options?: ResizeObserverOptions) { this.targets.set(target, options) }
      unobserve(target: Element) { this.targets.delete(target) }
      disconnect() { this.targets.clear() }
      notify() { this.callback([], this) }
    }
    vi.stubGlobal("ResizeObserver", BarResizeObserver)
    const state = reactive({ header: true, headerVersion: 0, footer: false, expanded: false })
    const reactTree = () => (
      <ReactDialog open>
        <ReactDialog.Content mobileVariant="sheet" showClose={false}>
          {state.header && <ReactDialog.Header key={state.headerVersion} className={`measured-header ${state.headerVersion ? "expanded" : ""}`}>Settings</ReactDialog.Header>}
          <ReactDialog.Body><ReactDialog.Title>Settings</ReactDialog.Title><ReactDialog.Description>Update your preferences.</ReactDialog.Description></ReactDialog.Body>
          {state.footer && <ReactDialog.Footer className={`measured-footer ${state.expanded ? "expanded" : ""}`}><button>Save</button></ReactDialog.Footer>}
        </ReactDialog.Content>
      </ReactDialog>
    )
    const vueTree = () => h(Dialog, { open: true }, () => h(DialogContent, { mobileVariant: "sheet", showClose: false }, () => [
      state.header && h(DialogHeader, { key: state.headerVersion, class: `measured-header ${state.headerVersion ? "expanded" : ""}` }, () => "Settings"),
      h(DialogBody, null, () => [h(DialogTitle, null, () => "Settings"), h(DialogDescription, null, () => "Update your preferences.")]),
      state.footer && h(DialogFooter, { class: `measured-footer ${state.expanded ? "expanded" : ""}` }, () => h("button", "Save")),
    ]))
    let rerender = () => {}
    let unmount = () => {}
    try {
      if (framework === "React") {
        const view = render(reactTree())
        rerender = () => view.rerender(reactTree())
        unmount = view.unmount
      } else {
        unmount = mountVue(vueTree).unmount
      }
      const update = async (patch: Partial<typeof state>) => {
        await act(async () => { Object.assign(state, patch); rerender(); await flushVue() })
      }
      await update({})
      const panel = document.querySelector<HTMLElement>(".Panel")
      expect(panel).not.toBeNull()
      const heights = () => [panel?.style.getPropertyValue("--dialog-header-height"), panel?.style.getPropertyValue("--dialog-footer-height")]
      expect(heights()).toEqual(["70px", "0px"])
      const expectBorderBoxes = () => {
        const options = observers.flatMap((observer) => Array.from(observer.targets.values()))
        expect(options.length).toBeGreaterThan(0)
        expect(options.every((option) => option?.box === "border-box")).toBe(true)
      }
      expectBorderBoxes()

      await update({ footer: true })
      expect(heights()).toEqual(["70px", "90px"])
      const previousHeader = panel?.querySelector(".Header")
      await update({ headerVersion: 1 })
      expect(panel?.querySelector(".Header")).not.toBe(previousHeader)
      expect(heights()).toEqual(["118px", "90px"])
      expectBorderBoxes()

      await update({ expanded: true })
      const footer = panel?.querySelector(".Footer")
      const watchingFooter = observers.filter((observer) => footer && observer.targets.has(footer))
      expect(watchingFooter.length).toBeGreaterThan(0)
      await act(async () => { watchingFooter.forEach((observer) => observer.notify()); await flushVue() })
      expect(heights()).toEqual(["118px", "144px"])

      await update({ header: false, footer: false })
      expect(heights()).toEqual(["0px", "0px"])
      expect(watchingFooter.every((observer) => observer.targets.size === 0)).toBe(true)
    } finally {
      unmount()
      vi.unstubAllGlobals()
    }
  })

  test.each(["soft", "hard", "glass", "solid"] as const)("%s bar surfaces have identical React and Vue markup", async (background) => {
    render(<div><ReactDialog.Header background={background}>Title</ReactDialog.Header><ReactDialog.Footer background={background}>Actions</ReactDialog.Footer></div>)
    const react = serializeDom()
    cleanup()
    const { unmount } = mountVue(() => h("div", [h(DialogHeader, { background }, () => "Title"), h(DialogFooter, { background }, () => "Actions")]))
    await flushVue()
    expect(document.querySelector(".Header")?.getAttribute("data-background")).toBe(background)
    expect(document.querySelector(".Footer")?.getAttribute("data-background")).toBe(background)
    expect(serializeDom()).toBe(react)
    unmount()
  })

  test("header action slot preserves its child in both frameworks", async () => {
    render(<ReactDialog.HeaderAction><ReactButton color="secondary" variant="soft" uniform aria-label="More actions">More</ReactButton></ReactDialog.HeaderAction>)
    const react = serializeDom()
    cleanup()
    const { unmount } = mountVue(() => h(DialogHeaderAction, null, () => h(VueButton, { color: "secondary", variant: "soft", uniform: true, "aria-label": "More actions" }, () => "More")))
    await flushVue()
    expect(serializeDom()).toBe(react)
    unmount()
  })

  test.each(["inline", "stacked"] as const)("footer %s layout has identical React and Vue markup", async (mobileLayout) => {
    render(<ReactDialog.Footer mobileLayout={mobileLayout}>Actions</ReactDialog.Footer>)
    const react = serializeDom()
    cleanup()
    const { unmount } = mountVue(() => h(DialogFooter, { mobileLayout }, () => "Actions"))
    await flushVue()
    expect(serializeDom()).toBe(react)
    expect(serializeDom()).toContain(`data-mobile-layout="${mobileLayout}"`)
    unmount()
  })

  test.each(cases)("%s", async (_name, props) => {
    const react = await reactDom(props)
    const vue = await vueDom(props)
    expect(vue).toBe(react)
  })

  test.each([undefined, "plain", "grouped"] as const)("surface %s reaches the content without changing presentation", async (surface) => {
    const props = { open: true, content: { surface, mobileVariant: "sheet" as const } }
    const react = await reactDom(props)
    const vue = await vueDom(props)
    expect(vue).toBe(react)
    expect(react).toContain(`data-surface="${surface ?? "plain"}"`)
    expect(react).toContain('data-mobile-variant="sheet"')
    expect(react).not.toContain(" surface=")
  })

  test.each(["alert", "sheet"] as const)("%s selects its mobile presentation independently of desktop placement", async (mobileVariant) => {
    const props = { open: true, content: { mobileVariant, placement: "end" as const } }
    for (const dom of [await reactDom(props), await vueDom(props)]) {
      expect(dom).toContain(`data-mobile-variant="${mobileVariant}"`)
      expect(dom).toContain(`data-mobile-placement="${mobileVariant === "alert" ? "center" : "bottom"}"`)
      expect(dom).toContain('data-placement="end"')
    }
  })

  test("open renders the panel, labelled by its title and described by its description", async () => {
    for (const dom of [await reactDom({ open: true }), await vueDom({ open: true })]) {
      expect(dom).toContain('role="dialog"')
      expect(dom).toContain('aria-label="Close dialog"')
      expect(dom).toContain("--dialog-width: 480px")
      const titleId = dom.match(/<h2 class="Title" id="(gen-\d+)">/)?.[1]
      const descriptionId = dom.match(/<p class="Description" id="(gen-\d+)">/)?.[1]
      expect(titleId).toBeDefined()
      expect(descriptionId).toBeDefined()
      expect(dom).toContain(`aria-labelledby="${titleId}"`)
      expect(dom).toContain(`aria-describedby="${descriptionId}"`)
      expect(dom).not.toContain("[missing]")
    }
  })
})

describe("Dialog behaviour parity", () => {
  // Runs the same interaction on both and returns DOM snapshots plus the
  // open-state changes the dialog reported.
  const walk = async (
    interact: (step: (name: string) => Promise<void>) => Promise<void>,
    clicks: ChildClicks = {},
  ): Promise<{ react: string[]; vue: string[]; reactChanges: boolean[]; vueChanges: boolean[] }> => {
    const reactChanges: boolean[] = []
    const react: string[] = []
    await act(async () => {
      render(<ReactExample onOpenChange={(open) => reactChanges.push(open)} {...clicks} />)
    })
    await interact(async () => {
      react.push(serializeDom())
    })
    cleanup()

    const vueChanges: boolean[] = []
    const vue: string[] = []
    const state = reactive({})
    mountVue(() => vueExample(state, (open) => vueChanges.push(open), clicks))
    await flushVue()
    await interact(async () => {
      await flushVue()
      vue.push(serializeDom())
    })

    return { react, vue, reactChanges, vueChanges }
  }

  const click = async (selector: string) => {
    await act(async () => {
      fireEvent.click(document.querySelector(selector)!)
    })
    await flushVue()
  }

  const pressEscape = async () => {
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape", code: "Escape" })
    })
    await flushVue()
  }

  test("trigger opens, close button closes", async () => {
    const result = await walk(async (snapshot) => {
      await click('button[aria-haspopup="dialog"]')
      await snapshot("open")
      await click('button[aria-label="Close dialog"]')
      await snapshot("closed")
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([true, false])
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("Dialog.Close child closes", async () => {
    const result = await walk(async (snapshot) => {
      await click('button[aria-haspopup="dialog"]')
      await click('[class~="Footer"] button')
      await snapshot("closed")
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([true, false])
  })

  test("preventDefault in the trigger child's click keeps it closed", async () => {
    const result = await walk(
      async (snapshot) => {
        await click('button[aria-haspopup="dialog"]')
        await snapshot("still closed")
      },
      { onTriggerClick: (event) => event.preventDefault() },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.reactChanges).toEqual([])
    expect(result.vueChanges).toEqual([])
    expect(result.react[0]).not.toContain('role="dialog"')
  })

  test("preventDefault in the close child's click keeps it open", async () => {
    const result = await walk(
      async (snapshot) => {
        await click('button[aria-haspopup="dialog"]')
        await click('[class~="Footer"] button')
        await snapshot("still open")
      },
      { onCloseClick: (event) => event.preventDefault() },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.reactChanges).toEqual([true])
    expect(result.vueChanges).toEqual([true])
    expect(result.react[0]).toContain('role="dialog"')
  })

  test("Escape closes", async () => {
    const result = await walk(async (snapshot) => {
      await click('button[aria-haspopup="dialog"]')
      await pressEscape()
      await snapshot("closed")
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([true, false])
    expect(result.react[0]).not.toContain('role="dialog"')
  })
})

// ---------------------------------------------------------------------------
// Review fixes and radix-ui 1.8 (G6a)

describe("Dialog parity, radix-ui 1.8", () => {
  // Radix registers its outside-press listener a task after the layer mounts
  const nextTask = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

  const fire = async (target: () => Element | null, event: keyof typeof fireEvent, init?: object) => {
    await act(async () => {
      ;(fireEvent[event] as (element: Element, init?: object) => boolean)(target()!, init)
    })
    await flushVue()
  }

  const overlay = () => document.querySelector('[class~="Overlay"]')
  const dialogOpen = () => !!document.querySelector('[role="dialog"]')

  test("without Title and Description the content is not labelled or described", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {})
    await act(async () => {
      render(
        <ReactDialog open>
          <ReactDialog.Content>
            <p>Body</p>
          </ReactDialog.Content>
        </ReactDialog>,
      )
    })
    const react = serializeDom()
    cleanup()
    const { unmount } = mountVue(() =>
      h(Dialog, { open: true }, { default: () => h(DialogContent, null, { default: () => h("p", null, "Body") }) }),
    )
    await flushVue()
    const vue = serializeDom()
    unmount()
    expect(vue).toBe(react)
    expect(react).toContain('role="dialog"')
    expect(react).not.toContain("aria-labelledby")
    expect(react).not.toContain("aria-describedby")
    expect(errors).not.toHaveBeenCalled()
    expect(warnings.mock.calls.map((args) => args.map(String).join(" "))).toEqual([
      expect.stringContaining("`DialogContent` requires a `DialogTitle`"),
    ])
  })

  // Presses on the overlay, outside the content: the primary button closes on
  // the click that follows; Ctrl+click and the secondary button never close
  test.each([
    ["primary button: open after pointerdown, closed after the click", {}, [true, false]],
    ["Ctrl+click keeps it open", { ctrlKey: true }, [true, true]],
    ["secondary button keeps it open", { button: 2 }, [true, true]],
  ] as const)("overlay press, %s", async (_name, init, expected) => {
    const run = async () => {
      const states: boolean[] = []
      await fire(() => document.querySelector('button[aria-haspopup="dialog"]'), "click")
      await nextTask()
      await pastDoubleClick()
      await fire(overlay, "pointerDown", { pointerType: "mouse", ...init })
      states.push(dialogOpen())
      await fire(overlay, "pointerUp", { pointerType: "mouse", ...init })
      await fire(overlay, "click", init)
      await nextTask()
      await flushVue()
      states.push(dialogOpen())
      return { states, dom: serializeDom() }
    }
    const reactChanges: boolean[] = []
    await act(async () => {
      render(<ReactExample onOpenChange={(open) => reactChanges.push(open)} />)
    })
    const react = await run()
    cleanup()
    const vueChanges: boolean[] = []
    const { unmount } = mountVue(() => vueExample({}, (open) => vueChanges.push(open)))
    await flushVue()
    const vue = await run()
    unmount()
    expect(vue).toEqual(react)
    expect(vueChanges).toEqual(reactChanges)
    expect(react.states).toEqual(expected)
  })

  test("the second click of a double click, on the overlay, keeps the dialog open", async () => {
    const run = async () => {
      await fire(() => document.querySelector('button[aria-haspopup="dialog"]'), "click")
      await nextTask()
      await fire(overlay, "pointerDown", { pointerType: "mouse" })
      await fire(overlay, "pointerUp", { pointerType: "mouse" })
      await fire(overlay, "click")
      await nextTask()
      await flushVue()
      return dialogOpen()
    }
    await act(async () => {
      render(<ReactExample />)
    })
    const react = await run()
    cleanup()
    const { unmount } = mountVue(() => vueExample({}))
    await flushVue()
    const vue = await run()
    unmount()
    expect(vue).toBe(react)
    expect(react).toBe(true)
  })

  test("the overlay is the dialog's own dismiss surface: a click stopped above it still closes", async () => {
    const run = async () => {
      await fire(() => document.querySelector('button[aria-haspopup="dialog"]'), "click")
      await nextTask()
      await pastDoubleClick()
      // Something between the overlay and the document stops the click
      document.querySelector('[class~="Transition"]')!.addEventListener("click", (event) => event.stopPropagation())
      await fire(overlay, "pointerDown", { pointerType: "mouse" })
      await fire(overlay, "click")
      await nextTask()
      await flushVue()
      return dialogOpen()
    }
    await act(async () => {
      render(<ReactExample />)
    })
    const react = await run()
    cleanup()
    const { unmount } = mountVue(() => vueExample({}))
    await flushVue()
    const vue = await run()
    unmount()
    expect(vue).toBe(react)
    expect(react).toBe(false)
  })

  test("Escape closes the dialog before a forced-open Tooltip outside it", async () => {
    const run = async () => {
      await fire(() => document.querySelector('button[aria-haspopup="dialog"]'), "click")
      await fire(() => document.activeElement ?? document.body, "keyDown", { key: "Escape", code: "Escape" })
      return serializeDom()
    }
    const reactChanges: boolean[] = []
    await act(async () => {
      render(
        <>
          <ReactTooltip content="Tip" forceOpen>
            <button className="tip-trigger">Help</button>
          </ReactTooltip>
          <ReactExample onOpenChange={(open) => reactChanges.push(open)} />
        </>,
      )
    })
    const react = await run()
    cleanup()
    const vueChanges: boolean[] = []
    const { unmount } = mountVue(() =>
      h("div", [
        h(Tooltip, { content: "Tip", forceOpen: true }, { default: () => h("button", { class: "tip-trigger" }, "Help") }),
        vueExample({}, (open) => vueChanges.push(open)),
      ]),
    )
    await flushVue()
    const vue = await run()
    unmount()
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([true, false])
    expect(vue).not.toContain('role="dialog"')
    expect(react).not.toContain('role="dialog"')
  })

  test("Trigger and Close children passed through a forwarded slot", async () => {
    const ReactOpen = ({ children }: { children: ReactNode }) => <ReactDialog.Trigger>{children}</ReactDialog.Trigger>
    const ReactCancel = ({ children }: { children: ReactNode }) => <ReactDialog.Close>{children}</ReactDialog.Close>
    // `<DialogTrigger><slot /></DialogTrigger>` in a template
    const VueOpen = defineComponent((_props, { slots }) => () => h(DialogTrigger, null, { default: () => [renderSlot(slots, "default")] }))
    const VueCancel = defineComponent((_props, { slots }) => () => h(DialogClose, null, { default: () => [renderSlot(slots, "default")] }))

    const run = async () => {
      const dom = [serializeDom()]
      await fire(() => document.querySelector(".open"), "click")
      dom.push(serializeDom())
      await fire(() => document.querySelector(".cancel"), "click")
      dom.push(serializeDom())
      return dom
    }
    await act(async () => {
      render(
        <ReactDialog>
          <ReactOpen>
            <button className="open">Open</button>
          </ReactOpen>
          <ReactDialog.Content showClose={false}>
            <ReactDialog.Title>Title</ReactDialog.Title>
            <ReactCancel>
              <button className="cancel">Cancel</button>
            </ReactCancel>
          </ReactDialog.Content>
        </ReactDialog>,
      )
    })
    const react = await run()
    cleanup()
    const { unmount } = mountVue(() =>
      h(Dialog, null, {
        default: () => [
          h(VueOpen, null, { default: () => h("button", { class: "open" }, "Open") }),
          h(DialogContent, { showClose: false }, {
            default: () => [
              h(DialogTitle, null, { default: () => "Title" }),
              h(VueCancel, null, { default: () => h("button", { class: "cancel" }, "Cancel") }),
            ],
          }),
        ],
      }),
    )
    await flushVue()
    const vue = await run()
    unmount()
    expect(vue).toEqual(react)
    expect(react[0]).toContain('<button aria-expanded="false" aria-haspopup="dialog" class="open" data-state="closed" type="button">')
    expect(react[1]).toContain('role="dialog"')
    expect(react[2]).not.toContain('role="dialog"')
  })

  test("server rendering a closed or open dialog emits no portal content", async () => {
    for (const open of [false, true]) {
      const react = renderReactToString(<ReactExample open={open} />)
      const context: { teleports?: Record<string, string> } = {}
      const vue = await renderVueToString(createSSRApp({ render: () => vueExample({ open }) }), context)
      expect(react).not.toContain("Transition")
      expect(vue).not.toContain("Transition")
      expect(context.teleports?.body ?? "").toBe("")
    }
  })

  test("presses around the panel reach the overlay (the positioning layer lets them through)", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Dialog/Dialog.module.css`, "utf8")
    const rule = (selector: string) => css.match(new RegExp(`\\n\\${selector} \\{([^}]*)`))?.[1] ?? ""
    // !important beats the dismissable layer's inline pointer-events
    expect(rule(".Content")).toContain("pointer-events: none !important;")
    expect(rule(".Panel")).toContain("pointer-events: auto;")
  })

  test("a phone Alert follows the iOS 27 alert (kit iOS 27, Alerts 65:57149; plan 163)", () => {
    const root = `${process.cwd()}/packages/styles/src`
    const css = readFileSync(`${root}/components/Dialog/Dialog.module.css`, "utf8")
    const rule = (selector: string) => css.slice(css.indexOf(`${selector} {`)).match(/\{([^}]*)\}/)?.[1] ?? ""
    const alert = '.Content[data-mobile-variant="alert"]'
    // glass, fields and actions 14 from the edge, text at 22, title and message 17/22 in the primary label 10 apart,
    // 24 from the text to a control, 52px field rows 19 above the actions, 8 between actions
    expect(rule(`${alert} .Panel`)).toContain("background: var(--dialog-alert-background, var(--dialog-panel-background, var(--color-surface-elevated)));")
    expect(rule(`${alert} .Panel`)).toContain("backdrop-filter: var(--dialog-alert-backdrop-filter, none);")
    expect(rule(`${alert} .Header`)).toContain("padding: var(--dialog-alert-header-padding, 8px 8px 14px);")
    expect(rule(`${alert} .Description`)).toContain("font-size: var(--dialog-alert-message-size, 17px);")
    expect(rule(`${alert} .Description`)).toContain("line-height: var(--dialog-alert-message-leading, 22px);")
    expect(rule(`${alert} .Description`)).toContain("color: var(--dialog-alert-message-color, var(--color-text));")
    expect(rule(`${alert} .Body`)).toContain("--control-size-3xl: var(--dialog-alert-field-height, 52px);")
    expect(rule(`${alert} .Footer:not([data-mobile-layout="stacked"])`)).toContain("column-gap: var(--dialog-alert-action-gap, 8px);")
    expect(readFileSync(`${root}/styles/variables-components.css`, "utf8")).toContain("--dialog-alert-padding: 14px;")
    const touch = readFileSync(`${root}/styles/touch.css`, "utf8")
    expect(touch.slice(touch.indexOf("@media (min-width: 414px) and (max-width: 767px)"))).toMatch(/^[^}]*--dialog-alert-width: 320px;/)
    const materials = readFileSync(`${root}/styles/mobile-materials.css`, "utf8")
    expect(materials).toContain("--dialog-alert-background: var(--mobile-glass-background);")
    expect(materials).toContain("--dialog-alert-message-color: var(--color-text);")
    expect(materials).toContain("--dialog-alert-fill: var(--alpha-12);")
    expect(rule(`${alert} .Footer > :where(button, a, [role="link"])`)).toContain("--button-font-weight: var(--dialog-alert-action-font-weight, 600);")
    expect(rule(`${alert} .Footer > [data-variant="soft"]:where([data-color="primary"], [data-color="secondary"])`)).toContain("--button-background-color: var(--dialog-alert-fill, var(--color-background-primary-soft-alpha));")
    expect(css).toContain(`${alert} .Body {\n    --input-soft-background-color: var(--dialog-alert-fill, var(--color-background-primary-soft-alpha));`)
    // A destructive action keeps the fill of the others with a red label; the message is plain text
    expect(rule(`${alert} .Footer > [data-color="danger"]:where([data-variant="solid"], [data-variant="soft"])`)).toContain("--button-text-color: var(--color-text-danger);")
    expect(rule(`${alert} .Description *`)).toContain("font: inherit;")
    expect(rule(`${alert} .Description *`)).not.toContain("color:")
    // A link keeps its color and underline (WCAG 1.4.1); everything else takes the message's color
    expect(rule(`${alert} .Description *:not(a, a *)`)).toContain("color: inherit;")
    expect(rule(`${alert} .Description *:not(a, a *)`)).toContain("text-decoration: none;")
  })

  test.each(["React", "Vue"])("%s: a phone Sheet and Alert dim with the mobile scrim; other phone dialogs keep the shared dim", async (framework) => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Dialog/Dialog.module.css`, "utf8")
    expect(css).toMatch(/\.Overlay:has\(\+ \.Content:is\(\[data-mobile-variant="sheet"\], \[data-mobile-variant="alert"\]\)\) \{\s*background: var\(--dialog-mobile-scrim\);/)
    const tokens = readFileSync(`${process.cwd()}/packages/styles/src/styles/variables-components.css`, "utf8")
    expect(tokens).toContain("--dialog-mobile-scrim: light-dark(rgb(0 0 0 / 20%), rgb(0 0 0 / 50%));")
    // The selector needs the overlay right before its content in both frameworks
    for (const mobileVariant of ["sheet", "alert"] as const) {
      let unmount = () => {}
      if (framework === "React") {
        await act(async () => { render(<ReactExample open content={{ mobileVariant }} />) })
        unmount = cleanup
      } else {
        unmount = mountVue(() => vueExample({ open: true, content: { mobileVariant } })).unmount
        await flushVue()
      }
      const overlay = document.querySelector('[class~="Overlay"]')
      expect(overlay?.nextElementSibling?.getAttribute("data-mobile-variant")).toBe(mobileVariant)
      unmount()
    }
  })
})

describe("Dialog body and focus hooks", () => {
  test("Dialog.Body renders the scrolling part between header and footer", async () => {
    await act(async () => {
      render(
        <ReactDialog open>
          <ReactDialog.Content placement="end">
            <ReactDialog.Header>
              <ReactDialog.Title>Filters</ReactDialog.Title>
            </ReactDialog.Header>
            <ReactDialog.Body className="filters">
              <p>Status</p>
            </ReactDialog.Body>
            <ReactDialog.Footer>
              <ReactButton color="primary">Done</ReactButton>
            </ReactDialog.Footer>
          </ReactDialog.Content>
        </ReactDialog>,
      )
    })
    const react = serializeDom()
    cleanup()

    const { unmount } = mountVue(() =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, { placement: "end" }, () => [
          h(DialogHeader, null, () => h(DialogTitle, null, () => "Filters")),
          h(DialogBody, { class: "filters" }, () => h("p", null, "Status")),
          h(DialogFooter, null, () => h(VueButton, { color: "primary" }, () => "Done")),
        ]),
      ),
    )
    await flushVue()
    const vue = serializeDom()
    unmount()

    expect(vue).toBe(react)
    expect(react).toContain('class="Body filters"')
    expect(react).toContain('data-placement="end"')
  })

  test("onOpenAutoFocus runs on open and can keep the focus on the dialog", async () => {
    const reactOpen = vi.fn((event: Event) => event.preventDefault())
    await act(async () => {
      render(
        <ReactDialog open>
          <ReactDialog.Content onOpenAutoFocus={reactOpen}>
            <ReactDialog.Title>Name</ReactDialog.Title>
            <input aria-label="Name" />
          </ReactDialog.Content>
        </ReactDialog>,
      )
    })
    const reactFocusedInput = document.activeElement?.tagName === "INPUT"
    cleanup()

    const vueOpen = vi.fn((event: Event) => event.preventDefault())
    const { unmount } = mountVue(() =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, { onOpenAutoFocus: vueOpen }, () => [h(DialogTitle, null, () => "Name"), h("input", { "aria-label": "Name" })]),
      ),
    )
    await flushVue()
    const vueFocusedInput = document.activeElement?.tagName === "INPUT"
    unmount()

    expect(reactOpen).toHaveBeenCalledTimes(1)
    expect(vueOpen).toHaveBeenCalledTimes(1)
    expect(reactFocusedInput).toBe(false)
    expect(vueFocusedInput).toBe(false)
  })
})
