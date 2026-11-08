import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { SegmentedComposer as ReactComposer } from "../../components/docs/SegmentedComposer"
import { SegmentedComposer as VueComposer } from "../../components/docs/vue/SegmentedComposer"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

vi.mock("@plexui/ui/components/Button", async () => import("../../packages/ui/src/components/Button"))
vi.mock("@plexui/vue/components/Button", async () => import("../../packages/vue/src/components/Button"))
vi.mock("@plexui/ui/components/DatePicker", async () => import("../../packages/ui/src/components/DatePicker"))
vi.mock("@plexui/vue/components/DatePicker", async () => import("../../packages/vue/src/components/DatePicker"))
vi.mock("@plexui/ui/components/Dialog", async () => import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => import("../../packages/vue/src/components/Dialog"))
vi.mock("@plexui/ui/components/Field", async () => import("../../packages/ui/src/components/Field"))
vi.mock("@plexui/vue/components/Field", async () => import("../../packages/vue/src/components/Field"))
vi.mock("@plexui/ui/components/FieldGroup", async () => import("../../packages/ui/src/components/FieldGroup"))
vi.mock("@plexui/vue/components/FieldGroup", async () => import("../../packages/vue/src/components/FieldGroup"))
vi.mock("@plexui/ui/components/Input", async () => import("../../packages/ui/src/components/Input"))
vi.mock("@plexui/vue/components/Input", async () => import("../../packages/vue/src/components/Input"))
vi.mock("@plexui/ui/components/SegmentedControl", async () => import("../../packages/ui/src/components/SegmentedControl"))
vi.mock("@plexui/vue/components/SegmentedControl", async () => import("../../packages/vue/src/components/SegmentedControl"))
vi.mock("@plexui/ui/components/Switch", async () => import("../../packages/ui/src/components/Switch"))
vi.mock("@plexui/vue/components/Switch", async () => import("../../packages/vue/src/components/Switch"))
vi.mock("@plexui/ui/components/Textarea", async () => import("../../packages/ui/src/components/Textarea"))
vi.mock("@plexui/vue/components/Textarea", async () => import("../../packages/vue/src/components/Textarea"))

// Exercise current source and native form submission, including a header button
// outside its linked form. Geometry stays in the browser acceptance pass.
type Framework = "React" | "Vue"
const page = () => within(document.body)
const dialog = () => page().getByRole("dialog", { name: "New calendar item" })
// On a phone the sheet's bar draws Close; the dialog's own Close stays in the DOM under it, hidden by the style
// sheet (as under a custom top Toolbar), which this environment does not load
const barClose = () => within(dialog().querySelector<HTMLElement>("[data-dialog-bar]")!).getByRole("button", { name: "Close dialog" })
const click = async (node: HTMLElement) => interact(() => { fireEvent.click(node) })
const type = async (name: string, value: string) => interact(() => {
  const control = within(dialog()).getByRole("textbox", { name })
  fireEvent.input(control, { target: { value } })
  fireEvent.change(control, { target: { value } })
})
const titleValue = (name: string) => {
  const input = within(dialog()).getByRole("textbox", { name })
  if (!(input instanceof HTMLInputElement)) throw new Error("Title must remain one native input")
  return input.value
}
const select = async (mode: "Event" | "Reminder") => {
  await click(within(dialog()).getByRole("radio", { name: mode, exact: true }))
  expect(within(dialog()).getByRole("radio", { name: mode, exact: true }).getAttribute("aria-checked")).toBe("true")
}
const mount = async (framework: Framework, pinnedOpen = false) => {
  const state = reactive<{ surface: "plain" | "grouped" }>({ surface: "grouped" })
  let update: (surface: "plain" | "grouped") => void
  if (framework === "React") {
    const result = render(<ReactComposer pinnedOpen={pinnedOpen} surface={state.surface} />)
    update = (surface) => result.rerender(<ReactComposer pinnedOpen={pinnedOpen} surface={surface} />)
  } else {
    mountVue(() => h(VueComposer, { pinnedOpen, surface: state.surface }))
    update = (surface) => { state.surface = surface }
  }
  await flushVue()
  return update
}
const open = async () => {
  const trigger = page().getByRole("button", { name: "Create item" })
  await click(trigger)
  await page().findByRole("dialog", { name: "New calendar item" })
  return trigger
}
const closeAndWait = async (close: () => Promise<void>, trigger: HTMLElement) => {
  const previous = dialog()
  await close()
  // Role absence alone also happens during inert exit, before focus restoration.
  await waitFor(() => expect(previous.isConnected).toBe(false))
  await waitFor(() => expect(document.activeElement).toBe(trigger))
}

beforeEach(() => {
  document.documentElement.style.setProperty("--breakpoint-md", "768px")
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: !media.includes("min-width"), media,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  }))
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { vi.unstubAllGlobals() })

describe.each<Framework>(["React", "Vue"])("%s segmented composer", (framework) => {
  test("switches actual content, keeps independent drafts and prevents empty confirmation", async () => {
    await act(async () => { await mount(framework) })
    await open()
    expect(within(dialog()).getByRole("button", { name: "Save event" }).hasAttribute("disabled")).toBe(true)
    await type("Event title", "Team planning")
    await type("Location", "Meeting room")
    await select("Reminder")
    expect(titleValue("Reminder title")).toBe("")
    expect(within(dialog()).getByText("Mark this reminder as urgent to set an alarm.")).toBeTruthy()
    expect(within(dialog()).queryByRole("textbox", { name: "Location" })).toBeNull()
    await type("Reminder title", "Bring notes")
    await click(within(dialog()).getByRole("switch", { name: "Urgent" }))
    await click(within(dialog()).getByRole("switch", { name: "Time", exact: true }))
    await select("Event")
    expect(titleValue("Event title")).toBe("Team planning")
    expect(titleValue("Location")).toBe("Meeting room")
    expect(within(dialog()).queryByRole("switch", { name: "Urgent" })).toBeNull()
    await select("Reminder")
    expect(titleValue("Reminder title")).toBe("Bring notes")
    expect(within(dialog()).getByRole("switch", { name: "Urgent" }).getAttribute("aria-checked")).toBe("true")
    expect(within(dialog()).getByRole("switch", { name: "Time", exact: true }).getAttribute("aria-checked")).toBe("false")
  })

  test("plan 19h: the event shows its day and hours in one row; a reminder's values sit under their titles", async () => {
    await act(async () => { await mount(framework) })
    await open()
    const summary = within(dialog()).getByRole("button", { name: "Event date and time" })
    expect(summary.querySelector('[data-date-part="date"]')?.textContent).toBe("Thu, Nov 12, 2026")
    expect(summary.querySelector('[data-date-part="time"]')?.textContent).toBe("09:00 – 10:00")
    expect(within(dialog()).getByRole("textbox", { name: "Event title" }).getAttribute("placeholder")).toBe("Title")
    await select("Reminder")
    // The whole Date row is the calendar's trigger, named by its title and its value.
    expect(within(dialog()).getByRole("button", { name: "Date Thu, Nov 12, 2026" })).toBeTruthy()
    const time = within(dialog()).getByRole("switch", { name: "Time", exact: true })
    expect(document.getElementById(time.getAttribute("aria-describedby") ?? "")?.textContent).toBe("09:00")
    await click(time)
    expect(time.hasAttribute("aria-describedby")).toBe(false)
    expect(within(dialog()).queryByText("09:00")).toBeNull()
  })

  test("header Save submits its form once, commits only the selected mode and restores trigger focus", async () => {
    await act(async () => { await mount(framework) })
    const trigger = await open()
    await type("Event title", "  Saved event  ")
    await select("Reminder")
    await type("Reminder title", "Uncommitted reminder")
    await select("Event")
    const save = within(dialog()).getByRole("button", { name: "Save event" })
    const formId = save.getAttribute("form")
    expect(formId).toBeTruthy()
    expect(document.getElementById(formId ?? "")?.tagName).toBe("FORM")
    expect(dialog().querySelectorAll("form")).toHaveLength(1)
    await closeAndWait(() => click(save), trigger)
    expect(page().getByRole("status").textContent).toBe("Event saved: Saved event.")
    await open()
    expect(titleValue("Event title")).toBe("Saved event")
    await select("Reminder")
    expect(titleValue("Reminder title")).toBe("")
  })

  test.each(["Close", "Escape"])("%s discards edits without changing the committed value", async (method) => {
    await act(async () => { await mount(framework) })
    const trigger = await open()
    await type("Event title", "Committed")
    await closeAndWait(() => click(within(dialog()).getByRole("button", { name: "Save event" })), trigger)
    await open()
    await type("Event title", "Discard this")
    await select("Reminder")
    await type("Reminder title", "Discard this too")
    await closeAndWait(() => method === "Close"
      ? click(barClose())
      : interact(() => { fireEvent.keyDown(dialog(), { key: "Escape" }) }), trigger)
    await open()
    expect(titleValue("Reminder title")).toBe("")
    await select("Event")
    expect(titleValue("Event title")).toBe("Committed")
  })

  test("the existing segmented radio keyboard model switches the editable body", async () => {
    await act(async () => { await mount(framework) })
    await open()
    const event = within(dialog()).getByRole("radio", { name: "Event", exact: true })
    await interact(() => { event.focus(); fireEvent.keyDown(event, { key: "ArrowRight" }) })
    const reminder = within(dialog()).getByRole("radio", { name: "Reminder", exact: true })
    await waitFor(() => expect(document.activeElement).toBe(reminder))
    expect(event.getAttribute("aria-checked")).toBe("true")
    // Shared Tabs uses manual activation. JSDOM needs the native keyboard click.
    await interact(() => {
      fireEvent.keyDown(reminder, { key: "Enter" })
      fireEvent.click(reminder, { detail: 0 })
      fireEvent.keyUp(reminder, { key: "Enter" })
    })
    await waitFor(() => expect(within(dialog()).getByRole("radio", { name: "Reminder", exact: true }).getAttribute("aria-checked")).toBe("true"))
    expect(titleValue("Reminder title")).toBe("")
    expect(within(dialog()).queryByRole("textbox", { name: "Location" })).toBeNull()
  })

  test("pinned Phone inspection keeps one form and current input through surface changes, Save and Cancel", async () => {
    const outside = document.createElement("button")
    document.body.append(outside)
    outside.focus()
    let update: ((surface: "plain" | "grouped") => void) | undefined
    await act(async () => { update = await mount(framework, true) })
    await page().findByRole("dialog", { name: "New calendar item" })
    expect(document.activeElement?.tagName).not.toBe("INPUT")
    await type("Event title", "Phone draft")
    const before = within(dialog()).getByRole("textbox", { name: "Event title" })
    await interact(() => { update?.("plain") })
    expect(within(dialog()).getByRole("textbox", { name: "Event title" })).toBe(before)
    expect(titleValue("Event title")).toBe("Phone draft")
    await click(within(dialog()).getByRole("button", { name: "Save event" }))
    expect(dialog().querySelectorAll("form")).toHaveLength(1)
    expect(within(dialog()).getByRole("status").textContent).toBe("Event saved: Phone draft.")
    await type("Event title", "Unsaved edit")
    await click(barClose())
    expect(titleValue("Event title")).toBe("Phone draft")
    expect(within(dialog()).getByRole("status").textContent).toBe("Changes canceled.")
  })
})
