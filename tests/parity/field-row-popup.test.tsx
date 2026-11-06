import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { DateTime } from "luxon"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { DatePicker as RDatePicker } from "../../packages/ui/src/components/DatePicker"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { InputGroup as RInputGroup } from "../../packages/ui/src/components/InputGroup"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { DatePicker } from "../../packages/vue/src/components/DatePicker"
import { Field, type FieldChildProps } from "../../packages/vue/src/components/Field"
import { InputGroup, InputGroupButton, InputGroupInput } from "../../packages/vue/src/components/InputGroup"
import { Select } from "../../packages/vue/src/components/Select"
import { flushVue, mountVue } from "./harness"

beforeEach(() => {
  document.documentElement.style.setProperty("--breakpoint-md", "768px")
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: false, media, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
})

const options = [{ value: "home", label: "Home" }, { value: "work", label: "Work" }]
const value = DateTime.fromISO("2026-11-05")
const press = async (element: HTMLElement) => {
  // Let an outside pointerdown dismiss an already open popup before click,
  // as it does for a physical press in the browser.
  await act(async () => {
    fireEvent.pointerDown(element, { button: 0, pointerType: "mouse", pointerId: 1 })
    fireEvent.mouseDown(element, { button: 0 })
    await flushVue()
  })
  await act(async () => {
    fireEvent.pointerUp(element, { button: 0, pointerType: "mouse", pointerId: 1 })
    fireEvent.mouseUp(element, { button: 0 })
    fireEvent.click(element, { button: 0, detail: 1 })
    await flushVue()
  })
}

const rowOf = (control: HTMLElement) => {
  const row = control.closest<HTMLElement>("[data-row]")
  if (!row) throw new Error("Missing popup row")
  return row
}

describe.each(["React", "Vue"])("%s Field popup row", (framework) => {
  const mountPopup = async (kind: "select" | "date", config: { disabled?: boolean; loading?: boolean; prevent?: boolean } = {}) => {
    const change = vi.fn()
    const rowClick = vi.fn((event: { preventDefault: () => void }) => { if (config.prevent) event.preventDefault() })
    const label = kind === "select" ? "Category" : "Start date"
    if (framework === "React") render(
      <RField row label={label} description="Choose a value." onClick={rowClick}>
        {kind === "select"
          ? <RSelect value="home" options={options} onChange={change} clearable disabled={config.disabled} loading={config.loading} />
          : <RDatePicker value={value} onChange={change} clearable disabled={config.disabled} />}
      </RField>,
    )
    else {
      mountVue(() => h(Field, { row: true, label, description: "Choose a value.", onClick: rowClick }, () =>
        kind === "select"
          ? h(Select, { value: "home", options, onChange: change, clearable: true, disabled: config.disabled, loading: config.loading })
          : h(DatePicker, { value, onChange: change, clearable: true, disabled: config.disabled }),
      ))
      await flushVue()
    }
    const page = within(document.body)
    const control = page.getByRole("button", { name: new RegExp(`^${label} `) })
    return { page, control, row: rowOf(control), label: page.getByText(label, { selector: "label" }), change, rowClick }
  }

  test.each(["select", "date"] as const)("%s row, description and label open its linked trigger without duplicate toggles", async (kind) => {
    const { page, control, row, label, change, rowClick } = await mountPopup(kind)
    expect(control.tagName).toBe("SPAN")
    expect(row.hasAttribute("tabindex")).toBe(false)
    for (const target of [row, page.getByText("Choose a value."), control]) {
      await press(target)
      await waitFor(() => expect(control.getAttribute("aria-expanded")).toBe("true"))
      await waitFor(() => expect(page.getAllByRole("dialog", { hidden: true })).toHaveLength(1))
      // Radix installs the outside-press listener in the next task.
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
      await press(target)
      await waitFor(() => expect(control.getAttribute("aria-expanded")).toBe("false"))
      await waitFor(() => expect(page.queryByRole("dialog", { hidden: true })).toBeNull())
    }
    // A forwarded trigger click must not call the row handler a second time.
    expect(rowClick).toHaveBeenCalledTimes(6)
    await press(label)
    await waitFor(() => expect(control.getAttribute("aria-expanded")).toBe("true"))
    await waitFor(() => expect(page.getAllByRole("dialog", { hidden: true })).toHaveLength(1))
    expect(change).not.toHaveBeenCalled()
  })

  test.each(["select", "date"] as const)("%s clear action keeps its own behavior", async (kind) => {
    const { page, control, change } = await mountPopup(kind)
    await press(page.getByRole("button", { name: "Clear current value" }))
    expect(change).toHaveBeenCalledTimes(1)
    expect(control.getAttribute("aria-expanded")).toBe("false")
    expect(page.queryByRole("dialog", { hidden: true })).toBeNull()
  })

  test.each([
    ["select", { disabled: true }],
    ["select", { loading: true }],
    ["select", { prevent: true }],
    ["date", { disabled: true }],
  ] as const)("%s unavailable or prevented row does not open (%j)", async (kind, config) => {
    const { page, control, row, label } = await mountPopup(kind, config)
    await press(row)
    await press(label)
    expect(control.getAttribute("aria-expanded")).toBe("false")
    expect(page.queryByRole("dialog", { hidden: true })).toBeNull()
  })

  test("nested actions, unrelated labels and text inputs do not activate a popup; native label clicks stay single", async () => {
    const toggle = vi.fn()
    if (framework === "React") render(
      <RField row label="Native popup" description={<a href="#help">Help</a>} action={<button type="button">Details</button>}>
        {(props) => <>
          <button {...props} type="button" aria-haspopup="dialog" onClick={toggle}>Open</button>
          <input aria-label="Inline input" />
          <label htmlFor="unrelated">Unrelated label</label>
          <input id="unrelated" />
          <RField row label="Nested"><button type="button" aria-haspopup="dialog">Nested open</button></RField>
        </>}
      </RField>,
    )
    else {
      mountVue(() => h(Field, { row: true, label: "Native popup" }, {
        default: (props: FieldChildProps) => [
          h("button", { ...props, type: "button", "aria-haspopup": "dialog", onClick: toggle }, "Open"),
          h("input", { "aria-label": "Inline input" }),
          h("label", { for: "unrelated" }, "Unrelated label"),
          h("input", { id: "unrelated" }),
          h(Field, { row: true, label: "Nested" }, () => h("button", { type: "button", "aria-haspopup": "dialog" }, "Nested open")),
        ],
        description: () => h("a", { href: "#help" }, "Help"),
        action: () => h("button", { type: "button" }, "Details"),
      }))
      await flushVue()
    }
    const page = within(document.body)
    for (const target of [
      page.getByRole("link", { name: "Help" }), page.getByRole("button", { name: "Details" }),
      page.getByRole("textbox", { name: "Inline input" }), page.getByText("Unrelated label"),
      rowOf(page.getByRole("button", { name: "Nested" })),
    ]) await press(target)
    expect(toggle).not.toHaveBeenCalled()
    await press(page.getByText("Native popup", { selector: "label" }))
    expect(toggle).toHaveBeenCalledTimes(1)
    await press(rowOf(page.getByRole("button", { name: "Native popup" })))
    expect(toggle).toHaveBeenCalledTimes(2)
  })

  test("an InputGroup unit popup never takes the linked number input's row clicks", async () => {
    const unit = vi.fn()
    if (framework === "React") render(
      <RField row label="Weight">
        {(props) => <RInputGroup>
          <RInputGroup.Input {...props} type="number" defaultValue={12} />
          <RInputGroup.Button aria-label="Unit" aria-haspopup="dialog" onClick={unit}>kg</RInputGroup.Button>
        </RInputGroup>}
      </RField>,
    )
    else {
      mountVue(() => h(Field, { row: true, label: "Weight" }, {
        default: (props: FieldChildProps) => h(InputGroup, null, () => [
          h(InputGroupInput, { ...props, type: "number", value: 12 }),
          h(InputGroupButton, { "aria-label": "Unit", "aria-haspopup": "dialog", onClick: unit }, () => "kg"),
        ]),
      }))
      await flushVue()
    }
    const page = within(document.body)
    const input = page.getByRole("spinbutton", { name: "Weight" })
    await press(rowOf(input))
    await press(page.getByText("Weight", { selector: "label" }))
    await press(input)
    expect(unit).not.toHaveBeenCalled()
    await press(page.getByRole("button", { name: "Unit" }))
    expect(unit).toHaveBeenCalledTimes(1)
  })
})
