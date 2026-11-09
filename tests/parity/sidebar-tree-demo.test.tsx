import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { ref } from "vue"
import { SidebarActionTreeDemo, SidebarFilteredTreeDemo } from "../../components/docs/SidebarDemos"
import { VueSidebarActionTreeDemo, VueSidebarDemo } from "../../components/docs/vue/VueSidebarDemos"
import { flushVue } from "./harness"

const viewport = vi.hoisted(() => ({ mobile: true }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => !viewport.mobile }))
vi.mock("@plexui/vue/composables/useBreakpoints", () => ({ useBreakpoint: () => ref(!viewport.mobile) }))
vi.mock("@plexui/ui/components/Sidebar", async () => await import("../../packages/ui/src/components/Sidebar"))
vi.mock("@plexui/vue/components/Sidebar", async () => await import("../../packages/vue/src/components/Sidebar"))
vi.mock("@plexui/ui/components/Page", async () => await import("../../packages/ui/src/components/Page"))
vi.mock("@plexui/vue/components/Page", async () => await import("../../packages/vue/src/components/Page"))
vi.mock("../../components/docs/VuePreview", async () => ({
  VuePreview: (await import("../../components/docs/VuePreviewRuntime")).default,
}))

// The exact copyable Vue template, mounted through the real preview state bridge.
const mdx = readFileSync("content/vue/components/sidebar.mdx", "utf8")
const prefix = "export const searchAndFilter = "
const start = mdx.indexOf(prefix) + prefix.length
const expression = mdx.slice(start, mdx.indexOf("export const ", start)).trim()
const searchTemplate: unknown = new Function(`return ${expression}`)()
if (typeof searchTemplate !== "string") throw new Error("Missing Sidebar Search and Filter template")

beforeEach(() => {
  viewport.mobile = true
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(max-width: 767px)" && viewport.mobile,
    addEventListener: () => {}, removeEventListener: () => {},
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const interact = async (callback: () => void) => { await act(async () => { callback(); await flushVue() }) }
type Example = "search" | "actions"
function example(framework: string, kind: Example) {
  if (framework === "React") return kind === "search" ? <SidebarFilteredTreeDemo /> : <SidebarActionTreeDemo />
  if (kind === "actions") return <VueSidebarActionTreeDemo />
  return <VueSidebarDemo template={searchTemplate as string}
    state={{ bordered: true, search: "", typeFilters: [], activeStep: "start", expanded: { "gov-id": true, "selfie-check": true, "doc-check": true, fail: true } }}
    controls={[{ name: "expand", type: "select", options: ["row", "chevron"], default: "chevron" }]} />
}

async function mountExample(framework: string, kind: Example) {
  const view = render(example(framework, kind))
  await interact(() => {})
  if (viewport.mobile) {
    const trigger = view.container.querySelector<HTMLButtonElement>('main [aria-label="Open menu"]')
    if (!trigger) throw new Error("Missing page menu trigger")
    await interact(() => fireEvent.click(trigger))
  }
  return view
}

function controlledList(button: HTMLElement) {
  const id = button.getAttribute("aria-controls")
  const list = id ? document.getElementById(id) : null
  if (!list) throw new Error("Disclosure is not linked to its own submenu")
  return list
}

// jsdom does not perform a browser's native keyboard-to-click default action.
// Assert native button semantics, then deliver its resulting keyboard click.
async function keyboardActivate(button: HTMLButtonElement, key: "Enter" | " ") {
  expect(button.tagName).toBe("BUTTON")
  expect(button.tabIndex).toBe(0)
  expect(button.disabled).toBe(false)
  const expanded = button.getAttribute("aria-expanded")
  await interact(() => {
    button.focus()
    fireEvent.keyDown(button, { key })
    fireEvent.keyUp(button, { key })
  })
  expect(button.getAttribute("aria-expanded")).toBe(expanded)
  await interact(() => fireEvent.click(button, { detail: 0 }))
}

describe.each(["React", "Vue"])("%s Sidebar tree examples", (framework) => {
  test.each(["search", "actions"] as const)("%s exposes a separate, named disclosure with independent selection and keyboard activation", async (kind) => {
    const view = await mountExample(framework, kind)
    const page = within(view.container)
    const label = kind === "search" ? "ID verification" : "Screen"
    const disclosure = page.getByRole<HTMLButtonElement>("button", { name: `Collapse ${label}` })
    const select = page.getByRole<HTMLButtonElement>("button", { name: label })
    const list = controlledList(disclosure)
    expect(disclosure.parentElement).toBe(select.parentElement)
    expect(select.contains(disclosure)).toBe(false)
    expect(view.container.querySelector("button button")).toBeNull()
    expect(view.container.querySelector('[role="none"][tabindex]')).toBeNull()
    expect(list.hasAttribute("inert")).toBe(false)
    await keyboardActivate(disclosure, "Enter")
    expect(disclosure.getAttribute("aria-expanded")).toBe("false")
    expect(list.hasAttribute("inert")).toBe(true)
    expect(document.activeElement).toBe(disclosure)
    expect(view.container.querySelector('[role="dialog"]')?.hasAttribute("inert")).toBe(false)
    await interact(() => fireEvent.click(select))
    expect(select.getAttribute("data-active")).toBe("true")
    expect(disclosure.getAttribute("aria-expanded")).toBe("false")
    await keyboardActivate(disclosure, " ")
    expect(disclosure.getAttribute("aria-expanded")).toBe("true")
    expect(list.hasAttribute("inert")).toBe(false)
    expect(select.getAttribute("data-active")).toBe("true")
    // A cancelled touch press does not invoke a pointer-down-only disclosure.
    await interact(() => {
      fireEvent.pointerDown(disclosure, { pointerId: 4, pointerType: "touch" })
      fireEvent.pointerCancel(disclosure, { pointerId: 4, pointerType: "touch" })
    })
    expect(disclosure.getAttribute("aria-expanded")).toBe("true")
  })

  test("Search and Filter row mode uses one native disclosure button and restores separate controls when switched back", async () => {
    const view = await mountExample(framework, "search")
    const page = within(view.container)
    const rowOption = page.getByText("row", { exact: true }).closest("button")
    if (!rowOption) throw new Error("Missing expand mode control")
    await interact(() => fireEvent.click(rowOption))
    expect(page.queryByRole("button", { name: "Collapse ID verification" })).toBeNull()
    const row = page.getByRole<HTMLButtonElement>("button", { name: "ID verification" })
    const list = controlledList(row)
    expect(row.getAttribute("aria-expanded")).toBe("true")
    await keyboardActivate(row, " ")
    expect(list.hasAttribute("inert")).toBe(true)
    const chevronOption = page.getByText("chevron", { exact: true }).closest("button")
    if (!chevronOption) throw new Error("Missing chevron mode control")
    await interact(() => fireEvent.click(chevronOption))
    expect(page.getByRole("button", { name: "Expand ID verification" }).getAttribute("aria-expanded")).toBe("false")
  })

  test("Action Tree nested disclosure keeps selection and the Add menu independently reachable", async () => {
    const view = await mountExample(framework, "actions")
    const page = within(view.container)
    const disclosure = page.getByRole<HTMLButtonElement>("button", { name: "Collapse Container 1" })
    const select = page.getByRole<HTMLButtonElement>("button", { name: "Container 1" })
    const add = page.getByRole<HTMLButtonElement>("button", { name: "Add to Container 1" })
    expect(select.contains(add)).toBe(false)
    expect(select.contains(disclosure)).toBe(false)
    const list = controlledList(disclosure)
    await keyboardActivate(disclosure, "Enter")
    expect(list.hasAttribute("inert")).toBe(true)
    await interact(() => fireEvent.click(select))
    expect(select.getAttribute("data-active")).toBe("true")
    expect(list.hasAttribute("inert")).toBe(true)
    await interact(() => fireEvent.click(add, { detail: 0 }))
    expect(within(document.body).getByRole("menu")).toBeTruthy()
    expect(list.hasAttribute("inert")).toBe(true)
  })

  test.each(["search", "actions"] as const)("%s repeated desktop examples keep unique disclosure targets", async (kind) => {
    viewport.mobile = false
    const view = render(<>{example(framework, kind)}{example(framework, kind)}</>)
    await interact(() => {})
    const label = kind === "search" ? "ID verification" : "Screen"
    const buttons = within(view.container).getAllByRole("button", { name: `Collapse ${label}` })
    expect(buttons).toHaveLength(2)
    expect(buttons[0].getAttribute("aria-controls")).not.toBe(buttons[1].getAttribute("aria-controls"))
    expect(controlledList(buttons[0])).not.toBe(controlledList(buttons[1]))
    expect(view.container.querySelector("button button")).toBeNull()
  })
})
