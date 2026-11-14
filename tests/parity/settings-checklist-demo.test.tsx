import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { SettingsChecklistDemo as ReactSettingsChecklistDemo } from "../../components/docs/SettingsChecklistDemo"
import { SettingsChecklistDemo as VueSettingsChecklistDemo } from "../../components/docs/vue/SettingsChecklistDemo"
import { animation, flushVue, mountVue } from "./harness"

// Exercise current component source even before the next docs/dist build.
vi.mock("@plexui/ui/components/Button", async () => import("../../packages/ui/src/components/Button"))
vi.mock("@plexui/vue/components/Button", async () => import("../../packages/vue/src/components/Button"))
vi.mock("@plexui/ui/components/Checkbox", async () => import("../../packages/ui/src/components/Checkbox"))
vi.mock("@plexui/vue/components/Checkbox", async () => import("../../packages/vue/src/components/Checkbox"))
vi.mock("@plexui/ui/components/Field", async () => import("../../packages/ui/src/components/Field"))
vi.mock("@plexui/vue/components/Field", async () => import("../../packages/vue/src/components/Field"))
vi.mock("@plexui/ui/components/Page", async () => import("../../packages/ui/src/components/Page"))
vi.mock("@plexui/vue/components/Page", async () => import("../../packages/vue/src/components/Page"))
vi.mock("@plexui/ui/components/Dialog", async () => import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => import("../../packages/vue/src/components/Dialog"))
vi.mock("@plexui/ui/components/Transition", async () => import("../../packages/ui/src/components/Transition"))
vi.mock("@plexui/vue/components/Transition", async () => import("../../packages/vue/src/components/Transition"))
vi.mock("@plexui/ui/components/Menu", async () => import("../../packages/ui/src/components/Menu"))
vi.mock("@plexui/vue/components/Menu", async () => import("../../packages/vue/src/components/Menu"))
vi.mock("@plexui/ui/components/RadioGroup", async () => import("../../packages/ui/src/components/RadioGroup"))
vi.mock("@plexui/vue/components/RadioGroup", async () => import("../../packages/vue/src/components/RadioGroup"))
vi.mock("@plexui/ui/components/Toolbar", async () => import("../../packages/ui/src/components/Toolbar"))
vi.mock("@plexui/vue/components/Toolbar", async () => import("../../packages/vue/src/components/Toolbar"))

const viewport = vi.hoisted(() => ({ wide: true, vue: undefined as { value: boolean } | undefined }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => viewport.wide }))
vi.mock("@plexui/vue/composables/useBreakpoints", async () => {
  const { ref } = await import("vue")
  viewport.vue = ref(true)
  return { useBreakpoint: () => viewport.vue }
})

type Framework = "React" | "Vue"

beforeEach(() => {
  viewport.wide = true
  if (viewport.vue) viewport.vue.value = true
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { vi.unstubAllGlobals() })

const click = async (element: HTMLElement) => {
  await act(async () => { element.click(); await flushVue() })
}

// Selection pages are a phone pattern: from 768px up a row opens a checkbox Menu instead.
const usePhone = () => {
  viewport.wide = false
  if (viewport.vue) viewport.vue.value = false
}

const press = async (target: HTMLElement) => {
  await act(async () => {
    fireEvent.pointerDown(target, { button: 0, pointerType: "mouse", pointerId: 1 })
    fireEvent.mouseDown(target, { button: 0 })
    await flushVue()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await act(async () => {
    fireEvent.pointerUp(target, { button: 0, pointerType: "mouse", pointerId: 1 })
    fireEvent.mouseUp(target, { button: 0 })
    fireEvent.click(target, { button: 0, detail: 1 })
    await flushVue()
  })
}

const mountDemo = async (framework: Framework, dialog = false) => {
  if (framework === "React") {
    await act(async () => { render(<ReactSettingsChecklistDemo />) })
    if (dialog) await click(within(document.body).getByRole("switch", { name: "dialog" }))
  } else {
    mountVue(() => h(VueSettingsChecklistDemo, { dialog }))
    await flushVue()
  }
  return within(document.body)
}

const pageContent = () => {
  const content = document.querySelector<HTMLElement>("[data-settings-content]")
  if (!content) throw new Error("Missing settings Page.Content")
  return content
}

const assertPageOnly = () => {
  expect(within(document.body).queryByRole("dialog", { hidden: true })).toBeNull()
  expect(document.querySelector("[data-plex-dialog]")).toBeNull()
  expect(within(document.body).queryByRole("button", { name: /^(Apply|Cancel)/ })).toBeNull()
}

describe.each<Framework>(["React", "Vue"])("%s Settings checklist pages", (framework) => {
  test("initial short and long summaries are selected names; disabled settings cannot navigate or steal focus", async () => {
    const outside = document.createElement("button")
    outside.textContent = "Outside demo"
    document.body.append(outside)
    outside.focus()
    const page = await mountDemo(framework)
    expect(document.activeElement).toBe(outside)
    const rootHeading = page.getByRole("heading", { name: "Notifications", level: 2 })
    expect(page.getByRole("group", { name: "Notifications" }).contains(rootHeading)).toBe(true)
    expect(page.queryByRole("heading", { level: 1 })).toBeNull()
    expect(page.queryByRole("button", { name: "Back to previous example" })).toBeNull()
    expect(page.getByRole("button", { name: "Delivery: Email" })).toBeTruthy()
    expect(page.getByRole("button", { name: "Security alerts: New sign-ins, Password changes, and Recovery requests" })).toBeTruthy()
    const unavailable = page.getByRole("button", { name: "Weekly digest: Unavailable" })
    expect(unavailable).toHaveProperty("disabled", true)
    await click(unavailable)
    expect(page.getByRole("heading", { name: "Notifications" })).toBeTruthy()
    expect(page.queryByRole("checkbox")).toBeNull()
    expect(document.activeElement).toBe(outside)
    assertPageOnly()
  })

  test("the whole Field row, label, checkbox and Space each toggle once without adding a second keyboard stop", async () => {
    usePhone()
    const page = await mountDemo(framework)
    await click(page.getByRole("button", { name: "Delivery: Email" }))
    const heading = page.getByRole("heading", { name: "Delivery" })
    expect(document.activeElement).toBe(heading)
    const footer = page.getByText("Choose the updates you want to receive.")
    const group = page.getByRole("group", { name: "Delivery" })
    expect(group.contains(footer)).toBe(true)
    expect(footer.closest("[data-row]")).toBeNull()
    const choice = page.getByRole("checkbox", { name: "Push notifications", exact: true })
    const row = choice.closest<HTMLElement>("[data-row]")
    if (!row) throw new Error("Missing selectable Field row")
    expect(row.hasAttribute("tabindex")).toBe(false)
    expect(choice.getAttribute("data-variant")).toBe("ghost")
    const activations = vi.fn()
    choice.addEventListener("click", activations)
    await click(row)
    expect(choice.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(choice)
    await click(page.getByText("Push notifications", { selector: "label" }))
    expect(choice.getAttribute("aria-checked")).toBe("false")
    await click(choice)
    expect(choice.getAttribute("aria-checked")).toBe("true")
    expect(activations).toHaveBeenCalledTimes(3)
    await act(async () => {
      // jsdom lacks native button Space activation; preserve the real handlers
      // and synthesize only the browser's uncancelled default click.
      const down = fireEvent.keyDown(choice, { key: " ", code: "Space" })
      const up = fireEvent.keyUp(choice, { key: " ", code: "Space" })
      if (down && up) choice.click()
      await flushVue()
    })
    expect(choice.getAttribute("aria-checked")).toBe("false")
    expect(activations).toHaveBeenCalledTimes(4)
    expect(document.activeElement).toBe(choice)
    assertPageOnly()
  })

  test("Back commits None immediately, restores the originating row and scroll, and reopening retains the empty selection", async () => {
    usePhone()
    const page = await mountDemo(framework)
    const original = page.getByRole("button", { name: "Delivery: Email" })
    const focus = vi.spyOn(HTMLElement.prototype, "focus")
    pageContent().scrollTop = 137
    await click(original)
    expect(pageContent().scrollTop).toBe(0)
    await click(page.getByRole("checkbox", { name: "Email", exact: true }))
    expect(page.getAllByRole("checkbox", { checked: false })).toHaveLength(3)
    // Row 87: on a Page both screens show Back, so the bar keeps it in place instead of passing a copy across.
    expect(page.getByRole("button", { name: "Back to notifications" }).closest("[data-demo-navigation-same]")).not.toBeNull()
    await click(page.getByRole("button", { name: "Back to notifications" }))
    const returned = page.getByRole("button", { name: "Delivery: None" })
    await waitFor(() => expect(document.activeElement).toBe(returned))
    await waitFor(() => expect(original.isConnected).toBe(false))
    expect(pageContent().scrollTop).toBe(137)
    const restore = focus.mock.contexts.findIndex((element) => element === returned)
    expect(restore).toBeGreaterThanOrEqual(0)
    expect(focus.mock.calls[restore]).toEqual([{ preventScroll: true }])
    await click(returned)
    expect(page.getAllByRole("checkbox", { checked: false })).toHaveLength(3)
    expect(document.activeElement).toBe(page.getByRole("heading", { name: "Delivery" }))
    assertPageOnly()
  })

  test("animated Dialog returns focus and scroll to the originating setting after its content commits", async () => {
    // Keep the production transition path: its children update in a later commit.
    animation.disabled = false
    usePhone()
    const page = await mountDemo(framework, true)
    const dialog = page.getByRole("dialog", { name: "Notifications" })
    expect(within(dialog).getAllByRole("button", { name: "Close dialog" })).toHaveLength(1)
    expect(within(dialog).getAllByRole("heading", { name: "Notifications" })).toHaveLength(1)
    const original = within(dialog).getByRole("button", { name: "Delivery: Email" })
    const focus = vi.spyOn(HTMLElement.prototype, "focus")
    pageContent().scrollTop = 137
    await click(original)
    expect(page.getByRole("dialog", { name: "Delivery" })).toBe(dialog)
    expect(within(dialog).queryByRole("button", { name: "Close dialog" })).toBeNull()
    expect(within(dialog).getAllByRole("button", { name: "Back to notifications" })).toHaveLength(1)
    // Close on the first screen and Back on the second change places: the bar is not kept.
    expect(dialog.querySelector("[data-demo-navigation-same]")).toBeNull()
    expect(pageContent().scrollTop).toBe(0)
    expect(document.activeElement).toBe(dialog.querySelector("[data-settings-title]"))

    const email = within(dialog).getByRole("checkbox", { name: "Email", exact: true })
    await act(async () => { email.focus(); await flushVue() })
    await click(email)
    expect(email.getAttribute("aria-checked")).toBe("false")
    expect(document.activeElement).toBe(email)
    await click(within(dialog).getByRole("button", { name: "Back to notifications" }))

    const returned = within(dialog).getByRole("button", { name: "Delivery: None" })
    await waitFor(() => expect(document.activeElement).toBe(returned))
    expect(page.getByRole("dialog", { name: "Notifications" })).toBe(dialog)
    expect(within(dialog).getAllByRole("button", { name: "Close dialog" })).toHaveLength(1)
    expect(within(dialog).queryByRole("button", { name: "Back to notifications" })).toBeNull()
    await waitFor(() => expect(original.isConnected).toBe(false))
    expect(pageContent().scrollTop).toBe(137)
    const restore = focus.mock.contexts.findIndex((element) => element === returned)
    expect(restore).toBeGreaterThanOrEqual(0)
    expect(focus.mock.calls[restore]).toEqual([{ preventScroll: true }])

    await click(returned)
    expect(within(dialog).getAllByRole("checkbox", { checked: false })).toHaveLength(3)
    expect(document.activeElement).toBe(dialog.querySelector("[data-settings-title]"))
    expect(page.getAllByRole("dialog")).toEqual([dialog])
  })

  test("Phone keeps its root Back, while viewport changes preserve the current selection page and choices", async () => {
    const react = framework === "React" ? render(<ReactSettingsChecklistDemo />) : undefined
    if (framework === "Vue") mountVue(() => h(VueSettingsChecklistDemo))
    await flushVue()
    const page = within(document.body)
    const resize = async (wide: boolean) => {
      await act(async () => {
        viewport.wide = wide
        if (viewport.vue) viewport.vue.value = wide
        react?.rerender(<ReactSettingsChecklistDemo />)
        await flushVue()
      })
    }
    expect(page.queryByRole("button", { name: "Back to previous example" })).toBeNull()
    await resize(false)
    expect(page.getByRole("button", { name: "Back to previous example" })).toBeTruthy()
    expect(page.getByRole("heading", { name: "Notifications", level: 1 })).toBeTruthy()
    expect(page.queryByRole("heading", { name: "Notifications", level: 2 })).toBeNull()
    await click(page.getByRole("button", { name: "Delivery: Email" }))
    await click(page.getByRole("checkbox", { name: "Push notifications", exact: true }))
    // From 768px up the root shows the committed choice; its row opens a Menu, not a page.
    await resize(true)
    expect(page.queryByRole("checkbox")).toBeNull()
    expect(page.queryByRole("button", { name: "Back to notifications" })).toBeNull()
    expect(page.getByRole("heading", { name: "Notifications", level: 2 })).toBeTruthy()
    expect(page.getByRole("button", { name: "Delivery: Email and Push notifications" }).getAttribute("aria-haspopup")).toBe("menu")
    expect(page.queryByRole("button", { name: "Back to previous example" })).toBeNull()
    // Back on a phone the selection page is where the person left it.
    await resize(false)
    expect(page.getByRole("button", { name: "Back to notifications" })).toBeTruthy()
    expect(page.getByRole("checkbox", { name: "Push notifications", exact: true }).getAttribute("aria-checked")).toBe("true")
    await click(page.getByRole("button", { name: "Back to notifications" }))
    expect(page.getByRole("button", { name: "Back to previous example" })).toBeTruthy()
    expect(page.getByRole("button", { name: "Delivery: Email and Push notifications" })).toBeTruthy()
  })

  test("from 768px up a row opens a checkbox Menu that stays open and updates the row summary", async () => {
    const page = await mountDemo(framework)
    await press(page.getByRole("button", { name: "Delivery: Email" }))
    const menu = await waitFor(() => page.getByRole("menu"))
    expect(within(menu).getAllByRole("menuitemcheckbox").map((item) => [item.textContent?.trim(), item.getAttribute("aria-checked")])).toEqual([
      ["Email", "true"], ["Push notifications", "false"], ["In-app inbox", "false"],
    ])
    await press(within(menu).getByRole("menuitemcheckbox", { name: "Push notifications" }))
    expect(page.getByRole("menu")).toBe(menu)
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Push notifications" }).getAttribute("aria-checked")).toBe("true")
    expect(page.getByRole("button", { name: "Delivery: Email and Push notifications" })).toBeTruthy()
    expect(page.queryByRole("button", { name: "Back to notifications" })).toBeNull()
    assertPageOnly()
  })

  test("one choice: its page checks one row and stays open, as Settings does; from 768px up a radio Menu", async () => {
    usePhone()
    const page = await mountDemo(framework)
    await click(page.getByRole("button", { name: "Show previews: Always" }))
    const group = await waitFor(() => page.getByRole("radiogroup", { name: "Show previews" }))
    expect(within(group).getAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"))).toEqual(["true", "false", "false"])
    await click(within(group).getByRole("radio", { name: "When Unlocked" }))
    // The checkmark moves and the page stays (Settings › Camera › Record Sound).
    expect(page.getByRole("radiogroup", { name: "Show previews" })).toBeTruthy()
    expect(within(page.getByRole("radiogroup", { name: "Show previews" })).getByRole("radio", { name: "When Unlocked" }).getAttribute("aria-checked")).toBe("true")
    await click(page.getByRole("button", { name: "Back to notifications" }))
    await waitFor(() => expect(page.getByRole("button", { name: "Show previews: When Unlocked" })).toBeTruthy())
  })

  test("from 768px up the one-choice row opens a radio Menu and the row shows the pick", async () => {
    const page = await mountDemo(framework)
    await press(page.getByRole("button", { name: "Show previews: Always" }))
    const menu = await waitFor(() => page.getByRole("menu"))
    expect(within(menu).getAllByRole("menuitemradio").map((item) => [item.textContent?.trim(), item.getAttribute("aria-checked")])).toEqual([
      ["Always", "true"], ["When Unlocked", "false"], ["Never", "false"],
    ])
    await press(within(menu).getByRole("menuitemradio", { name: "Never" }))
    await waitFor(() => expect(page.getByRole("button", { name: "Show previews: Never" })).toBeTruthy())
  })

  test("rapid push and pop keeps only the destination accessible while departing screens finish", async () => {
    animation.disabled = false
    viewport.wide = false
    if (viewport.vue) viewport.vue.value = false
    const page = await mountDemo(framework)
    pageContent().scrollTop = 137
    await click(page.getByRole("button", { name: "Delivery: Email" }))
    expect(page.getAllByRole("heading", { name: "Delivery" })).toHaveLength(1)
    expect(page.queryByRole("button", { name: "Delivery: Email" })).toBeNull()
    expect(page.getAllByRole("checkbox")).toHaveLength(3)
    const departing = document.querySelector('[data-transition-id="settings-content"][data-exiting]')
    expect(departing?.getAttribute("aria-hidden")).toBe("true")
    expect(departing?.hasAttribute("inert")).toBe(true)

    await click(page.getByRole("checkbox", { name: "Push notifications", exact: true }))
    // Return before the previous screen has finished exiting.
    await click(page.getByRole("button", { name: "Back to notifications" }))
    const returned = page.getByRole("button", { name: "Delivery: Email and Push notifications" })
    await waitFor(() => expect(document.activeElement).toBe(returned))
    expect(pageContent().scrollTop).toBe(137)
    expect(page.queryByRole("checkbox")).toBeNull()
    expect(page.getAllByRole("heading", { name: "Notifications" })).toHaveLength(1)
    await waitFor(() => expect(document.querySelectorAll('[data-transition-id="settings-content"]')).toHaveLength(1))

    await click(returned)
    expect(page.getByRole("checkbox", { name: "Push notifications", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(page.getByRole("heading", { name: "Delivery" }))
    assertPageOnly()
  })

  test("each setting retains its own selection and summary uses option order after deselecting and reselecting", async () => {
    usePhone()
    const page = await mountDemo(framework)
    await click(page.getByRole("button", { name: /^Security alerts:/ }))
    await click(page.getByRole("checkbox", { name: "Password changes", exact: true }))
    await click(page.getByRole("checkbox", { name: "New devices", exact: true }))
    await click(page.getByRole("checkbox", { name: "Password changes", exact: true }))
    await click(page.getByRole("button", { name: "Back to notifications" }))
    const summary = "Security alerts: New sign-ins, Password changes, Recovery requests, and New devices"
    expect(page.getByRole("button", { name: summary })).toBeTruthy()
    await click(page.getByRole("button", { name: "Delivery: Email" }))
    await click(page.getByRole("checkbox", { name: "In-app inbox", exact: true }))
    await click(page.getByRole("button", { name: "Back to notifications" }))
    expect(page.getByRole("button", { name: "Delivery: Email and In-app inbox" })).toBeTruthy()
    await click(page.getByRole("button", { name: summary }))
    expect(page.getAllByRole("checkbox", { checked: true })).toHaveLength(4)
    expect(document.activeElement).toBe(page.getByRole("heading", { name: "Security alerts" }))
    assertPageOnly()
  })
})
