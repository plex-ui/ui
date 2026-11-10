import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { VueFormExampleDemo } from "../../components/docs/vue/VueFormExamplesDemos"
import { VueDemo, type VueDemoControl } from "../../components/docs/vue/VueDemo"
import { FloatingLabelInsideBillingFormDemo } from "../../components/docs/FloatingLabelInputDemos"
import { flushVue } from "./harness"

// Vitest removes CSS-module scoping for parity snapshots. This suite does not
// mount PreviewEmbed: its .Root filter must not hide FloatingLabelInput.Root.
vi.mock("../../components/docs/PreviewEmbed.module.css", () => ({ default: { Root: "PreviewEmbedRoot" } }))

const viewport = vi.hoisted(() => ({ width: 767 }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => viewport.width >= 768 }))
// Exercise the real Vue state bridge; only skip Next's browser-only lazy loader.
vi.mock("../../components/docs/VuePreview", async () => ({
  VuePreview: (await import("../../components/docs/VuePreviewRuntime")).default,
}))

const mdx = readFileSync("content/vue/components/settings-forms.mdx", "utf8")
const expression = mdx.slice(mdx.indexOf("export const rowChoice = ") + "export const rowChoice = ".length, mdx.indexOf("export const rowProduct = ")).trim()
const choiceTemplate: unknown = new Function("formScreen", `return ${expression}`)((_title: string, fields: string) => `<section>${fields}</section>`)
if (typeof choiceTemplate !== "string") throw new Error("Choice in rows template was not resolved")
const template = `<Field label="Name"><Input v-model:value="name" /></Field>${choiceTemplate}`

function resolveBillingExample() {
  const read = (name: string, next: string): string => {
    const marker = `export const ${name} = `
    return mdx.slice(mdx.indexOf(marker) + marker.length, mdx.indexOf(`export const ${next} = `)).trim()
  }
  const formScreen: unknown = new Function(`return ${read("formScreen", "formScreenCode")}`)()
  const desktop: unknown = new Function(`return ${read("billingDesktop", "formScreen")}`)()
  const declarations = mdx.slice(mdx.indexOf("export const billingMobile = "), mdx.indexOf("export const rowInputs = ")).replaceAll("export const ", "const ")
  const result: unknown = new Function("formScreen", "billingDesktop", `${declarations}; return { template: billing, control: billingTypeControl };`)(formScreen, desktop)
  if (!result || typeof result !== "object" || !("template" in result) || typeof result.template !== "string" || !("control" in result)) {
    throw new Error("Billing example was not resolved")
  }
  const control = result.control
  if (!control || typeof control !== "object" || !("name" in control) || typeof control.name !== "string" || !("label" in control) || typeof control.label !== "string" || !("type" in control) || control.type !== "select" || !("default" in control) || typeof control.default !== "string" || !("options" in control) || !Array.isArray(control.options)) {
    throw new Error("Billing type control was not resolved")
  }
  const options = control.options.map((option: unknown) => {
    if (!option || typeof option !== "object" || !("value" in option) || typeof option.value !== "string" || !("label" in option) || typeof option.label !== "string") {
      throw new Error("Billing type option was not resolved")
    }
    return { value: option.value, label: option.label }
  })
  const typeControl: VueDemoControl = { name: control.name, label: control.label, type: "select", default: control.default, options }
  return { template: result.template, controls: [typeControl] }
}
const billingExample = resolveBillingExample()

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); viewport.width = 767; vi.unstubAllGlobals() })

const interact = async (action: () => void) => {
  await act(async () => { action(); await flushVue() })
}

describe("Vue form live viewport context", () => {
  test("767 → 768 → 767 preserves edited fields, plan and preferences while switching control roles", async () => {
    const example = () => <VueFormExampleDemo template={template} state={{
      name: "Original name", plan: "team", signIns: true, invoices: true, news: false,
    }} />
    const view = render(example())
    const page = within(view.container)
    const name = page.getByRole("textbox", { name: "Name" })
    const row = (control: HTMLElement) => {
      const field = control.closest<HTMLElement>("[data-row]")
      if (!field) throw new Error("Missing choice row")
      return field
    }
    await interact(() => {
      fireEvent.input(name, { target: { value: "Edited name" } })
      fireEvent.click(row(page.getByRole("radio", { name: "Business" })))
      fireEvent.click(row(page.getByRole("switch", { name: "New sign-ins" })))
      fireEvent.click(row(page.getByRole("switch", { name: "Product news" })))
    })
    for (const width of [768, 767]) {
      await interact(() => { viewport.width = width; view.rerender(example()) })
      const role = width >= 768 ? "checkbox" : "switch"
      expect(page.getByRole("textbox", { name: "Name" })).toBe(name)
      expect(name).toHaveProperty("value", "Edited name")
      expect(page.getByRole("radio", { name: "Business" }).getAttribute("aria-checked")).toBe("true")
      expect(page.getByRole(role, { name: "New sign-ins" }).getAttribute("aria-checked")).toBe("false")
      expect(page.getByRole(role, { name: "Invoices" }).getAttribute("aria-checked")).toBe("true")
      expect(page.getByRole(role, { name: "Product news" }).getAttribute("aria-checked")).toBe("true")
      expect(page.queryByRole(role === "switch" ? "checkbox" : "switch", { name: "New sign-ins" })).toBeNull()
    }
  })

  test("live host context updates without resetting local values or bidirectional demo controls", async () => {
    const form = (locale: string) => <VueDemo
      template={'<p data-locale>{{ locale }}</p><Input v-model:value="name" aria-label="Name" /><Switch v-model:checked="enabled" aria-label="Form enabled" />'}
      state={{ name: "Original name", locale: "initial-only" }}
      context={{ locale }}
      controls={[{ name: "enabled", type: "boolean", default: false }]}
    />
    const view = render(form("en"))
    const page = within(view.container)
    const name = page.getByRole("textbox", { name: "Name" })
    await interact(() => {
      fireEvent.input(name, { target: { value: "Edited name" } })
      fireEvent.click(page.getByRole("switch", { name: "enabled", exact: true }))
    })
    expect(page.getByRole("switch", { name: "Form enabled" }).getAttribute("aria-checked")).toBe("true")
    await interact(() => view.rerender(form("fr")))
    expect(view.container.querySelector("[data-locale]")?.textContent).toBe("fr")
    expect(page.getByRole("textbox", { name: "Name" })).toBe(name)
    expect(name).toHaveProperty("value", "Edited name")
    expect(page.getByRole("switch", { name: "enabled", exact: true }).getAttribute("aria-checked")).toBe("true")
    await interact(() => fireEvent.click(page.getByRole("switch", { name: "Form enabled" })))
    expect(page.getByRole("switch", { name: "enabled", exact: true }).getAttribute("aria-checked")).toBe("false")
  })
})


describe.each(["React", "Vue"])("%s Billing desktop field types", (framework) => {
  test("switching shape preserves all edited fields and country, including a Phone round trip", async () => {
    viewport.width = 1024
    const example = () => framework === "React" ? <FloatingLabelInsideBillingFormDemo /> : <VueFormExampleDemo
      template={billingExample.template}
      controls={billingExample.controls}
      phoneControls={[]}
      state={{ inputType: "inside-rounded", country: "es", billingValues: { email: "", name: "", address1: "", address2: "", postalCode: "", city: "" } }}
    />
    const view = render(example())
    await interact(() => {})
    const page = within(document.body)
    const values = [
      ["Billing email", "ada@plexui.com"], ["Full name", "Ada Lovelace"],
      ["Address line 1", "12 Example Street"], ["Address line 2", "Floor 2"],
      ["Postal code", "28001"], ["City", "Madrid"],
    ] as const
    const fields = values.map(([label]) => page.getByRole("textbox", { name: label, exact: true }))
    for (const [index, [, value]] of values.entries()) {
      await interact(() => {
        fireEvent.input(fields[index], { target: { value } })
        fireEvent.change(fields[index], { target: { value } })
      })
    }
    const press = async (element: HTMLElement) => {
      await interact(() => {
        fireEvent.pointerDown(element, { button: 0, pointerType: "mouse", pointerId: 1 })
        fireEvent.mouseDown(element, { button: 0 })
      })
      await interact(() => {
        fireEvent.pointerUp(element, { button: 0, pointerType: "mouse", pointerId: 1 })
        fireEvent.mouseUp(element, { button: 0 })
        fireEvent.click(element, { button: 0, detail: 1 })
      })
    }
    await press(page.getByRole("button", { name: /Country or region/ }))
    await press(await page.findByRole("option", { name: "France", exact: true }))

    for (const [label, placement, pill] of [
      ["Border pill", null, true], ["Border rounded", null, false], ["Inside rounded", "inside", false],
    ] as const) {
      await interact(() => fireEvent.click(page.getByRole("radio", { name: label, exact: true })))
      for (const [index, [fieldLabel, value]] of values.entries()) {
        const field = page.getByRole("textbox", { name: fieldLabel, exact: true })
        expect(field).toBe(fields[index])
        expect(field).toHaveProperty("value", value)
        const surface = field.closest(".FieldFootprint")?.parentElement
        expect(surface?.getAttribute("data-label-placement")).toBe(placement)
        expect(surface?.hasAttribute("data-pill")).toBe(pill)
      }
      const country = page.getByRole("button", { name: /Country or region France/ })
      expect(country.parentElement?.getAttribute("data-label-placement")).toBe(placement)
      expect(country.parentElement?.hasAttribute("data-pill")).toBe(pill)
      expect(page.getByRole("button", { name: "Save", exact: true }).hasAttribute("data-pill")).toBe(pill)
    }
    await interact(() => fireEvent.click(page.getByRole("radio", { name: "Border pill", exact: true })))
    for (const width of [767, 1024]) {
      await interact(() => { viewport.width = width; view.rerender(example()) })
      for (const [label, value] of values) expect(page.getByRole("textbox", { name: label, exact: true })).toHaveProperty("value", value)
      expect(page.getByText("France", { exact: true })).toBeTruthy()
      if (width < 768) expect(page.queryByRole("radiogroup", { name: "type" })).toBeNull()
      else expect(page.getByRole("radio", { name: "Border pill", exact: true }).getAttribute("aria-checked")).toBe("true")
    }
  })
})
