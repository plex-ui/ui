import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive } from "vue"
import { FloatingLabelSelectAboutYouFormDemo } from "../../components/docs/FloatingLabelInputDemos"
import { formExamplesScope } from "../../components/docs/vue/VueFormExamplesDemos"
import { vueComponents } from "../../components/docs/vue/registry"
import { flushVue, mountVue } from "./harness"

vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => false }))
const mdx = readFileSync("content/vue/components/form-examples.mdx", "utf8")
const screenExpression = mdx.slice(mdx.indexOf("export const formScreen = ") + "export const formScreen = ".length, mdx.indexOf("export const formScreenCode =")).trim()
const formScreen: unknown = new Function(`return ${screenExpression}`)()
const aboutDefinitions = mdx.slice(mdx.indexOf("export const aboutYouFields ="), mdx.indexOf("export const billingMobile =")).replaceAll("export const ", "const ")
// A phone screen's action sits in a bottom Toolbar, which takes the place of the footer.
const PHONE_FOOTER = '[data-toolbar][data-placement="bottom"]'
const template: unknown = new Function("formScreen", "aboutYouDesktop", `${aboutDefinitions}; return aboutYou`)(formScreen, "")
if (typeof template !== "string") throw new Error("About you template was not resolved")

beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe.each(["React", "Vue"])("%s mobile About you", (framework) => {
  test("uses filled fields and a fixed action shell, preserves values in Sheet mode, and names validation errors", async () => {
    const state = reactive({ ...formExamplesScope, wide: false, phonePreview: false, phoneHost: false, dialog: false, surface: 'grouped', fullName: "", birthday: "", country: "", birthdayError: null, countryError: null })
    if (framework === "React") render(<FloatingLabelSelectAboutYouFormDemo />)
    else {
      mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template })))
      await flushVue()
    }
    const page = within(document.body)
    expect(document.querySelector('.Page[data-surface="grouped"]')).toBeTruthy()
    expect(document.querySelector('[data-auth-fields]')).toBeTruthy()
    const hero = page.getByRole("heading", { name: "Tell us about you" })
    expect(hero.closest(".Content")).toBeTruthy()
    expect(document.querySelector('.Header [data-auth-title]')).toBeNull()
    const continueAction = page.getByRole("button", { name: "Continue", exact: true })
    expect(continueAction.closest(PHONE_FOOTER)).toBeTruthy()
    expect(continueAction).toHaveProperty("form", document.querySelector(".Content form"))
    const name = page.getByRole("textbox", { name: "Full name" })
    await act(async () => {
      fireEvent.input(name, { target: { value: "Jane Sample" } })
      fireEvent.change(name, { target: { value: "Jane Sample" } })
      await flushVue()
      fireEvent.click(page.getByRole("button", { name: "Continue", exact: true }))
      await flushVue()
    })
    expect(page.getByRole("textbox", { name: "Birthday" }).getAttribute("aria-invalid")).toBe("true")
    expect(page.getByText("Birthday is required.")).toBeTruthy()
    expect(page.getByText("Please select a country.")).toBeTruthy()
    await act(async () => {
      if (framework === "React") fireEvent.click(page.getByRole("switch", { name: "dialog" }))
      else state.dialog = true
      await flushVue()
    })
    const sheet = page.getByRole("dialog", { name: "Tell us about you" })
    expect(sheet.getAttribute("data-surface")).toBe("grouped")
    expect(document.querySelector('.Page')).toBeNull()
    expect(within(sheet).getByRole("textbox", { name: "Full name" })).toHaveProperty("value", "Jane Sample")
    expect(sheet.querySelector('.Body [data-auth-title]')?.textContent).toBe("Tell us about you")
    expect(within(sheet).getAllByRole("button", { name: "Continue", exact: true })).toHaveLength(1)
    expect(sheet.querySelector(`${PHONE_FOOTER} button`)).toHaveProperty("form", sheet.querySelector(".Body form"))
    const sheetHeading = within(sheet).getByRole("heading", { name: "Tell us about you", level: 2 })
    expect(sheetHeading.closest('[tabindex="-1"]')).toBe(document.activeElement)
  })

  // The Phone row has no visible label (0.29.0): a hidden label names the trigger together with its value.
  test("Country is named with its value, opens from its full-width trigger, and preserves selection across presentations", async () => {
    const state = reactive({ ...formExamplesScope, wide: false, phonePreview: false, phoneHost: false, dialog: false, surface: 'grouped', fullName: "", birthday: "", country: "", birthdayError: null, countryError: null })
    if (framework === "React") render(<FloatingLabelSelectAboutYouFormDemo />)
    else {
      mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template })))
      await flushVue()
    }
    const page = within(document.body)
    const press = async (element: HTMLElement) => {
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
    await press(page.getByRole("button", { name: "Continue", exact: true }))
    const country = page.getByRole("button", { name: "Country Select country" })
    expect(page.queryByText("Country", { selector: "label" })).toBeNull()
    expect(country.getAttribute("aria-invalid")).toBe("true")
    const errorId = country.getAttribute("aria-describedby")
    expect(errorId && document.getElementById(errorId)?.textContent).toBe("Please select a country.")

    // Opens again after a choice, and the second choice keeps the same trigger.
    for (let pass = 0; pass < 2; pass += 1) {
      await press(country)
      await waitFor(() => expect(country.getAttribute("aria-expanded")).toBe("true"))
      expect(page.getAllByRole("listbox")).toHaveLength(1)
      const search = page.getByPlaceholderText("Search countries...")
      await act(async () => {
        fireEvent.input(search, { target: { value: "Spain" } })
        fireEvent.change(search, { target: { value: "Spain" } })
        await flushVue()
      })
      await press(await page.findByRole("option", { name: "Spain", exact: true }))
      await waitFor(() => expect(country.getAttribute("aria-expanded")).toBe("false"))
      await waitFor(() => expect(page.queryByRole("listbox")).toBeNull())
      expect(page.getByRole("button", { name: /^Country Spain/ })).toBe(country)
      expect(country.textContent).toContain("Spain")
      expect(country.getAttribute("aria-invalid")).not.toBe("true")
      expect(page.queryByText("Please select a country.")).toBeNull()
    }

    await act(async () => {
      if (framework === "React") fireEvent.click(page.getByRole("radio", { name: "Plain" }))
      else state.surface = "plain"
      await flushVue()
    })
    expect(page.getByRole("button", { name: /^Country Spain/ })).toBe(country)
    for (const dialog of [true, false]) {
      await act(async () => {
        if (framework === "React") fireEvent.click(page.getByRole("switch", { name: "dialog", hidden: true }))
        else state.dialog = dialog
        await flushVue()
      })
      // Leaving the Sheet ends its exit before the page comes back, so wait for the trigger.
      const selected = await page.findByRole("button", { name: /^Country Spain/ })
      expect(selected.getAttribute("aria-invalid")).not.toBe("true")
    }
  })
})
