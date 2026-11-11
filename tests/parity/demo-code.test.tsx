import { readFileSync } from "node:fs"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { StrictMode, useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { DemoControlBoolean } from "../../components/docs/ButtonDemos"
import { ComponentPreview } from "../../components/docs/ComponentPreview"
import { indentCode, renderDemoCode } from "../../components/docs/demoCode.mjs"
import { PreviewViewportProvider } from "../../components/docs/PreviewViewport"
import { createDemoControlChannel, createDemoControlValues, DemoControlHostContext } from "../../components/docs/PreviewEmbed"
import { VueDemo } from "../../components/docs/vue/VueDemo"
import { extractExamples, parsePage } from "../../scripts/generate-mcp-manifest.mjs"

vi.mock("next/navigation", () => ({ usePathname: () => "/components/accordion" }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => true }))
vi.mock("fumadocs-ui/components/dynamic-codeblock", () => ({ DynamicCodeBlock: ({ code }: { code: string }) => <pre data-testid="code">{code}</pre> }))

// Variants of one example are settings of one preview, and its code follows them (owner 11.11)
describe("the code of an example its controls set", () => {
  test("values, sections, inverted sections and sections for one value", () => {
    const template = '<Accordion type="[[type]]"[[#type=single]][[#collapsible]] collapsible[[/collapsible]][[/type=single]][[^card]] plain[[/card]] />'
    expect(renderDemoCode(template, { type: "single", collapsible: true, card: false })).toBe('<Accordion type="single" collapsible plain />')
    expect(renderDemoCode(template, { type: "multiple", collapsible: true, card: true })).toBe('<Accordion type="multiple" />')
    expect(renderDemoCode("[[^type=single]]other[[/type=single]]", { type: "multiple" })).toBe("other")
  })

  test("a section tag alone on its line takes the line with it, and the code keeps its own brackets", () => {
    const template = "<Root>\n  [[#card]]\n  <Card>\n  [[/card]]\n  <Item style={{ a: 1 }} items={[[1, 2]]} />\n</Root>"
    expect(renderDemoCode(template, { card: true })).toBe("<Root>\n  <Card>\n  <Item style={{ a: 1 }} items={[[1, 2]]} />\n</Root>")
    expect(renderDemoCode(template, { card: false })).toBe("<Root>\n  <Item style={{ a: 1 }} items={[[1, 2]]} />\n</Root>")
  })

  test("a value the code does not have, or a section left open, is an error", () => {
    expect(() => renderDemoCode("[[size]]", {})).toThrow(/size/)
    expect(() => renderDemoCode("[[#card]]x", { card: true })).toThrow(/never closed/)
    expect(() => renderDemoCode("[[#card]]x[[/type]]", { card: true, type: "single" })).toThrow(/closes/)
  })

  test("indentCode indents every line but the blank ones", () => {
    expect(indentCode("<A>\n\n  <B />\n</A>", 4)).toBe("    <A>\n\n      <B />\n    </A>")
  })
})

describe("a preview whose code its controls set", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })))
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  function CardDemo() {
    const [card, setCard] = useState(false)
    return <>
      <div data-demo-controls><DemoControlBoolean name="card" value={card} onChange={setCard} /></div>
      <div data-demo-stage><output aria-label="stage">{card ? "In a card" : "Plain"}</output></div>
    </>
  }

  test("the Code view shows the code as the controls set it, and the demo keeps its settings under it", () => {
    const view = render(<PreviewViewportProvider>
      <ComponentPreview previewId="preview-1" code={"[[#card]]\n<Card>\n[[/card]]\n<Accordion />\n[[#card]]\n</Card>\n[[/card]]"} codeValues={{ card: false }}>
        <CardDemo />
      </ComponentPreview>
    </PreviewViewportProvider>)
    fireEvent.click(view.getByRole("radio", { name: "Code" }))
    expect(view.getByTestId("code").textContent).toBe("<Accordion />\n")
    fireEvent.click(view.getByRole("radio", { name: "Preview" }))
    fireEvent.click(view.getByRole("switch", { name: "card" }))
    fireEvent.click(view.getByRole("radio", { name: "Code" }))
    expect(view.getByTestId("code").textContent).toBe("<Card>\n<Accordion />\n</Card>\n")
    fireEvent.click(view.getByRole("radio", { name: "Preview" }))
    expect(view.getByRole("switch", { name: "card" }).getAttribute("aria-checked")).toBe("true")
    expect(view.getByLabelText("stage").textContent).toBe("In a card")
    // Reset gives the demo and its code their defaults again
    fireEvent.click(view.getByRole("button", { name: "Reset preview" }))
    fireEvent.click(view.getByRole("radio", { name: "Code" }))
    expect(view.getByTestId("code").textContent).toBe("<Accordion />\n")
  })

  test("a Vue demo gives the code the values its template gets, not the labels its controls show", () => {
    const view = render(<PreviewViewportProvider>
      <ComponentPreview previewId="preview-1" language="vue" code={"<Field[[#dense]] dense[[/dense]][[#hint]] hint[[/hint]] />"} codeValues={{ dense: false, hint: false }}>
        <VueDemo template="<span />" controls={[
          { name: "dense", label: "compact", type: "boolean", default: false },
          { name: "hint", type: "select", options: [{ value: false, label: "Off" }, { value: true, label: "On" }], default: false },
        ]} />
      </ComponentPreview>
    </PreviewViewportProvider>)
    fireEvent.click(view.getByRole("radio", { name: "Code" }))
    expect(view.getByTestId("code").textContent).toBe("<Field />")
    fireEvent.click(view.getByRole("radio", { name: "Preview" }))
    fireEvent.click(view.getByRole("switch", { name: "compact" }))
    fireEvent.click(view.getByRole("radio", { name: "Code" }))
    expect(view.getByTestId("code").textContent).toBe("<Field dense />")
    fireEvent.click(view.getByRole("radio", { name: "Preview" }))
    fireEvent.click(view.getByRole("radio", { name: "On" }))
    fireEvent.click(view.getByRole("radio", { name: "Code" }))
    expect(view.getByTestId("code").textContent).toBe("<Field dense hint />")
  })
})

// A row shown only under another setting (accentColor under variant=accent) mounts in the phone after the page has
// replayed its values; StrictMode's second run of its effects sent its default back over them (review, 11.11)
test("a row that mounts after the page's values keeps them, and sends nothing back, in StrictMode", () => {
  const channel = createDemoControlChannel("phone", "embed")
  const sent: [string, unknown][] = []
  channel.connect((name, value) => sent.push([name, value]))
  channel.receive("compact", true)
  function Row() {
    const [compact, setCompact] = useState(false)
    return <DemoControlBoolean name="compact" value={compact} onChange={setCompact} />
  }
  const view = render(<StrictMode><DemoControlHostContext.Provider value={channel}><Row /></DemoControlHostContext.Provider></StrictMode>)
  expect(view.getByRole("switch", { name: "compact" }).getAttribute("aria-checked")).toBe("true")
  expect(sent).toEqual([])
  // A change made in the phone still reaches the page
  fireEvent.click(view.getByRole("switch", { name: "compact" }))
  expect(sent).toEqual([["compact", false]])
  cleanup()
})

test("of two controls with one name, the one that holds the value removes it, and only then", () => {
  const store = createDemoControlValues()
  const phone = {}, desktop = {}
  store.set("size", "md", phone)
  store.set("size", "lg", desktop)
  store.remove("size", phone)
  expect(store.snapshot()).toEqual({ size: "lg" })
  store.remove("size", desktop)
  expect(store.snapshot()).toEqual({})
})

test("the manifest warns of an example that sets a value its code does not follow", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  const content = `### Overview

<ComponentPreview code={"<Card[[#pill]] pill[[/pill]] />"} codeValues={{ pill: false }} codeExamples={[{ name: "Pill", values: { pil: true } }]} />`
  expect(extractExamples(content, parsePage(content)).map((example: { name: string }) => example.name)).toEqual(["Overview"])
  expect(warn.mock.calls.join(" ")).toMatch(/"Pill" sets pil/)
  warn.mockRestore()
})

describe.each(["content/components", "content/vue/components"])("%s/accordion.mdx in the MCP manifest", (dir) => {
  const examples = (() => {
    const content = readFileSync(`${dir}/accordion.mdx`, "utf8")
    return extractExamples(content, parsePage(content)) as { name: string; code: string }[]
  })()
  const code = (name: string) => examples.find((example) => example.name === name)?.code ?? ""

  test("the Overview's settings stay examples of their own: the default, Multiple and Card", () => {
    expect(examples.map((example) => example.name)).toEqual(["Overview", "Multiple", "Card"])
    for (const example of examples) expect(example.code).not.toMatch(/\[\[/)
    expect(code("Overview")).toMatch(/<Accordion type="single" collapsible (defaultValue|default-value)="shipping"/)
    expect(code("Multiple")).toMatch(/<Accordion type="multiple" (defaultValue=\{\["shipping"\]\}|:default-value="\['shipping'\]")/)
    expect(code("Multiple")).not.toMatch(/Card/)
    expect(code("Card")).toMatch(/<Card[ >][\s\S]*\n {4}<Accordion type="single" collapsible[\s\S]*\n {4}<\/Accordion>/)
  })
})
