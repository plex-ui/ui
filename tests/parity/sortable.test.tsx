import { act, cleanup, render } from "@testing-library/react"
import { createElement, useEffect, useState, type ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, ref } from "vue"
import { Sortable as RSortable } from "../../packages/ui/src/components/Sortable"
import { TagInput as RTagInput } from "../../packages/ui/src/components/TagInput"
import { Textarea as RTextarea } from "../../packages/ui/src/components/Textarea"
import { moveItem, sortableKeyDown, sortablePointerDown } from "../../packages/ui/src/lib/sortable"
import { Sortable, SortableHandle, SortableTarget } from "../../packages/vue/src/components/Sortable"
import { sortablePointerDown as vueSortablePointerDown, sortableKeyDown as vueSortableKeyDown } from "../../packages/vue/src/lib/sortable"
import { CONTEXT_MENU_HOLD } from "../../packages/ui/src/lib/contextMenuHold"
import { TagInput } from "../../packages/vue/src/components/TagInput"
import { Textarea } from "../../packages/vue/src/components/Textarea"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair } from "./pair"

const ITEMS = ["a", "b", "c"]
const ROW_HEIGHT = 40

// jsdom has no layout: rows 40px high, one under another, in a 300px list
const rect = (top: number, height: number, left = 0, width = 300) =>
  ({ top, bottom: top + height, left, right: left + width, width, height, x: left, y: top, toJSON() {} }) as DOMRect

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} })
  vi.stubGlobal("matchMedia", () => ({ matches: true }))
  vi.spyOn(window, "scrollBy").mockImplementation(() => {})
  vi.stubGlobal("requestAnimationFrame", (run: () => void) => setTimeout(run, 0))
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const parent = this.parentElement
    if (parent?.hasAttribute("data-sortable")) return rect([...parent.children].indexOf(this) * ROW_HEIGHT, ROW_HEIGHT)
    if (this.hasAttribute("data-sortable")) return rect(0, this.children.length * ROW_HEIGHT)
    return rect(0, 0)
  })
})

afterEach(() => {
  for (const pointerId of [0, 11, 12]) window.dispatchEvent(new PointerEvent("pointercancel", { pointerId }))
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

const frame = () => new Promise((done) => setTimeout(done, 5))
const press = (target: Element, y: number, pointerType = "mouse") =>
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: y, button: 0, pointerType }))
const moveTo = (y: number) => window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: y }))
const lift = () => window.dispatchEvent(new PointerEvent("pointerup"))

/** A plain list: the engine needs nothing from a framework */
const plainList = (html: string, attributes = "") => {
  document.body.innerHTML = `<div data-sortable ${attributes}>${html}</div>`
  const list = document.body.firstElementChild as HTMLElement
  const commit = vi.fn()
  list.addEventListener("pointerdown", (event) => sortablePointerDown(event, list, "list", commit))
  return { list, commit }
}

const dragFirstBelowSecond = async (target: Element) => {
  press(target, 20)
  moveTo(30)
  moveTo(80)
  await frame()
  lift()
  await frame()
}

describe("moveItem", () => {
  test.each([
    [0, 2, ["b", "c", "a"]],
    [2, 0, ["c", "a", "b"]],
    [1, 1, ["a", "b", "c"]],
  ])("from %i to %i", (from, to, expected) => {
    expect(moveItem(ITEMS, from, to)).toEqual(expected)
    expect(ITEMS).toEqual(["a", "b", "c"])
  })
})

describe("Sortable markup", () => {
  test("list with handles", async () => {
    const pair = await renderPair(
      createElement(
        RSortable,
        { value: ITEMS, "data-testid": "list" },
        ITEMS.map((item) => createElement("div", { key: item }, createElement(RSortable.Handle), item)),
      ),
      () =>
        h(Sortable, { value: ITEMS, "data-testid": "list" }, () =>
          ITEMS.map((item) => h("div", { key: item }, [h(SortableHandle), item])),
        ),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('class="DesktopGrip"')
    expect(pair.react).toContain('class="PhoneGrip"')
    // The phone grip stretches flatter than the icon's own proportions, as iOS draws line.3.horizontal.
    expect(pair.react).toMatch(/preserveAspectRatio="none"[^>]*class="PhoneGrip"|class="PhoneGrip"[^>]*preserveAspectRatio="none"/)
  })

  test("grid, element, disabled", async () => {
    const pair = await renderPair(
      createElement(RSortable, { value: ITEMS, layout: "grid", as: "ul", disabled: true, className: "x" },
        ITEMS.map((item) => createElement("li", { key: item }, item)),
      ),
      () =>
        h(Sortable, { value: ITEMS, layout: "grid", as: "ul", disabled: true, class: "x" }, () =>
          ITEMS.map((item) => h("li", { key: item }, item)),
        ),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test.each([[true], [false]])("handles %s", async (handles) => {
    const pair = await renderPair(
      createElement(RSortable, { value: ITEMS, handles }),
      () => h(Sortable, { value: ITEMS, handles }),
    )
    expect(pair.react).toContain(`data-handles="${handles}"`)
    expect(pair.vue).toBe(pair.react)
  })

  test("handle with its own name and grip", async () => {
    const pair = await renderPair(
      createElement(RSortable.Handle, { "aria-label": "Move row" }, "=") as ReactElement,
      () => h(SortableHandle, { "aria-label": "Move row" }, () => "="),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("DesktopGrip")
    expect(pair.react).not.toContain("PhoneGrip")
  })
})

describe("ghost variants", () => {
  test("Textarea", async () => {
    const pair = await renderPair(createElement(RTextarea, { variant: "ghost" }), () => h(Textarea, { variant: "ghost" }))
    expect(pair.react).toContain('data-variant="ghost"')
    expect(pair.vue).toBe(pair.react)
  })

  test("TagInput", async () => {
    const pair = await renderPair(createElement(RTagInput, { variant: "ghost" }), () => h(TagInput, { variant: "ghost" }))
    expect(pair.react).toContain('data-variant="ghost"')
    expect(pair.vue).toBe(pair.react)
  })
})

describe("drag", () => {
  test("the drop gives the move, nothing changes before it", async () => {
    const { list, commit } = plainList("<div>a</div><div>b</div><div>c</div>")
    press(list.children[0], 20)
    moveTo(30)
    moveTo(80)
    await frame()
    expect(list.children[0].hasAttribute("data-sortable-source")).toBe(true)
    expect(commit).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain("a")
    lift()
    await frame()
    expect(commit).toHaveBeenCalledWith(0, 1)
    expect(list.children[0].hasAttribute("data-sortable-source")).toBe(false)
    expect(list.hasAttribute("data-dragging")).toBe(false)
  })

  test("a short press is a click", async () => {
    const { list, commit } = plainList("<div>a</div><div>b</div>")
    press(list.children[0], 20)
    lift()
    await frame()
    expect(commit).not.toHaveBeenCalled()
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
  })

  test("Esc cancels", async () => {
    const { list, commit } = plainList("<div>a</div><div>b</div><div>c</div>")
    press(list.children[0], 20)
    moveTo(30)
    moveTo(80)
    await frame()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    lift()
    await frame()
    expect(commit).not.toHaveBeenCalled()
    expect(list.children[0].hasAttribute("data-sortable-source")).toBe(false)
  })

  test("a drop on its own place is no move", async () => {
    const { list, commit } = plainList("<div>a</div><div>b</div><div>c</div>")
    press(list.children[0], 20)
    moveTo(30)
    moveTo(45)
    await frame()
    lift()
    await frame()
    expect(commit).not.toHaveBeenCalled()
  })

  test("far from the list is no move", async () => {
    const { list, commit } = plainList("<div>a</div><div>b</div><div>c</div>")
    press(list.children[0], 20)
    moveTo(30)
    moveTo(500)
    await frame()
    lift()
    await frame()
    expect(commit).not.toHaveBeenCalled()
  })

  test("a control in a row does not drag", async () => {
    const { list, commit } = plainList("<div><input></div><div>b</div><div>c</div>")
    await dragFirstBelowSecond(list.querySelector("input") as Element)
    expect(commit).not.toHaveBeenCalled()
  })

  test("a grip in sight is the only way to drag", async () => {
    const row = "<div><button data-sortable-handle></button><span>text</span></div>"
    const { list, commit } = plainList(row + row + row, 'data-handles="true"')
    await dragFirstBelowSecond(list.querySelector("span") as Element)
    expect(commit).not.toHaveBeenCalled()
    await dragFirstBelowSecond(list.querySelector("button") as Element)
    expect(commit).toHaveBeenCalledWith(0, 1)
  })

  test.each([["by default", ""], ["when asked", 'data-handles="false"']])("a hidden grip leaves the row to drag, %s", async (_, attributes) => {
    const row = "<div><button data-sortable-handle></button><span>text</span></div>"
    const { list, commit } = plainList(row + row + row, attributes)
    await dragFirstBelowSecond(list.querySelector("span") as Element)
    expect(commit).toHaveBeenCalledWith(0, 1)
  })

  test("a table shows its grips by default", async () => {
    const row = "<tr><td><button data-sortable-handle></button></td><td>text</td></tr>"
    document.body.innerHTML = `<table><tbody data-sortable>${row + row + row}</tbody></table>`
    const list = document.querySelector("tbody") as HTMLElement
    const commit = vi.fn()
    list.addEventListener("pointerdown", (event) => sortablePointerDown(event, list, "list", commit))
    await dragFirstBelowSecond(list.querySelectorAll("td")[1])
    expect(commit).not.toHaveBeenCalled()
    await dragFirstBelowSecond(list.querySelector("button") as Element)
    expect(commit).toHaveBeenCalledWith(0, 1)
  })

  test.each([
    ["rows that touch hold still", "", ""],
    ["items that stand apart part", 'style="row-gap: 12px"', "translateY(-4px)"],
  ])("%s", async (_, attributes, expected) => {
    const { list } = plainList("<div>a</div><div>b</div><div>c</div>", attributes)
    press(list.children[0], 20)
    moveTo(30)
    moveTo(80)
    await frame()
    expect((list.children[1] as HTMLElement).style.transform).toBe(expected)
    lift()
    await frame()
    expect((list.children[1] as HTMLElement).style.transform).toBe("")
  })

  test("the chip takes the first text, not all of it", async () => {
    const { list } = plainList("<div><div><div>Orders</div><div>1,204</div></div></div><div>b</div>")
    press(list.children[0], 20)
    moveTo(30)
    await frame()
    expect(document.body.lastElementChild?.previousElementSibling?.textContent).toBe("Orders")
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    lift()
    await frame()
  })

  test("a nested list keeps its own drags", async () => {
    document.body.innerHTML = "<div data-sortable><div><div data-sortable><div>a</div></div></div><div>b</div></div>"
    const outer = document.body.firstElementChild as HTMLElement
    const commit = vi.fn()
    outer.addEventListener("pointerdown", (event) => sortablePointerDown(event, outer, "list", commit))
    press(outer.querySelector("[data-sortable] [data-sortable] > div") as Element, 20)
    moveTo(70)
    await frame()
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
    lift()
  })

  test("touch waits for the hold, a swipe scrolls", async () => {
    vi.useFakeTimers()
    const { list } = plainList("<div>a</div><div>b</div>")
    press(list.children[0], 20, "touch")
    moveTo(40)
    vi.advanceTimersByTime(300)
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
    lift()

    press(list.children[0], 20, "touch")
    vi.advanceTimersByTime(300)
    expect(document.querySelector("[data-sortable-source]")).not.toBeNull()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    vi.useRealTimers()
  })
})

describe("Sortable components", () => {
  test("React reports the new order", async () => {
    const onChange = vi.fn()
    const Demo = () => {
      const [value, setValue] = useState(ITEMS)
      return createElement(
        RSortable,
        { value, onChange: (next: string[]) => (onChange(next), setValue(next)) },
        value.map((item) => createElement("div", { key: item }, item)),
      )
    }
    const { container } = render(createElement(Demo))
    const list = container.querySelector("[data-sortable]") as HTMLElement
    await act(async () => {
      await dragFirstBelowSecond(list.children[0])
    })
    expect(onChange).toHaveBeenCalledWith(["b", "a", "c"])
    expect([...list.children].map((row) => row.textContent)).toEqual(["b", "a", "c"])
  })

  test("Vue reports the new order", async () => {
    const value = ref(ITEMS)
    const change = vi.fn()
    mountVue(() =>
      h(
        Sortable,
        {
          "value": value.value,
          "onUpdate:value": (next: unknown[]) => (value.value = next as string[]),
          "onChange": change,
        },
        () => value.value.map((item) => h("div", { key: item }, item)),
      ),
    )
    await flushVue()
    const list = document.querySelector("[data-sortable]") as HTMLElement
    await dragFirstBelowSecond(list.children[0])
    await flushVue()
    expect(change).toHaveBeenCalledWith(["b", "a", "c"])
    expect([...list.children].map((row) => row.textContent)).toEqual(["b", "a", "c"])
  })

  test.each([["ArrowDown", ["b", "a", "c"]], ["ArrowUp", ["a", "b", "c"]]])("the handle takes %s", async (key, expected) => {
    const seen: Record<string, unknown> = {}
    const value = ref(ITEMS)
    mountVue(() =>
      h(
        Sortable,
        { "value": value.value, "onUpdate:value": (next: unknown[]) => (value.value = next as string[]) },
        () => value.value.map((item) => h("div", { key: item }, [h(SortableHandle), item])),
      ),
    )
    const Demo = () => {
      const [order, setOrder] = useState(ITEMS)
      useEffect(() => { seen.react = order }, [order])
      return createElement(
        RSortable,
        { value: order, onChange: setOrder, "data-react": "" },
        order.map((item) => createElement("div", { key: item }, createElement(RSortable.Handle), item)),
      )
    }
    render(createElement(Demo))
    await flushVue()
    const vueHandle = document.querySelector("[data-sortable]:not([data-react]) [data-sortable-handle]") as HTMLElement
    const reactHandle = document.querySelector("[data-react] [data-sortable-handle]") as HTMLElement
    await interact(async () => {
      reactHandle.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
      vueHandle.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
      await frame()
    })
    expect(seen.react).toEqual(expected)
    expect(value.value).toEqual(expected)
  })

  test("disabled does nothing", async () => {
    const onChange = vi.fn()
    const { container } = render(
      createElement(RSortable, { value: ITEMS, onChange, disabled: true }, ITEMS.map((item) => createElement("div", { key: item }, item))),
    )
    const list = container.querySelector("[data-sortable]") as HTMLElement
    await dragFirstBelowSecond(list.children[0])
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("Sortable group", () => {
  // Two lists of rows 40px high: one at the top of the page, one 200px down
  const TOPS: Record<string, number> = { one: 0, two: 200 }

  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const parent = this.parentElement
      if (parent?.hasAttribute("data-sortable")) {
        return rect(TOPS[parent.dataset.name as string] + [...parent.children].indexOf(this) * ROW_HEIGHT, ROW_HEIGHT)
      }
      if (this.hasAttribute("data-sortable")) {
        return rect(TOPS[(this as HTMLElement).dataset.name as string], this.children.length * ROW_HEIGHT)
      }
      return rect(0, 0)
    })
    document.elementFromPoint = () => null
  })

  /** Two plain lists of one group */
  const twoLists = (one: string, two: string, attributes = "", firstAttributes = "") => {
    document.body.innerHTML = `
      <div data-sortable data-group="dishes" data-name="one" ${firstAttributes}>${one}</div>
      <div data-sortable data-group="dishes" data-name="two" ${attributes}>${two}</div>
    `
    const [first, second] = document.querySelectorAll<HTMLElement>("[data-sortable]")
    const commit = vi.fn()
    const move = vi.fn()
    const hold = vi.fn()
    first.addEventListener("pointerdown", (event) => sortablePointerDown(event, first, "list", commit, { move, hold }))
    return { first, second, commit, move, hold }
  }

  const dragTo = async (target: Element, y: number) => {
    press(target, 20)
    moveTo(30)
    moveTo(y)
    await frame()
    lift()
    await frame()
  }

  test("an item lands in the gap of the other list", async () => {
    const { first, commit, move } = twoLists("<div>a</div><div>b</div>", "<div>c</div><div>d</div>")
    await dragTo(first.children[0], 240)
    expect(move).toHaveBeenCalledWith(0, "two", 1)
    expect(commit).not.toHaveBeenCalled()
  })

  test("inside its own list it stays a plain reorder", async () => {
    const { first, commit, move } = twoLists("<div>a</div><div>b</div><div>c</div>", "<div>d</div>")
    await dragTo(first.children[0], 80)
    expect(commit).toHaveBeenCalledWith(0, 1)
    expect(move).not.toHaveBeenCalled()
  })

  test("a disabled list takes nothing", async () => {
    const { first, commit, move } = twoLists("<div>a</div><div>b</div>", "<div>c</div>", "data-disabled")
    await dragTo(first.children[0], 240)
    expect(move).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
  })

  test("an empty list takes an item", async () => {
    const { first, move } = twoLists("<div>a</div><div>b</div>", '<div data-sortable-static>No items yet</div>')
    await dragTo(first.children[0], 220)
    expect(move).toHaveBeenCalledWith(0, "two", 0)
  })

  test("a head row stands among the items and is not one", async () => {
    const { first, second, move } = twoLists("<div>a</div>", "<div data-sortable-static>Head</div><div>b</div><div>c</div>")
    expect(second.children).toHaveLength(3)
    await dragTo(first.children[0], 240)
    expect(move).toHaveBeenCalledWith(0, "two", 0)
  })

  test("a head row does not drag", async () => {
    const { first, commit, move } = twoLists("<div data-sortable-static>Head</div><div>a</div><div>b</div>", "<div>c</div>")
    await dragTo(first.children[0], 240)
    expect(commit).not.toHaveBeenCalled()
    expect(move).not.toHaveBeenCalled()
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
  })

  test("a control that opens its row lets a pull through", async () => {
    const { first, commit } = twoLists("<div><button data-sortable-grab>a</button></div><div>b</div><div>c</div>", "<div>d</div>")
    await dragTo(first.querySelector("button") as Element, 80)
    expect(commit).toHaveBeenCalledWith(0, 1)
  })

  test("the chip takes a marked picture over the row's own", async () => {
    const { first } = twoLists('<div><i data-sortable-image hidden style="background: red"></i>a</div><div>b</div>', "<div>c</div>")
    press(first.children[0], 20)
    moveTo(30)
    const picture = document.body.querySelector(":scope > div:not([data-sortable]) i") as HTMLElement
    expect(picture.hidden).toBe(false)
    expect(picture.style.background).toBe("red")
    lift()
    await frame()
  })

  describe("target", () => {
    const withTarget = (name: string) => {
      const lists = twoLists("<div>a</div><div>b</div>", "<div>c</div>")
      const target = document.createElement("button")
      target.dataset.sortableTarget = "dishes"
      target.dataset.name = name
      document.body.append(target)
      document.elementFromPoint = () => target
      return { ...lists, target }
    }

    test("takes the item whole, with no place", async () => {
      const { first, move } = withTarget("far")
      await dragTo(first.children[0], 400)
      expect(move).toHaveBeenCalledWith(0, "far")
    })

    test("marks itself while the drag is over it", async () => {
      const { first, target } = withTarget("far")
      press(first.children[0], 20)
      moveTo(30)
      await frame()
      expect(target.hasAttribute("data-over")).toBe(true)
      lift()
      await frame()
      expect(target.hasAttribute("data-over")).toBe(false)
    })

    test("a drop on the list's own target is no move", async () => {
      const { first, move, commit } = withTarget("one")
      await dragTo(first.children[0], 400)
      expect(move).not.toHaveBeenCalled()
      expect(commit).not.toHaveBeenCalled()
    })

    test("a rest on it says so once, a pass over it does not", async () => {
      const { first, hold } = withTarget("far")
      press(first.children[0], 20)
      moveTo(30)
      await frame()
      expect(hold).not.toHaveBeenCalled()
      await new Promise((done) => setTimeout(done, 520))
      expect(hold).toHaveBeenCalledTimes(1)
      expect(hold).toHaveBeenCalledWith("far")
      lift()
      await frame()
    })
  })

  describe("keyboard", () => {
    const key = (list: HTMLElement, code: string, commit: () => void, move: () => void) => {
      const handle = list.querySelector("[data-sortable-handle]") as HTMLElement
      const event = new KeyboardEvent("keydown", { key: code, bubbles: true, cancelable: true })
      Object.defineProperty(event, "target", { value: handle })
      return sortableKeyDown(event, list, commit, { move })
    }

    test("past the end of a list an arrow goes on to the next", async () => {
      const row = "<div><button data-sortable-handle></button>a</div>"
      const { first, move, commit } = twoLists(row, "<div>c</div>")
      await key(first, "ArrowDown", commit, move)
      expect(move).toHaveBeenCalledWith(0, "two", 0)
    })

    test("past the first list there is nowhere to go", async () => {
      const row = "<div><button data-sortable-handle></button>a</div>"
      const { first, move, commit } = twoLists(row, "<div>c</div>")
      await key(first, "ArrowUp", commit, move)
      expect(move).not.toHaveBeenCalled()
    })
  })

  // Only onto a target (reach "targets"), or the list itself and the targets (reach "list")
  describe("reach", () => {
    const reaching = (reach: string, firstAttributes = `data-reach="${reach}"`, attributes = "") => {
      const lists = twoLists("<div><button data-sortable-handle></button>a</div><div>b</div><div>c</div>", "<div>d</div>", attributes, firstAttributes)
      const target = document.createElement("button")
      target.dataset.sortableTarget = "dishes"
      target.dataset.name = "far"
      document.body.append(target)
      return { ...lists, target }
    }
    const key = (list: HTMLElement, code: string, commit: () => void, move: () => void) => {
      const handle = list.querySelector("[data-sortable-handle]") as HTMLElement
      const event = new KeyboardEvent("keydown", { key: code, bubbles: true, cancelable: true })
      Object.defineProperty(event, "target", { value: handle })
      return { event, done: sortableKeyDown(event, list, commit, { move }) }
    }

    test("targets: a drop on a target takes the item whole", async () => {
      const { first, move, target } = reaching("targets")
      document.elementFromPoint = () => target
      await dragTo(first.children[0], 400)
      expect(move).toHaveBeenCalledWith(0, "far")
    })

    test("targets: no line, nothing parts, and a drop in the list or another list puts the item back", async () => {
      const { first, commit, move } = reaching("targets")
      press(first.children[0], 20)
      moveTo(30)
      moveTo(80)
      await frame()
      expect((document.querySelector('[class*="Line"]') as HTMLElement).hidden).toBe(true)
      expect((first.children[2] as HTMLElement).style.transform).toBe("")
      moveTo(240)
      await frame()
      expect((document.querySelector('[class*="Line"]') as HTMLElement).hidden).toBe(true)
      lift()
      await frame()
      expect(commit).not.toHaveBeenCalled()
      expect(move).not.toHaveBeenCalled()
      expect(first.hasAttribute("data-dragging")).toBe(false)
    })

    test("targets: the arrow keys leave the order", async () => {
      const { first, commit, move } = reaching("targets")
      const down = key(first, "ArrowDown", commit, move)
      await down.done
      const up = key(first, "ArrowUp", commit, move)
      await up.done
      expect(commit).not.toHaveBeenCalled()
      expect(move).not.toHaveBeenCalled()
      expect(down.event.defaultPrevented).toBe(false)
    })

    test("list: reorders itself and drops on a target, but gives nothing to another list", async () => {
      const { first, commit, move, target } = reaching("list")
      await dragTo(first.children[0], 80)
      expect(commit).toHaveBeenCalledWith(0, 1)
      await dragTo(first.children[0], 240)
      expect(move).not.toHaveBeenCalled()
      document.elementFromPoint = () => target
      await dragTo(first.children[0], 400)
      expect(move).toHaveBeenCalledWith(0, "far")
    })

    test("list: past its end the arrow keys stop", async () => {
      const { first, commit, move } = reaching("list")
      await key(first, "ArrowUp", commit, move).done
      expect(move).not.toHaveBeenCalled()
      expect(commit).not.toHaveBeenCalled()
    })

    test("a list of the group takes nothing from a list that keeps to itself", async () => {
      // The first list trades as a group; the second keeps its items to itself
      const { first, commit, move } = reaching("group", "", 'data-reach="list"')
      await dragTo(first.children[0], 240)
      expect(move).not.toHaveBeenCalled()
      expect(commit).not.toHaveBeenCalled()
    })
  })

  test.each(["react", "vue"])("%s passes reach to the list", async (port) => {
    if (port === "react") {
      render(createElement(RSortable, { value: ["a"], group: "dishes", name: "one", reach: "targets" }, createElement("div", null, "a")))
    } else {
      mountVue(() => h(Sortable, { value: ["a"], group: "dishes", name: "one", reach: "targets" }, () => h("div", "a")))
      await flushVue()
    }
    expect((document.querySelector("[data-sortable]") as HTMLElement).dataset.reach).toBe("targets")
  })

  test.each(["react", "vue"])("%s says what moved and where", async (port) => {
    const onMove = vi.fn()
    if (port === "react") {
      render(
        createElement(
          RSortable,
          { value: ["a", "b"], group: "dishes", name: "one", onMove },
          ["a", "b"].map((item) => createElement("div", { key: item }, item)),
        ),
      )
      render(createElement(RSortable, { value: ["c"], group: "dishes", name: "two" }, createElement("div", null, "c")))
    } else {
      mountVue(() =>
        h("div", [
          h(Sortable, { value: ["a", "b"], group: "dishes", name: "one", onMove }, () =>
            ["a", "b"].map((item) => h("div", { key: item }, item)),
          ),
          h(Sortable, { value: ["c"], group: "dishes", name: "two" }, () => h("div", "c")),
        ]),
      )
      await flushVue()
    }
    const list = document.querySelector('[data-name="one"]') as HTMLElement
    await act(async () => {
      await dragTo(list.children[0], 240)
    })
    expect(onMove).toHaveBeenCalledWith({ item: "a", from: "one", fromIndex: 0, to: "two", toIndex: 1 })
  })

  test.each(["react", "vue"])("%s says so for a move inside one list too", async (port) => {
    const onMove = vi.fn()
    if (port === "react") {
      render(
        createElement(
          RSortable,
          { value: ["a", "b", "c"], group: "dishes", name: "one", onMove },
          ["a", "b", "c"].map((item) => createElement("div", { key: item }, item)),
        ),
      )
    } else {
      mountVue(() =>
        h(Sortable, { value: ["a", "b", "c"], group: "dishes", name: "one", onMove }, () =>
          ["a", "b", "c"].map((item) => h("div", { key: item }, item)),
        ),
      )
      await flushVue()
    }
    const list = document.querySelector('[data-name="one"]') as HTMLElement
    await act(async () => {
      await dragTo(list.children[0], 80)
    })
    expect(onMove).toHaveBeenCalledWith({ item: "a", from: "one", fromIndex: 0, to: "one", toIndex: 1 })
  })

  test("the target carries the same marks in both ports", async () => {
    render(createElement(RSortable.Target, { group: "dishes", name: "far", id: "react-target" }, "Far"))
    mountVue(() => h(SortableTarget, { group: "dishes", name: "far", id: "vue-target" }, () => "Far"))
    await flushVue()
    const read = (id: string) => {
      const target = document.getElementById(id) as HTMLElement
      return [target.tagName, target.dataset.sortableTarget, target.dataset.name, target.textContent]
    }
    expect(read("vue-target")).toEqual(read("react-target"))
    expect(read("vue-target")).toEqual(["DIV", "dishes", "far", "Far"])
  })
})

// The same engine is shipped by both ports; exercise actual pointer ownership,
// cancellation and scroll destinations rather than only comparing their markup.
describe.each([
  ["react", sortablePointerDown, sortableKeyDown],
  ["vue", vueSortablePointerDown, vueSortableKeyDown],
] as const)("%s Sortable gesture guards", (_port, pointerDown, keyDown) => {
  const setup = (html = "<div>a</div><div>b</div><div>c</div>") => {
    document.body.innerHTML = `<div data-sortable>${html}</div>`
    const list = document.body.firstElementChild as HTMLElement
    const commit = vi.fn()
    list.addEventListener("pointerdown", (event) => pointerDown(event, list, "list", commit))
    return { list, commit }
  }
  const pointer = (type: string, pointerId: number, y: number, target: EventTarget = window) =>
    target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId, pointerType: "touch", button: 0, clientX: 10, clientY: y,
    }))

  test("only the initiating pointer can move or finish a drag", async () => {
    const { list, commit } = setup('<div><button data-sortable-handle>a</button></div><div><button data-sortable-handle>b</button></div><div>c</div>')
    list.dataset.handles = "true"
    pointer("pointerdown", 11, 20, list.querySelector("button") as Element)
    pointer("pointermove", 12, 80)
    expect(list.hasAttribute("data-dragging")).toBe(false)
    pointer("pointermove", 11, 30)
    pointer("pointerdown", 12, 60, list.children[1].querySelector("button") as Element)
    pointer("pointermove", 11, 80)
    await frame()
    pointer("pointerup", 12, 80)
    pointer("pointercancel", 12, 80)
    expect(list.hasAttribute("data-dragging")).toBe(true)
    expect(document.querySelectorAll(".Chip")).toHaveLength(1)
    expect(commit).not.toHaveBeenCalled()
    pointer("pointerup", 11, 80)
    await frame()
    expect(commit).toHaveBeenCalledExactlyOnceWith(0, 1)
    expect(list.hasAttribute("data-dragging")).toBe(false)
  })

  test.each([false, true])("pointercancel cleans up a %s active hold/drag and permits the next gesture", async (active) => {
    vi.useFakeTimers()
    const { list, commit } = setup()
    pointer("pointerdown", 11, 20, list.children[0])
    if (active) vi.advanceTimersByTime(210)
    pointer("pointercancel", 11, 20)
    vi.advanceTimersByTime(300)
    expect(document.querySelector(".Chip, .Line, [data-sortable-source], [data-dragging]")).toBeNull()
    expect(document.documentElement.classList.contains("Dragging")).toBe(false)
    expect(commit).not.toHaveBeenCalled()
    pointer("pointerdown", 11, 20, list.children[0])
    vi.advanceTimersByTime(210)
    expect(list.hasAttribute("data-dragging")).toBe(true)
    pointer("pointercancel", 11, 20)
  })

  test("a removed source cannot turn index -1 into a move of the last item", async () => {
    const { list, commit } = setup()
    press(list.children[0], 20)
    moveTo(30)
    list.children[0].remove()
    moveTo(80)
    await frame()
    lift()
    await frame()
    expect(commit).not.toHaveBeenCalled()
    expect(document.querySelector(".Chip, .Line, [data-dragging]")).toBeNull()
  })

  test("preventDefault cancels both pointer and keyboard reordering", async () => {
    const { list, commit } = setup('<div><button data-sortable-handle>a</button></div><div>b</div>')
    list.dataset.handles = "true"
    const handle = list.querySelector("button") as HTMLElement
    handle.addEventListener("pointerdown", (event) => event.preventDefault())
    pointer("pointerdown", 11, 20, handle)
    pointer("pointermove", 11, 80)
    await frame()
    pointer("pointerup", 11, 80)
    const event = new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true })
    Object.defineProperty(event, "target", { value: handle })
    event.preventDefault()
    await keyDown(event, list, commit)
    expect(commit).not.toHaveBeenCalled()
  })

  test("a focused static row cannot reorder an item", async () => {
    const { list, commit } = setup('<div data-sortable-static tabindex="0">Heading</div><div>a</div><div>b</div>')
    const event = new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true })
    Object.defineProperty(event, "target", { value: list.children[0] })
    await keyDown(event, list, commit)
    expect(commit).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  test("autoscroll follows another accepted list's scroll pane", async () => {
    document.body.innerHTML = `
      <div id="left" style="overflow-y:auto"><div data-sortable data-group="g" data-name="one"><div>a</div><div>b</div></div></div>
      <div id="right" style="overflow-y:auto"><div data-sortable data-group="g" data-name="two"><div>c</div><div>d</div></div></div>`
    const left = document.getElementById("left") as HTMLElement
    const right = document.getElementById("right") as HTMLElement
    const first = left.firstElementChild as HTMLElement
    const second = right.firstElementChild as HTMLElement
    for (const pane of [left, right]) {
      Object.defineProperties(pane, { scrollHeight: { value: 600 }, clientHeight: { value: 200 } })
    }
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const top = right.contains(this) || this === right ? 200 : 0
      if (this === left || this === right) return rect(top, 200)
      if (this.hasAttribute("data-sortable")) return rect(top, 400)
      if (this.parentElement?.hasAttribute("data-sortable")) return rect(top + [...this.parentElement.children].indexOf(this) * ROW_HEIGHT, ROW_HEIGHT)
      return rect(top, 0)
    })
    document.elementFromPoint = (_x, y) => y >= 200 ? second : first
    first.addEventListener("pointerdown", (event) => pointerDown(event, first, "list", vi.fn(), { move: vi.fn() }))
    press(first.children[0], 20)
    moveTo(30)
    left.scrollTop = 100
    moveTo(390)
    await frame()
    expect(right.scrollTop).toBeGreaterThan(0)
    expect(left.scrollTop).toBe(100)
    window.dispatchEvent(new PointerEvent("pointercancel"))
  })

  test.each(["list", "grid"] as const)("a self-scrolling %s destination keeps its insertion coordinates", async (layout) => {
    document.body.innerHTML = `<div data-sortable data-group="g" data-name="one"><div>a</div><div>b</div></div><div data-sortable data-group="g" data-name="two" style="overflow:auto">${Array.from({ length: 20 }, (_, index) => `<div>${index}</div>`).join("")}</div>`
    const [first, second] = document.querySelectorAll<HTMLElement>("[data-sortable]")
    const move = vi.fn()
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this === second) return rect(200, 200, 0, 200)
      if (this.parentElement === second) {
        const index = [...second.children].indexOf(this)
        return layout === "list"
          ? rect(200 + index * ROW_HEIGHT - second.scrollTop, ROW_HEIGHT, -second.scrollLeft, 200)
          : rect(200 - second.scrollTop, 200, index * 80 - second.scrollLeft, 80)
      }
      if (this === first) return rect(0, 80)
      if (this.parentElement === first) return rect([...first.children].indexOf(this) * ROW_HEIGHT, ROW_HEIGHT)
      return rect(0, 0)
    })
    document.elementFromPoint = () => second
    first.addEventListener("pointerdown", (event) => pointerDown(event, first, layout, vi.fn(), { move }))
    press(first.children[0], 20)
    moveTo(30)
    second.scrollTop = layout === "list" ? 120 : 0
    second.scrollLeft = layout === "grid" ? 120 : 0
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 40, clientY: 320 }))
    await frame()
    const line = document.querySelector<HTMLElement>(".Line")
    expect(line?.hidden).toBe(false)
    expect(line?.style.transform).toBe(layout === "list" ? "translate(16px, 319px)" : "translate(39px, 200px)")
    lift()
    await frame()
    expect(move).toHaveBeenCalledExactlyOnceWith(0, "two", layout === "list" ? 6 : 2)
  })

  test("a destination disabled after measuring cannot receive the drop", async () => {
    document.body.innerHTML = '<div data-sortable data-group="g" data-name="one"><div>a</div><div>b</div></div><div data-sortable data-group="g" data-name="two"><div>c</div><div>d</div></div>'
    const [first, second] = document.querySelectorAll<HTMLElement>("[data-sortable]")
    const move = vi.fn()
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const top = second.contains(this) ? 200 : 0
      if (this.hasAttribute("data-sortable")) return rect(top, 80)
      if (this.parentElement?.hasAttribute("data-sortable")) {
        return rect(top + [...this.parentElement.children].indexOf(this) * ROW_HEIGHT, ROW_HEIGHT)
      }
      return rect(0, 0)
    })
    document.elementFromPoint = () => second
    first.addEventListener("pointerdown", (event) => pointerDown(event, first, "list", vi.fn(), { move }))
    press(first.children[0], 20)
    moveTo(30)
    moveTo(240)
    await frame()
    expect(document.querySelector<HTMLElement>(".Line")?.hidden).toBe(false)
    lift()
    await frame()
    expect(move).toHaveBeenCalledExactlyOnceWith(0, "two", 1)
    move.mockClear()
    press(first.children[0], 20)
    moveTo(30)
    moveTo(240)
    await frame()
    expect(document.querySelector<HTMLElement>(".Line")?.hidden).toBe(false)
    second.setAttribute("data-disabled", "")
    lift()
    await frame()
    expect(move).not.toHaveBeenCalled()
  })
})

describe.each(["react", "vue"] as const)("%s Sortable lifecycle", (port) => {
  const mount = async (handlers: { pointer?: (event: Event) => void; key?: (event: Event) => void } = {}) => {
    const change = vi.fn()
    let list: HTMLElement
    let disable: () => Promise<void>
    let unmount: () => void
    if (port === "react") {
      const tree = (disabled = false) => createElement(RSortable, {
        value: ITEMS, disabled, handles: true, onChange: change,
        onPointerDown: handlers.pointer ? (event) => handlers.pointer?.(event.nativeEvent) : undefined,
        onKeyDown: handlers.key ? (event) => handlers.key?.(event.nativeEvent) : undefined,
      }, ITEMS.map((item) => createElement("div", { key: item }, createElement(RSortable.Handle), item)))
      const app = render(tree())
      list = app.container.querySelector("[data-sortable]") as HTMLElement
      disable = async () => { await interact(() => app.rerender(tree(true))) }
      unmount = app.unmount
    } else {
      const disabled = ref(false)
      const app = mountVue(() => h(Sortable, {
        value: ITEMS, disabled: disabled.value, handles: true, onChange: change,
        onPointerdown: handlers.pointer, onKeydown: handlers.key,
      }, () => ITEMS.map((item) => h("div", { key: item }, [h(SortableHandle), item]))))
      await flushVue()
      list = app.container.querySelector("[data-sortable]") as HTMLElement
      disable = async () => { await interact(() => { disabled.value = true }) }
      unmount = app.unmount
    }
    return { list, change, disable, unmount }
  }

  test.each(["disable", "unmount"] as const)("%s cancels a pending touch hold and releases scroll", async (action) => {
    vi.useFakeTimers()
    const app = await mount()
    // Whole-row holds are used when handles are hidden.
    app.list.dataset.handles = "false"
    press(app.list.children[0], 20, "touch")
    await interact(() => app[action]())
    vi.advanceTimersByTime(300)
    const touch = new Event("touchmove", { cancelable: true })
    window.dispatchEvent(touch)
    expect(touch.defaultPrevented).toBe(false)
    expect(document.querySelector(".Chip, .Line, [data-dragging]")).toBeNull()
    expect(app.change).not.toHaveBeenCalled()
  })

  test.each(["disable", "unmount"] as const)("%s cancels an active drag without committing", async (action) => {
    const app = await mount()
    press(app.list.querySelector("button") as Element, 20)
    moveTo(30)
    moveTo(80)
    await frame()
    await interact(() => app[action]())
    lift()
    await frame()
    expect(app.change).not.toHaveBeenCalled()
    expect(document.querySelector(".Chip, .Line, [data-dragging]")).toBeNull()
    expect(document.documentElement.classList.contains("Dragging")).toBe(false)
  })

  test("consumer event handlers run first and may prevent reordering", async () => {
    const pointer = vi.fn((event: Event) => event.preventDefault())
    const key = vi.fn((event: Event) => event.preventDefault())
    const app = await mount({ pointer, key })
    const handle = app.list.querySelector("button") as HTMLElement
    handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: 20 }))
    moveTo(80)
    await frame()
    lift()
    await interact(() => {
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }))
    })
    expect(pointer).toHaveBeenCalledTimes(1)
    expect(key).toHaveBeenCalledTimes(1)
    expect(app.change).not.toHaveBeenCalled()
  })
})

// Plan 176 item 5: an item with a context menu (a ContextMenu.Trigger on it or in it) shares one touch and hold with
// the menu, as an iOS preview: the drag waits for the menu, and once it stands the finger moving on closes it and drags.
describe.each([
  ["React", sortablePointerDown],
  ["Vue", vueSortablePointerDown],
] as const)("%s Sortable shares the hold of a context menu", (_, pointerDown) => {
  const menuList = (html = "<div data-context-menu-trigger>a</div><div>b</div><div>c</div>") => {
    document.body.innerHTML = `<div data-sortable>${html}</div>`
    const list = document.body.firstElementChild as HTMLElement
    const commit = vi.fn()
    list.addEventListener("pointerdown", (event) => pointerDown(event, list, "list", commit))
    return { list, commit }
  }
  const hold = (element: Element, pointerId = 0) => {
    const close = vi.fn()
    element.dispatchEvent(new CustomEvent(CONTEXT_MENU_HOLD, { bubbles: true, detail: { pointerId, close } }))
    return close
  }
  const scrolls = () => {
    const touch = new Event("touchmove", { cancelable: true })
    window.dispatchEvent(touch)
    return !touch.defaultPrevented
  }

  test("the drag waits for the menu, then the finger moving on closes the menu and drags", async () => {
    vi.useFakeTimers()
    const { list, commit } = menuList()
    press(list.children[0], 20, "touch")
    vi.advanceTimersByTime(300)
    // A Sortable alone lifts at 200ms: here the menu's hold decides
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
    const close = hold(list.children[0])
    // The finger holds the preview: the page under it does not scroll
    expect(scrolls()).toBe(false)
    moveTo(22)
    expect(close).not.toHaveBeenCalled()
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
    moveTo(30)
    expect(close).toHaveBeenCalledTimes(1)
    expect(list.children[0].hasAttribute("data-sortable-source")).toBe(true)
    moveTo(80)
    vi.advanceTimersByTime(20)
    lift()
    vi.useRealTimers()
    await frame()
    expect(commit).toHaveBeenCalledWith(0, 1)
  })

  test("a trigger inside the item shares the hold too; one around the list does not", () => {
    vi.useFakeTimers()
    const { list } = menuList("<div><span data-context-menu-trigger>a</span></div><div>b</div>")
    press(list.querySelector("span") as Element, 20, "touch")
    vi.advanceTimersByTime(300)
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
    lift()

    document.body.innerHTML = "<div data-context-menu-trigger><div data-sortable><div>a</div><div>b</div></div></div>"
    const outer = document.querySelector<HTMLElement>("[data-sortable]") as HTMLElement
    outer.addEventListener("pointerdown", (event) => pointerDown(event, outer, "list", vi.fn()))
    press(outer.children[0], 20, "touch")
    vi.advanceTimersByTime(300)
    expect(outer.children[0].hasAttribute("data-sortable-source")).toBe(true)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
  })

  test("before the menu opens a touch that moves past the menu's 10px scrolls, and the hold then drags nothing", () => {
    vi.useFakeTimers()
    const { list } = menuList()
    press(list.children[0], 20, "touch")
    moveTo(27)
    vi.advanceTimersByTime(300)
    moveTo(32)
    const close = hold(list.children[0])
    expect(scrolls()).toBe(true)
    moveTo(80)
    expect(close).not.toHaveBeenCalled()
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
  })

  test("a release with the menu open drags nothing and lets the page scroll", () => {
    vi.useFakeTimers()
    const { list, commit } = menuList()
    press(list.children[0], 20, "touch")
    const close = hold(list.children[0])
    lift()
    expect(scrolls()).toBe(true)
    moveTo(80)
    expect(close).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
  })

  test("the hold of another touch is not this one's", () => {
    vi.useFakeTimers()
    const { list } = menuList()
    press(list.children[0], 20, "touch")
    const close = hold(list.children[0], 3)
    moveTo(80)
    expect(close).not.toHaveBeenCalled()
    expect(document.querySelector("[data-sortable-source]")).toBeNull()
    lift()
  })
})
