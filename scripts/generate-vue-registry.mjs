#!/usr/bin/env node
// Writes the Vue registry for the shadcn-vue CLI under public/r/vue: a styles
// item, one item per Vue component page (a thin re-export of
// @plexui/vue/components/<Dir>, like the React items in public/r) and
// index.json. Reads packages/mcp/src/data/manifest-vue.json, so run
// `npm run generate:manifest` first.
//
//   npx shadcn-vue@latest add https://plexui.com/r/vue/styles.json
//   npx shadcn-vue@latest add https://plexui.com/r/vue/button.json

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "public/r/vue")
const BASE_URL = "https://plexui.com/r/vue"

const manifest = JSON.parse(readFileSync(path.join(ROOT, "packages/mcp/src/data/manifest-vue.json"), "utf8"))

// `--check` writes nothing and fails when a committed item is out of date
const CHECK = process.argv.includes("--check")
const written = new Set()
const stale = []

const write = (name, data) => {
  const file = path.join(OUT, `${name}.json`)
  const text = `${JSON.stringify(data, null, 2)}\n`
  written.add(`${name}.json`)
  if (!CHECK) return writeFileSync(file, text)
  if (!existsSync(file) || readFileSync(file, "utf8") !== text) stale.push(`public/r/vue/${name}.json`)
}

// Regenerated from scratch, so items of removed pages disappear
mkdirSync(OUT, { recursive: true })
const previous = readdirSync(OUT).filter((name) => name.endsWith(".json"))
if (!CHECK) {
  for (const file of previous) rmSync(path.join(OUT, file))
}

const styles = {
  $schema: "https://shadcn-vue.com/schema/registry-item.json",
  name: "styles",
  type: "registry:style",
  // The app's own stylesheet imports @plexui/styles, so it is a direct
  // dependency (strict installs such as pnpm do not expose @plexui/vue's)
  dependencies: ["@plexui/vue", "@plexui/styles"],
  files: [
    {
      path: "src/assets/plexui.css",
      type: "registry:file",
      target: "src/assets/plexui.css",
      // Paths in @source are relative to this file, which sits in src/assets/
      content: '@import "@plexui/styles/css";\n@source "../../node_modules/@plexui/vue";\n',
    },
  ],
  docs: "Import it from your main stylesheet right after Tailwind, so Tailwind compiles the utilities Plex UI components use: `@import \"tailwindcss\"; @import \"./plexui.css\";` in src/assets/main.css. Do not import it from JavaScript on its own. See https://plexui.com/docs/vue for the layer order, the Vite plugin and SSR.",
}
write("styles", styles)

const items = []
for (const component of manifest.components) {
  if (!component.importPath) continue
  const names = component.exports?.length ? component.exports : [component.name]
  const item = {
    $schema: "https://shadcn-vue.com/schema/registry-item.json",
    name: component.slug,
    type: "registry:ui",
    title: component.name,
    description: component.description,
    dependencies: ["@plexui/vue"],
    registryDependencies: [`${BASE_URL}/styles.json`],
    files: [
      {
        path: `components/ui/${component.slug}/index.ts`,
        type: "registry:ui",
        // One re-export per module the page imports (Table also brings DataTable)
        content: [...new Set((component.imports ?? [{ path: component.importPath }]).map((entry) => entry.path))]
          .map((path) => `export * from "${path}"\n`)
          .join(""),
      },
    ],
    docs: `Import as \`import { ${names.join(", ")} } from '@/components/ui/${component.slug}'\`. See ${component.docsUrl} for props and examples.`,
  }
  write(component.slug, item)
  items.push({
    name: component.slug,
    type: "registry:ui",
    description: component.description,
    dependencies: ["@plexui/vue"],
  })
}

write("index", {
  $schema: "https://shadcn-vue.com/schema/registry.json",
  name: "plex-ui-vue",
  homepage: "https://plexui.com/docs/vue",
  items: [
    {
      name: "styles",
      type: "registry:style",
      description: "Plex UI design tokens and component styles (import from your main stylesheet after Tailwind).",
      files: [{ path: "styles.json", type: "registry:file" }],
    },
    ...items,
  ],
})

if (CHECK) {
  stale.push(...previous.filter((file) => !written.has(file)).map((file) => `public/r/vue/${file} (no longer generated)`))
  if (stale.length > 0) {
    console.error(`Out of date (run node scripts/generate-vue-registry.mjs): ${stale.join(", ")}`)
    process.exit(1)
  }
  console.error("[generate-vue-registry] public/r/vue is up to date.")
} else {
  console.error(`[generate-vue-registry] Wrote ${items.length} components + styles to public/r/vue.`)
}
