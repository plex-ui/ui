import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useState, type ComponentType, type ReactElement, type ReactNode } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString as reactRenderToString } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"
import { createCommentVNode, createSSRApp, createTextVNode, defineComponent, Fragment, h, ref, type VNode } from "vue"
import { renderToString as vueRenderToString } from "vue/server-renderer"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import RSearch from "../../packages/ui/src/components/Icon/svg/Search"
import { Input, InputAdornmentButton } from "../../packages/vue/src/components/Input"
import Search from "../../packages/vue/src/components/Icon/svg/Search"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

const RAdornmentButton = (RInput as unknown as { AdornmentButton: ComponentType<Props> }).AdornmentButton
const noop = () => {}

// Adornments are described by name so each framework renders its own nodes:
// "search" is the Search icon, "count" a counter span, "button" an AdornmentButton
const reactAdornment = (kind: unknown): ReactNode => {
  if (kind === "search") return <RSearch className="fill-tertiary" />
  if (kind === "count") return <span className="tabular-nums">0/16</span>
  if (kind === "button") return <RAdornmentButton aria-label="Show" aria-pressed={false}>👁</RAdornmentButton>
  return null
}
const vueAdornment = (kind: unknown): VNode | null => {
  if (kind === "search") return h(Search, { class: "fill-tertiary" })
  if (kind === "count") return h("span", { class: "tabular-nums" }, "0/16")
  if (kind === "button") return h(InputAdornmentButton, { "aria-label": "Show", "aria-pressed": false }, () => "👁")
  return null
}

// React props map to Vue: className → class, adornments → slots, onChange → update:value
const toReact = ({ startAdornment, endAdornment, ...props }: Props) => ({
  ...props,
  ...(startAdornment ? { startAdornment: reactAdornment(startAdornment) } : {}),
  ...(endAdornment ? { endAdornment: reactAdornment(endAdornment) } : {}),
})
const toVue = ({ className, startAdornment, endAdornment, onChange, ...props }: Props) => {
  const slots: Record<string, () => unknown> = {}
  if (startAdornment) slots.startAdornment = () => vueAdornment(startAdornment)
  if (endAdornment) slots.endAdornment = () => vueAdornment(endAdornment)
  return {
    props: { ...props, ...(className ? { class: className } : {}), ...(onChange ? { "onUpdate:value": onChange } : {}) },
    slots,
  }
}

const reactInput = (props: Props) => createElement(RInput as ComponentType<Props>, toReact(props))
const vueInput = (props: Props) => {
  const { props: vueProps, slots } = toVue(props)
  return h(Input as never, vueProps, slots)
}

const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]

const cases: Array<[string, Props]> = [
  ["default", {}],
  ["placeholder, class and input attributes", { placeholder: "Enter text...", className: "w-full", "aria-label": "Name", maxLength: 16, inputMode: "numeric" }],
  ["style goes to the input", { style: { fontFamily: "monospace" } }],
  ["data attributes go to the input", { "data-testid": "field", "data-slot": "custom" }],
  ["soft variant", { variant: "soft" }],
  ...SIZES.map((size): [string, Props] => [`size ${size}`, { size }]),
  ["gutterSize", { gutterSize: "xl", size: "sm" }],
  ["disabled", { disabled: true, defaultValue: "Jane Doe" }],
  ["readOnly", { readOnly: true, defaultValue: "Jane Doe" }],
  ["invalid", { invalid: true, placeholder: "Invalid input" }],
  ["pill", { pill: true }],
  ["opticallyAlign start", { opticallyAlign: "start" }],
  ["opticallyAlign end with pill", { opticallyAlign: "end", pill: true }],
  ["explicit id", { id: "email" }],
  ["empty id falls back to the generated one", { id: "" }],
  ["name allows autofill extensions", { name: "email" }],
  ["password allows autofill extensions", { type: "password" }],
  ["allowAutofillExtensions forced on", { allowAutofillExtensions: true }],
  ["allowAutofillExtensions forced off with a name", { name: "email", allowAutofillExtensions: false }],
  ["type email", { type: "email" }],
  ["type number", { type: "number" }],
  ["controlled value", { value: "plex", onChange: noop }],
  ["controlled numeric value", { value: 42, onChange: noop }],
  ["controlled empty value", { value: "", onChange: noop }],
  ["defaultValue", { defaultValue: "plex" }],
  ["autoComplete reaches the input", { autoComplete: "email" }],
  ["start adornment", { startAdornment: "search", placeholder: "Search..." }],
  ["end adornment", { endAdornment: "count" }],
  ["both adornments", { startAdornment: "search", endAdornment: "count", size: "lg" }],
  ["adornment button", { endAdornment: "button", type: "password" }],
  ["clear button with a controlled value", { value: "plex", onChange: noop, onClear: noop }],
  ["clear button with a defaultValue", { defaultValue: "plex", onClear: noop }],
  ["clear button hidden when empty", { value: "", onChange: noop, onClear: noop }],
  ["clear button hidden when disabled", { defaultValue: "plex", onClear: noop, disabled: true }],
  ["clear button hidden when readOnly", { defaultValue: "plex", onClear: noop, readOnly: true }],
  ["clear button before the end adornment", { defaultValue: "plex", onClear: noop, endAdornment: "count", pill: true }],
]

describe("Input parity", () => {
  test.each(cases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(reactInput(props), () => vueInput(props))
    expect(vue).toBe(react)
  })
})

const adornmentCases: Array<[string, Props]> = [
  ["default", {}],
  ["color", { color: "caution" }],
  ["type submit", { type: "submit" }],
  ["pressed, label and class", { "aria-pressed": true, "aria-label": "Toggle voice mode", className: "ml-1" }],
  ["caller data-color wins", { color: "danger", "data-color": "custom" }],
]

describe("Input.AdornmentButton parity", () => {
  test.each(adornmentCases)("%s", async (_name, props) => {
    const { className, ...rest } = props
    const { react, vue } = await renderPair(
      createElement(RAdornmentButton, props, "Mic"),
      () => h(InputAdornmentButton as never, { ...rest, ...(className ? { class: className } : {}) }, () => "Mic"),
    )
    expect(vue).toBe(react)
  })
})

// Mounts each framework in turn, runs the same steps and collects snapshots
const walk = async (
  mountReact: () => void,
  mountVueApp: () => VNode,
  steps: (snap: () => void, input: () => HTMLInputElement) => Promise<void>,
) => {
  const runs: string[][] = []
  for (const framework of ["react", "vue"] as const) {
    const snaps: string[] = []
    if (framework === "react") {
      await act(async () => {
        mountReact()
      })
    } else {
      mountVue(mountVueApp)
      await flushVue()
    }
    await steps(() => snaps.push(serializeDom()), () => document.querySelector("input") as HTMLInputElement)
    runs.push(snaps)
    if (framework === "react") cleanup()
  }
  return { react: runs[0]!, vue: runs[1]! }
}

// React (in jsdom, where AnimationEvent is missing) listens for the
// webkit-prefixed event; Vue binds `animationstart`. Fire both.
const fireAnimationStart = (element: Element, animationName: string) => {
  for (const type of ["animationstart", "webkitAnimationStart"]) {
    const event = new Event(type, { bubbles: true })
    Object.defineProperty(event, "animationName", { value: animationName })
    element.dispatchEvent(event)
  }
}

describe("Input behaviour parity", () => {
  test("focus and blur toggle data-focused", async () => {
    const { react, vue } = await walk(
      () => render(reactInput({ placeholder: "Name" })),
      () => vueInput({ placeholder: "Name" }),
      async (snap, input) => {
        snap()
        await interact(() => fireEvent.focus(input()))
        snap()
        await interact(() => fireEvent.blur(input()))
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('data-focused="false"')
    expect(react[1]).toContain('data-focused="true"')
  })

  test("typing reports each value (onChange / update:value)", async () => {
    const reactValues: string[] = []
    const vueValues: string[] = []
    await walk(
      () => render(reactInput({ onChange: (evt: { target: HTMLInputElement }) => reactValues.push(evt.target.value) })),
      () => vueInput({ onChange: (value: string) => vueValues.push(value) }),
      async (_snap, input) => {
        await interact(() => fireEvent.input(input(), { target: { value: "A" } }))
        await interact(() => fireEvent.input(input(), { target: { value: "Ad" } }))
        await interact(() => fireEvent.input(input(), { target: { value: "Ada" } }))
      },
    )
    expect(vueValues).toEqual(reactValues)
    expect(reactValues).toEqual(["A", "Ad", "Ada"])
  })

  test("v-model:value drives a controlled input with a clear button", async () => {
    function ReactApp() {
      const [value, setValue] = useState("plex")
      return reactInput({ value, onChange: (evt: { target: HTMLInputElement }) => setValue(evt.target.value), onClear: () => setValue("") })
    }
    const VueApp = defineComponent({
      setup() {
        const value = ref("plex")
        return () =>
          h(Input, { "value": value.value, "onUpdate:value": (next: string) => (value.value = next), "onClear": () => (value.value = "") })
      },
    })
    const { react, vue } = await walk(
      () => render(<ReactApp />),
      () => h(VueApp),
      async (snap, input) => {
        snap()
        await interact(() => fireEvent.click(document.querySelector('button[aria-label="Clear input"]')!))
        snap()
        expect(input().value).toBe("")
        await interact(() => fireEvent.input(input(), { target: { value: "ui" } }))
        snap()
        expect(input().value).toBe("ui")
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain("Clear input")
    expect(react[1]).not.toContain("Clear input")
    expect(react[2]).toContain("Clear input")
  })

  test("controlled value and state-driven props follow updates", async () => {
    const { react, vue } = await walkPairWithState(
      { value: "a", disabled: false, invalid: false, size: "md" },
      (state) => reactInput({ ...state, onChange: noop, onClear: noop }),
      (state) => vueInput({ ...state, onClear: noop }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ value: "" })
        snapshot()
        await set({ value: "abc", disabled: true })
        snapshot()
        await set({ disabled: false, invalid: true, size: "xl" })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).not.toContain("Clear input")
    expect(react[3]).toContain("data-invalid")
  })

  test("a controlled value the parent does not update is put back", async () => {
    const values: string[] = []
    for (const framework of ["react", "vue"] as const) {
      if (framework === "react") {
        render(createElement(RInput, { value: "fixed", onChange: noop }))
        await interact(() => {})
      } else {
        mountVue(() => h(Input, { "value": "fixed", "onUpdate:value": noop }))
        await flushVue()
      }
      const field = document.querySelector("input")!
      await interact(() => fireEvent.input(field, { target: { value: "fixedX" } }))
      await flushVue()
      values.push(field.value)
      if (framework === "react") cleanup()
    }
    expect(values).toEqual(["fixed", "fixed"])
  })

  test("uncontrolled input keeps what the user typed across re-renders", async () => {
    const { react, vue } = await walk(
      () => render(reactInput({ defaultValue: "plex", onClear: noop })),
      () => vueInput({ defaultValue: "plex", onClear: noop }),
      async (snap, input) => {
        await interact(() => fireEvent.focus(input()))
        await interact(() => fireEvent.input(input(), { target: { value: "typed" } }))
        await interact(() => fireEvent.blur(input()))
        snap()
        expect(input().value).toBe("typed")
        // Clearing the text does not hide the clear button: React derives it from the props
        await interact(() => fireEvent.input(input(), { target: { value: "" } }))
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain("Clear input")
  })

  test("clear button click calls onClear", async () => {
    const reactClear = vi.fn()
    const vueClear = vi.fn()
    await walk(
      () => render(reactInput({ defaultValue: "plex", onClear: reactClear })),
      () => vueInput({ defaultValue: "plex", onClear: vueClear }),
      async () => {
        await interact(() => fireEvent.click(document.querySelector('button[aria-label="Clear input"]')!))
      },
    )
    expect(reactClear).toHaveBeenCalledTimes(1)
    expect(vueClear).toHaveBeenCalledTimes(1)
  })

  test("container mousedown focuses the input and places the caret or selection", async () => {
    const results: Record<string, Array<[number | null, number | null, boolean]>> = { react: [], vue: [] }
    let framework: "react" | "vue" = "react"
    await walk(
      () => render(reactInput({ defaultValue: "hello brave world", startAdornment: "search" })),
      () => vueInput({ defaultValue: "hello brave world", startAdornment: "search" }),
      async (_snap, input) => {
        const container = document.querySelector("[data-slot='input']")!
        const record = () => {
          results[framework]!.push([input().selectionStart, input().selectionEnd, document.activeElement === input()])
          input().blur()
        }
        for (const detail of [1, 2, 3]) {
          await interact(() => fireEvent.mouseDown(container, { detail }))
          record()
        }
        // Before the input (left of it): caret at the start, first word on double click
        vi.spyOn(input(), "getBoundingClientRect").mockReturnValue({ left: 50, top: 0 } as DOMRect)
        for (const detail of [1, 2]) {
          await interact(() => fireEvent.mouseDown(container, { detail, clientX: 10, clientY: 5 }))
          record()
        }
        // Clicks on the adornment svg are redirected too
        await interact(() => fireEvent.mouseDown(container.querySelector("svg")!, { detail: 1, clientX: 10 }))
        record()
        framework = "vue"
      },
    )
    expect(results.vue).toEqual(results.react)
    expect(results.react).toEqual([
      [17, 17, true],
      [12, 17, true],
      [0, 17, true],
      [0, 0, true],
      [0, 5, true],
      [0, 0, true],
    ])
  })

  test("mousedown on buttons inside the container is left alone", async () => {
    const focused: Record<string, boolean[]> = { react: [], vue: [] }
    let framework: "react" | "vue" = "react"
    const MenuItem = () => <span role="menuitem">item</span>
    await walk(
      () =>
        render(
          createElement(RInput as ComponentType<Props>, {
            defaultValue: "plex",
            onClear: noop,
            endAdornment: <MenuItem />,
          }),
        ),
      () => h(Input, { defaultValue: "plex", onClear: noop }, { endAdornment: () => h("span", { role: "menuitem" }, "item") }),
      async (_snap, input) => {
        for (const selector of ['button[aria-label="Clear input"]', "[role='menuitem']"]) {
          const event = fireEvent.mouseDown(document.querySelector(selector)!, { detail: 1 })
          await interact(() => {})
          focused[framework]!.push(document.activeElement === input(), event)
        }
        framework = "vue"
      },
    )
    expect(focused.vue).toEqual(focused.react)
    // Not focused, default not prevented (fireEvent returns true)
    expect(focused.react).toEqual([false, true, false, true])
  })

  test("autoSelect selects the contents on mount and when it turns on", async () => {
    const selections: Record<string, Array<[number | null, number | null]>> = { react: [], vue: [] }
    let framework: "react" | "vue" = "react"
    const read = () => {
      const input = document.querySelector("input")!
      selections[framework]!.push([input.selectionStart, input.selectionEnd])
      input.setSelectionRange(0, 0)
    }
    await walkPairWithState(
      { autoSelect: true },
      (state) => reactInput({ ...state, defaultValue: "Toggle to auto select" }),
      (state) => vueInput({ ...state, defaultValue: "Toggle to auto select" }),
      async ({ set }) => {
        read()
        await set({ autoSelect: false })
        read()
        await set({ autoSelect: true })
        read()
        framework = "vue"
      },
    )
    expect(selections.vue).toEqual(selections.react)
    expect(selections.react).toEqual([
      [0, 21],
      [0, 0],
      [0, 21],
    ])
  })

  test("browser autofill animation reports onAutofill / @autofill", async () => {
    const react = { autofill: vi.fn(), animation: vi.fn() }
    const vue = { autofill: vi.fn(), animation: vi.fn() }
    await walk(
      () => render(reactInput({ onAutofill: react.autofill, onAnimationStart: react.animation })),
      () => h(Input, { onAutofill: vue.autofill, onAnimationstart: vue.animation }),
      async (_snap, input) => {
        await interact(() => fireAnimationStart(input(), "native-autofill-in"))
        await interact(() => fireAnimationStart(input(), "something-else"))
      },
    )
    expect(vue.autofill).toHaveBeenCalledTimes(1)
    expect(react.autofill).toHaveBeenCalledTimes(1)
    expect(vue.animation).toHaveBeenCalledTimes(2)
    expect(react.animation).toHaveBeenCalledTimes(2)
  })

  test("native focus and blur listeners still run", async () => {
    const react = { focus: vi.fn(), blur: vi.fn() }
    const vue = { focus: vi.fn(), blur: vi.fn() }
    await walk(
      () => render(reactInput({ onFocus: react.focus, onBlur: react.blur })),
      () => h(Input, { onFocus: vue.focus, onBlur: vue.blur }),
      async (_snap, input) => {
        await interact(() => fireEvent.focus(input()))
        await interact(() => fireEvent.blur(input()))
      },
    )
    expect([vue.focus.mock.calls.length, vue.blur.mock.calls.length]).toEqual([1, 1])
    expect([react.focus.mock.calls.length, react.blur.mock.calls.length]).toEqual([1, 1])
  })

  test("keyboard: Enter, Escape and arrows reach native listeners on the input", async () => {
    const reactKeys: string[] = []
    const vueKeys: string[] = []
    await walk(
      () => render(reactInput({ onKeyDown: (evt: KeyboardEvent) => reactKeys.push(evt.key) })),
      () => h(Input, { onKeydown: (evt: KeyboardEvent) => vueKeys.push(evt.key) }),
      async (_snap, input) => {
        for (const key of ["Enter", "Escape", "ArrowLeft"]) {
          await interact(() => fireEvent.keyDown(input(), { key }))
        }
      },
    )
    expect(vueKeys).toEqual(reactKeys)
    expect(reactKeys).toEqual(["Enter", "Escape", "ArrowLeft"])
  })

  test("adornment button toggles a password field", async () => {
    function ReactApp() {
      const [visible, setVisible] = useState(false)
      return createElement(RInput as ComponentType<Props>, {
        placeholder: "Password",
        type: visible ? "text" : "password",
        endAdornment: (
          <RAdornmentButton aria-label={visible ? "Hide" : "Show"} aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
            x
          </RAdornmentButton>
        ),
      })
    }
    const VueApp = defineComponent({
      setup() {
        const visible = ref(false)
        return () =>
          h(
            Input,
            { placeholder: "Password", type: visible.value ? "text" : "password" },
            {
              endAdornment: () =>
                h(
                  InputAdornmentButton,
                  { "aria-label": visible.value ? "Hide" : "Show", "aria-pressed": visible.value, "onClick": () => (visible.value = !visible.value) },
                  () => "x",
                ),
            },
          )
      },
    })
    const { react, vue } = await walk(
      () => render(<ReactApp />),
      () => h(VueApp),
      async (snap) => {
        snap()
        await interact(() => fireEvent.click(document.querySelector("button")!))
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('type="text"')
    expect(react[1]).toContain('aria-pressed="true"')
  })

  // Vue turns a slot's "" into an empty Text vnode; React's "" is falsy
  test.each([
    ["an empty string", () => ""],
    ["an empty text vnode in a fragment", () => [h(Fragment, null, [createTextVNode("")])]],
  ])("adornment slots rendering %s count as empty, like React's \"\"", async (_name, slot) => {
    const { react, vue } = await renderPair(<RInput startAdornment="" endAdornment="" />, () =>
      h(Input, {}, { startAdornment: slot, endAdornment: slot }),
    )
    expect(vue).toBe(react)
    expect(react).not.toContain("data-has-start-adornment")
    expect(react).not.toContain("data-has-end-adornment")
  })

  test("v-if'd adornment slots count as empty", async () => {
    mountVue(() => h(Input, {}, { startAdornment: () => [createCommentVNode("v-if", true)], endAdornment: () => [] }))
    await flushVue()
    const container = document.querySelector("[data-slot='input']")!
    expect(container.hasAttribute("data-has-start-adornment")).toBe(false)
    expect(container.hasAttribute("data-has-end-adornment")).toBe(false)
  })

  // Browsers and jsdom throw InvalidStateError from setSelectionRange on these types
  test.each([
    ["email", "a@b.co"],
    ["number", "12"],
  ])("frame mousedown on a %s input focuses it without throwing", async (type, defaultValue) => {
    const errors: unknown[] = []
    const onError = (evt: ErrorEvent) => {
      errors.push(evt.error)
      evt.preventDefault()
    }
    window.addEventListener("error", onError)
    const focused: boolean[] = []
    try {
      await walk(
        () => render(reactInput({ type, defaultValue, startAdornment: "search" })),
        () => vueInput({ type, defaultValue, startAdornment: "search" }),
        async (_snap, input) => {
          for (const detail of [1, 2, 3]) {
            await interact(() => fireEvent.mouseDown(document.querySelector("svg")!, { detail }))
            focused.push(document.activeElement === input())
            input().blur()
          }
        },
      )
    } finally {
      window.removeEventListener("error", onError)
    }
    expect(errors).toEqual([])
    expect(focused).toEqual([true, true, true, true, true, true])
  })

  test("the clear button keeps focus in the input", async () => {
    const focused: boolean[] = []
    function ReactApp() {
      const [value, setValue] = useState("plex")
      return reactInput({ value, onChange: (evt: { target: HTMLInputElement }) => setValue(evt.target.value), onClear: () => setValue("") })
    }
    const VueApp = defineComponent({
      setup() {
        const value = ref("plex")
        return () =>
          h(Input, { "value": value.value, "onUpdate:value": (next: string) => (value.value = next), "onClear": () => (value.value = "") })
      },
    })
    await walk(
      () => render(<ReactApp />),
      () => h(VueApp),
      async (_snap, input) => {
        const clear = document.querySelector('button[aria-label="Clear input"]') as HTMLButtonElement
        clear.focus()
        await interact(() => fireEvent.click(clear))
        expect(document.querySelector('button[aria-label="Clear input"]')).toBeNull()
        focused.push(document.activeElement === input())
      },
    )
    expect(focused).toEqual([true, true])
  })

  test("native readonly works like readOnly", async () => {
    const { react, vue } = await renderPair(reactInput({ readOnly: true, defaultValue: "key", onClear: noop }), () =>
      h(Input, { readonly: true, defaultValue: "key", onClear: noop }),
    )
    expect(vue).toBe(react)
    expect(react).toContain("data-readonly")
    expect(react).not.toContain("Clear input")
  })
})

// Server-renders both, then hydrates each markup in the document. Returns the
// serialized server markup, the field's displayed value after hydration and
// the hydrated DOM. `beforeHydrate` can play the user typing early.
const ssrPair = async (
  element: ReactElement,
  renderVue: () => VNode,
  beforeHydrate: (field: HTMLInputElement) => void = () => {},
) => {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const field = () => container.querySelector("input, textarea") as HTMLInputElement

  container.innerHTML = reactRenderToString(element)
  const reactHtml = serializeDom(container)
  beforeHydrate(field())
  let root: ReturnType<typeof hydrateRoot> | undefined
  await act(async () => {
    root = hydrateRoot(container, element)
  })
  const react = { html: reactHtml, value: field().value, hydrated: serializeDom(container) }
  await act(async () => root!.unmount())

  const app = createSSRApp({ render: renderVue })
  container.innerHTML = await vueRenderToString(createSSRApp({ render: renderVue }))
  const vueHtml = serializeDom(container)
  beforeHydrate(field())
  app.mount(container)
  await flushVue()
  const vue = { html: vueHtml, value: field().value, hydrated: serializeDom(container) }
  app.unmount()
  container.remove()
  return { react, vue }
}

describe("Input SSR and default-value parity", () => {
  test("server markup carries defaultValue as the value attribute, and hydration shows it", async () => {
    const { react, vue } = await ssrPair(reactInput({ defaultValue: "original" }), () => vueInput({ defaultValue: "original" }))
    expect(vue).toEqual(react)
    expect(react.html).toContain('value="original"')
    expect(react.value).toBe("original")
  })

  test("hydration keeps what the user typed before it", async () => {
    const { react, vue } = await ssrPair(
      reactInput({ defaultValue: "original" }),
      () => vueInput({ defaultValue: "original" }),
      (field) => {
        field.value = "typed early"
      },
    )
    expect(vue).toEqual(react)
    expect(react.value).toBe("typed early")
  })

  test("a defaultValue change moves the attribute but keeps the displayed value", async () => {
    const shown: string[] = []
    const { react, vue } = await walkPairWithState(
      { defaultValue: "original" },
      (state) => reactInput(state),
      (state) => vueInput({ defaultValue: state.defaultValue }),
      async ({ set, snapshot }) => {
        await set({ defaultValue: "changed" })
        snapshot()
        shown.push((document.querySelector("input") as HTMLInputElement).value)
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('value="changed"')
    expect(shown).toEqual(["original", "original"])
  })
})
