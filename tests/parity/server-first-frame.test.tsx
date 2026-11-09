import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement } from "react"
import { renderToString as renderReact } from "react-dom/server"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"
import { createSSRApp, h } from "vue"
import { renderToString as renderVue } from "vue/server-renderer"
import { MarkdownEditor as RMarkdownEditor } from "../../packages/ui/src/components/MarkdownEditor"
import { TagInput as RTagInput } from "../../packages/ui/src/components/TagInput"
import { Textarea as RTextarea } from "../../packages/ui/src/components/Textarea"
import { MarkdownEditor } from "../../packages/vue/src/components/MarkdownEditor"
import { TagInput } from "../../packages/vue/src/components/TagInput"
import { Textarea } from "../../packages/vue/src/components/Textarea"
import { flushVue, mountVue } from "./harness"

// Plan 175.3 (167b): a page draws on the server what the browser draws after hydration, so it does not move on a
// narrow window. The fields that measured themselves after mounting now take their size in CSS from the server
// markup: Tag Input from a hidden copy of its text, an auto-resizing Textarea with field-sizing, the marks of a
// Slider stay hidden at one line until placed, and a Markdown Editor shows its markdown before ProseMirror exists.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")
const css = (name: string) => read(`packages/styles/src/components/${name}/${name}.module.css`)

const parse = (html: string) => {
  const root = document.createElement("div")
  root.innerHTML = html
  return root
}
const reactServer = (element: Parameters<typeof renderReact>[0]) => parse(renderReact(element))
const vueServer = async (render: () => ReturnType<typeof h>) => parse(await renderVue(createSSRApp({ render })))

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("Tag Input sizes its field in CSS", () => {
  const field = (root: ParentNode) => {
    const input = root.querySelector("input")!
    const measure = input.closest(".InputContainer")!.querySelector<HTMLElement>(".InputMeasure")!
    return { input, measure }
  }

  test("the server markup holds the text that sizes the field, the input has no width of its own", async () => {
    const tags = [{ value: "ada@plexui.com", valid: true }]
    for (const root of [
      reactServer(createElement(RTagInput, { placeholder: "Add a tag..." })),
      await vueServer(() => h(TagInput, { placeholder: "Add a tag..." })),
    ]) {
      const { input, measure } = field(root)
      expect(measure.getAttribute("aria-hidden")).toBe("true")
      expect(measure.textContent).toBe("Add a tag...")
      expect(input.getAttribute("style")).toBeNull()
    }
    // After the first tag an outlined field has no hint: the copy is empty, the field keeps its minimum
    for (const root of [
      reactServer(createElement(RTagInput, { placeholder: "Add a tag...", defaultValue: tags })),
      await vueServer(() => h(TagInput, { placeholder: "Add a tag...", value: tags })),
    ]) {
      expect(field(root).measure.textContent).toBe("")
    }
  })

  test("the copy follows what is typed, in React and Vue", async () => {
    const react = render(createElement(RTagInput, { placeholder: "Add a tag..." }))
    fireEvent.change(field(react.container).input, { target: { value: "grace@" } })
    expect(field(react.container).measure.textContent).toBe("grace@")

    const vue = mountVue(() => h(TagInput, { placeholder: "Add a tag..." }))
    const input = field(vue.container).input
    input.value = "grace@"
    input.dispatchEvent(new Event("input"))
    await flushVue()
    expect(field(vue.container).measure.textContent).toBe("grace@")
    vue.unmount()
  })

  test("CSS: the copy sizes the box, wraps it under the tags and stretches it; nothing measures in script", () => {
    const styles = css("TagInput")
    expect(styles).toMatch(/\.InputContainer \{\s*position: relative;\s*flex-grow: 1;\s*min-width: 0;\s*max-width: 100%;\s*\}/)
    // The field sits in the middle of a row a taller chip sets (44px on a phone)
    expect(styles).toMatch(/\.InputWrapper \{\s*position: absolute;\s*inset: 0;\s*display: flex;\s*overflow: hidden;\s*align-items: center;\s*\}/)
    expect(styles).toMatch(/\.InputMeasure \{[^}]*display: block;[^}]*height: var\(--tag-input-height\);[^}]*padding-inline-end: 10px;[^}]*visibility: hidden;\s*white-space: pre;\s*\}/)
    expect(styles).toMatch(/\.Input \{\s*display: block;\s*width: 100%;/)
    for (const source of [read("packages/ui/src/components/TagInput/TagInput.tsx"), read("packages/vue/src/components/TagInput/TagInput.ts")]) {
      expect(source).not.toMatch(/inputWidth|ResizeObserver|INPUT_CURSOR_TOLERANCE_PX|CONTAINER_PADDING_PX/)
    }
  })
})

describe("an auto-resizing Textarea is as tall as its text from the server", () => {
  test("its frame says so in React and Vue", async () => {
    for (const root of [
      reactServer(createElement(RTextarea, { autoResize: true, defaultValue: "One\nTwo\nThree" })),
      await vueServer(() => h(Textarea, { autoResize: true, defaultValue: "One\nTwo\nThree" })),
    ]) {
      expect(root.querySelector("textarea")!.parentElement!.hasAttribute("data-auto-resize")).toBe(true)
    }
    for (const root of [reactServer(createElement(RTextarea, {})), await vueServer(() => h(Textarea, {}))]) {
      expect(root.querySelector("textarea")!.parentElement!.hasAttribute("data-auto-resize")).toBe(false)
    }
  })

  test("CSS sizes it to its content, between its rows and maximum rows", () => {
    expect(css("Textarea")).toMatch(/\.Textarea \{[^]*?min-height: var\(--textarea-min-height\);\s*max-height: var\(--textarea-max-height\);[^]*?\[data-auto-resize\] > & \{\s*field-sizing: content;\s*\}/)
  })
})

describe("Slider marks wait for their places", () => {
  test("CSS keeps unplaced marks hidden at one line; the script shows them once it has the slider's width", () => {
    expect(css("Slider")).toMatch(/\.MarksContainer:not\(\[data-measured\]\) \{\s*min-height: 1lh;\s*visibility: hidden;\s*\}/)
    // 1lh is a line of the marks: the container takes their size
    expect(css("Slider")).toMatch(/\.MarksContainer \{[^}]*font-size: 12px;\s*\}/)
    expect(read("packages/ui/src/components/Slider/Slider.tsx")).toContain('if (sliderWidth) marksContainerRef.current.dataset.measured = ""')
    expect(read("packages/vue/src/components/Slider/Slider.ts")).toContain('if (width) container.dataset.measured = ""')
  })
})

describe("a Markdown Editor shows its markdown before the editor exists", () => {
  // ProseMirror reads layout to scroll the selection into view; jsdom has none
  const original = {
    getClientRects: Range.prototype.getClientRects,
    getBoundingClientRect: Range.prototype.getBoundingClientRect,
    elementFromPoint: document.elementFromPoint,
  }
  beforeAll(() => {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList
    Range.prototype.getBoundingClientRect = () => new DOMRect()
    document.elementFromPoint = () => null
  })
  afterAll(() => {
    Range.prototype.getClientRects = original.getClientRects
    Range.prototype.getBoundingClientRect = original.getBoundingClientRect
    document.elementFromPoint = original.elementFromPoint
  })

  // Tags and text exactly: the editor keeps spaces (white-space: break-spaces), so the frame's text must be the same.
  // Adjacent text reads as one, however it is split into nodes (React's server markup separates it with comments)
  const outline = (node: Node): string => {
    const tag = (node as Element).tagName.toLowerCase()
    let inner = ""
    let text: string | null = null
    const flush = () => {
      if (text !== null) inner += JSON.stringify(text)
      text = null
    }
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text = (text ?? "") + child.textContent
      else if (child.nodeType === Node.ELEMENT_NODE) {
        flush()
        inner += outline(child)
      }
    }
    flush()
    return `<${tag}>${inner}</${tag}>`
  }
  const contentOf = (root: ParentNode, selector: string) => outline(root.querySelector(selector)!).replace(/^<div>|<\/div>$/g, "")

  const samples: Array<[string, string]> = [
    ["formatting, links and lists", "Some **bold** and *italic* text.\n\nRead [the policy](https://example.com/privacy).\n\n- One\n- Two\n\n1. First\n2. Second"],
    ["nested and loose lists", "- One\n  - Nested\n- Two\n\n* Loose\n\n* List"],
    ["headings, quotes, code, rules and images become what the schema keeps", "# Notes\n\n> Quoted **text**\n\n```\ncode block\n```\n\nUse `inline` code.\n\n---\n\n![alt](https://example.com/a.png)\n\nLine one  \nLine two"],
    ["a code block of several lines, an empty one", "Before\n\n```js\nconst a = 1\n\nconst b = 2\n```\n\n```\n```\n\nAfter"],
    ["white space: soft breaks, runs of spaces, spaces after a break", "One\ntwo   three\n\nLine one  \n   Line two  \n\n  Indented start"],
    ["markdown inside and around HTML still parses", "<div>\n# Heading\n</div>\n\n<div>**bold**</div>\n\n<span>*a*</span> and <br> here"],
    ["a long word and indented code", "Averyveryveryveryveryveryveryveryverylongwordwithoutanyspaces\n\n```\n  indented\n    more\n```"],
    ["a line after bold or code joins it, as tiptap-markdown drops that newline", "a *b*\nc and `code`\nnext, a [link](https://example.com)\nend"],
    ["empty list items and an image item keep a paragraph", "-\n-\n- ![x](https://example.com/x.png)\n- text"],
    ["raw HTML is text, a block of it a paragraph", "<div>first paragraph</div>\n\n<div>second paragraph</div>\n\nInline <b>raw</b> html"],
    ["an image alone leaves the empty paragraph", "![alt](https://example.com/a.png)"],
    ["lists in lists of the other kind, empty items", "1. one\n2. two\n   - nested **b**\n   - *i*\n\n- three\n  1. deep\n\n-\n-"],
    ["line breaks of every kind", "one\ntwo  \nthree\\\nfour \n five\n\n**b**\n*i*\n[l](https://example.com)\n`c`"],
    ["line endings CRLF and CR, tabs around them, a link over two lines", "a\r\nb\rc\t\nd \t\n\te\n\n[one\ntwo](https://example.com) *x\ny*"],
    ["newlines from character references are text", "a&#10;b &#xA; c&#13;&#10;d &NewLine;e\\&#10;f\na&#13;\r\nb"],
    ["references too long to be references, white space from references at the end of a line", "a&#00000010;\nb&#x000000A;\nc&#9;\nd&#32;\ne&Tab; \nf&#32;&#32;\ng"],
    ["what the editor writes for text: the & of a reference, escaped markers", "&amp;lt; &amp;#60; AT&T &lt;b&gt;\nx | y\n\\|---|---|\n!\\[alt\\](https://example.com/a.png) \\*a\\*"],
  ]

  const frames = async (props: Record<string, unknown>) => {
    const reactFrame = contentOf(reactServer(createElement(RMarkdownEditor, props)), ".Editor > div > .tiptap.EditorContent")
    const vueFrame = contentOf(await vueServer(() => h(MarkdownEditor, props)), ".Editor > div > .tiptap.EditorContent")

    const react = render(createElement(RMarkdownEditor, props))
    await act(async () => {})
    const reactEditor = contentOf(react.container, ".Editor > div > .ProseMirror")
    react.unmount()
    const vue = mountVue(() => h(MarkdownEditor, props))
    await flushVue()
    const vueEditor = contentOf(vue.container, ".Editor > div > .ProseMirror")
    vue.unmount()

    expect(reactEditor).toBe(vueEditor)
    expect(reactFrame).toBe(reactEditor)
    expect(vueFrame).toBe(reactEditor)
  }

  test.each(samples)("%s: the server frame is what the mounted editor shows, in React and Vue", async (_, markdown) => {
    await frames({ defaultValue: markdown })
  })

  // Formats left out and single newlines as line breaks, on every sample
  const options: Array<Record<string, unknown>> = [
    { formats: ["bold", "link"] },
    { formats: ["bulletList"] },
    { formats: ["orderedList", "italic"] },
    { formats: [] },
    { breaks: true },
    { formats: ["bold", "link"], breaks: true },
  ]
  test.each(options.flatMap((option) => samples.map(([name, markdown]) => [JSON.stringify(option), name, markdown, option] as const)))(
    "%s, %s: the server frame is what the mounted editor shows",
    async (_, __, markdown, option) => {
      await frames({ defaultValue: markdown, ...option })
    },
  )

  test("breaks: a line that ends in a tab and spaces keeps the tab, as markdown-it does", async () => {
    await frames({ defaultValue: "c\t  \nd \t \ne\t\t\nf", breaks: true })
  })

  test("an editor whose markdown leaves no block shows its placeholder paragraph, as the editor does", async () => {
    for (const root of [
      reactServer(createElement(RMarkdownEditor, { placeholder: "Write a note", defaultValue: "-\n-", formats: ["bold"] })),
      await vueServer(() => h(MarkdownEditor, { placeholder: "Write a note", defaultValue: "-\n-", formats: ["bold"] })),
    ]) {
      const empty = root.querySelector(".tiptap p.is-editor-empty")!
      expect(empty.getAttribute("data-placeholder")).toBe("Write a note")
      expect(empty.querySelector("br")).not.toBeNull()
    }
  })

  test("the frame holds the content in the editor's boxes; raw HTML shows as text", async () => {
    for (const root of [
      reactServer(createElement(RMarkdownEditor, { defaultValue: "<div>first</div>\n\nSee <b>this</b>" })),
      await vueServer(() => h(MarkdownEditor, { defaultValue: "<div>first</div>\n\nSee <b>this</b>" })),
    ]) {
      const content = root.querySelector(".Editor > div > .tiptap.EditorContent")!
      expect([...content.querySelectorAll("p")].map((paragraph) => paragraph.textContent)).toEqual(["<div>first</div>", "See <b>this</b>"])
      expect(content.querySelector("div, b")).toBeNull()
    }
  })

  test("a disabled empty editor shows no placeholder, as TipTap's only shows while it can be edited", async () => {
    for (const root of [
      reactServer(createElement(RMarkdownEditor, { placeholder: "Write a note", disabled: true })),
      await vueServer(() => h(MarkdownEditor, { placeholder: "Write a note", disabled: true })),
    ]) {
      const paragraph = root.querySelector(".tiptap p")!
      expect(paragraph.classList.contains("is-editor-empty")).toBe(false)
      expect(paragraph.hasAttribute("data-placeholder")).toBe(false)
    }
  })

  test("CSS: the frame lays out text as ProseMirror does", () => {
    expect(css("MarkdownEditor")).toMatch(/\.EditorContent \{\s*outline: none;[^}]*word-wrap: break-word;\s*white-space: break-spaces;\s*font-feature-settings: "liga" 0;\s*font-variant-ligatures: none;/)
  })

  test("an empty editor shows its placeholder paragraph", async () => {
    for (const root of [
      reactServer(createElement(RMarkdownEditor, { placeholder: "Write a note" })),
      await vueServer(() => h(MarkdownEditor, { placeholder: "Write a note" })),
    ]) {
      const empty = root.querySelector(".tiptap p.is-editor-empty")!
      expect(empty.getAttribute("data-placeholder")).toBe("Write a note")
      expect(empty.querySelector("br")).not.toBeNull()
    }
  })
})

describe("the docs draw these demos on the server", () => {
  test("no demo of these pages is client-only or waits for mounting", () => {
    for (const path of ["components/docs/SliderDemos.tsx", "components/docs/SliderValueControl.tsx", "components/docs/ProgressDemos.tsx"]) {
      const source = read(path)
      expect(source).not.toMatch(/ssr: false|next\/dynamic/)
      expect(source).toContain("import { Slider } from '@plexui/ui/components/Slider';")
    }
    expect(read("components/docs/ButtonGroupDemos.client.tsx")).not.toMatch(/ssr: false|next\/dynamic/)
    expect(read("components/docs/AvatarIconDemo.tsx")).not.toMatch(/useMounted|!mounted/)
  })
})
