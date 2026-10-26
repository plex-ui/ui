import { act, cleanup, render } from "@testing-library/react"
import { createElement, useState, type ComponentType, type ReactElement, type ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive, ref, type Component, type VNode } from "vue"
import { Checkbox as RCheckbox } from "../../packages/ui/src/components/Checkbox"
import { Switch as RSwitch } from "../../packages/ui/src/components/Switch"
import { Checkbox, type CheckedState } from "../../packages/vue/src/components/Checkbox"
import { Switch } from "../../packages/vue/src/components/Switch"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair } from "./pair"

type Props = Record<string, unknown>

// jsdom has no ResizeObserver. Radix's BubbleInput (rendered in a form) needs
// one, the Vue port uses one when present; both get this recording stub.
const observers: FakeResizeObserver[] = []
class FakeResizeObserver {
  constructor(public callback: ResizeObserverCallback) {
    observers.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal("ResizeObserver", FakeResizeObserver)
})

// React prop names map to Vue ones: className is class, the change callback is
// the `update:checked` emit, focus/blur callbacks are the focus/blur emits
const toVue = ({ className, onCheckedChange, ...props }: Props) => ({
  ...props,
  ...(className ? { class: className } : {}),
  ...(onCheckedChange ? { "onUpdate:checked": onCheckedChange } : {}),
})

const inForm = (inner: ReactElement, form?: boolean) => (form ? <form>{inner}</form> : inner)
const inVueForm = (inner: VNode, form?: boolean) => (form ? h("form", null, [inner]) : inner)

const parity = (React: ComponentType<Props>, Vue: Component, props: Props, form?: boolean) =>
  renderPair(inForm(createElement(React, props), form), () => inVueForm(h(Vue as never, toVue(props)), form))

type Case = [string, Props, boolean?]

const checkboxCases: Case[] = [
  ["no props", {}],
  ["label", { label: "Same as billing address" }],
  ["label, default checked", { label: "Subscribe", defaultChecked: true }],
  ["default indeterminate", { defaultChecked: "indeterminate" }],
  ["controlled checked", { checked: true }],
  ["controlled unchecked", { checked: false, label: "Off" }],
  ["controlled indeterminate", { checked: "indeterminate", label: "Select all" }],
  ["disabled", { disabled: true, label: "Unchecked" }],
  ["disabled checked", { disabled: true, defaultChecked: true, label: "Checked" }],
  ["disabled indeterminate", { disabled: true, checked: "indeterminate" }],
  ["disabled false", { disabled: false, label: "Enabled" }],
  ["pill", { pill: true, defaultChecked: true, label: "Pill" }],
  ["ghost", { variant: "ghost", defaultChecked: true, label: "Ghost" }],
  ["ghost pill indeterminate", { variant: "ghost", pill: true, checked: "indeterminate" }],
  ["orientation right", { orientation: "right", label: "Accept terms" }],
  ["explicit id", { id: "terms", label: "Accept terms" }],
  ["className on the container", { className: "my-check", label: "Styled" }],
  ["required", { required: true }],
  ["required false", { required: false, defaultChecked: true }],
  ["name and value outside a form", { name: "terms", value: "yes", label: "Terms" }],
  ["empty label", { label: "" }],
  // `{...restProps}` lands on the button after the component's own attributes
  ["extra attributes win", { "aria-label": "Terms", "data-variant": "custom", "data-testid": "cb", style: { color: "red" }, title: "t" }],
  // Radix's hidden BubbleInput, only inside a form (or with a `form` attribute)
  ["in a form", { name: "terms", label: "Terms" }, true],
  ["in a form, checked + value + required", { name: "terms", value: "yes", defaultChecked: true, required: true }, true],
  ["in a form, disabled", { name: "terms", disabled: true, checked: true }, true],
  ["in a form, default indeterminate", { defaultChecked: "indeterminate" }, true],
  ["in a form, controlled indeterminate", { checked: "indeterminate" }, true],
  ["form attribute outside a form", { form: "settings", name: "terms" }],
]

const switchCases: Case[] = [
  ["no props", {}],
  ["label", { label: "Notifications" }],
  ["label + description", { label: "Disable user API keys", description: "Across your organization." }],
  ["description without label", { description: "Orphan description" }],
  ["label position start", { label: "Right aligned", labelPosition: "start" }],
  ["label position start + description", { label: "Dark mode", description: "Use dark theme.", labelPosition: "start" }],
  ["default checked", { defaultChecked: true, label: "On" }],
  ["controlled checked", { checked: true }],
  ["controlled unchecked", { checked: false }],
  ["disabled", { disabled: true }],
  ["disabled checked", { disabled: true, checked: true, label: "Locked" }],
  ["disabled with description", { disabled: true, label: "SSO", description: "Enterprise only." }],
  ["required", { required: true }],
  ["required false", { required: false }],
  ["explicit id + description", { id: "keys", label: "Keys", description: "Desc" }],
  ["className on the container", { className: "my-switch", label: "Styled" }],
  ["name and value outside a form", { name: "notifications", value: "yes" }],
  ["extra attributes win", { "aria-label": "Airplane", "aria-describedby": "elsewhere", "data-testid": "sw", style: { color: "red" } }],
  ["in a form", { name: "notifications", label: "Notify", description: "Desc" }, true],
  ["in a form, checked + value + required", { name: "n", value: "yes", defaultChecked: true, required: true }, true],
  ["in a form, disabled", { disabled: true, checked: true }, true],
  ["form attribute outside a form", { form: "settings" }],
]

describe("Checkbox parity", () => {
  test.each(checkboxCases)("%s", async (_name, props, form) => {
    const { react, vue } = await parity(RCheckbox as never, Checkbox, props, form)
    expect(vue).toBe(react)
  })

  test("rich label slot", async () => {
    const { react, vue } = await renderPair(
      <RCheckbox
        defaultChecked
        label={
          <div className="flex flex-col">
            <span className="font-medium">Accept terms</span>
            <span className="text-xs">You agree to our Terms.</span>
          </div>
        }
      />,
      () =>
        h(Checkbox, { defaultChecked: true }, {
          label: () =>
            h("div", { class: "flex flex-col" }, [
              h("span", { class: "font-medium" }, "Accept terms"),
              h("span", { class: "text-xs" }, "You agree to our Terms."),
            ]),
        }),
    )
    expect(vue).toBe(react)
    expect(react).toContain('data-has-label=""')
  })

  test("the label points at the button, with a generated or explicit id", async () => {
    for (const id of [undefined, "terms"]) {
      const { react, vue } = await parity(RCheckbox as never, Checkbox, { id, label: "Terms" })
      expect(vue).toBe(react)
      for (const dom of [react, vue]) {
        const buttonId = dom.match(/<button [^>]*id="([^"]+)"/)?.[1]
        expect(buttonId).toBe(id ?? "gen-1")
        expect(dom).toContain(`for="${buttonId}"`)
      }
    }
  })
})

describe("Switch parity", () => {
  test.each(switchCases)("%s", async (_name, props, form) => {
    const { react, vue } = await parity(RSwitch as never, Switch, props, form)
    expect(vue).toBe(react)
  })

  test("rich label and description slots", async () => {
    const { react, vue } = await renderPair(
      <RSwitch label={<strong>Push</strong>} description={<em>On your devices.</em>} defaultChecked />,
      () =>
        h(Switch, { defaultChecked: true }, {
          label: () => h("strong", null, "Push"),
          description: () => h("em", null, "On your devices."),
        }),
    )
    expect(vue).toBe(react)
    expect(react).toContain('aria-describedby="gen-2"')
  })
})

// ---------------------------------------------------------------------------
// Behaviour: the same DOM script against React and Vue, with the DOM and the
// change values each reports
// ---------------------------------------------------------------------------

type Tools = { snapshot: () => void }

const walk = async (reactApp: () => ReactElement, vueApp: () => VNode, script: (tools: Tools) => Promise<void>) => {
  const react: string[] = []
  await act(async () => {
    render(reactApp())
  })
  await script({ snapshot: () => react.push(serializeDom()) })
  cleanup()

  const vue: string[] = []
  const { unmount } = mountVue(vueApp)
  await flushVue()
  await script({ snapshot: () => vue.push(serializeDom()) })
  unmount()

  return { react, vue }
}

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector(selector) as T

const click = (selector: string) => interact(() => $(selector).click())

// What a browser does for a key on a focused button: Enter clicks on keydown,
// Space clicks on keyup, unless the key event's default was prevented.
const press = (selector: string, key: "Enter" | " ") =>
  interact(() => {
    const target = $(selector)
    const init = { key, code: key === " " ? "Space" : "Enter", bubbles: true, cancelable: true }
    const down = target.dispatchEvent(new KeyboardEvent("keydown", init))
    if (key === "Enter") {
      if (down) target.click()
      target.dispatchEvent(new KeyboardEvent("keyup", init))
      return
    }
    const up = target.dispatchEvent(new KeyboardEvent("keyup", init))
    if (down && up) target.click()
  })

const keyDefaultPrevented = (selector: string, key: string) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  $(selector).dispatchEvent(event)
  return event.defaultPrevented
}

describe("Checkbox behaviour parity", () => {
  test("uncontrolled: click, label click and Space toggle; Enter does not", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walk(
      () => <RCheckbox label="Terms" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Checkbox, { "label": "Terms", "onUpdate:checked": (v: CheckedState) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
        await click("label")
        snapshot()
        await press("button", " ")
        snapshot()
        await press("button", "Enter")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([true, false, true])
    expect(react[1]).toContain('data-state="checked"')
    expect(react[4]).toBe(react[3])
  })

  test("Enter's default is prevented, Space's is not", async () => {
    const results: boolean[][] = []
    for (const mount of [
      () => act(async () => void render(<RCheckbox />)),
      async () => {
        mountVue(() => h(Checkbox))
        await flushVue()
      },
    ]) {
      await mount()
      results.push([keyDefaultPrevented("button", "Enter"), keyDefaultPrevented("button", " ")])
      cleanup()
      document.body.innerHTML = ""
    }
    expect(results[1]).toEqual(results[0])
    expect(results[0]).toEqual([true, false])
  })

  test("indeterminate default goes to checked, then unchecked", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walk(
      () => <RCheckbox defaultChecked="indeterminate" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Checkbox, { "defaultChecked": "indeterminate", "onUpdate:checked": (v: CheckedState) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
        await click("button")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([true, false])
    expect(react[0]).toContain('aria-checked="mixed"')
  })

  test("controlled: reports the next state, renders only what the parent passes", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walk(
      () => <RCheckbox checked="indeterminate" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Checkbox, { "checked": "indeterminate", "onUpdate:checked": (v: CheckedState) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toBe(react[0])
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([true])
  })

  test("v-model:checked cycles like the docs' select-all demo", async () => {
    const next = (c: CheckedState): CheckedState => (c === "indeterminate" ? true : c ? false : "indeterminate")
    function ReactDemo() {
      const [checked, setChecked] = useState<CheckedState>("indeterminate")
      return <RCheckbox label="Select all" checked={checked} onCheckedChange={() => setChecked(next)} />
    }
    const VueDemo = defineComponent(() => {
      const checked = ref<CheckedState>("indeterminate")
      return () =>
        h(Checkbox, {
          "label": "Select all",
          "checked": checked.value,
          "onUpdate:checked": () => (checked.value = next(checked.value)),
        })
    })
    const { react, vue } = await walk(
      () => <ReactDemo />,
      () => h(VueDemo),
      async ({ snapshot }) => {
        for (let i = 0; i < 4; i++) {
          snapshot()
          await click("button")
        }
      },
    )
    expect(vue).toEqual(react)
    expect(react.map((dom) => dom.match(/aria-checked="(\w+)"/)?.[1])).toEqual(["mixed", "true", "false", "mixed"])
  })

  test("v-model:checked from a parent's state, like the docs' group demo", async () => {
    const items = ["read", "write", "execute"]
    function ReactGroup() {
      const [checked, setChecked] = useState<Record<string, boolean>>({ read: true, write: false, execute: false })
      const all = items.every((i) => checked[i])
      const none = items.every((i) => !checked[i])
      return (
        <div>
          <RCheckbox
            label="Permissions"
            checked={all ? true : none ? false : "indeterminate"}
            onCheckedChange={() => setChecked(Object.fromEntries(items.map((i) => [i, !all])))}
          />
          {items.map((i) => (
            <RCheckbox key={i} id={i} label={i} checked={checked[i]} onCheckedChange={(v) => setChecked((c) => ({ ...c, [i]: Boolean(v) }))} />
          ))}
        </div>
      )
    }
    const VueGroup = defineComponent(() => {
      const checked = reactive<Record<string, boolean>>({ read: true, write: false, execute: false })
      return () => {
        const all = items.every((i) => checked[i])
        const none = items.every((i) => !checked[i])
        return h("div", null, [
          h(Checkbox, {
            "label": "Permissions",
            "checked": all ? true : none ? false : "indeterminate",
            "onUpdate:checked": () => items.forEach((i) => (checked[i] = !all)),
          }),
          ...items.map((i) =>
            h(Checkbox, { "key": i, "id": i, "label": i, "checked": checked[i], "onUpdate:checked": (v: CheckedState) => (checked[i] = Boolean(v)) }),
          ),
        ])
      }
    })
    const { react, vue } = await walk(
      () => <ReactGroup />,
      () => h(VueGroup),
      async ({ snapshot }) => {
        snapshot()
        await click("#write")
        snapshot()
        await click("#execute")
        snapshot()
        await click("button")
        snapshot()
        await click("button")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(new Set(react).size).toBe(4)
  })

  test("disabled ignores clicks and keys", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walk(
      () => <RCheckbox disabled label="Off" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Checkbox, { "disabled": true, "label": "Off", "onUpdate:checked": (v: CheckedState) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        await click("label")
        await press("button", " ")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toBe(react[0])
    expect(reactChanges).toEqual([])
    expect(vueChanges).toEqual([])
  })

  test("the consumer's click handler runs first and can cancel the toggle", async () => {
    const log: Record<"react" | "vue", string[]> = { react: [], vue: [] }
    let prevent = true
    const handler = (which: "react" | "vue") => (event: { preventDefault(): void }) => {
      log[which].push(`click ${prevent}`)
      if (prevent) event.preventDefault()
    }
    const run = async (which: "react" | "vue") => {
      prevent = true
      await click("button")
      prevent = false
      await click("button")
      log[which].push(document.querySelector("button")!.getAttribute("data-state")!)
    }
    let which: "react" | "vue" = "react"
    const { react, vue } = await walk(
      () => <RCheckbox {...({ onClick: handler("react") } as Props)} onCheckedChange={(v) => log.react.push(`change ${v}`)} />,
      () => h(Checkbox, { "onClick": handler("vue"), "onUpdate:checked": (v: CheckedState) => log.vue.push(`change ${v}`) }),
      async ({ snapshot }) => {
        await run(which)
        which = "vue"
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(log.vue).toEqual(log.react)
    expect(log.react).toEqual(["click true", "click false", "change true", "checked"])
  })

  test("focus and blur callbacks", async () => {
    const log: Record<"react" | "vue", string[]> = { react: [], vue: [] }
    await walk(
      () => <RCheckbox onFocus={(e) => log.react.push(e.type)} onBlur={(e) => log.react.push(e.type)} />,
      () => h(Checkbox, { onFocus: (e: FocusEvent) => log.vue.push(e.type), onBlur: (e: FocusEvent) => log.vue.push(e.type) }),
      async () => {
        await interact(() => $("button").focus())
        await interact(() => $("button").blur())
      },
    )
    expect(log.vue).toEqual(log.react)
    expect(log.react).toEqual(["focus", "blur"])
  })

  test("double-clicking the label does not select text", async () => {
    const results: boolean[][] = []
    for (const mount of [
      () => act(async () => void render(<RCheckbox label="Terms" />)),
      async () => {
        mountVue(() => h(Checkbox, { label: "Terms" }))
        await flushVue()
      },
    ]) {
      await mount()
      results.push(
        [1, 2].map((detail) => {
          const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true, detail })
          $("label").dispatchEvent(event)
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

describe("Switch behaviour parity", () => {
  test("uncontrolled: click, label click, Space and Enter toggle", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walk(
      () => <RSwitch label="Airplane mode" description="Desc" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Switch, { "label": "Airplane mode", "description": "Desc", "onUpdate:checked": (v: boolean) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
        await click("label")
        snapshot()
        await press("button", " ")
        snapshot()
        await press("button", "Enter")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([true, false, true, false])
  })

  test("Enter is left to the browser: not prevented, toggles through a click", async () => {
    const log: Record<"react" | "vue", string[]> = { react: [], vue: [] }
    const results: boolean[] = []
    const mounts = [
      () => act(async () => void render(<RSwitch {...({ onClick: () => log.react.push("click") } as Props)} />)),
      async () => {
        mountVue(() => h(Switch, { onClick: () => log.vue.push("click") }))
        await flushVue()
      },
    ]
    for (const mount of mounts) {
      await mount()
      results.push(keyDefaultPrevented("button", "Enter"))
      await press("button", "Enter")
      results.push($("button").getAttribute("aria-checked") === "true")
      cleanup()
      document.body.innerHTML = ""
    }
    expect(results).toEqual([false, true, false, true])
    expect(log.vue).toEqual(log.react)
    expect(log.react).toEqual(["click"])
  })

  test("the consumer's handlers run first and can cancel the toggle", async () => {
    const log: Record<"react" | "vue", string[]> = { react: [], vue: [] }
    const cancel = (event: { preventDefault(): void; key?: string }) => {
      if (event.key === "Enter" || !("key" in event)) event.preventDefault()
    }
    let which: "react" | "vue" = "react"
    const { react, vue } = await walk(
      () => (
        <RSwitch
          {...({ onClick: cancel, onKeyDown: cancel } as Props)}
          onCheckedChange={(v) => log.react.push(`change ${v}`)}
        />
      ),
      () => h(Switch, { "onClick": cancel, "onKeydown": cancel, "onUpdate:checked": (v: boolean) => log.vue.push(`change ${v}`) }),
      async ({ snapshot }) => {
        await click("button")
        await press("button", "Enter")
        await press("button", " ")
        log[which].push($("button").getAttribute("data-state")!)
        which = "vue"
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(log.vue).toEqual(log.react)
    expect(log.react).toEqual(["unchecked"])
  })

  test("controlled: reports the next state, renders only what the parent passes", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walk(
      () => <RSwitch checked onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Switch, { "checked": true, "onUpdate:checked": (v: boolean) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toBe(react[0])
    expect(vueChanges).toEqual(reactChanges)
    expect(reactChanges).toEqual([false])
  })

  test("v-model:checked", async () => {
    function ReactDemo() {
      const [checked, setChecked] = useState(false)
      return <RSwitch label="Airplane mode" checked={checked} onCheckedChange={setChecked} />
    }
    const VueDemo = defineComponent(() => {
      const checked = ref(false)
      return () => h(Switch, { "label": "Airplane mode", "checked": checked.value, "onUpdate:checked": (v: boolean) => (checked.value = v) })
    })
    const { react, vue } = await walk(
      () => <ReactDemo />,
      () => h(VueDemo),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
        await press("button", " ")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('aria-checked="true"')
    expect(react[2]).toBe(react[0])
  })

  test("disabled ignores clicks and keys", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue } = await walk(
      () => <RSwitch disabled label="Off" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Switch, { "disabled": true, "label": "Off", "onUpdate:checked": (v: boolean) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        await click("label")
        await press("button", "Enter")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toBe(react[0])
    expect(reactChanges).toEqual([])
    expect(vueChanges).toEqual([])
  })

  test("focus and blur callbacks", async () => {
    const log: Record<"react" | "vue", string[]> = { react: [], vue: [] }
    await walk(
      () => <RSwitch onFocus={(e) => log.react.push(e.type)} onBlur={(e) => log.react.push(e.type)} />,
      () => h(Switch, { onFocus: (e: FocusEvent) => log.vue.push(e.type), onBlur: (e: FocusEvent) => log.vue.push(e.type) }),
      async () => {
        await interact(() => $("button").focus())
        await interact(() => $("button").blur())
      },
    )
    expect(log.vue).toEqual(log.react)
    expect(log.react).toEqual(["focus", "blur"])
  })
})

// ---------------------------------------------------------------------------
// Forms: Radix's hidden BubbleInput, ported instead of Reka's hidden input
// ---------------------------------------------------------------------------

type FormLog = string[]

const formListener = (log: FormLog) => (event: Event) => {
  const target = event.target as HTMLInputElement
  log.push(`${event.type} ${target.tagName.toLowerCase()} ${target.tagName === "INPUT" ? target.checked : ""}`.trim())
}

const formWalk = async (
  reactControl: () => ReactNode,
  vueControl: () => VNode,
  script: (tools: Tools) => Promise<void>,
) => {
  const reactLog: FormLog = []
  const vueLog: FormLog = []
  const result = await walk(
    () => (
      <form id="settings" onClick={formListener(reactLog)}>
        {reactControl()}
      </form>
    ),
    () => h("form", { id: "settings", onClick: formListener(vueLog) }, [vueControl()]),
    script,
  )
  return { ...result, reactLog, vueLog }
}

describe("Form parity", () => {
  test("Checkbox: the button's click stays put, the hidden input's click reaches the form", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue, reactLog, vueLog } = await formWalk(
      () => <RCheckbox name="terms" label="Terms" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Checkbox, { "name": "terms", "label": "Terms", "onUpdate:checked": (v: CheckedState) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
        await click("label")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactLog).toEqual(["click input true", "click label", "click input false"])
    expect(reactChanges).toEqual([true, false])
  })

  test("Checkbox: a consumer that stops propagation keeps the input's click from bubbling", async () => {
    const stop = (event: { stopPropagation(): void }) => event.stopPropagation()
    const { reactLog, vueLog } = await formWalk(
      () => <RCheckbox name="terms" {...({ onClick: stop } as Props)} />,
      () => h(Checkbox, { name: "terms", onClick: stop }),
      async () => {
        await click("button")
        await click("button")
      },
    )
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual([])
  })

  test("Checkbox: indeterminate sets the hidden input's indeterminate flag", async () => {
    const states: string[][] = []
    const read = () => {
      const input = $<HTMLInputElement>("input")
      return `${input.checked} ${input.indeterminate}`
    }
    function ReactDemo() {
      const [checked, setChecked] = useState<CheckedState>(false)
      return (
        <form>
          <RCheckbox checked={checked} onCheckedChange={setChecked} />
          <button type="button" id="mixed" onClick={() => setChecked("indeterminate")} />
        </form>
      )
    }
    const VueDemo = defineComponent(() => {
      const checked = ref<CheckedState>(false)
      return () =>
        h("form", null, [
          h(Checkbox, { "checked": checked.value, "onUpdate:checked": (v: CheckedState) => (checked.value = v) }),
          h("button", { type: "button", id: "mixed", onClick: () => (checked.value = "indeterminate") }),
        ])
    })
    await walk(
      () => <ReactDemo />,
      () => h(VueDemo),
      async () => {
        const run: string[] = []
        await click("#mixed")
        run.push(read())
        await click("button[role=checkbox]")
        run.push(read())
        states.push(run)
      },
    )
    expect(states[1]).toEqual(states[0])
    expect(states[0]).toEqual(["false true", "true false"])
  })

  test("Checkbox: form reset restores the initial state", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue, reactLog, vueLog } = await formWalk(
      () => <RCheckbox name="terms" defaultChecked onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Checkbox, { "name": "terms", "defaultChecked": true, "onUpdate:checked": (v: CheckedState) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        await click("button")
        snapshot()
        await interact(() => $<HTMLFormElement>("form").reset())
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    expect(vueChanges).toEqual(reactChanges)
    expect(react[1]).toContain('data-state="checked"')
    // radix-ui 1.8: a change the user did not click (the reset) is reported
    // with a click that stops at the hidden input
    expect(reactLog).toEqual(["click input false"])
    expect(reactChanges).toEqual([false, true])
  })

  test("Switch: the button's click stays put, the hidden input's click reaches the form; reset restores the initial state", async () => {
    const reactChanges: unknown[] = []
    const vueChanges: unknown[] = []
    const { react, vue, reactLog, vueLog } = await formWalk(
      () => <RSwitch name="n" label="Notify" onCheckedChange={(v) => reactChanges.push(v)} />,
      () => h(Switch, { "name": "n", "label": "Notify", "onUpdate:checked": (v: boolean) => vueChanges.push(v) }),
      async ({ snapshot }) => {
        snapshot()
        await click("button")
        snapshot()
        await press("button", "Enter")
        snapshot()
        await click("button")
        await interact(() => $<HTMLFormElement>("form").reset())
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    expect(vueChanges).toEqual(reactChanges)
    expect(reactLog).toEqual(["click input true", "click input false", "click input true"])
    // radix-ui 1.8's Switch restores its initial state on a form reset
    expect(reactChanges).toEqual([true, false, true, false])
    expect(react[3]).toContain('aria-checked="false"')
  })

  // React's form onChange is a synthetic event: React derives it from the
  // hidden input's bubbling click when the input's `checked` differs from the
  // value it last reported (its value tracker), so no native `change` exists
  // and a native listener on a React form sees none. Vue's form listeners are
  // native, so the port dispatches a native `change` in exactly those cases.
  const changeWalk = async (
    reactControl: () => ReactNode,
    vueControl: () => VNode,
    script: (tools: Tools) => Promise<void>,
  ) => {
    const reactLog: FormLog = []
    const vueLog: FormLog = []
    const native: Record<"react" | "vue", FormLog> = { react: [], vue: [] }
    let which: "react" | "vue" = "react"
    const result = await walk(
      () => (
        <form onClick={formListener(reactLog)} onChange={formListener(reactLog)}>
          {reactControl()}
        </form>
      ),
      () => h("form", { onClick: formListener(vueLog), onChange: formListener(vueLog) }, [vueControl()]),
      async (tools) => {
        $("form").addEventListener("change", formListener(native[which]))
        await script(tools)
        which = "vue"
      },
    )
    return { ...result, reactLog, vueLog, native }
  }

  test("Checkbox: the form's change listener sees each toggle, like React's onChange", async () => {
    const { react, vue, reactLog, vueLog, native } = await changeWalk(
      () => <RCheckbox name="terms" label="Terms" />,
      () => h(Checkbox, { name: "terms", label: "Terms" }),
      async ({ snapshot }) => {
        await click("button")
        await click("label")
        await click("button")
        // The reset restores the input before the state follows; React still
        // reports a change, as its tracker last saw `true`
        await interact(() => $<HTMLFormElement>("form").reset())
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual([
      "click input true",
      "change input true",
      "click label",
      "click input false",
      "change input false",
      "click input true",
      "change input true",
      // The reset's click stops at the input; its change still reaches the form
      "change input false",
    ])
    expect(native.react).toEqual([])
    expect(native.vue).toEqual(["change input true", "change input false", "change input true", "change input false"])
  })

  test("Checkbox: no change when only indeterminate moves, or when the input's click does not bubble", async () => {
    const stop = (event: { stopPropagation(): void }) => {
      if (stopNext) event.stopPropagation()
    }
    let stopNext = false
    const states = ["indeterminate", true, "indeterminate", false] as const
    function ReactDemo() {
      const [checked, setChecked] = useState<CheckedState>(false)
      return (
        <>
          <RCheckbox name="all" checked={checked} onCheckedChange={setChecked} {...({ onClick: stop } as Props)} />
          {states.map((state, i) => (
            <span key={i} id={`set-${i}`} onClick={() => setChecked(state)} />
          ))}
        </>
      )
    }
    const VueDemo = defineComponent(() => {
      const checked = ref<CheckedState>(false)
      return () => [
        h(Checkbox, {
          "name": "all",
          "checked": checked.value,
          "onUpdate:checked": (v: CheckedState) => (checked.value = v),
          "onClick": stop,
        }),
        ...states.map((state, i) => h("span", { id: `set-${i}`, onClick: () => (checked.value = state) })),
      ]
    })
    const { react, vue, reactLog, vueLog } = await changeWalk(
      () => <ReactDemo />,
      () => h(VueDemo),
      async ({ snapshot }) => {
        for (let i = 0; i < states.length; i++) await click(`#set-${i}`)
        stopNext = true
        await click("button")
        stopNext = false
        await click("button")
        await click("button")
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    // radix-ui 1.8: the parent's changes are reported with clicks that stop
    // at the input; only their changes reach the form
    expect(reactLog).toEqual([
      "click span",
      "click span",
      "change input true",
      "click span",
      "change input false",
      "click span",
      // The consumer stopped the next click: the input's click stays put and
      // React's tracker misses it, so the click after reports no change
      "click input false",
      "click input true",
      "change input true",
    ])
  })

  test("Switch: the form's change listener sees each toggle, like React's onChange", async () => {
    const { react, vue, reactLog, vueLog, native } = await changeWalk(
      () => <RSwitch name="n" label="Notify" defaultChecked />,
      () => h(Switch, { name: "n", label: "Notify", defaultChecked: true }),
      async ({ snapshot }) => {
        await click("button")
        await press("button", "Enter")
        await click("button")
        await interact(() => $<HTMLFormElement>("form").reset())
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual([
      "click input false",
      "change input false",
      "click input true",
      "change input true",
      "click input false",
      "change input false",
      // radix-ui 1.8's Switch restores its initial state on a form reset
      "change input true",
    ])
    expect(native.react).toEqual([])
    expect(native.vue).toEqual(["change input false", "change input true", "change input false", "change input true"])
  })

  test("the hidden input takes the button's size and follows resizes", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(16)
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(16)
    for (const [React, Vue] of [
      [RCheckbox, Checkbox],
      [RSwitch, Switch],
    ] as const) {
      const { react, vue } = await walk(
        () => <form>{createElement(React as ComponentType<Props>, { name: "x" })}</form>,
        () => h("form", null, [h(Vue as never, { name: "x" })]),
        async ({ snapshot }) => {
          snapshot()
          const observer = observers.at(-1)!
          await interact(() => {
            observer.callback(
              [{ borderBoxSize: [{ inlineSize: 32, blockSize: 18 }] } as unknown as ResizeObserverEntry],
              observer as unknown as ResizeObserver,
            )
          })
          snapshot()
          // radix-ui 1.8 applies the new size on the next animation frame
          await interact(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
          snapshot()
        },
      )
      expect(vue).toEqual(react)
      expect(react[0]).toContain("height: 16px")
      expect(react[1]).toContain("width: 16px")
      expect(react[2]).toContain("width: 32px")
    }
  })
})
