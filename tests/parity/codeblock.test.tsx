import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, type ComponentType } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { CODE_BLOCK_SAMPLES } from "../../components/docs/CodeBlockSamples"
import {
  CodeBlock as RCodeBlock,
  CodeBlockBase as RCodeBlockBase,
  CollapsibleCodeBlock as RCollapsibleCodeBlock,
} from "../../packages/ui/src/components/CodeBlock"
import {
  CodeBlock,
  CodeBlockBase,
  CodeBlockBaseCode,
  CodeBlockBaseCopyButton,
  CollapsibleCodeBlock,
} from "../../packages/vue/src/components/CodeBlock"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

type Props = Record<string, unknown>

const RCode = RCodeBlockBase.Code as ComponentType<Props>
const RCopy = RCodeBlockBase.CopyButton as ComponentType<Props>

const writeText = vi.fn(async () => {})

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  writeText.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
})

// Every sample in its own language (the docs page's samples)
const SAMPLE_LANGUAGE: Record<string, string> = { base: "javascript", collapsible: "tsx", customTypescript: "typescript" }
const samples = Object.entries(CODE_BLOCK_SAMPLES).map(([key, code]) => [SAMPLE_LANGUAGE[key] ?? key, code] as const)

// The registered languages, their aliases, and the unregistered / plain cases
const LANGUAGES = [
  "javascript", "js", "jsx", "typescript", "ts", "tsx", "markup", "html", "xml", "svg", "css", "scss", "c",
  "clike", "bash", "sh", "shell", "json", "webmanifest", "jsonc", "python", "py", "sql", "diff", "markdown", "md",
  "yaml", "yml", "toml", "docker", "dockerfile", "java", "go", "php", "ruby", "rb", "kotlin", "kt", "text",
  "brainfuck", "",
]

// Code that walks every branch of react-syntax-highlighter's line splitting
const EDGE_CODE: [string, string, string | undefined][] = [
  ["empty", "", "javascript"],
  ["empty, plain", "", undefined],
  ["single newline", "\n", "javascript"],
  ["trailing newline", "const a = 1\n", "javascript"],
  ["leading and double newlines", "\n\nconst a = 1\n\n", "typescript"],
  ["multi-line comment", "/* one\n two\n three */\nconst a = 1", "javascript"],
  ["comment at the end", "const a = 1 // done\n", "javascript"],
  ["multi-line string at the end", "x = '''\nline\n'''", "python"],
  ["template literal", "const s = `a\n${b}\nc`", "javascript"],
  ["windows line endings", "a = 1\r\nb = 2\r\n", "python"],
  ["nested jsx tokens", "const A = () => <div className=\"x\">{items.map((i) => <B key={i} />)}</div>", "tsx"],
  ["markup entity (Prism adds a title, dropped by the flattening)", "<p>&amp; &lt;b&gt;</p>", "markup"],
  ["plain text with newlines", "line one\nline two\n", undefined],
  ["unknown language", "foo(bar)\n", "brainfuck"],
  ["markdown with a fence", "# Title\n\n```js\nconst a = 1\n```\n", "markdown"],
  ["php in html", "<p><?php echo $x; ?></p>", "php"],
  ["diff", "- old\n+ new\n  same", "diff"],
]

const reactCodeBlock = (props: Props, code: string) => createElement(RCodeBlock as ComponentType<Props>, props, code)

describe("CodeBlock parity", () => {
  test.each(samples)("sample: %s", async (language, code) => {
    const pair = await renderPair(reactCodeBlock({ language }, code), () => h(CodeBlock, { language }, { default: () => code }))
    expect(pair.vue).toBe(pair.react)
    if (language !== "jsonc") expect(pair.react).toContain('class="token')
  })

  test.each(EDGE_CODE)("edge: %s", async (_name, code, language) => {
    const pair = await renderPair(reactCodeBlock({ language }, code), () => h(CodeBlock, { language, code }))
    expect(pair.vue).toBe(pair.react)
  })

  test.each(LANGUAGES)("every sample as %j", async (language) => {
    for (const [, code] of samples) {
      const pair = await renderPair(createElement(RCode, { language }, code), () => h(CodeBlockBaseCode, { language, code }))
      expect(pair.vue, code.slice(0, 40)).toBe(pair.react)
    }
  })

  test("jsonc is not registered (React registers json twice), so it renders as plain text", async () => {
    const pair = await renderPair(reactCodeBlock({ language: "jsonc" }, CODE_BLOCK_SAMPLES.jsonc), () =>
      h(CodeBlock, { language: "jsonc", code: CODE_BLOCK_SAMPLES.jsonc }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain('class="token')
    expect(pair.react).toContain('class="language-jsonc"')
  })

  test("tokens carry React's doubled `token` class", async () => {
    const pair = await renderPair(reactCodeBlock({ language: "javascript" }, "const a = 1"), () =>
      h(CodeBlock, { language: "javascript" }, { default: () => "const a = 1" }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('class="token token keyword"')
  })

  test("class, and the code prop when the slot is empty", async () => {
    const pair = await renderPair(reactCodeBlock({ language: "css", className: "my-block" }, ".a { color: red }"), () =>
      h(CodeBlock, { language: "css", class: "my-block", code: ".a { color: red }" }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("my-block")
  })

  test("slot text from a v-for fragment equals the code prop", async () => {
    const pair = await renderPair(reactCodeBlock({ language: "bash" }, "npm i\nnpm test"), () =>
      h(CodeBlock, { language: "bash" }, { default: () => ["npm i", "\n", "npm test"] }),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("CodeBlockBase composition: attributes, codeTagProps, copy button states", async () => {
    const pair = await renderPair(
      createElement(
        RCodeBlockBase,
        { className: "outer", "data-testid": "block", title: "Block" } as Props,
        createElement(RCode, { language: "typescript", className: "inner", codeTagProps: { className: "custom-code", style: { fontSize: 12 }, "data-x": "1" } }, "let a: number = 1"),
        createElement(RCopy, { copyValue: "let a", className: "copy", loading: true }),
        createElement(RCopy, { copyValue: "let a", disabled: true }),
        createElement(RCopy, { copyValue: "let a", loading: false, disabled: false }),
      ),
      () =>
        h(CodeBlockBase, { "class": "outer", "data-testid": "block", "title": "Block" }, {
          default: () => [
            h(CodeBlockBaseCode, { language: "typescript", class: "inner", codeTagProps: { "class": "custom-code", "style": { fontSize: "12px" }, "data-x": "1" } }, { default: () => "let a: number = 1" }),
            h(CodeBlockBaseCopyButton, { copyValue: "let a", class: "copy", loading: true }),
            h(CodeBlockBaseCopyButton, { copyValue: "let a", disabled: true }),
            h(CodeBlockBaseCopyButton, { copyValue: "let a", loading: false, disabled: false }),
          ],
        }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('class="custom-code"')
    expect(pair.react).not.toContain("language-typescript")
  })

  test("codeTagProps style can override white-space", async () => {
    const pair = await renderPair(createElement(RCode, { language: "go", codeTagProps: { style: { whiteSpace: "pre-wrap" } } }, "package main"), () =>
      h(CodeBlockBaseCode, { language: "go", code: "package main", codeTagProps: { style: "white-space: pre-wrap" } }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("white-space: pre-wrap")
  })
})

const collapsibleCases: [string, Props][] = [
  ["collapsed (default)", {}],
  ["expanded by default", { defaultExpanded: true }],
  ["custom collapsed height", { collapsedHeight: 60 }],
  ["collapsed height zero", { collapsedHeight: 0 }],
  ["max expanded height", { defaultExpanded: true, maxExpandedHeight: 200 }],
  ["max expanded height ignored while collapsed", { maxExpandedHeight: 200 }],
  ["not copyable", { defaultExpanded: true, copyable: false }],
  ["class", { className: "mine" }],
]

const vueProps = ({ className, ...props }: Props) => ({ ...props, ...(className ? { class: className } : {}) })

describe("CollapsibleCodeBlock collapsed height", () => {
  test.each([
    ["default", {}, "max-height: 140px; min-height: 140px"],
    ["below the View Code room", { collapsedHeight: 60 }, "max-height: 60px; min-height: 60px"],
    ["above it", { collapsedHeight: 300 }, "max-height: 300px; min-height: 140px"],
    ["zero", { collapsedHeight: 0 }, "max-height: 0px; min-height: 0px"],
  ] as [string, Props, string][])("%s: collapsedHeight is the max height, and the min height up to 140px", async (_name, props, style) => {
    const code = CODE_BLOCK_SAMPLES.tsx
    const pair = await renderPair(
      createElement(RCollapsibleCodeBlock as ComponentType<Props>, { language: "tsx", ...props }, code),
      () => h(CollapsibleCodeBlock, { language: "tsx", ...vueProps(props) }, { default: () => code }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain(`style="${style}"`)
  })
})

describe.each([
  ["animations off (jsdom default)", true],
  ["animations on (browser)", false],
])("CollapsibleCodeBlock parity, %s", (_mode, disabled) => {
  test.each(collapsibleCases)("%s", async (_name, props) => {
    animation.disabled = disabled
    const code = CODE_BLOCK_SAMPLES.tsx
    const pair = await renderPair(
      createElement(RCollapsibleCodeBlock as ComponentType<Props>, { language: "tsx", ...props }, code),
      () => h(CollapsibleCodeBlock, { language: "tsx", ...vueProps(props) }, { default: () => code }),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("View Code expands, then the copy button copies and resets", async () => {
    animation.disabled = disabled
    const code = CODE_BLOCK_SAMPLES.python

    const walk = async (mount: () => void, flush: () => Promise<void>) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "Date"] })
      mount()
      await flush()
      const snapshots = [serializeDom()]
      const step = async (run: () => void, ms = 0) => {
        await act(async () => {
          run()
          vi.advanceTimersByTime(ms)
        })
        await flush()
        snapshots.push(serializeDom())
      }
      await step(() => fireEvent.click(document.querySelector("button")!))
      await step(() => {}, 300)
      await step(() => fireEvent.click(document.querySelector("button")!))
      await step(() => {}, 500)
      await step(() => {}, 1000)
      vi.useRealTimers()
      return snapshots
    }

    const react = await walk(
      () => render(createElement(RCollapsibleCodeBlock as ComponentType<Props>, { language: "python", collapsedHeight: 80 }, code)),
      async () => {},
    )
    cleanup()
    const reactWrites = writeText.mock.calls.length
    const vue = await walk(
      () => mountVue(() => h(CollapsibleCodeBlock, { language: "python", collapsedHeight: 80 }, { default: () => code })),
      flushVue,
    )

    expect(vue).toEqual(react)
    expect(react[0]).toContain("data-collapsed")
    expect(react[0]).toContain('"View Code"')
    expect(react[1]).not.toContain("data-collapsed")
    expect(react[1]).not.toContain('"View Code"')
    expect(reactWrites).toBe(1)
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenLastCalledWith(code)
  })
})

describe("CodeBlock copy button", () => {
  test("copies the code (slot text) in both frameworks", async () => {
    const code = CODE_BLOCK_SAMPLES.bash
    render(reactCodeBlock({ language: "bash" }, code))
    await act(async () => {
      fireEvent.click(document.querySelector("button")!)
    })
    cleanup()
    mountVue(() => h(CodeBlock, { language: "bash" }, { default: () => code }))
    await flushVue()
    fireEvent.click(document.querySelector("button")!)
    await flushVue()
    expect(writeText.mock.calls).toEqual([[code], [code]])
  })
})
