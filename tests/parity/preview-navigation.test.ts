import { afterEach, describe, expect, test, vi } from "vitest"
import { goToPreviousExample } from "../../components/docs/previewNavigation"

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function examples(doc: Document) {
  const article = doc.createElement("article")
  const heading = doc.createElement("h1")
  const previous = doc.createElement("section")
  const current = doc.createElement("section")
  const button = doc.createElement("button")
  previous.setAttribute("data-component-preview", "")
  current.setAttribute("data-component-preview", "")
  current.append(button)
  article.append(heading, previous, current)
  doc.body.append(article)
  previous.scrollIntoView = vi.fn()
  heading.scrollIntoView = vi.fn()
  return { previous, current, button, heading }
}

describe("docs Back scrolling", () => {
  test.each([false, true])("returns to the previous example with reduced motion=%s", (reduced) => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced && query === "(prefers-reduced-motion: reduce)" }))
    const { previous, button } = examples(document)
    goToPreviousExample(button)
    expect(previous.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: "start", behavior: reduced ? "auto" : "smooth" })
  })

  test("the first example returns to its article heading without smooth motion when requested", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }))
    const { previous, heading } = examples(document)
    goToPreviousExample(previous)
    expect(heading.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: "start", behavior: "auto" })
  })

  test("uses the invoking preview's document and preference", () => {
    const outer = examples(document)
    const frame = document.createElement("iframe")
    document.body.append(frame)
    const doc = frame.contentDocument
    const view = doc?.defaultView
    if (!doc || !view) throw new Error("Missing fixture frame document")
    Object.defineProperty(view, "matchMedia", { configurable: true, value: () => ({ matches: true }) })
    const inner = examples(doc)
    goToPreviousExample(inner.button)
    expect(inner.previous.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: "start", behavior: "auto" })
    expect(outer.previous.scrollIntoView).not.toHaveBeenCalled()
  })

  test("does nothing when the source is outside an example", () => {
    const { previous } = examples(document)
    goToPreviousExample(document.body)
    goToPreviousExample(null)
    expect(previous.scrollIntoView).not.toHaveBeenCalled()
  })
})
