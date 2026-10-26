import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import manifest from "./data/manifest.json" with { type: "json" };
import vueManifest from "./data/manifest-vue.json" with { type: "json" };


interface Prop {
  name: string;
  type?: string;
  default?: string;
  description?: string;
}

interface Example {
  name: string;
  code: string;
  details?: string;
}

interface SubComponent {
  name: string;
  description?: string;
  props: Prop[];
}

interface Hook {
  name: string;
  description: string;
  properties?: { name: string; description: string }[];
}

interface Component {
  slug: string;
  name: string;
  description: string;
  importPath?: string;
  exports?: string[];
  /** Set when the page imports from more than one module */
  imports?: { path: string; names: string[] }[];
  props?: Prop[];
  examples?: Example[];
  subComponents?: SubComponent[];
  hooks?: Hook[];
  docsUrl: string;
}

interface Manifest {
  version?: string;
  description: string;
  homepage: string;
  docsUrl: string;
  install: string;
  setup: { css: string; provider: string };
  sizeScale: string[];
  colors: string[];
  variants: string[];
  componentCount: number;
  components: Component[];
}

type Framework = "react" | "vue";

// Typed loosely on purpose: inferring both JSON files' literal types makes
// the tool schemas too deep for the compiler
const manifests: Record<Framework, Manifest> = {
  react: manifest as Manifest,
  vue: vueManifest as unknown as Manifest,
};
const componentsFor = (framework: Framework) => manifests[framework].components;

// Every tool takes the framework; React stays the default
const frameworkParam = z
  .enum(["react", "vue"])
  .optional()
  .default("react")
  .describe('UI framework: "react" (@plexui/ui) or "vue" (@plexui/vue, Vue 3)');


function formatProps(props: Prop[]): string {
  if (props.length === 0) return "No props documented.";
  return props
    .map((p) => {
      const parts = [`- \`${p.name}\``];
      if (p.type) parts.push(`(${p.type})`);
      if (p.default) parts.push(`default: ${p.default}`);
      if (p.description) parts.push(`— ${p.description}`);
      return parts.join(" ");
    })
    .join("\n");
}

function formatComponent(comp: Component, framework: Framework, options?: { brief?: boolean }): string {
  const codeLanguage = framework === "vue" ? "vue" : "tsx";
  const lines: string[] = [];

  lines.push(`# ${comp.name}`);
  lines.push("");
  lines.push(comp.description);
  lines.push("");

  if (comp.importPath) {
    lines.push("## Import");
    lines.push("");
    lines.push("```ts");
    const imports = comp.imports ?? [{ path: comp.importPath, names: comp.exports ?? [comp.name] }];
    for (const entry of imports) lines.push(`import { ${entry.names.join(", ")} } from "${entry.path}";`);
    lines.push("```");
    lines.push("");
  }

  if (comp.props && comp.props.length > 0) {
    lines.push("## Props");
    lines.push("");
    lines.push(formatProps(comp.props));
    lines.push("");
  }

  if (comp.subComponents && comp.subComponents.length > 0) {
    lines.push("## Sub-Components");
    lines.push("");
    for (const sub of comp.subComponents) {
      lines.push(`### ${sub.name}`);
      if (sub.description) lines.push(sub.description);
      lines.push("");
      lines.push(formatProps(sub.props));
      lines.push("");
    }
  }

  if (comp.hooks && comp.hooks.length > 0) {
    lines.push("## Hooks");
    lines.push("");
    for (const hook of comp.hooks) {
      lines.push(`### ${hook.name}`);
      lines.push(hook.description);
      if (hook.properties) {
        lines.push("");
        for (const prop of hook.properties) {
          lines.push(`- \`${prop.name}\` — ${prop.description}`);
        }
      }
      lines.push("");
    }
  }

  if (!options?.brief && comp.examples && comp.examples.length > 0) {
    lines.push("## Examples");
    lines.push("");
    for (const ex of comp.examples) {
      lines.push(`### ${ex.name}`);
      if (ex.details) {
        lines.push(ex.details);
      }
      lines.push("");
      lines.push("```" + codeLanguage);
      lines.push(ex.code);
      lines.push("```");
      lines.push("");
    }
  }

  lines.push(`Docs: ${comp.docsUrl}`);

  return lines.join("\n");
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return t.includes(q);
}


const server = new McpServer({
  name: "plexui",
  version: manifest.version || "1.0.0",
});

server.tool(
  "list_components",
  "List all available PlexUI components with their descriptions and import paths (React or Vue)",
  { framework: frameworkParam },
  async ({ framework }: { framework: Framework }) => {
    const components = componentsFor(framework);
    const current = manifests[framework];
    const list = components
      .map((c) => {
        const parts = [`- **${c.name}** — ${c.description}`];
        if (c.importPath) parts.push(`  Import: \`${c.importPath}\``);
        const propCount = c.props?.length || 0;
        const exampleCount = c.examples?.length || 0;
        parts.push(`  ${propCount} props, ${exampleCount} examples`);
        return parts.join("\n");
      })
      .join("\n\n");

    const text = [
      `# PlexUI ${framework === "vue" ? "Vue " : ""}Components (${components.length})`,
      "",
      current.description,
      "",
      `Install: \`${current.install}\``,
      `Docs: ${current.docsUrl}`,
      "",
      list,
    ].join("\n");

    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "get_component",
  "Get detailed documentation for a PlexUI component including props, examples, and usage (React or Vue)",
  {
    name: z.string().describe("Component name (e.g. 'Button', 'Select', 'Sidebar')"),
    framework: frameworkParam,
  },
  async ({ name, framework }: { name: string; framework: Framework }) => {
    const components = componentsFor(framework);
    const normalize = (value: string) => value.toLowerCase().replace(/[-_ .]/g, "");
    const query = normalize(name);
    // A page's title or slug first, then any component it exports or documents
    // (`DataTable` lives on Table, `DialogTrigger` / `Dialog.Trigger` on Dialog)
    const byName = (value: string) =>
      components.find((c) => normalize(c.name) === value || c.slug.replace(/-/g, "") === value);
    const comp =
      byName(query) ??
      components.find(
        (c) =>
          c.exports?.some((e) => normalize(e) === query) ||
          c.subComponents?.some((s) => normalize(s.name) === query)
      ) ??
      // A compound part (`Dialog.Trigger`) belongs to its root's page
      (name.includes(".") ? byName(normalize(name.split(".")[0])) : undefined);

    if (!comp) {
      const suggestions = components
        .filter((c) => fuzzyMatch(name, c.name) || fuzzyMatch(name, c.description))
        .slice(0, 5);

      let text = `Component "${name}" not found${framework === "vue" ? " in @plexui/vue" : ""}.`;
      if (suggestions.length > 0) {
        text += `\n\nDid you mean:\n${suggestions.map((s) => `- ${s.name}`).join("\n")}`;
      }
      return { content: [{ type: "text" as const, text }], isError: true };
    }

    return { content: [{ type: "text" as const, text: formatComponent(comp, framework) }] };
  }
);

server.tool(
  "search_components",
  "Search PlexUI components by name, description, or functionality (React or Vue)",
  {
    query: z.string().describe("Search query (e.g. 'dropdown', 'form input', 'navigation')"),
    limit: z.number().optional().default(10).describe("Max results to return"),
    framework: frameworkParam,
  },
  async ({ query, limit, framework }: { query: string; limit: number; framework: Framework }) => {
    const matches = componentsFor(framework).filter(
      (c) =>
        fuzzyMatch(query, c.name) ||
        fuzzyMatch(query, c.description) ||
        fuzzyMatch(query, c.slug) ||
        (c.exports && c.exports.some((e) => fuzzyMatch(query, e))) ||
        (c.props && c.props.some((p) => fuzzyMatch(query, p.name)))
    );

    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No components found matching "${query}". Use list_components to see all available components.`,
          },
        ],
      };
    }

    const results = matches.slice(0, limit);
    const text = results.map((c) => formatComponent(c, framework, { brief: true })).join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${matches.length} component${matches.length === 1 ? "" : "s"} matching "${query}":\n\n${text}`,
        },
      ],
    };
  }
);

const reactSetup = () => `# PlexUI Setup Guide

## Installation

\`\`\`bash
${manifest.install}
\`\`\`

## CSS Setup

Add to your global stylesheet (e.g. \`app/globals.css\`):

\`\`\`css
${manifest.setup.css}
\`\`\`

## Provider

${manifest.setup.provider}

\`\`\`tsx
import Link from "next/link";
import { PlexUIProvider } from "@plexui/ui/components/PlexUIProvider";

export default function RootLayout({ children }) {
  return (
    <PlexUIProvider linkComponent={Link}>
      {children}
    </PlexUIProvider>
  );
}
\`\`\`

\`linkComponent\` is required: pass your router's link (\`Link\` from \`next/link\` or \`react-router\`), or \`"a"\` for plain anchors. The \`@source\` path in the CSS is relative to the stylesheet (\`../../node_modules/@plexui/ui\` from \`src/app/globals.css\`).

## Design System

- **Size scale**: ${manifest.sizeScale.join(", ")} (unified across Button, Input, Select, etc.)
- **Colors**: ${manifest.colors.join(", ")}
- **Variants**: ${manifest.variants.join(", ")}
- **${manifest.componentCount} components** available

## Quick Example

\`\`\`tsx
import { Button } from "@plexui/ui/components/Button";
import { Input } from "@plexui/ui/components/Input";
import { Select } from "@plexui/ui/components/Select";

export function MyForm() {
  return (
    <div className="flex flex-col gap-4">
      <Input placeholder="Email" size="md" />
      <Select options={[...]} placeholder="Role..." />
      <Button color="primary" size="md">Submit</Button>
    </div>
  );
}
\`\`\`

Docs: ${manifest.homepage}
`;

const vueSetup = () => `# PlexUI for Vue Setup Guide

## Installation

\`\`\`bash
${vueManifest.install}
\`\`\`

## CSS Setup

Add to your global stylesheet (e.g. \`src/main.css\`) and import it before mounting the app:

\`\`\`css
${vueManifest.setup.css}
\`\`\`

On Vite, add the plugin: \`import plexui from "@plexui/styles/vite"\` and \`plugins: [vue(), plexui()]\`.

For SSR (Nuxt, Vite SSR), bundle the package: Nuxt \`build: { transpile: ["@plexui/vue"] }\`, Vite \`ssr: { noExternal: ["@plexui/vue", "@plexui/styles"] }\`.

## Provider

${vueManifest.setup.provider}

\`\`\`vue
<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { PlexUIProvider } from "@plexui/vue/components/PlexUIProvider";
</script>

<template>
  <PlexUIProvider :link-component="RouterLink">
    <RouterView />
  </PlexUIProvider>
</template>
\`\`\`

## From React to Vue

Same component names, props and defaults as @plexui/ui. \`class\` instead of \`className\`, slots instead of ReactNode props, \`v-model:value\` for controlled values, \`@x\` listeners for \`onX\` callbacks, flat named exports for compound parts (\`DialogTrigger\` for \`Dialog.Trigger\`), composables from \`@plexui/vue/composables/<name>\`.

## Design System

- **Size scale**: ${vueManifest.sizeScale.join(", ")}
- **Colors**: ${vueManifest.colors.join(", ")}
- **Variants**: ${vueManifest.variants.join(", ")}
- **${vueManifest.componentCount} components** available

## Quick Example

\`\`\`vue
<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@plexui/vue/components/Button";
import { Input } from "@plexui/vue/components/Input";

const email = ref("");
</script>

<template>
  <div class="flex flex-col gap-4">
    <Input v-model:value="email" placeholder="Email" size="md" />
    <Button color="primary" size="md">Submit</Button>
  </div>
</template>
\`\`\`

Docs: ${vueManifest.homepage}/docs/vue
`;

server.tool(
  "get_setup_guide",
  "Get the PlexUI installation and setup guide (React or Vue)",
  { framework: frameworkParam },
  async ({ framework }: { framework: Framework }) => {
    const text = framework === "vue" ? vueSetup() : reactSetup();
    return { content: [{ type: "text" as const, text }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PlexUI MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
