import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { expect, test } from "vitest"

// Both DataTables add `align` to TanStack's ColumnMeta. A project that
// type-checks @plexui/ui and @plexui/vue together sees both augmentations,
// and TypeScript rejects them (TS2428) unless they augment the same module.
// This compiles the two `declare module` blocks, taken from the sources,
// next to code that uses `meta.align` through both packages.

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const virtualDir = join(root, "__data-table-types__")

/** The `declare module` block of a DataTable source, with the RowData import it uses. */
const augmentation = (file: string, pkg: string) => {
  const source = readFileSync(join(root, file), "utf8")
  const block = source.match(/^declare module "[^"]+" \{[\s\S]*?^\}$/m)
  if (!block) throw new Error(`No module augmentation in ${file}`)
  return `import type { RowData } from "${pkg}"\n${block[0]}\nexport {}\n`
}

const files: Record<string, string> = {
  "react.ts": augmentation("packages/ui/src/components/DataTable/DataTable.tsx", "@tanstack/react-table"),
  "vue.ts": augmentation("packages/vue/src/components/DataTable/DataTable.ts", "@tanstack/vue-table"),
  "use.ts": `import type { ColumnDef as ReactColumnDef } from "@tanstack/react-table"
import type { ColumnDef as VueColumnDef } from "@tanstack/vue-table"
type Row = { name: string }
export const reactColumn: ReactColumnDef<Row, unknown> = { accessorKey: "name", meta: { align: "right" } }
export const vueColumn: VueColumnDef<Row, unknown> = { accessorKey: "name", meta: { align: "center" } }
// @ts-expect-error not an alignment
export const wrong: VueColumnDef<Row, unknown> = { accessorKey: "name", meta: { align: "middle" } }
`,
}

test("the React and Vue ColumnMeta augmentations type-check together", () => {
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const virtual = (fileName: string) =>
    fileName.startsWith(`${virtualDir}/`) ? files[fileName.slice(virtualDir.length + 1)] : undefined
  const { fileExists, readFile, getSourceFile } = host
  host.fileExists = (fileName) => virtual(fileName) !== undefined || fileExists(fileName)
  host.readFile = (fileName) => virtual(fileName) ?? readFile(fileName)
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const text = virtual(fileName)
    return text !== undefined
      ? ts.createSourceFile(fileName, text, languageVersion)
      : getSourceFile(fileName, languageVersion, ...rest)
  }

  const program = ts.createProgram(
    Object.keys(files).map((name) => join(virtualDir, name)),
    options,
    host,
  )
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((d) => `${d.file ? d.file.fileName.replace(`${root}/`, "") : ""} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`)

  expect(diagnostics).toEqual([])
}, 60_000)
