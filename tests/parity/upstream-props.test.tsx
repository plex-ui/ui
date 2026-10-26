import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Fragment, h } from "vue"
import { Alert as RAlert } from "../../packages/ui/src/components/Alert"
import { Button as RButton } from "../../packages/ui/src/components/Button"
import { Checkbox as RCheckbox } from "../../packages/ui/src/components/Checkbox"
import { EmptyMessage as REmptyMessage } from "../../packages/ui/src/components/EmptyMessage"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { Menu as RMenu } from "../../packages/ui/src/components/Menu"
import { RadioGroup as RRadioGroup } from "../../packages/ui/src/components/RadioGroup"
import { Alert } from "../../packages/vue/src/components/Alert"
import { Button } from "../../packages/vue/src/components/Button"
import { Checkbox } from "../../packages/vue/src/components/Checkbox"
import {
  EmptyMessage,
  EmptyMessageActionRow,
  EmptyMessageDescription,
  EmptyMessageIcon,
  EmptyMessageTitle,
} from "../../packages/vue/src/components/EmptyMessage"
import { Field } from "../../packages/vue/src/components/Field"
import { Input } from "../../packages/vue/src/components/Input"
import { Menu, MenuContent, MenuItem, MenuLink, MenuTrigger } from "../../packages/vue/src/components/Menu"
import { RadioGroup, RadioGroupItem } from "../../packages/vue/src/components/RadioGroup"
import { flushVue, mountVue } from "./harness"
import { renderPair } from "./pair"

// New props that apps used to build by hand next to the components.

const noop = () => {}

describe("Menu.Item and Menu.Link danger", () => {
  test("an open menu marks the destructive items", async () => {
    const pair = await renderPair(
      <RMenu forceOpen>
        <RMenu.Trigger>
          <RButton color="secondary">Options</RButton>
        </RMenu.Trigger>
        <RMenu.Content>
          <RMenu.Item onSelect={noop}>Rename</RMenu.Item>
          <RMenu.Item onSelect={noop} danger description="Also removes its history">
            Delete
          </RMenu.Item>
          <RMenu.Link href="/leave" danger>
            Leave workspace
          </RMenu.Link>
        </RMenu.Content>
      </RMenu>,
      () =>
        h(Menu, { forceOpen: true }, () => [
          h(MenuTrigger, null, () => h(Button, { color: "secondary" }, () => "Options")),
          h(MenuContent, null, () => [
            h(MenuItem, { onSelect: noop }, () => "Rename"),
            h(MenuItem, { onSelect: noop, danger: true, description: "Also removes its history" }, () => "Delete"),
            h(MenuLink, { href: "/leave", danger: true }, () => "Leave workspace"),
          ]),
        ]),
    )
    // Popper positions settle on different ticks; the items are what this checks
    const withoutStyles = (dom: string) => dom.replace(/ style="[^"]*"/g, "")
    expect(withoutStyles(pair.vue)).toBe(withoutStyles(pair.react))
    expect(pair.react.match(/data-danger=""/g)?.length).toBe(2)
  })
})

describe("Checkbox description", () => {
  test.each([
    ["label and description", { label: "Email me", description: "A weekly summary, no more" }],
    ["description without label renders nothing extra", { description: "Ignored without a label" }],
    ["label only", { label: "Email me" }],
  ])("%s", async (_name, props) => {
    const pair = await renderPair(<RCheckbox {...props} />, () => h(Checkbox, props))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react.includes("LabelGroup")).toBe("label" in props && "description" in props)
  })

  test("the description describes the checkbox, after the Field's own ids", async () => {
    const pair = await renderPair(
      <RField label="Notifications" description="You can change this later">
        <RCheckbox label="Email me" description="A weekly summary" />
      </RField>,
      () =>
        h(Field, { label: "Notifications", description: "You can change this later" }, () =>
          h(Checkbox, { label: "Email me", description: "A weekly summary" }),
        ),
    )
    expect(pair.vue).toBe(pair.react)

    await act(async () => {
      render(<RCheckbox label="Email me" description="A weekly summary" />)
    })
    const box = screen.getByRole("checkbox", { name: "Email me" })
    expect(box.getAttribute("aria-describedby")).toBe(document.querySelector(".Description")?.id)
    cleanup()

    mountVue(() => h(Checkbox, { label: "Email me" }, { description: () => "A weekly summary" }))
    await flushVue()
    expect(screen.getByRole("checkbox", { name: "Email me" }).getAttribute("aria-describedby")).toBeTruthy()
  })
})

describe("RadioGroup.Item description", () => {
  const options = [
    { value: "monthly", label: "Monthly", description: "Billed every month" },
    { value: "yearly", label: "Yearly", description: undefined },
  ]

  test.each([["left"], ["right"]])("orientation %s", async (orientation) => {
    const pair = await renderPair(
      <RRadioGroup value="monthly" onChange={noop} aria-label="Plan" direction="col">
        {options.map((option) => (
          <RRadioGroup.Item
            key={option.value}
            value={option.value}
            description={option.description}
            orientation={orientation as "left"}
          >
            {option.label}
          </RRadioGroup.Item>
        ))}
      </RRadioGroup>,
      () =>
        h(RadioGroup, { "value": "monthly", "aria-label": "Plan", "direction": "col" }, () =>
          options.map((option) =>
            h(
              RadioGroupItem,
              { key: option.value, value: option.value, description: option.description, orientation },
              () => option.label,
            ),
          ),
        ),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react.match(/RadioDescription/g)?.length).toBe(1)
  })

  test("the radio keeps its name and gets the description", async () => {
    await act(async () => {
      render(
        <RRadioGroup value="monthly" onChange={noop} aria-label="Plan">
          <RRadioGroup.Item value="monthly" description="Billed every month">
            Monthly
          </RRadioGroup.Item>
        </RRadioGroup>,
      )
    })
    const radio = screen.getByRole("radio", { name: "Monthly" })
    expect(document.getElementById(radio.getAttribute("aria-describedby")!)?.textContent).toBe("Billed every month")
  })
})

describe("EmptyMessage size and align", () => {
  test.each([
    ["default", {}],
    ["sm", { size: "sm" }],
    ["start", { align: "start" }],
    ["sm start, no fill", { size: "sm", align: "start", fill: "none" }],
  ])("%s", async (_name, props) => {
    const pair = await renderPair(
      <REmptyMessage {...(props as object)}>
        <REmptyMessage.Icon>
          <svg />
        </REmptyMessage.Icon>
        <REmptyMessage.Title>No members yet</REmptyMessage.Title>
        <REmptyMessage.Description>Invite people to work together.</REmptyMessage.Description>
        <REmptyMessage.ActionRow>
          <RButton color="primary">Invite</RButton>
        </REmptyMessage.ActionRow>
      </REmptyMessage>,
      () =>
        h(EmptyMessage, props, () => [
          h(EmptyMessageIcon, null, () => h("svg")),
          h(EmptyMessageTitle, null, () => "No members yet"),
          h(EmptyMessageDescription, null, () => "Invite people to work together."),
          h(EmptyMessageActionRow, null, () => h(Button, { color: "primary" }, () => "Invite")),
        ]),
    )
    expect(pair.vue).toBe(pair.react)
  })
})

describe("Alert banner", () => {
  test.each([["soft"], ["outline"], ["solid"]])("%s", async (variant) => {
    const props = { variant, color: "caution", banner: true, indicator: false, title: "You are offline" } as const
    const pair = await renderPair(<RAlert {...props} />, () => h(Alert, props))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('data-banner=""')
  })

  test("not a banner by default", async () => {
    const pair = await renderPair(<RAlert title="Saved" />, () => h(Alert, { title: "Saved" }))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("data-banner")
  })
})

describe("Input ghost", () => {
  test("renders the ghost variant", async () => {
    const pair = await renderPair(
      <>
        <RInput variant="ghost" placeholder="Search" />
        <RInput variant="ghost" invalid />
      </>,
      () => h(Fragment, null, [h(Input, { variant: "ghost", placeholder: "Search" }), h(Input, { variant: "ghost", invalid: true })]),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('data-variant="ghost"')
  })
})

describe("Select searchSize", () => {
  test("sizes the search input in the open menu", async () => {
    const { Select: RSelect } = await import("../../packages/ui/src/components/Select")
    const { Select } = await import("../../packages/vue/src/components/Select")
    // Select shows its search field from 16 options
    const options = Array.from({ length: 20 }, (_, i) => ({ label: `Option ${i}`, value: `o${i}` }))
    const searchSize = async (mount: () => Promise<void>) => {
      await mount()
      await act(async () => fireTrigger())
      await flushVue()
      await new Promise((resolve) => setTimeout(resolve, 0))
      await flushVue()
      return document.querySelector('[role="combobox"][aria-autocomplete="list"]')?.closest('[data-size]')?.getAttribute("data-size")
    }
    const fireTrigger = () => {
      fireEvent.pointerDown(document.querySelector<HTMLElement>("[aria-haspopup]")!, { button: 0 })
    }
    const react = await searchSize(async () => {
      await act(async () => {
        render(<RSelect value="" onChange={noop} options={options} searchSize="2xl" aria-label="Pick" />)
      })
    })
    cleanup()
    document.body.innerHTML = ""
    const vue = await searchSize(async () => {
      mountVue(() => h(Select, { "value": "", "options": options, "searchSize": "2xl", "aria-label": "Pick" }))
      await flushVue()
    })
    expect({ react, vue }).toEqual({ react: "2xl", vue: "2xl" })
  })
})
