// Post-tsc fix-ups for dist/, run as the last build step.
//
// 1. Adds file extensions to module specifiers.
//
// The package is "type": "module", so bundlers and runtimes that apply fully
// specified ESM resolution (webpack 5, Node ESM, TypeScript NodeNext) reject
// extensionless specifiers such as "./Button" or "lodash/clamp". tsc keeps
// specifiers exactly as written in src/, so this rewrites the build output
// instead of every import in the sources:
//
// - relative specifiers in .js and .d.ts files get ".js" or "/index.js";
// - bare subpaths of packages without an "exports" map (lodash,
//   react-syntax-highlighter) get the same in .js files.
//
// Specifiers are found with the TypeScript parser, so comments and strings
// are never touched; CSS, JSON, already-specified paths and packages with an
// exports map are left alone.
//
// 2. Points `/// <reference path>` directives in declarations at dist/.
//
// tsc writes a preserved reference to a hand-written declaration (src/global.d.ts)
// as a path into src/, which is not published. build:assets copies those files
// to the same place under dist/types, so the directive is redirected there.
//
// Running the script twice is a no-op.

import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const distDir = path.join(packageRoot, "dist")
const srcDir = path.join(packageRoot, "src")
const typesDir = path.join(distDir, "types")
const require = createRequire(path.join(packageRoot, "package.json"))

const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile()
const hasExtension = (spec) => /\.(?:[cm]?js|json|css)$/.test(spec)

const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return walk(full)
        return entry.name.endsWith(".js") || entry.name.endsWith(".d.ts") ? [full] : []
      })
    : []

// Directory of an installed package, found without require.resolve so that
// packages whose exports map hides package.json still resolve.
const packageDirCache = new Map()
const findPackageDir = (name) => {
  if (!packageDirCache.has(name)) {
    const dir = (require.resolve.paths(name) ?? [])
      .map((base) => path.join(base, name))
      .find((candidate) => isFile(path.join(candidate, "package.json")))
    packageDirCache.set(name, dir ?? null)
  }
  return packageDirCache.get(name)
}

// Appends ".js" or "/index.js" when exactly that target exists
const specify = (spec, base, isDeclaration) => {
  const [fileSuffix, indexSuffix] = isDeclaration ? [".d.ts", "/index.d.ts"] : [".js", "/index.js"]
  if (isFile(base + fileSuffix)) return `${spec}.js`
  if (isFile(base + indexSuffix)) return `${spec}/index.js`
  return null
}

const rewriteSpecifier = (spec, fromDir, isDeclaration) => {
  if (hasExtension(spec)) return null

  if (spec.startsWith("./") || spec.startsWith("../")) {
    return specify(spec, path.resolve(fromDir, spec), isDeclaration)
  }

  // Declaration files keep bare specifiers: their types often come from
  // `declare module "pkg/sub"` blocks keyed by the extensionless name
  if (isDeclaration || spec.startsWith("node:")) return null

  const parts = spec.split("/")
  const nameLength = spec.startsWith("@") ? 2 : 1
  if (parts.length <= nameLength) return null
  const name = parts.slice(0, nameLength).join("/")
  const subpath = parts.slice(nameLength).join("/")
  const packageDir = findPackageDir(name)
  if (!packageDir) return null
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"))
  if (manifest.exports) return null
  return specify(spec, path.join(packageDir, subpath), false)
}

const moduleSpecifierOf = (node) => {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
    return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier : null
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const [arg] = node.arguments
    return arg && ts.isStringLiteral(arg) ? arg : null
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return ts.isStringLiteral(node.argument.literal) ? node.argument.literal : null
  }
  return null
}

// `/// <reference path="…src/x.d.ts" />` from a dist/types file → the copy in dist/types
const rewriteReferencePath = (refPath, fromDir) => {
  const target = path.resolve(fromDir, refPath)
  if (!target.startsWith(srcDir + path.sep)) return null
  const copy = path.join(typesDir, path.relative(srcDir, target))
  if (!isFile(copy)) return null
  const relative = path.relative(fromDir, copy).split(path.sep).join("/")
  return relative.startsWith(".") ? relative : `./${relative}`
}

let filesChanged = 0
let specifiersChanged = 0
const unresolvedRelative = []

for (const file of walk(distDir)) {
  const isDeclaration = file.endsWith(".d.ts")
  const text = fs.readFileSync(file, "utf8")
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    false,
    isDeclaration ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  )
  const edits = []
  const visit = (node) => {
    const literal = moduleSpecifierOf(node)
    if (literal) {
      const next = rewriteSpecifier(literal.text, path.dirname(file), isDeclaration)
      if (next) {
        // Replace the text between the quotes, keeping the original quote style
        edits.push({ start: literal.getStart(source) + 1, end: literal.getEnd() - 1, text: next })
      } else if (!hasExtension(literal.text) && literal.text.startsWith(".")) {
        unresolvedRelative.push(`${path.relative(packageRoot, file)}: ${literal.text}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (isDeclaration) {
    for (const ref of source.referencedFiles) {
      const next = rewriteReferencePath(ref.fileName, path.dirname(file))
      if (next) {
        // ref.pos/end span the path text inside the directive's quotes
        edits.push({ start: ref.pos, end: ref.end, text: next })
      }
    }
  }
  if (edits.length === 0) continue

  let output = text
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  fs.writeFileSync(file, output)
  filesChanged++
  specifiersChanged += edits.length
}

if (unresolvedRelative.length > 0) {
  console.error(`finalize-dist: ${unresolvedRelative.length} relative specifier(s) not found:`)
  for (const line of unresolvedRelative) console.error(`  ${line}`)
  process.exit(1)
}

console.log(`finalize-dist: ${specifiersChanged} specifier(s) and reference(s) in ${filesChanged} file(s)`)
