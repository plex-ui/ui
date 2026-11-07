import { readFileSync } from "node:fs"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { JsxEmit, transpileModule } from "typescript"
import { Button as ReactButton } from "@plexui/ui/components/Button"
import { Popover as ReactPopover, usePopoverController as useReactPopoverController } from "@plexui/ui/components/Popover"
import { PopoverConfirmationDemo } from "../../components/docs/PopoverDemos"
import { VuePopoverConfirmationDemo } from "../../components/docs/vue/VuePopoverDemos"
import confirmationStyles from "../../components/docs/PopoverConfirmation.module.css"
import { Popover, PopoverContent, PopoverTrigger } from "../../packages/vue/src/components/Popover"
import { Button } from "../../packages/vue/src/components/Button"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

vi.mock("@plexui/ui/components/Popover", async () => import("../../packages/ui/src/components/Popover"))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => false }))
vi.mock("../../components/docs/VuePreview", async () => ({
  VuePreview: (await import("../../components/docs/VuePreviewRuntime")).default,
}))
vi.mock("../../components/docs/vue/registry", async () => ({
  vueComponents: {
    ...(await import("../../packages/vue/src/components/Popover")),
    Button: (await import("../../packages/vue/src/components/Button")).Button,
  },
}))

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

const vueMdx = read("content/vue/components/popover.mdx")
const vueDeclarations = vueMdx.slice(vueMdx.indexOf("export const overview ="), vueMdx.indexOf("<UsageBlock>"))
const vueExports: unknown = new Function(`${vueDeclarations.replace(/^export const /gm, "const ")}; return { confirmation, confirmationCode };`)()
if (!vueExports || typeof vueExports !== "object" || !("confirmation" in vueExports) || typeof vueExports.confirmation !== "string"
  || !("confirmationCode" in vueExports) || typeof vueExports.confirmationCode !== "string") throw new Error("The Vue confirmation example must resolve to strings")
const template = vueExports.confirmation
const vueCode = vueExports.confirmationCode

const reactMdx = read("content/components/popover.mdx")
const reactStart = reactMdx.indexOf("export const confirmationCode = ")
const reactDeclaration = reactMdx.slice(reactStart, reactMdx.indexOf("export const controllerCode = ", reactStart)).replace("export const", "const")
const reactCode: unknown = new Function(`${reactDeclaration}; return confirmationCode;`)()
if (typeof reactCode !== "string") throw new Error("The copied React confirmation must resolve to code")
const reactCompiled = transpileModule(reactCode.replace(/^import .*;\n/gm, "").replace("export function", "function"), {
  fileName: "PopoverConfirmationCopied.tsx",
  compilerOptions: { jsx: JsxEmit.React },
}).outputText
const copiedReact: unknown = new Function("React", "Button", "Popover", "usePopoverController", "useBreakpoint", "styles",
  `${reactCompiled}; return PopoverConfirmationDemo;`)(
  React, ReactButton, ReactPopover, useReactPopoverController, () => false, confirmationStyles,
)
function CopiedReactConfirmationDemo() {
  if (typeof copiedReact !== "function") throw new Error("The copied React confirmation must export a component")
  const result: unknown = copiedReact()
  if (!React.isValidElement(result)) throw new Error("The copied React confirmation must render an element")
  return result
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(async () => {
  cleanup()
  await flushVue()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const advance = async (ms: number) => interact(() => { vi.advanceTimersByTime(ms) })
const page = () => within(document.body)
const trigger = () => page().getAllByRole("button", { name: "Delete event", hidden: true })[0]
const open = async () => {
  await interact(() => fireEvent.click(trigger(), { detail: 1 }))
  await advance(50)
  return page().getByRole("dialog", { hidden: true })
}

type Example = "React" | "React copied example" | "Vue preview" | "Vue copied example"
const mount = async (example: Example) => {
  if (example === "React") return render(<PopoverConfirmationDemo />)
  if (example === "React copied example") return render(<CopiedReactConfirmationDemo />)
  if (example === "Vue preview") return render(<VuePopoverConfirmationDemo template={template} />)
  const Component = defineComponent({
    components: { Popover, PopoverContent, PopoverTrigger, Button },
    setup: () => ({ wide: ref(false), styles: confirmationStyles }),
    template,
  })
  const view = mountVue(() => h(Component))
  await flushVue()
  return view
}

describe("the copied confirmation matches the preview", () => {
  test("React: the page code is the demo, with the shared styles imported as styles", () => {
    const demo = read("components/docs/PopoverDemos.tsx").replace(/confirmationStyles/g, "styles")
    const body = reactCode.slice(reactCode.indexOf("function ConfirmationBody"))
    expect(demo).toContain(body)
    expect(reactCode).toContain("import styles from './PopoverConfirmation.module.css';")
  })

  test("Vue: the copied page imports the shared styles and the breakpoint, then renders the preview template", () => {
    expect(vueCode).toContain("import styles from './PopoverConfirmation.module.css';")
    expect(vueCode).toContain("const wide = useBreakpoint('md');")
    expect(vueCode).toContain(template)
  })
})

describe.each<Example>(["React", "React copied example", "Vue preview", "Vue copied example"])("%s Popover confirmation", (example) => {
  test("on a phone the panel opens over its button with focus on the panel, and the action closes it", async () => {
    await mount(example)
    const button = trigger()
    expect(button.getAttribute("data-size")).toBe("3xl")
    expect(button.hasAttribute("data-block")).toBe(true)
    const dialog = await open()
    expect(document.activeElement).toBe(dialog)
    expect(dialog.className).toContain(confirmationStyles.Confirmation)
    expect(within(dialog).getByText("Are you sure you want to delete this event?").className).toContain(confirmationStyles.Message)
    // jsdom has no layout, so Popper hides the detached panel and its text has no accessible name here.
    const actions = within(dialog).getAllByRole("button", { hidden: true })
    expect(actions.map((item) => item.textContent?.trim())).toEqual(["Delete event"])
    const action = actions[0]
    expect(action.className).toContain(confirmationStyles.Action)
    expect(action.getAttribute("data-color")).toBe("danger")
    await interact(() => fireEvent.click(action, { detail: 1 }))
    await advance(400)
    expect(page().queryByRole("dialog", { hidden: true })).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  test("Escape cancels and returns focus to the button", async () => {
    await mount(example)
    const dialog = await open()
    await interact(() => fireEvent.keyDown(dialog, { key: "Escape" }))
    await advance(400)
    expect(page().queryByRole("dialog", { hidden: true })).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })
})

describe("a phone popover takes the iOS 26 popover material (kit Action Sheet 5446:10266, iOS2 IMG_5528)", () => {
  test("the phone tokens: the 34px corner and the menu material", () => {
    const touch = read("packages/styles/src/styles/touch.css")
    const phone = touch.slice(touch.indexOf("@media (max-width: 767px) {"), touch.indexOf("@media (min-width: 414px)"))
    expect(phone).toContain("--popover-radius: 34px;")
    const materials = read("packages/styles/src/styles/mobile-materials.css")
    expect(materials).toContain("--popover-mobile-background: var(--menu-mobile-background);")
    expect(materials).toContain("--popover-mobile-backdrop-filter: var(--menu-mobile-backdrop-filter);")
    expect(read("packages/styles/src/styles/variables-components.css")).toContain("--popover-radius: var(--radius-xl);")
  })

  test("the panel reads them on a phone, with the blur in dark only; translucent and calendar panels keep theirs", () => {
    const css = read("packages/styles/src/components/Popover/Popover.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px) {"), css.indexOf("@keyframes shake"))
    expect(phone).toMatch(/\.Popover \{\s*background: var\(--popover-mobile-background, var\(--color-surface-elevated\)\);\s*@mixin dark \{\s*-webkit-backdrop-filter: var\(--popover-mobile-backdrop-filter, none\);\s*backdrop-filter: var\(--popover-mobile-backdrop-filter, none\);\s*\}\s*\}/)
    expect(phone).not.toContain("data-translucent")
    expect(css).toContain("&[data-translucent] {\n    backdrop-filter: blur(16px);")
    const calendar = read("packages/styles/src/components/DatePicker/Calendar.module.css")
    expect(calendar).toContain("--popover-radius: calc(22px + var(--calendar-inner-padding));")
    expect(calendar).toContain(".Popover[role=\"dialog\"] {")
  })

  test("the confirmation inside follows the native Alert layout on a phone", () => {
    const css = read("components/docs/PopoverConfirmation.module.css")
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
    expect(phone).toContain("--popover-width: 240px;")
    expect(phone).toContain("padding: var(--dialog-alert-padding, 14px);")
    expect(phone).toContain("padding: var(--dialog-alert-header-padding, 8px 8px 14px);")
    expect(phone).toContain("--button-size: var(--dialog-alert-action-height, 48px);")
    expect(phone).toContain("--button-font-weight: var(--font-weight-medium);")
  })
})
