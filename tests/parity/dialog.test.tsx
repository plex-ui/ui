import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Button as VueButton } from "../../packages/vue/src/components/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../packages/vue/src/components/Dialog"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

type ContentProps = { width?: number | string; showClose?: boolean; className?: string }

// Click handlers on the Trigger and Close children; preventDefault() in one
// must cancel the dialog action in both frameworks
type ClickHandler = (event: { preventDefault(): void }) => void
type ChildClicks = { onTriggerClick?: ClickHandler; onCloseClick?: ClickHandler }

const ReactExample = ({
  open,
  onOpenChange,
  content = {},
  onTriggerClick,
  onCloseClick,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  content?: ContentProps
} & ChildClicks) => (
  <ReactDialog open={open} onOpenChange={onOpenChange}>
    <ReactDialog.Trigger>
      <ReactButton color="primary" onClick={(event) => onTriggerClick?.(event)}>
        Open dialog
      </ReactButton>
    </ReactDialog.Trigger>
    <ReactDialog.Content {...content}>
      <ReactDialog.Header className="header">
        <ReactDialog.Title>Unsaved changes</ReactDialog.Title>
        <ReactDialog.Description>Save before leaving?</ReactDialog.Description>
      </ReactDialog.Header>
      <p>Body</p>
      <ReactDialog.Footer>
        <ReactDialog.Close>
          <ReactButton color="secondary" variant="soft" onClick={(event) => onCloseClick?.(event)}>
            Cancel
          </ReactButton>
        </ReactDialog.Close>
        <ReactButton color="primary">Save</ReactButton>
      </ReactDialog.Footer>
    </ReactDialog.Content>
  </ReactDialog>
)

const vueExample = (
  state: { open?: boolean; content?: ContentProps },
  onOpenChange?: (open: boolean) => void,
  { onTriggerClick, onCloseClick }: ChildClicks = {},
) => {
  const { className, ...content } = state.content ?? {}
  return h(
    Dialog,
    { "open": state.open, "onUpdate:open": onOpenChange },
    {
      default: () => [
        h(DialogTrigger, null, {
          default: () => h(VueButton, { onClick: (event: MouseEvent) => onTriggerClick?.(event) }, { default: () => "Open dialog" }),
        }),
        h(DialogContent, { ...content, class: className }, {
          default: () => [
            h(DialogHeader, { class: "header" }, {
              default: () => [
                h(DialogTitle, null, { default: () => "Unsaved changes" }),
                h(DialogDescription, null, { default: () => "Save before leaving?" }),
              ],
            }),
            h("p", null, "Body"),
            h(DialogFooter, null, {
              default: () => [
                h(DialogClose, null, {
                  default: () =>
                    h(
                      VueButton,
                      { color: "secondary", variant: "soft", onClick: (event: MouseEvent) => onCloseClick?.(event) },
                      { default: () => "Cancel" },
                    ),
                }),
                h(VueButton, null, { default: () => "Save" }),
              ],
            }),
          ],
        }),
      ],
    },
  )
}

const reactDom = async (props: { open?: boolean; content?: ContentProps }) => {
  await act(async () => {
    render(<ReactExample {...props} />)
  })
  const dom = serializeDom()
  cleanup()
  return dom
}

const vueDom = async (props: { open?: boolean; content?: ContentProps }) => {
  const { unmount } = mountVue(() => vueExample(props))
  await flushVue()
  const dom = serializeDom()
  unmount()
  return dom
}

const cases: Array<[string, { open?: boolean; content?: ContentProps }]> = [
  ["closed", {}],
  ["open", { open: true }],
  ["open, numeric width", { open: true, content: { width: 640 } }],
  ["open, string width", { open: true, content: { width: "40rem" } }],
  ["open, no close button", { open: true, content: { showClose: false } }],
  ["open, panel class", { open: true, content: { className: "custom" } }],
]

describe("Dialog parity", () => {
  test.each(cases)("%s", async (_name, props) => {
    const react = await reactDom(props)
    const vue = await vueDom(props)
    expect(vue).toBe(react)
  })

  test("open renders the panel, labelled by its title and described by its description", async () => {
    for (const dom of [await reactDom({ open: true }), await vueDom({ open: true })]) {
      expect(dom).toContain('role="dialog"')
      expect(dom).toContain('aria-label="Close dialog"')
      expect(dom).toContain('style="--dialog-width: 480px"')
      const titleId = dom.match(/<h2 class="Title" id="(gen-\d+)">/)?.[1]
      const descriptionId = dom.match(/<p class="Description" id="(gen-\d+)">/)?.[1]
      expect(titleId).toBeDefined()
      expect(descriptionId).toBeDefined()
      expect(dom).toContain(`aria-labelledby="${titleId}"`)
      expect(dom).toContain(`aria-describedby="${descriptionId}"`)
      expect(dom).not.toContain("[missing]")
    }
  })
})

describe("Dialog behaviour parity", () => {
  // Runs the same interaction on both and returns DOM snapshots plus the
  // open-state changes the dialog reported.
  const walk = async (
    interact: (step: (name: string) => Promise<void>) => Promise<void>,
    clicks: ChildClicks = {},
  ): Promise<{ react: string[]; vue: string[]; reactChanges: boolean[]; vueChanges: boolean[] }> => {
    const reactChanges: boolean[] = []
    const react: string[] = []
    await act(async () => {
      render(<ReactExample onOpenChange={(open) => reactChanges.push(open)} {...clicks} />)
    })
    await interact(async () => {
      react.push(serializeDom())
    })
    cleanup()

    const vueChanges: boolean[] = []
    const vue: string[] = []
    const state = reactive({})
    mountVue(() => vueExample(state, (open) => vueChanges.push(open), clicks))
    await flushVue()
    await interact(async () => {
      await flushVue()
      vue.push(serializeDom())
    })

    return { react, vue, reactChanges, vueChanges }
  }

  const click = async (selector: string) => {
    await act(async () => {
      fireEvent.click(document.querySelector(selector)!)
    })
    await flushVue()
  }

  const pressEscape = async () => {
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape", code: "Escape" })
    })
    await flushVue()
  }

  test("trigger opens, close button closes", async () => {
    const result = await walk(async (snapshot) => {
      await click('button[aria-haspopup="dialog"]')
      await snapshot("open")
      await click('button[aria-label="Close dialog"]')
      await snapshot("closed")
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([true, false])
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[1]).not.toContain('role="dialog"')
  })

  test("Dialog.Close child closes", async () => {
    const result = await walk(async (snapshot) => {
      await click('button[aria-haspopup="dialog"]')
      await click('[class~="Footer"] button')
      await snapshot("closed")
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([true, false])
  })

  test("preventDefault in the trigger child's click keeps it closed", async () => {
    const result = await walk(
      async (snapshot) => {
        await click('button[aria-haspopup="dialog"]')
        await snapshot("still closed")
      },
      { onTriggerClick: (event) => event.preventDefault() },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.reactChanges).toEqual([])
    expect(result.vueChanges).toEqual([])
    expect(result.react[0]).not.toContain('role="dialog"')
  })

  test("preventDefault in the close child's click keeps it open", async () => {
    const result = await walk(
      async (snapshot) => {
        await click('button[aria-haspopup="dialog"]')
        await click('[class~="Footer"] button')
        await snapshot("still open")
      },
      { onCloseClick: (event) => event.preventDefault() },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.reactChanges).toEqual([true])
    expect(result.vueChanges).toEqual([true])
    expect(result.react[0]).toContain('role="dialog"')
  })

  test("Escape closes", async () => {
    const result = await walk(async (snapshot) => {
      await click('button[aria-haspopup="dialog"]')
      await pressEscape()
      await snapshot("closed")
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueChanges).toEqual(result.reactChanges)
    expect(result.reactChanges).toEqual([true, false])
    expect(result.react[0]).not.toContain('role="dialog"')
  })
})
