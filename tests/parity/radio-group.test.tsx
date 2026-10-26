import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState, type ReactElement } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref, type VNode } from "vue"
import { RadioGroup as RRadioGroup } from "../../packages/ui/src/components/RadioGroup"
import { TextLink as RTextLink } from "../../packages/ui/src/components/TextLink"
import { Tooltip as RTooltip } from "../../packages/ui/src/components/Tooltip"
import { RadioGroup, RadioGroupItem } from "../../packages/vue/src/components/RadioGroup"
import { TextLink } from "../../packages/vue/src/components/TextLink"
import { Tooltip, TooltipTrigger } from "../../packages/vue/src/components/Tooltip"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

// React-vs-Vue parity for RadioGroup. React renders Radix RadioGroup; the
// Vue port renders Radix's markup on Reka's RovingFocusGroup/Item.

// jsdom has no ResizeObserver: Radix's hidden form input sizes itself with
// one (inside a form), the Vue port too when present
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver)
})

type Props = Record<string, unknown>
type ItemSpec = { value: string; label?: string; props?: Props; children?: "rich" }
type GroupCase = { props?: Props; items: ItemSpec[]; form?: boolean }

const ITEMS: ItemSpec[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

// React prop names map to Vue ones: className is class, onChange is the
// update:value / change emits
const toVue = ({ className, onChange, ...props }: Props = {}) => ({
  ...props,
  ...(className ? { class: className } : {}),
  ...(onChange ? { "onUpdate:value": onChange } : {}),
})

const reactChildren = (item: ItemSpec) =>
  item.children === "rich" ? (
    <div className="flex flex-col">
      <span className="font-medium">{item.label}</span>
      <span className="text-xs text-secondary mt-0.5">Description</span>
    </div>
  ) : (
    item.label
  )

const vueChildren = (item: ItemSpec) =>
  item.children === "rich"
    ? h("div", { class: "flex flex-col" }, [
        h("span", { class: "font-medium" }, item.label),
        h("span", { class: "text-xs text-secondary mt-0.5" }, "Description"),
      ])
    : item.label

const reactGroup = ({ props, items, form }: GroupCase) => {
  const group = (
    <RRadioGroup {...(props as object)}>
      {items.map((item) => (
        <RRadioGroup.Item key={item.value} value={item.value} {...(item.props as object)}>
          {reactChildren(item)}
        </RRadioGroup.Item>
      ))}
    </RRadioGroup>
  )
  return form ? <form>{group}</form> : group
}

const vueGroup = ({ props, items, form }: GroupCase) => {
  const group = h(RadioGroup, toVue(props), () =>
    items.map((item) =>
      h(RadioGroupItem, { key: item.value, value: item.value, ...toVue(item.props) }, () => vueChildren(item)),
    ),
  )
  return form ? h("form", null, [group]) : group
}

const markupCases: [string, GroupCase][] = [
  ["no selection", { items: ITEMS }],
  ["default value + aria-label", { props: { "defaultValue": "weekly", "aria-label": "Frequency" }, items: ITEMS }],
  ["controlled value", { props: { value: "monthly", onChange: () => {} }, items: ITEMS }],
  ["controlled value matching no item", { props: { value: "yearly", onChange: () => {} }, items: ITEMS }],
  ["direction col", { props: { direction: "col", defaultValue: "daily" }, items: ITEMS }],
  ["direction row (explicit)", { props: { direction: "row" }, items: ITEMS }],
  ["group disabled", { props: { disabled: true, defaultValue: "weekly" }, items: ITEMS }],
  [
    "item disabled",
    { props: { defaultValue: "daily" }, items: [ITEMS[0]!, { ...ITEMS[1]!, props: { disabled: true } }, ITEMS[2]!] },
  ],
  ["disabled checked item", { props: { defaultValue: "weekly" }, items: [ITEMS[0]!, { ...ITEMS[1]!, props: { disabled: true } }] }],
  [
    "block + orientation right",
    {
      props: { className: "w-56", direction: "col", defaultValue: "daily" },
      items: ITEMS.map((item) => ({ ...item, props: { orientation: "right", block: true } })),
    },
  ],
  ["orientation left (explicit), block false", { items: [{ ...ITEMS[0]!, props: { orientation: "left", block: false } }] }],
  ["item className lands on the label", { items: [{ ...ITEMS[0]!, props: { className: "gap-3 p-3" } }] }],
  [
    "item attributes land on the wrapper",
    { items: [{ ...ITEMS[0]!, props: { "data-testid": "item", "style": { color: "red" }, "title": "t" } }] },
  ],
  [
    "group attributes and class",
    { props: { "className": "flex-col gap-4", "id": "plans", "data-testid": "group", "style": { color: "red" } }, items: ITEMS },
  ],
  ["caller attributes win over the group's", { props: { "role": "group", "data-direction": "custom" }, items: ITEMS }],
  ["required group (aria-required only)", { props: { required: true }, items: ITEMS }],
  ["dir rtl", { props: { dir: "rtl", defaultValue: "daily" }, items: ITEMS }],
  ["rich children", { props: { defaultValue: "weekly" }, items: ITEMS.map((item) => ({ ...item, children: "rich" as const })) }],
  ["item without children", { items: [{ value: "a" }] }],
  ["value with spaces", { props: { defaultValue: "a b" }, items: [{ value: "a b", label: "A B" }] }],
  // Radix's hidden radio inputs, only inside a form
  ["in a form", { props: { defaultValue: "weekly" }, items: ITEMS, form: true }],
  ["in a form, with name", { props: { name: "frequency", defaultValue: "daily" }, items: ITEMS, form: true }],
  // radix-ui 1.8: the group's `required` reaches every hidden input, an item's own lands on its button
  [
    "in a form, required group and item",
    {
      props: { name: "frequency", required: true },
      items: [{ ...ITEMS[0]!, props: { required: true } }, ITEMS[1]!],
      form: true,
    },
  ],
  [
    "in a form, required item only",
    { props: { name: "frequency" }, items: [{ ...ITEMS[0]!, props: { required: true } }, ITEMS[1]!], form: true },
  ],
  ["in a form, disabled", { props: { name: "f", disabled: true, defaultValue: "weekly" }, items: ITEMS, form: true }],
]

describe("RadioGroup markup parity", () => {
  test.each(markupCases)("%s", async (_name, spec) => {
    const { react, vue } = await renderPair(reactGroup(spec), () => vueGroup(spec))
    expect(vue).toBe(react)
  })

  test("the label points at the radio button", async () => {
    const { react, vue } = await renderPair(reactGroup({ items: ITEMS }), () => vueGroup({ items: ITEMS }))
    expect(vue).toBe(react)
    expect(react).toContain('<label class="RadioLabel" data-orientation="left" for="gen-1">')
    expect(react).toContain('id="gen-1" role="radio"')
  })

  test("RadioGroup.Item is the flat RadioGroupItem", () => {
    expect(RadioGroup.Item).toBe(RadioGroupItem)
  })

  // The docs' card selection example: a tooltip trigger merged into an item
  test("an item as a tooltip trigger", async () => {
    const { react, vue } = await renderPair(
      <RRadioGroup className="flex-col w-[390px] gap-4" onChange={() => {}} aria-label="Sample options">
        <RRadioGroup.Item className="gap-2.5" value="basic">
          Basic
        </RRadioGroup.Item>
        <RTooltip maxWidth={258} content={<>Contact our <RTextLink href="#">support team</RTextLink>.</>} interactive>
          <RTooltip.Trigger>
            <RRadioGroup.Item className="gap-2.5" value="enterprise" disabled>
              Enterprise
            </RRadioGroup.Item>
          </RTooltip.Trigger>
        </RTooltip>
      </RRadioGroup>,
      () =>
        h(RadioGroup, { "class": "flex-col w-[390px] gap-4", "aria-label": "Sample options" }, () => [
          h(RadioGroupItem, { class: "gap-2.5", value: "basic" }, () => "Basic"),
          h(
            Tooltip,
            { maxWidth: 258, interactive: true },
            {
              content: () => ["Contact our ", h(TextLink, { href: "#" }, () => "support team"), "."],
              default: () =>
                h(TooltipTrigger, null, () =>
                  h(RadioGroupItem, { class: "gap-2.5", value: "enterprise", disabled: true }, () => "Enterprise"),
                ),
            },
          ),
        ]),
    )
    expect(vue).toBe(react)
    expect(react).toContain('<div class="flex" data-state="closed">')
  })
})

// ---------------------------------------------------------------------------
// Behaviour: the same script against React and Vue, with fake timers (Radix
// moves roving focus in a setTimeout, Reka in nextTick)
// ---------------------------------------------------------------------------

type Mode = "controlled" | "uncontrolled" | "fixed"

type Tools = {
  /** Records the DOM, the focused element, the calls so far and `extra` */
  snapshot: (extra?: string) => void
  /** A pointer click: mousedown, focus, mouseup, click */
  click: (selector: string) => Promise<void>
  /** HTMLElement.click() (label activation, scripted clicks) */
  activate: (selector: string) => Promise<void>
  focus: (selector: string) => Promise<void>
  /** keydown on the focused element, a frame, keyup; with a button's default actions */
  press: (key: string, init?: KeyboardEventInit) => Promise<void>
  /** Dispatches a keydown on the focused element and reports whether its default was prevented */
  keyPrevented: (key: string) => Promise<boolean>
  run: (action: () => void) => Promise<void>
}

const $ = <T extends Element = HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`No element for ${selector}`)
  return element
}

const radio = (value: string) => `button[value="${value}"]`

const describeFocus = () => {
  const element = document.activeElement as HTMLElement | null
  if (!element || element === document.body) return "body"
  if (element.getAttribute("role") === "radiogroup") return "group"
  return element.getAttribute("value") ?? element.tagName.toLowerCase()
}

const walk = async (
  reactApp: (log: string[]) => ReactElement,
  vueApp: (log: string[]) => VNode,
  script: (tools: Tools) => Promise<void>,
) => {
  const results = { react: [] as string[], vue: [] as string[], reactLog: [] as string[], vueLog: [] as string[] }

  const tools = (out: string[], log: string[]): Tools => {
    const run = async (action: () => void) => {
      await act(async () => {
        // Vue skips a listener when the event is not newer than the listener
        // (frozen Date), so the clock moves 1ms before each DOM event
        vi.setSystemTime(Date.now() + 1)
        action()
      })
      await flushVue()
      await act(async () => {
        vi.advanceTimersByTime(16)
      })
      await flushVue()
    }
    return {
      run,
      snapshot: (extra) =>
        out.push(`${serializeDom()}\nfocus: ${describeFocus()}\nlog: ${JSON.stringify(log)}${extra ? `\n${extra}` : ""}`),
      click: async (selector) => {
        await run(() => {
          const element = $(selector)
          fireEvent.mouseDown(element)
          element.focus()
          fireEvent.mouseUp(element)
          fireEvent.click(element)
        })
      },
      activate: (selector) => run(() => $(selector).click()),
      focus: (selector) => run(() => $(selector).focus()),
      press: async (key, init = {}) => {
        const options = { key, bubbles: true, cancelable: true, ...init }
        let target: HTMLElement | null = null
        let down = true
        await run(() => {
          target = document.activeElement as HTMLElement
          down = target.dispatchEvent(new KeyboardEvent("keydown", options))
          if (key === "Enter" && down && target.tagName === "BUTTON") target.click()
        })
        await run(() => {
          const upTarget = document.activeElement as HTMLElement
          const up = upTarget.dispatchEvent(new KeyboardEvent("keyup", options))
          if (key === " " && down && up && upTarget === target && upTarget.tagName === "BUTTON") upTarget.click()
        })
      },
      keyPrevented: async (key) => {
        let prevented = false
        await run(() => {
          const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
          document.activeElement!.dispatchEvent(event)
          prevented = event.defaultPrevented
        })
        await run(() => {
          document.activeElement!.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }))
        })
        return prevented
      },
    }
  }

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    await act(async () => {
      render(reactApp(results.reactLog))
    })
    await script(tools(results.react, results.reactLog))
    cleanup()
    vi.clearAllTimers()

    const { unmount } = mountVue(() => vueApp(results.vueLog))
    await flushVue()
    await script(tools(results.vue, results.vueLog))
    unmount()
    vi.clearAllTimers()
  } finally {
    vi.useRealTimers()
  }
  return results
}

/** A group whose value lives in the parent ("controlled"), nowhere ("fixed") or in the group ("uncontrolled"). */
const groupWalk = (spec: GroupCase & { initial?: string }, mode: Mode, script: (tools: Tools) => Promise<void>) => {
  function ReactApp({ log }: { log: string[] }) {
    const [value, setValue] = useState(spec.initial)
    const onChange = (next: string) => {
      log.push(`change ${next}`)
      if (mode === "controlled") setValue(next)
    }
    const props = { ...spec.props, onChange, ...(mode === "uncontrolled" ? {} : { value }) }
    return reactGroup({ ...spec, props })
  }
  const VueApp = defineComponent({
    props: { log: { type: Array, required: true } },
    setup(props) {
      const value = ref(spec.initial)
      return () => {
        const onChange = (next: string) => {
          ;(props.log as string[]).push(`change ${next}`)
          if (mode === "controlled") value.value = next
        }
        const groupProps = { ...spec.props, onChange, ...(mode === "uncontrolled" ? {} : { value: value.value }) }
        return vueGroup({ ...spec, props: groupProps })
      }
    },
  })
  return walk(
    (log) => <ReactApp log={log} />,
    (log) => h(VueApp, { log }),
    script,
  )
}

describe("RadioGroup behaviour parity", () => {
  test("uncontrolled: clicks select and report; re-clicking the checked radio does not", async () => {
    const result = await groupWalk({ items: ITEMS, props: { defaultValue: "daily" } }, "uncontrolled", async (t) => {
      t.snapshot()
      await t.click(radio("weekly"))
      t.snapshot()
      await t.click(radio("weekly"))
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["change weekly"])
    expect(result.react[1]).toContain('aria-checked="true" class="RadioItem" data-state="checked" id="gen-2"')
  })

  test("a label click selects its radio", async () => {
    const result = await groupWalk({ items: ITEMS }, "uncontrolled", async (t) => {
      await t.activate("label:nth-of-type(1)")
      t.snapshot()
      const labels = document.querySelectorAll("label")
      await t.run(() => labels[2]!.click())
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["change daily", "change monthly"])
  })

  test("controlled: reports the next value, renders what the parent passes", async () => {
    const controlled = await groupWalk({ items: ITEMS, initial: "daily" }, "controlled", async (t) => {
      await t.click(radio("monthly"))
      t.snapshot()
    })
    expect(controlled.vue).toEqual(controlled.react)
    expect(controlled.vueLog).toEqual(controlled.reactLog)
    expect(controlled.react[0]).toContain('aria-checked="true" class="RadioItem" data-state="checked" id="gen-3"')

    const fixed = await groupWalk({ items: ITEMS, initial: "daily" }, "fixed", async (t) => {
      t.snapshot()
      await t.click(radio("monthly"))
      t.snapshot()
      await t.click(radio("daily"))
      t.snapshot()
    })
    expect(fixed.vue).toEqual(fixed.react)
    expect(fixed.vueLog).toEqual(fixed.reactLog)
    expect(fixed.reactLog).toEqual(["change monthly"])
    // Still the parent's value; only the roving tab stop moved
    for (const step of fixed.react) {
      expect(step).toContain('aria-checked="true" class="RadioItem" data-state="checked" id="gen-1"')
    }
  })

  test("v-model:value on a parent ref", async () => {
    function ReactDemo() {
      const [value, setValue] = useState("daily")
      return (
        <>
          <RRadioGroup direction="col" value={value} onChange={setValue} aria-label="Notification frequency">
            {ITEMS.map((item) => (
              <RRadioGroup.Item key={item.value} value={item.value}>
                {item.label}
              </RRadioGroup.Item>
            ))}
          </RRadioGroup>
          <output>{value}</output>
        </>
      )
    }
    const VueDemo = defineComponent(() => {
      const value = ref("daily")
      return () => [
        h(
          RadioGroup,
          { "direction": "col", "value": value.value, "onUpdate:value": (v: string) => (value.value = v), "aria-label": "Notification frequency" },
          () => ITEMS.map((item) => h(RadioGroupItem, { key: item.value, value: item.value }, () => item.label)),
        ),
        h("output", null, value.value),
      ]
    })
    const result = await walk(
      () => <ReactDemo />,
      () => h(VueDemo),
      async (t) => {
        await t.click(radio("weekly"))
        t.snapshot()
        await t.focus(radio("weekly"))
        await t.press("ArrowDown")
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toContain('<output>\n    "monthly"')
  })

  test("Tab into the group focuses the checked radio, else the first focusable one", async () => {
    for (const initial of ["weekly", undefined]) {
      const result = await groupWalk(
        { items: [{ ...ITEMS[0]!, props: { disabled: true } }, ITEMS[1]!, ITEMS[2]!], initial },
        "fixed",
        async (t) => {
          await t.focus('[role="radiogroup"]')
          t.snapshot()
        },
      )
      expect(result.vue).toEqual(result.react)
      expect(result.react[0]).toContain(`focus: ${initial ?? "weekly"}`)
    }
  })

  test("arrow keys move focus and check, looping and skipping disabled radios", async () => {
    const result = await groupWalk(
      { items: [ITEMS[0]!, { ...ITEMS[1]!, props: { disabled: true } }, ITEMS[2]!, { value: "never", label: "Never" }], initial: "daily" },
      "controlled",
      async (t) => {
        await t.focus(radio("daily"))
        t.snapshot()
        await t.press("ArrowDown")
        t.snapshot()
        await t.press("ArrowRight")
        t.snapshot()
        // Loops back to the start
        await t.press("ArrowRight")
        t.snapshot()
        await t.press("ArrowUp")
        t.snapshot()
        await t.press("ArrowLeft")
        t.snapshot()
        await t.press("End")
        t.snapshot()
        await t.press("Home")
        t.snapshot()
        await t.press("PageDown")
        t.snapshot()
        await t.press("PageUp")
        t.snapshot()
        // Modifier keys are left to the browser
        await t.press("ArrowDown", { shiftKey: true })
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map((step) => step.match(/focus: (.*)/)![1])).toEqual([
      "daily",
      "monthly",
      "never",
      "daily",
      "never",
      "monthly",
      "never",
      "daily",
      "never",
      "daily",
      "daily",
    ])
    // Home/End/PageUp/PageDown move focus without checking
    expect(result.reactLog).toEqual(["change monthly", "change never", "change daily", "change never", "change monthly"])
  })

  test("Enter does not check (its default is prevented); Space checks via the button's click", async () => {
    const result = await groupWalk({ items: ITEMS, initial: "daily" }, "controlled", async (t) => {
      await t.focus(radio("weekly"))
      const enterPrevented = await t.keyPrevented("Enter")
      const spacePrevented = await t.keyPrevented(" ")
      t.snapshot(`prevented: ${enterPrevented} ${spacePrevented}`)
      await t.press(" ")
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react[0]).toContain("prevented: true false")
    expect(result.reactLog).toEqual(["change weekly"])
  })

  test("Shift+Tab out of a radio makes the group untabbable until it blurs", async () => {
    const result = await groupWalk({ items: ITEMS, initial: "weekly" }, "fixed", async (t) => {
      await t.focus(radio("weekly"))
      await t.press("Tab", { shiftKey: true })
      t.snapshot()
      await t.run(() => (document.activeElement as HTMLElement).blur())
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="radiogroup" style="outline: none" tabindex="-1"')
    expect(result.react[1]).toContain('role="radiogroup" style="outline: none" tabindex="0"')
  })

  test("a disabled group or radio ignores clicks, label clicks and keys", async () => {
    const result = await groupWalk(
      { items: [ITEMS[0]!, { ...ITEMS[1]!, props: { disabled: true } }], props: {}, initial: "daily" },
      "controlled",
      async (t) => {
        await t.click(radio("weekly"))
        await t.activate("label:nth-of-type(1)")
        await t.run(() => document.querySelectorAll("label")[1]!.click())
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.reactLog).toEqual([])

    const group = await groupWalk({ items: ITEMS, props: { disabled: true }, initial: "daily" }, "controlled", async (t) => {
      await t.click(radio("weekly"))
      await t.focus('[role="radiogroup"]')
      await t.press("ArrowDown")
      t.snapshot()
    })
    expect(group.vue).toEqual(group.react)
    expect(group.reactLog).toEqual([])
  })

  test("a double click on a label does not select its text", async () => {
    const results: boolean[][] = []
    for (const mount of [
      () => act(async () => void render(reactGroup({ items: ITEMS }))),
      async () => {
        mountVue(() => vueGroup({ items: ITEMS }))
        await flushVue()
      },
    ]) {
      await mount()
      const label = document.querySelector("label")!
      results.push(
        [1, 2].map((detail) => {
          const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true, detail })
          label.dispatchEvent(event)
          return event.defaultPrevented
        }),
      )
      cleanup()
      document.body.innerHTML = ""
    }
    expect(results[1]).toEqual(results[0])
    expect(results[0]).toEqual([false, true])
  })
})

// ---------------------------------------------------------------------------
// Form behaviour: the hidden radios are submitted, and the form's listeners
// see their clicks. React's form onChange is synthetic (derived from the
// hidden input's bubbling click and React's value tracker); the Vue port
// dispatches a native `change` in exactly those cases.
// ---------------------------------------------------------------------------

const formListener = (log: string[]) => (event: { type: string; target: EventTarget | null }) => {
  const target = event.target as HTMLInputElement
  const tag = target.tagName.toLowerCase()
  log.push(tag === "input" ? `${event.type} ${target.value} ${target.checked}` : `${event.type} ${tag}`)
}

const formData = () =>
  JSON.stringify(Array.from(new FormData(document.querySelector("form")!).entries()))

const formWalk = (spec: GroupCase & { initial?: string }, mode: Mode, script: (tools: Tools) => Promise<void>) => {
  function ReactApp({ log }: { log: string[] }) {
    const [value, setValue] = useState(spec.initial)
    const onChange = (next: string) => {
      log.push(`onChange ${next}`)
      if (mode === "controlled") setValue(next)
    }
    const props = { ...spec.props, onChange, ...(mode === "uncontrolled" ? {} : { value }) }
    return (
      <form onClick={formListener(log)} onChange={formListener(log)}>
        {reactGroup({ ...spec, props, form: false })}
      </form>
    )
  }
  const VueApp = defineComponent({
    props: { log: { type: Array, required: true } },
    setup(props) {
      const value = ref(spec.initial)
      const log = props.log as string[]
      return () => {
        const onChange = (next: string) => {
          log.push(`onChange ${next}`)
          if (mode === "controlled") value.value = next
        }
        const groupProps = { ...spec.props, onChange, ...(mode === "uncontrolled" ? {} : { value: value.value }) }
        return h("form", { onClick: formListener(log), onChange: formListener(log) }, [
          vueGroup({ ...spec, props: groupProps, form: false }),
        ])
      }
    },
  })
  return walk(
    (log) => <ReactApp log={log} />,
    (log) => h(VueApp, { log }),
    script,
  )
}

describe("RadioGroup form parity", () => {
  test("named, uncontrolled: FormData follows the selection; onChange comes after the hidden inputs' events", async () => {
    const result = await formWalk({ items: ITEMS, props: { name: "frequency", defaultValue: "daily" } }, "uncontrolled", async (t) => {
      const data: string[] = []
      data.push(formData())
      await t.click(radio("weekly"))
      data.push(formData())
      await t.click(radio("monthly"))
      data.push(formData())
      await t.activate("label:nth-of-type(1)")
      data.push(formData())
      t.snapshot(`form: ${data.join(" | ")}`)
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react[0]).toContain(
      'form: [["frequency","daily"]] | [["frequency","weekly"]] | [["frequency","monthly"]] | [["frequency","daily"]]',
    )
    // radix-ui 1.8: the radio that loses the selection reports it with a
    // click that stops at its input, so only its change reaches the form
    expect(result.reactLog.slice(0, 4)).toEqual(["change daily false", "click weekly true", "change weekly true", "onChange weekly"])
  })

  test("unnamed, controlled: each hidden radio reports its own change", async () => {
    const result = await formWalk({ items: ITEMS, initial: "daily" }, "controlled", async (t) => {
      await t.click(radio("weekly"))
      await t.click(radio("monthly"))
      await t.press("ArrowUp")
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual([
      "onChange weekly",
      "change daily false",
      "click weekly true",
      "change weekly true",
      "onChange monthly",
      "change weekly false",
      "click monthly true",
      "change monthly true",
      "onChange weekly",
      "click weekly true",
      "change weekly true",
      "change monthly false",
    ])
  })

  test("named and controlled from the start: the checked attribute keeps the first value; a form reset restores it", async () => {
    const result = await formWalk(
      { items: ITEMS, props: { name: "frequency" }, initial: "weekly" },
      "controlled",
      async (t) => {
        t.snapshot()
        await t.click(radio("daily"))
        t.snapshot()
        await t.click(radio("monthly"))
        t.snapshot()
        await t.run(() => document.querySelector("form")!.reset())
        t.snapshot(`form: ${formData()}`)
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
  })

  test("a radio click stops at the button inside a form and bubbles outside one", async () => {
    const outside = await walk(
      (log) => (
        <div onClick={formListener(log)}>
          {reactGroup({ items: ITEMS })}
        </div>
      ),
      (log) => h("div", { onClick: formListener(log) }, [vueGroup({ items: ITEMS })]),
      async (t) => {
        await t.click(radio("weekly"))
        t.snapshot()
      },
    )
    expect(outside.vue).toEqual(outside.react)
    expect(outside.vueLog).toEqual(outside.reactLog)
    expect(outside.reactLog).toEqual(["click button"])
  })
})
