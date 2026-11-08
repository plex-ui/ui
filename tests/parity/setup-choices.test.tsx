import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { SetupChoicesSheet as ReactSheet } from "../../components/docs/SetupChoicesSheet"
import { SetupChoicesSheet as VueSheet } from "../../components/docs/vue/SetupChoicesSheet"
import { setupMethods, type SetupChoicesLayout, type SetupMethod } from "../../components/docs/setupChoicesData"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

// Plan 19c: rows with a leading icon, a title, an optional subtitle and a disclosure chevron, each one button that
// opens its step in the same sheet (native IMG_5499, IMG_5517, IMG_5437).
vi.mock("@plexui/ui/components/Button", async () => import("../../packages/ui/src/components/Button"))
vi.mock("@plexui/vue/components/Button", async () => import("../../packages/vue/src/components/Button"))
vi.mock("@plexui/ui/components/Dialog", async () => import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => import("../../packages/vue/src/components/Dialog"))
vi.mock("@plexui/ui/components/FieldGroup", async () => import("../../packages/ui/src/components/FieldGroup"))
vi.mock("@plexui/vue/components/FieldGroup", async () => import("../../packages/vue/src/components/FieldGroup"))
vi.mock("@plexui/ui/components/Toolbar", async () => import("../../packages/ui/src/components/Toolbar"))
vi.mock("@plexui/vue/components/Toolbar", async () => import("../../packages/vue/src/components/Toolbar"))

type Framework = "React" | "Vue"
let wide = false

beforeEach(() => {
  wide = false
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (media: string) => ({ matches: wide && media.includes("min-width"), media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }))
})
afterEach(() => { vi.unstubAllGlobals() })

const click = async (element: HTMLElement) => interact(() => { fireEvent.click(element) })
const page = () => within(document.body)
const sheet = () => within(page().getByRole("dialog"))

const mount = async (framework: Framework, { layout = "grouped", subtitles = false }: { layout?: SetupChoicesLayout; subtitles?: boolean } = {}) => {
  const added: SetupMethod[] = []
  if (framework === "React") {
    function Host() {
      const [open, setOpen] = useState(true)
      return <ReactSheet open={open} onOpenChange={setOpen} layout={layout} subtitles={subtitles} onAdd={(method) => added.push(method)} />
    }
    await act(async () => { render(<Host />) })
  } else {
    const Host = defineComponent(() => {
      const open = ref(true)
      return () => h(VueSheet, { open: open.value, layout, subtitles, "onUpdate:open": (next: boolean) => { open.value = next }, onAdd: (method: SetupMethod) => added.push(method) })
    })
    mountVue(() => h(Host))
    await flushVue()
  }
  await page().findByRole("dialog")
  return added
}

const row = (title: string) => sheet().getByRole("button", { name: title, exact: true })

describe.each<Framework>(["React", "Vue"])("%s Setup choices sheet", (framework) => {
  test("each method is one button named by its title, in one group; the heading takes focus", async () => {
    await mount(framework)
    const group = sheet().getByRole("group", { name: "Sign-in methods" })
    const rows = within(group).getAllByRole("button")
    expect(rows.map((button) => button.textContent)).toEqual(setupMethods.map((method) => method.title))
    for (const button of rows) {
      expect(button.closest("[data-row]")).not.toBeNull()
      expect(button.hasAttribute("aria-describedby")).toBe(false)
      expect(button.querySelectorAll("svg")).toHaveLength(2)
    }
    expect(document.activeElement?.textContent).toBe("Add a Sign-In Method")
    // A phone Sheet keeps Close in its toolbar, not the dialog's own close button.
    expect(sheet().getAllByRole("button", { name: "Close dialog" })).toHaveLength(1)
  })

  test("subtitles describe their rows; separate rows are each their own group", async () => {
    await mount(framework, { layout: "separate", subtitles: true })
    expect(sheet().queryByRole("group", { name: "Sign-in methods" })).toBeNull()
    const groups = sheet().getAllByRole("group")
    expect(groups).toHaveLength(setupMethods.length)
    for (const [index, method] of setupMethods.entries()) {
      // Named by the title alone, so the subtitle is not read twice.
      const button = within(groups[index]).getByRole("button", { name: method.title, exact: true })
      const description = document.getElementById(button.getAttribute("aria-describedby") ?? "")
      expect(description?.textContent).toBe(method.subtitle)
    }
  })

  test("a row opens its step with Back and Close; Back returns focus to that row", async () => {
    await mount(framework)
    await click(row("Passkey"))
    expect(sheet().getByRole("heading", { name: "Passkey" })).toBeTruthy()
    expect(document.activeElement?.textContent).toBe("Passkey")
    expect(sheet().queryByRole("group", { name: "Sign-in methods" })).toBeNull()
    expect(sheet().getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual(["Back", "Close dialog", "Add Passkey"])
    await click(sheet().getByRole("button", { name: "Back" }))
    expect(document.activeElement).toBe(row("Passkey"))
    await click(sheet().getByRole("button", { name: "About sign-in methods" }))
    expect(sheet().getByRole("heading", { name: "About Sign-In Methods" })).toBeTruthy()
    await click(sheet().getByRole("button", { name: "Back" }))
    expect(document.activeElement).toBe(sheet().getByRole("button", { name: "About sign-in methods" }))
  })

  test("Add confirms the method and closes the sheet", async () => {
    const added = await mount(framework)
    await click(row("Email Address"))
    await click(sheet().getByRole("button", { name: "Add Email Address" }))
    expect(added.map((method) => method.id)).toEqual(["email"])
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull())
  })

  test("closed on a step, the sheet opens again on its choices", async () => {
    await mount(framework)
    await click(row("Passkey"))
    await click(sheet().getAllByRole("button", { name: "Close dialog" })[0])
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull())
    await click(page().getByRole("button", { name: "Add sign-in method" }))
    await page().findByRole("dialog")
    expect(sheet().getByRole("group", { name: "Sign-in methods" })).toBeTruthy()
    expect(document.activeElement?.textContent).toBe("Add a Sign-In Method")
  })

  test("on a wide window Back moves to the footer, also on About", async () => {
    wide = true
    await mount(framework)
    await click(row("Security Key"))
    const footer = sheet().getByRole("button", { name: "Add Security Key" }).parentElement
    if (!footer) throw new Error("No footer")
    await click(within(footer).getByRole("button", { name: "Back" }))
    expect(document.activeElement).toBe(row("Security Key"))
    await click(sheet().getByRole("button", { name: "About sign-in methods" }))
    // The toolbar Back (hidden from 768px by CSS) and the footer Back.
    expect(sheet().getAllByRole("button", { name: "Back" })).toHaveLength(2)
  })
})
