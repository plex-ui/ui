import { readFileSync } from "node:fs"
import { compileSync, evaluateSync } from "@mdx-js/mdx"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import * as runtime from "react/jsx-runtime"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { ComponentPreview } from "../../components/docs/ComponentPreview"
import { PreviewEmbed } from "../../components/docs/PreviewEmbed"
import { remarkPreviewId } from "../../lib/remark-preview-id"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Popover as ReactPopover } from "../../packages/ui/src/components/Popover"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../packages/vue/src/components/Dialog"
import { flushVue, mountVue } from "./harness"

vi.mock("next/navigation", () => ({ usePathname: () => "/components/form-examples" }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => true }))
vi.mock("fumadocs-ui/components/dynamic-codeblock", () => ({ DynamicCodeBlock: () => null }))

const repeatedExamples = `
<ComponentPreview code="identical example"><Demo label="Verify email" /></ComponentPreview>

<div>
  <ComponentPreview code="identical example"><Demo label="Confirm phone" /></ComponentPreview>
</div>
`

const Demo = ({ label }: { label: string }) => <div>{label}</div>

const compiledIds = (source: string) =>
  Array.from(
    String(compileSync(source, { remarkPlugins: [remarkPreviewId] })).matchAll(/previewId: "(preview-\d+)"/g),
    (match) => match[1],
  )

describe("Phone preview identity", () => {
  test.each([
    ["preview-1", "Verify email", "Confirm phone"],
    ["preview-2", "Confirm phone", "Verify email"],
  ])("%s mounts only its example even with identical code and component names", (target, expected, other) => {
    const { default: Page } = evaluateSync(repeatedExamples, { ...runtime, remarkPlugins: [remarkPreviewId] })
    const view = render(
      <PreviewEmbed target={target}>
        <Page components={{ ComponentPreview, Demo }} />
      </PreviewEmbed>,
    )
    expect(view.getByText(expected)).toBeTruthy()
    expect(view.queryByText(other)).toBeNull()
    expect(view.container.querySelectorAll("[data-preview-embed]")).toHaveLength(1)
  })

  test("the transform is deterministic across compilations and resets for each page", () => {
    expect(compiledIds(repeatedExamples)).toEqual(["preview-1", "preview-2"])
    expect(compiledIds(repeatedExamples)).toEqual(["preview-1", "preview-2"])
    expect(compiledIds('<ComponentPreview code="identical example" />')).toEqual(["preview-1"])
  })

  test.each(["content/components/form-examples.mdx", "content/vue/components/form-examples.mdx"])(
    "%s assigns a unique identity to every preview",
    (path) => {
      const source = readFileSync(path, "utf8")
      const ids = compiledIds(source)
      expect(ids.length).toBeGreaterThan(10)
      expect(ids).toHaveLength(source.match(/<ComponentPreview(?:\s|>)/g)?.length ?? 0)
      expect(new Set(ids).size).toBe(ids.length)
    },
  )
})

describe("Phone modal scrim reporting", () => {
  const parentDescriptor = Object.getOwnPropertyDescriptor(window, "parent")
  const postMessage = vi.fn()

  beforeEach(() => {
    postMessage.mockClear()
    Object.defineProperty(window, "parent", { configurable: true, value: { postMessage } })
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })

  afterEach(() => {
    cleanup()
    if (parentDescriptor) Object.defineProperty(window, "parent", parentDescriptor)
    vi.unstubAllGlobals()
  })

  const expectModal = async (open: boolean) => {
    await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ previewKey: "preview-1", previewDialogOpen: open }),
      window.location.origin,
    ))
  }

  test("a portalled Popover with role=dialog does not dim the phone", async () => {
    render(
      <PreviewEmbed target="preview-1">
        <div data-preview-embed>
          <ReactPopover open>
            <ReactPopover.Trigger><button>Category</button></ReactPopover.Trigger>
            <ReactPopover.Content><p>Category options</p></ReactPopover.Content>
          </ReactPopover>
        </div>
      </PreviewEmbed>,
    )
    await waitFor(() => expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeTruthy())
    expect(document.querySelector("[data-plex-dialog]")).toBeNull()
    await expectModal(false)
    expect(postMessage.mock.calls.some(([message]) => message.previewDialogOpen === true)).toBe(false)
  })

  test.each(["React", "Vue"])("%s Dialog portals dim the phone only while open", async (framework) => {
    const stage = render(<PreviewEmbed target="preview-1"><div data-preview-embed /></PreviewEmbed>)
    await expectModal(false)
    if (framework === "React") {
      const example = (open: boolean) => (
        <ReactDialog open={open}>
          <ReactDialog.Content>
            <ReactDialog.Title>Confirm</ReactDialog.Title>
            <ReactDialog.Description>Save these changes?</ReactDialog.Description>
          </ReactDialog.Content>
        </ReactDialog>
      )
      const dialog = render(example(true))
      await expectModal(true)
      dialog.rerender(example(false))
    } else {
      const state = reactive({ open: true })
      mountVue(() => h(Dialog, { open: state.open }, {
        default: () => h(DialogContent, null, {
          default: () => [
            h(DialogTitle, null, () => "Confirm"),
            h(DialogDescription, null, () => "Save these changes?"),
          ],
        }),
      }))
      await flushVue()
      await expectModal(true)
      await act(async () => { state.open = false; await flushVue() })
    }
    await expectModal(false)
    expect(stage.container.querySelector('[role="dialog"]')).toBeNull()
  })
})
