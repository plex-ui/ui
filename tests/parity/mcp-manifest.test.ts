import { readdirSync, readFileSync } from "node:fs"
import { afterEach, describe, expect, test, vi } from "vitest"
import { formScreenTemplate } from "../../components/docs/formScreenTemplate"
import { extractExamples, parsePage } from "../../scripts/generate-mcp-manifest.mjs"

type Example = { name: string; code: string }
const examplesOf = (content: string): Example[] => extractExamples(content, parsePage(content))
// Paths from the repository root, where vitest runs (jsdom replaces URL, so no import.meta.url here).
const read = (path: string) => readFileSync(path, "utf8")

afterEach(() => vi.restoreAllMocks())

// The MCP manifest reads a preview's code in a sandbox. A page that builds that code with the imported
// formScreenTemplate helper must still get the whole Page in the manifest, not a skipped example or a raw call.
describe.each([
  ["checkbox", "Grouped sections", "Notifications"],
  ["radio-group", "Grouped sections", "Preferences"],
  ["select-control", "Phone form", "Phone number"],
])("Vue %s: %s", (slug, name, title) => {
  test("the manifest keeps the screen the imported helper builds", () => {
    const example = examplesOf(read(`content/vue/components/${slug}.mdx`)).find((entry) => entry.name === name)
    expect(example, `${name} must not be skipped`).toBeDefined()
    // Everything the helper writes before the form, taken from the helper so a markup change cannot stale this.
    expect(example!.code).toContain(formScreenTemplate(title, "").split("<form")[0])
    expect(example!.code).toContain("<FieldGroup")
    expect(example!.code).not.toContain("formScreenTemplate(")
  })
})

test("an aliased template helper preserves optional submit and validation arguments", () => {
  const examples = examplesOf(`import { formScreenTemplate as screen } from "@/components/docs/formScreenTemplate"

export const code = screen("Payment", "<input required />", "Pay", "save", true)

### Payment

<ComponentPreview code={code} />`)
  expect(examples).toHaveLength(1)
  expect(examples[0].code).toBe(formScreenTemplate("Payment", "<input required />", "Pay", "save", true))
  expect(examples[0].code).toMatch(/@submit.prevent="save" novalidate/)
  expect(examples[0].code).toMatch(/>Pay<\/Button>/)
})

// The generator warns when it cannot resolve a preview's code and leaves the example out of the manifest.
test.each(["content/components", "content/vue/components"])("no page in %s loses an example", (dir) => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  const pages = readdirSync(dir).filter((file) => file.endsWith(".mdx"))
  expect(pages.length).toBeGreaterThan(50)
  const skipped = pages.flatMap((file) => {
    warn.mockClear()
    examplesOf(read(`${dir}/${file}`))
    return warn.mock.calls.map((call) => `${file}: ${call.join(" ")}`)
  })
  expect(skipped).toEqual([])
})
