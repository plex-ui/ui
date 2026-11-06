import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive } from "vue"
import { FormRowsActionsDemo } from "../../components/docs/FormRowsDemos"
import { formExamplesScope } from "../../components/docs/vue/VueFormExamplesDemos"
import { vueComponents } from "../../components/docs/vue/registry"
import { flushVue, mountVue } from "./harness"

vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => false }))
vi.mock("@plexui/ui/components/Dialog", async () => await import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => await import("../../packages/vue/src/components/Dialog"))

// Compile the very template the Vue docs render, rather than a test-only copy.
const mdx = readFileSync("content/vue/components/form-examples.mdx", "utf8")
const actionExpression = mdx.slice(mdx.indexOf("export const rowActions = ") + "export const rowActions = ".length, mdx.indexOf("export const rowErrors = ")).trim()
const template = new Function("formScreen", `return ${actionExpression}`)((_title: string, fields: string) => `<component :is="FormScreen" title="Account settings" v-model:dialog="dialog">${fields}</component>`)
if (typeof template !== "string") throw new Error("Account actions template was not resolved")

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function mountAccount(framework: string) {
  const state = reactive({ ...formExamplesScope, wide: false, dialog: false, accountEmail: "jane@example.com", accountEmailDraft: "", accountPasswordDraft: "", accountPasswordDescription: "Last changed in March.", accountPanel: "", accountDeleted: false, accountTrigger: null })
  if (framework === "React") render(<FormRowsActionsDemo />)
  else {
    mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template })))
    await flushVue()
  }
  return state
}
const interact = async (action: () => void) => act(async () => { action(); await flushVue() })
const enter = async (input: HTMLElement, value: string) => interact(() => {
  fireEvent.input(input, { target: { value } })
  fireEvent.change(input, { target: { value } })
})

describe.each(["React", "Vue"])("%s mobile account actions", (framework) => {
  test("opens an editor from the whole row, updates the sample, and requires confirmation before removal", async () => {
    await mountAccount(framework)
    const page = within(document.body)
    const click = async (element: HTMLElement) => {
      await act(async () => { fireEvent.click(element); await flushVue() })
    }
    expect(page.queryByRole("button", { name: "Change", exact: true })).toBeNull()
    expect(page.queryByRole("button", { name: "Reset", exact: true })).toBeNull()
    await click(page.getByRole("button", { name: "Email jane@example.com" }))
    const editor = await page.findByRole("dialog", { name: "Email" })
    const input = within(editor).getByRole("textbox", { name: "Email" })
    await act(async () => {
      fireEvent.input(input, { target: { value: "updated@example.com" } })
      fireEvent.change(input, { target: { value: "updated@example.com" } })
      await flushVue()
    })
    await click(within(editor).getByRole("button", { name: "Save", exact: true }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Email" })).toBeNull())
    expect(document.activeElement).toBe(page.getByRole("button", { name: "Email updated@example.com" }))

    await click(page.getByRole("button", { name: "Delete account", exact: true }))
    const confirmation = await page.findByRole("dialog", { name: "Delete sample account?" })
    await click(within(confirmation).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Delete sample account?" })).toBeNull())
    expect(page.getByRole("button", { name: "Email updated@example.com" })).toBeTruthy()
    await click(page.getByRole("button", { name: "Delete account", exact: true }))
    const secondConfirmation = await page.findByRole("dialog", { name: "Delete sample account?" })
    await click(within(secondConfirmation).getByRole("button", { name: "Delete account", exact: true }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Delete sample account?" })).toBeNull())
    expect(page.queryByRole("button", { name: "Email updated@example.com" })).toBeNull()
    const empty = page.getByText("No sample account").closest('[data-fill="static"]')
    expect(empty?.getAttribute("data-size")).toBeNull()
    expect(empty?.closest('[data-form-content-fill="true"]')).not.toBeNull()
    expect(page.getByRole("button", { name: "Restore sample account" }).getAttribute("data-size")).toBe("xl")
    await click(page.getByRole("button", { name: "Restore sample account" }))
    expect(page.getByRole("button", { name: "Email jane@example.com" })).toBeTruthy()
    expect(document.querySelector("[data-form-content-fill]")).toBeNull()
  })
  test.each([false, true])("single-field editors keep drafts, names and their parent surface (dialog=%s)", async (dialog) => {
    const state = await mountAccount(framework)
    const page = within(document.body)
    const click = async (element: HTMLElement) => interact(() => fireEvent.click(element))
    if (dialog) await interact(() => {
      if (framework === "React") fireEvent.click(page.getByRole("switch", { name: "dialog", exact: true }))
      else state.dialog = true
    })
    const parent = dialog ? await page.findByRole("dialog", { name: "Account settings" }) : null
    await click(page.getByRole("button", { name: "Email jane@example.com" }))
    let editor = await page.findByRole("dialog", { name: "Email", exact: true })
    if (parent) {
      // Equal-z-index portalled sheets paint in document order. The editor must follow its parent.
      expect(parent.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    let input = within(editor).getByRole<HTMLInputElement>("textbox", { name: "Email", exact: true })
    expect(input.placeholder).toBe("Email address")
    expect(input.value).toBe("jane@example.com")
    expect(input.labels?.[0]?.classList.contains("sr-only")).toBe(true)
    await enter(input, "discard@example.com")
    await click(within(editor).getByRole("button", { name: "Cancel", exact: true }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Email", exact: true })).toBeNull())
    await click(page.getByRole("button", { name: "Email jane@example.com" }))
    editor = await page.findByRole("dialog", { name: "Email", exact: true })
    input = within(editor).getByRole<HTMLInputElement>("textbox", { name: "Email", exact: true })
    expect(input.value).toBe("jane@example.com")
    await enter(input, "saved@example.com")
    await click(within(editor).getByRole("button", { name: "Save", exact: true }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Email", exact: true })).toBeNull())
    expect(document.activeElement).toBe(page.getByRole("button", { name: "Email saved@example.com" }))
    if (parent) expect(page.getByRole("dialog", { name: "Account settings" })).toBe(parent)

    await click(page.getByRole("button", { name: "Password Last changed in March." }))
    editor = await page.findByRole("dialog", { name: "Password", exact: true })
    const password = within(editor).getByLabelText<HTMLInputElement>("New password", { exact: true })
    expect(password.value).toBe("")
    expect(password.placeholder).toBe("New password")
    expect(password.type).toBe("password")
    expect(password.minLength).toBe(8)
    expect(password.required).toBe(true)
    expect(password.labels?.[0]?.classList.contains("sr-only")).toBe(true)
    await enter(password, "SamplePassword9")
    await click(within(editor).getByRole("button", { name: "Save", exact: true }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Password", exact: true })).toBeNull())
    if (parent) expect(page.getByRole("dialog", { name: "Account settings" })).toBe(parent)
    const passwordRow = page.getByRole("button", { name: "Password Updated in this preview." })
    expect(document.activeElement).toBe(passwordRow)
    await click(passwordRow)
    editor = await page.findByRole("dialog", { name: "Password", exact: true })
    expect(within(editor).getByLabelText<HTMLInputElement>("New password", { exact: true }).value).toBe("")
  })
})
