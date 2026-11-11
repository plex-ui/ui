import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { type SVGProps, useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { type FunctionalComponent, h, ref } from "vue"
import {
  SwipeActions as RSwipeActions,
  swipeActionsOffset as rOffset,
  type SwipeAction as RSwipeAction,
  type SwipeActionsProps as RSwipeActionsProps,
} from "../../packages/ui/src/components/SwipeActions"
import { SwipeActions, swipeActionsOffset as vOffset, type SwipeAction as VSwipeAction } from "../../packages/vue/src/components/SwipeActions"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair } from "./pair"

// React-vs-Vue parity for SwipeActions (plan 173, block A): the row, its sides and labels for every prop, a swipe
// that opens, closes or runs the first action, the press, the focus and the keys, and the kit measurements in the CSS.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

// jsdom lays nothing out: a side of n actions is 16 + 60n + 10(n - 1) + 10 wide, so one leading action 86px and two
// trailing 156px, unless a full swipe has stretched it (its inline width); the row is 358px. A full swipe starts at
// (156 + 358) / 2 = 257px toward the leading edge.
const WIDTHS = { leading: 86, trailing: 156 }
const ROW = 358
let rtl = false
beforeEach(() => {
  rtl = false
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
    if (!this.hasAttribute("data-side")) return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
    const count = this.children.length
    const width = this.style.width ? parseFloat(this.style.width) : 26 + 60 * count + 10 * (count - 1)
    return DOMRect.fromRect({ x: 0, y: 0, width, height: 52 })
  })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function width(this: HTMLElement) {
    return this.hasAttribute("data-swipe-actions") ? ROW : 0
  })
  const computed = window.getComputedStyle
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
    if (element.hasAttribute("data-swipe-actions")) return { direction: rtl ? "rtl" : "ltr" } as unknown as CSSStyleDeclaration
    return computed(element, pseudo)
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("swipeActionsOffset", () => {
  test.each([rOffset, vOffset])("follows the finger up to the actions, then a third as fast or on to a full swipe", (offset) => {
    expect(offset(-50, WIDTHS, ROW, true)).toEqual({ offset: -50, full: false })
    expect(offset(40, WIDTHS, ROW, true)).toEqual({ offset: 40, full: false })
    expect(offset(-216, WIDTHS, ROW, false)).toEqual({ offset: -176, full: false })
    expect(offset(-200, WIDTHS, ROW, true)).toEqual({ offset: -200, full: false })
    expect(offset(-257, WIDTHS, ROW, true)).toEqual({ offset: -257, full: true })
    expect(offset(-500, WIDTHS, ROW, true)).toEqual({ offset: -358, full: true })
    expect(offset(222, WIDTHS, ROW, true)).toEqual({ offset: 222, full: true })
  })

  test.each([rOffset, vOffset])("a side without actions stays shut", (offset) => {
    expect(offset(60, { leading: 0, trailing: 156 }, ROW, true)).toEqual({ offset: 0, full: false })
    expect(offset(-60, { leading: 86, trailing: 0 }, ROW, true)).toEqual({ offset: 0, full: false })
    expect(offset(0, WIDTHS, ROW, true)).toEqual({ offset: 0, full: false })
  })
})

// The icons render the same <svg> in both frameworks.
const RIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => <svg className={className} {...props} data-icon="" />
// As the generated PlexUI icons: every attribute goes through `props`.
const VIcon: FunctionalComponent = (props) => h("svg", { ...props, "data-icon": "" })
VIcon.inheritAttrs = false

type ActionSpec = Omit<RSwipeAction, "Icon" | "onSelect"> & { icon?: boolean }
const toReact = (actions?: ActionSpec[], onSelect?: (id: string) => void): RSwipeAction[] | undefined =>
  actions?.map(({ icon = true, ...action }) => ({ ...action, ...(icon && { Icon: RIcon }), onSelect: () => onSelect?.(action.id) }))
const toVue = (actions?: ActionSpec[], onSelect?: (id: string) => void): VSwipeAction[] | undefined =>
  actions?.map(({ icon = true, ...action }) => ({ ...action, ...(icon && { Icon: VIcon }), onSelect: () => onSelect?.(action.id) }))

const PIN: ActionSpec = { id: "pin", label: "Pin", color: "warning" }
const DELETE: ActionSpec = { id: "delete", label: "Delete", color: "danger" }
const ARCHIVE: ActionSpec = { id: "archive", label: "Archive" }

type Case = Omit<RSwipeActionsProps, "leading" | "trailing" | "children"> & { leading?: ActionSpec[]; trailing?: ActionSpec[] }
const cases: Array<[string, Case]> = [
  ["symbols only, both sides", { leading: [PIN], trailing: [DELETE, ARCHIVE] }],
  ["labels inside, one action without an icon", { labelPlacement: "inside", leading: [PIN], trailing: [DELETE, { ...ARCHIVE, icon: false }] }],
  ["labels below", { labelPlacement: "below", trailing: [DELETE, ARCHIVE, { id: "flag", label: "Flag", color: "caution" }] }],
  ["trailing only, classed, without a full swipe", { trailing: [DELETE], className: "custom", fullSwipe: false }],
  ["no actions", {}],
]

describe("SwipeActions DOM parity", () => {
  test.each(cases)("%s", async (_, { leading, trailing, className, ...props }) => {
    const pair = await renderPair(
      <RSwipeActions {...props} className={className} leading={toReact(leading)} trailing={toReact(trailing)}><span>Row</span></RSwipeActions>,
      () => h(SwipeActions, { ...props, class: className, leading: toVue(leading), trailing: toVue(trailing) }, { default: () => h("span", "Row") }),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("the row is a data-row; the leading actions come before the content and the trailing ones after it, the first at the edge", async () => {
    await act(async () => {
      render(<RSwipeActions leading={toReact([PIN, ARCHIVE])} trailing={toReact([DELETE, ARCHIVE])}><span>Row</span></RSwipeActions>)
    })
    const row = document.querySelector("[data-swipe-actions]")
    expect(row?.hasAttribute("data-row")).toBe(true)
    expect([...(row?.children ?? [])].map((child) => child.getAttribute("data-side") ?? "content")).toEqual(["leading", "content", "trailing"])
    const names = (side: string) => [...document.querySelectorAll(`[data-side="${side}"] > button`)].map((button) => button.getAttribute("aria-label"))
    expect(names("leading")).toEqual(["Pin", "Archive"])
    expect(names("trailing")).toEqual(["Archive", "Delete"])
    expect(document.querySelector('[data-side="trailing"] > [data-first]')?.getAttribute("aria-label")).toBe("Delete")
    expect(document.querySelector('[data-side="trailing"] > button')?.getAttribute("data-color")).toBe("secondary")
    expect(document.querySelector('[data-side="trailing"] > button')?.getAttribute("type")).toBe("button")
  })

  test("a label shown inside or below names the action; a symbol alone is named by aria-label", async () => {
    await act(async () => {
      render(<RSwipeActions labelPlacement="below" trailing={toReact([DELETE, { ...ARCHIVE, icon: false }])}><span>Row</span></RSwipeActions>)
    })
    const buttons = [...document.querySelectorAll("button")]
    expect(buttons.map((button) => [button.getAttribute("aria-label"), button.textContent])).toEqual([[null, "Archive"], [null, "Delete"]])
    expect(buttons[1]?.lastElementChild?.textContent).toBe("Delete")
    expect(buttons[0]?.querySelector("svg")).toBeNull()
  })
})

describe.each([
  ["React", async (props: Case) => {
    await act(async () => {
      render(<RSwipeActions {...props} leading={toReact(props.leading)} trailing={toReact(props.trailing)}><span>Row</span></RSwipeActions>)
    })
  }],
  ["Vue", async (props: Case) => {
    mountVue(() => h(SwipeActions, { ...props, leading: toVue(props.leading), trailing: toVue(props.trailing) }, { default: () => h("span", "Row") }))
    await flushVue()
  }],
] as const)("%s SwipeActions shapes", (_, mount) => {
  /**
   * The symbol capsules lay out `height` tall under a max-height of 50px, as the CSS sets it; with `firstOnly`, as in
   * a full swipe, only the capsule of the first action of a side is laid out and the others measure 0.
   */
  const layOut = (height: number, firstOnly = false) => {
    const rect = vi.mocked(HTMLElement.prototype.getBoundingClientRect)
    const sides = rect.getMockImplementation()!
    rect.mockImplementation(function rectOf(this: HTMLElement) {
      const action = this.parentElement
      if (action?.dataset.shape === "symbol" && this === action.firstElementChild) {
        const shown = !firstOnly || action.hasAttribute("data-first")
        return DOMRect.fromRect({ x: 0, y: 0, width: shown ? 60 : 0, height: shown ? height : 0 })
      }
      return sides.call(this)
    })
    const style = vi.mocked(window.getComputedStyle)
    const base = style.getMockImplementation()!
    style.mockImplementation((element, pseudo) => {
      if (element.parentElement?.dataset.shape === "symbol") return { maxHeight: "50px" } as unknown as CSSStyleDeclaration
      return base(element, pseudo)
    })
  }

  test("each action has a shape: a label alone is text, a symbol with its label inside a label, else a symbol", async () => {
    await mount({ labelPlacement: "below", leading: [PIN], trailing: [DELETE, { ...ARCHIVE, icon: false }] })
    expect([...document.querySelectorAll("button")].map((button) => button.dataset.shape)).toEqual(["symbol", "text", "symbol"])
    cleanup()
    document.body.innerHTML = ""
    await mount({ labelPlacement: "inside", trailing: [DELETE, { ...ARCHIVE, icon: false }] })
    expect([...document.querySelectorAll("button")].map((button) => button.dataset.shape)).toEqual(["text", "label"])
  })

  test.each([[50, true], [49.67, true], [48, false]])("a symbol %spx tall under a 50px circle is round: %s", async (height, round) => {
    layOut(height)
    await mount({ trailing: [DELETE, ARCHIVE] })
    expect(document.querySelector("[data-swipe-actions]")!.hasAttribute("data-round")).toBe(round)
  })

  // The trailing side lists its actions from the far one, so the first symbol in the DOM is the one a full swipe hides.
  test("a full swipe hides all but the first action: the row stays round by the one laid out", async () => {
    layOut(50, true)
    await mount({ trailing: [DELETE, ARCHIVE] })
    expect(document.querySelector('[data-side="trailing"] > :first-child')!.hasAttribute("data-first")).toBe(false)
    expect(document.querySelector("[data-swipe-actions]")!.hasAttribute("data-round")).toBe(true)
  })

  test("while no symbol is laid out the shape stays", async () => {
    layOut(0)
    await mount({ trailing: [DELETE, ARCHIVE] })
    expect(document.querySelector("[data-swipe-actions]")!.hasAttribute("data-round")).toBe(false)
  })

  test("a label inside never makes the row round", async () => {
    layOut(50)
    await mount({ labelPlacement: "inside", trailing: [DELETE, ARCHIVE] })
    expect(document.querySelector("[data-swipe-actions]")!.hasAttribute("data-round")).toBe(false)
  })
})

type Mounted = {
  row: (index?: number) => HTMLElement
  content: (index?: number) => HTMLElement
  button: (side: "leading" | "trailing", label: string, index?: number) => HTMLElement
  selected: string[]
  clicks: number[]
  setTrailing: (actions: ActionSpec[]) => Promise<void>
}

type MountOptions = { fullSwipe?: boolean }

/** Two rows, A and B, each a pin on the leading side and delete and archive on the trailing side. */
const mountReact = async ({ fullSwipe }: MountOptions = {}): Promise<Mounted> => {
  const selected: string[] = []
  const clicks: number[] = []
  let setTrailing: (actions: ActionSpec[]) => void = () => {}
  function Host() {
    const [trailing, set] = useState<ActionSpec[]>([DELETE, ARCHIVE])
    setTrailing = set
    return (
      <div>
        {["A", "B"].map((name, index) => (
          <RSwipeActions
            key={name}
            fullSwipe={fullSwipe}
            leading={toReact([PIN], (id) => selected.push(`${name}:${id}`))}
            trailing={toReact(trailing, (id) => selected.push(`${name}:${id}`))}
          >
            <span onClick={() => clicks.push(index)}>{name}</span>
            <input aria-label={`Note ${name}`} />
          </RSwipeActions>
        ))}
      </div>
    )
  }
  await act(async () => { render(<Host />) })
  return query(selected, clicks, (actions) => interact(() => setTrailing(actions)))
}

const mountVueRows = async ({ fullSwipe }: MountOptions = {}): Promise<Mounted> => {
  const selected: string[] = []
  const clicks: number[] = []
  const trailing = ref<ActionSpec[]>([DELETE, ARCHIVE])
  mountVue(() => h("div", ["A", "B"].map((name, index) => h(SwipeActions, {
    key: name,
    ...(fullSwipe !== undefined && { fullSwipe }),
    leading: toVue([PIN], (id) => selected.push(`${name}:${id}`)),
    trailing: toVue(trailing.value, (id) => selected.push(`${name}:${id}`)),
  }, { default: () => [h("span", { onClick: () => clicks.push(index) }, name), h("input", { "aria-label": `Note ${name}` })] }))))
  await flushVue()
  return query(selected, clicks, (actions) => interact(() => { trailing.value = actions }))
}

const query = (selected: string[], clicks: number[], setTrailing: Mounted["setTrailing"]): Mounted => {
  const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
  const pick = (selector: string, index: number) => {
    const element = all(selector)[index]
    if (!element) throw new Error(`Nothing matches ${selector} at ${index}`)
    return element
  }
  return {
    row: (index = 0) => pick("[data-swipe-actions]", index),
    content: (index = 0) => pick("[data-swipe-content]", index),
    button: (side, label, index = 0) => {
      const button = pick("[data-swipe-actions]", index).querySelector<HTMLElement>(`[data-side="${side}"] > button[aria-label="${label}"]`)
      if (!button) throw new Error(`No ${label} on the ${side} side`)
      return button
    },
    selected,
    clicks,
    setTrailing,
  }
}

const at = (clientX: number, clientY = 26, extra: Record<string, unknown> = {}) => ({ button: 0, pointerId: 1, pointerType: "touch", isPrimary: true, clientX, clientY, ...extra })
const offsetOf = (mounted: Mounted, index = 0) => mounted.content(index).style.getPropertyValue("--swipe-actions-offset")

/** A swipe on a row from x = 300 to `to`, lifted there. */
const swipe = async (mounted: Mounted, to: number, index = 0, lift = true) => {
  const content = mounted.content(index)
  await interact(() => { fireEvent.pointerDown(content, at(300)) })
  await interact(() => { fireEvent.pointerMove(content, at(300 + Math.sign(to - 300) * 5)) })
  await interact(() => { fireEvent.pointerMove(content, at(to)) })
  if (lift) await interact(() => { fireEvent.pointerUp(content, at(to)) })
}

describe.each([
  ["React", mountReact],
  ["Vue", mountVueRows],
] as const)("%s SwipeActions", (_, mount) => {
  test("a swipe toward the leading edge reveals the trailing actions: past half of them it opens, short of it it closes", async () => {
    const mounted = await mount()
    const content = mounted.content()
    await interact(() => { fireEvent.pointerDown(content, at(300)) })
    await interact(() => { fireEvent.pointerMove(content, at(295)) })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
    await interact(() => { fireEvent.pointerMove(content, at(240)) })
    expect([mounted.row().getAttribute("data-revealed"), mounted.row().hasAttribute("data-swiping"), offsetOf(mounted)]).toEqual(["trailing", true, "-60px"])
    await interact(() => { fireEvent.pointerUp(content, at(240)) })
    expect([mounted.row().hasAttribute("data-revealed"), mounted.row().hasAttribute("data-swiping"), offsetOf(mounted)]).toEqual([false, false, ""])
    await swipe(mounted, 200)
    expect([mounted.row().getAttribute("data-revealed"), mounted.row().hasAttribute("data-swiping"), offsetOf(mounted)]).toEqual(["trailing", false, "-156px"])
    expect(mounted.selected).toEqual([])
  })

  test("a swipe toward the trailing edge reveals the leading actions", async () => {
    const mounted = await mount()
    await swipe(mounted, 350)
    expect([mounted.row().getAttribute("data-revealed"), offsetOf(mounted)]).toEqual(["leading", "86px"])
  })

  test("a full swipe stretches the first action across the row and runs it on letting go", async () => {
    const mounted = await mount()
    await swipe(mounted, 40, 0, false)
    const side = mounted.row().querySelector<HTMLElement>('[data-side="trailing"]')
    expect([side?.hasAttribute("data-full"), side?.style.width, offsetOf(mounted)]).toEqual([true, "260px", "-260px"])
    await interact(() => { fireEvent.pointerMove(mounted.content(), at(100)) })
    expect(side?.hasAttribute("data-full")).toBe(false)
    await interact(() => { fireEvent.pointerMove(mounted.content(), at(0)) })
    await interact(() => { fireEvent.pointerUp(mounted.content(), at(0)) })
    expect(mounted.selected).toEqual(["A:delete"])
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
  })

  test("without a full swipe the content slows past the actions and the row opens", async () => {
    const mounted = await mount({ fullSwipe: false })
    await swipe(mounted, 40, 0, false)
    expect(offsetOf(mounted)).toBe(`${-(156 + (260 - 156) / 3)}px`)
    expect(mounted.row().querySelector('[data-side="trailing"]')?.hasAttribute("data-full")).toBe(false)
    await interact(() => { fireEvent.pointerUp(mounted.content(), at(40)) })
    expect([mounted.selected, offsetOf(mounted)]).toEqual([[], "-156px"])
  })

  test("a click that ends a swipe or closes the open row does not reach the content; a click from the keys does", async () => {
    const mounted = await mount()
    await swipe(mounted, 200)
    await interact(() => { fireEvent.click(mounted.content().firstElementChild as Element, { detail: 1 }) })
    expect(mounted.clicks).toEqual([])
    await interact(() => { fireEvent.pointerDown(mounted.content(), at(150)) })
    await interact(() => { fireEvent.pointerUp(mounted.content(), at(152)) })
    await interact(() => { fireEvent.click(mounted.content().firstElementChild as Element, { detail: 1 }) })
    expect([mounted.row().hasAttribute("data-revealed"), mounted.clicks]).toEqual([false, []])
    await interact(() => { fireEvent.click(mounted.content().firstElementChild as Element, { detail: 0 }) })
    await interact(() => { fireEvent.pointerDown(mounted.content(), at(150)) })
    await interact(() => { fireEvent.pointerUp(mounted.content(), at(150)) })
    await interact(() => { fireEvent.click(mounted.content().firstElementChild as Element, { detail: 1 }) })
    expect(mounted.clicks).toEqual([0, 0])
  })

  test("one row is open at a time, and a press outside closes it", async () => {
    const mounted = await mount()
    await swipe(mounted, 200, 0)
    await swipe(mounted, 350, 1)
    expect([mounted.row(0).hasAttribute("data-revealed"), mounted.row(1).getAttribute("data-revealed")]).toEqual([false, "leading"])
    await interact(() => { fireEvent.pointerDown(mounted.button("leading", "Pin", 1), at(30)) })
    expect(mounted.row(1).getAttribute("data-revealed")).toBe("leading")
    await interact(() => { fireEvent.pointerDown(document.body, at(30)) })
    expect(mounted.row(1).hasAttribute("data-revealed")).toBe(false)
  })

  test("a press on an action runs it and closes the row", async () => {
    const mounted = await mount()
    await swipe(mounted, 200)
    await interact(() => { fireEvent.click(mounted.button("trailing", "Archive"), { detail: 1 }) })
    expect([mounted.selected, mounted.row().hasAttribute("data-revealed")]).toEqual([["A:archive"], false])
  })

  test("a drag down scrolls instead; a drag in a text field and a second pointer move nothing", async () => {
    const mounted = await mount()
    const content = mounted.content()
    await interact(() => { fireEvent.pointerDown(content, at(300, 26)) })
    await interact(() => { fireEvent.pointerMove(content, at(298, 60)) })
    await interact(() => { fireEvent.pointerMove(content, at(150, 60)) })
    await interact(() => { fireEvent.pointerUp(content, at(150, 60)) })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
    const input = content.querySelector("input") as HTMLElement
    await interact(() => { fireEvent.pointerDown(input, at(300)) })
    await interact(() => { fireEvent.pointerMove(input, at(150)) })
    await interact(() => { fireEvent.pointerUp(input, at(150)) })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
    await interact(() => { fireEvent.pointerDown(content, at(300)) })
    await interact(() => { fireEvent.pointerDown(content, at(300, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerMove(content, at(150, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerUp(content, at(150, 26, { pointerId: 2, isPrimary: false })) })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
    await interact(() => { fireEvent.pointerUp(content, at(300)) })
  })

  test("a cancelled swipe goes back to where the row was", async () => {
    const mounted = await mount()
    await swipe(mounted, 240, 0, false)
    await interact(() => { fireEvent.pointerCancel(mounted.content(), at(240)) })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
    await swipe(mounted, 200)
    await swipe(mounted, 250, 0, false)
    await interact(() => { fireEvent.lostPointerCapture(mounted.content(), at(250)) })
    expect(offsetOf(mounted)).toBe("-156px")
  })

  test("the focus on an action reveals its side; on the content or out of the row it closes", async () => {
    const mounted = await mount()
    await interact(() => { mounted.button("trailing", "Delete").focus() })
    expect([mounted.row().getAttribute("data-revealed"), offsetOf(mounted)]).toEqual(["trailing", "-156px"])
    await interact(() => { mounted.button("leading", "Pin").focus() })
    expect([mounted.row().getAttribute("data-revealed"), offsetOf(mounted)]).toEqual(["leading", "86px"])
    await interact(() => { (mounted.content().querySelector("input") as HTMLElement).focus() })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
    await interact(() => { mounted.button("trailing", "Archive").focus() })
    expect(mounted.row().getAttribute("data-revealed")).toBe("trailing")
    await interact(() => { mounted.button("trailing", "Archive").blur() })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
  })

  test("an action chosen from the keys keeps the focus and its side stays open", async () => {
    const mounted = await mount()
    const archive = mounted.button("trailing", "Archive")
    await interact(() => { archive.focus() })
    await interact(() => { fireEvent.click(archive, { detail: 0 }) })
    expect([mounted.selected, mounted.row().getAttribute("data-revealed"), document.activeElement === archive]).toEqual([["A:archive"], "trailing", true])
  })

  test("the open side closes when it loses its actions", async () => {
    const mounted = await mount()
    await swipe(mounted, 200)
    await mounted.setTrailing([])
    expect([mounted.row().hasAttribute("data-revealed"), mounted.row().querySelector('[data-side="trailing"]')]).toEqual([false, null])
  })

  test("a child that hands its implicit touch capture to the content does not end the swipe", async () => {
    const mounted = await mount()
    const label = mounted.content().firstElementChild as HTMLElement
    await interact(() => { fireEvent.pointerDown(label, at(300)) })
    await interact(() => { fireEvent.pointerMove(label, at(240)) })
    await interact(() => { fireEvent.lostPointerCapture(label, at(240)) })
    await interact(() => { fireEvent.pointerMove(mounted.content(), at(200)) })
    expect([mounted.row().hasAttribute("data-swiping"), offsetOf(mounted)]).toEqual([true, "-100px"])
    await interact(() => { fireEvent.pointerUp(mounted.content(), at(200)) })
    expect(offsetOf(mounted)).toBe("-156px")
  })

  test("a press released outside the row ends its gesture, so a later move without a press moves nothing", async () => {
    const mounted = await mount()
    await interact(() => { fireEvent.pointerDown(mounted.content(), at(300)) })
    await interact(() => { fireEvent.pointerUp(document.body, at(300, 200)) })
    await interact(() => { fireEvent.pointerMove(mounted.content(), at(20, 26, { buttons: 0 })) })
    expect(mounted.row().hasAttribute("data-revealed")).toBe(false)
    await swipe(mounted, 200)
    expect(offsetOf(mounted)).toBe("-156px")
    expect(mounted.selected).toEqual([])
  })

  test("a cancelled full swipe goes back to the width of the actions, not the stretched one", async () => {
    const mounted = await mount()
    await swipe(mounted, 200)
    await swipe(mounted, 30, 0, false)
    expect([offsetOf(mounted), mounted.row().querySelector<HTMLElement>('[data-side="trailing"]')?.style.width]).toEqual(["-358px", "358px"])
    await interact(() => { fireEvent.pointerCancel(mounted.content(), at(30)) })
    expect([offsetOf(mounted), mounted.row().querySelector<HTMLElement>('[data-side="trailing"]')?.style.width]).toEqual(["-156px", ""])
  })

  test("an open row follows its actions when they change", async () => {
    const mounted = await mount()
    await swipe(mounted, 200)
    await mounted.setTrailing([DELETE, ARCHIVE, { id: "flag", label: "Flag" }])
    expect(offsetOf(mounted)).toBe("-226px")
    await mounted.setTrailing([DELETE])
    expect(offsetOf(mounted)).toBe("-86px")
  })

  test("a row that another finger opens ends this row's swipe", async () => {
    const mounted = await mount()
    const first = mounted.content(0)
    await interact(() => { fireEvent.pointerDown(first, at(300)) })
    await interact(() => { fireEvent.pointerMove(first, at(240)) })
    const second = mounted.content(1)
    await interact(() => { fireEvent.pointerDown(second, at(300, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerMove(second, at(200, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerMove(first, at(200)) })
    expect([mounted.row(0).hasAttribute("data-revealed"), mounted.row(0).hasAttribute("data-swiping"), mounted.row(1).getAttribute("data-revealed")]).toEqual([false, false, "trailing"])
    await interact(() => { fireEvent.pointerUp(first, at(200)) })
    await interact(() => { fireEvent.click(first.firstElementChild as Element, { detail: 1 }) })
    await interact(() => { fireEvent.pointerUp(second, at(200, 26, { pointerId: 2, isPrimary: false })) })
    expect([mounted.row(0).hasAttribute("data-revealed"), offsetOf(mounted, 1), mounted.clicks]).toEqual([false, "-156px", []])
  })

  test("a swipe that another row ends and that is then cancelled leaves the next tap in a text field alone", async () => {
    const mounted = await mount()
    const first = mounted.content(0)
    await interact(() => { fireEvent.pointerDown(first, at(300)) })
    await interact(() => { fireEvent.pointerMove(first, at(240)) })
    const second = mounted.content(1)
    await interact(() => { fireEvent.pointerDown(second, at(300, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerMove(second, at(200, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerUp(second, at(200, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerCancel(first, at(240)) })
    const input = first.querySelector("input") as HTMLElement
    await interact(() => { fireEvent.pointerDown(input, at(120, 26, { pointerId: 3 })) })
    await interact(() => { fireEvent.pointerUp(input, at(120, 26, { pointerId: 3 })) })
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 })
    await interact(() => { input.dispatchEvent(click) })
    expect(click.defaultPrevented).toBe(false)
  })

  test("a press by another finger keeps the swallowed click of a swipe whose finger is still down", async () => {
    const mounted = await mount()
    const first = mounted.content(0)
    await interact(() => { fireEvent.pointerDown(first, at(300)) })
    await interact(() => { fireEvent.pointerMove(first, at(240)) })
    const second = mounted.content(1)
    await interact(() => { fireEvent.pointerDown(second, at(300, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerMove(second, at(200, 26, { pointerId: 2, isPrimary: false })) })
    await interact(() => { fireEvent.pointerUp(second, at(200, 26, { pointerId: 2, isPrimary: false })) })
    const input = first.querySelector("input") as HTMLElement
    await interact(() => { fireEvent.pointerDown(input, at(120, 26, { pointerId: 3, isPrimary: false })) })
    await interact(() => { fireEvent.pointerUp(input, at(120, 26, { pointerId: 3, isPrimary: false })) })
    await interact(() => { fireEvent.pointerUp(first, at(240)) })
    await interact(() => { fireEvent.click(first.firstElementChild as Element, { detail: 1 }) })
    expect(mounted.clicks).toEqual([])
  })

  test("the actions are observed by their border box, so a new edge or gap moves an open row", async () => {
    const boxes: unknown[] = []
    vi.stubGlobal("ResizeObserver", class {
      observe(_: Element, options?: ResizeObserverOptions) { boxes.push(options?.box) }
      unobserve() {}
      disconnect() {}
    })
    await mount()
    expect(boxes.length).toBeGreaterThan(0)
    expect(new Set(boxes)).toEqual(new Set(["border-box"]))
  })

  test("in a right-to-left row a swipe to the right reveals the trailing actions", async () => {
    rtl = true
    const mounted = await mount()
    await swipe(mounted, 360, 0, false)
    expect([mounted.row().getAttribute("data-revealed"), offsetOf(mounted)]).toEqual(["trailing", "60px"])
    await interact(() => { fireEvent.pointerMove(mounted.content(), at(400)) })
    await interact(() => { fireEvent.pointerUp(mounted.content(), at(400)) })
    expect(offsetOf(mounted)).toBe("156px")
  })
})

describe("SwipeActions CSS", () => {
  const tokens = read("packages/styles/src/styles/variables-components.css")
  const touch = read("packages/styles/src/styles/touch.css")
  const css = read("packages/styles/src/components/SwipeActions/SwipeActions.module.css")
  const group = read("packages/styles/src/components/FieldGroup/FieldGroup.module.css")

  // iOS 27.2 (ref-app swipe-* in rows of 52 to 90, measures/swipe.md).
  test("the native measurements: insets, capsules, circles, labels", () => {
    for (const [name, value] of [
      ["gap", "10px"], ["edge-inset", "10px"], ["content-gap", "10px"], ["content-radius", "26px"], ["inset-block", "4px"],
      ["action-min-width", "60px"], ["action-padding-inline", "8px"], ["circle-size", "50px"], ["icon-size", "20px"],
      ["labeled-padding-inline", "16px"], ["labeled-icon-size", "18px"], ["label-gap", "6.67px"], ["label-font-size", "13px"],
      ["label-line-height", "16px"], ["text-padding-inline", "16px"], ["text-radius", "16px"], ["tall-padding-top", "4.33px"],
      ["tall-padding-bottom", "3.67px"], ["caption-gap", "4px"],
    ]) expect(tokens).toContain(`--swipe-actions-${name}: ${value};`)
    expect(tokens).toContain("--swipe-actions-label-font-weight: var(--font-weight-normal);")
    expect(tokens).toContain("--swipe-actions-caption-font-weight: var(--font-weight-normal);")
    // The capsule takes the height of the row: no fixed heights or widths of the kit's.
    expect(tokens).not.toMatch(/--swipe-actions-(action-height|tall-action-height|labeled-min-width):/)
  })

  test("an action fills the row but its insets; a symbol grows up to its circle, a label inside sets every width", () => {
    expect(css).toMatch(/\.Action \{[^}]*justify-content: center;[^}]*padding: var\(--swipe-actions-inset-block\) 0;/)
    expect(css).toMatch(/\.Capsule \{[^}]*flex: 1 1 0;[^}]*min-height: 0;/)
    expect(css).toMatch(/\.Action\[data-shape="symbol"\] > \.Capsule \{\s*max-height: var\(--swipe-actions-circle-size\);/)
    expect(css).toMatch(/\.SwipeActions\[data-round\] > \.Actions:not\(\[data-full\]\) > \.Action\[data-shape="symbol"\] > \.Capsule \{\s*width: var\(--swipe-actions-circle-size\);/)
    expect(css).toMatch(/\.SwipeActions\[data-label-placement="inside"\] > \.Actions \{\s*display: grid;\s*grid-auto-columns: 1fr;\s*grid-auto-flow: column;/)
    expect(css).toMatch(/\.Action\[data-shape="text"\] > \.Capsule \{\s*padding-inline: var\(--swipe-actions-text-padding-inline\);\s*border-radius: var\(--swipe-actions-text-radius\);/)
  })

  test("solid PlexUI colors for every action color, darker while pressed", () => {
    for (const color of ["primary", "secondary", "danger", "success", "info", "discovery", "caution", "warning"]) {
      expect(css).toContain(`--swipe-action-background: var(--color-background-${color}-solid);`)
      expect(css).toContain(`--swipe-action-background-active: var(--color-background-${color}-solid-active);`)
      expect(css).toContain(`--swipe-action-color: var(--color-text-${color}-solid);`)
    }
  })

  test("on a phone the row shows the canvas of its Page behind content turned soft gray (systemGray5), and no theme resets them", () => {
    expect(css).toContain("background: var(--swipe-actions-background, var(--color-surface-secondary));")
    expect(css).toContain("background: var(--swipe-actions-content-background, var(--color-surface));")
    expect(css).toContain("var(--swipe-actions-background, var(--mobile-surface-primary, var(--mobile-surface-plain-primary,")
    expect(css).toContain("background: var(--swipe-actions-content-background, var(--color-background-secondary-soft));")
    expect(tokens).not.toContain("--swipe-actions-background:")
    expect(tokens).not.toContain("--swipe-actions-content-background:")
    expect(touch).not.toContain("--swipe-actions-")
    expect(css).toContain("translate: var(--swipe-actions-offset, 0px);")
    expect(css).toContain("touch-action: pan-y;")
  })

  test("a FieldGroup clips a swipe row to its corners and hides the lines around a revealed one", () => {
    expect(group).toContain(".Body > [data-swipe-actions]:first-child")
    expect(group).toContain(".Body > [data-swipe-actions]:last-child")
    expect(group).toContain(".Body > [data-swipe-actions][data-revealed] + [data-row]::after")
    expect(group).toContain('.Body > [data-row] > [data-swipe-content] > button[data-block][data-variant="ghost"]:is([aria-expanded="true"], [data-state="open"])')
  })
})
