// Serializes a DOM subtree into a stable, diff-friendly string so React and
// Vue output can be compared. Only differences that are implementation noise
// are normalized away; everything else must match exactly:
// - generated ids, `data-radix-*` / `data-reka-*`, `data-dismissable-layer`,
//   and `data-v-app` on the test's Vue mount container
// - focus guard spans that Radix / Reka insert around modal content
// - `pointer-events` inline styles set by the dismissable layer
// - comments and empty text nodes (Vue fragment and teleport anchors)
// - attribute order and inline-style declaration order
// - id references (`aria-labelledby`, `aria-describedby`, `aria-controls`):
//   the value becomes "[ref]" when every target exists. A reference to an
//   element that is not in the DOM is dropped (Radix points the closed
//   trigger's aria-controls at unmounted content; Reka omits it).

const DROPPED_ATTRIBUTE = /^(id|data-radix-.*|data-reka-.*|data-dismissable-layer|data-v-app)$/
const ID_REFERENCE = new Set(["aria-labelledby", "aria-describedby", "aria-controls"])

const isFocusGuard = (element: Element) =>
  element.hasAttribute("data-radix-focus-guard") || element.hasAttribute("data-reka-focus-guard")

const normalizeStyle = (value: string) =>
  value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration && !declaration.startsWith("pointer-events"))
    .map((declaration) => declaration.replace(/\s*:\s*/, ": "))
    .sort()
    .join("; ")

const attributesOf = (element: Element, doc: Document) => {
  const result: string[] = []

  for (const { name, value } of Array.from(element.attributes)) {
    if (DROPPED_ATTRIBUTE.test(name)) continue

    if (ID_REFERENCE.has(name)) {
      const ids = value.split(/\s+/).filter(Boolean)
      if (ids.length > 0 && ids.every((id) => doc.getElementById(id))) {
        result.push(`${name}="[ref]"`)
      }
      continue
    }

    if (name === "style") {
      const style = normalizeStyle(value)
      if (style) result.push(`style="${style}"`)
      continue
    }

    result.push(`${name}="${value}"`)
  }

  return result.sort()
}

const serializeNode = (node: Node, doc: Document, depth: number, out: string[]) => {
  const indent = "  ".repeat(depth)

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ""
    if (text !== "") out.push(`${indent}${JSON.stringify(text)}`)
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return

  const element = node as Element
  if (isFocusGuard(element)) return

  const tag = element.tagName.toLowerCase()
  const attributes = attributesOf(element, doc)
  out.push(`${indent}<${[tag, ...attributes].join(" ")}>`)
  for (const child of Array.from(element.childNodes)) {
    serializeNode(child, doc, depth + 1, out)
  }
}

/** Serializes every child of `root` (default: document.body). */
export const serializeDom = (root: Element = document.body) => {
  const out: string[] = []
  for (const child of Array.from(root.childNodes)) {
    serializeNode(child, root.ownerDocument, 0, out)
  }
  return out.join("\n")
}
