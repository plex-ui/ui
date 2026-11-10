import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive } from "vue"
import { FloatingLabelInputEmailLoginFormDemo, FloatingLabelInputPhoneSignupFormDemo } from "../../components/docs/FloatingLabelInputDemos"
import { AuthLegalNotice } from "../../components/docs/AuthLegalNotice"
import { AuthLegalNotice as VueAuthLegalNotice } from "../../components/docs/vue/AuthLegalNotice"
import { formExamplesScope } from "../../components/docs/vue/VueFormExamplesDemos"
import { vueComponents } from "../../components/docs/vue/registry"
import { flushVue, mountVue } from "./harness"

// A phone screen's action sits in a bottom Toolbar, which takes the place of the footer.
const PHONE_FOOTER = '[data-toolbar][data-placement="bottom"]'

const viewport = vi.hoisted(() => ({ wide: false }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => viewport.wide }))

const mdx = readFileSync("content/vue/components/auth-forms.mdx", "utf8")
function resolveTemplate(name: string, nextName: string, bindings: Record<string, string> = {}): string {
  const start = mdx.indexOf(`export const ${name} = `) + `export const ${name} = `.length
  const expression = mdx.slice(start, mdx.indexOf(`export const ${nextName} = `, start)).trim()
  const result: unknown = new Function(...Object.keys(bindings), `return ${expression}`)(...Object.values(bindings))
  if (typeof result !== "string") throw new Error(`Could not resolve ${name} template`)
  return result
}
const countrySelect = resolveTemplate("countrySelect", "phoneSignup")
const examples = {
  signup: { Component: FloatingLabelInputPhoneSignupFormDemo, template: resolveTemplate("phoneSignup", "phoneLogin", { countrySelect }), action: "Continue" },
  login: { Component: FloatingLabelInputEmailLoginFormDemo, template: resolveTemplate("emailLogin", "oauthLogin"), action: "Log in" },
}
type Example = keyof typeof examples
const initialState = () => ({ ...formExamplesScope, wide: viewport.wide, phonePreview: false, phoneHost: false, dialog: false, surface: 'grouped', fullName: "", email: "", password: "", country: "es", phone: "", submitted: false })
const interact = async (action: () => void) => { await act(async () => { action(); await flushVue() }) }
const enter = async (input: HTMLElement, value: string) => interact(() => {
  fireEvent.input(input, { target: { value } })
  fireEvent.change(input, { target: { value } })
})

async function mountExample(framework: string, kind: Example) {
  const example = examples[kind]
  const state = reactive(initialState())
  const view = framework === "React" ? render(<example.Component />) : null
  if (!view) {
    mountVue(() => h(defineComponent({ components: vueComponents, setup: () => state, template: example.template })))
    await flushVue()
  }
  return {
    setDialog: async (dialog: boolean) => interact(() => {
      if (view) fireEvent.click(within(document.body).getByRole("switch", { name: "dialog" }))
      else state.dialog = dialog
    }),
    resize: async (wide: boolean) => interact(() => {
      viewport.wide = wide
      if (view) view.rerender(<example.Component />)
      else state.wide = wide
    }),
  }
}

beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }) })
afterEach(() => { cleanup(); viewport.wide = false; vi.unstubAllGlobals() })

describe.each(["React", "Vue"])("%s auth entry forms", (framework) => {
  test("legal destinations opt in to real anchors in the shared documents footer", async () => {
    const props = { termsHref: "/terms", privacyHref: "/privacy" }
    if (framework === "React") render(<AuthLegalNotice {...props} />)
    else mountVue(() => h(VueAuthLegalNotice, props))
    await flushVue()
    const page = within(document.body)
    const terms = page.getByRole("link", { name: "Terms of Use", exact: true })
    const privacy = page.getByRole("link", { name: "Privacy Policy", exact: true })
    expect(terms.getAttribute("href")).toBe("/terms")
    expect(privacy.getAttribute("href")).toBe("/privacy")
    expect(terms.closest("p")).toBe(privacy.closest("p"))
    for (const link of [terms, privacy]) {
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")?.split(/\s+/)).toContain("noreferrer")
    }
  })
  describe.each(["signup", "login"] as const)("%s", (kind) => {
    test.each([
      { name: "Phone Page", wide: false, dialog: false },
      { name: "Phone Sheet", wide: false, dialog: true },
      { name: "Desktop Page", wide: true, dialog: false },
      { name: "Desktop dialog frame", wide: true, dialog: true },
    ])("$name has one associated submit action and validates actual form fields", async ({ wide, dialog }) => {
      viewport.wide = wide
      const view = await mountExample(framework, kind)
      if (dialog) await view.setDialog(true)
      const page = within(document.body)
      const actions = page.getAllByRole<HTMLButtonElement>("button", { name: examples[kind].action, exact: true }).filter((button) => button.type === "submit")
      expect(actions).toHaveLength(1)
      const action = actions[0]
      const form = document.querySelector<HTMLFormElement>("form")
      expect(form).toBeTruthy()
      expect(action.form).toBe(form)
      expect(form?.contains(action)).toBe(wide)
      expect(Boolean(action.closest(PHONE_FOOTER))).toBe(!wide)
      if (kind === "signup") {
        const terms = page.getByText("Terms of Use", { exact: true })
        const privacy = page.getByText("Privacy Policy", { exact: true })
        const notice = terms.closest("p")
        expect(notice).not.toBeNull()
        expect(privacy.closest("p")).toBe(notice)
        expect(notice?.textContent).toBe("Terms of Use | Privacy Policy")
        expect(page.getAllByText((_text, element) => element?.tagName === "P" && element.textContent === "Terms of Use | Privacy Policy")).toEqual([notice])
        for (const label of [terms, privacy]) {
          expect(label.tagName).toBe("SPAN")
          expect(label.getAttribute("role")).toBeNull()
          expect(label.getAttribute("tabindex")).toBeNull()
          expect(label.getAttribute("href")).toBeNull()
        }
        expect(form?.contains(terms)).toBe(wide)
        expect(form?.contains(privacy)).toBe(wide)
        expect(Boolean(terms.closest(PHONE_FOOTER))).toBe(!wide)
        expect(Boolean(privacy.closest(PHONE_FOOTER))).toBe(!wide)
      }
      const onSubmit = vi.fn()
      form?.addEventListener("submit", onSubmit)
      await interact(() => fireEvent.click(action))
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(page.getByLabelText("Email address").getAttribute("aria-invalid")).toBe("true")
      expect(page.getByText("Enter a valid email address.")).toBeTruthy()
      const otherField = page.getByLabelText(kind === "signup" ? "Phone number" : "Password", { selector: "input" })
      expect(otherField.getAttribute("aria-invalid")).toBe("true")
      await enter(otherField, kind === "signup" ? "612345678" : "test password")
      await enter(page.getByLabelText("Email address"), "invalid-address")
      await interact(() => fireEvent.click(action))
      expect(page.getByLabelText("Email address").getAttribute("aria-invalid")).toBe("true")
      expect(otherField.getAttribute("aria-invalid")).not.toBe("true")
      await enter(page.getByLabelText("Email address"), "alex@plexui.com")
      await interact(() => fireEvent.click(action))
      expect(page.queryByText("Enter a valid email address.")).toBeNull()
      expect(document.querySelector('[aria-invalid="true"]')).toBeNull()
    })

    test("keeps edited values and one action across 767 → 768 → 767 and Page → Sheet", async () => {
      const view = await mountExample(framework, kind)
      const page = within(document.body)
      await enter(page.getByLabelText("Email address"), "alex@plexui.com")
      const secondaryLabel = kind === "signup" ? "Full name" : "Password"
      await enter(page.getByLabelText(secondaryLabel, { selector: "input" }), "Remember this value")
      for (const wide of [true, false]) {
        await view.resize(wide)
        expect(page.getByLabelText("Email address")).toHaveProperty("value", "alex@plexui.com")
        expect(page.getByLabelText(secondaryLabel, { selector: "input" })).toHaveProperty("value", "Remember this value")
        expect(document.querySelectorAll('button[type="submit"]')).toHaveLength(1)
      }
      await view.setDialog(true)
      expect(page.getByLabelText("Email address")).toHaveProperty("value", "alex@plexui.com")
      expect(page.getByLabelText(secondaryLabel, { selector: "input" })).toHaveProperty("value", "Remember this value")
      expect(document.querySelectorAll('button[type="submit"]')).toHaveLength(1)
    })
  })

  test("two signup instances have unique form ids and the footer submits only its owner", async () => {
    if (framework === "React") render(<><FloatingLabelInputPhoneSignupFormDemo /><FloatingLabelInputPhoneSignupFormDemo /></>)
    else {
      const Example = defineComponent({ components: vueComponents, setup: () => reactive(initialState()), template: examples.signup.template })
      mountVue(() => h("div", [h(Example), h(Example)]))
      await flushVue()
    }
    const forms = [...document.querySelectorAll<HTMLFormElement>("form")]
    expect(forms).toHaveLength(2)
    expect(forms[0].id).toBeTruthy()
    expect(forms[0].id).not.toBe(forms[1].id)
    const actions = [...document.querySelectorAll<HTMLButtonElement>('button[type="submit"]')]
    expect(actions.map((action) => action.form)).toEqual(forms)
    const firstSubmit = vi.fn()
    const secondSubmit = vi.fn()
    forms[0].addEventListener("submit", firstSubmit)
    forms[1].addEventListener("submit", secondSubmit)
    await interact(() => fireEvent.click(actions[1]))
    expect(firstSubmit).not.toHaveBeenCalled()
    expect(secondSubmit).toHaveBeenCalledTimes(1)
    expect(forms[0].querySelector('[aria-invalid="true"]')).toBeNull()
    expect(within(forms[1]).getByLabelText("Email address").getAttribute("aria-invalid")).toBe("true")
  })
})
