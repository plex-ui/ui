import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { OAuthFormDemo } from "../../components/docs/OAuthFormDemos"
import { VueFormExampleDemo } from "../../components/docs/vue/VueFormExamplesDemos"
import { flushVue } from "./harness"
import { mdxExports } from "./mdxExports"

vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => true }))
vi.mock("../../components/docs/VuePreview", async () => ({
  VuePreview: (await import("../../components/docs/VuePreviewRuntime")).default,
}))

const exports = mdxExports("content/vue/components/auth-forms.mdx")
const read = (name: string): unknown => new Function(`return ${exports.get(name)}`)()
const template = read("oauth")
const modeControl = read("modeControl")
if (typeof template !== "string") throw new Error("OAuth template is missing")

const interact = async (action: () => void) => act(async () => { action(); await flushVue() })
beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe.each(["React", "Vue"])("%s OAuth log in or sign up", (framework) => {
  // Plan 177: Log in (OAuth) and Sign up (OAuth) are one example; the mode control and the cross-link switch it.
  test("the cross-link and the mode control switch the copy and the phone provider, keeping the email", async () => {
    const view = render(framework === "React"
      ? <OAuthFormDemo />
      : <VueFormExampleDemo auth template={template} state={{ email: "", submitted: false }} controls={[modeControl as never]} />)
    await act(async () => { await flushVue() })
    const page = within(view.container)
    const title = () => view.container.querySelector("[data-auth-title]")?.textContent?.trim()
    const phone = () => page.queryByRole("button", { name: "Continue with phone" })
    expect(title()).toBe("Welcome back")
    expect(phone()).not.toBeNull()
    const email = page.getByLabelText<HTMLInputElement>("Email address", { selector: "input", exact: true })
    await interact(() => {
      fireEvent.input(email, { target: { value: "jane@example.com" } })
      fireEvent.change(email, { target: { value: "jane@example.com" } })
    })
    await interact(() => fireEvent.click(page.getByRole("button", { name: "Sign up", exact: true })))
    expect(title()).toBe("Create an account")
    expect(page.getByText("Already have an account?", { exact: false })).toBeTruthy()
    expect(phone()).toBeNull()
    expect(page.getByRole("radio", { name: "Sign up", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(page.getByLabelText<HTMLInputElement>("Email address", { selector: "input", exact: true }).value).toBe("jane@example.com")
    await interact(() => fireEvent.click(page.getByRole("radio", { name: "Log in", exact: true })))
    expect(title()).toBe("Welcome back")
    expect(phone()).not.toBeNull()
  })
})
