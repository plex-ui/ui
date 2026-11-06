import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useId } from "react"
import { h, ref } from "vue"
import { Button as ReactButton } from "@plexui/ui/components/Button"
import { Button as VueButton } from "@plexui/vue/components/Button"
import { AuthFormStage } from "../../components/docs/AuthFormStage"
import { createDemoControlChannel, DemoControlHostContext, PreviewEmbed } from "../../components/docs/PreviewEmbed"
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

const mountShell = async (framework: string, dialog: boolean, phone = false, surface?: "plain" | "grouped") => {
  const onClose = vi.fn()
  if (framework === "React") {
    const shell = (
      <AuthFormStage title="Welcome back" dialog={dialog} onDialogChange={onClose} surface={surface}>
        <form><input aria-label="Email" /></form>
      </AuthFormStage>
    )
    render(phone ? <PreviewEmbed target="preview-1">{shell}</PreviewEmbed> : shell)
  } else {
    mountVue(() => h(formExamplesScope.AuthFormStage, {
      'title': "Welcome back",
      dialog,
      surface,
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

type FooterFormProps = { label: string; dialog: boolean; onSubmit: () => void }

function ReactFooterForm({ label, dialog, onSubmit }: FooterFormProps) {
  const formId = useId()
  const action = <ReactButton type="submit" form={formId} data-auth-submit={label}>Continue {label}</ReactButton>
  return (
    <AuthFormStage title={label} dialog={dialog} footer={action}>
      <form id={formId} data-auth-form={label} onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
        <input aria-label={`${label} value`} />
        {viewport.wide && action}
      </form>
    </AuthFormStage>
  )
}

const mountFooterShells = async (framework: string, forms: FooterFormProps[]) => {
  if (framework === "React") {
    render(<>{forms.map((form) => <ReactFooterForm key={form.label} {...form} />)}</>)
  } else {
    mountVue(() => h("div", forms.map(({ label, dialog, onSubmit }) => {
      const action = (formId: string) => h(VueButton, {
        type: "submit", form: formId, "data-auth-submit": label,
      }, () => `Continue ${label}`)
      return h(formExamplesScope.AuthFormStage, { key: label, title: label, dialog, mobile: !viewport.wide }, {
        default: ({ formId }: { formId: string }) => h("form", {
          id: formId,
          "data-auth-form": label,
          onSubmit: (event: Event) => { event.preventDefault(); onSubmit() },
        }, [h("input", { "aria-label": `${label} value` }), viewport.wide ? action(formId) : null]),
        footer: ({ formId }: { formId: string }) => action(formId),
      })
    })))
    await flushVue()
  }
}

afterEach(() => { cleanup(); viewport.wide = false })

describe.each(["React", "Vue"])("%s auth form screen", (framework) => {
  test("uses one Page toolbar reserve in form mode", async () => {
    await mountShell(framework, false)
    // A phone Toolbar takes the place of Page.Header.
    expect(document.querySelectorAll('.Page [data-toolbar][data-placement="top"] [aria-label="Back to previous example"]')).toHaveLength(1)
    expect(document.querySelector(".Page .Header")).toBeNull()
    expect(document.querySelectorAll(".Page .Content form")).toHaveLength(1)
    expect(document.querySelector(".Page")?.getAttribute("data-surface")).toBe("grouped")
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector(".Footer")).toBeNull()
    expect(document.querySelector('[data-toolbar][data-placement="bottom"]')).toBeNull()
  })

  test("mobile dialog uses a Sheet without an extra Page toolbar and focuses its heading", async () => {
    const onClose = await mountShell(framework, true)
    const dialog = document.querySelector('[data-plex-dialog][data-mobile-variant="sheet"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("data-surface")).toBe("grouped")
    expect(dialog?.querySelector(".Panel.Sheet")).toBeTruthy()
    expect(document.querySelector(".Page")).toBeNull()
    expect(dialog?.querySelector(".Body form")).toBeTruthy()
    expect(dialog?.querySelector(".Header [tabindex='-1']")).toBe(document.activeElement)
    await act(async () => { fireEvent.click(document.querySelector('[aria-label="Close dialog"]')!); await flushVue() })
    expect(onClose).toHaveBeenCalledWith(false)
  })

  test.each([false, true])("a flow can choose plain surface in Page/Sheet (dialog=%s)", async (dialog) => {
    await mountShell(framework, dialog, true, "plain")
    const shell = document.querySelector(dialog ? '[data-plex-dialog]' : '.Page')
    expect(shell?.getAttribute("data-surface")).toBe("plain")
    expect(shell?.querySelectorAll("form")).toHaveLength(1)
    expect(document.querySelectorAll('.Page [data-toolbar] [aria-label="Back to previous example"]')).toHaveLength(dialog ? 0 : 1)
    expect(shell?.querySelector('input[aria-label="Email"]')).toBeTruthy()
  })

  test.each([false, true])("surface changes preserve the input node, value and selection (dialog=%s)", async (dialog) => {
    let setSurface: (surface: "plain" | "grouped") => void
    if (framework === "React") {
      const shell = (surface: "plain" | "grouped") => (
        <AuthFormStage title="Edit account" dialog={dialog} surface={surface}>
          <input aria-label="Account name" defaultValue="Ada" />
        </AuthFormStage>
      )
      const result = render(shell("grouped"))
      setSurface = (surface) => result.rerender(shell(surface))
    } else {
      const surface = ref<"plain" | "grouped">("grouped")
      mountVue(() => h(formExamplesScope.AuthFormStage, { title: "Edit account", mobile: true, dialog, surface: surface.value }, {
        default: () => h("input", { "aria-label": "Account name", defaultValue: "Ada" }),
      }))
      setSurface = (next) => { surface.value = next }
      await flushVue()
    }
    const input = document.querySelector<HTMLInputElement>('[aria-label="Account name"]')!
    input.focus()
    fireEvent.input(input, { target: { value: "Ada Lovelace" } })
    input.setSelectionRange(4, 8)
    for (const surface of ["plain", "grouped"] as const) {
      await act(async () => { setSurface(surface); await flushVue() })
      expect(document.querySelector('[aria-label="Account name"]')).toBe(input)
      expect(input.value).toBe("Ada Lovelace")
      expect(input.selectionStart).toBe(4)
      expect(input.selectionEnd).toBe(8)
      expect(document.activeElement).toBe(input)
      expect(document.querySelector(dialog ? "[data-plex-dialog]" : ".Page")?.getAttribute("data-surface")).toBe(surface)
    }
  })

  test("Phone inspection keeps the Sheet open when Close is pressed", async () => {
    const onClose = await mountShell(framework, true, true)
    await act(async () => { fireEvent.click(document.querySelector('[aria-label="Close dialog"]')!); await flushVue() })
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector('[data-plex-dialog][data-state="open"]')).toBeTruthy()
  })

  test("a storage Sheet's Back action reaches its owner without closing the dialog", async () => {
    const onBack = vi.fn()
    const onClose = vi.fn()
    if (framework === "React") {
      render(<AuthFormStage title="Choose Storage Location" dialog onBack={onBack} backLabel="Back to password" onDialogChange={onClose}>
        <p>Choose a storage location.</p>
      </AuthFormStage>)
    } else {
      mountVue(() => h(formExamplesScope.AuthFormStage, {
        title: "Choose Storage Location", dialog: true, mobile: true, onBack, backLabel: "Back to password", 'onUpdate:dialog': onClose,
      }, () => h("p", "Choose a storage location.")))
      await flushVue()
    }
    const back = document.querySelector<HTMLButtonElement>('[data-toolbar][data-placement="top"] [aria-label="Back to password"]')
    expect(back).toBeTruthy()
    expect(document.querySelector('[aria-label="Close dialog"]')).toBeNull()
    await act(async () => { fireEvent.click(back!); await flushVue() })
    expect(onBack).toHaveBeenCalledTimes(1)
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

  test("the hidden Phone host keeps its Page while the dialog control changes", async () => {
    viewport.wide = true
    let setDialog: (value: boolean) => void
    if (framework === "React") {
      const channel = createDemoControlChannel("preview-auth", "host")
      const shell = (dialog: boolean) => <DemoControlHostContext.Provider value={channel}>
        <AuthFormStage title="Hidden host" dialog={dialog}><input aria-label="Host email" defaultValue="ada@plexui.com" /></AuthFormStage>
      </DemoControlHostContext.Provider>
      const result = render(shell(false))
      setDialog = (dialog) => result.rerender(shell(dialog))
    } else {
      const dialog = ref(false)
      mountVue(() => h(formExamplesScope.AuthFormStage, { title: "Hidden host", dialog: dialog.value, phoneHost: true }, () =>
        h("input", { "aria-label": "Host email", defaultValue: "ada@plexui.com" })))
      setDialog = (value) => { dialog.value = value }
      await flushVue()
    }
    const input = document.querySelector('[aria-label="Host email"]')
    await act(async () => { setDialog(true); await flushVue() })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector(".DesktopOverlay")).toBeNull()
    expect(document.querySelector(".Page")).toBeTruthy()
    expect(document.querySelector('[aria-label="Host email"]')).toBe(input)
  })
})


describe.each(["React", "Vue"])("%s optional auth footer", (framework) => {
  test.each([
    { name: "Phone Page", wide: false, dialog: false },
    { name: "Phone Sheet", wide: false, dialog: true },
    { name: "Desktop Page", wide: true, dialog: false },
    { name: "Desktop dialog frame", wide: true, dialog: true },
  ])("$name renders one action and submits its associated form once", async ({ wide, dialog }) => {
    viewport.wide = wide
    const submitted = vi.fn()
    await mountFooterShells(framework, [{ label: "Password", dialog, onSubmit: submitted }])
    const form = document.querySelector<HTMLFormElement>('[data-auth-form="Password"]')
    const actions = document.querySelectorAll<HTMLButtonElement>('[data-auth-submit="Password"]')
    expect(form).toBeTruthy()
    expect(actions).toHaveLength(1)
    const action = actions[0]
    expect(action.form).toBe(form)
    expect(form?.contains(action)).toBe(wide)
    // On a phone the action sits in a bottom Toolbar, which takes the place of the footer.
    expect(document.querySelectorAll(".Footer")).toHaveLength(0)
    expect(document.querySelectorAll('[data-toolbar][data-placement="bottom"]')).toHaveLength(wide ? 0 : 1)
    if (!wide) {
      expect(action.closest('[data-toolbar][data-placement="bottom"]')).toBeTruthy()
      // The scrolling content that holds the form; Toolbar.Content is a different element.
      const content = dialog ? form?.closest(".Body") : form?.closest(".Content")
      expect(content).toBeTruthy()
      expect(content?.contains(action)).toBe(false)
      expect(document.querySelector(dialog ? '[data-plex-dialog][data-mobile-variant="sheet"]' : ".Page")).toBeTruthy()
    }
    await act(async () => { fireEvent.click(action); await flushVue() })
    expect(submitted).toHaveBeenCalledTimes(1)
  })

  test("sibling shells expose distinct form IDs and each footer submits only its own form", async () => {
    const first = vi.fn()
    const second = vi.fn()
    await mountFooterShells(framework, [
      { label: "Phone", dialog: false, onSubmit: first },
      { label: "Password", dialog: false, onSubmit: second },
    ])
    const forms = [...document.querySelectorAll<HTMLFormElement>("[data-auth-form]")]
    const actions = [...document.querySelectorAll<HTMLButtonElement>("[data-auth-submit]")]
    expect(forms).toHaveLength(2)
    expect(actions).toHaveLength(2)
    expect(forms.every((form) => Boolean(form.id))).toBe(true)
    expect(new Set(forms.map((form) => form.id)).size).toBe(2)
    expect(actions.map((action) => action.form)).toEqual(forms)
    await act(async () => { fireEvent.click(actions[1]); await flushVue() })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    await act(async () => { fireEvent.click(actions[0]); await flushVue() })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})
