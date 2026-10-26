import { h, type VNode } from "vue"
import { refractor } from "refractor/core"
import bash from "refractor/bash"
import c from "refractor/c"
import clike from "refractor/clike"
import css from "refractor/css"
import diff from "refractor/diff"
import docker from "refractor/docker"
import go from "refractor/go"
import java from "refractor/java"
import javascript from "refractor/javascript"
import json from "refractor/json"
import jsx from "refractor/jsx"
import kotlin from "refractor/kotlin"
import markdown from "refractor/markdown"
import markup from "refractor/markup"
import php from "refractor/php"
import python from "refractor/python"
import ruby from "refractor/ruby"
import scss from "refractor/scss"
import sql from "refractor/sql"
import toml from "refractor/toml"
import tsx from "refractor/tsx"
import typescript from "refractor/typescript"
import yaml from "refractor/yaml"

// Port of what react-syntax-highlighter 16.1.0 (`PrismLight`) renders for the
// React CodeBlock's options. The React CodeBlock highlights with refractor,
// passes a custom `renderer` (which turns `wrapLines` on), and renders every
// row with `createElement({ useInlineStyles: true, stylesheet: {} })`. The
// functions below follow `dist/esm/highlight.js` and `dist/esm/create-element.js`
// for that path, so the emitted <span> tree, class names and text nodes are
// the same. Options CodeBlock never enables (line numbers, `wrapLongLines`,
// `lineProps`, inline styles from a stylesheet) are left out.

// PrismLight's `registerLanguage(name, syntax)` ignores `name` and calls
// `refractor.register(syntax)`, so registration below mirrors the React list
// one for one. Quirk kept: React registers `json` again as "jsonc", which
// adds no "jsonc" language, so `language="jsonc"` renders as plain text.
// refractor/core is a shared singleton; registering the same syntaxes twice
// is a no-op.
const LANGUAGES = [
  javascript, // javascript
  jsx, // jsx
  typescript, // typescript
  tsx, // tsx
  markup, // markup
  css, // css
  scss, // scss
  c, // c
  clike, // clike
  bash, // bash
  json, // json
  json, // jsonc
  python, // python
  sql, // sql
  diff, // diff
  markdown, // markdown
  yaml, // yaml
  toml, // toml
  docker, // docker
  java, // java
  go, // go
  php, // php
  ruby, // ruby
  kotlin, // kotlin
]

for (const syntax of LANGUAGES) {
  refractor.register(syntax)
}

type HastText = { type: "text"; value: string }
type HastElement = {
  type: "element"
  tagName: string
  properties: { className?: string[] }
  children: HastNode[]
}
type HastRoot = { type: "root"; children: HastNode[] }
type HastNode = HastText | HastElement | HastRoot

const createLineElement = ({ children, className = [] }: { children: HastNode[]; className?: string[] }): HastElement => ({
  // `wrapLines` is on and `lineProps` is `{}`, so only the class names remain
  type: "element",
  tagName: "span",
  properties: { className },
  children,
})

// Every text node becomes a <span> carrying the classes of all its ancestors
const flattenCodeTree = (tree: HastNode[], className: string[] = [], newTree: HastElement[] = []): HastElement[] => {
  for (const node of tree) {
    if (node.type === "text") {
      newTree.push(createLineElement({ children: [node], className: [...new Set(className)] }))
    } else if (node.children) {
      const classNames = className.concat((node.type === "element" && node.properties?.className) || [])
      flattenCodeTree(node.children, classNames).forEach((element) => newTree.push(element))
    }
  }
  return newTree
}

// `processLines` with wrapLines = true and no line numbers: splits the
// flattened spans at every "\n" and groups them into one <span> per line
const processLines = (codeTree: HastNode[]): HastElement[] => {
  const tree = flattenCodeTree(codeTree)
  const newTree: HastElement[] = []
  let lastLineBreakIndex = -1
  let index = 0

  const createLine = (children: HastNode[], className: string[] = []) => createLineElement({ children, className })

  while (index < tree.length) {
    const node = tree[index]!
    const value = (node.children[0] as HastText).value
    const newLines = value.match(/\n/g)

    if (newLines) {
      const splitValue = value.split("\n")
      splitValue.forEach((text, i) => {
        const newChild: HastText = { type: "text", value: `${text}\n` }

        if (i === 0) {
          // First line: everything since the last break, plus this piece
          const children = (tree.slice(lastLineBreakIndex + 1, index) as HastNode[]).concat(
            createLineElement({ children: [newChild], className: node.properties.className }),
          )
          newTree.push(createLine(children))
        } else if (i === splitValue.length - 1) {
          // Last line: carried into the next row, or a row of its own at the end
          const next = tree[index + 1]
          const stringChild = next && next.children && next.children[0]
          const lastLineInPreviousSpan: HastText = { type: "text", value: `${text}` }
          if (stringChild) {
            tree.splice(index + 1, 0, createLineElement({ children: [lastLineInPreviousSpan], className: node.properties.className }))
          } else {
            newTree.push(createLine([lastLineInPreviousSpan], node.properties.className))
          }
        } else {
          // Neither first nor last
          newTree.push(createLine([newChild], node.properties.className))
        }
      })
      lastLineBreakIndex = index
    }
    index++
  }

  if (lastLineBreakIndex !== tree.length - 1) {
    const children = tree.slice(lastLineBreakIndex + 1, tree.length)
    if (children && children.length) {
      newTree.push(createLine(children))
    }
  }

  return newTree
}

// `getCodeTree` for refractor: unknown languages and "text" fall back to one text node
const getCodeTree = (code: string, language: string | undefined): HastNode[] => {
  const defaultCodeValue: HastNode[] = [{ type: "text", value: code }]
  try {
    return language && language !== "text" ? [refractor.highlight(code, language) as unknown as HastRoot] : defaultCodeValue
  } catch {
    return defaultCodeValue
  }
}

// `createElement` with `useInlineStyles: true` and an empty stylesheet: no
// class is filtered out, "token" is prepended once more (so tokens read
// `token token keyword`, as in React), and the style object stays empty.
const renderNode = (node: HastNode): VNode | string => {
  if (node.type === "text") {
    return node.value
  }
  const element = node as HastElement
  const classNames = element.properties.className!
  const startingClassName = classNames.includes("token") ? ["token"] : []
  const className = startingClassName.concat(classNames).join(" ") || undefined
  return h(element.tagName, { class: className }, element.children.map(renderNode))
}

/** The rows react-syntax-highlighter hands to the React CodeBlock's renderer, as vnodes. */
export const renderHighlightedRows = (code: string, language: string | undefined) =>
  processLines(getCodeTree(code, language)).map(renderNode)
