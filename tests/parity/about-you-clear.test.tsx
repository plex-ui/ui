import { readFileSync } from "node:fs"
import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive } from "vue"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Select as VSelect } from "../../packages/vue/src/components/Select"
import { FloatingLabelSelect as RFloatingLabelSelect } from "../../packages/ui/src/components/FloatingLabelSelect"
import { FloatingLabelSelect as VFloatingLabelSelect } from "../../packages/vue/src/components/FloatingLabelSelect"
import { FloatingLabelSelectAboutYouFormDemo } from "../../components/docs/FloatingLabelInputDemos"
import { formExamplesScope } from "../../components/docs/vue/VueFormExamplesDemos"
import { vueComponents } from "../../components/docs/vue/registry"
import { flushVue, mountVue } from "./harness"

// Docs imports resolve package exports to dist; exercise the same current source
// SelectControl as the primitive cases, before the next root-owned package build.
vi.mock("@plexui/ui/components/Select", async () => import("../../packages/ui/src/components/Select"))
vi.mock("@plexui/vue/components/Select", async () => import("../../packages/vue/src/components/Select"))
// Non-scoped parity CSS aliases PreviewEmbed.Root and FloatingLabelSelect.Root.
// These demos mount directly, so the embed-only child filter must not run.
vi.mock("../../components/docs/PreviewEmbed.module.css", () => ({ default: { Root: "PreviewEmbedRoot" } }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => false }))
const mdx = readFileSync("content/vue/components/form-examples.mdx", "utf8")
const screenExpression = mdx.slice(mdx.indexOf("export const formScreen = ") + "export const formScreen = ".length, mdx.indexOf("export const formScreenCode =")).trim()
const formScreen: unknown = new Function(`return ${screenExpression}`)()
const definitions = mdx.slice(mdx.indexOf("export const aboutYouFields ="), mdx.indexOf("export const billingMobile =")).replaceAll("export const ", "const ")
const template: unknown = new Function("formScreen", "aboutYouDesktop", `${definitions}; return aboutYou`)(formScreen, "")
if (typeof template !== "string") throw new Error("About you template was not resolved")
const countries = [{ value: "af", label: "Afghanistan" }, { value: "es", label: "Spain" }]
type Country = typeof countries[number]
const page = () => within(document.body)
const interact = async (callback: () => void) => act(async () => { callback(); await flushVue() })
beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => vi.unstubAllGlobals())

async function clearWith(button: HTMLElement, keyboard: boolean) {
  await interact(() => {
    button.focus()
    if (keyboard) {
      fireEvent.keyDown(button, { key: "Enter" })
      // jsdom does not synthesize the browser's native button click from Enter.
      fireEvent.click(button, { detail: 0 })
    } else {
      fireEvent.pointerDown(button, { pointerType: "touch", button: 0, pointerId: 1 })
      fireEvent.pointerUp(button, { pointerType: "touch", button: 0, pointerId: 1 })
      fireEvent.click(button, { detail: 1, button: 0 })
    }
  })
}

for (const framework of ["React", "Vue"] as const) describe(`${framework} Country clearing`, () => {
  test.each([false, true])("Select emits the empty option once, keeps focus and stays closed, keyboard=%s", async (keyboard) => {
    const changes: Country[] = []
    const focusedAtChange: boolean[] = []
    const state = reactive({ value: "af" })
    const changed = (option: Country) => {
      focusedAtChange.push(document.activeElement?.getAttribute("aria-label") === "Country")
      changes.push(option)
    }
    function App() {
      const [value, setValue] = useState("af")
      return <RSelect aria-label="Country" value={value} options={countries} clearable placeholder="Select country" onChange={(option) => { changed(option); setValue(option.value) }} />
    }
    if (framework === "React") render(<App />)
    else mountVue(() => h(VSelect, { "aria-label": "Country", value: state.value, options: countries, clearable: true, placeholder: "Select country", onChange: (option: Country) => { changed(option); state.value = option.value } }))
    await interact(() => {})
    const trigger = page().getByRole("button", { name: "Country", exact: true })
    await clearWith(page().getByRole("button", { name: "Clear current value" }), keyboard)
    expect(changes).toEqual([{ value: "", label: "" }])
    expect(focusedAtChange).toEqual([true])
    expect(document.activeElement).toBe(trigger)
    expect(trigger.textContent).toContain("Select country")
    expect(page().queryByRole("button", { name: "Clear current value" })).toBeNull()
    expect(page().queryByRole("listbox")).toBeNull()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  test("default Select's existing clear contract closes an open menu", async () => {
    const state = reactive({ value: "af" })
    const changed = vi.fn()
    function App() {
      const [value, setValue] = useState("af")
      return <RSelect aria-label="Country" value={value} options={countries} clearable onChange={(option) => { changed(option); setValue(option.value) }} />
    }
    if (framework === "React") render(<App />)
    else mountVue(() => h(VSelect, { "aria-label": "Country", value: state.value, options: countries, clearable: true, onChange: (option: Country) => { changed(option); state.value = option.value } }))
    await interact(() => {})
    const trigger = page().getByRole("button", { name: "Country", exact: true })
    await interact(() => fireEvent.click(trigger))
    await page().findByRole("listbox")
    await interact(() => fireEvent.click(page().getByRole("button", { name: "Clear current value" }), { detail: 0 }))
    await waitFor(() => expect(page().queryByRole("listbox")).toBeNull())
    expect(changed).toHaveBeenCalledTimes(1)
    expect(changed).toHaveBeenLastCalledWith({ value: "", label: "" })
    expect(document.activeElement).toBe(trigger)
  })

  test.each([false, true])("FloatingLabelSelect keeps owner-controlled open=%s and focuses before clearing", async (open) => {
    const state = reactive({ value: "Afghanistan" })
    const interactions = vi.fn()
    const cleared = vi.fn()
    const beforeClear = () => {
      expect(document.activeElement?.getAttribute("aria-haspopup")).toBe("listbox")
      cleared()
    }
    function App() {
      const [value, setValue] = useState("Afghanistan")
      return <RFloatingLabelSelect label="Country" selected={!!value} open={open} onInteract={interactions} onClearClick={() => { beforeClear(); setValue("") }}>{value}</RFloatingLabelSelect>
    }
    if (framework === "React") render(<App />)
    else mountVue(() => h(VFloatingLabelSelect, { label: "Country", selected: !!state.value, open, onInteract: interactions, onClearClick: () => { beforeClear(); state.value = "" } }, { default: () => state.value }))
    await interact(() => {})
    const field = document.querySelector('[role="button"][aria-haspopup="listbox"]')
    await clearWith(page().getByRole("button", { name: "Clear selection" }), true)
    expect(cleared).toHaveBeenCalledOnce()
    expect(interactions).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(field)
    expect(field?.getAttribute("aria-expanded")).toBe(String(open))
    expect(page().queryByRole("button", { name: "Clear selection" })).toBeNull()
  })

  test.each([false, true])("About you clears Afghanistan and requires Country on the next pinned submit, Sheet=%s", async (dialog) => {
    const state = reactive({ ...formExamplesScope, wide: false, phonePreview: false, phoneHost: false, dialog, surface: "grouped", fullName: "", birthday: "", country: "", birthdayError: null, countryError: null })
    if (framework === "React") render(<FloatingLabelSelectAboutYouFormDemo />)
    else mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template })))
    await interact(() => {})
    if (framework === "React" && dialog) await interact(() => fireEvent.click(page().getByRole("switch", { name: "dialog" })))
    // A hidden label names the trigger together with its value (0.29.0).
    const trigger = page().getByRole("button", { name: "Country Select country", exact: true })
    await interact(() => fireEvent.click(trigger))
    const option = await page().findByRole("option", { name: "Afghanistan", exact: true })
    await interact(() => fireEvent.click(option))
    await waitFor(() => expect(page().queryByRole("listbox")).toBeNull())
    expect(trigger.textContent).toContain("Afghanistan")
    await clearWith(page().getByRole("button", { name: "Clear current value" }), false)
    expect(document.activeElement).toBe(trigger)
    expect(trigger.textContent).toContain("Select country")
    expect(page().queryByRole("listbox")).toBeNull()
    await interact(() => fireEvent.click(page().getByRole("button", { name: "Continue", exact: true })))
    expect(trigger.getAttribute("aria-invalid")).toBe("true")
    const errorId = trigger.getAttribute("aria-describedby")
    expect(errorId && document.getElementById(errorId)?.textContent).toBe("Please select a country.")
  })
})
