import { act, cleanup, render } from "@testing-library/react"
import { createElement, useState, type ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, ref } from "vue"
import { Sortable as RSortable } from "../../packages/ui/src/components/Sortable"
import { TagInput as RTagInput } from "../../packages/ui/src/components/TagInput"
import { Textarea as RTextarea } from "../../packages/ui/src/components/Textarea"
import { moveItem, sortableKeyDown, sortablePointerDown } from "../../packages/ui/src/lib/sortable"
import { Sortable, SortableHandle, SortableTarget } from "../../packages/vue/src/components/Sortable"
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
  cleanup()
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
      seen.react = order
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
  const twoLists = (one: string, two: string, attributes = "") => {
    document.body.innerHTML = `
      <div data-sortable data-group="dishes" data-name="one">${one}</div>
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
