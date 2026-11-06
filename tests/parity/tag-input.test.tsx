import { cleanup, fireEvent, render, within } from "@testing-library/react"
import { createElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, isProxy, shallowRef } from "vue"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { TagInput as RTagInput } from "../../packages/ui/src/components/TagInput"
import { Field } from "../../packages/vue/src/components/Field"
import { TagInput } from "../../packages/vue/src/components/TagInput"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} })
  // jsdom has no layout: a 300px container, 80px chips, 7px per measured character
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement
    const box = (left: number, width: number) => ({ left, right: left + width, top: 0, bottom: 20, width, height: 20, x: left, y: 0, toJSON() {} }) as DOMRect
    if (el.matches?.("[data-tag]")) {
      const index = Array.from(el.parentElement?.querySelectorAll("[data-tag]") ?? []).indexOf(el)
      return box(index * 80, 80)
    }
    if (el.matches?.('[tabindex="-1"][data-size]')) return box(0, 300)
    return box(0, (el.textContent?.length ?? 0) * 7)
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const tags = (...values: string[]) => values.map((value) => ({ value, valid: !value.startsWith("bad") }))

const cases: Array<[string, Props]> = [
  ["empty", {}],
  ["placeholder", { placeholder: "Add emails" }],
  ["default tags, one invalid", { defaultValue: tags("a@b.co", "bad@x") }],
  ["size, pill, rows, id", { size: "md", pill: true, rows: 3, id: "emails" }],
  ["disabled", { disabled: true, defaultValue: tags("a") }],
  ["max tags counter", { maxTags: 5, defaultValue: tags("a", "b") }],
  ["max tags reached hides the input", { maxTags: 2, defaultValue: tags("a", "b") }],
  ["max tags reached while disabled", { maxTags: 2, defaultValue: tags("a", "b"), disabled: true }],
  ["maxTags 0 means no limit: no counter", { maxTags: 0 }],
  ["controlled", { value: tags("x", "y") }],
]

describe("TagInput parity", () => {
  test.each(cases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(createElement(RTagInput, props as never), () => h(TagInput, props as never))
    expect(vue).toBe(react)
  })

  test("maxTags 0 renders no counter and no stray 0, the input stays", async () => {
    const { react } = await renderPair(createElement(RTagInput, { maxTags: 0 } as never), () => h(TagInput, { maxTags: 0 } as never))
    expect(react).not.toMatch(/class="Limit"/)
    expect(react).not.toMatch(/^\s*"0"$/m)
    expect(react).toMatch(/<input/)
  })
})

describe("TagInput inside Field", () => {
  // Field passes id, aria-describedby and aria-invalid to its child. React's
  // TagInput reads only `id`; the Vue port drops the rest instead of warning
  // about attributes on its multi-root render
  test("matches React and drops the attributes it does not read", async () => {
    const { react, vue } = await renderPair(
      createElement(RField, { label: "Tags", description: "Up to five", errorMessage: "Required" }, createElement(RTagInput, { placeholder: "Add a tag" })),
      () => h(Field, { label: "Tags", description: "Up to five", errorMessage: "Required" }, () => h(TagInput, { placeholder: "Add a tag" })),
    )
    expect(vue).toBe(react)
  })
})

describe("TagInput behaviour parity", () => {
  // Same keyboard/mouse script on both; returns DOM snapshots and change payloads
  const walk = async (props: Props, steps: (snap: () => void, input: () => HTMLInputElement) => Promise<void>) => {
    const result = { react: [] as string[], vue: [] as string[], reactChanges: [] as unknown[], vueChanges: [] as unknown[] }
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    render(createElement(RTagInput, { ...props, onChange: (t: unknown) => result.reactChanges.push(t) } as never))
    await interact(() => {})
    await steps(() => result.react.push(serializeDom()), () => document.querySelector("input")!)
    cleanup()
    mountVue(() => h(TagInput, { ...props, onChange: (t: unknown) => result.vueChanges.push(t) } as never))
    await flushVue()
    await steps(() => result.vue.push(serializeDom()), () => document.querySelector("input")!)
    return result
  }

  const type = (input: HTMLInputElement, value: string) => interact(() => fireEvent.input(input, { target: { value } }))
  const key = (el: Element, k: string) => interact(() => fireEvent.keyDown(el, { key: k }))

  test("enter, delimiters, duplicates and validation", async () => {
    const result = await walk({ validator: (v: string) => v.includes("@") }, async (snap, input) => {
      await type(input(), "a@b.co")
      await key(input(), "Enter")
      snap()
      await type(input(), "plain")
      await key(input(), ",")
      snap()
      await type(input(), "a@b.co")
      await key(input(), " ")
      snap() // duplicate shakes
      await interact(() => vi.advanceTimersByTime(500))
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.react[2]).toContain("data-duplicate")
    expect(result.react[1]).toContain("data-invalid")
  })

  test("backspace and arrows select and remove tags", async () => {
    const result = await walk({ defaultValue: tags("one", "two", "three") }, async (snap, input) => {
      const container = () => document.querySelector("[data-size]")!
      await interact(() => fireEvent.focus(input()))
      await key(container(), "Backspace") // selects "three"
      snap()
      await key(container(), "ArrowLeft") // selects "two"
      snap()
      await key(container(), "ArrowRight") // back to "three"
      await key(container(), "Backspace") // removes "three"
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([tags("one", "two")])
  })

  test("paste splits by delimiters; outside click commits the pending input", async () => {
    const result = await walk({}, async (snap, input) => {
      await interact(() => {
        const event = new Event("paste", { bubbles: true, cancelable: true })
        Object.assign(event, { clipboardData: { getData: () => "a, b c" } })
        input().dispatchEvent(event)
      })
      snap()
      await type(input(), "pending")
      await interact(() => fireEvent.mouseDown(document.body))
      snap()
      await interact(() => fireEvent.click(document.querySelector('[data-tag] button')!))
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    // Every pasted part lands in one change
    expect(result.reactChanges).toEqual([tags("a", "b", "c"), tags("a", "b", "c", "pending"), tags("b", "c", "pending")])
  })

  const paste = (input: HTMLInputElement, text: string) =>
    interact(() => {
      const event = new Event("paste", { bubbles: true, cancelable: true })
      Object.assign(event, { clipboardData: { getData: () => text } })
      input.dispatchEvent(event)
    })

  test("paste dedupes against existing and pasted tags, shaking the duplicates", async () => {
    const result = await walk({ defaultValue: tags("b"), validator: (v: string) => v !== "bad" }, async (snap, input) => {
      await paste(input(), "a, b a,bad")
      snap() // a and bad added; b and the second a shake
      await interact(() => vi.advanceTimersByTime(500))
      snap()
      await paste(input(), "a,b")
      snap() // all duplicates: no change, both shake
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([[...tags("b", "a"), { value: "bad", valid: false }]])
    expect(result.react[0]).toContain('data-duplicate="" data-tag="a"')
    expect(result.react[0]).toContain('data-duplicate="" data-tag="b"')
    expect(result.react[1]).not.toContain("data-duplicate")
    expect(result.react[2]).toContain('data-duplicate="" data-tag="a"')
  })

  test("paste stops at maxTags", async () => {
    const result = await walk({ maxTags: 3, defaultValue: tags("x") }, async (snap, input) => {
      await paste(input(), "a,b,c,d")
      snap() // a and b added, the input hidden
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([tags("x", "a", "b")])
    expect(result.react[0]).not.toContain("<input")
  })

  test("at maxTags the container is the tab stop, and Backspace removes from there", async () => {
    const result = await walk({ maxTags: 2, defaultValue: tags("a", "b") }, async (snap) => {
      const container = () => document.querySelector("[data-size]") as HTMLElement
      snap()
      await interact(() => container().focus())
      await key(container(), "Backspace") // selects "b"
      await key(container(), "Backspace") // removes "b", the input comes back
      snap()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.react[0]).toMatch(/data-size="xl"[^>]*tabindex="0"/)
    expect(result.reactChanges).toEqual([tags("a")])
    expect(result.react[1]).toContain("<input")
  })

  test("disabled while a tag is selected: keys and an outside click change nothing", async () => {
    const changes = { react: [] as unknown[], vue: [] as unknown[] }
    const pending: string[] = []
    const selected: string[] = []
    let framework: "react" | "vue" = "react"
    const props = (disabled: boolean) => ({ defaultValue: tags("a", "b"), disabled, onChange: (t: unknown) => changes[framework].push(t) })
    const { react, vue } = await walkPairWithState(
      { disabled: false },
      (state) => createElement(RTagInput, props(state.disabled) as never),
      (state) => h(TagInput, props(state.disabled) as never),
      async ({ set, snapshot }) => {
        const container = () => document.querySelector("[data-size]")!
        await interact(() => document.querySelector("input")!.focus())
        await key(container(), "ArrowLeft") // selects "b"
        selected.push(document.activeElement?.getAttribute("data-tag") ?? "")
        await set({ disabled: true })
        await key(container(), "Backspace")
        await key(container(), "ArrowLeft")
        selected.push(document.activeElement?.getAttribute("data-tag") ?? "")
        // CSS turns pointer events off when disabled; jsdom does not apply it
        await interact(() => fireEvent.click(document.querySelector('[data-tag] button')!))
        snapshot()
        await set({ disabled: false })
        // Pending text is kept, not committed, by an outside click while disabled
        await interact(() => fireEvent.input(document.querySelector("input")!, { target: { value: "pending" } }))
        await set({ disabled: true })
        await interact(() => fireEvent.mouseDown(document.body))
        await set({ disabled: false })
        pending.push(document.querySelector("input")!.value)
        snapshot()
        framework = "vue"
      },
    )
    expect(vue).toEqual(react)
    expect(changes).toEqual({ react: [], vue: [] })
    expect(selected).toEqual(["b", "b", "b", "b"])
    expect(react[0]).toContain('data-tag="a"')
    expect(pending).toEqual(["pending", "pending"])
  })

  test("uncontrolled change payloads hold the caller's tag objects, not proxies", async () => {
    const initial = tags("a")
    const changes: Array<Array<{ value: string }>> = []
    mountVue(() => h(TagInput, { defaultValue: initial, onChange: (t: Array<{ value: string }>) => changes.push(t) }))
    await flushVue()
    await interact(() => fireEvent.input(document.querySelector("input")!, { target: { value: "b" } }))
    await interact(() => fireEvent.keyDown(document.querySelector("input")!, { key: "Enter" }))
    await interact(() => fireEvent.click(document.querySelectorAll('[data-tag] button')[1]!))
    expect(changes.map((list) => list.map((tag) => tag.value))).toEqual([["a", "b"], ["a"]])
    expect(changes[1]![0]).toBe(initial[0])
    expect(changes.flat().some((tag) => isProxy(tag))).toBe(false)
  })

  test("selecting a tag whose value needs CSS escaping focuses it", async () => {
    const focused: string[] = []
    const record = () => focused.push(document.activeElement?.getAttribute("data-tag") ?? document.activeElement!.tagName)
    const result = await walk({ defaultValue: tags('say "hi"', "a]b", "c\\d") }, async (snap, input) => {
      const container = () => document.querySelector("[data-size]")!
      await interact(() => input().focus())
      await key(container(), "Backspace") // selects c\d
      snap()
      record()
      await key(container(), "ArrowLeft") // selects a]b
      record()
      await key(container(), "ArrowLeft") // selects say "hi"
      record()
    })
    expect(result.vue).toEqual(result.react)
    expect(focused).toEqual(['c\\d', "a]b", 'say "hi"', 'c\\d', "a]b", 'say "hi"'])
  })
})


describe.each(["React", "Vue"])("%s tag removal focus", (framework) => {
  beforeEach(() => {
    // Vue rejects a bubbled event stamped in the same millisecond as listener
    // installation. Give these immediate synthetic interactions ordered times.
    let eventTime = Date.now()
    vi.spyOn(Date, "now").mockImplementation(() => ++eventTime)
  })

  const mount = async (props: Props) => {
    let update: (next: Props) => void
    if (framework === "React") {
      const view = render(createElement(RTagInput, props as never))
      update = (next) => view.rerender(createElement(RTagInput, next as never))
    } else {
      const state = shallowRef(props)
      mountVue(() => h(TagInput, state.value as never))
      update = (next) => { state.value = next }
    }
    await interact(() => {})
    return (next: Props) => interact(() => update(next))
  }

  test.each([undefined, 2])("a native remove button restores typing, including at maxTags %s", async (maxTags) => {
    await mount({ defaultValue: tags("one", "two"), maxTags })
    const button = within(document.body).getByRole("button", { name: "Remove one" })
    expect(button.tagName).toBe("BUTTON")
    expect(button.getAttribute("type")).toBe("button")
    await interact(() => button.focus())
    expect(document.activeElement).toBe(button)
    // Native Enter/Space activation dispatches this click on the focused button.
    await interact(() => fireEvent.click(button))
    expect(document.querySelector('[data-tag="one"]')).toBeNull()
    const input = document.querySelector("input")!
    expect(document.activeElement).toBe(input)
    await interact(() => fireEvent.input(input, { target: { value: "three" } }))
    await interact(() => fireEvent.keyDown(input, { key: "Enter" }))
    expect(document.querySelector('[data-tag="three"]')).not.toBeNull()
  })

  test("controlled rejected removal keeps focus and emits one request", async () => {
    const onChange = vi.fn()
    await mount({ value: tags("one", "two"), onChange })
    const button = within(document.body).getByRole("button", { name: "Remove one" })
    await interact(() => button.focus())
    await interact(() => fireEvent.click(button))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(tags("two"))
    expect(document.activeElement).toBe(button)
    expect(document.querySelector('[data-tag="one"]')).not.toBeNull()
  })

  test("removing a neighboring chip clears the old keyboard selection before typing resumes", async () => {
    await mount({ defaultValue: tags("one", "two", "three") })
    const input = document.querySelector("input")!
    const third = document.querySelector<HTMLElement>('[data-tag="three"]')!
    await interact(() => input.focus())
    await interact(() => fireEvent.keyDown(input, { key: "ArrowLeft" }))
    expect(document.activeElement).toBe(third)
    // Shift+Tab from the selected third chip reaches the preceding remove button.
    const secondRemove = within(document.body).getByRole("button", { name: "Remove two" })
    await interact(() => secondRemove.focus())
    await interact(() => fireEvent.click(secondRemove))
    expect(document.activeElement).toBe(input)
    await interact(() => fireEvent.keyDown(input, { key: "Backspace" }))
    expect(document.querySelector('[data-tag="three"]')).toBe(third)
    expect(document.activeElement).toBe(third)
  })

  test("controlled rejected Backspace retains the selected chip until actual acceptance", async () => {
    const onChange = vi.fn()
    const update = await mount({ value: tags("one", "two"), maxTags: 2, onChange })
    const container = document.querySelector<HTMLElement>("[data-size]")!
    await interact(() => container.focus())
    await interact(() => fireEvent.keyDown(container, { key: "Backspace" }))
    const second = document.querySelector<HTMLElement>('[data-tag="two"]')!
    expect(document.activeElement).toBe(second)
    await interact(() => fireEvent.keyDown(second, { key: "Backspace" }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(tags("one"))
    expect(document.activeElement).toBe(second)
    await update({ value: tags("one"), maxTags: 2, onChange })
    expect(document.activeElement).toBe(document.querySelector("input"))
  })

  test("delayed controlled acceptance does not recover focus after the user leaves", async () => {
    const onChange = vi.fn()
    const update = await mount({ value: tags("one", "two"), onChange })
    const button = within(document.body).getByRole("button", { name: "Remove one" })
    await interact(() => button.focus())
    await interact(() => fireEvent.click(button))
    const outside = document.createElement("button")
    document.body.append(outside)
    await interact(() => { outside.focus(); outside.blur() })
    expect(document.activeElement).toBe(document.body)
    await update({ value: tags("two"), onChange })
    expect(document.activeElement).toBe(document.body)
  })

  test("a touch gesture outside cancels delayed recovery without committing pending text", async () => {
    const onChange = vi.fn()
    const update = await mount({ value: tags("one", "two"), onChange })
    const input = document.querySelector("input")!
    await interact(() => input.focus())
    await interact(() => fireEvent.input(input, { target: { value: "pending" } }))
    const button = within(document.body).getByRole("button", { name: "Remove one" })
    await interact(() => button.focus())
    await interact(() => fireEvent.click(button))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(tags("two"))
    const outside = document.createElement("div")
    document.body.append(outside)
    // Touch/drag alone: neither a mouse event nor a focus change accompanies it.
    await interact(() => fireEvent.pointerDown(outside, { pointerType: "touch" }))
    expect(document.activeElement).toBe(button)
    expect(input.value).toBe("pending")
    expect(onChange).toHaveBeenCalledTimes(1)
    await update({ value: tags("two"), onChange })
    expect(document.activeElement).toBe(document.body)
    expect(input.value).toBe("pending")
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test.each([
    ["Enter", true, 13],
    [" ", true, 32],
    ["Tab", true, 9],
    ["Enter", false, 229],
  ])("IME %s (composing=%s, code=%s) does not commit or clear pending text", async (key, isComposing, keyCode) => {
    const onChange = vi.fn()
    await mount({ defaultValue: tags("existing"), maxTags: 2, onChange })
    const input = document.querySelector("input")!
    await interact(() => input.focus())
    await interact(() => fireEvent.compositionStart(input))
    await interact(() => fireEvent.input(input, { target: { value: "東京" }, isComposing: true }))
    const candidateKey = new KeyboardEvent("keydown", { key, isComposing, keyCode, bubbles: true, cancelable: true })
    await interact(() => { input.dispatchEvent(candidateKey) })
    expect(candidateKey.defaultPrevented).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe("東京")
    expect(document.activeElement).toBe(input)
    expect(document.querySelectorAll("[data-tag]")).toHaveLength(1)

    await interact(() => fireEvent.compositionEnd(input, { data: "東京" }))
    await interact(() => fireEvent.keyDown(input, { key: "Enter" }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(tags("existing", "東京"))
    expect(document.querySelector("input")).toBeNull()
    expect(document.activeElement).toBe(document.querySelector("[data-size]"))
  })

  test.each(["ArrowLeft", "ArrowUp", "Backspace"])("IME %s leaves candidate navigation and focus in the input", async (key) => {
    const onChange = vi.fn()
    await mount({ defaultValue: tags("existing"), onChange })
    const input = document.querySelector("input")!
    await interact(() => input.focus())
    await interact(() => fireEvent.compositionStart(input))
    // A pre-edit buffer may still be empty while the IME owns these keys.
    const candidateKey = new KeyboardEvent("keydown", { key, isComposing: true, bubbles: true, cancelable: true })
    await interact(() => { input.dispatchEvent(candidateKey) })
    expect(candidateKey.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(input)
    expect(onChange).not.toHaveBeenCalled()
    expect(document.querySelector('[data-tag="existing"]')).not.toBeNull()
    await interact(() => fireEvent.compositionEnd(input))
    await interact(() => fireEvent.keyDown(input, { key: "Backspace" }))
    expect(document.activeElement).toBe(document.querySelector('[data-tag="existing"]'))
  })

  test("disabled remove buttons cannot receive keyboard focus", async () => {
    await mount({ defaultValue: tags("one"), disabled: true })
    const button = within(document.body).getByRole("button", { name: "Remove one" }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    await interact(() => button.focus())
    expect(document.activeElement).not.toBe(button)
  })
})
