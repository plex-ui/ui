import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { Checkbox as RCheckbox } from "../../packages/ui/src/components/Checkbox"
import { RadioGroup as RRadioGroup } from "../../packages/ui/src/components/RadioGroup"
import { Switch as RSwitch } from "../../packages/ui/src/components/Switch"
import { Field } from "../../packages/vue/src/components/Field"
import { Checkbox } from "../../packages/vue/src/components/Checkbox"
import { RadioGroup, RadioGroupItem } from "../../packages/vue/src/components/RadioGroup"
import { Switch } from "../../packages/vue/src/components/Switch"
import { flushVue, mountVue } from "./harness"

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

const click = async (element: HTMLElement) => {
  await act(async () => { element.click(); await flushVue() })
}

const rowOf = (control: HTMLElement) => {
  const row = control.closest<HTMLElement>("[data-row]")
  if (!row) throw new Error("Missing choice row")
  return row
}

describe.each(["React", "Vue"])("%s Field choice row", (framework) => {
  test.each(["checkbox", "switch"] as const)("%s toggles once from row, description, label and control; keyboard stays on control", async (kind) => {
    const change = vi.fn()
    const props = { defaultChecked: false, onCheckedChange: change }
    if (framework === "React") render(
      <RField row label="Notifications" description="Sent weekly.">
        {kind === "checkbox" ? <RCheckbox {...props} /> : <RSwitch {...props} />}
      </RField>,
    )
    else {
      mountVue(() => h(Field, { row: true, label: "Notifications", description: "Sent weekly." }, () =>
        kind === "checkbox" ? h(Checkbox, { defaultChecked: false, "onUpdate:checked": change }) : h(Switch, { defaultChecked: false, "onUpdate:checked": change }),
      ))
      await flushVue()
    }
    const page = within(document.body)
    const control = page.getByRole(kind, { name: "Notifications" })
    const row = rowOf(control)
    expect(row.hasAttribute("tabindex")).toBe(false)
    await click(row)
    expect(control.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(control)
    await click(page.getByText("Sent weekly."))
    expect(control.getAttribute("aria-checked")).toBe("false")
    await click(page.getByText("Notifications"))
    expect(control.getAttribute("aria-checked")).toBe("true")
    await click(control)
    expect(control.getAttribute("aria-checked")).toBe("false")
    expect(change.mock.calls.map(([value]) => value)).toEqual([true, false, true, false])
    // jsdom does not synthesize a button click from Space; mirror that browser default.
    await act(async () => {
      const down = fireEvent.keyDown(control, { key: " ", code: "Space" })
      const up = fireEvent.keyUp(control, { key: " ", code: "Space" })
      if (down && up) control.click()
      await flushVue()
    })
    expect(control.getAttribute("aria-checked")).toBe("true")
    expect(change).toHaveBeenCalledTimes(5)
  })

  test("radio rows select exactly once and preserve arrow navigation and disabled choices", async () => {
    const change = vi.fn()
    const options = [{ value: "starter", label: "Starter" }, { value: "team", label: "Team" }, { value: "locked", label: "Locked", disabled: true }]
    if (framework === "React") render(
      <RRadioGroup defaultValue="team" onChange={change} direction="col" aria-label="Plan">
        {options.map((option) => <RField key={option.value} row label={option.label} description={`${option.label} description`}>
          <RRadioGroup.Item value={option.value} disabled={option.disabled} />
        </RField>)}
      </RRadioGroup>,
    )
    else {
      mountVue(() => h(RadioGroup, { defaultValue: "team", onChange: change, direction: "col", "aria-label": "Plan" }, () =>
        options.map((option) => h(Field, { row: true, label: option.label, description: `${option.label} description` }, () => h(RadioGroupItem, { value: option.value, disabled: option.disabled }))),
      ))
      await flushVue()
    }
    const page = within(document.body)
    const starter = page.getByRole("radio", { name: "Starter" })
    const team = page.getByRole("radio", { name: "Team" })
    await click(rowOf(starter))
    expect(starter.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(starter)
    await click(page.getByText("Team description"))
    expect(team.getAttribute("aria-checked")).toBe("true")
    await click(page.getByText("Starter", { selector: "label" }))
    expect(starter.getAttribute("aria-checked")).toBe("true")
    await click(starter)
    await click(rowOf(page.getByRole("radio", { name: "Locked" })))
    expect(change.mock.calls.map(([value]) => value)).toEqual(["starter", "team", "starter"])
    await act(async () => { starter.focus(); fireEvent.keyDown(starter, { key: "ArrowDown" }); await flushVue() })
    await waitFor(() => expect(document.activeElement).toBe(team))
    await act(async () => { fireEvent.keyUp(team, { key: "ArrowDown" }); await flushVue() })
    expect(team.getAttribute("aria-checked")).toBe("true")
    expect(page.getAllByRole("radio").filter((radio) => radio.tabIndex === 0)).toEqual([team])
  })

  test.each([false, true])("delegation calls the row handler once (in form: %s)", async (inForm) => {
    const onClick = vi.fn()
    if (framework === "React") {
      const field = <RField row label="Subscribe" onClick={onClick}><RCheckbox /></RField>
      render(inForm ? <form>{field}</form> : field)
    } else {
      mountVue(() => {
        const field = h(Field, { row: true, label: "Subscribe", onClick }, () => h(Checkbox))
        return inForm ? h("form", null, [field]) : field
      })
      await flushVue()
    }
    const control = within(document.body).getByRole("checkbox", { name: "Subscribe" })
    await click(rowOf(control))
    expect(control.getAttribute("aria-checked")).toBe("true")
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test("disabled choices, nested actions, and a prevented row click never toggle", async () => {
    const change = vi.fn()
    const prevent = (event: { preventDefault: () => void }) => event.preventDefault()
    if (framework === "React") render(<>
      <RField row label="Disabled"><RCheckbox disabled onCheckedChange={change} /></RField>
      <RField row label="Prevented" onClick={prevent}><RSwitch onCheckedChange={change} /></RField>
      <RField row label="Actions" description={<a href="#help">Help</a>} action={<button type="button">Details</button>}>
        <RCheckbox onCheckedChange={change} />
      </RField>
    </>)
    else {
      mountVue(() => h("div", [
        h(Field, { row: true, label: "Disabled" }, () => h(Checkbox, { disabled: true, "onUpdate:checked": change })),
        h(Field, { row: true, label: "Prevented", onClick: prevent }, () => h(Switch, { "onUpdate:checked": change })),
        h(Field, { row: true, label: "Actions" }, {
          default: () => h(Checkbox, { "onUpdate:checked": change }),
          description: () => h("a", { href: "#help" }, "Help"),
          action: () => h("button", { type: "button" }, "Details"),
        }),
      ]))
      await flushVue()
    }
    const page = within(document.body)
    await click(rowOf(page.getByRole("checkbox", { name: "Disabled" })))
    await click(rowOf(page.getByRole("switch", { name: "Prevented" })))
    await click(page.getByRole("link", { name: "Help" }))
    await click(page.getByRole("button", { name: "Details" }))
    expect(change).not.toHaveBeenCalled()
  })
})
