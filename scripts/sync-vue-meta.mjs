#!/usr/bin/env node
// Writes content/vue/components/meta.json: the React page order from
// content/components/meta.json, keeping only slugs that have a Vue page.
// tests/parity/docs-sync.test.ts fails when the file is out of date.
//
//   node scripts/sync-vue-meta.mjs

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export function vueMeta() {
  const react = JSON.parse(readFileSync(path.join(ROOT, "content/components/meta.json"), "utf8"))
  const pages = react.pages.filter((slug) => existsSync(path.join(ROOT, "content/vue/components", `${slug}.mdx`)))
  return { ...react, pages }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const meta = vueMeta()
  writeFileSync(path.join(ROOT, "content/vue/components/meta.json"), `${JSON.stringify(meta)}\n`)
  console.log(`[sync-vue-meta] ${meta.pages.length - 1} Vue component pages.`)
}
