// Fails unless the published @plexui/styles can serve a package about to be
// released: the workspace's @plexui/styles version must be on npm, inside the
// range the package depends on, and its tarball must contain every
// `@plexui/styles/...` file the package's built `dist` imports (a CSS module
// added without republishing styles would otherwise ship an import that
// consumers cannot resolve).
// Usage: node scripts/check-styles-published.mjs [ui|vue] (ui by default)
import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const pkg = process.argv[2] ?? "ui"
const readJson = (file) => JSON.parse(readFileSync(path.join(ROOT, file), "utf8"))
const range = readJson(`packages/${pkg}/package.json`).dependencies["@plexui/styles"]
const styles = readJson("packages/styles/package.json")
const version = styles.version

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const npm = (args) => {
  try {
    return execFileSync("npm", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return "" // npm exits non-zero when the package or version does not exist
  }
}

if (!npm(["view", `@plexui/styles@${version}`, "version"])) {
  fail(`@plexui/styles@${version} (the workspace version) is not on npm. Publish it first: npm run publish:styles`)
}
const inRange = npm(["view", `@plexui/styles@${range}`, "version", "--json"])
if (!inRange.includes(`"${version}"`)) {
  fail(`@plexui/styles@${version} does not satisfy ${pkg}'s dependency range ${range}.`)
}

// Files in the published tarball
const packed = JSON.parse(npm(["pack", `@plexui/styles@${version}`, "--dry-run", "--json"]) || "[]")
const files = new Set((packed[0]?.files ?? []).map((file) => file.path))

// `@plexui/styles/<subpath>` specifiers in the package's dist, mapped through the exports
const exportsMap = Object.entries(styles.exports).filter(([, target]) => typeof target === "string")
const resolveSubpath = (subpath) => {
  for (const [key, target] of exportsMap) {
    const prefix = key.slice(2).replace("*", "")
    if (key.endsWith("*") ? subpath.startsWith(prefix) : subpath === prefix) {
      return target.slice(2).replace("*", subpath.slice(prefix.length))
    }
  }
  return null
}
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  )
const missing = new Set()
for (const file of walk(path.join(ROOT, `packages/${pkg}/dist/es`))) {
  if (!/\.(js|css)$/.test(file)) continue
  for (const [, subpath] of readFileSync(file, "utf8").matchAll(/@plexui\/styles\/([\w./-]+)/g)) {
    const target = resolveSubpath(subpath)
    if (target && !files.has(target)) missing.add(`@plexui/styles/${subpath}`)
  }
}
if (missing.size > 0) {
  fail(
    `@plexui/styles@${version} on npm lacks files ${pkg} imports:\n  ${[...missing].join("\n  ")}\n` +
      "Bump packages/styles, then publish it: npm run publish:styles",
  )
}

console.log(`@plexui/styles@${version} is on npm and has every file ${pkg} imports.`)
