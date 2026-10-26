import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Writes public/llms.txt from the React manifest, and public/llms-vue.txt plus
// public/llms-vue-full.txt (with every example's code) from the Vue manifest.
// public/llms-full.txt is written by hand.

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const readManifest = (file) =>
  JSON.parse(readFileSync(join(ROOT, "packages/mcp/src/data", file), "utf-8"));

function formatProp(p) {
  const parts = [`  - ${p.name}`];
  if (p.type) parts.push(`(${p.type})`);
  if (p.default) parts.push(`default: ${p.default}`);
  if (p.description) parts.push(`— ${p.description}`);
  return parts.join(" ");
}

function render(manifest, { title, intro, full = false }) {
  const lines = [];

  lines.push(`# ${title}`);
  lines.push(`> ${manifest.description}`);
  lines.push("");
  for (const line of intro) lines.push(line);
  if (intro.length > 0) lines.push("");
  lines.push(`Install: ${manifest.install}`);
  lines.push(`Docs: ${manifest.homepage}`);
  lines.push(`Components: ${manifest.componentCount}`);
  lines.push("");
  lines.push("## Setup");
  lines.push("");
  lines.push("```css");
  lines.push(manifest.setup.css);
  lines.push("```");
  lines.push("");
  lines.push(manifest.setup.provider);
  lines.push("");
  lines.push(`Size scale: ${manifest.sizeScale.join(", ")}`);
  lines.push(`Colors: ${manifest.colors.join(", ")}`);
  lines.push(`Variants: ${manifest.variants.join(", ")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const comp of manifest.components) {
    lines.push(`## ${comp.name}`);
    lines.push(comp.description);
    if (comp.importPath) {
      const names = comp.exports ? comp.exports.join(", ") : comp.name;
      lines.push(`Import: import { ${names} } from "${comp.importPath}"`);
    }
    lines.push(`Docs: ${comp.docsUrl}`);

    if (comp.props && comp.props.length > 0) {
      lines.push("Props:");
      for (const p of comp.props) {
        lines.push(formatProp(p));
      }
    }

    if (comp.subComponents && comp.subComponents.length > 0) {
      for (const sub of comp.subComponents) {
        lines.push(`  ${sub.name}:`);
        for (const p of sub.props) {
          lines.push(`  ${formatProp(p)}`);
        }
      }
    }

    if (comp.examples && comp.examples.length > 0) {
      if (full) {
        for (const example of comp.examples) {
          lines.push("");
          lines.push(`### ${example.name}`);
          if (example.details) lines.push(example.details);
          lines.push("```vue");
          lines.push(example.code);
          lines.push("```");
        }
      } else {
        lines.push(`Examples: ${comp.examples.map((e) => e.name).join(", ")}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

const outputs = [
  {
    file: "llms.txt",
    manifest: readManifest("manifest.json"),
    title: "PlexUI",
    intro: ["Vue 3: https://plexui.com/llms-vue.txt"],
  },
  {
    file: "llms-vue.txt",
    manifest: readManifest("manifest-vue.json"),
    title: "PlexUI for Vue",
    intro: [
      "Vue 3 components with the same names, props, defaults and markup as the React library (https://plexui.com/llms.txt).",
      "In Vue: `class` instead of `className`, slots instead of ReactNode props, `v-model:value` for controlled values, `@x` listeners for `onX` callbacks, flat named exports for compound parts (e.g. DialogTrigger), composables from @plexui/vue/composables/<name>.",
      "Every example's code: https://plexui.com/llms-vue-full.txt",
    ],
  },
  {
    file: "llms-vue-full.txt",
    manifest: readManifest("manifest-vue.json"),
    title: "PlexUI for Vue: full reference",
    intro: [
      "Vue 3 components with the same names, props, defaults and markup as the React library. Quick overview: https://plexui.com/llms-vue.txt",
    ],
    full: true,
  },
];

for (const { file, manifest, ...options } of outputs) {
  const text = render(manifest, options);
  writeFileSync(join(ROOT, "public", file), text);
  console.error(`${file} written to public/${file} (${(Buffer.byteLength(text) / 1024).toFixed(1)}KB)`);
}
