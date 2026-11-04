import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { AuthFormStage } from "../../components/docs/AuthFormStage"
import { PreviewEmbed } from "../../components/docs/PreviewEmbed"
import { formExamplesScope } from "../../components/docs/vue/VueFormExamplesDemos"
import { flushVue, mountVue } from "./harness"

const viewport = vi.hoisted(() => ({ wide: false }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => viewport.wide }))
vi.mock("@plexui/ui/components/Dialog", async () => await import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/ui/components/Page", async () => await import("../../packages/ui/src/components/Page"))
vi.mock("@plexui/vue/components/Dialog", async () => await import("../../packages/vue/src/components/Dialog"))
vi.mock("@plexui/vue/components/Page", async () => await import("../../packages/vue/src/components/Page"))
// The wrapper's runtime is lazy and unrelated to its exported Vue form shell.
vi.mock("../../components/docs/vue/VueDemo", () => ({ VueDemo: () => null }))

const mountShell = async (framework: string, dialog: boolean, phone = false) => {
  const onClose = vi.fn()
  if (framework === "React") {
    const shell = (
      <AuthFormStage title="Welcome back" dialog={dialog} onDialogChange={onClose}>
        <form><input aria-label="Email" /></form>
      </AuthFormStage>
    )
    render(phone ? <PreviewEmbed target="preview-1">{shell}</PreviewEmbed> : shell)
  } else {
    mountVue(() => h(formExamplesScope.AuthFormStage, {
      'title': "Welcome back",
      dialog,
      'mobile': !viewport.wide,
      'phonePreview': phone,
      'onUpdate:dialog': onClose,
    }, {
      default: () => h("form", [h("input", { "aria-label": "Email" })]),
    }))
    await flushVue()
  }
  return onClose
}

afterEach(() => { cleanup(); viewport.wide = false })

describe.each(["React", "Vue"])("%s auth form screen", (framework) => {
  test("uses one Page toolbar reserve in form mode", async () => {
    await mountShell(framework, false)
    expect(document.querySelectorAll('.Page .Header[aria-hidden="true"]')).toHaveLength(1)
    expect(document.querySelectorAll(".Page .Content form")).toHaveLength(1)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  test("mobile dialog uses a Sheet without an extra Page toolbar and focuses its heading", async () => {
    const onClose = await mountShell(framework, true)
    const dialog = document.querySelector('[data-plex-dialog][data-mobile-variant="sheet"]')
    expect(dialog).toBeTruthy()
    expect(document.querySelector(".Page")).toBeNull()
    expect(dialog?.querySelector(".Body form")).toBeTruthy()
    expect(dialog?.querySelector(".Header [tabindex='-1']")).toBe(document.activeElement)
    await act(async () => { fireEvent.click(document.querySelector('[aria-label="Close dialog"]')!); await flushVue() })
    expect(onClose).toHaveBeenCalledWith(false)
  })

  test("Phone inspection keeps the Sheet open when Close is pressed", async () => {
    const onClose = await mountShell(framework, true, true)
    await act(async () => { fireEvent.click(document.querySelector('[aria-label="Close dialog"]')!); await flushVue() })
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector('[data-plex-dialog][data-state="open"]')).toBeTruthy()
  })

  test("desktop dialog keeps its inline example frame", async () => {
    viewport.wide = true
    await mountShell(framework, true)
    expect(document.querySelector(".DesktopPanel form")).toBeTruthy()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector(".Page")).toBeNull()
  })
})
