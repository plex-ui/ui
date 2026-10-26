// Prints the release notes for one version: its section of the docs
// changelog (`## <version> (<date>)` up to the next `## ` heading), with a
// link to the full page. Exits 1 when the changelog has no such section.
// Usage: node scripts/release-notes.mjs <version>
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const version = process.argv[2]
if (!version) {
  console.error("Usage: node scripts/release-notes.mjs <version>")
  process.exit(2)
}

const lines = readFileSync(path.join(ROOT, "content/docs/changelog.mdx"), "utf8").split("\n")
const heading = new RegExp(`^## ${version.replace(/\./g, "\\.")}(\\s|$)`)
const start = lines.findIndex((line) => heading.test(line))
if (start === -1) {
  console.error(`content/docs/changelog.mdx has no "## ${version}" section.`)
  process.exit(1)
}

const rest = lines.slice(start + 1)
const end = rest.findIndex((line) => line.startsWith("## "))
const body = (end === -1 ? rest : rest.slice(0, end))
  .join("\n")
  .replace(/\n-{3,}\s*$/, "") // the rule that separates versions on the page
  .replace(/\]\(\//g, "](https://plexui.com/") // site links, which GitHub would resolve against itself
  .trim()

console.log(`${body}\n\nFull changelog: https://plexui.com/docs/changelog`)
