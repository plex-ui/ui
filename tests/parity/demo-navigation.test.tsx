import { readFileSync } from "node:fs"
import { fireEvent, within } from "@testing-library/react"
import postcss from "postcss"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h } from "vue"
import { DemoNavigationView as RNavigation } from "../../components/docs/DemoNavigation"
import { DemoNavigationView as VNavigation } from "../../components/docs/vue/DemoNavigation"
import { hideExitingDemoScreen, showEnteringDemoScreen, type DemoNavigation } from "../../components/docs/demoNavigationMotion"
import { animation } from "./harness"
import { interact, walkPairWithState } from "./pair"

// Exercise the host against current transition source, independently of dist.
vi.mock("@plexui/ui/components/Transition", async () => import("../../packages/ui/src/components/Transition"))
vi.mock("@plexui/vue/components/Transition", async () => import("../../packages/vue/src/components/Transition"))

let reduced = false
beforeEach(() => {
  animation.disabled = false
  reduced = false
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced && query === "(prefers-reduced-motion: reduce)" }))
})
afterEach(() => vi.unstubAllGlobals())

type ScreenState = DemoNavigation & {
  screen: "password" | "edit"
  value: string
  formId: string
  dir: "ltr" | "rtl"
}
const initial: ScreenState = { step: 0, direction: "forward", screen: "password", value: "draft-A", formId: "flow-form", dir: "ltr" }
const submissions: string[] = []
const titleOf = (screen: ScreenState["screen"]) => screen === "password" ? "Password" : "Edit phone"
const actionOf = (screen: ScreenState["screen"]) => screen === "password" ? "Close" : "Back"
const fieldsId = (step: number) => `entry-field-${step}`
const RFields = ({ label, value, fieldId }: { label: string; value: string; fieldId: string }) =>
  <label htmlFor={fieldId}>{label}<input id={fieldId} value={value} readOnly /></label>
const VFields = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, required: true }, fieldId: { type: String, required: true } },
  setup(props) {
    return () => h("label", { for: props.fieldId }, [props.label, h("input", { id: props.fieldId, value: props.value, readOnly: true })])
  },
})

function reactScreen(state: ScreenState) {
  const navigation = { step: state.step, direction: state.direction }
  const title = titleOf(state.screen)
  return <div dir={state.dir}>
    <h1><RNavigation part="bar" navigation={navigation}><span data-title-entry={state.step}>{title}</span></RNavigation></h1>
    <div data-part="actions"><RNavigation part="bar" navigation={navigation} control={actionOf(state.screen)}><button type="button" data-action-entry={state.step}>{actionOf(state.screen)}</button></RNavigation></div>
    <div data-part="body"><RNavigation navigation={navigation}>
      <form id={state.formId} aria-label={`${title} form`} data-screen={state.screen} data-entry={state.step}
        onSubmit={(event) => { event.preventDefault(); submissions.push(`${state.screen}:${state.step}:${state.value}`) }}>
        <RFields label={`${title} value`} value={state.value} fieldId={fieldsId(state.step)} />
      </form>
    </RNavigation></div>
    <button type="submit" form={state.formId} data-pinned-cta="">Continue</button>
  </div>
}

function vueScreen(state: ScreenState) {
  // A render-local view model keeps nested component props and callback values
  // tied to this entry. The host does not freeze arbitrary shared stores.
  const { step, direction, screen, value, formId, dir } = state
  const navigation = { step, direction }
  const title = titleOf(screen)
  const form = h("form", {
    id: formId, "aria-label": `${title} form`, "data-screen": screen, "data-entry": step,
    onSubmit: (event: Event) => { event.preventDefault(); submissions.push(`${screen}:${step}:${value}`) },
  }, [h(VFields, { label: `${title} value`, value, fieldId: fieldsId(step) })])
  return h("div", { dir }, [
    h("h1", [h(VNavigation, { part: "bar", navigation }, { default: () => h("span", { "data-title-entry": step }, title) })]),
    h("div", { "data-part": "actions" }, [h(VNavigation, { part: "bar", navigation, control: actionOf(screen) }, { default: () => h("button", { type: "button", "data-action-entry": step }, actionOf(screen)) })]),
    h("div", { "data-part": "body" }, [h(VNavigation, { navigation }, { default: () => form })]),
    h("button", { type: "submit", form: formId, "data-pinned-cta": "" }, "Continue"),
  ])
}

const formAt = (step: number) => {
  const form = document.querySelector<HTMLFormElement>(`form[data-entry="${step}"]`)
  if (!form) throw new Error(`Missing entry form ${step}`)
  return form
}
const pinned = () => {
  const button = document.querySelector<HTMLButtonElement>("[data-pinned-cta]")
  if (!button) throw new Error("Missing pinned Continue")
  return button
}
const assertActive = (step: number, title: string, formId = "flow-form") => {
  const form = formAt(step)
  expect(within(document.body).getAllByRole("form")).toEqual([form])
  expect(document.querySelectorAll(`form[id="${formId}"]`)).toHaveLength(1)
  expect(pinned().form).toBe(form)
  expect(form.closest("[inert], [aria-hidden='true']")).toBeNull()
  expect(within(document.body).getByRole("heading", { name: title })).toBeTruthy()
  expect(within(document.body).getAllByRole("button").map((button) => button.textContent)).toEqual([title === "Password" ? "Close" : "Back", "Continue"])
}
const assertOutgoing = (form: HTMLFormElement, direction: DemoNavigation["direction"]) => {
  const exit = form.closest<HTMLElement>("[data-exiting]")
  expect(exit).not.toBeNull()
  expect(exit?.hasAttribute("inert")).toBe(true)
  expect(exit?.getAttribute("aria-hidden")).toBe("true")
  expect(exit?.dataset.demoExitDirection).toBe(direction)
  expect(form.hasAttribute("id")).toBe(false)
}

// These assertions compare DOM/focusability/form ownership. Actual transform
// directions and continuous interrupted frames require the separate runtime
// matrix; jsdom is not treated as proof of visual motion.
describe("shared demo navigation parity", () => {
  test.each(["ltr", "rtl"] as const)("keeps outgoing content and bars as snapshots, with one active CTA target in %s", async (dir) => {
    const pair = await walkPairWithState({ ...initial, dir }, reactScreen, vueScreen, async ({ set, advance, snapshot }) => {
      submissions.length = 0
      const outgoing = formAt(0)
      assertActive(0, "Password")
      await set({ step: 1, direction: "forward", screen: "edit", value: "draft-B" })
      assertActive(1, "Edit phone")
      assertOutgoing(outgoing, "forward")
      expect(outgoing.getAttribute("data-screen")).toBe("password")
      expect(outgoing.querySelector("input")?.value).toBe("draft-A")
      expect(document.querySelector('[data-title-entry="0"]')?.textContent).toBe("Password")
      expect(document.querySelector('[data-action-entry="0"]')?.textContent).toBe("Close")
      expect(formAt(1).closest("[dir]")?.getAttribute("dir")).toBe(dir)
      await interact(() => { fireEvent.click(pinned()) })
      expect(submissions).toEqual(["edit:1:draft-B"])
      snapshot()
      await advance(16)
      await advance(16)
      await advance(301)
      expect(outgoing.isConnected).toBe(false)
      assertActive(1, "Edit phone")
      snapshot()
    })
    expect(pair.vue).toEqual(pair.react)
  })

  test("rapid forward/back/forward retains each departing snapshot and its original exit direction", async () => {
    const pair = await walkPairWithState(initial, reactScreen, vueScreen, async ({ set, advance, snapshot }) => {
      const original = formAt(0)
      await set({ step: 1, direction: "forward", screen: "edit", value: "draft-B" })
      const editing = formAt(1)
      await advance(16)
      await advance(16)
      await set({ step: 2, direction: "back", screen: "password", value: "draft-C" })
      assertActive(2, "Password")
      assertOutgoing(original, "forward")
      assertOutgoing(editing, "back")
      expect(original.querySelector("input")?.value).toBe("draft-A")
      expect(editing.querySelector("input")?.value).toBe("draft-B")
      expect(editing.closest("[data-exiting]")?.hasAttribute("data-interrupted")).toBe(true)
      snapshot()
      await set({ step: 3, direction: "forward", screen: "edit", value: "draft-D" })
      assertActive(3, "Edit phone")
      assertOutgoing(original, "forward")
      assertOutgoing(editing, "back")
      expect(formAt(2).querySelector("input")?.value).toBe("draft-C")
      await advance(16)
      await advance(16)
      await advance(301)
      expect(document.querySelectorAll("form[data-entry]")).toHaveLength(1)
      expect(formAt(3).querySelector("input")?.value).toBe("draft-D")
      snapshot()
    })
    expect(pair.vue).toEqual(pair.react)
  })

  test.each(["flow-form", "returned-form"])("interrupted key reuse restores the active form without overriding its current id=%s", async (formId) => {
    const pair = await walkPairWithState(initial, reactScreen, vueScreen, async ({ set, advance, snapshot }) => {
      submissions.length = 0
      const original = formAt(0)
      await set({ step: 1, direction: "forward", screen: "edit", value: "draft-B" })
      await advance(16)
      await advance(16)
      await set({ step: 0, direction: "back", screen: "password", value: "draft-returned", formId })
      expect(formAt(0)).toBe(original)
      assertActive(0, "Password", formId)
      expect(original.querySelector("input")?.value).toBe("draft-returned")
      assertOutgoing(formAt(1), "back")
      await interact(() => { fireEvent.click(pinned()) })
      expect(submissions).toEqual(["password:0:draft-returned"])
      snapshot()
      await advance(16)
      await advance(16)
      await advance(301)
      expect(document.querySelectorAll("form[data-entry]")).toHaveLength(1)
      assertActive(0, "Password", formId)
      snapshot()
    })
    expect(pair.vue).toEqual(pair.react)
  })

  test("editing the current screen without a new step preserves the input and creates no outgoing copy", async () => {
    const pair = await walkPairWithState(initial, reactScreen, vueScreen, async ({ set, snapshot }) => {
      const form = formAt(0)
      const input = form.querySelector("input")
      input?.focus()
      await set({ value: "updated-in-place" })
      expect(formAt(0)).toBe(form)
      expect(formAt(0).querySelector("input")).toBe(input)
      expect(document.activeElement).toBe(input)
      expect(input?.value).toBe("updated-in-place")
      expect(document.querySelector("[data-exiting]")).toBeNull()
      assertActive(0, "Password")
      snapshot()
    })
    expect(pair.vue).toEqual(pair.react)
  })

  test("Reduce Motion releases the inert outgoing copy without waiting for the 300ms duration", async () => {
    reduced = true
    const pair = await walkPairWithState(initial, reactScreen, vueScreen, async ({ set, advance, snapshot }) => {
      const original = formAt(0)
      await set({ step: 1, direction: "forward", screen: "edit", value: "draft-B" })
      assertActive(1, "Edit phone")
      if (original.isConnected) assertOutgoing(original, "forward")
      await advance(16)
      await advance(16)
      await advance(1)
      expect(original.isConnected).toBe(false)
      expect(document.querySelectorAll("form[data-entry]")).toHaveLength(1)
      assertActive(1, "Edit phone")
      snapshot()
    })
    expect(pair.vue).toEqual(pair.react)
  })
})

describe("shared navigation exit ownership", () => {
  test.each(["--demo-navigation-exit-scroll-offset", "--settings-exit-scroll-offset"])("freezes each outgoing %s compensation until re-entry", (property) => {
    const viewport = document.createElement("div")
    viewport.dataset.demoNavigationDirection = "forward"
    const entry = document.createElement("div")
    const form = document.createElement("form")
    form.id = "retained-form"
    entry.append(form)
    viewport.append(entry)
    document.body.append(viewport)
    entry.style.setProperty(property, "-137px")
    hideExitingDemoScreen(entry)
    entry.style.setProperty(property, "200px")
    viewport.dataset.demoNavigationDirection = "back"
    expect(entry.style.top).toBe("-137px")
    expect(entry.dataset.demoExitDirection).toBe("forward")
    expect(form.hasAttribute("id")).toBe(false)
    showEnteringDemoScreen(entry)
    expect(entry.style.top).toBe("")
    expect(entry.hasAttribute("inert")).toBe(false)
    expect(entry.hasAttribute("aria-hidden")).toBe(false)
    expect(form.id).toBe("retained-form")
  })
})

// Row 87: Back on both screens is one control that stays in place, and the outgoing screen is covered or
// uncovered without fading through the incoming one.
describe("navigation bar control and outgoing screen", () => {
  const same = (part: string) => document.querySelector(`${part} > [data-demo-navigation-direction]`)?.hasAttribute("data-demo-navigation-same")
  test("a bar control the step before showed too is marked to stay in place, a changed one is not", async () => {
    const pair = await walkPairWithState(initial, reactScreen, vueScreen, async ({ set, advance, snapshot }) => {
      expect(same('[data-part="actions"]')).toBe(false)
      await set({ step: 1, direction: "forward", screen: "edit", value: "draft-B" })
      expect(same('[data-part="actions"]')).toBe(false)
      await advance(16)
      await advance(16)
      await advance(301)
      await set({ step: 2, direction: "forward", screen: "edit", value: "draft-C" })
      expect(same('[data-part="actions"]')).toBe(true)
      expect(document.querySelectorAll('[data-part="actions"] [data-action-entry]')).toHaveLength(2)
      // The title names no control to keep, and the content is no bar: both still cross.
      expect(same("h1")).toBe(false)
      expect(same('[data-part="body"]')).toBe(false)
      snapshot()
      await advance(16)
      await advance(301)
      await set({ step: 3, direction: "back", screen: "password", value: "draft-D" })
      expect(same('[data-part="actions"]')).toBe(false)
      snapshot()
    })
    expect(pair.vue).toEqual(pair.react)
  })

  test("the stylesheet keeps the outgoing screen opaque and covered, and the kept control still", () => {
    const root = postcss.parse(readFileSync("components/docs/DemoNavigation.module.css", "utf8"))
    const decls = (selector: string) => {
      const out: Record<string, string> = {}
      root.walkRules((rule) => {
        if (rule.parent?.type === "atrule" || !rule.selectors.includes(selector)) return
        rule.walkDecls((decl) => { out[decl.prop] = decl.value })
      })
      return out
    }
    // Forward and Back exits move the screen and leave its opacity alone.
    expect(decls(".Content[data-exiting-active]").transform).toContain("-30%")
    expect(decls(".Content[data-exiting-active]").opacity).toBeUndefined()
    const backExit = '.Content[data-demo-exit-direction="back"]:is([data-exiting-active], [data-exiting][data-interrupted])'
    expect(decls(backExit).transform).toContain("100%")
    expect(decls(backExit).opacity).toBeUndefined()
    // The incoming screen's surface reaches down over a taller one leaving under it.
    expect(decls(".Viewport:has(> .Content[data-exiting]) > .Content:not([data-exiting])::after")).toMatchObject({
      height: "max(0px, calc(var(--demo-navigation-exit-height, 0px) - 100%))", background: "inherit",
    })
    // A step forward taken during a Back exit arrives above the screen still leaving.
    expect(decls('[data-demo-navigation-direction="forward"] > .Content[data-demo-exit-direction="back"][data-exiting]')["z-index"]).toBe("1")
    // The kept control: neither copy moves, the incoming one is there and the outgoing one is not.
    const kept = "[data-demo-navigation-same][data-demo-navigation-direction] > .Bar.Bar"
    expect(decls(`${kept}:is([data-entering], [data-exiting])`)).toEqual({ transform: "none", transition: "none" })
    expect(decls(`${kept}[data-entering]`)).toEqual({ opacity: "1" })
    expect(decls(`${kept}[data-exiting]`)).toEqual({ visibility: "hidden" })
  })

  test("an outgoing screen hands its height to the screen that covers it", () => {
    const viewport = document.createElement("div")
    const entry = document.createElement("div")
    viewport.append(entry)
    document.body.append(viewport)
    entry.getBoundingClientRect = () => DOMRect.fromRect({ width: 370, height: 612 })
    hideExitingDemoScreen(entry)
    expect(viewport.style.getPropertyValue("--demo-navigation-exit-height")).toBe("612px")
    viewport.remove()
  })
})
