import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"

const flattenTextNodes = (children: ReactNode): ReactNode[] => {
  const nodes = Children.toArray(children)
  const result: ReactNode[] = []
  let buffer = ""

  const flush = () => {
    if (buffer !== "") {
      result.push(buffer)
      buffer = ""
    }
  }

  for (const node of nodes) {
    if (node == null || typeof node === "boolean") {
      continue
    }

    if (typeof node === "string" || typeof node === "number") {
      buffer += String(node)
      continue
    }

    // Boundary encountered: output any accumulated text, then the node
    flush()
    result.push(node)
  }

  flush()
  return result
}

// Wraps the text inside an element's children. The children keep their shape:
// a single element stays one element (Radix's Slot, as in a Tooltip trigger,
// needs exactly one), and children that are not a list of nodes (a lone
// string, a render-prop function) are returned untouched.
const wrapElementChildren = (element: ReactElement<{ children?: ReactNode }>): ReactElement => {
  const innerChildren = element.props.children

  if (isValidElement<{ children?: ReactNode }>(innerChildren)) {
    return cloneElement(element, undefined, wrapElementChildren(innerChildren))
  }

  if (Array.isArray(innerChildren)) {
    return cloneElement(element, undefined, wrapTextNodeSiblings(innerChildren))
  }

  return element
}

// Helper to wrap text node siblings of other elements in a tag,
// which enables sibling selectors to behave as expected for certain conditions
export const wrapTextNodeSiblings = (children: ReactNode): ReactNode => {
  const flattenedChildren = flattenTextNodes(children)
  const childrenCount = Children.count(flattenedChildren)

  return Children.map(flattenedChildren, (child) => {
    if (typeof child === "string" && !!child.trim()) {
      // Children with no siblings can immediately return
      if (childrenCount <= 1) {
        return child
      }

      // Wrap text nodes that have siblings
      return <span>{child}</span>
    }

    // For valid elements, recursively render to capture wrapped children
    if (isValidElement<{ children?: ReactNode }>(child)) {
      return wrapElementChildren(child)
    }

    return child
  })
}
