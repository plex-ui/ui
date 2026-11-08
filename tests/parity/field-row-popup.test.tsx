import { readFileSync } from "node:fs"
import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { DateTime } from "luxon"
import postcss from "postcss"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h } from "vue"
import { DatePicker as RDatePicker } from "../../packages/ui/src/components/DatePicker"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { FieldGroup as RFieldGroup } from "../../packages/ui/src/components/FieldGroup"
import { InputGroup as RInputGroup } from "../../packages/ui/src/components/InputGroup"
import { Popover as RPopover } from "../../packages/ui/src/components/Popover"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { FieldColumnsContext, FieldRowContext } from "../../packages/ui/src/lib/fieldRow"
import { DatePicker } from "../../packages/vue/src/components/DatePicker"
import { Field, type FieldChildProps } from "../../packages/vue/src/components/Field"
import { FieldGroup } from "../../packages/vue/src/components/FieldGroup"
import { InputGroup, InputGroupButton, InputGroupInput } from "../../packages/vue/src/components/InputGroup"
import { Popover, PopoverContent, PopoverTrigger } from "../../packages/vue/src/components/Popover"
import { Select } from "../../packages/vue/src/components/Select"
import { provideFieldColumns, provideFieldRow } from "../../packages/vue/src/lib/fieldRow"
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

  // On a phone the trigger at the row's end is only as wide as its value: a menu of the trigger's width broke every
  // word of its options (Field, Other controls: Role, 63px). The menu fits its options and opens from the row's end.
  test("a Select at the end of a row opens a menu that fits its options, from the row's end", async () => {
    const { page, control } = await mountPopup("select")
    await press(control)
    await waitFor(() => expect(page.getAllByRole("dialog", { hidden: true })).toHaveLength(1))
    const menu = page.getByRole("dialog", { hidden: true })
    expect(menu.getAttribute("data-align")).toBe("end")
    expect(menu.style.getPropertyValue("--select-list-width")).toBe("auto")
    expect(menu.style.getPropertyValue("--select-list-max-width")).toBe("300px")
  })

  test("a Select under its label keeps a menu as wide as its field", async () => {
    if (framework === "React") render(<RField row orientation="vertical" label="Category"><RSelect value="home" options={options} onChange={() => {}} /></RField>)
    else {
      mountVue(() => h(Field, { row: true, orientation: "vertical", label: "Category" }, () => h(Select, { value: "home", options, onChange: () => {} })))
      await flushVue()
    }
    const page = within(document.body)
    const control = page.getByRole("button", { name: /^Category / })
    await press(control)
    await waitFor(() => expect(page.getAllByRole("dialog", { hidden: true })).toHaveLength(1))
    const menu = page.getByRole("dialog", { hidden: true })
    expect(menu.getAttribute("data-align")).toBe("center")
    expect(menu.style.getPropertyValue("--select-list-width")).toBe("")
    expect(menu.style.getPropertyValue("--select-list-max-width")).toBe("auto")
  })

  // A FieldGroup with columns starts every value at one column (iOS typed details): the menu opens from there
  // too, as Form Examples' Product already asked for by hand.
  test("a Select in a row of a FieldGroup with columns opens its menu from the value's start", async () => {
    if (framework === "React") render(
      <RFieldGroup columns><RField row label="Category"><RSelect value="home" options={options} onChange={() => {}} /></RField></RFieldGroup>,
    )
    else {
      mountVue(() => h(FieldGroup, { columns: true }, () =>
        h(Field, { row: true, label: "Category" }, () => h(Select, { value: "home", options, onChange: () => {} }))))
      await flushVue()
    }
    const page = within(document.body)
    await press(page.getByRole("button", { name: /^Category / }))
    await waitFor(() => expect(page.getAllByRole("dialog", { hidden: true })).toHaveLength(1))
    const menu = page.getByRole("dialog", { hidden: true })
    expect(menu.getAttribute("data-align")).toBe("start")
    expect(menu.style.getPropertyValue("--select-list-width")).toBe("auto")
    expect(menu.style.getPropertyValue("--select-list-max-width")).toBe("300px")
  })

  // A popup opened from a row is not that row: a Select inside it keeps the menu of a Select on its own.
  test("a Select inside a popover opened from a row keeps its usual menu", async () => {
    if (framework === "React") render(
      <FieldRowContext.Provider value>
        <FieldColumnsContext.Provider value>
          <RPopover open>
            <RPopover.Trigger><button type="button">Filter</button></RPopover.Trigger>
            <RPopover.Content>
              <RSelect value="home" options={options} onChange={() => {}} />
              <RField row label="Kind"><RSelect value="work" options={options} onChange={() => {}} /></RField>
            </RPopover.Content>
          </RPopover>
        </FieldColumnsContext.Provider>
      </FieldRowContext.Provider>,
    )
    else {
      const InRow = defineComponent({
        setup(_, { slots }) {
          provideFieldRow(() => true)
          provideFieldColumns(() => true)
          return () => slots.default?.()
        },
      })
      mountVue(() => h(InRow, null, () => h(Popover, { open: true }, {
        default: () => [
          h(PopoverTrigger, null, { default: () => [h("button", { type: "button" }, "Filter")] }),
          h(PopoverContent, null, { default: () => [
            h(Select, { value: "home", options, onChange: () => {} }),
            h(Field, { row: true, label: "Kind" }, () => h(Select, { value: "work", options, onChange: () => {} })),
          ] }),
        ],
      })))
      await flushVue()
    }
    const page = within(document.body)
    const menuOf = () => page.getAllByRole("dialog", { hidden: true }).find((dialog) => dialog.style.getPropertyValue("--select-list-max-width"))
    const control = await page.findByRole("button", { name: /^Home/ })
    expect(control.hasAttribute("data-pill")).toBe(false)
    await press(control)
    await waitFor(() => expect(menuOf()).toBeTruthy())
    expect(menuOf()!.getAttribute("data-align")).toBe("center")
    expect(menuOf()!.style.getPropertyValue("--select-list-width")).toBe("")
    expect(menuOf()!.style.getPropertyValue("--select-list-max-width")).toBe("auto")
    await press(control)
    await waitFor(() => expect(menuOf()).toBeFalsy())
    // A row of the popup's own is a row with no columns: the columns of the group outside do not reach it
    const kind = page.getAllByRole("button", { hidden: true }).find((button) => button.textContent === "Work")!
    expect(kind.closest("[data-row]")).toBeTruthy()
    await press(kind)
    await waitFor(() => expect(menuOf()).toBeTruthy())
    expect(menuOf()!.getAttribute("data-align")).toBe("end")
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

  test("a date row marks its trigger as the compact date capsule, open and closed", async () => {
    const { control, page } = await mountPopup("date")
    expect(control.getAttribute("data-date-picker")).toBe("")
    expect(control.getAttribute("data-selected")).toBe("true")
    await press(control)
    await waitFor(() => expect(control.getAttribute("aria-expanded")).toBe("true"))
    expect(page.getAllByRole("dialog", { hidden: true })).toHaveLength(1)
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

describe("Phone date capsule in a row (iOS 26 kit Date and time - Collapsed)", () => {
  // jsdom does not evaluate media queries; the contract is read from the source rules the phone applies.
  const phone = (file: string) => {
    const rules: postcss.Rule[] = []
    postcss.parse(readFileSync(file, "utf8")).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px)") media.walkRules((rule) => { if (rule.selector.includes("[data-date-picker]")) rules.push(rule) })
    })
    return rules
  }
  const decls = (rule: postcss.Rule) => Object.fromEntries(rule.nodes.filter((n): n is postcss.Declaration => n.type === "decl").map((d) => [d.prop, d.value]))
  // A rule by a part of its selector, so new or reordered rules do not shift the one a test reads
  const find = (file: string, part: string) => {
    const found = phone(file).filter((rule) => rule.selector.includes(part))
    expect(found, part).toHaveLength(1)
    return found[0]
  }
  const nestedDecls = (rule: postcss.Rule) => Object.fromEntries(rule.nodes.filter((n): n is postcss.Rule => n.type === "rule").map((r) => [r.selector.replace(/\s+/g, " "), decls(r)]))

  test("the row trigger is a 34px capsule with 11px insets on the time pill fill", () => {
    const roots = phone("packages/styles/src/components/Field/Field.module.css").filter((rule) => rule.selector.endsWith('> .Control > [data-date-picker][data-variant][role="button"][aria-haspopup]:not([aria-haspopup="false"])'))
    expect(roots).toHaveLength(1)
    const [root] = roots
    expect(decls(root)).toEqual({
      "--select-control-size": "34px",
      "margin-block": "calc((var(--field-row-label-line-height) - 34px) / 2)",
      "padding-inline": "11px",
      "border-radius": "var(--radius-full)",
      "color": "var(--color-text)",
    })
    expect(nestedDecls(root)).toEqual({
      "&::before": { "background-color": "var(--color-background-secondary-soft-alpha)" },
      "&[data-selected=\"false\"], &[data-disabled]": { color: "var(--mobile-label-tertiary, var(--color-text-tertiary))" },
      "&[aria-expanded=\"true\"]:not([data-disabled])": { color: "var(--link-primary-text-color)" },
    })
    // The calendar's time pill paints the same fill.
    expect(readFileSync("packages/styles/src/components/DatePicker/Calendar.module.css", "utf8")).toContain("background: var(--color-background-secondary-soft-alpha);")
  })

  test("a date and a time are two capsules 6px apart on the trigger's clear fill (kit: two pills, gap 6)", () => {
    const parts = find("packages/styles/src/components/Field/Field.module.css", ":has([data-date-parts])")
    expect(parts.selector).toMatch(/> \.Control > \[data-date-picker\]\[data-variant\]\[role="button"\]\[aria-haspopup\]:not\(\[aria-haspopup="false"\]\):has\(\[data-date-parts\]\)$/)
    expect(decls(parts)).toEqual({ "padding-inline": "0" })
    expect(nestedDecls(parts)).toEqual({
      "&::before": { "background-color": "transparent" },
      "& [data-date-parts]": { "display": "flex", "gap": "6px", "min-width": "0" },
      "& [data-date-part]": { "padding": "6px 11px", "border-radius": "var(--radius-full)", "background-color": "var(--color-background-secondary-soft-alpha)" },
      // Short of room the date ends in an ellipsis and the time keeps its width
      "& [data-date-part=\"date\"]": { "min-width": "0", "overflow": "hidden", "text-overflow": "ellipsis" },
      "& [data-date-part=\"time\"]": { "flex-shrink": "0" },
    })
  })

  // Plan 169a: under its label too, a row is the frame of its control
  test("a disabled Select or date in a row, beside or under its label, keeps the row's surface, with no frame or fill of its own", () => {
    const rules: postcss.Rule[] = []
    postcss.parse(readFileSync("packages/styles/src/components/Field/Field.module.css", "utf8")).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px)") media.walkRules((rule) => { if (rule.selector.endsWith('[role="button"][data-disabled]')) rules.push(rule) })
    })
    expect(rules).toHaveLength(1)
    expect(rules[0].selector).toBe('.Field:where([data-row]) .Control :is([data-variant="outline"], [data-variant="soft"])[role="button"][data-disabled]')
    expect(decls(rules[0])).toEqual({ "--select-control-background-color": "transparent", "--select-control-border-color": "transparent" })
  })

  test("the capsule hides the pop-up chevrons only in a horizontal row, and the wrapper they leave empty", () => {
    const rule = find("packages/styles/src/components/SelectControl/SelectControl.module.css", "[data-date-picker] .DropdownIcon")
    const wrapper = find("packages/styles/src/components/SelectControl/SelectControl.module.css", ".IndicatorWrapper")
    expect(rule.selector).toBe(":where([data-row][data-orientation=\"horizontal\"]) .SelectControl[data-date-picker] .DropdownIcon")
    expect(decls(rule)).toEqual({ display: "none" })
    // An empty wrapper would still take the trigger's gap: the date 8px off center, the capsule 8px short of the edge.
    expect(wrapper.selector).toBe(":where([data-row][data-orientation=\"horizontal\"]) .SelectControl[data-date-picker] .IndicatorWrapper:not(:has(> :not(.DropdownIcon)))")
    expect(decls(wrapper)).toEqual({ display: "none" })
  })
})
