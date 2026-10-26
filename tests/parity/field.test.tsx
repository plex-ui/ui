import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useState, type ComponentType, type ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { createCommentVNode, defineComponent, h, ref, type VNode, type VNodeChild } from "vue"
import { Checkbox as RCheckbox } from "../../packages/ui/src/components/Checkbox"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { RadioGroup as RRadioGroup } from "../../packages/ui/src/components/RadioGroup"
import { Slider as RSlider } from "../../packages/ui/src/components/Slider"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Switch as RSwitch } from "../../packages/ui/src/components/Switch"
import { TagInput as RTagInput } from "../../packages/ui/src/components/TagInput"
import { Textarea as RTextarea } from "../../packages/ui/src/components/Textarea"
import { Checkbox } from "../../packages/vue/src/components/Checkbox"
import { Field, type FieldChildProps } from "../../packages/vue/src/components/Field"
import { Input } from "../../packages/vue/src/components/Input"
import { RadioGroup, RadioGroupItem } from "../../packages/vue/src/components/RadioGroup"
import { Select } from "../../packages/vue/src/components/Select"
import { Slider } from "../../packages/vue/src/components/Slider"
import { Switch } from "../../packages/vue/src/components/Switch"
import { TagInput } from "../../packages/vue/src/components/TagInput"
import { Textarea } from "../../packages/vue/src/components/Textarea"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

// React-vs-Vue parity for Field.
//
// Cases are written once in React's shape. Each case names its children so
// both frameworks build their own: an element Field clones, a render prop
// (in Vue a default slot that reads its props), text, several elements, ...
// React's `() => <div>` render prop, which ignores the field props, is a Vue
// slot that reads one of them (`v-slot="{ id }"`): Field only leaves a single
// root element alone when the slot takes the props.

type Props = Record<string, unknown>
type R = ComponentType<Props>

const RRadioGroupItem = (RRadioGroup as unknown as { Item: R }).Item
const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Editor", value: "editor" },
  { label: "Viewer", value: "viewer" },
]

// Children described by name; `props` are React-shaped (className, ...)
type Child =
  | { kind: "input" | "textarea" | "native-input" | "checkbox" | "select" | "switch" | "slider"; props?: Props }
  | { kind: "render-input"; props?: Props }
  | { kind: "render-select-id" | "render-select-all" | "render-switch-id" | "render-tag-input-id" }
  | { kind: "render-checkbox-group" | "render-radio-group" | "render-input-ignored" }
  | { kind: "text" | "two-inputs" | "none" | "false-sibling" | "comment-sibling" | "v-if-input" }

const toVueProps = ({ className, ...props }: Props = {}) => ({ ...props, ...(className ? { class: className } : {}) })

const reactChild = (child: Child): ReactNode | ((fieldProps: Props) => ReactNode) => {
  const p = "props" in child ? (child.props ?? {}) : {}
  switch (child.kind) {
    case "input":
      return createElement(RInput as R, p)
    case "textarea":
      return createElement(RTextarea as R, p)
    case "native-input":
      return createElement("input", p)
    case "checkbox":
      return createElement(RCheckbox as R, { label: "Accept terms", ...p })
    case "select":
      return createElement(RSelect as R, { value: "", onChange: () => {}, options: roleOptions, ...p })
    case "switch":
      return createElement(RSwitch as R, p)
    case "slider":
      return createElement(RSlider as R, { range: true, value: [200, 800], onChange: () => {}, min: 0, max: 1000, step: 10, prefixUnit: "$", ...p })
    case "render-input":
      return (fieldProps: Props) => createElement(RInput as R, { ...fieldProps, placeholder: "Enter email...", ...p })
    case "render-input-ignored":
      return () => createElement(RInput as R, { placeholder: "Not wired" })
    case "render-select-id":
      return (fieldProps: Props) =>
        createElement(RSelect as R, { id: fieldProps.id, value: "", onChange: () => {}, options: roleOptions, placeholder: "Select a role..." })
    case "render-select-all":
      return (fieldProps: Props) =>
        createElement(RSelect as R, { ...fieldProps, value: "", onChange: () => {}, options: roleOptions })
    case "render-switch-id":
      return (fieldProps: Props) => createElement(RSwitch as R, { id: fieldProps.id, defaultChecked: true })
    case "render-tag-input-id":
      return (fieldProps: Props) =>
        createElement(RTagInput as R, { id: fieldProps.id, placeholder: "Add email...", defaultValue: [{ value: "a@b.co", valid: true }] })
    case "render-checkbox-group":
      return () =>
        createElement(
          "div",
          { className: "flex flex-col gap-3 mt-1" },
          createElement(RCheckbox as R, { label: "Email notifications" }),
          createElement(RCheckbox as R, { label: "Push notifications", defaultChecked: true }),
        )
    case "render-radio-group":
      return () =>
        createElement(
          RRadioGroup as R,
          { "aria-label": "Plan", "value": "free", "onChange": () => {}, "direction": "col" },
          createElement(RRadioGroupItem, { value: "free" }, "Free"),
          createElement(RRadioGroupItem, { value: "pro" }, "Pro"),
        )
    case "text":
      return "Plain text"
    case "two-inputs":
      return [createElement(RInput as R, { key: "a", placeholder: "First" }), createElement(RInput as R, { key: "b", placeholder: "Second" })]
    case "none":
      return undefined
    case "false-sibling":
      return [false, createElement(RInput as R, { key: "a", placeholder: "After false" })]
    case "comment-sibling":
      // A JSX comment is no child at all
      return createElement(RInput as R, { placeholder: "After comment" })
    case "v-if-input":
      return createElement(RInput as R, { placeholder: "Shown" })
  }
}

const vueChild = (child: Child): (() => VNodeChild) | ((fieldProps: FieldChildProps) => VNodeChild) => {
  const p = toVueProps("props" in child ? (child.props ?? {}) : {})
  switch (child.kind) {
    case "input":
      return () => h(Input as never, p)
    case "textarea":
      return () => h(Textarea as never, p)
    case "native-input":
      return () => h("input", p)
    case "checkbox":
      return () => h(Checkbox as never, { label: "Accept terms", ...p })
    case "select":
      return () => h(Select as never, { value: "", options: roleOptions, ...p })
    case "switch":
      return () => h(Switch as never, p)
    case "slider":
      return () => h(Slider as never, { range: true, value: [200, 800], min: 0, max: 1000, step: 10, prefixUnit: "$", ...p })
    case "render-input":
      return (fieldProps) => h(Input as never, { ...fieldProps, placeholder: "Enter email...", ...p })
    case "render-input-ignored":
      return ({ id: _id }) => h(Input as never, { placeholder: "Not wired" })
    case "render-select-id":
      return (fieldProps) => h(Select as never, { id: fieldProps.id, value: "", options: roleOptions, placeholder: "Select a role..." })
    case "render-select-all":
      return (fieldProps) => h(Select as never, { ...fieldProps, value: "", options: roleOptions })
    case "render-switch-id":
      return (fieldProps) => h(Switch as never, { id: fieldProps.id, defaultChecked: true })
    case "render-tag-input-id":
      return (fieldProps) =>
        h(TagInput as never, { id: fieldProps.id, placeholder: "Add email...", defaultValue: [{ value: "a@b.co", valid: true }] })
    case "render-checkbox-group":
      return ({ id: _id }) =>
        h("div", { class: "flex flex-col gap-3 mt-1" }, [
          h(Checkbox as never, { label: "Email notifications" }),
          h(Checkbox as never, { label: "Push notifications", defaultChecked: true }),
        ])
    case "render-radio-group":
      return ({ id: _id }) =>
        h(RadioGroup as never, { "aria-label": "Plan", "value": "free", "direction": "col" }, () => [
          h(RadioGroupItem as never, { value: "free" }, () => "Free"),
          h(RadioGroupItem as never, { value: "pro" }, () => "Pro"),
        ])
    case "text":
      return () => "Plain text"
    case "two-inputs":
      return () => [h(Input as never, { placeholder: "First" }), h(Input as never, { placeholder: "Second" })]
    case "none":
      return () => []
    case "false-sibling":
      // The placeholder of a `v-if` that renders nothing
      return () => [createCommentVNode("v-if", true), h(Input as never, { placeholder: "After false" })]
    case "comment-sibling":
      // A template comment (`<!-- note -->`), kept in development builds
      return () => [createCommentVNode(" note "), h(Input as never, { placeholder: "After comment" })]
    case "v-if-input":
      return () => [h(Input as never, { key: 0, placeholder: "Shown" })]
  }
}

// Field's own ReactNode props: a string, or "rich" for an element / slot
const rich = (text: string) => ({ rich: text })
const isRich = (value: unknown): value is { rich: string } => typeof value === "object" && value !== null && "rich" in value

const reactField = (props: Props, child: Child) => {
  const fieldProps: Props = {}
  for (const [key, value] of Object.entries(props)) {
    fieldProps[key] = isRich(value) ? createElement("strong", { className: "rich" }, value.rich) : value
  }
  const children = reactChild(child)
  return createElement(RField as R, { ...fieldProps, children })
}

const vueField = (props: Props, child: Child) => {
  const fieldProps: Props = {}
  const slots: Record<string, (...args: never[]) => VNodeChild> = {}
  for (const [key, value] of Object.entries(props)) {
    if (isRich(value)) slots[key] = () => h("strong", { class: "rich" }, value.rich)
    else if (key === "className") fieldProps.class = value
    else fieldProps[key] = value
  }
  if (child.kind !== "none") slots.default = vueChild(child) as (...args: never[]) => VNodeChild
  return h(Field as never, fieldProps, slots)
}

// TagInput and Slider measure themselves (jsdom has no ResizeObserver or
// matchMedia; vi.restoreAllMocks in the harness does not undo stubGlobal, so
// they are stubbed before each test)
// Slider reads the `md` breakpoint (matchMedia and the --breakpoint-md token)
document.documentElement.style.setProperty("--breakpoint-md", "768px")
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }))
})

const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]
const input: Child = { kind: "input", props: { placeholder: "Enter email..." } }

const cases: Array<[string, Props, Child]> = [
  ["label only", { label: "Email" }, input],
  ["description", { label: "Email", description: "We'll never share your email." }, input],
  ["errorMessage", { label: "Email", errorMessage: "Please enter a valid email address" }, input],
  ["description and errorMessage", { label: "Email", description: "Work email.", errorMessage: "Required" }, input],
  ["empty description and errorMessage render nothing", { label: "Email", description: "", errorMessage: "" }, input],
  ["required", { label: "Email", required: true }, input],
  ["required with error", { label: "Email", required: true, errorMessage: "Required" }, input],
  ...SIZES.map((size): [string, Props, Child] => [`size ${size}`, { label: "Email", size }, { kind: "input", props: { size } }]),
  ["horizontal", { label: "First name", orientation: "horizontal" }, input],
  ["horizontal with description and error", { label: "Name", orientation: "horizontal", description: "Hint", errorMessage: "Oops" }, input],
  ["class on the root", { label: "City", className: "flex-1" }, input],
  ["explicit id", { label: "Email", id: "email", description: "Hint", errorMessage: "Oops" }, input],
  ["empty id falls back to the generated one", { label: "Email", id: "" }, input],
  ["opticallyAlign start reaches the input", { label: "Name", opticallyAlign: "start" }, { kind: "input", props: { pill: true } }],
  ["opticallyAlign end", { label: "Name", opticallyAlign: "end" }, input],
  ["field opticallyAlign replaces the child's", { label: "Name", opticallyAlign: "start" }, { kind: "input", props: { opticallyAlign: "end" } }],
  ["child opticallyAlign kept without the field's", { label: "Name" }, { kind: "input", props: { opticallyAlign: "end" } }],
  ["field id replaces the child's id", { label: "Email" }, { kind: "input", props: { id: "own" } }],
  [
    "child aria-describedby is joined first",
    { label: "Email", description: "Hint", errorMessage: "Oops" },
    { kind: "input", props: { "aria-describedby": "external-hint" } },
  ],
  ["child aria-describedby alone", { label: "Email" }, { kind: "input", props: { "aria-describedby": "external-hint" } }],
  ["child aria-invalid false wins over the error", { label: "Email", errorMessage: "Oops" }, { kind: "input", props: { "aria-invalid": false } }],
  ["child aria-invalid true without an error", { label: "Email" }, { kind: "input", props: { "aria-invalid": true } }],
  ["child invalid prop without an error", { label: "Email" }, { kind: "input", props: { invalid: true } }],
  ["child keeps its own attributes", { label: "Email" }, { kind: "input", props: { name: "email", className: "w-full", "data-testid": "x" } }],
  ["rich label", { label: rich("Email") }, input],
  ["rich label with required", { label: rich("Email"), required: true }, input],
  ["rich description", { label: "Email", description: rich("Hint") }, input],
  ["rich errorMessage", { label: "Email", errorMessage: rich("Oops") }, input],
  ["textarea", { label: "Bio", description: "Write a short bio." }, { kind: "textarea", props: { placeholder: "Tell us...", rows: 3 } }],
  ["textarea with error", { label: "Bio", errorMessage: "Too short" }, { kind: "textarea" }],
  ["textarea gets opticallyAlign as an attribute", { label: "Bio", opticallyAlign: "start" }, { kind: "textarea" }],
  ["native input", { label: "Raw", description: "Hint", errorMessage: "Oops" }, { kind: "native-input", props: { type: "text" } }],
  ["checkbox element", { label: "Terms", description: "Read them first" }, { kind: "checkbox" }],
  ["select element", { label: "Role", description: "Pick one", errorMessage: "Required" }, { kind: "select" }],
  ["switch element", { label: "Marketing emails", orientation: "horizontal" }, { kind: "switch" }],
  ["slider element", { label: "Price Range", description: "Set your budget range." }, { kind: "slider" }],
  ["render prop spread on Input", { label: "Email", errorMessage: "Email is required" }, { kind: "render-input" }],
  ["render prop spread with description", { label: "Email", description: "Hint" }, { kind: "render-input" }],
  ["render prop with opticallyAlign", { label: "Email", opticallyAlign: "start" }, { kind: "render-input" }],
  ["render prop ignoring the props", { label: "Email", errorMessage: "Oops" }, { kind: "render-input-ignored" }],
  ["render prop: Select with the id", { label: "Role", description: "Select your primary role." }, { kind: "render-select-id" }],
  ["render prop: Select with every prop", { label: "Role", description: "Hint", errorMessage: "Required" }, { kind: "render-select-all" }],
  ["render prop: Switch with the id", { label: "Marketing emails", orientation: "horizontal" }, { kind: "render-switch-id" }],
  ["render prop: TagInput with the id", { label: "Team members", description: "Add people by email." }, { kind: "render-tag-input-id" }],
  ["render prop: checkbox group", { label: "Notifications", description: "Choose." }, { kind: "render-checkbox-group" }],
  ["render prop: radio group", { label: "Plan", description: "Select your plan." }, { kind: "render-radio-group" }],
  ["text child", { label: "Email" }, { kind: "text" }],
  ["two children are not cloned", { label: "Name", description: "Hint" }, { kind: "two-inputs" }],
  ["no children", { label: "Empty" }, { kind: "none" }],
  ["a false sibling stops the clone", { label: "Email", errorMessage: "Oops" }, { kind: "false-sibling" }],
  ["a comment is no child", { label: "Email", errorMessage: "Oops" }, { kind: "comment-sibling" }],
  ["a single v-if child is cloned", { label: "Email", description: "Hint" }, { kind: "v-if-input" }],
]

describe("Field parity", () => {
  test.each(cases)("%s", async (_name, props, child) => {
    const { react, vue } = await renderPair(reactField(props, child), () => vueField(props, child))
    expect(vue).toBe(react)
  })
})

// The label is wired to the control in both: `label.control` resolves it
describe("Field label wiring", () => {
  const controlOf = () => {
    const label = document.querySelector("label[for]") as HTMLLabelElement
    const control = label.control
    return control ? `${control.tagName.toLowerCase()}#${control.id === label.htmlFor ? "for" : control.id}` : "none"
  }

  test.each<[string, Child]>([
    ["input", input],
    ["textarea", { kind: "textarea" }],
    ["checkbox", { kind: "checkbox" }],
    ["render prop: Select with the id", { kind: "render-select-id" }],
    ["render prop: Switch with the id", { kind: "render-switch-id" }],
  ])("%s", async (_name, child) => {
    await act(async () => {
      render(reactField({ label: "Label" }, child) as never)
    })
    const react = controlOf()
    cleanup()

    mountVue(() => vueField({ label: "Label" }, child))
    await flushVue()
    expect(controlOf()).toBe(react)
    expect(react).not.toBe("none")
  })
})

// Stateful walks: the same steps against a React app and a Vue app
const walk = async (
  mountReact: () => void,
  mountVueApp: () => VNode,
  steps: (snap: () => void) => Promise<void>,
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
    await steps(() => snaps.push(serializeDom()))
    runs.push(snaps)
    if (framework === "react") cleanup()
  }
  return { react: runs[0]!, vue: runs[1]! }
}

const step = async (run: () => void) => {
  await act(async () => {
    run()
  })
  await flushVue()
}

const button = (name: string) =>
  Array.from(document.querySelectorAll("button")).find((element) => element.textContent === name) as HTMLButtonElement

describe("Field behaviour parity", () => {
  test("toggling errorMessage and description rewires aria-describedby and aria-invalid", async () => {
    function ReactApp() {
      const [error, setError] = useState(false)
      const [description, setDescription] = useState(false)
      return createElement(
        "div",
        null,
        createElement("button", { onClick: () => setError((v) => !v) }, "error"),
        createElement("button", { onClick: () => setDescription((v) => !v) }, "description"),
        createElement(
          RField as R,
          {
            label: "Email",
            errorMessage: error ? "Please enter a valid email address" : undefined,
            description: description ? "Work email" : undefined,
          },
          createElement(RInput as R, { "placeholder": "Enter email...", "aria-describedby": "outside" }),
        ),
        createElement("p", { id: "outside" }, "Outside hint"),
      )
    }
    const VueApp = defineComponent(() => {
      const error = ref(false)
      const description = ref(false)
      return () =>
        h("div", null, [
          h("button", { onClick: () => (error.value = !error.value) }, "error"),
          h("button", { onClick: () => (description.value = !description.value) }, "description"),
          h(
            Field as never,
            {
              label: "Email",
              errorMessage: error.value ? "Please enter a valid email address" : undefined,
              description: description.value ? "Work email" : undefined,
            },
            () => h(Input as never, { "placeholder": "Enter email...", "aria-describedby": "outside" }),
          ),
          h("p", { id: "outside" }, "Outside hint"),
        ])
    })

    const { react, vue } = await walk(
      () => render(createElement(ReactApp)),
      () => h(VueApp),
      async (snap) => {
        snap()
        await step(() => fireEvent.click(button("error")))
        snap()
        await step(() => fireEvent.click(button("description")))
        snap()
        await step(() => fireEvent.click(button("error")))
        snap()
        await step(() => fireEvent.click(button("description")))
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('aria-invalid="true"')
    expect(react[4]).not.toContain('aria-invalid="true"')
  })

  test("a controlled Input inside Field keeps its value flow and validation", async () => {
    const typed: string[][] = [[], []]
    function ReactApp() {
      const [email, setEmail] = useState("bad")
      return createElement(
        RField as R,
        { label: "Email", required: true, errorMessage: email.includes("@") ? undefined : "Please enter a valid email address" },
        createElement(RInput as R, {
          value: email,
          onChange: (evt: { target: HTMLInputElement }) => {
            typed[0]!.push(evt.target.value)
            setEmail(evt.target.value)
          },
        }),
      )
    }
    const VueApp = defineComponent(() => {
      const email = ref("bad")
      return () =>
        h(
          Field as never,
          { label: "Email", required: true, errorMessage: email.value.includes("@") ? undefined : "Please enter a valid email address" },
          () =>
            h(Input as never, {
              "value": email.value,
              "onUpdate:value": (value: string) => {
                typed[1]!.push(value)
                email.value = value
              },
            }),
        )
    })

    const { react, vue } = await walk(
      () => render(createElement(ReactApp)),
      () => h(VueApp),
      async (snap) => {
        const field = () => document.querySelector("input") as HTMLInputElement
        snap()
        await step(() => fireEvent.input(field(), { target: { value: "bad@" } }))
        snap()
        expect(field().value).toBe("bad@")
        await step(() => fireEvent.input(field(), { target: { value: "bad" } }))
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(typed[1]).toEqual(typed[0])
    expect(typed[0]).toEqual(["bad@", "bad"])
  })

  test("an uncontrolled Input inside Field keeps what is typed across Field updates", async () => {
    function ReactApp() {
      const [error, setError] = useState(false)
      return createElement(
        "div",
        null,
        createElement("button", { onClick: () => setError((v) => !v) }, "error"),
        createElement(
          RField as R,
          { label: "Name", errorMessage: error ? "Required" : undefined },
          createElement(RInput as R, { defaultValue: "Jane" }),
        ),
      )
    }
    const VueApp = defineComponent(() => {
      const error = ref(false)
      return () =>
        h("div", null, [
          h("button", { onClick: () => (error.value = !error.value) }, "error"),
          h(Field as never, { label: "Name", errorMessage: error.value ? "Required" : undefined }, () =>
            h(Input as never, { defaultValue: "Jane" }),
          ),
        ])
    })

    const values: string[][] = []
    const { react, vue } = await walk(
      () => render(createElement(ReactApp)),
      () => h(VueApp),
      async (snap) => {
        const field = () => document.querySelector("input") as HTMLInputElement
        const seen: string[] = []
        await step(() => fireEvent.input(field(), { target: { value: "Jane Doe" } }))
        seen.push(field().value)
        await step(() => fireEvent.click(button("error")))
        seen.push(field().value)
        snap()
        await step(() => fireEvent.click(button("error")))
        seen.push(field().value)
        snap()
        values.push(seen)
      },
    )
    expect(vue).toEqual(react)
    expect(values[1]).toEqual(values[0])
    expect(values[0]).toEqual(["Jane Doe", "Jane Doe", "Jane Doe"])
  })

  test("changing the id prop moves the label, description and error ids", async () => {
    function ReactApp() {
      const [id, setId] = useState<string | undefined>("first")
      return createElement(
        "div",
        null,
        createElement("button", { onClick: () => setId((v) => (v === "first" ? "second" : v === "second" ? undefined : "first")) }, "id"),
        createElement(RField as R, { label: "Email", id, description: "Hint", errorMessage: "Oops" }, createElement(RInput as R)),
      )
    }
    const VueApp = defineComponent(() => {
      const id = ref<string | undefined>("first")
      return () =>
        h("div", null, [
          h("button", { onClick: () => (id.value = id.value === "first" ? "second" : id.value === "second" ? undefined : "first") }, "id"),
          h(Field as never, { label: "Email", id: id.value, description: "Hint", errorMessage: "Oops" }, () => h(Input as never)),
        ])
    })

    const { react, vue } = await walk(
      () => render(createElement(ReactApp)),
      () => h(VueApp),
      async (snap) => {
        snap()
        await step(() => fireEvent.click(button("id")))
        snap()
        await step(() => fireEvent.click(button("id")))
        snap()
        await step(() => fireEvent.click(button("id")))
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('id="second-description"')
  })

  test("a render prop re-renders with the new field props", async () => {
    function ReactApp() {
      const [error, setError] = useState(false)
      return createElement(
        "div",
        null,
        createElement("button", { onClick: () => setError((v) => !v) }, "error"),
        createElement(RField as R, { label: "Email", errorMessage: error ? "Required" : undefined }, (fieldProps: Props) =>
          createElement(RInput as R, { ...fieldProps, placeholder: "Email" }),
        ),
      )
    }
    const VueApp = defineComponent(() => {
      const error = ref(false)
      return () =>
        h("div", null, [
          h("button", { onClick: () => (error.value = !error.value) }, "error"),
          h(Field as never, { label: "Email", errorMessage: error.value ? "Required" : undefined }, {
            default: (fieldProps: FieldChildProps) => h(Input as never, { ...fieldProps, placeholder: "Email" }),
          }),
        ])
    })

    const { react, vue } = await walk(
      () => render(createElement(ReactApp)),
      () => h(VueApp),
      async (snap) => {
        snap()
        await step(() => fireEvent.click(button("error")))
        snap()
        await step(() => fireEvent.click(button("error")))
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('aria-invalid="true"')
  })
})
