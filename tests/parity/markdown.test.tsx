import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { compile } from "@vue/compiler-dom"
import type { Element as HastElement, Root as HastRoot } from "hast"
import type { Root as MdastRoot } from "mdast"
import { readFileSync } from "node:fs"
import path from "node:path"
import { createElement, type ComponentType, type ReactNode } from "react"
import { visit } from "unist-util-visit"
import { describe, expect, test, vi } from "vitest"
import * as Vue from "vue"
import { defineComponent, h, type FunctionalComponent, type VNode } from "vue"
import { markdownContent, markdownWithLatex } from "../../components/docs/MarkdownSamples"
import {
  Markdown as RMarkdown,
  createMarkdownDirective as rCreateMarkdownDirective,
  defaultUrlTransform as rDefaultUrlTransform,
  useParseMarkdownPre as rUseParseMarkdownPre,
} from "../../packages/ui/src/components/Markdown"
import {
  Markdown,
  createMarkdownDirective,
  defaultUrlTransform,
  useParseMarkdownPre,
} from "../../packages/vue/src/components/Markdown"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair, walkPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

const RMd = RMarkdown as ComponentType<Props>
const readSample = (file: string) =>
  readFileSync(path.resolve(process.cwd(), "packages/ui/src/components/Markdown", file), "utf8")
const sampleMarkdown = readSample("sampleMarkdown.md")
const sampleLatex = readSample("sampleLatex.md")

// React `className` is Vue `class`; everything else keeps its name
const toVueProps = ({ className, ...props }: Props) => ({ ...props, ...(className ? { class: className } : {}) })

/** One markdown string through both: React's children, Vue's `source` prop. */
const pairOf = (markdown: string, props: Props = {}, vueProps: Props = toVueProps(props)) =>
  renderPair(createElement(RMd, props, markdown), () => h(Markdown, { ...vueProps, source: markdown }))

const hasKatex = () => expect(document.querySelector(".katex")).not.toBeNull()

// Must stay the first test: React and Vue each load remark-math and
// rehype-katex once per module, so only the first math render is lazy.
describe("Markdown parity: lazy math", () => {
  test("the first includeMath render shows the source, then re-renders with KaTeX", async () => {
    const react: string[] = []
    render(createElement(RMd, { includeMath: true }, markdownWithLatex))
    react.push(serializeDom())
    await waitFor(hasKatex, { timeout: 15_000 })
    react.push(serializeDom())
    cleanup()

    const vue: string[] = []
    mountVue(() => h(Markdown, { includeMath: true, source: markdownWithLatex }))
    vue.push(serializeDom())
    await vi.waitFor(
      async () => {
        await flushVue()
        hasKatex()
      },
      { timeout: 15_000 },
    )
    vue.push(serializeDom())

    expect(vue).toEqual(react)
    expect(react[0]).toContain("$$")
    expect(react[0]).not.toContain("katex")
    expect(react[1]).toContain('class="katex-display"')
    expect(react[1]).toContain("<math")
  })
})

describe("Markdown parity: math", () => {
  test.each([
    ["docs sample", markdownWithLatex],
    ["sampleLatex.md", sampleLatex],
  ])("%s renders with KaTeX on the first render once loaded", async (_name, latex) => {
    const pair = await pairOf(latex, { includeMath: true })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('class="katex-display"')
    expect(pair.react).toContain('encoding="application/x-tex"')
  })

  test("inline $$ math, single dollars stay text (singleDollarTextMath: false)", async () => {
    const markdown = "Costs $5 to $10, and $$e^{i\\pi} + 1 = 0$$ inline, plus $$\\sqrt{2}$$."
    const pair = await pairOf(markdown, { includeMath: true })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('"Costs $5 to $10, and "')
    expect(pair.react).toContain('class="katex"')
    expect(pair.react).toContain("<svg")
  })

  test("without includeMath the source stays text even when math is loaded", async () => {
    const pair = await pairOf(markdownWithLatex)
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("katex")
  })

  test("toggling includeMath on and off", async () => {
    const { react, vue } = await walkPairWithState(
      { includeMath: false },
      (state) => createElement(RMd, state, "$$x^2$$"),
      (state) => h(Markdown, { ...state, source: "$$x^2$$" }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ includeMath: true })
        snapshot()
        await set({ includeMath: false })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain("katex")
    expect(react[2]).not.toContain("katex")
  })
})

describe("Markdown parity: content", () => {
  test.each([
    ["docs sample", markdownContent],
    ["sampleMarkdown.md", sampleMarkdown],
  ])("%s", async (_name, markdown) => {
    const pair = await pairOf(markdown)
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('class="MarkdownContent"')
    expect(pair.react).toContain("<table>")
    expect(pair.react).toContain('class="InlineCode"')
    expect(pair.react).toContain("View Code")
  })

  test.each([
    ["empty", ""],
    ["headings, emphasis, rules", "# One\n\n## Two\n\n*a* __b__ ***c***\n\n---\n\n***"],
    ["lists with start numbers", "3. three\n4. four\n\n- a\n\n  para\n- b"],
    ["blockquote", "> quote\n> > nested"],
    ["images and titles", '![alt text](/img.png "Title") ![](https://x.dev/a.png)'],
    ["hard breaks", "two spaces  \nbackslash\\\nend"],
    ["entities and escapes", "&copy; &amp; \\*not em\\* &#35;"],
    ["reference links", "[ref][1] and [Ref]\n\n[1]: https://a.dev 'A'\n[ref]: /local"],
    ["inline code with a language-like class", "`const a = 1` and ``a `b` c``"],
  ])("%s", async (_name, markdown) => {
    const pair = await pairOf(markdown)
    expect(pair.vue).toBe(pair.react)
  })

  test("the default slot is the source, like the source prop", async () => {
    const pair = await renderPair(createElement(RMd, {}, sampleMarkdown), () =>
      h(Markdown, null, { default: () => sampleMarkdown }),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("re-renders when the source changes", async () => {
    const { react, vue } = await walkPairWithState(
      { md: "# First" },
      (state) => createElement(RMd, {}, state.md),
      (state) => h(Markdown, { source: state.md }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ md: "Second with `code` and [link](https://a.dev)" })
        snapshot()
        await set({ md: "" })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
  })
})

describe("Markdown parity: GFM", () => {
  test.each([
    ["table alignment and inline content", "| L | C | R | N |\n| :- | :-: | -: | - |\n| *a* | `b` | [c](/c) | ~~d~~ |\n| | | | |"],
    ["task lists", "- [x] done\n- [ ] todo\n  - [x] nested\n1. [ ] ordered"],
    ["strikethrough: two tildes, not one", "~~gone~~ but ~$20-$30 and ~single~ stay"],
    ["autolinks", "www.example.com, https://plexui.com/docs?a=1, <https://angle.dev>, hi@plexui.com"],
    ["footnotes", "Claim[^1] and another[^note].\n\n[^1]: First.\n[^note]: Second with **bold**."],
  ])("%s", async (_name, markdown) => {
    const pair = await pairOf(markdown)
    expect(pair.vue).toBe(pair.react)
  })

  test("task list checkboxes keep their checked attribute", async () => {
    const pair = await pairOf("- [x] done\n- [ ] todo")
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('<input checked="" disabled="" type="checkbox">')
  })
})

describe("Markdown parity: breakNewLines", () => {
  test.each([false, true])("breakNewLines=%s", async (breakNewLines) => {
    const pair = await pairOf("line one\nline two\n\n| a |\n| - |\n| b |", { breakNewLines })
    expect(pair.vue).toBe(pair.react)
    if (breakNewLines) expect(pair.react).toContain("<br>")
    else expect(pair.react).not.toContain("<br>")
  })
})

describe("Markdown parity: raw HTML", () => {
  const html = "<div>block</div>\n\nInline <b>bold</b> and <script>alert(1)</script>.\n\n<!-- comment -->"

  test("raw HTML renders as text", async () => {
    const pair = await pairOf(html)
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('"<b>"')
    expect(pair.react).toContain('"<script>"')
    expect(pair.react).not.toMatch(/^\s*<(b|script)>$/m)
  })

  test("skipHtml drops it", async () => {
    const pair = await pairOf(html, { skipHtml: true })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain('"<b>"')
  })

  test("<br> in a td becomes a line break; <br/> and <br> in a th stay text", async () => {
    const markdown = "| head<br>er | b |\n| - | - |\n| x<br>y | a<br/>b |\n| <br> | z |"
    const pair = await pairOf(markdown)
    expect(pair.vue).toBe(pair.react)
    expect(pair.react.match(/^\s*<br>$/gm)).toHaveLength(2)
    expect(pair.react).toContain('"<br/>"')
    expect(pair.react).toContain('"<br>"')
  })

  test("skipHtml also drops <br> in table cells", async () => {
    const pair = await pairOf("| a |\n| - |\n| x<br>y |", { skipHtml: true })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toMatch(/<br/)
  })
})

describe("Markdown parity: URL transform", () => {
  const links = [
    "[js](javascript:alert(1))",
    "[data](data:text/html,hi)",
    "[tel](tel:+123)",
    "[sms](sms:+123)",
    "[mail](mailto:a@b.dev)",
    "[rel](/docs/a?b=c#d)",
    "[hash](#top)",
    "[colon after slash](./a:b)",
    "[vbs](VBScript:x)",
    "[ftp](ftp://files.dev)",
    "![img](data:image/png;base64,AAAA)",
    "![ok](https://a.dev/i.png)",
  ].join("\n\n")

  test("unsafe protocols are dropped, tel: and sms: kept (an empty href renders a span, an empty src nothing)", async () => {
    const pair = await pairOf(links)
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('href="tel:+123"')
    expect(pair.react).toContain('role="button"')
    expect(pair.react).toContain('<img alt="img">')
    expect(pair.react).not.toContain("javascript")
  })

  test("a custom urlTransform", async () => {
    const urlTransform = (url: string, key: string, node: HastElement) =>
      key === "src" ? `https://cdn.dev${url}` : node.tagName === "a" && url.startsWith("/") ? `https://plexui.com${url}` : url
    const pair = await pairOf(`${links}\n\n![local](/local.png)`, { urlTransform })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('href="https://plexui.com/docs/a?b=c#d"')
    // React DOM blocks the javascript: URL the transform let through; the Vue port does the same
    expect(pair.react).toContain("React has blocked a javascript: URL")
  })

  test("javascript: URLs on elements and through TextLink are blocked like React DOM blocks them", async () => {
    const keep = (url: string) => url
    const markdown = "[x](javascript:alert(1)) ![y](JaVaScRiPt:alert(2))"
    for (const props of [{ urlTransform: keep }, { urlTransform: keep, components: { a: "a" } }]) {
      const pair = await pairOf(markdown, props)
      expect(pair.vue).toBe(pair.react)
      // React's commitMount puts an <img>'s raw src back after mount
      expect(pair.react).toContain('src="JaVaScRiPt:alert(2)"')
      expect(pair.react.match(/React has blocked/g)).toHaveLength(1)
    }
  })

  test("urlTransform returning null removes the attribute", async () => {
    const pair = await pairOf(links, { urlTransform: () => null })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("href=")
  })

  test("urlTransform null falls back to react-markdown's default (tel: dropped)", async () => {
    const pair = await pairOf(links, { urlTransform: null })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("tel:")
  })

  test("defaultUrlTransform matches", () => {
    const urls = ["javascript:x", "tel:1", "sms:1", "http://a", "HTTPS://a", "mailto:a", "irc:x", "xmpp:x", "a/b:c", "?a:b", "#a:b", "data:x", "", ":"]
    expect(urls.map((url) => defaultUrlTransform(url))).toEqual(urls.map((url) => rDefaultUrlTransform(url)))
  })
})

describe("Markdown parity: code blocks", () => {
  const blocks = [
    "```js\nconst a = 1\n```",
    "```python\nprint('hi')\n\n```",
    "```tsx title=\"x.tsx\"\nconst A = () => <div />\n```",
    "```\nplain text\n```",
    "```brainfuck\n+++.\n```",
    "```\n```",
    "    indented code",
  ]

  test.each(blocks)("collapsible by default: %j", async (block) => {
    const pair = await pairOf(block)
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("CollapsibleCodeBlock")
  })

  test.each([
    ["collapsibleCodeBlocks=false", { collapsibleCodeBlocks: false }],
    ["copyableCodeBlocks=false", { copyableCodeBlocks: false }],
    ["both false", { collapsibleCodeBlocks: false, copyableCodeBlocks: false }],
  ])("%s", async (_name, props) => {
    for (const block of blocks) {
      const pair = await pairOf(block, props)
      expect(pair.vue, block).toBe(pair.react)
      expect(pair.react).not.toContain("CollapsibleCodeBlock")
    }
  })

  test.each([
    ["animations off (jsdom default)", true],
    ["animations on (browser)", false],
  ])("View Code expands a collapsed block, %s", async (_mode, disabled) => {
    animation.disabled = disabled
    const markdown = "```ts\nconst a: number = 1\n```"
    const { react, vue } = await walkPair(
      () => render(createElement(RMd, {}, markdown)),
      () => h(Markdown, { source: markdown }),
      async (snapshot) => {
        snapshot()
        await interact(() => {
          fireEvent.click(screen.getByText("View Code"))
        })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).not.toContain("View Code")
  })

  test("a code block inside a blockquote and a list", async () => {
    const pair = await pairOf("> ```sql\n> select 1\n> ```\n\n- item\n\n  ```go\n  package main\n  ```")
    expect(pair.vue).toBe(pair.react)
  })
})

describe("Markdown parity: props", () => {
  const markdown = "# Title\n\nHello **world**, _em_ and [a link](https://a.dev).\n\n- item\n\n```js\nx\n```"

  test("class", async () => {
    const pair = await pairOf(markdown, { className: "prose custom" })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('class="MarkdownContent prose custom"')
  })

  test("class as a Vue array or object", async () => {
    const pair = await pairOf(markdown, { className: "a b" }, { class: ["a", { b: true, c: false }] })
    expect(pair.vue).toBe(pair.react)
  })

  test("allowedElements removes everything else, children included (the wrapper div stays)", async () => {
    const pair = await pairOf(markdown, { allowedElements: ["p", "strong"] })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("<h1")
    expect(pair.react).not.toContain("<em")
  })

  test("disallowedElements", async () => {
    const pair = await pairOf(markdown, { disallowedElements: ["em", "a", "pre"] })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("<a")
  })

  test("remarkPlugins run after the built-in ones", async () => {
    const shout = () => (tree: MdastRoot) => {
      visit(tree, "text", (node) => {
        node.value = node.value.toUpperCase()
      })
    }
    const pair = await pairOf(markdown, { remarkPlugins: [shout] })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('"HELLO "')
  })

  test("rehypePlugins run before KaTeX", async () => {
    const mark = () => (tree: HastRoot) => {
      visit(tree, "element", (node) => {
        if (node.tagName === "h1") node.properties.dataLevel = 1
        if (node.tagName === "p") node.properties.className = ["para"]
      })
    }
    const pair = await pairOf(`${markdown}\n\n$$a$$`, { rehypePlugins: [mark], includeMath: true })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('data-level="1"')
    expect(pair.react).toContain('class="para"')
    expect(pair.react).toContain("katex")
  })
})

describe("Markdown parity: component overrides", () => {
  const markdown = "# Heading\n\n*em* and `inline` and [link](/x)\n\n```ts\nconst a = 1\n```\n\n| a |\n| - |\n| x<br>y |"

  const RHeading = ({ node: _node, children, ...rest }: Props & { children?: ReactNode }) =>
    createElement("h1", { ...rest, "data-custom": "" }, children)
  const RKbd = ({ className, children }: Props & { children?: ReactNode }) =>
    createElement("kbd", { className }, children)
  const RLink = ({ href, children }: Props & { children?: ReactNode }) =>
    createElement("a", { "href": href as string, "data-link": "" }, children)
  const RCell = ({ children }: Props & { children?: ReactNode }) => createElement("td", { "data-cell": "" }, children)

  const VHeading = defineComponent({
    props: { node: Object },
    setup(_props, { slots }) {
      return () => h("h1", { "data-custom": "" }, slots.default?.())
    },
  })
  const VKbd = defineComponent({
    props: { node: Object },
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      return () => h("kbd", { class: attrs.class }, slots.default?.())
    },
  })
  const VLink: FunctionalComponent<{ href?: string }> = (props, { slots }) =>
    h("a", { "href": props.href, "data-link": "" }, slots.default?.())
  const VCell: FunctionalComponent = (_props, { slots }) => h("td", { "data-cell": "" }, slots.default?.())

  test("components replace the built-in ones; tag names work too", async () => {
    const pair = await pairOf(
      markdown,
      { components: { h1: RHeading, em: "i", a: RLink, td: RCell } },
      { components: { h1: VHeading, em: "i", a: VLink, td: VCell } },
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("<i>")
    expect(pair.react).toContain("data-link")
    expect(pair.react).not.toContain("TextLink")
  })

  test("a `code` override: inline code uses it, code blocks still read its language", async () => {
    for (const props of [{}, { collapsibleCodeBlocks: false }, { copyableCodeBlocks: false }]) {
      const pair = await pairOf(markdown, { ...props, components: { code: RKbd } }, { ...props, components: { code: VKbd } })
      expect(pair.vue).toBe(pair.react)
      expect(pair.react).toContain("<kbd>")
      expect(pair.react).toContain("language-ts")
    }
  })

  test("a `pre` override with useParseMarkdownPre", async () => {
    const RPre = ({ children }: { children?: ReactNode }) => {
      const { code, language } = rUseParseMarkdownPre(children)
      return createElement("pre", { "data-language": language }, code)
    }
    const VPre = defineComponent({
      props: { node: Object },
      setup(_props, { slots }) {
        return () => {
          const { code, language } = useParseMarkdownPre(slots.default?.())
          return h("pre", { "data-language": language }, code)
        }
      },
    })
    const blocks = "```ts\nconst a = 1\n\n\n```\n\n```\nplain\n```\n\n```\n```\n\n    indented"
    const pair = await pairOf(blocks, { components: { pre: RPre } }, { components: { pre: VPre } })
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('data-language="ts"')
    expect(pair.react).toContain('"const a = 1\\n\\n"')

    // A `code` override that is a tag name: its text children are read the same way
    const tagPair = await pairOf(blocks, { components: { pre: RPre, code: "code" } }, { components: { pre: VPre, code: "code" } })
    expect(tagPair.vue).toBe(tagPair.react)
    expect(tagPair.react).toContain('data-language="ts"')
  })
})

describe("Markdown parity: directives", () => {
  const make = () => {
    const rBadge = rCreateMarkdownDirective<{ children?: string; color?: string }>({
      name: "badge",
      mode: "inline",
      render: ({ children, color }) =>
        createElement("abbr", { "title": String(children).toUpperCase(), "data-color": color }, children as ReactNode),
    })
    const rCallout = rCreateMarkdownDirective<{ children?: string; tone?: string }>({
      name: "callout",
      mode: "block",
      render: ({ children, tone }) => createElement("aside", { "data-tone": tone }, children as ReactNode),
    })
    const vBadge = createMarkdownDirective<{ children?: string; color?: string }>({
      name: "badge",
      mode: "inline",
      render: ({ children, color }) => h("abbr", { "title": String(children).toUpperCase(), "data-color": color }, children),
    })
    const vCallout = createMarkdownDirective<{ children?: string; tone?: string }>({
      name: "callout",
      mode: "block",
      render: ({ children, tone }) => h("aside", { "data-tone": tone }, children as unknown as VNode[]),
    })
    return { rBadge, rCallout, vBadge, vCallout }
  }

  test("inline and block directives render through their render functions", async () => {
    const { rBadge, rCallout, vBadge, vCallout } = make()
    const source = (badge: typeof rBadge | typeof vBadge, callout: typeof rCallout | typeof vCallout) =>
      `Status${badge({ children: "ready", color: "green" })} now, plain${badge({})}.${callout({ children: "Heads **up**", tone: "warn" })}\n\nInside the callout.`
    const pair = await renderPair(
      createElement(RMd, { directives: [rBadge, rCallout] }, source(rBadge, rCallout)),
      () => h(Markdown, { directives: [vBadge, vCallout], source: source(vBadge, vCallout) }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('title="READY"')
    expect(pair.react).toContain('data-tone="warn"')
    expect(vBadge({ children: "x" })).toMatch(/^ :OaiMdDirective_badge_[a-z0-9]{5}\[x\]\{attrs="e30"\}$/)
  })

  test("unregistered directives become elements named after them", async () => {
    const pair = await pairOf("Meet at 10:30, see:here and :abbr[HTML]{title=\"Hyper\"}\n\n::leaf\n\n:::note\nbody\n:::")
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("<here>")
    expect(pair.react).toContain("<note>")
  })
})

describe("Markdown parity: docs page templates", () => {
  // The templates content/vue/components/markdown.mdx shows and runs
  const mdx = readFileSync(path.resolve(process.cwd(), "content/vue/components/markdown.mdx"), "utf8")
  const templates = Object.fromEntries(Array.from(mdx.matchAll(/export const (\w+) = `([^`]*)`/g), ([, name, template]) => [name, template]))

  const fromTemplate = (template: string, state: Props) => {
    const { code } = compile(template, { hoistStatic: true })
    const renderFn = new Function("Vue", code)(Vue) as Vue.RenderFunction & { _rc?: boolean }
    renderFn._rc = true
    return () => h(defineComponent({ components: { Markdown }, setup: () => state, render: renderFn }))
  }

  test.each([
    ["overview", {}, { markdownContent }],
    ["math", { includeMath: true }, { markdownWithLatex }],
  ] as const)("%s", async (name, props, state) => {
    expect(templates[name]).toBeDefined()
    const markdown = Object.values(state)[0]
    const pair = await renderPair(createElement(RMd, props, markdown), fromTemplate(templates[name], state))
    expect(pair.vue).toBe(pair.react)
  })
})
