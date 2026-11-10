import { readFileSync } from "node:fs"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import { unified } from "unified"

type Statement = { type: string; start: number; end: number; declaration?: { declarations?: { id: { name: string } }[] } }
type EsmNode = { type: string; data?: { estree?: { body: Statement[] } } }

/**
 * The source of each `export const` initializer of an MDX page, keyed by name. A test reads a declaration here
 * instead of slicing up to the next export, so the page may reorder its exports or put prose after one.
 */
export function mdxExports(path: string): Map<string, string> {
  const source = readFileSync(path, "utf8")
  const tree = unified().use(remarkParse).use(remarkMdx).parse(source) as unknown as { children: EsmNode[] }
  const declarations = new Map<string, string>()
  for (const node of tree.children) {
    if (node.type !== "mdxjsEsm") continue
    for (const statement of node.data?.estree?.body ?? []) {
      for (const declaration of statement.declaration?.declarations ?? []) {
        const text = source.slice(statement.start, statement.end)
        const marker = `export const ${declaration.id.name} = `
        if (text.startsWith(marker)) declarations.set(declaration.id.name, text.slice(marker.length).trim())
      }
    }
  }
  return declarations
}

/** Several declarations of a page as plain `const` statements, in the order given. */
export function mdxDeclarations(path: string, names: string[]): string {
  const declarations = mdxExports(path)
  return names
    .map((name) => {
      const value = declarations.get(name)
      if (value === undefined) throw new Error(`${path} has no export ${name}`)
      return `const ${name} = ${value};`
    })
    .join("\n")
}
