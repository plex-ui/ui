// Bumps package versions for a release and keeps everything that pins them in step:
// - packages/<name>/package.json "version";
// - the @plexui/styles range in ui and vue, when the new styles version falls
//   outside it (ui and vue then need a release too, and the script says so);
// - package-lock.json, which `npm ci` in the release workflow checks;
// - for ui, the changelog's "## Unreleased" heading becomes "## <version> (<date>)".
// Merging the result into master publishes it (.github/workflows/publish.yml).
// Usage: npm run release:bump -- [--dry-run] <styles|ui|vue|mcp> <patch|minor|major|x.y.z> [<package> <level> ...]
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PACKAGES = ["styles", "ui", "vue", "mcp"]
const STYLES_DEPENDENTS = ["ui", "vue"]
const CHANGELOG = "content/docs/changelog.mdx"

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const pairs = args.filter((arg) => arg !== "--dry-run")
if (pairs.length === 0 || pairs.length % 2 !== 0) {
  fail("Usage: npm run release:bump -- [--dry-run] <styles|ui|vue|mcp> <patch|minor|major|x.y.z> [<package> <level> ...]")
}

const parse = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) fail(`"${version}" is not a plain x.y.z version.`)
  return match.slice(1).map(Number)
}

const compare = (a, b) => {
  const [x, y] = [parse(a), parse(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

const increment = (version, level) => {
  if (/^\d+\.\d+\.\d+$/.test(level)) return level
  const [major, minor, patch] = parse(version)
  if (level === "major") return `${major + 1}.0.0`
  if (level === "minor") return `${major}.${minor + 1}.0`
  if (level === "patch") return `${major}.${minor}.${patch + 1}`
  return fail(`Unknown level "${level}": use patch, minor, major or an x.y.z version.`)
}

// A caret range as npm reads it: ^1.2.3 allows 1.x.x from 1.2.3, ^0.2.3 allows 0.2.x from 0.2.3
const satisfiesCaret = (version, range) => {
  const match = /^\^(\d+\.\d+\.\d+)$/.exec(range)
  if (!match) return false
  const [vMajor, vMinor] = parse(version)
  const [rMajor, rMinor] = parse(match[1])
  const sameLine = rMajor > 0 ? vMajor === rMajor : vMajor === 0 && vMinor === rMinor
  return sameLine && compare(version, match[1]) >= 0
}

const read = (file) => readFileSync(path.join(ROOT, file), "utf8")
const changes = new Map()
const edit = (file, update) => changes.set(file, update(changes.get(file) ?? read(file)))

// The single `"key": "value"` line of a package.json, replaced in place to keep its formatting
const replaceField = (text, file, key, value) => {
  const pattern = new RegExp(`("${key.replace(/[/@]/g, "\\$&")}":\\s*")([^"]*)(")`, "g")
  const matches = [...text.matchAll(pattern)]
  if (matches.length !== 1) fail(`${file}: expected one "${key}" field, found ${matches.length}.`)
  return text.replace(pattern, `$1${value}$3`)
}

const bumped = new Map()
for (let i = 0; i < pairs.length; i += 2) {
  const [name, level] = [pairs[i], pairs[i + 1]]
  if (!PACKAGES.includes(name)) fail(`Unknown package "${name}": use ${PACKAGES.join(", ")}.`)
  const file = `packages/${name}/package.json`
  const current = JSON.parse(read(file)).version
  const next = increment(current, level)
  if (compare(next, current) <= 0) fail(`@plexui/${name}: ${next} is not above the current ${current}.`)
  edit(file, (text) => replaceField(text, file, "version", next))
  bumped.set(name, { current, next })
}

const notes = []

const styles = bumped.get("styles")
if (styles) {
  for (const dependent of STYLES_DEPENDENTS) {
    const file = `packages/${dependent}/package.json`
    const range = JSON.parse(read(file)).dependencies["@plexui/styles"]
    if (satisfiesCaret(styles.next, range)) continue
    edit(file, (text) => replaceField(text, file, "@plexui/styles", `^${styles.next}`))
    if (!bumped.has(dependent)) {
      notes.push(
        `@plexui/${dependent} now depends on @plexui/styles ^${styles.next} (was ${range}): bump @plexui/${dependent} too, or its published version keeps the old range.`,
      )
    }
  }
}

const ui = bumped.get("ui")
if (ui) {
  const text = changes.get(CHANGELOG) ?? read(CHANGELOG)
  const date = new Date().toISOString().slice(0, 10)
  if (/^## Unreleased[ \t]*$/m.test(text)) {
    edit(CHANGELOG, (current) => current.replace(/^## Unreleased[ \t]*$/m, `## ${ui.next} (${date})`))
  } else if (!new RegExp(`^## ${ui.next.replace(/\./g, "\\.")}(\\s|$)`, "m").test(text)) {
    notes.push(`${CHANGELOG} has neither "## Unreleased" nor "## ${ui.next}": add the release's section before merging.`)
  }
}

for (const [name, { current, next }] of bumped) console.log(`@plexui/${name}: ${current} -> ${next}`)
for (const file of changes.keys()) console.log(`${dryRun ? "would update" : "updated"} ${file}`)

if (!dryRun) {
  for (const [file, text] of changes) writeFileSync(path.join(ROOT, file), text)
  execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: ROOT,
    stdio: "inherit",
  })
  console.log("updated package-lock.json")
}

for (const note of notes) console.warn(`Note: ${note}`)
console.log(
  dryRun
    ? "Dry run: nothing was written."
    : "Commit these files and merge into master: the release workflow publishes every version that is not on npm yet.",
)
