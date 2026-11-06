import { readFileSync } from "node:fs"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, onBeforeUnmount, ref } from "vue"
import { JsxEmit, transpileModule } from "typescript"
import { Button as ReactButton } from "@plexui/ui/components/Button"
import { Sparkles as ReactSparkles } from "@plexui/ui/components/Icon"
import { Popover as ReactPopover, usePopoverController as useReactPopoverController } from "@plexui/ui/components/Popover"
import { Textarea as ReactTextarea } from "@plexui/ui/components/Textarea"
import { PopoverControllerDemo } from "../../components/docs/PopoverDemos"
import { VuePopoverDemo } from "../../components/docs/vue/VuePopoverDemos"
import { Popover, PopoverContent, PopoverTrigger } from "../../packages/vue/src/components/Popover"
import { Button } from "../../packages/vue/src/components/Button"
import { Textarea } from "../../packages/vue/src/components/Textarea"
import { Sparkles } from "../../packages/vue/src/components/Icon"
import { animation, flushVue, mountVue } from "./harness"
import { interact } from "./pair"

vi.mock("@plexui/ui/components/Popover", async () => import("../../packages/ui/src/components/Popover"))
vi.mock("@plexui/ui/components/Textarea", async () => import("../../packages/ui/src/components/Textarea"))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => false }))
vi.mock("../../components/docs/VuePreview", async () => ({
  VuePreview: (await import("../../components/docs/VuePreviewRuntime")).default,
}))
vi.mock("../../components/docs/vue/registry", async () => ({
  vueComponents: {
    ...(await import("../../packages/vue/src/components/Popover")),
    Button: (await import("../../packages/vue/src/components/Button")).Button,
    Textarea: (await import("../../packages/vue/src/components/Textarea")).Textarea,
    Sparkles: (await import("../../packages/vue/src/components/Icon")).Sparkles,
  },
}))

const mdx = readFileSync("content/vue/components/popover.mdx", "utf8")
const declarations = mdx.slice(mdx.indexOf("export const overview ="), mdx.indexOf("<UsageBlock>"))
const exports: unknown = new Function(`${declarations.replace(/^export const /gm, "const ")}; return { controller, controllerCode };`)()
if (!exports || typeof exports !== "object" || !("controller" in exports) || typeof exports.controller !== "string"
  || !("controllerCode" in exports) || typeof exports.controllerCode !== "string") throw new Error("Popover controller examples must resolve to strings")
const template = exports.controller
const script = exports.controllerCode.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1]
if (!script) throw new Error("The copied Vue controller needs its lifecycle setup")
const setupCode = transpileModule(script.replace(/^import .*;\n/gm, ""), {}).outputText
const copiedSetup = new Function("ref", "onBeforeUnmount", "useBreakpoint", `${setupCode}; return { wide, open, prompt, submitting, setOpen, setPrompt, submitPrompt };`)

const reactMdx = readFileSync("content/components/popover.mdx", "utf8")
const reactStart = reactMdx.indexOf("export const controllerCode = ")
const reactDeclaration = reactMdx.slice(reactStart, reactMdx.indexOf("<UsageBlock>", reactStart)).replace("export const", "const")
const reactCode: unknown = new Function(`${reactDeclaration}; return controllerCode;`)()
if (typeof reactCode !== "string") throw new Error("The copied React controller must resolve to code")
const reactCompiled = transpileModule(reactCode.replace(/^import .*;\n/gm, "").replace("export function", "function"), {
  fileName: "PopoverCopied.tsx",
  compilerOptions: { jsx: JsxEmit.React },
}).outputText
const copiedReact: unknown = new Function("React", "Button", "Sparkles", "Popover", "usePopoverController", "Textarea", "useBreakpoint",
  `const { useEffect, useRef, useState } = React; ${reactCompiled}; return PopoverControllerDemo;`)(
  React, ReactButton, ReactSparkles, ReactPopover, useReactPopoverController, ReactTextarea, () => false,
)
function CopiedReactControllerDemo() {
  if (typeof copiedReact !== "function") throw new Error("The copied React controller must export a component")
  const result: unknown = copiedReact()
  if (!React.isValidElement(result)) throw new Error("The copied React controller must render an element")
  return result
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  let time = Date.now()
  vi.spyOn(Date, "now").mockImplementation(() => ++time)
})
afterEach(async () => {
  cleanup()
  await flushVue()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const advance = async (ms: number) => interact(() => { vi.advanceTimersByTime(ms) })
const click = async (element: HTMLElement) => interact(() => fireEvent.click(element, { detail: 1 }))
// jsdom has zero layout rects, so Popper hides its detached anchor. These
// checks cover mounted lifecycle; viewport reachability needs the browser run.
const page = () => within(document.body)
const open = async () => {
  await click(page().getByRole("button", { name: "Generate" }))
  await advance(50)
  return page().getByRole("dialog", { hidden: true })
}
const fill = async (dialog: HTMLElement, value: string) => {
  const input = within(dialog).getByRole("textbox", { hidden: true })
  await interact(() => {
    fireEvent.input(input, { target: { value } })
    fireEvent.change(input, { target: { value } })
  })
}
const submit = async (dialog: HTMLElement) => {
  const form = dialog.querySelector("form")
  if (!form) throw new Error("The controller must expose its form")
  await interact(() => fireEvent.submit(form))
}
const submitButton = (dialog: HTMLElement) => {
  const button = dialog.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (!button) throw new Error("The controller must expose its Create button")
  return button
}

type Example = "React" | "React copied example" | "Vue preview" | "Vue copied example"
const mount = async (example: Example) => {
  if (example === "React") return render(<PopoverControllerDemo />)
  if (example === "React copied example") return render(<CopiedReactControllerDemo />)
  if (example === "Vue preview") return render(<VuePopoverDemo template={template} state={{ prompt: "", submitting: false }} />)
  const Component = defineComponent({
    components: { Popover, PopoverContent, PopoverTrigger, Button, Textarea, Sparkles },
    setup: () => {
      const scope: unknown = copiedSetup(ref, onBeforeUnmount, () => ref(false))
      if (!scope || typeof scope !== "object") throw new Error("The copied setup must return its scope")
      return { ...scope }
    },
    template,
  })
  const view = mountVue(() => h(Component))
  await flushVue()
  return view
}

describe.each<Example>(["React", "React copied example", "Vue preview", "Vue copied example"])("%s Popover controller demo", (example) => {
  test("validation keeps the panel open and a successful request closes after two seconds", async () => {
    await mount(example)
    const dialog = await open()
    await submit(dialog)
    await advance(32)
    expect(dialog.getAttribute("data-animate")).toBe("shake")
    expect(dialog.isConnected).toBe(true)
    await fill(dialog, "Draft instructions")
    await submit(dialog)
    expect(submitButton(dialog).getAttribute("aria-disabled")).toBe("true")
    await advance(1999)
    expect(dialog.isConnected).toBe(true)
    await advance(1)
    expect(page().queryByRole("dialog", { hidden: true })).toBeNull()
  })

  test.each([true, false])("an old request cannot close a session reopened before its deadline (animations disabled: %s)", async (disabled) => {
    animation.disabled = disabled
    await mount(example)
    const first = await open()
    await fill(first, "Old prompt")
    await submit(first)
    await advance(500)
    await click(page().getByRole("button", { name: "Generate" }))
    if (disabled) expect(page().queryByRole("dialog", { hidden: true })).toBeNull()
    else {
      expect(first.isConnected).toBe(true)
      expect(within(first).getByRole("textbox", { hidden: true })).toHaveProperty("value", "Old prompt")
      expect(submitButton(first).getAttribute("aria-disabled")).toBe("true")
    }
    const next = await open()
    const input = next.querySelector("textarea")
    if (!input) throw new Error("The reopened controller must expose its prompt")
    const freshValue = input.value
    const freshLoading = submitButton(next).getAttribute("aria-disabled")
    await fill(next, "New prompt")
    await advance(1500)
    expect(page().getByRole("dialog", { hidden: true })).toBe(next)
    expect(freshValue).toBe("")
    expect(freshLoading).toBe("false")
    expect(within(next).getByRole("textbox", { hidden: true })).toHaveProperty("value", "New prompt")
    await submit(next)
    await advance(1999)
    expect(next.isConnected).toBe(true)
    await advance(1)
    if (!disabled) {
      await advance(50)
      await advance(350)
    }
    expect(page().queryByRole("dialog", { hidden: true })).toBeNull()
  })

  test("unmount cancels the pending request", async () => {
    const view = await mount(example)
    const dialog = await open()
    await fill(dialog, "Pending prompt")
    await submit(dialog)
    await interact(() => view.unmount())
    await advance(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
