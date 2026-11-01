import { act, fireEvent } from "@testing-library/react"
import { createElement, type ReactElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, type VNode } from "vue"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Menu as ReactMenu } from "../../packages/ui/src/components/Menu"
import { Popover as ReactPopover } from "../../packages/ui/src/components/Popover"
import { Select as ReactSelect } from "../../packages/ui/src/components/Select"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../../packages/vue/src/components/Dialog"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../packages/vue/src/components/Menu"
import { Popover, PopoverContent, PopoverTrigger } from "../../packages/vue/src/components/Popover"
import { Select } from "../../packages/vue/src/components/Select"
import { animation, flushVue } from "./harness"
import { walkPairWithState } from "./pair"

// Overlays with animations on, as in a browser: the content stays through its
// exit, inert, and focus and unmounting wait for it. jsdom runs the timers and
// the attributes; whether a browser honours `inert` is checked by hand.

type State = { open: boolean; sheet?: boolean }

// Popper's variable names and `dir` differ by design; Radix also keeps the
// page aria-hidden until a dialog unmounts, where Reka releases it on close
const comparable = (snapshots: string[]) =>
  snapshots.map((dom) =>
    dom
      .replace(/ style="[^"]*"/g, "")
      .replace(/ dir="ltr"/g, "")
      .replace(/ (data-)?aria-hidden="true"/g, ""),
  )

const trigger = () => document.querySelector<HTMLElement>("#trigger")!
const panel = () => document.querySelector<HTMLElement>("[data-panel]")
const exiting = () => document.querySelector<HTMLElement>("[data-exiting]")

const overlays: Array<[string, (state: State) => ReactElement, (state: State) => VNode]> = [
  [
    "Dialog",
    ({ open, sheet }) => (
      <ReactDialog open={open}>
        <ReactDialog.Trigger>
          <button id="trigger">Open</button>
        </ReactDialog.Trigger>
        <ReactDialog.Content mobilePlacement={sheet ? "bottom" : undefined}>
          <ReactDialog.Title>Title</ReactDialog.Title>
          <button data-panel="">Inside</button>
        </ReactDialog.Content>
      </ReactDialog>
    ),
    ({ open, sheet }) =>
      h(Dialog, { open }, {
        default: () => [
          h(DialogTrigger, null, { default: () => [h("button", { id: "trigger" }, "Open")] }),
          h(DialogContent, { mobilePlacement: sheet ? "bottom" : undefined }, {
            default: () => [
              h(DialogTitle, null, { default: () => "Title" }),
              h("button", { "data-panel": "" }, "Inside"),
            ],
          }),
        ],
      }),
  ],
  [
    "Popover",
    ({ open }) => (
      <ReactPopover open={open}>
        <ReactPopover.Trigger>
          <button id="trigger">Open</button>
        </ReactPopover.Trigger>
        <ReactPopover.Content>
          <button data-panel="">Inside</button>
        </ReactPopover.Content>
      </ReactPopover>
    ),
    ({ open }) =>
      h(Popover, { open }, {
        default: () => [
          h(PopoverTrigger, null, { default: () => [h("button", { id: "trigger" }, "Open")] }),
          h(PopoverContent, null, { default: () => [h("button", { "data-panel": "" }, "Inside")] }),
        ],
      }),
  ],
  [
    "Menu",
    ({ open }) => (
      <ReactMenu forceOpen={open}>
        <ReactMenu.Trigger>
          <button id="trigger">Open</button>
        </ReactMenu.Trigger>
        <ReactMenu.Content>
          <div data-panel="">
            <ReactMenu.Item>Item</ReactMenu.Item>
          </div>
        </ReactMenu.Content>
      </ReactMenu>
    ),
    ({ open }) =>
      h(Menu, { forceOpen: open }, {
        default: () => [
          h(MenuTrigger, null, { default: () => [h("button", { id: "trigger" }, "Open")] }),
          h(MenuContent, null, {
            default: () => [h("div", { "data-panel": "" }, [h(MenuItem, null, { default: () => "Item" })])],
          }),
        ],
      }),
  ],
]

const opened = async ({ set, advance }: { set: (patch: Partial<State>) => Promise<void>; advance: (ms: number) => Promise<void> }) => {
  await set({ open: true })
  await advance(400)
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {}
})

const walk = (
  reactApp: (state: State) => ReactElement,
  vueApp: (state: State) => VNode,
  steps: Parameters<typeof walkPairWithState<State>>[3],
) => {
  animation.disabled = false
  return walkPairWithState<State>({ open: false }, reactApp, vueApp, steps)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe.each(overlays)("%s exit", (name, reactApp, vueApp) => {
  test("stays through the exit, inert, then leaves", async () => {
    const seen: Array<Record<string, unknown>> = []
    const { react, vue } = await walk(reactApp, vueApp, async (tools) => {
      const look = () =>
        seen.push({ panel: !!panel(), exiting: !!exiting(), inert: exiting()?.hasAttribute("inert") ?? false })

      await tools.set({ open: true })
      tools.snapshot()
      await tools.advance(32)
      tools.snapshot()
      await tools.advance(400)
      tools.snapshot()
      await tools.set({ open: false })
      tools.snapshot()
      look()
      await tools.advance(32)
      tools.snapshot()
      look()
      await tools.advance(400)
      tools.snapshot()
      look()
    })

    expect(comparable(vue)).toEqual(comparable(react))
    expect(react[0]).toContain("data-entering")
    expect(react[1]).toContain("data-entering-active")
    expect(react[3]).toContain('inert=""')
    expect(react[4]).toContain("data-exiting-active")
    expect(react[5]).not.toContain("Inside")
    const during = { panel: true, exiting: true, inert: true }
    const after = { panel: false, exiting: false, inert: false }
    expect(seen).toEqual([during, during, after, during, during, after])
  })

  test("focus returns to the trigger after the exit, not before", async () => {
    const seen: boolean[] = []
    await walk(reactApp, vueApp, async (tools) => {
      trigger().focus()
      await opened(tools)
      await tools.set({ open: false })
      await tools.advance(100)
      seen.push(document.activeElement === trigger())
      await tools.advance(400)
      await tools.advance(1)
      seen.push(document.activeElement === trigger())
    })
    expect(seen).toEqual([false, true, false, true])
  })

  test("focus moved elsewhere during the exit stays there", async () => {
    const outside = document.createElement("button")
    document.body.appendChild(outside)
    const seen: boolean[] = []
    await walk(reactApp, vueApp, async (tools) => {
      trigger().focus()
      await opened(tools)
      await tools.set({ open: false })
      outside.focus()
      await tools.advance(400)
      await tools.advance(1)
      seen.push(document.activeElement === outside)
      trigger().focus()
    })
    outside.remove()
    expect(seen).toEqual([true, true])
  })

  test("reopened during the exit it turns around in place", async () => {
    const seen: boolean[] = []
    const { react, vue } = await walk(reactApp, vueApp, async (tools) => {
      await opened(tools)
      const element = panel()
      await tools.set({ open: false })
      await tools.advance(50)
      await tools.set({ open: true })
      tools.snapshot()
      seen.push(panel() === element)
      await tools.advance(400)
      tools.snapshot()
      seen.push(panel() === element, !!exiting())
    })
    expect(comparable(vue)).toEqual(comparable(react))
    expect(react[0]).toContain("data-interrupted")
    expect(react[0]).not.toContain("inert")
    expect(seen).toEqual([true, true, false, true, true, false])
  })

  test("with reduced motion it leaves on the next frame", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }))
    const seen: boolean[] = []
    await walk(reactApp, vueApp, async (tools) => {
      await opened(tools)
      await tools.set({ open: false })
      await tools.advance(32)
      await tools.advance(1)
      seen.push(!!panel())
    })
    expect(seen).toEqual([false, false])
  })

  test(`${name}: animations off still removes it at once`, async () => {
    animation.disabled = true
    const seen: boolean[] = []
    await walkPairWithState<State>({ open: false }, reactApp, vueApp, async (tools) => {
      await tools.set({ open: true })
      await tools.advance(1)
      seen.push(!!panel())
      await tools.set({ open: false })
      seen.push(!!panel())
      await tools.advance(10)
    })
    expect(seen).toEqual([true, false, true, false])
  })
})

describe("a press on the trigger during the exit", () => {
  const press = async (element: Element) => {
    vi.setSystemTime(Date.now() + 1)
    await act(async () => {
      fireEvent.pointerDown(element, { button: 0, pointerType: "mouse" })
    })
    await flushVue()
    vi.setSystemTime(Date.now() + 1)
    await act(async () => {
      fireEvent.pointerUp(element, { button: 0, pointerType: "mouse" })
      fireEvent.click(element, { button: 0 })
    })
    await flushVue()
  }

  const [, reactDialog, vueDialog] = overlays[0]!
  const reactMenu = () => (
    <ReactMenu>
      <ReactMenu.Trigger>
        <button id="trigger">Open</button>
      </ReactMenu.Trigger>
      <ReactMenu.Content>
        <div data-panel="">
          <ReactMenu.Item>Item</ReactMenu.Item>
        </div>
      </ReactMenu.Content>
    </ReactMenu>
  )
  const vueMenu = () =>
    h(Menu, null, {
      default: () => [
        h(MenuTrigger, null, { default: () => [h("button", { id: "trigger" }, "Open")] }),
        h(MenuContent, null, {
          default: () => [h("div", { "data-panel": "" }, [h(MenuItem, null, { default: () => "Item" })])],
        }),
      ],
    })

  test("turns a Menu around", async () => {
    const seen: boolean[] = []
    await walk(reactMenu, vueMenu, async (tools) => {
      await press(trigger())
      await tools.advance(400)
      seen.push(!!panel())
      await press(trigger())
      await tools.advance(50)
      seen.push(!!exiting())
      await press(trigger())
      await tools.advance(400)
      seen.push(!!panel(), !!exiting())
    })
    expect(seen).toEqual([true, true, true, false, true, true, true, false])
  })

  test("turns a Dialog around", async () => {
    const seen: boolean[] = []
    await walkPairWithState<{ open?: boolean }>(
      {},
      () => {
        animation.disabled = false
        return reactDialog({ open: undefined as never })
      },
      () => {
        animation.disabled = false
        return vueDialog({ open: undefined as never })
      },
      async (tools) => {
        await press(trigger())
        await tools.advance(400)
        await act(async () => {
          fireEvent.click(document.querySelector('[aria-label="Close dialog"]')!)
        })
        await flushVue()
        await tools.advance(50)
        seen.push(!!exiting())
        await press(trigger())
        await tools.advance(400)
        seen.push(!!panel(), !!exiting())
      },
    )
    expect(seen).toEqual([true, true, false, true, true, false])
  })
})

describe("Dialog exit timing", () => {
  const [, reactApp, vueApp] = overlays[0]!

  test.each([
    [false, 150],
    [true, 200],
  ])("sheet %s leaves after %i ms", async (sheet, duration) => {
    const seen: boolean[] = []
    await walk(
      (state) => reactApp({ ...state, sheet }),
      (state) => vueApp({ ...state, sheet }),
      async (tools) => {
        await opened(tools)
        await tools.set({ open: false })
        // The timer starts one to two frames after the close
        await tools.advance(16)
        await tools.advance(duration - 1)
        seen.push(!!panel())
        await tools.advance(18)
        seen.push(!!panel())
      },
    )
    expect(seen).toEqual([true, false, true, false])
  })
})

describe("Select exit", () => {
  const OPTIONS = [
    { value: "a", label: "Apple" },
    { value: "b", label: "Pear" },
  ]
  const reactSelect = (): ReactNode => <ReactSelect options={OPTIONS} value="a" onChange={() => {}} />
  const vueSelect = () => h(Select, { options: OPTIONS, value: "a" })
  const control = () => document.querySelector<HTMLElement>('[role="button"]')!
  const press = async (element: Element) => {
    vi.setSystemTime(Date.now() + 1)
    await act(async () => {
      fireEvent.pointerDown(element, { button: 0, pointerType: "mouse" })
    })
    await flushVue()
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    await flushVue()
  }

  test("keeps the list through the exit; focus is back on the control at once", async () => {
    const seen: boolean[] = []
    const { react, vue } = await walk(
      () => createElement("div", null, reactSelect()),
      () => h("div", null, [vueSelect()]),
      async (tools) => {
        await press(control())
        await tools.advance(400)
        tools.snapshot()
        await press(control())
        await tools.advance(32)
        tools.snapshot()
        seen.push(!!document.querySelector('[role="listbox"]'), document.activeElement === control())
        await tools.advance(400)
        tools.snapshot()
        seen.push(!!document.querySelector('[role="listbox"]'))
      },
    )
    expect(comparable(vue)).toEqual(comparable(react))
    expect(react[1]).toContain("data-exiting-active")
    expect(react[1]).toContain('inert=""')
    expect(seen).toEqual([true, true, false, true, true, false])
  })
})

describe("Dialog mounted open", () => {
  test("still runs its entrance", async () => {
    const seen: boolean[] = []
    animation.disabled = false
    const { react, vue } = await walkPairWithState<State>(
      { open: true },
      (state) => overlays[0]![1](state),
      (state) => overlays[0]![2](state),
      async (tools) => {
        await tools.advance(32)
        tools.snapshot()
        seen.push(!!document.querySelector("[data-entering-active]"))
        await tools.advance(400)
        seen.push(!!document.querySelector("[data-entering-active]"))
      },
    )
    expect(comparable(vue)).toEqual(comparable(react))
    expect(seen).toEqual([true, false, true, false])
  })
})

describe("Inside a Dialog", () => {
  const OPTIONS = [
    { value: "a", label: "Apple" },
    { value: "b", label: "Pear" },
  ]
  const press = async (element: Element) => {
    vi.setSystemTime(Date.now() + 1)
    await act(async () => {
      fireEvent.pointerDown(element, { button: 0, pointerType: "mouse" })
    })
    await flushVue()
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    await flushVue()
  }

  test.each<[string, () => ReactElement, () => VNode, string, string]>([
    [
      "Select",
      () => (
        <ReactDialog open>
          <ReactDialog.Content>
            <ReactDialog.Title>Title</ReactDialog.Title>
            <button id="first">First</button>
            <ReactSelect options={OPTIONS} value="a" onChange={() => {}} />
          </ReactDialog.Content>
        </ReactDialog>
      ),
      () =>
        h(Dialog, { open: true }, {
          default: () => [
            h(DialogContent, null, {
              default: () => [
                h(DialogTitle, null, { default: () => "Title" }),
                h("button", { id: "first" }, "First"),
                h(Select, { options: OPTIONS, value: "a" }),
              ],
            }),
          ],
        }),
      '[role="dialog"] [role="button"]',
      '[role="listbox"]',
    ],
    [
      "Popover",
      () => (
        <ReactDialog open>
          <ReactDialog.Content>
            <ReactDialog.Title>Title</ReactDialog.Title>
            <button id="first">First</button>
            <ReactPopover>
              <ReactPopover.Trigger>
                <button id="trigger">Open</button>
              </ReactPopover.Trigger>
              <ReactPopover.Content>
                <div data-panel="">Inside</div>
              </ReactPopover.Content>
            </ReactPopover>
          </ReactDialog.Content>
        </ReactDialog>
      ),
      () =>
        h(Dialog, { open: true }, {
          default: () => [
            h(DialogContent, null, {
              default: () => [
                h(DialogTitle, null, { default: () => "Title" }),
                h("button", { id: "first" }, "First"),
                h(Popover, null, {
                  default: () => [
                    h(PopoverTrigger, null, { default: () => [h("button", { id: "trigger" }, "Open")] }),
                    h(PopoverContent, null, { default: () => [h("div", { "data-panel": "" }, "Inside")] }),
                  ],
                }),
              ],
            }),
          ],
        }),
      "#trigger",
      "[data-panel]",
    ],
  ])("%s pressed while focus is elsewhere in the dialog stays open and takes focus", async (name, reactApp, vueApp, trigger, content) => {
    const open: boolean[] = []
    const focused: boolean[] = []
    await walk(reactApp, vueApp, async (tools) => {
      await tools.advance(400)
      await act(async () => {
        document.querySelector<HTMLElement>("#first")!.focus()
      })
      await flushVue()
      const opener = document.querySelector(trigger)!
      if (name === "Select") await press(opener)
      else
        await act(async () => {
          fireEvent.click(opener)
        })
      await flushVue()
      await tools.advance(400)
      const panel = document.querySelector(content)
      open.push(!!panel && !panel.closest("[inert]"))
      focused.push(!!panel?.closest('[id^="radix-"],[id^="reka-"]')?.contains(document.activeElement))
    })
    expect(open).toEqual([true, true])
    // In Vue the focus goes in. React's Select keeps it in the dialog
    expect(focused[1]).toBe(true)
  })
})

describe("Select option under a touch", () => {
  const OPTIONS = [
    { value: "a", label: "Apple" },
    { value: "b", label: "Pear" },
  ]

  test("acts on the click, so the click cannot land behind the closed list", async () => {
    const picked: string[] = []
    const fire = async (name: "pointerUp" | "click", init?: object) => {
      const option = document.querySelector('[data-option-id="b"]')!
      await act(async () => {
        fireEvent[name](option, init)
      })
      await flushVue()
    }
    await walk(
      () => createElement(ReactSelect, { options: OPTIONS, value: "a", onChange: ({ value }: { value: string }) => picked.push(value) }),
      () => h(Select, { "options": OPTIONS, "value": "a", "onUpdate:value": (value: string) => picked.push(value) }),
      async (tools) => {
        await act(async () => {
          fireEvent.pointerDown(document.querySelector('[role="button"]')!, { button: 0, pointerType: "mouse" })
        })
        await flushVue()
        await tools.advance(400)
        await fire("pointerUp", { pointerType: "touch" })
        tools.snapshot()
        picked.push(document.querySelector("[data-exiting]") ? "closed early" : "open")
        await fire("click")
        await tools.advance(32)
        picked.push(document.querySelector("[data-exiting]") ? "closing" : "open")
      },
    )
    expect(picked).toEqual(["open", "b", "closing", "open", "b", "closing"])
  })

  test("a mouse still acts on pointerup", async () => {
    const picked: string[] = []
    await walk(
      () => createElement(ReactSelect, { options: OPTIONS, value: "a", onChange: ({ value }: { value: string }) => picked.push(value) }),
      () => h(Select, { "options": OPTIONS, "value": "a", "onUpdate:value": (value: string) => picked.push(value) }),
      async (tools) => {
        await act(async () => {
          fireEvent.pointerDown(document.querySelector('[role="button"]')!, { button: 0, pointerType: "mouse" })
        })
        await flushVue()
        await tools.advance(400)
        await act(async () => {
          fireEvent.pointerUp(document.querySelector('[data-option-id="b"]')!, { pointerType: "mouse" })
        })
        await flushVue()
        tools.snapshot()
      },
    )
    expect(picked).toEqual(["b", "b"])
  })
})

describe("Vue slots during the exit", () => {
  test("state cleared with the close does not throw", async () => {
    animation.disabled = false
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    await walkPairWithState<{ item: { name: string } | null }>(
      { item: { name: "Ann" } },
      () => <div />,
      (state) =>
        h(Dialog, { open: !!state.item }, {
          default: () => [
            h(DialogContent, null, {
              default: () => [h(DialogTitle, null, { default: () => state.item!.name })],
            }),
          ],
        }),
      async ({ set, advance }) => {
        await advance(400)
        await set({ item: null })
        await advance(400)
      },
    )
    expect(errors).not.toHaveBeenCalled()
  })
})
