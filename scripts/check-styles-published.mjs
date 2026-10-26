// Fails when the @plexui/styles range that @plexui/ui depends on has no
// published version, so ui is never released with an uninstallable dependency.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const ui = JSON.parse(readFileSync(new URL("../packages/ui/package.json", import.meta.url), "utf8"))
const range = ui.dependencies["@plexui/styles"]

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
