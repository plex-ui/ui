import { watch } from "node:fs"
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import postcss from "postcss"

import { platformUIRequiredPlugins } from "../postcss.config.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ROOT = path.resolve(__dirname, "..")
const SRC_DIR = path.join(PROJECT_ROOT, "src")
const OUT_DIR = path.join(PROJECT_ROOT, "dist/es")
/** Files the CSS refers to by url(), copied beside it as they are. */
const ASSET_DIRS = ["styles/katex-fonts", "styles/inter-fonts"]

/**
 * Recursively collect every `.css` file within the provided directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectCssFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectCssFiles(fullPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(fullPath)
    }
  }

  return files
}

async function buildCss() {
  const cssFiles = (await collectCssFiles(SRC_DIR)).sort()

  if (cssFiles.length === 0) {
    console.warn("[build-css] No CSS files found – skipping PostCSS step.")
    return
  }

  const passthroughCssFiles = new Set(["styles/index.css", "styles/variables-tailwind-theme.css"])

  for (const file of cssFiles) {
    const relativePath = path.relative(SRC_DIR, file)
    const normalizedRelativePath = relativePath.split(path.sep).join("/")
    const to = path.join(OUT_DIR, relativePath)
    const source = await readFile(file, "utf8")

    if (passthroughCssFiles.has(normalizedRelativePath)) {
      await mkdir(path.dirname(to), { recursive: true })
      await writeFile(to, source, "utf8")
      continue
    }

    const processor = postcss(platformUIRequiredPlugins())
    const result = await processor.process(source, {
      from: file,
      to,
      map: false,
    })

    for (const warning of result.warnings()) {
      console.warn(`[postcss] ${warning.toString()}`)
    }

    await mkdir(path.dirname(to), { recursive: true })
    await writeFile(to, result.css, "utf8")
  }

  for (const dir of ASSET_DIRS) {
    await cp(path.join(SRC_DIR, dir), path.join(OUT_DIR, dir), { recursive: true })
  }

  console.log(
    `[build-css] Processed ${cssFiles.length} CSS file${cssFiles.length === 1 ? "" : "s"}.`,
  )
}

const isWatchMode = process.argv.includes("--watch") || process.argv.includes("-w")

async function run() {
  await buildCss()

  if (!isWatchMode) return

  console.log("[build-css] Watching src/ for CSS and font changes...")
  let rebuildTimer = null
  const scheduleRebuild = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(() => {
      buildCss().catch((error) => console.error("[build-css]", error))
    }, 100)
  }
  watch(SRC_DIR, { recursive: true }, (_event, filename) => {
    const name = filename?.split(path.sep).join("/")
    if (name && (name.endsWith(".css") || ASSET_DIRS.some((dir) => name.startsWith(`${dir}/`)))) scheduleRebuild()
  })
}

run().catch((error) => {
  console.error("[build-css] Failed to process CSS", error)
  process.exitCode = 1
})
