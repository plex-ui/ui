import { Children, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react"

/**
 * The children with fragments opened, as the DOM would lay them out (a fragment adds no box), each keyed by its path so
 * that the elements of two fragments never share a key.
 */
export function flattenChildren(children: ReactNode, prefix = ""): ReactNode[] {
  const out: ReactNode[] = []
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === Fragment) {
      out.push(...flattenChildren((child as ReactElement<{ children?: ReactNode }>).props.children, `${prefix}${String(child.key)}/`))
    } else if (prefix && isValidElement(child)) {
      out.push(cloneElement(child, { key: `${prefix}${String(child.key)}` }))
    } else out.push(child)
  }
  return out
}

/** The elements of one component among the children, fragments opened. */
export function childrenOfType<P>(children: ReactNode, type: unknown): ReactElement<P>[] {
  return flattenChildren(children).filter((child): child is ReactElement<P> => isValidElement(child) && child.type === type)
}

/** The text of a node, read through elements: the accessible name of a label that is not a plain string. */
export function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children)
  return ""
}

/** Something to draw: not nothing, a boolean or an empty text (`icon={show && <Sun />}`). */
export const isRenderable = (node: ReactNode) => node != null && typeof node !== "boolean" && node !== ""
