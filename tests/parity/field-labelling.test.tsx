import { act, cleanup, render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { h } from "vue"
import { Checkbox as RCheckbox } from "../../packages/ui/src/components/Checkbox"
import { DatePicker as RDatePicker } from "../../packages/ui/src/components/DatePicker"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { FieldError as RFieldError } from "../../packages/ui/src/components/FieldError"
import { FloatingLabelSelect as RFloatingLabelSelect } from "../../packages/ui/src/components/FloatingLabelSelect"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Switch as RSwitch } from "../../packages/ui/src/components/Switch"
import { TextLink as RTextLink } from "../../packages/ui/src/components/TextLink"
import { Checkbox } from "../../packages/vue/src/components/Checkbox"
import { DatePicker } from "../../packages/vue/src/components/DatePicker"
import { Field } from "../../packages/vue/src/components/Field"
import { FieldError } from "../../packages/vue/src/components/FieldError"
import { FloatingLabelSelect } from "../../packages/vue/src/components/FloatingLabelSelect"
import { Input } from "../../packages/vue/src/components/Input"
import { Select } from "../../packages/vue/src/components/Select"
import { Switch } from "../../packages/vue/src/components/Switch"
import { TextLink } from "../../packages/vue/src/components/TextLink"
import { flushVue, mountVue } from "./harness"
import { renderPair } from "./pair"

// Field names the control through `aria-labelledby` when the control has no
// name of its own, so triggers that a label's `for` cannot reach (Select,
// DatePicker) are named "Role Admin", not just "Admin". It also takes its
// size from the control and renders a `labelAction` at the end of the label row.

const roles = [
  { label: "Admin", value: "admin" },
  { label: "Viewer", value: "viewer" },
]

const noop = () => {}

describe("Field labels its control", () => {
  test("a Select trigger is named by the label and its value", async () => {
    const pair = await renderPair(
      <RField label="Role">
        <RSelect value="admin" onChange={noop} options={roles} />
      </RField>,
      () => h(Field, { label: "Role" }, () => h(Select, { value: "admin", options: roles })),
    )
    expect(pair.vue).toBe(pair.react)

    await act(async () => {
      render(
        <RField label="Role">
          <RSelect value="admin" onChange={noop} options={roles} />
        </RField>,
      )
    })
    expect(screen.getByRole("button", { name: "Role Admin" })).toBeTruthy()
    cleanup()

    mountVue(() => h(Field, { label: "Role" }, () => h(Select, { value: "admin", options: roles })))
    await flushVue()
    expect(screen.getByRole("button", { name: "Role Admin" })).toBeTruthy()
  })

  test("a DatePicker trigger is named by the label", async () => {
    const pair = await renderPair(
      <RField label="Start date">
        <RDatePicker value={null} onChange={noop} />
      </RField>,
      () => h(Field, { label: "Start date" }, () => h(DatePicker, { value: null })),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('aria-labelledby="')
  })

  test.each([
    ["an Input", <RInput key="i" />, () => h(Input)],
    ["a native input", <input key="n" />, () => h("input")],
  ])("%s gets aria-labelledby", async (_name, reactChild, vueChild) => {
    const pair = await renderPair(<RField label="Email">{reactChild}</RField>, () => h(Field, { label: "Email" }, vueChild))
    expect(pair.vue).toBe(pair.react)
    const labelId = pair.react.match(/<label[^>]* id="([^"]+)"/)?.[1]
    expect(labelId).toBeTruthy()
    expect(pair.react).toContain(`aria-labelledby="${labelId}"`)
  })

  test.each([
    ["Checkbox with its own label", <RCheckbox key="c" label="Accept terms" />, () => h(Checkbox, { label: "Accept terms" })],
    ["Switch with its own label", <RSwitch key="s" label="Notify me" />, () => h(Switch, { label: "Notify me" })],
    [
      "Checkbox with a rich label (Vue: #label slot)",
      <RCheckbox key="r" label={<strong>Email me</strong>} />,
      () => h(Checkbox, null, { label: () => h("strong", "Email me") }),
    ],
    [
      "Switch with a rich label (Vue: #label slot)",
      <RSwitch key="w" label={<strong>Notify me</strong>} />,
      () => h(Switch, null, { label: () => h("strong", "Notify me") }),
    ],
    ["Input with aria-label", <RInput key="a" aria-label="Work email" />, () => h(Input, { "aria-label": "Work email" })],
    [
      "Select with aria-labelledby",
      <RSelect key="l" aria-labelledby="custom" value="" onChange={noop} options={roles} />,
      () => h(Select, { "aria-labelledby": "custom", "value": "", "options": roles }),
    ],
  ])("a child named on its own keeps its name: %s", async (_name, reactChild, vueChild) => {
    const pair = await renderPair(<RField label="Settings">{reactChild}</RField>, () =>
      h(Field, { label: "Settings" }, vueChild),
    )
    expect(pair.vue).toBe(pair.react)
    const labelId = pair.react.match(/<label[^>]* id="([^"]+)"/)?.[1]
    expect(pair.react).not.toMatch(new RegExp(`aria-labelledby="[^"]*\\b${labelId}\\b`))
  })

  test.each([
    ["Checkbox", <RCheckbox key="c" label="Email" description="Weekly digest" />, () => h(Checkbox, { label: "Email", description: "Weekly digest" })],
    ["Switch", <RSwitch key="s" label="Email" description="Weekly digest" />, () => h(Switch, { label: "Email", description: "Weekly digest" })],
  ])("a %s description and the field's description have their own ids", async (_name, reactChild, vueChild) => {
    const pair = await renderPair(<RField id="n" label="Notifications" description="Pick what we send">{reactChild}</RField>, () =>
      h(Field, { id: "n", label: "Notifications", description: "Pick what we send" }, vueChild),
    )
    expect(pair.vue).toBe(pair.react)
    const ids = [...pair.react.matchAll(/ id="([^"]+)"/g)].map((match) => match[1])
    expect(new Set(ids).size).toBe(ids.length)
    expect(pair.react).toContain('aria-describedby="n-label-description n-description"')
  })

  test("a render prop gets the label's id to spread", async () => {
    const pair = await renderPair(
      <RField label="Role">{(fieldProps) => <RSelect {...fieldProps} value="admin" onChange={noop} options={roles} />}</RField>,
      () =>
        h(Field, { label: "Role" }, { default: (fieldProps: Record<string, unknown>) => h(Select, { ...fieldProps, value: "admin", options: roles }) }),
    )
    expect(pair.vue).toBe(pair.react)
    const labelId = pair.react.match(/<label[^>]* id="([^"]+)"/)?.[1]
    expect(pair.react).toMatch(new RegExp(`aria-labelledby="${labelId} `))
  })

  test("a render prop that takes only the id stays as it was", async () => {
    const pair = await renderPair(
      <RField label="Email">{(fieldProps) => <RInput id={fieldProps.id} />}</RField>,
      () => h(Field, { label: "Email" }, { default: (fieldProps: Record<string, unknown>) => h(Input, { id: fieldProps.id }) }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("aria-labelledby")
  })
})

describe("Field size follows the control", () => {
  test.each([
    ["the child's size", {}, "sm", 'data-size="sm"'],
    ["Field's own size wins", { size: "lg" }, "sm", 'data-size="lg"'],
    ["md without a size", {}, undefined, 'data-size="md"'],
  ])("%s", async (_name, fieldProps, inputSize, expected) => {
    const pair = await renderPair(
      <RField label="Name" {...fieldProps}>
        <RInput size={inputSize as "sm"} />
      </RField>,
      () => h(Field, { label: "Name", ...fieldProps }, () => h(Input, { size: inputSize })),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain(expected)
  })

  test("a native size attribute is not a control size", async () => {
    const pair = await renderPair(
      <RField label="Code">
        <input size={6} />
      </RField>,
      () => h(Field, { label: "Code" }, () => h("input", { size: 6 })),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('data-size="md"')
  })
})

describe("Field labelAction", () => {
  test("renders at the end of the label row (prop)", async () => {
    const pair = await renderPair(
      <RField label="Password" labelAction="Optional">
        <RInput type="password" />
      </RField>,
      () => h(Field, { label: "Password", labelAction: "Optional" }, () => h(Input, { type: "password" })),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("LabelRow")
    expect(pair.react).toContain("LabelAction")
  })

  test("renders a link (React node, Vue slot)", async () => {
    const pair = await renderPair(
      <RField label="Password" labelAction={<RTextLink href="/reset">Forgot password?</RTextLink>}>
        <RInput type="password" />
      </RField>,
      () =>
        h(
          Field,
          { label: "Password" },
          {
            default: () => h(Input, { type: "password" }),
            labelAction: () => h(TextLink, { href: "/reset" }, () => "Forgot password?"),
          },
        ),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("Forgot password?")
  })

  test("no label row without an action", async () => {
    const pair = await renderPair(
      <RField label="Name">
        <RInput />
      </RField>,
      () => h(Field, { label: "Name" }, () => h(Input)),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("LabelRow")
  })
})

describe("FieldError icon", () => {
  test.each([[true], [false]])("icon=%s", async (icon) => {
    const pair = await renderPair(<RFieldError icon={icon}>Enter the code</RFieldError>, () =>
      h(FieldError, { icon }, () => "Enter the code"),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react.includes("<svg")).toBe(icon)
  })
})

describe("FloatingLabelSelect error", () => {
  test("is the same plain line as FloatingLabelInput's", async () => {
    const pair = await renderPair(<RFloatingLabelSelect label="Country" errorMessage="Choose a country" />, () =>
      h(FloatingLabelSelect, { label: "Country", errorMessage: "Choose a country" }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toMatch(/<div class="ErrorMessage" id="[^"]+" role="alert">\s*"Choose a country"/)
    expect(pair.react).not.toContain("FieldError")
  })
})
