import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive } from "vue"
import { FloatingLabelInputPasswordFormDemo, FloatingLabelSelectAboutYouFormDemo } from "../../components/docs/FloatingLabelInputDemos"
import { formExamplesScope } from "../../components/docs/vue/VueFormExamplesDemos"
import { vueComponents } from "../../components/docs/vue/registry"
import { flushVue, mountVue } from "./harness"

const viewport = vi.hoisted(() => ({ wide: false }))
// Unscoped test CSS must not apply PreviewEmbed.Root to FloatingLabelInput.Root.
vi.mock("../../components/docs/PreviewEmbed.module.css", () => ({ default: { Root: "PreviewEmbedRoot" } }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => viewport.wide }))
vi.mock("@plexui/ui/components/Dialog", async () => await import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => await import("../../packages/vue/src/components/Dialog"))

const mdx = readFileSync("content/vue/components/form-examples.mdx", "utf8")
const expression = (name: string, next: string, bindings: Record<string, unknown> = {}) => {
  const start = mdx.indexOf(`export const ${name} = `) + `export const ${name} = `.length
  const source = mdx.slice(start, mdx.indexOf(`export const ${next} = `, start)).trim()
  return new Function(...Object.keys(bindings), `return ${source}`)(...Object.values(bindings)) as unknown
}
const template = (name: string, next: string, bindings: Record<string, unknown> = {}) => {
  const value = expression(name, next, bindings)
  if (typeof value !== "string") throw new Error(`Expected ${name} template`)
  return value
}
const passwordTemplate = template("password", "passwordCode")
const aboutYouFields = template("aboutYouFields", "aboutYouSubmit")
const aboutYouSubmit = template("aboutYouSubmit", "aboutYouMobile")
const aboutYouTemplate = template("aboutYouMobile", "aboutYou", { aboutYouFields, aboutYouSubmit })
const interact = async (action: () => void) => act(async () => { action(); await flushVue() })
const enter = async (input: HTMLElement, value: string) => interact(() => {
  fireEvent.input(input, { target: { value } })
  fireEvent.change(input, { target: { value } })
})
beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); viewport.wide = false; vi.unstubAllGlobals() })

describe.each(["React", "Vue"])("%s phone edit flow", (framework) => {
  test.each([
    { wide: false, dialog: false },
    { wide: false, dialog: true },
    { wide: true, dialog: false },
  ])("Edit validates and applies a phone draft; Back retains the saved number ($wide/$dialog)", async ({ wide, dialog }) => {
    viewport.wide = wide
    if (framework === "React") {
      render(<FloatingLabelInputPasswordFormDemo />)
      if (dialog) await interact(() => fireEvent.click(within(document.body).getByRole("switch", { name: "dialog" })))
    } else {
      const initial = expression("passwordState", "password")
      if (!initial || typeof initial !== "object") throw new Error("Expected password state")
      const state = reactive({ ...formExamplesScope, ...initial, wide, dialog, phonePreview: false, phoneHost: false, surface: "grouped" })
      mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template: passwordTemplate })))
      await flushVue()
    }
    const page = within(document.body)
    const click = async (element: HTMLElement) => interact(() => fireEvent.click(element))
    const phone = () => page.getByRole<HTMLInputElement>("textbox", { name: "Phone number", exact: true })
    const submit = async () => {
      const button = page.getByRole<HTMLButtonElement>("button", { name: "Continue", exact: true })
      const form = button.form
      if (!form) throw new Error("Continue must own the active form")
      await interact(() => fireEvent.submit(form))
    }
    // Row 87: Edit opens its screen as a step forward and Back returns as a step back, as the Back chevron says.
    const direction = () => document.querySelector<HTMLElement>("[data-demo-navigation-direction]")?.dataset.demoNavigationDirection
    expect(phone().readOnly).toBe(true)
    await enter(page.getByLabelText("Password", { exact: true }), "UnfinishedPassword9")
    await click(page.getByRole("button", { name: "Edit", exact: true }))
    if (!wide) expect(direction()).toBe("forward")
    // Back on both Page screens stays in place; in a sheet Close becomes Back, so that bar still crosses.
    if (!wide) expect(document.querySelector("[data-demo-navigation-same]") !== null).toBe(!dialog)
    expect(phone().readOnly).toBe(false)
    expect(phone().value).toBe("555 123 4567")
    await enter(phone(), "12")
    await submit()
    expect(page.getByRole("alert").textContent).toContain("Phone number is not valid.")
    await enter(phone(), "5559876543")
    await submit()
    await waitFor(() => expect(phone().readOnly).toBe(true))
    expect(phone().value).toBe("+1 555 987 6543")
    expect(page.getByLabelText<HTMLInputElement>("Password", { exact: true }).value).toBe("UnfinishedPassword9")
    expect(document.activeElement).toBe(page.getByRole("button", { name: "Edit", exact: true }))
    await click(page.getByRole("button", { name: "Edit", exact: true }))
    await enter(phone(), "1112223333")
    await click(page.getByRole("button", { name: wide ? "Back" : "Back to password", exact: true }))
    if (!wide) expect(direction()).toBe("back")
    await waitFor(() => expect(phone().readOnly).toBe(true))
    expect(phone().value).toBe("+1 555 987 6543")
  })

  test("Country keeps a permanent accessible name and connected error without a visible label", async () => {
    if (framework === "React") render(<FloatingLabelSelectAboutYouFormDemo />)
    else {
      const state = reactive({ ...formExamplesScope, wide: false, dialog: false, phonePreview: false, phoneHost: false, surface: "grouped", fullName: "", birthday: "", country: "", birthdayError: null, countryError: null })
      mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template: aboutYouTemplate })))
      await flushVue()
    }
    const page = within(document.body)
    // A hidden label keeps "Country" in the name, followed by the value (0.29.0).
    const country = page.getByRole("button", { name: "Country Select country", exact: true })
    expect(country.textContent).toContain("Select country")
    expect([...document.querySelectorAll("label")].filter(label => label.textContent === "Country")).toHaveLength(0)
    const button = page.getByRole<HTMLButtonElement>("button", { name: "Continue", exact: true })
    const form = button.form
    if (!form) throw new Error("Continue must own the active form")
    await interact(() => fireEvent.submit(form))
    expect(country.getAttribute("aria-invalid")).toBe("true")
    const errorId = country.getAttribute("aria-describedby")
    expect(errorId && document.getElementById(errorId)?.textContent).toContain("Please select a country.")
  })
})
