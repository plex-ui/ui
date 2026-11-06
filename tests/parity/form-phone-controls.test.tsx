import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { ComponentPreview } from "../../components/docs/ComponentPreview"
import { FormRowsGroupsDemo } from "../../components/docs/FormRowsDemos"
import { PreviewEmbed } from "../../components/docs/PreviewEmbed"
import { PreviewViewportProvider, usePreviewViewport } from "../../components/docs/PreviewViewport"
import { VueFormExampleDemo } from "../../components/docs/vue/VueFormExamplesDemos"
import type { VuePreviewProps } from "../../components/docs/VuePreviewRuntime"

// The parent remains physically desktop-sized while its example is set to Phone.
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => true }))
vi.mock("next/navigation", () => ({ usePathname: () => "/components/form-examples" }))
vi.mock("fumadocs-ui/components/dynamic-codeblock", () => ({ DynamicCodeBlock: () => null }))
// Keep this test on the React host/control bridge. An uncontrolled field detects
// accidental remounts; VuePreviewRuntime's rendering is covered by its own tests.
vi.mock("../../components/docs/VuePreview", () => ({
  VuePreview: ({ props }: VuePreviewProps) => <section data-field-columns={props?.columns ? "" : undefined}>
    <input aria-label="Name" defaultValue="Oak side table" />
  </section>,
}))

function ViewportControls() {
  const { change } = usePreviewViewport()
  return <><button onClick={() => change("phone")}>Use Phone</button><button onClick={() => change("desktop")}>Use Desktop</button></>
}

function Groups({ framework }: { framework: string }) {
  return framework === "React" ? <FormRowsGroupsDemo /> : <VueFormExampleDemo
    template={'<FieldGroup :columns="columns" />'}
    controls={[{ name: "columns", type: "boolean", default: false }]}
    phoneControls={[{ name: "columns", type: "boolean", default: true }]}
  />
}

const parentDescriptor = Object.getOwnPropertyDescriptor(window, "parent")

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => {
  cleanup()
  if (parentDescriptor) Object.defineProperty(window, "parent", parentDescriptor)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe.each(["React", "Vue"])("%s Phone form control defaults", (framework) => {
  test("publishes the Phone default from a desktop parent and preserves an explicit override across mode changes", async () => {
    const parent = render(<PreviewViewportProvider>
      <ViewportControls />
      <ComponentPreview previewId="groups" phonePresentation="screen"><Groups framework={framework} /></ComponentPreview>
    </PreviewViewportProvider>)
    const parentQueries = within(parent.container)
    const columns = () => parentQueries.getByRole("switch", { name: "columns" })
    expect(columns().getAttribute("aria-checked")).toBe("false")
    const input = parentQueries.getByLabelText("Name")
    fireEvent.change(input, { target: { value: "Edited product" } })

    fireEvent.click(parentQueries.getByText("Use Phone"))
    expect(columns().getAttribute("aria-checked")).toBe("true")
    fireEvent.click(parentQueries.getByRole("radio", { name: "Plain", exact: true }))
    expect(parentQueries.getByLabelText("Name")).toBe(input)
    expect(input).toHaveProperty("value", "Edited product")

    const simulatedParent = { postMessage: vi.fn() }
    Object.defineProperty(window, "parent", { configurable: true, value: simulatedParent })
    const iframe = render(<PreviewEmbed target="groups"><Groups framework={framework} /></PreviewEmbed>)
    const frameColumns = () => within(iframe.container).getByRole("switch", { name: "columns", hidden: true })
    const connect = () => {
      const frame = parentQueries.getByTitle<HTMLIFrameElement>("Phone preview")
      const target = frame.contentWindow
      if (!target) throw new Error("Phone iframe has no window")
      const post = vi.spyOn(target, "postMessage").mockImplementation((data: unknown) => {
        window.dispatchEvent(new MessageEvent("message", {
          origin: window.location.origin, source: simulatedParent as unknown as Window, data,
        }))
      })
      act(() => window.dispatchEvent(new MessageEvent("message", {
        origin: window.location.origin, source: target, data: { previewKey: "groups", demoReady: true },
      })))
      return post
    }
    const post = connect()
    await waitFor(() => expect(frameColumns().getAttribute("aria-checked")).toBe("true"))
    await waitFor(() => expect(within(iframe.container).getByRole("radio", { name: "Plain", exact: true, hidden: true }).getAttribute("aria-checked")).toBe("true"))
    // Reconnection replays every control, so columns need not be the last message.
    expect(post).toHaveBeenCalledWith({ previewKey: "groups", demoControl: { name: "columns", value: true } }, window.location.origin)

    fireEvent.click(columns())
    await waitFor(() => expect(frameColumns().getAttribute("aria-checked")).toBe("false"))
    fireEvent.click(parentQueries.getByText("Use Desktop"))
    fireEvent.click(parentQueries.getByText("Use Phone"))
    expect(columns().getAttribute("aria-checked")).toBe("false")
    expect(parentQueries.getByRole("radio", { name: "Plain", exact: true }).getAttribute("aria-checked")).toBe("true")
    expect(parentQueries.getByLabelText("Name")).toBe(input)
    expect(input).toHaveProperty("value", "Edited product")
    const reconnect = connect()
    await waitFor(() => expect(frameColumns().getAttribute("aria-checked")).toBe("false"))
    expect(reconnect).toHaveBeenCalledWith({ previewKey: "groups", demoControl: { name: "columns", value: false } }, window.location.origin)
  })
})
