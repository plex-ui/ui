// Fails when the @plexui/styles range that a package depends on has no
// published version, so it is never released with an uninstallable
// dependency. Usage: node scripts/check-styles-published.mjs [ui|vue] (ui by default)
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const pkg = process.argv[2] ?? "ui"
const manifest = JSON.parse(readFileSync(new URL(`../packages/${pkg}/package.json`, import.meta.url), "utf8"))
const range = manifest.dependencies["@plexui/styles"]

let published = ""
try {
  published = execFileSync("npm", ["view", `@plexui/styles@${range}`, "version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
} catch {
  // npm exits non-zero when the package does not exist at all
}

if (!published) {
  console.error(`@plexui/styles@${range} is not on npm. Publish it first: npm run publish:styles`)
  process.exit(1)
}

console.log(`@plexui/styles@${range} is on npm.`)
