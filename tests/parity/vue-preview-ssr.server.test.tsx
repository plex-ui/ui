// @vitest-environment node
import { prerender } from "react-dom/static"
import { describe, expect, test } from "vitest"
import VuePreviewRuntime from "../../components/docs/VuePreviewRuntime"

// Row 88: on the server a Vue example renders its markup into the page, so the first paint is not an
// empty stage that grows once the browser mounts Vue (the browser half: vue-preview-ssr.test.tsx).

const html = async (element: React.ReactElement) => {
  const { prelude } = await prerender(element)
  return await new Response(prelude).text()
}

describe("a Vue example on the server", () => {
  test("renders its template with its props into the host, inert until the browser mounts it", async () => {
    const markup = await html(<VuePreviewRuntime template={`<Button color="primary">{{ label }}</Button>`} props={{ label: "Save changes" }} />)
    expect(markup).toMatch(/^<div data-vue-root="" class="contents" inert=""><button[^>]*>/)
    expect(markup).toContain("Save changes")
  })

  test("renders props that refer back to themselves, as an example's refs and computeds do", async () => {
    const node: { name: string; self?: unknown } = { name: "Overview" }
    node.self = node
    const markup = await html(<VuePreviewRuntime template={`<span data-node>{{ node.name }}</span>`} props={{ node }} />)
    expect(markup).toContain("<span data-node>Overview</span>")
  })

  test("leaves the host empty when the example cannot render without a browser", async () => {
    const markup = await html(<VuePreviewRuntime template={`<p>{{ missing.deeper }}</p>`} props={{}} />)
    expect(markup).toBe(`<div data-vue-root="" class="contents"></div>`)
  })
})
