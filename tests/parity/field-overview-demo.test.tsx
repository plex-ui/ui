import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { FieldOverviewDemo } from "../../components/docs/FieldDemos"
import { VueDemo, type VueDemoControl } from "../../components/docs/vue/VueDemo"
import { flushVue } from "./harness"

vi.mock("../../components/docs/VuePreview", async () => ({
  VuePreview: (await import("../../components/docs/VuePreviewRuntime")).default,
}))

// Row 33 (16.11): Label action, Sizing and Optical alignment were examples of one field; they are settings of the
// Overview. The Vue demo mounts the page's own desktop template and controls.
const mdx = readFileSync("content/vue/components/field.mdx", "utf8")
const read = (name: string): unknown => {
  const prefix = `export const ${name} = `
  const start = mdx.indexOf(prefix) + prefix.length
  const end = mdx.slice(start).search(/\nexport const |\n<UsageBlock>|\n## /)
  return new Function(`return ${mdx.slice(start, start + end).trim()}`)()
}
const template = read("overview") as string
const controls = read("overviewControls") as VueDemoControl[]

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  // A desktop viewport: min-width queries match, max-width ones do not
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: !query.includes("max-width"), addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const interact = async (callback: () => void) => { await act(async () => { callback(); await flushVue() }) }

describe.each(["React", "Vue"])("%s Field Overview", (framework) => {
  test("carries labelAction, size, pill and opticallyAlign, each where it acts", async () => {
    const view = render(framework === "React" ? <FieldOverviewDemo /> : <VueDemo template={template} controls={controls} stageClassName="py-10" />)
    await interact(() => {})
    const page = within(view.container)
    const stage = () => view.container.querySelector<HTMLElement>("[data-demo-stage]")!
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole("switch", { name, exact: true })))
    const layout = (option: string) => interact(() => fireEvent.click(within(page.getByRole("radiogroup", { name: "layout" })).getByRole("radio", { name: option, exact: true })))
    expect(page.getByRole("button", { name: /^size/ })).toBeTruthy()

    await toggle("labelAction")
    expect(within(stage()).getByRole("link", { name: "Use phone instead" })).toBeTruthy()
    await toggle("opticallyAlign")
    expect(stage().querySelectorAll('[data-optically-align="start"]').length).toBeGreaterThanOrEqual(2)
    await toggle("pill")
    expect(stage().querySelector("input")?.closest("[data-pill]")).not.toBeNull()

    // A row field holds its value at the row's end, a pill of its own: no label action, pill or optical alignment there
    await layout("end")
    expect(page.queryByRole("switch", { name: "pill", exact: true })).toBeNull()
    expect(page.queryByRole("switch", { name: "labelAction", exact: true })).toBeNull()
    expect(page.queryByRole("switch", { name: "opticallyAlign", exact: true })).toBeNull()
    expect(within(stage()).queryByRole("link", { name: "Use phone instead" })).toBeNull()
    expect(stage().querySelector('[data-optically-align="start"]')).toBeNull()
  })
})
