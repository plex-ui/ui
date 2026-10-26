#!/usr/bin/env node
// Writes the Vue registry for the shadcn-vue CLI under public/r/vue: a styles
// item, one item per Vue component page (a thin re-export of
// @plexui/vue/components/<Dir>, like the React items in public/r) and
// index.json. Reads packages/mcp/src/data/manifest-vue.json, so run
// `npm run generate:manifest` first.
//
//   npx shadcn-vue@latest add https://plexui.com/r/vue/styles.json
//   npx shadcn-vue@latest add https://plexui.com/r/vue/button.json

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "public/r/vue")
const BASE_URL = "https://plexui.com/r/vue"

const manifest = JSON.parse(readFileSync(path.join(ROOT, "packages/mcp/src/data/manifest-vue.json"), "utf8"))

const write = (name, data) => writeFileSync(path.join(OUT, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`)

// Regenerated from scratch, so items of removed pages disappear
mkdirSync(OUT, { recursive: true })
for (const file of readdirSync(OUT).filter((name) => name.endsWith(".json"))) {
  rmSync(path.join(OUT, file))
}

const styles = {
  $schema: "https://shadcn-vue.com/schema/registry-item.json",
  name: "styles",
  type: "registry:style",
  dependencies: ["@plexui/vue"],
  files: [
    {
      path: "assets/plexui.css",
      type: "registry:file",
      target: "assets/plexui.css",
      content: '@import "@plexui/styles/css";\n',
    },
  ],
  docs: "Import `./assets/plexui.css` once before mounting the app (e.g. in main.ts), after `@import \"tailwindcss\";` in your main stylesheet. See https://plexui.com/docs/vue for the Vite plugin and SSR setup.",
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
        content: `export * from "${component.importPath}"\n`,
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
      description: "Plex UI design tokens and component styles (import once before mounting the app).",
      files: [{ path: "styles.json", type: "registry:file" }],
    },
    ...items,
  ],
})

console.error(`[generate-vue-registry] Wrote ${items.length} components + styles to public/r/vue.`)
