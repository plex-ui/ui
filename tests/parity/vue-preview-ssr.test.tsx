import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import VuePreviewRuntime from "../../components/docs/VuePreviewRuntime"
import { flushVue } from "./harness"

// Row 88: the docs page carries each Vue example's markup from the server, as it does a React example's,
// and the browser mounts Vue over it. The server half runs in tests/parity/vue-preview-ssr.server.test.tsx.

afterEach(() => cleanup())

describe("a Vue example in the browser", () => {
  test("keeps its mounted DOM when the demo controls render the host again", async () => {
    const template = `<p data-label>{{ label }}</p>`
    const { container, rerender } = render(<VuePreviewRuntime template={template} props={{ label: "First" }} />)
    await act(flushVue)
    expect(container.querySelector("[data-label]")?.textContent).toBe("First")
    // React 19 writes innerHTML again for a new dangerouslySetInnerHTML object; the host must not get one.
    rerender(<VuePreviewRuntime template={template} props={{ label: "Second" }} />)
    await act(flushVue)
    expect(container.querySelector("[data-label]")?.textContent).toBe("Second")
  })

  test("hydrates over the markup that came from the server, then replaces it and makes it live", async () => {
    const host = document.createElement("div")
    document.body.append(host)
    host.innerHTML = `<div data-vue-root="" class="contents" inert=""><p data-label>From the server</p></div>`
    // A hydration mismatch would not show in the DOM: React recovers by rendering the host again.
    const onRecoverableError = vi.fn()
    const { container } = render(<VuePreviewRuntime template={`<p data-label>{{ label }}</p>`} props={{ label: "From the browser" }} />, {
      container: host,
      hydrate: true,
      onRecoverableError,
    })
    await act(flushVue)
    expect(onRecoverableError).not.toHaveBeenCalled()
    const labels = [...container.querySelectorAll("[data-label]")].map((node) => node.textContent)
    expect(labels).toEqual(["From the browser"])
    expect(container.querySelector("[data-vue-root]")?.hasAttribute("inert")).toBe(false)
    host.remove()
  })
})
