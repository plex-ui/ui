import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Plex UI CSS lives in @plexui/styles. Each stylesheet gets a one-line
// re-export here so `@plexui/ui/css` and `@plexui/ui/styles/*.css` keep
// resolving for existing installs.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, "../dist/es/styles")
const STYLES_DIR = path.dirname(fileURLToPath(import.meta.resolve("@plexui/styles/css")))

async function buildCss() {
  const files = (await readdir(STYLES_DIR)).filter((name) => name.endsWith(".css")).sort()

  if (files.length === 0) {
    throw new Error(`No CSS in ${STYLES_DIR}. Build @plexui/styles first.`)
  }

  await mkdir(OUT_DIR, { recursive: true })
  for (const name of files) {
    await writeFile(path.join(OUT_DIR, name), `@import "@plexui/styles/styles/${name}";\n`, "utf8")
  }

  console.log(`[build-css] Wrote ${files.length} re-exports of @plexui/styles.`)
}

buildCss().catch((error) => {
  console.error("[build-css] Failed to write CSS re-exports", error)
  process.exitCode = 1
})
