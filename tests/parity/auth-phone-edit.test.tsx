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
  ])("Edit validates and applies a phone draft; on a phone Back retains the saved number, a desktop has no Back ($wide/$dialog)", async ({ wide, dialog }) => {
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
    await enter(phone(), "5551112222")
    if (wide) {
      // Row 116: a desktop has no Back buttons (owner 05.11): none stands beside Continue, which applies the
      // number and returns to the password.
      // The phone's top bar stays in the DOM, hidden by CSS from 768px (jsdom applies none of it).
      const form = page.getByRole<HTMLButtonElement>("button", { name: "Continue", exact: true }).form!
      expect(within(form).queryByRole("button", { name: /back/i })).toBeNull()
      // Plan 177, owner 10.11 ("поле страны сломано"): the desktop country field is the Log in (phone) trigger, a
      // 52px floating-input pill with the flag, not the default 48px Select control; the number shows its dial code.
      const country = within(form).getByRole("button", { name: "United States (+1)", exact: true })
      expect(country.getAttribute("aria-expanded")).toBe("false")
      expect(country.style.height).toBe("3.25rem")
      expect(country.style.borderRadius).toBe("var(--floating-input-border-radius)")
      expect(form.querySelector("[data-slot='select-control']")).toBeNull()
      expect(within(form).getByText("+1", { exact: true })).toBeTruthy()
      await submit()
      await waitFor(() => expect(phone().readOnly).toBe(true))
      expect(phone().value).toBe("+1 555 111 2222")
      return
    }
    await click(page.getByRole("button", { name: "Back to password", exact: true }))
    expect(direction()).toBe("back")
    await waitFor(() => expect(phone().readOnly).toBe(true))
    expect(phone().value).toBe("+1 555 987 6543")
  })

  test.each([false, true])("the Edit country list keeps its 360px minimum only on a desktop (wide %s)", async (wide) => {
    // Plan 177, Codex 10.11: on a 320px phone a 360px list ran past the screen; the phone list follows its row.
    viewport.wide = wide
    if (framework === "React") render(<FloatingLabelInputPasswordFormDemo />)
    else {
      const initial = expression("passwordState", "password")
      if (!initial || typeof initial !== "object") throw new Error("Expected password state")
      const state = reactive({ ...formExamplesScope, ...initial, wide, dialog: false, phonePreview: false, phoneHost: false, surface: "grouped" })
      mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template: passwordTemplate })))
      await flushVue()
    }
    const page = within(document.body)
    await interact(() => fireEvent.click(page.getByRole("button", { name: "Edit", exact: true })))
    const country = wide
      ? page.getByRole("button", { name: "United States (+1)", exact: true })
      : document.querySelector<HTMLElement>("[aria-label='Country']")!
    await interact(() => {
      fireEvent.pointerDown(country, { button: 0, pointerType: "mouse" })
      fireEvent.click(country, { button: 0, detail: 1 })
    })
    const list = await waitFor(() => {
      const element = document.querySelector<HTMLElement>("[style*='--select-list-min-width'], [role='listbox']")
      if (!element) throw new Error("The country list did not open")
      return element.closest<HTMLElement>("[style*='--select-list']") ?? element
    })
    expect(list.style.getPropertyValue("--select-list-min-width")).toBe(wide ? "360px" : "")
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
