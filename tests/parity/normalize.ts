// Serializes a DOM subtree into a stable, diff-friendly string so React and
// Vue output can be compared. Only differences that are implementation noise
// are normalized away; everything else must match exactly:
// - `data-radix-*` / `data-reka-*`, `data-dismissable-layer`, and
//   `data-v-app` on the test's Vue mount container
// - focus guard spans that Radix / Reka insert around modal content
// - `pointer-events` inline styles set by the dismissable layer
// - comments and empty text nodes (Vue fragment and teleport anchors)
// - attribute order and inline-style declaration order
// - generated ids (`radix-*`, `reka-*`) become `gen-1`, `gen-2`, ... in
//   document order, and id references (`aria-labelledby`, ...) are rewritten
//   to match, so a swapped label/description still shows. Explicit ids are
//   kept as they are.
// - the one allowed dangling reference: Radix points a closed dialog
//   trigger's aria-controls at content that is not mounted (Reka omits it).
//   Any other reference to a missing element is printed as "[missing]".

const DROPPED_ATTRIBUTE = /^(data-radix-.*|data-reka-.*|data-dismissable-layer|data-v-app)$/
const ID_REFERENCE = new Set(["aria-labelledby", "aria-describedby", "aria-controls"])
const GENERATED_ID = /^(radix-|reka-)/

type IdNames = Map<string, string>

const isClosedDialogTrigger = (element: Element) =>
  element.getAttribute("aria-haspopup") === "dialog" && element.getAttribute("data-state") === "closed"

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

const attributesOf = (element: Element, doc: Document, idNames: IdNames) => {
  const result: string[] = []

  for (const { name, value } of Array.from(element.attributes)) {
    if (DROPPED_ATTRIBUTE.test(name)) continue

    if (name === "id") {
      result.push(`id="${idNames.get(value) ?? value}"`)
      continue
    }

    if (ID_REFERENCE.has(name)) {
      const ids = value.split(/\s+/).filter(Boolean)
      const missing = ids.some((id) => !doc.getElementById(id))
      if (missing && name === "aria-controls" && isClosedDialogTrigger(element)) continue
      const refs = ids.map((id) => (doc.getElementById(id) ? (idNames.get(id) ?? id) : "[missing]"))
      result.push(`${name}="${refs.join(" ")}"`)
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

const serializeNode = (node: Node, doc: Document, idNames: IdNames, depth: number, out: string[]) => {
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
  const attributes = attributesOf(element, doc, idNames)
  out.push(`${indent}<${[tag, ...attributes].join(" ")}>`)
  for (const child of Array.from(element.childNodes)) {
    serializeNode(child, doc, idNames, depth + 1, out)
  }
}

/** Serializes every child of `root` (default: document.body). */
export const serializeDom = (root: Element = document.body) => {
  const idNames: IdNames = new Map()
  for (const element of Array.from(root.querySelectorAll("[id]"))) {
    if (GENERATED_ID.test(element.id) && !idNames.has(element.id)) {
      idNames.set(element.id, `gen-${idNames.size + 1}`)
    }
  }

  const out: string[] = []
  for (const child of Array.from(root.childNodes)) {
    serializeNode(child, root.ownerDocument, idNames, 0, out)
  }
  return out.join("\n")
}
