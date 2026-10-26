import { act, fireEvent, render } from "@testing-library/react"
import { createElement, useState, type ComponentType } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { Accordion as RAccordion } from "../../packages/ui/src/components/Accordion"
import { Textarea as RTextarea } from "../../packages/ui/src/components/Textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../packages/vue/src/components/Accordion"
import { Textarea } from "../../packages/vue/src/components/Textarea"
import { flushVue } from "./harness"
import { renderPair, walkPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

// React prop names map to Vue ones
const toVue = ({ className, onValueChange, onClick, onKeyDown, onFocus, onBlur, onAnimationStart, ...props }: Props = {}) => ({
  ...props,
  ...(className !== undefined ? { class: className } : {}),
  ...(onValueChange ? { "onUpdate:value": onValueChange } : {}),
  ...(onClick ? { onClick } : {}),
  ...(onKeyDown ? { onKeydown: onKeyDown } : {}),
  ...(onFocus ? { onFocus } : {}),
  ...(onBlur ? { onBlur } : {}),
  ...(onAnimationStart ? { onAnimationstart: onAnimationStart } : {}),
})

const textarea = () => document.querySelector("textarea")!

// jsdom has no layout: scrollHeight follows the number of lines, the same for both
const stubScrollHeight = () => {
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      return this.value.split("\n").length * 20
    },
  })
}

afterEach(() => {
  delete (HTMLTextAreaElement.prototype as { scrollHeight?: number }).scrollHeight
})

/* ------------------------------------------------------------------ */
/*  Textarea                                                           */
/* ------------------------------------------------------------------ */

const noop = () => {}

const textareaCases: Array<[string, Props]> = [
  ["default", {}],
  ["variant soft", { variant: "soft" }],
  ["size + gutter", { size: "lg", gutterSize: "sm" }],
  ["every size", { size: "3xs" }],
  ["disabled", { disabled: true }],
  ["read only", { readOnly: true }],
  ["invalid", { invalid: true }],
  ["all states", { disabled: true, readOnly: true, invalid: true, variant: "soft" }],
  ["name allows autofill extensions", { name: "bio" }],
  ["name, extensions blocked", { name: "bio", allowAutofillExtensions: false }],
  ["extensions allowed without name", { allowAutofillExtensions: true }],
  ["explicit id", { id: "notes" }],
  ["explicit id with name", { id: "notes", name: "bio" }],
  ["rows", { rows: 5 }],
  ["maxRows without autoResize is ignored", { rows: 2, maxRows: 8 }],
  ["autoResize defaults maxRows to 10", { autoResize: true }],
  ["autoResize maxRows", { autoResize: true, rows: 2, maxRows: 6 }],
  ["autoResize rows above maxRows", { autoResize: true, rows: 12, maxRows: 4 }],
  ["class on the container", { className: "w-full custom" }],
  ["attributes on the textarea", { placeholder: "Write…", "aria-label": "Notes", maxLength: 20, style: { color: "red" }, "data-test": "x" }],
  ["autoComplete is dropped", { autoComplete: "off" }],
  ["own attributes win over passed ones", { "data-lpignore": "no", "data-1p-ignore": "no", rows: 4 }],
  ["defaultValue", { defaultValue: "Jane Doe" }],
  ["multi-line defaultValue", { defaultValue: "Line 1\nLine 2" }],
  ["controlled value", { value: "Hello", onChange: noop }],
  ["numeric value", { value: 42, onChange: noop }],
  ["controlled empty value", { value: "", onChange: noop }],
]

const textareaPair = (props: Props) => {
  const { onChange: _onChange, ...vueProps } = props
  return renderPair(createElement(RTextarea as ComponentType<Props>, props), () => h(Textarea, toVue(vueProps)))
}

describe("Textarea parity", () => {
  test.each(textareaCases)("%s", async (_name, props) => {
    const { react, vue } = await textareaPair(props)
    expect(vue).toBe(react)
  })

  test("generated id only without explicit id or extensions", async () => {
    const { react } = await textareaPair({})
    expect(react).toContain('id="gen-1"')
    expect(react).toContain('data-lpignore="true"')
    expect((await textareaPair({ name: "bio" })).react).not.toContain("id=")
  })
})

describe("Textarea behaviour parity", () => {
  const typeInto = async (value: string) => {
    await act(async () => {
      fireEvent.input(textarea(), { target: { value } })
    })
    await flushVue()
  }

  test("uncontrolled typing keeps defaultValue as text content", async () => {
    const values: string[] = []
    const { react, vue } = await walkPair(
      () => render(<RTextarea defaultValue="Hi" />),
      () => h(Textarea, { defaultValue: "Hi" }),
      async (snapshot) => {
        values.push(textarea().value)
        await typeInto("Hi there")
        values.push(textarea().value)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(values).toEqual(["Hi", "Hi there", "Hi", "Hi there"])
    expect(react[0]).toContain('"Hi"')
  })

  // A controlled textarea in each framework: `value` + onChange in React,
  // `value` + update:value (v-model:value) in Vue
  const ReactControlled = ({ initial, changes, ...props }: Props & { initial: string; changes: string[] }) => {
    const [value, setValue] = useState(initial)
    return (
      <RTextarea
        {...props}
        value={value}
        onChange={(event) => {
          changes.push(event.target.value)
          setValue(event.target.value)
        }}
      />
    )
  }

  const vueControlled = (initial: string, changes: string[], props: Props = {}) =>
    defineComponent({
      setup() {
        const value = ref(initial)
        return () =>
          h(Textarea, {
            ...toVue(props),
            "value": value.value,
            "onUpdate:value": (next: string) => {
              changes.push(next)
              value.value = next
            },
          })
      },
    })

  test("controlled typing", async () => {
    const reactChanges: string[] = []
    const vueChanges: string[] = []
    const values: string[] = []
    const { react, vue } = await walkPair(
      () => render(<ReactControlled initial="Hello" changes={reactChanges} />),
      () => h(vueControlled("Hello", vueChanges)),
      async (snapshot) => {
        snapshot()
        await typeInto("Hello world")
        values.push(textarea().value)
        snapshot()
        await typeInto("")
        values.push(textarea().value)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual(["Hello world", ""])
    expect(values).toEqual(["Hello world", "", "Hello world", ""])
    expect(react[1]).toContain('"Hello world"')
  })

  test("value set from outside updates text and value", async () => {
    const values: string[] = []
    const { react, vue } = await walkPairWithState(
      { value: "a" },
      (state) => <RTextarea value={state.value} onChange={noop} />,
      (state) => h(Textarea, { value: state.value }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ value: "b\nc" })
        values.push(textarea().value)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(values).toEqual(["b\nc", "b\nc"])
  })

  test("native `readonly` spelling works like readOnly", async () => {
    const { react, vue } = await renderPair(<RTextarea readOnly />, () => h(Textarea, { readonly: true }))
    expect(vue).toBe(react)
    expect(react).toContain("data-readonly")
  })

  test("a controlled value the parent does not update is put back after input", async () => {
    const changes: string[] = []
    const values: string[] = []
    await walkPair(
      () => render(<RTextarea value="fixed" onChange={(event) => changes.push(event.target.value)} />),
      () => h(Textarea, { "value": "fixed", "onUpdate:value": (value: string) => changes.push(value) }),
      async (snapshot) => {
        await typeInto("fixed!")
        values.push(textarea().value)
        snapshot()
      },
    )
    expect(changes).toEqual(["fixed!", "fixed!"])
    expect(values).toEqual(["fixed", "fixed"])
  })

  test("changing defaultValue after mount updates the text but not the value", async () => {
    const values: string[] = []
    const { react, vue } = await walkPairWithState(
      { defaultValue: "first" },
      (state) => <RTextarea defaultValue={state.defaultValue} />,
      (state) => h(Textarea, { defaultValue: state.defaultValue }),
      async ({ set, snapshot }) => {
        await set({ defaultValue: "second" })
        values.push(textarea().value)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('"second"')
    expect(values).toEqual(["first", "first"])
  })

  test("focus and blur toggle data-focused and call the listeners", async () => {
    const calls: string[] = []
    const props = { onFocus: () => calls.push("focus"), onBlur: () => calls.push("blur") }
    const { react, vue } = await walkPair(
      () => render(<RTextarea {...props} />),
      () => h(Textarea, toVue(props)),
      async (snapshot) => {
        await act(async () => textarea().focus())
        await flushVue()
        snapshot()
        await act(async () => textarea().blur())
        await flushVue()
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-focused="true"')
    expect(react[1]).toContain('data-focused="false"')
    expect(calls).toEqual(["focus", "blur", "focus", "blur"])
  })

  test("autoResize sizes to content on mount, on typing and on value changes", async () => {
    stubScrollHeight()
    const reactChanges: string[] = []
    const vueChanges: string[] = []
    const heights: string[] = []
    const { react, vue } = await walkPair(
      () => render(<ReactControlled initial="one" changes={reactChanges} autoResize rows={2} maxRows={6} />),
      () => h(vueControlled("one", vueChanges, { autoResize: true, rows: 2, maxRows: 6 })),
      async (snapshot) => {
        heights.push(textarea().style.height)
        snapshot()
        await typeInto("one\ntwo\nthree")
        heights.push(textarea().style.height)
        snapshot()
        await typeInto("one")
        heights.push(textarea().style.height)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(heights).toEqual(["20px", "60px", "20px", "20px", "60px", "20px"])
  })

  test("autoResize reacts to prop changes; turning it off keeps the last height", async () => {
    stubScrollHeight()
    const { react, vue } = await walkPairWithState(
      { value: "a\nb", autoResize: false, rows: 3, maxRows: 8 },
      (state) => <RTextarea value={state.value} onChange={noop} autoResize={state.autoResize} rows={state.rows} maxRows={state.maxRows} />,
      (state) => h(Textarea, { value: state.value, autoResize: state.autoResize, rows: state.rows, maxRows: state.maxRows }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ autoResize: true })
        snapshot()
        await set({ value: "a\nb\nc\nd" })
        snapshot()
        await set({ maxRows: 4 })
        snapshot()
        await set({ rows: 5 })
        snapshot()
        await set({ autoResize: false, value: "a" })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).not.toContain("height")
    expect(react[2]).toContain("height: 80px")
    expect(react[5]).toContain("height: 80px")
  })

  test("autoSelect selects on mount and whenever it turns on", async () => {
    const selections: string[] = []
    const record = () => selections.push(`${textarea().selectionStart}-${textarea().selectionEnd}`)
    const { react, vue } = await walkPairWithState(
      { autoSelect: true },
      (state) => <RTextarea defaultValue="Select me" autoSelect={state.autoSelect} />,
      (state) => h(Textarea, { defaultValue: "Select me", autoSelect: state.autoSelect }),
      async ({ set, snapshot }) => {
        record()
        await act(async () => textarea().setSelectionRange(2, 2))
        await set({ autoSelect: false })
        record()
        await set({ autoSelect: true })
        record()
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(selections).toEqual(["0-9", "2-2", "0-9", "0-9", "2-2", "0-9"])
  })

  test("autoSelect turning on with a new controlled value selects the new value", async () => {
    const selections: string[] = []
    const record = () => selections.push(`${textarea().value} ${textarea().selectionStart}-${textarea().selectionEnd}`)
    const { react, vue } = await walkPairWithState(
      { value: "old", autoSelect: false },
      (state) => <RTextarea value={state.value} autoSelect={state.autoSelect} onChange={() => {}} />,
      (state) => h(Textarea, { value: state.value, autoSelect: state.autoSelect }),
      async ({ set, snapshot }) => {
        await set({ value: "updated text", autoSelect: true })
        record()
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(selections).toEqual(["updated text 0-12", "updated text 0-12"])
  })

  test("browser autofill animation reports autofill", async () => {
    const calls: string[] = []
    // Without AnimationEvent (jsdom), React DOM listens for the prefixed
    // event name; browsers use the unprefixed one. Each framework hears one.
    const fire = async (animationName: string) => {
      for (const type of ["animationstart", "webkitAnimationStart"]) {
        const event = new Event(type, { bubbles: true })
        Object.defineProperty(event, "animationName", { value: animationName })
        await act(async () => {
          textarea().dispatchEvent(event)
        })
      }
      await flushVue()
    }
    await walkPair(
      () => render(<RTextarea onAutofill={() => calls.push("autofill")} onAnimationStart={() => calls.push("start")} />),
      () => h(Textarea, { onAutofill: () => calls.push("autofill"), onAnimationstart: () => calls.push("start") }),
      async () => {
        await fire("something-else")
        await fire("native-autofill-in")
      },
    )
    expect(calls).toEqual(["start", "start", "autofill", "start", "start", "autofill"])
  })
})

/* ------------------------------------------------------------------ */
/*  Accordion                                                          */
/* ------------------------------------------------------------------ */

const items = [
  { value: "a", label: "Alpha", body: "First body" },
  { value: "b", label: "Beta", body: "Second body" },
  { value: "c", label: "Gamma", body: "Third body" },
]

type ItemOptions = { item?: Props; trigger?: Props; content?: Props }
type Example = { root: Props; parts?: Partial<Record<string, ItemOptions>>; only?: string[] }

const RA = RAccordion as unknown as ComponentType<Props> & {
  Item: ComponentType<Props>
  Trigger: ComponentType<Props>
  Content: ComponentType<Props>
}

const ReactAccordion = ({ root, parts = {}, only }: Example) => (
  <RA {...root}>
    {items
      .filter(({ value }) => !only || only.includes(value))
      .map(({ value, label, body }) => (
        <RA.Item key={value} value={value} {...parts[value]?.item}>
          <RA.Trigger {...parts[value]?.trigger}>{label}</RA.Trigger>
          <RA.Content {...parts[value]?.content}>{body}</RA.Content>
        </RA.Item>
      ))}
  </RA>
)

const vueAccordion = ({ root, parts = {}, only }: Example) =>
  h(Accordion as never, toVue(root), {
    default: () =>
      items
        .filter(({ value }) => !only || only.includes(value))
        .map(({ value, label, body }) =>
          h(AccordionItem, { key: value, value, ...toVue(parts[value]?.item) }, {
            default: () => [
              h(AccordionTrigger, toVue(parts[value]?.trigger), { default: () => label }),
              h(AccordionContent, toVue(parts[value]?.content), { default: () => body }),
            ],
          }),
        ),
  })

const accordionCases: Array<[string, Example]> = [
  ["single, none open", { root: { type: "single" } }],
  ["single, default open", { root: { type: "single", defaultValue: "b" } }],
  ["single collapsible, default open", { root: { type: "single", collapsible: true, defaultValue: "a" } }],
  ["single, unknown default value", { root: { type: "single", defaultValue: "zzz" } }],
  ["single, controlled", { root: { type: "single", value: "c", onValueChange: noop } }],
  ["single, controlled empty", { root: { type: "single", value: "", onValueChange: noop } }],
  ["multiple, none open", { root: { type: "multiple" } }],
  ["multiple, default open", { root: { type: "multiple", defaultValue: ["a", "c"] } }],
  ["multiple, controlled", { root: { type: "multiple", value: ["b"], onValueChange: noop } }],
  ["disabled root", { root: { type: "single", disabled: true, defaultValue: "a" } }],
  ["disabled item", { root: { type: "single", defaultValue: "a" }, parts: { b: { item: { disabled: true } } } }],
  ["disabled open item", { root: { type: "multiple", defaultValue: ["b"] }, parts: { b: { item: { disabled: true } } } }],
  ["horizontal", { root: { type: "single", orientation: "horizontal", defaultValue: "a" } }],
  ["rtl", { root: { type: "single", dir: "rtl", defaultValue: "a" } }],
  [
    "classes and attributes on every part",
    {
      root: { type: "single", defaultValue: "a", className: "faq", id: "faq", "aria-label": "FAQ", style: { maxWidth: "384px" } },
      parts: {
        a: {
          item: { className: "item", "data-test": "item-a" },
          trigger: { className: "trigger", "aria-describedby": "faq", title: "Open" },
          content: { className: "content", style: { color: "red" }, "data-test": "content-a" },
        },
      },
    },
  ],
  ["explicit trigger id breaks the content label, as in Radix", { root: { type: "single", defaultValue: "a" }, parts: { a: { trigger: { id: "trigger-a" } } } }],
  ["explicit content id", { root: { type: "single", defaultValue: "a" }, parts: { a: { content: { id: "content-a" } } } }],
  ["passed attributes override the part's own", { root: { type: "single", defaultValue: "a", "data-orientation": "x" }, parts: { a: { item: { "data-state": "x" }, trigger: { type: "submit", "aria-expanded": false }, content: { role: "note", hidden: false } } } }],
  ["forceMount keeps a closed panel visible", { root: { type: "single", defaultValue: "a" }, parts: { b: { content: { forceMount: true } } } }],
  ["single item", { root: { type: "single" }, only: ["b"] }],
  // Radix's Slot merges the panel onto the inner element; a closed panel renders nothing
  [
    "asChild merges the panel onto the inner element",
    {
      root: { type: "single", defaultValue: "a" },
      parts: {
        a: { content: { asChild: true, className: "content", style: { color: "red" }, "data-test": "content-a" } },
        b: { content: { asChild: true } },
      },
    },
  ],
  ["asChild with forceMount keeps a closed panel", { root: { type: "single", defaultValue: "a" }, parts: { b: { content: { asChild: true, forceMount: true } } } }],
]

describe("Accordion parity", () => {
  test.each(accordionCases)("%s", async (_name, example) => {
    const { react, vue } = await renderPair(<ReactAccordion {...example} />, () => vueAccordion(example))
    expect(vue).toBe(react)
  })

  test("trigger and panel reference each other; open non-collapsible trigger is aria-disabled", async () => {
    const example: Example = { root: { type: "single", defaultValue: "a" } }
    const { react, vue } = await renderPair(<ReactAccordion {...example} />, () => vueAccordion(example))
    for (const dom of [react, vue]) {
      expect(dom).not.toContain("[missing]")
      expect(dom).toMatch(/<button aria-controls="gen-2" aria-disabled="true" aria-expanded="true"[^>]* id="gen-1"/)
      expect(dom).toMatch(/<div aria-labelledby="gen-1" [^>]*id="gen-2" role="region"/)
      expect(dom).toMatch(/<div aria-labelledby="gen-3" [^>]*hidden="" id="gen-4"/)
      expect(dom).toContain("--radix-accordion-content-height: var(--radix-collapsible-content-height)")
    }
  })
})

describe("Accordion behaviour parity", () => {
  type Run = { react: string[]; vue: string[]; reactChanges: unknown[]; vueChanges: unknown[] }

  // Panels that mount open keep their animations blocked until the next
  // frame; wait for it so real-timer runs do not depend on timing
  const nextFrames = async () => {
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await flushVue()
  }

  const trigger = (label: string) =>
    Array.from(document.querySelectorAll("button")).find((button) => button.textContent === label)!

  const click = async (label: string) => {
    await act(async () => {
      fireEvent.click(trigger(label))
    })
    await flushVue()
  }

  // Runs `steps` against an accordion in each framework and records the
  // DOM and the value changes
  const walk = async (example: Example, steps: (snapshot: () => void) => Promise<void>): Promise<Run> => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walkPair(
      () => render(<ReactAccordion {...example} root={{ ...example.root, onValueChange: (value: unknown) => reactChanges.push(value) }} />),
      () => vueAccordion({ ...example, root: { ...example.root, onValueChange: (value: unknown) => vueChanges.push(value) } }),
      async (snapshot) => {
        await nextFrames()
        await steps(snapshot)
      },
    )
    return { react, vue, reactChanges, vueChanges }
  }

  test("single: clicking opens one item at a time, the open one stays open", async () => {
    const run = await walk({ root: { type: "single" } }, async (snapshot) => {
      await click("Alpha")
      snapshot()
      await click("Beta")
      snapshot()
      await click("Beta")
      snapshot()
    })
    expect(run.vue).toEqual(run.react)
    expect(run.vueChanges).toEqual(run.reactChanges)
    expect(run.reactChanges).toEqual(["a", "b"])
  })

  // Radix's useControllableState reports an uncontrolled change from an
  // effect, after the opened panel has rendered; a controlled one at once,
  // from the click, before the parent passes the new value
  test.each([
    ["uncontrolled single", "single", false, ['"b" input', "field-b"]],
    ["uncontrolled multiple", "multiple", false, ['["b"] input', "field-b"]],
    ["controlled single", "single", true, ['"b" none', "(body)"]],
  ] as const)("%s: a change listener can focus the opened panel's input", async (_name, type, controlled, expected) => {
    const log: string[][] = []
    const report = (value: unknown) => {
      const input = document.querySelector<HTMLInputElement>("#field-b")
      log.at(-1)!.push(`${JSON.stringify(value)} ${input ? "input" : "none"}`)
      input?.focus()
    }
    const initial = type === "multiple" ? [] : ""
    function ReactDemo() {
      const [value, setValue] = useState<unknown>(initial)
      return (
        <RA
          type={type}
          {...(controlled ? { value } : {})}
          onValueChange={(next: unknown) => {
            report(next)
            setValue(next)
          }}
        >
          {["a", "b"].map((v) => (
            <RA.Item key={v} value={v}>
              <RA.Trigger>{v.toUpperCase()}</RA.Trigger>
              <RA.Content>
                <input id={`field-${v}`} />
              </RA.Content>
            </RA.Item>
          ))}
        </RA>
      )
    }
    const VueDemo = defineComponent(() => {
      const value = ref<unknown>(initial)
      return () =>
        h(
          Accordion as never,
          {
            type,
            ...(controlled ? { value: value.value } : {}),
            "onUpdate:value": (next: unknown) => {
              report(next)
              value.value = next
            },
          },
          {
            default: () =>
              ["a", "b"].map((v) =>
                h(AccordionItem, { key: v, value: v }, {
                  default: () => [
                    h(AccordionTrigger, null, { default: () => v.toUpperCase() }),
                    h(AccordionContent, null, { default: () => h("input", { id: `field-${v}` }) }),
                  ],
                }),
              ),
          },
        )
    })
    const { react, vue } = await walkPair(
      () => render(<ReactDemo />),
      () => h(VueDemo),
      async (snapshot) => {
        log.push([])
        await nextFrames()
        await click("B")
        log.at(-1)!.push(document.activeElement?.id || "(body)")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(log[1]).toEqual(log[0])
    expect(log[0]).toEqual(expected)
  })

  test("uncontrolled: switching `type` remounts from defaultValue without reporting a change", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const root = (type: string, onValueChange: (value: unknown) => void) => ({
      type,
      defaultValue: type === "multiple" ? ["c"] : "a",
      onValueChange,
    })
    const { react, vue } = await walkPairWithState(
      { type: "single" },
      (state) => <ReactAccordion root={root(state.type, (value) => reactChanges.push(value))} />,
      (state) => vueAccordion({ root: root(state.type, (value) => vueChanges.push(value)) }),
      async ({ set, advance, snapshot }) => {
        await advance(32)
        await click("Beta")
        snapshot()
        await set({ type: "multiple" })
        await advance(32)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual(["b"])
  })

  test("single collapsible: clicking the open item closes it and reports an empty string", async () => {
    const run = await walk({ root: { type: "single", collapsible: true, defaultValue: "a" } }, async (snapshot) => {
      await click("Alpha")
      snapshot()
      await click("Gamma")
      snapshot()
    })
    expect(run.vue).toEqual(run.react)
    expect(run.vueChanges).toEqual(run.reactChanges)
    expect(run.reactChanges).toEqual(["", "c"])
  })

  test("multiple: items open and close independently", async () => {
    const run = await walk({ root: { type: "multiple", defaultValue: ["b"] } }, async (snapshot) => {
      await click("Alpha")
      snapshot()
      await click("Beta")
      snapshot()
      await click("Gamma")
      snapshot()
      await click("Alpha")
      snapshot()
    })
    expect(run.vue).toEqual(run.react)
    expect(run.vueChanges).toEqual(run.reactChanges)
    expect(run.reactChanges).toEqual([["b", "a"], ["a"], ["a", "c"], ["c"]])
  })

  test.each([
    ["disabled item", { root: { type: "single" }, parts: { b: { item: { disabled: true } } } }],
    ["disabled root", { root: { type: "multiple", disabled: true } }],
  ] as Array<[string, Example]>)("%s does not toggle", async (_name, example) => {
    const run = await walk(example, async (snapshot) => {
      await click("Beta")
      snapshot()
    })
    expect(run.vue).toEqual(run.react)
    expect(run.reactChanges).toEqual([])
    expect(run.vueChanges).toEqual([])
  })

  test("preventDefault in the trigger's click listener cancels the toggle", async () => {
    const clicks: string[] = []
    const onClick = (event: { preventDefault(): void }) => {
      clicks.push("click")
      event.preventDefault()
    }
    const run = await walk({ root: { type: "single" }, parts: { a: { trigger: { onClick } } } }, async (snapshot) => {
      await click("Alpha")
      await click("Beta")
      snapshot()
    })
    expect(run.vue).toEqual(run.react)
    expect(run.reactChanges).toEqual(["b"])
    expect(run.vueChanges).toEqual(["b"])
    expect(clicks).toEqual(["click", "click"])
  })

  test("controlled: changes are reported, the DOM follows the value prop", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walkPairWithState(
      { value: "a" as string | string[], type: "single" },
      (state) => <ReactAccordion root={{ type: state.type, value: state.value, onValueChange: (value: unknown) => reactChanges.push(value) }} />,
      (state) => vueAccordion({ root: { type: state.type, value: state.value, onValueChange: (value: unknown) => vueChanges.push(value) } }),
      async ({ set, snapshot }) => {
        await act(async () => fireEvent.click(trigger("Beta")))
        await flushVue()
        snapshot()
        await set({ value: "b" })
        snapshot()
        await set({ value: "" })
        snapshot()
        await set({ type: "multiple", value: ["a", "c"] })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual(["b"])
    expect(react[0]).toMatch(/<div class="Item" data-orientation="vertical" data-state="open">\n\s+<h3 [^\n]+\n\s+<button [^\n]+\n\s+"Alpha"/)
  })

  test("orientation, collapsible, disabled and items can change after mount", async () => {
    const log: string[] = []
    const { react, vue } = await walkPairWithState(
      { orientation: "vertical", collapsible: false, disabled: false, only: ["a", "b", "c"] },
      (state) => (
        <ReactAccordion
          only={state.only}
          root={{ type: "single", defaultValue: "a", orientation: state.orientation, collapsible: state.collapsible, disabled: state.disabled }}
        />
      ),
      (state) =>
        vueAccordion({
          only: state.only,
          root: { type: "single", defaultValue: "a", orientation: state.orientation, collapsible: state.collapsible, disabled: state.disabled },
        }),
      async ({ set, advance, snapshot }) => {
        // Vue skips events stamped no later than its listener was attached;
        // let the fake clock move past the mount
        await advance(16)
        await set({ collapsible: true })
        snapshot()
        await set({ orientation: "horizontal" })
        snapshot()
        await set({ only: ["a", "c"] })
        await act(async () => trigger("Alpha").focus())
        await act(async () => {
          fireEvent.keyDown(trigger("Alpha"), { key: "ArrowRight" })
        })
        log.push(document.activeElement?.textContent ?? "")
        snapshot()
        await set({ disabled: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(log).toEqual(["Gamma", "Gamma"])
    expect(react[0]).not.toContain("aria-disabled")
  })

  test("v-model:value drives a Vue accordion like value + onValueChange in React", async () => {
    const values: unknown[] = []
    const ReactApp = () => {
      const [value, setValue] = useState<string[]>(["a"])
      return <ReactAccordion root={{ type: "multiple", value, onValueChange: (next: string[]) => (values.push(next), setValue(next)) }} />
    }
    const VueApp = defineComponent({
      setup() {
        const value = ref<string[]>(["a"])
        return () =>
          vueAccordion({
            root: { type: "multiple", value: value.value, "onUpdate:value": (next: string[]) => (values.push(next), (value.value = next)) },
          })
      },
    })
    const { react, vue } = await walkPair(
      () => render(<ReactApp />),
      () => h(VueApp),
      async (snapshot) => {
        await nextFrames()
        await click("Gamma")
        snapshot()
        await click("Alpha")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(values).toEqual([["a", "c"], ["c"], ["a", "c"], ["c"]])
  })

  describe("keyboard", () => {
    const press = async (key: string) => {
      let notPrevented = true
      await act(async () => {
        notPrevented = fireEvent.keyDown(document.activeElement!, { key })
      })
      await flushVue()
      return notPrevented
    }

    // Focuses the first trigger, presses each key and records which trigger
    // has focus and whether the key's default action was kept
    const navigate = async (example: Example, keys: string[], start = "Alpha") => {
      const log: string[] = []
      const run = await walk(example, async (snapshot) => {
        await act(async () => trigger(start).focus())
        for (const key of keys) {
          const notPrevented = await press(key)
          log.push(`${key}->${document.activeElement?.textContent}${notPrevented ? "" : " (prevented)"}`)
        }
        snapshot()
      })
      const half = log.length / 2
      expect(log.slice(half)).toEqual(log.slice(0, half))
      expect(run.vue).toEqual(run.react)
      return log.slice(0, half)
    }

    test("vertical: arrows wrap, Home/End jump, cross-axis arrows are swallowed", async () => {
      const log = await navigate({ root: { type: "single" } }, ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowUp", "End", "Home", "ArrowRight", "ArrowLeft", "Tab", "a"])
      expect(log).toEqual([
        "ArrowDown->Beta (prevented)",
        "ArrowDown->Gamma (prevented)",
        "ArrowDown->Alpha (prevented)",
        "ArrowUp->Gamma (prevented)",
        "End->Gamma (prevented)",
        "Home->Alpha (prevented)",
        "ArrowRight->Alpha (prevented)",
        "ArrowLeft->Alpha (prevented)",
        "Tab->Alpha",
        "a->Alpha",
      ])
    })

    test("disabled triggers are skipped, also by Home/End", async () => {
      const log = await navigate(
        { root: { type: "single" }, parts: { a: { item: { disabled: true } }, c: { item: { disabled: true } } } },
        ["ArrowDown", "ArrowUp", "Home", "End"],
        "Beta",
      )
      expect(log).toEqual(["ArrowDown->Beta (prevented)", "ArrowUp->Beta (prevented)", "Home->Beta (prevented)", "End->Beta (prevented)"])
    })

    test("horizontal, left to right", async () => {
      const log = await navigate({ root: { type: "single", orientation: "horizontal" } }, ["ArrowRight", "ArrowLeft", "ArrowLeft", "ArrowDown", "Home", "End"])
      expect(log).toEqual([
        "ArrowRight->Beta (prevented)",
        "ArrowLeft->Alpha (prevented)",
        "ArrowLeft->Gamma (prevented)",
        "ArrowDown->Gamma (prevented)",
        "Home->Alpha (prevented)",
        "End->Gamma (prevented)",
      ])
    })

    test("horizontal, right to left", async () => {
      const log = await navigate({ root: { type: "single", orientation: "horizontal", dir: "rtl" } }, ["ArrowRight", "ArrowLeft", "ArrowUp"])
      expect(log).toEqual(["ArrowRight->Gamma (prevented)", "ArrowLeft->Alpha (prevented)", "ArrowUp->Alpha (prevented)"])
    })

    test("Enter and Space keep the native button activation, which toggles", async () => {
      const run = await walk({ root: { type: "multiple" } }, async (snapshot) => {
        await act(async () => trigger("Beta").focus())
        for (const key of ["Enter", " "]) {
          expect(await press(key)).toBe(true)
          // jsdom does not activate buttons from the keyboard: click like the browser would
          await act(async () => (document.activeElement as HTMLElement).click())
          await flushVue()
          snapshot()
        }
      })
      expect(run.vue).toEqual(run.react)
      expect(run.vueChanges).toEqual(run.reactChanges)
      expect(run.reactChanges).toEqual([["b"], []])
    })

    test("the root's keydown listener runs first and can cancel navigation", async () => {
      const keys: string[] = []
      const onKeyDown = (event: KeyboardEvent) => {
        keys.push(event.key)
        if (event.key === "End") event.preventDefault()
      }
      const log = await navigate({ root: { type: "single", onKeyDown } }, ["ArrowDown", "End"])
      expect(log).toEqual(["ArrowDown->Beta (prevented)", "End->Beta (prevented)"])
      expect(keys).toEqual(["ArrowDown", "End", "ArrowDown", "End"])
    })

    test("a disabled root ignores keys and drops its keydown listener", async () => {
      const keys: string[] = []
      const results: boolean[] = []
      const run = await walk({ root: { type: "single", disabled: true, onKeyDown: (event: KeyboardEvent) => keys.push(event.key) } }, async (snapshot) => {
        await act(async () => {
          results.push(fireEvent.keyDown(trigger("Alpha"), { key: "ArrowDown" }))
        })
        await flushVue()
        snapshot()
      })
      expect(run.vue).toEqual(run.react)
      expect(results).toEqual([true, true])
      expect(keys).toEqual([])
    })

    test("keys from inside a panel are ignored", async () => {
      const results: boolean[] = []
      const run = await walk({ root: { type: "single", defaultValue: "a" } }, async (snapshot) => {
        const panel = document.getElementById(trigger("Alpha").getAttribute("aria-controls")!)!
        await act(async () => {
          results.push(fireEvent.keyDown(panel, { key: "End" }))
        })
        await flushVue()
        snapshot()
      })
      expect(run.vue).toEqual(run.react)
      expect(results).toEqual([true, true])
    })
  })

  describe("animation", () => {
    // jsdom has no CSS animations: make the panels report the keyframes the
    // shared CSS runs for each state, the same way for both frameworks
    beforeEach(() => {
      const getComputedStyle = window.getComputedStyle
      vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
        const styles = getComputedStyle(element, pseudo)
        if (!element.classList.contains("Content")) return styles
        return new Proxy(styles, {
          get(target, key) {
            if (key === "animationName") {
              if ((element as HTMLElement).style.animationName === "none") return "none"
              return element.getAttribute("data-state") === "open" ? "accordion-down" : "accordion-up"
            }
            const value = Reflect.get(target, key, target)
            return typeof value === "function" ? value.bind(target) : value
          },
        })
      })
      vi.stubGlobal("CSS", { escape: (value: string) => value })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const animationEnd = async (label: string, animationName: string) => {
      const panel = document.getElementById(trigger(label).getAttribute("aria-controls")!)!
      const event = new Event("animationend", { bubbles: true })
      Object.defineProperty(event, "animationName", { value: animationName })
      await act(async () => {
        panel.dispatchEvent(event)
      })
      await flushVue()
    }

    test("closing keeps the panel until its exit animation ends; opening animates after the first frame", async () => {
      const { react, vue } = await walkPairWithState(
        { value: ["a"] as string[] },
        (state) => <ReactAccordion root={{ type: "multiple", value: state.value, onValueChange: noop }} />,
        (state) => vueAccordion({ root: { type: "multiple", value: state.value, onValueChange: noop } }),
        async ({ set, advance, snapshot }) => {
          // mounted open: the mount animation is suppressed inline
          snapshot()
          await advance(32)
          await set({ value: ["a", "b"] })
          // opened after mount: animations restored
          snapshot()
          await set({ value: ["b"] })
          // closing: still mounted and visible, data-state="closed"
          snapshot()
          await animationEnd("Alpha", "accordion-up")
          snapshot()
          await advance(16)
          snapshot()
        },
      )
      expect(vue).toEqual(react)
      const panelStyle = (dom: string, id: string) => dom.match(new RegExp(`id="${id}" role="region" style="([^"]*)"`))?.[1]
      // Alpha mounted open: its inline animation block stays until it changes state
      expect(panelStyle(react[0], "gen-2")).toContain("animation-name: none")
      expect(panelStyle(react[1], "gen-2")).toContain("animation-name: none")
      // Beta opened after the first frame: animations restored
      expect(panelStyle(react[1], "gen-4")).not.toContain("animation-name")
      expect(panelStyle(react[2], "gen-2")).not.toContain("animation-name")
      expect(react[2]).toMatch(/data-state="closed" id="gen-2" role="region"[^\n]*\n\s+<div class="ContentInner">\n\s+"First body"/)
      expect(react[3]).toMatch(/data-state="closed" hidden="" id="gen-2"/)
      expect(react[3]).toContain("animation-fill-mode: forwards")
      expect(react[4]).not.toContain("animation-fill-mode")
    })

    test("measured size feeds the height variables", async () => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
        const open = this.getAttribute("data-state") === "open"
        return { height: open ? 120 : 0, width: open ? 300 : 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
      })
      const { react, vue } = await walkPairWithState(
        { value: "" },
        (state) => <ReactAccordion root={{ type: "single", collapsible: true, value: state.value, onValueChange: noop }} />,
        (state) => vueAccordion({ root: { type: "single", collapsible: true, value: state.value, onValueChange: noop } }),
        async ({ set, advance, snapshot }) => {
          await advance(32)
          await set({ value: "a" })
          snapshot()
          await set({ value: "b" })
          snapshot()
          await animationEnd("Alpha", "accordion-up")
          snapshot()
        },
      )
      expect(vue).toEqual(react)
      expect(react.join("\n")).toContain("--radix-collapsible-content-height: 120px")
    })

    test("asChild: the merged inner element is measured, animates out, then unmounts", async () => {
      // A closing panel keeps its content, so it measures as it did open; a hidden one measures nothing
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
        const panel = this.classList.contains("Content") && !this.hidden
        return { height: panel ? 120 : 0, width: panel ? 300 : 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
      })
      const parts = { a: { content: { asChild: true } }, b: { content: { asChild: true, className: "panel" } } }
      const { react, vue } = await walkPairWithState(
        { value: "" },
        (state) => <ReactAccordion root={{ type: "single", collapsible: true, value: state.value, onValueChange: noop }} parts={parts} />,
        (state) => vueAccordion({ root: { type: "single", collapsible: true, value: state.value, onValueChange: noop }, parts }),
        async ({ set, advance, snapshot }) => {
          snapshot()
          await advance(32)
          await set({ value: "a" })
          snapshot()
          await set({ value: "b" })
          snapshot()
          await animationEnd("Alpha", "accordion-up")
          snapshot()
        },
      )
      expect(vue).toEqual(react)
      // Only Gamma's panel (no asChild) is mounted while closed
      expect(react[0].match(/role="region"/g)).toHaveLength(1)
      expect(react[1]).toMatch(/class="Content ContentInner" data-orientation="vertical" data-state="open" id="gen-2" role="region" style="[^"]*--radix-collapsible-content-height: 120px/)
      expect(react[2]).toMatch(/class="Content ContentInner" data-orientation="vertical" data-state="closed" id="gen-2"/)
      // Alpha's exit animation ended: its panel is gone, Beta's is open
      expect(react[3].match(/role="region"/g)).toHaveLength(2)
      expect(react[3]).toContain('class="Content panel ContentInner" data-orientation="vertical" data-state="open"')
    })
  })
})
