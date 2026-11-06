import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react"
import { useLayoutEffect, useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { Dialog as ReactDialog } from "@plexui/ui/components/Dialog"
import {
  Dialog as VueDialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@plexui/vue/components/Dialog"
import { MobileTagRow as ReactMobileTagRow } from "../../components/docs/MobileTagRow"
import { MobileTagRow as VueMobileTagRow, type MobileTagOption } from "../../components/docs/vue/MobileTagRow"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

// The helper and its enclosing Sheet must share the actual source Dialog context.
vi.mock("@plexui/ui/components/Dialog", async () => import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => import("../../packages/vue/src/components/Dialog"))

type Framework = "React" | "Vue"
const options: MobileTagOption[] = [
  { value: "oak", label: "Oak" },
  { value: "steel", label: "Steel" },
]

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const mountRow = async (framework: Framework, initial = ["oak"], nested = false, enclosingForm = false) => {
  const changes = vi.fn<(value: string[]) => void>()
  const optionChanges = vi.fn<(options: MobileTagOption[]) => void>()
  const parentChanges = vi.fn<(open: boolean) => void>()
  const formSubmits = vi.fn()
  let updateOptions: ((next: MobileTagOption[]) => void) | undefined
  if (framework === "React") {
    function Example() {
      const [value, setValue] = useState(initial)
      const [available, setAvailable] = useState(options)
      const [open, setOpen] = useState(true)
      useLayoutEffect(() => {
        updateOptions = setAvailable
        return () => { updateOptions = undefined }
      }, [])
      const row = <ReactMobileTagRow label="Materials" one="material" options={available} onOptionsChange={(next) => { optionChanges(next); setAvailable(next) }} value={value} onChange={(next) => { changes(next); setValue(next) }} />
      const content = !nested ? row : (
        <ReactDialog open={open} onOpenChange={(next) => { parentChanges(next); setOpen(next) }}>
          <ReactDialog.Content mobileVariant="sheet" surface="grouped">
            <ReactDialog.Header>
              <ReactDialog.Title>Product</ReactDialog.Title>
              <ReactDialog.Description>Edit product details.</ReactDialog.Description>
            </ReactDialog.Header>
            <ReactDialog.Body>{row}</ReactDialog.Body>
          </ReactDialog.Content>
        </ReactDialog>
      )
      return enclosingForm ? <form onSubmit={(event) => { event.preventDefault(); formSubmits() }}>{content}</form> : content
    }
    await act(async () => { render(<Example />) })
  } else {
    const state = reactive({ value: [...initial], options: [...options], open: true })
    updateOptions = (next) => { state.options = next }
    const row = () => h(VueMobileTagRow, {
      label: "Materials", one: "material", options: state.options, modelValue: state.value,
      "onUpdate:options": (next) => { optionChanges(next); state.options = next },
      "onUpdate:modelValue": (next) => { changes(next); state.value = next },
    })
    const content = () => nested ? h(VueDialog, {
      open: state.open,
      "onUpdate:open": (next: boolean) => { parentChanges(next); state.open = next },
    }, () => h(DialogContent, { mobileVariant: "sheet", surface: "grouped" }, () => [
      h(DialogHeader, null, () => [
        h(DialogTitle, null, () => "Product"),
        h(DialogDescription, null, () => "Edit product details."),
      ]),
      h(DialogBody, null, row),
    ])) : row()
    mountVue(() => enclosingForm ? h("form", { onSubmit: (event: Event) => { event.preventDefault(); formSubmits() } }, [content()]) : content())
    await flushVue()
  }
  return {
    changes, optionChanges, parentChanges, formSubmits,
    setOptions: (next: MobileTagOption[]) => {
      if (!updateOptions) throw new Error("The controlled options fixture has not mounted")
      updateOptions(next)
    },
  }
}

const click = async (element: HTMLElement) => interact(() => fireEvent.click(element))
const typeName = async (editor: HTMLElement, value: string) => {
  const input = within(editor).getByRole("textbox", { name: "New material" })
  await interact(() => {
    fireEvent.input(input, { target: { value } })
    fireEvent.change(input, { target: { value } })
  })
  return input
}
const openEditor = async () => {
  const summary = within(document.body).getByRole("button", { name: /^Materials(?:: .+)?$/i })
  await click(summary)
  const editor = await within(document.body).findByRole("dialog", { name: "Materials" })
  return { summary, editor, content: within(editor) }
}
const expectClosed = async (summary: HTMLElement) => {
  await waitFor(() => expect(within(document.body).queryByRole("dialog", { name: "Materials" })).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(summary))
  expect(summary.getAttribute("aria-expanded")).toBe("false")
}

describe.each<Framework>(["React", "Vue"])("%s Phone tag draft editor", (framework) => {
  test("an empty selection has no counter, and opening focuses the heading without opening the text input", async () => {
    await mountRow(framework, [])
    const { summary, editor, content } = await openEditor()
    expect(summary.textContent).toBe("Materials")
    expect(summary.getAttribute("aria-expanded")).toBe("true")
    expect(content.getAllByRole("checkbox", { checked: false })).toHaveLength(2)
    expect(document.activeElement).toBe(content.getByRole("heading", { name: "Materials" }).parentElement)
    expect(document.activeElement).not.toBe(within(editor).getByRole("textbox"))
    await click(content.getByRole("button", { name: "Close dialog" }))
    await expectClosed(summary)
  })

  test("toggles edit only the draft; Close discards them and restores summary focus", async () => {
    const { changes } = await mountRow(framework)
    const { summary, content } = await openEditor()
    await click(content.getByRole("checkbox", { name: "Oak", exact: true }))
    await click(content.getByRole("checkbox", { name: "Steel", exact: true }))
    expect(content.getByRole("checkbox", { name: "Oak", exact: true }).getAttribute("aria-checked")).toBe("false")
    expect(content.getByRole("checkbox", { name: "Steel", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(changes).not.toHaveBeenCalled()
    expect(summary.textContent).toBe("MaterialsOak")
    await click(content.getByRole("button", { name: "Close dialog" }))
    await expectClosed(summary)
    const reopened = await openEditor()
    expect(reopened.content.getByRole("checkbox", { name: "Oak", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(reopened.content.getByRole("checkbox", { name: "Steel", exact: true }).getAttribute("aria-checked")).toBe("false")
    expect(changes).not.toHaveBeenCalled()
  })

  test("the label and whole row toggle the trailing checkbox; Space keeps keyboard focus on the control", async () => {
    const { changes } = await mountRow(framework)
    const { content } = await openEditor()
    const steel = content.getByRole("checkbox", { name: "Steel", exact: true })
    const row = steel.closest<HTMLElement>("[data-tag-option]")
    if (!row) throw new Error("The tag checkbox must belong to a selectable row")
    expect(row.hasAttribute("tabindex")).toBe(false)
    expect(steel.getAttribute("data-variant")).toBe("ghost")
    await click(content.getByText("Steel", { selector: "label" }))
    expect(steel.getAttribute("aria-checked")).toBe("true")
    await click(row)
    expect(steel.getAttribute("aria-checked")).toBe("false")
    expect(document.activeElement).toBe(steel)
    await interact(() => {
      // jsdom has no native Space activation; reproduce its default button click
      // only if neither keyboard event was cancelled by the real control.
      const down = fireEvent.keyDown(steel, { key: " ", code: "Space" })
      const up = fireEvent.keyUp(steel, { key: " ", code: "Space" })
      if (down && up) steel.click()
    })
    expect(steel.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(steel)
    expect(changes).not.toHaveBeenCalled()
    await click(content.getByRole("button", { name: "Apply materials" }))
    expect(changes.mock.calls).toEqual([[["oak", "steel"]]])
  })

  test("Apply commits once, updates the selected names, and reopening starts from the committed selection", async () => {
    const { changes } = await mountRow(framework)
    const { summary, content } = await openEditor()
    await click(content.getByRole("checkbox", { name: "Steel", exact: true }))
    await click(content.getByRole("button", { name: "Apply materials" }))
    await expectClosed(summary)
    expect(changes.mock.calls).toEqual([[["oak", "steel"]]])
    expect(summary.textContent).toBe("MaterialsOak, Steel")
    expect(summary.getAttribute("aria-label")).toBe("Materials: Oak, Steel")
    const reopened = await openEditor()
    expect(reopened.content.getAllByRole("checkbox", { checked: true })).toHaveLength(2)
    await click(reopened.content.getByRole("checkbox", { name: "Oak", exact: true }))
    await click(reopened.content.getByRole("checkbox", { name: "Steel", exact: true }))
    await click(reopened.content.getByRole("button", { name: "Apply materials" }))
    await expectClosed(summary)
    expect(summary.textContent).toBe("Materials")
    expect(changes).toHaveBeenLastCalledWith([])
  })

  test("new names are trimmed, remain local until Apply, and remain available after reopening", async () => {
    const { changes, optionChanges } = await mountRow(framework)
    const { summary, editor, content } = await openEditor()
    const input = await typeName(editor, "  Linen  ")
    await click(content.getByRole("button", { name: "Add", exact: true }))
    expect(content.getByRole("checkbox", { name: "Linen", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(input).toHaveProperty("value", "")
    expect(changes).not.toHaveBeenCalled()
    expect(optionChanges).not.toHaveBeenCalled()
    await click(content.getByRole("button", { name: "Apply materials" }))
    await expectClosed(summary)
    expect(changes).toHaveBeenCalledTimes(1)
    expect(optionChanges).toHaveBeenCalledTimes(1)
    expect(optionChanges.mock.calls[0]?.[0].map((option) => option.label)).toEqual(["Oak", "Steel", "Linen"])
    expect(changes.mock.calls[0]?.[0]).toHaveLength(2)
    const reopened = await openEditor()
    expect(reopened.content.getByRole("checkbox", { name: "Linen", exact: true }).getAttribute("aria-checked")).toBe("true")
    await click(reopened.content.getByRole("checkbox", { name: "Linen", exact: true }))
    await click(reopened.content.getByRole("button", { name: "Apply materials" }))
    await expectClosed(summary)
    const third = await openEditor()
    expect(third.content.getByRole("checkbox", { name: "Linen", exact: true }).getAttribute("aria-checked")).toBe("false")
  })

  test("cancel discards newly created options as well as their selection", async () => {
    const { changes, optionChanges } = await mountRow(framework)
    const { summary, editor, content } = await openEditor()
    await typeName(editor, "Cedar")
    await click(content.getByRole("button", { name: "Add", exact: true }))
    expect(content.getByRole("checkbox", { name: "Cedar", exact: true })).toBeTruthy()
    await click(content.getByRole("button", { name: "Close dialog" }))
    await expectClosed(summary)
    const reopened = await openEditor()
    expect(reopened.content.queryByRole("checkbox", { name: "Cedar", exact: true })).toBeNull()
    expect(reopened.content.getByRole("textbox", { name: "New material" })).toHaveProperty("value", "")
    expect(changes).not.toHaveBeenCalled()
    expect(optionChanges).not.toHaveBeenCalled()
  })

  test("external option updates refresh the summary and the next editor", async () => {
    const { setOptions } = await mountRow(framework)
    const { summary, content } = await openEditor()
    expect(content.getByRole("checkbox", { name: "Steel", exact: true })).toBeTruthy()
    await click(content.getByRole("button", { name: "Apply materials" }))
    await expectClosed(summary)
    await interact(() => setOptions([{ value: "oak", label: "Solid oak" }]))
    expect(summary.textContent).toBe("MaterialsSolid oak")
    expect(summary.getAttribute("aria-label")).toBe("Materials: Solid oak")
    const reopened = await openEditor()
    expect(reopened.content.queryByRole("checkbox", { name: "Steel", exact: true })).toBeNull()
    expect(reopened.content.getAllByRole("checkbox")).toHaveLength(1)
    expect(reopened.content.getByRole("checkbox", { name: "Solid oak", exact: true }).getAttribute("aria-checked")).toBe("true")
  })

  test("submitting the new-name field does not submit the enclosing form or commit the draft", async () => {
    const { changes, parentChanges, formSubmits } = await mountRow(framework, ["oak"], true, true)
    const { editor, content } = await openEditor()
    const input = await typeName(editor, "Cedar")
    const form = input.closest("form")
    expect(form).not.toBeNull()
    if (!form) throw new Error("The new-name field must belong to its own form")
    await interact(() => fireEvent.submit(form))
    expect(content.getByRole("checkbox", { name: "Cedar", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(formSubmits).not.toHaveBeenCalled()
    expect(parentChanges).not.toHaveBeenCalled()
    expect(changes).not.toHaveBeenCalled()
    expect(editor.isConnected).toBe(true)
  })

  test("case-insensitive duplicates select an existing option without duplicating its name or value", async () => {
    const { changes } = await mountRow(framework)
    const { summary, editor, content } = await openEditor()
    await typeName(editor, "  oAK  ")
    await click(content.getByRole("button", { name: "Add", exact: true }))
    await typeName(editor, " sTEEL ")
    await click(content.getByRole("button", { name: "Add", exact: true }))
    expect(content.getAllByRole("checkbox", { checked: true })).toHaveLength(2)
    expect(content.getAllByRole("checkbox", { name: "Oak", exact: true })).toHaveLength(1)
    expect(content.getAllByRole("checkbox", { name: "Steel", exact: true })).toHaveLength(1)
    await typeName(editor, "   ")
    expect(content.getByRole("button", { name: "Add", exact: true })).toHaveProperty("disabled", true)
    await click(content.getByRole("button", { name: "Apply materials" }))
    await expectClosed(summary)
    expect(changes.mock.calls).toEqual([[["oak", "steel"]]])
  })

  test.each(["Close", "Escape", "outside", "Apply"] as const)("a nested editor handles %s without closing the parent Sheet", async (method) => {
    const { changes, parentChanges } = await mountRow(framework, ["oak"], true)
    const parent = await within(document.body).findByRole("dialog", { name: "Product" })
    const { summary, editor, content } = await openEditor()
    await click(content.getByRole("checkbox", { name: "Steel", exact: true }))
    if (method === "Escape") {
      await interact(() => fireEvent.keyDown(document.activeElement ?? editor, { key: "Escape", code: "Escape" }))
    } else if (method === "outside") {
      // Dialog deliberately ignores a second click during its 300 ms double-click window.
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 320)) })
      const overlays = document.querySelectorAll<HTMLElement>('[class~="Overlay"]')
      const overlay = overlays.item(overlays.length - 1)
      expect(overlay).toBeTruthy()
      await interact(() => fireEvent.pointerDown(overlay, { pointerType: "mouse", button: 0 }))
      await interact(() => fireEvent.pointerUp(overlay, { pointerType: "mouse", button: 0 }))
      await click(overlay)
    } else {
      await click(content.getByRole("button", { name: method === "Apply" ? "Apply materials" : "Close dialog" }))
    }
    await expectClosed(summary)
    expect(parent.isConnected).toBe(true)
    expect(within(document.body).getByRole("dialog", { name: "Product" })).toBe(parent)
    expect(parentChanges).not.toHaveBeenCalled()
    if (method === "Apply") expect(changes.mock.calls).toEqual([[["oak", "steel"]]])
    else expect(changes).not.toHaveBeenCalled()
    expect(summary.textContent).toBe(`Materials${method === "Apply" ? "Oak, Steel" : "Oak"}`)
    const reopened = await openEditor()
    expect(reopened.content.getByRole("checkbox", { name: "Steel", exact: true }).getAttribute("aria-checked")).toBe(method === "Apply" ? "true" : "false")
  })
})
