import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { Input as ReactInput } from "@plexui/ui/components/Input"
import { FieldGroup as ReactGroup } from "@plexui/ui/components/FieldGroup"
import { Input as VueInput } from "@plexui/vue/components/Input"
import { FieldGroup as VueGroup } from "@plexui/vue/components/FieldGroup"
import { ProductVariants as ReactVariants, type ProductVariant } from "../../components/docs/ProductVariants"
import { ProductVariants as VueVariants } from "../../components/docs/vue/ProductVariants"
import { FormScreen as ReactScreen } from "../../components/docs/FormRowsDemos"
import { FormScreen as VueScreen } from "../../components/docs/vue/FormScreen"
import { animation, flushVue, mountVue } from "./harness"

// Source components share the same Dialog and Field contexts with the helper.
vi.mock("@plexui/ui/components/Button", async () => import("../../packages/ui/src/components/Button"))
vi.mock("@plexui/vue/components/Button", async () => import("../../packages/vue/src/components/Button"))
vi.mock("@plexui/ui/components/Dialog", async () => import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => import("../../packages/vue/src/components/Dialog"))
vi.mock("@plexui/ui/components/Field", async () => import("../../packages/ui/src/components/Field"))
vi.mock("@plexui/vue/components/Field", async () => import("../../packages/vue/src/components/Field"))
vi.mock("@plexui/ui/components/FieldGroup", async () => import("../../packages/ui/src/components/FieldGroup"))
vi.mock("@plexui/vue/components/FieldGroup", async () => import("../../packages/vue/src/components/FieldGroup"))
vi.mock("@plexui/ui/components/Input", async () => import("../../packages/ui/src/components/Input"))
vi.mock("@plexui/vue/components/Input", async () => import("../../packages/vue/src/components/Input"))
vi.mock("@plexui/ui/components/Page", async () => import("../../packages/ui/src/components/Page"))
vi.mock("@plexui/vue/components/Page", async () => import("../../packages/vue/src/components/Page"))
vi.mock("@plexui/ui/components/Tooltip", async () => import("../../packages/ui/src/components/Tooltip"))
vi.mock("@plexui/vue/components/Tooltip", async () => import("../../packages/vue/src/components/Tooltip"))
vi.mock("@plexui/ui/components/Transition", async () => import("../../packages/ui/src/components/Transition"))
vi.mock("@plexui/vue/components/Transition", async () => import("../../packages/vue/src/components/Transition"))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => false }))
vi.mock("@plexui/vue/composables/useBreakpoints", async () => {
  const { ref } = await import("vue")
  return { useBreakpoint: () => ref(false) }
})

type Framework = "React" | "Vue"
type FixtureOptions = { initial?: ProductVariant[]; accept?: boolean; presentation?: boolean }
const seed: ProductVariant[] = [
  { id: "small", name: "Small / natural" },
  { id: "medium", name: "Medium / natural" },
  { id: "large", name: "Large / natural" },
]
const page = () => within(document.body)
const interact = async (run: () => void) => act(async () => { run(); await flushVue() })
const advance = async (ms: number) => interact(() => { vi.advanceTimersByTime(ms) })
const settle = async () => { await advance(50); await advance(350); await advance(0) }
const click = async (node: HTMLElement) => interact(() => { fireEvent.click(node) })
const change = async (node: HTMLElement, value: string) => interact(() => {
  fireEvent.input(node, { target: { value } })
  fireEvent.change(node, { target: { value } })
})
const nameInput = (editor: HTMLElement) => {
  const input = within(editor).getByRole("textbox", { name: "Variant name", exact: true })
  if (!(input instanceof HTMLInputElement)) throw new Error("Variant name must remain a native input")
  return input
}
const editorForm = (editor: HTMLElement) => {
  const form = editor.querySelector("form")
  if (!(form instanceof HTMLFormElement)) throw new Error("Variant editor form is missing")
  return form
}

beforeEach(() => {
  animation.disabled = false
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(async () => {
  cleanup()
  await flushVue()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function mountOwner(framework: Framework, { initial = [], accept = true, presentation = false }: FixtureOptions = {}) {
  const state = reactive({
    variants: initial.map((item) => ({ ...item })),
    productName: "Oak side table",
    wide: false,
    dialog: false,
    surface: "grouped" as "plain" | "grouped",
  })
  const changes = vi.fn<(value: ProductVariant[]) => void>()
  const outerSubmits = vi.fn()
  let rerender = () => {}
  const changeVariants = (next: ProductVariant[]) => {
    changes(next)
    if (accept) { state.variants = next; rerender() }
  }
  const setDialog = (next: boolean) => { state.dialog = next; rerender() }
  if (framework === "React") {
    const contents = () => <>
      <ReactInput aria-label="Product name" value={state.productName} onChange={(event) => { state.productName = event.target.value; rerender() }} />
      <ReactGroup><ReactVariants wide={state.wide} value={state.variants} onChange={changeVariants} /></ReactGroup>
    </>
    const tree = () => presentation
      ? <ReactScreen title="Edit product" submitLabel="Save product" dialog={state.dialog} surface={state.surface} onDialogChange={setDialog}>{contents()}</ReactScreen>
      : <form onSubmit={(event) => { event.preventDefault(); outerSubmits() }}>{contents()}</form>
    const view = render(tree())
    rerender = () => view.rerender(tree())
  } else {
    const contents = () => [
      h(VueInput, { "aria-label": "Product name", value: state.productName, "onUpdate:value": (next: string) => { state.productName = next } }),
      h(VueGroup, null, () => h(VueVariants, { wide: state.wide, modelValue: state.variants, "onUpdate:modelValue": changeVariants })),
    ]
    mountVue(() => presentation
      ? h(VueScreen, { title: "Edit product", submitLabel: "Save product", dialog: state.dialog, surface: state.surface, "onUpdate:dialog": setDialog }, contents)
      : h("form", { onSubmit: (event: Event) => { event.preventDefault(); outerSubmits() } }, contents()))
    await flushVue()
  }
  await settle()
  return {
    changes, outerSubmits,
    get value() { return state.variants },
    setPresentation: (dialog: boolean, surface: "plain" | "grouped" = state.surface) => {
      state.dialog = dialog
      state.surface = surface
      rerender()
    },
    setWide: (wide: boolean) => { state.wide = wide; rerender() },
  }
}

// On a phone Variants is a row with a chevron: its screen lists the variants and Add variant (owner 14.11).
async function openList() {
  if (page().queryByRole("button", { name: "Add variant", exact: true })) return
  await click(page().getByRole("button", { name: /^Variants/ }))
  await settle()
}

async function closeList() {
  await click(page().getByRole("dialog", { name: "Variants", exact: true }).querySelector<HTMLElement>('button[aria-label="Close dialog"]')!)
  await settle()
}

async function openEditor(action = "Add variant") {
  await openList()
  const trigger = page().getByRole("button", { name: action, exact: true })
  await click(trigger)
  await settle()
  const editor = page().getByRole("dialog", { name: action === "Add variant" ? "Add variant" : "Edit variant", exact: true })
  const input = nameInput(editor)
  expect(document.activeElement).toBe(input)
  return { editor, input, trigger, content: within(editor) }
}

async function closeAfterExit(editor: HTMLElement, close: () => Promise<void>, expectedFocus: HTMLElement) {
  await close()
  // Inert exit removes accessibility roles before the DOM and focus scope detach.
  expect(editor.isConnected).toBe(true)
  await advance(50)
  expect(editor.isConnected).toBe(true)
  await advance(350)
  await advance(0)
  expect(editor.isConnected).toBe(false)
  expect(document.activeElement).toBe(expectedFocus)
}

function expectError(editor: HTMLElement, message: string) {
  const input = nameInput(editor)
  expect(input.getAttribute("aria-invalid")).toBe("true")
  const descriptions = (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean)
  expect(descriptions.some((id) => document.getElementById(id)?.textContent?.includes(message))).toBe(true)
  expect(document.activeElement).toBe(input)
}

describe.each<Framework>(["React", "Vue"])("%s product variant editor", (framework) => {
  test("Add opens, validates blank and duplicate names, then commits once without submitting the product", async () => {
    const owner = await mountOwner(framework, { initial: [seed[0]] })
    const product = page().getByRole("textbox", { name: "Product name", exact: true })
    await change(product, "Cedar table")
    const { editor, input, trigger, content } = await openEditor()
    expect(input.value).toBe("")
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    await change(input, "   ")
    await click(content.getByRole("button", { name: "Save variant", exact: true }))
    expectError(editor, "Enter a variant name.")
    expect(owner.changes).not.toHaveBeenCalled()
    await change(input, " SMALL / NATURAL ")
    await click(content.getByRole("button", { name: "Save variant", exact: true }))
    expectError(editor, "A variant with this name already exists.")
    expect(owner.changes).not.toHaveBeenCalled()
    await change(input, "  Large / walnut  ")
    expect(input.getAttribute("aria-invalid")).not.toBe("true")
    const save = content.getByRole("button", { name: "Save variant", exact: true })
    expect(save.getAttribute("form")).toBe(editorForm(editor).id)
    await closeAfterExit(editor, () => click(save), trigger)
    expect(owner.changes).toHaveBeenCalledTimes(1)
    expect(owner.value.map((item) => item.name)).toEqual(["Small / natural", "Large / walnut"])
    expect(owner.value[0]).toEqual(seed[0])
    expect(page().getByRole("button", { name: "Edit Large / walnut", exact: true })).toBeTruthy()
    await closeList()
    expect(page().getByRole("button", { name: "Variants: Small / natural, Large / walnut", exact: true })).toBeTruthy()
    expect(page().getByRole("textbox", { name: "Product name", exact: true })).toBe(product)
    expect(product).toHaveProperty("value", "Cedar table")
    expect(owner.outerSubmits).not.toHaveBeenCalled()
  })

  test.each(["Cancel", "Close dialog", "Escape"])("%s discards the draft and restores Add after actual exit", async (method) => {
    const owner = await mountOwner(framework)
    const { editor, input, trigger, content } = await openEditor()
    await change(input, "Unsaved")
    await closeAfterExit(editor, () => method === "Escape"
      ? interact(() => { fireEvent.keyDown(input, { key: "Escape" }) })
      : click(content.getByRole("button", { name: method, exact: true })), trigger)
    expect(owner.changes).not.toHaveBeenCalled()
    expect(owner.value).toEqual([])
    const reopened = await openEditor()
    expect(reopened.input.value).toBe("")
    expect(reopened.input.getAttribute("aria-invalid")).not.toBe("true")
    expect(owner.outerSubmits).not.toHaveBeenCalled()
  })

  test("Edit starts with the saved value; Cancel keeps it, rename preserves ID and other variants", async () => {
    const owner = await mountOwner(framework, { initial: seed.slice(0, 2) })
    let current = await openEditor("Edit Small / natural")
    expect(current.input.value).toBe("Small / natural")
    await change(current.input, "Discard rename")
    await closeAfterExit(current.editor, () => click(current.content.getByRole("button", { name: "Cancel", exact: true })), current.trigger)
    expect(owner.value).toEqual(seed.slice(0, 2))
    expect(owner.changes).not.toHaveBeenCalled()
    current = await openEditor("Edit Small / natural")
    await change(current.input, "Medium / natural")
    await click(current.content.getByRole("button", { name: "Save variant", exact: true }))
    expectError(current.editor, "A variant with this name already exists.")
    await change(current.input, "Small / walnut")
    await closeAfterExit(current.editor, () => click(current.content.getByRole("button", { name: "Save variant", exact: true })), current.trigger)
    expect(owner.value).toEqual([{ id: "small", name: "Small / walnut" }, seed[1]])
    expect(page().queryByRole("button", { name: "Edit Small / natural", exact: true })).toBeNull()
    expect(page().getByRole("button", { name: "Edit Small / walnut", exact: true })).toBe(current.trigger)
    expect(owner.changes).toHaveBeenCalledTimes(1)
  })

  test.each([
    { label: "next", initial: seed, source: seed[1], destination: "Edit Large / natural" },
    { label: "previous", initial: seed, source: seed[2], destination: "Edit Medium / natural" },
    { label: "Add", initial: [seed[0]], source: seed[0], destination: "Add variant" },
  ])("Remove restores $label after detachment", async ({ initial, source, destination }) => {
    const owner = await mountOwner(framework, { initial })
    await openList()
    const target = page().getByRole("button", { name: destination, exact: true })
    const { editor, content, trigger } = await openEditor(`Edit ${source.name}`)
    await closeAfterExit(editor, () => click(content.getByRole("button", { name: "Remove variant", exact: true })), target)
    expect(trigger.isConnected).toBe(false)
    expect(owner.value.map((variant) => variant.id)).toEqual(initial.filter((variant) => variant.id !== source.id).map((variant) => variant.id))
    expect(owner.changes).toHaveBeenCalledTimes(1)
    expect(owner.outerSubmits).not.toHaveBeenCalled()
  })

  test("a controlled owner can decline Save and Remove without optimistic values or lost focus", async () => {
    const owner = await mountOwner(framework, { initial: seed.slice(0, 2), accept: false })
    let current = await openEditor("Edit Small / natural")
    await change(current.input, "Rejected rename")
    await closeAfterExit(current.editor, () => click(current.content.getByRole("button", { name: "Save variant", exact: true })), current.trigger)
    expect(owner.changes.mock.calls[0]?.[0]).toEqual([{ id: "small", name: "Rejected rename" }, seed[1]])
    expect(owner.value).toEqual(seed.slice(0, 2))
    current = await openEditor("Edit Small / natural")
    expect(current.input.value).toBe("Small / natural")
    await closeAfterExit(current.editor, () => click(current.content.getByRole("button", { name: "Remove variant", exact: true })), current.trigger)
    expect(owner.changes.mock.calls[1]?.[0]).toEqual([seed[1]])
    expect(owner.value).toEqual(seed.slice(0, 2))
    expect(current.trigger.isConnected).toBe(true)
  })

  test("a viewport rerender preserves the open input, draft and selection", async () => {
    const owner = await mountOwner(framework)
    const { editor, input } = await openEditor()
    await change(input, "Long natural finish")
    input.setSelectionRange(5, 12)
    await interact(() => owner.setWide(true))
    expect(nameInput(editor)).toBe(input)
    expect(input.value).toBe("Long natural finish")
    expect([input.selectionStart, input.selectionEnd]).toEqual([5, 12])
    expect(document.activeElement).toBe(input)
    expect(owner.changes).not.toHaveBeenCalled()
  })

  test("closing does not steal focus deliberately moved outside during exit", async () => {
    await mountOwner(framework)
    const product = page().getByRole("textbox", { name: "Product name", exact: true })
    const { editor, content } = await openEditor()
    await click(content.getByRole("button", { name: "Cancel", exact: true }))
    expect(editor.isConnected).toBe(true)
    await advance(50)
    await interact(() => product.focus())
    expect(document.activeElement).toBe(product)
    await advance(350)
    await advance(0)
    expect(editor.isConnected).toBe(false)
    expect(document.activeElement).toBe(product)
  })

  test("the real FormScreen keeps parent data across Page/Dialog and the nested Save does not submit it", async () => {
    const owner = await mountOwner(framework, { presentation: true })
    await change(page().getByRole("textbox", { name: "Product name", exact: true }), "Cedar table")
    let current = await openEditor()
    await change(current.input, "Small / walnut")
    await closeAfterExit(current.editor, () => click(current.content.getByRole("button", { name: "Save variant", exact: true })), current.trigger)
    await closeList()
    await interact(() => owner.setPresentation(true, "plain"))
    await settle()
    const parent = page().getByRole("dialog", { name: "Edit product", exact: true })
    expect(within(parent).getByRole("textbox", { name: "Product name", exact: true })).toHaveProperty("value", "Cedar table")
    current = await openEditor("Edit Small / walnut")
    await change(current.input, "Small / dark walnut")
    await closeAfterExit(current.editor, () => click(current.content.getByRole("button", { name: "Save variant", exact: true })), current.trigger)
    await closeList()
    expect(parent.isConnected).toBe(true)
    expect(page().getByRole("dialog", { name: "Edit product", exact: true })).toBe(parent)
    expect(within(parent).getByRole("button", { name: "Variants: Small / dark walnut", exact: true })).toBeTruthy()
    await interact(() => owner.setPresentation(false))
    await settle()
    expect(parent.isConnected).toBe(false)
    const restoredPage = page().getByRole("region", { name: "Edit product", exact: true })
    expect(within(restoredPage).getByRole("textbox", { name: "Product name", exact: true })).toHaveProperty("value", "Cedar table")
    expect(within(restoredPage).getByRole("button", { name: "Variants: Small / dark walnut", exact: true })).toBeTruthy()
    expect(restoredPage.getAttribute("data-surface")).toBe("plain")
    expect(document.querySelectorAll('input[aria-label="Product name"]')).toHaveLength(1)
  })
})
