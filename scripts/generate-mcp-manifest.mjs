/**
 * Generates the component manifests for @plexui/mcp from MDX documentation files.
 *
 * Parses content/components/*.mdx → packages/mcp/src/data/manifest.json (React)
 * and content/vue/components/*.mdx → packages/mcp/src/data/manifest-vue.json (Vue).
 *
 * Extracts: title, description, import path, props, examples, sub-components.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FRAMEWORKS = {
  react: {
    dir: join(ROOT, "content/components"),
    output: "packages/mcp/src/data/manifest.json",
    package: "@plexui/ui",
    docsUrl: "https://plexui.com/components",
    description:
      "The most flexible UI kit for React. Production-grade components with pixel-perfect Figma parity.",
    install: "npm install @plexui/ui",
    setup: {
      css: '@import "tailwindcss";\n@import "@plexui/ui/css";',
      provider:
        'Wrap your app with <PlexUIProvider> from "@plexui/ui/components/PlexUIProvider"',
    },
  },
  vue: {
    dir: join(ROOT, "content/vue/components"),
    // The Vue pages in the nav, in nav order (see scripts/sync-vue-meta.mjs)
    meta: join(ROOT, "content/vue/components/meta.json"),
    output: "packages/mcp/src/data/manifest-vue.json",
    package: "@plexui/vue",
    docsUrl: "https://plexui.com/vue/components",
    description:
      "PlexUI for Vue 3: the same components, props, markup and styles as the React library.",
    install: "npm install @plexui/vue",
    setup: {
      css: '@import "tailwindcss";\n@import "@plexui/styles/css";',
      provider:
        'Wrap your app with <PlexUIProvider :link-component="RouterLink"> from "@plexui/vue/components/PlexUIProvider"',
    },
  },
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

// ---------------------------------------------------------------------------
// Frontmatter parser (simple, no deps)
// ---------------------------------------------------------------------------

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    fm[key] = val;
  }
  return fm;
}

// ---------------------------------------------------------------------------
// Extract import path from <UsageBlock>
// ---------------------------------------------------------------------------

function extractImportPath(content, pkg) {
  // <UsageBlock>{`import { Button } from "@plexui/ui/components/Button";`}</UsageBlock>
  const match = content.match(
    new RegExp(`<UsageBlock>\\{\`import \\{[^}]+\\} from "(${escapeRegExp(pkg)}/[^"]+)"`)
  );
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Extract exported names from <UsageBlock>
// ---------------------------------------------------------------------------

function extractExportedNames(content, pkg) {
  const match = content.match(
    new RegExp(`<UsageBlock>\\{\`import \\{([^}]+)\\} from "${escapeRegExp(pkg)}`)
  );
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Extract examples from ### headings + <ComponentPreview>
// ---------------------------------------------------------------------------

function extractExamples(content) {
  const examples = [];

  // Split into sections by ### headings
  const sections = content.split(/^### /m);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const nameEnd = section.indexOf("\n");
    const name = section.slice(0, nameEnd).trim();

    // Extract code from <ComponentPreview code={`...`}
    // The code prop uses backtick template literals, or (Vue pages) names a
    // template exported at the top of the page: code={name}
    const codeMatch = section.match(/code=\{`([\s\S]*?)`\}/);
    const codeRef = codeMatch ? null : section.match(/code=\{(\w+)\}/);
    const exported = codeRef
      ? content.match(new RegExp(`^export const ${codeRef[1]} = \`([\\s\\S]*?)\``, "m"))
      : null;
    const code = codeMatch ? codeMatch[1].trim() : exported ? exported[1].trim() : null;

    // Extract details text (strip JSX tags)
    const detailsMatch = section.match(/details=\{<>([\s\S]*?)<\/>\}/);
    let details = null;
    if (detailsMatch) {
      details = detailsMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (code) {
      examples.push({ name, code, ...(details && { details }) });
    }
  }

  return examples;
}

// ---------------------------------------------------------------------------
// Extract props from <PropsTable data={[...]} />
// ---------------------------------------------------------------------------

function extractPropsTable(content) {
  const allProps = [];

  // Find all <PropsTable data={[...]} /> blocks
  const regex = /<PropsTable\s+data=\{\[/g;
  let match = regex.exec(content);

  while (match !== null) {
    const startIdx = match.index + match[0].length;

    // Find the matching closing ]} by counting brackets
    let depth = 1;
    let i = startIdx;
    while (i < content.length && depth > 0) {
      if (content[i] === "[") depth++;
      if (content[i] === "]") depth--;
      i++;
    }

    const arrayContent = content.slice(startIdx, i - 1);

    // Parse individual prop objects using regex
    // { prop: "name", type: '...', default: '...', description: "..." }
    const propRegex =
      /\{\s*prop:\s*"([^"]*)"(?:,\s*type:\s*(?:"([^"]*)"|'([^']*)'))?(?:,\s*default:\s*(?:"([^"]*)"|'([^']*)'))?(?:,\s*description:\s*"([^"]*)")?\s*\}/g;

    let propMatch = propRegex.exec(arrayContent);
    while (propMatch !== null) {
      const prop = {
        name: propMatch[1],
        type: propMatch[2] || propMatch[3] || undefined,
        default: propMatch[4] || propMatch[5] || undefined,
        description: propMatch[6] || undefined,
      };
      // Remove undefined values
      for (const k of Object.keys(prop)) {
        if (prop[k] === undefined) delete prop[k];
      }
      allProps.push(prop);
      propMatch = propRegex.exec(arrayContent);
    }

    match = regex.exec(content);
  }

  return allProps;
}

// ---------------------------------------------------------------------------
// Extract sub-component reference sections (for composite components)
// ---------------------------------------------------------------------------

function extractSubComponents(content) {
  const subComponents = [];
  const refSection = content.split("## Reference")[1];
  if (!refSection) return subComponents;

  // Find ### SubComponentName sections that have their own PropsTable
  const subSections = refSection.split(/^### /m);

  for (let i = 1; i < subSections.length; i++) {
    const section = subSections[i];
    const nameEnd = section.indexOf("\n");
    const name = section.slice(0, nameEnd).trim();

    // Skip sections like "Structure" that are descriptive
    if (!section.includes("<PropsTable")) continue;

    // Extract description (text before PropsTable)
    const descLines = [];
    for (const line of section.split("\n").slice(1)) {
      if (line.includes("<PropsTable")) break;
      const cleaned = line.replace(/<[^>]+>/g, "").trim();
      if (cleaned) descLines.push(cleaned);
    }

    const props = extractPropsTable(section);

    subComponents.push({
      name,
      ...(descLines.length > 0 && { description: descLines.join(" ") }),
      props,
    });
  }

  return subComponents;
}

// ---------------------------------------------------------------------------
// Extract hook documentation
// ---------------------------------------------------------------------------

function extractHooks(content) {
  const hooks = [];
  const hookRegex = /###\s+(use\w+)\n\n([\s\S]*?)(?=\n###|\n##|$)/g;
  let match = hookRegex.exec(content);

  while (match !== null) {
    const name = match[1];
    const body = match[2].trim();

    // Extract bullet-point properties
    const properties = [];
    const bulletRegex = /[-*]\s+`(\w+)`\s*[&–-]*\s*(.*)/g;
    let bulletMatch = bulletRegex.exec(body);
    while (bulletMatch !== null) {
      properties.push({
        name: bulletMatch[1],
        description: bulletMatch[2]
          .replace(/<[^>]+>/g, "")
          .replace(/&ndash;/g, "-")
          .trim(),
      });
      bulletMatch = bulletRegex.exec(body);
    }

    // Get description (first paragraph before bullets)
    const desc = body
      .split("\n")[0]
      .replace(/<[^>]+>/g, "")
      .trim();

    hooks.push({
      name,
      description: desc,
      ...(properties.length > 0 && { properties }),
    });

    match = hookRegex.exec(content);
  }

  return hooks;
}

// ---------------------------------------------------------------------------
// Process a single MDX file
// ---------------------------------------------------------------------------

function processFile(filePath, framework) {
  const content = readFileSync(filePath, "utf-8");
  const slug = basename(filePath, ".mdx");

  if (slug === "index" || slug === "form-examples") return null;

  const frontmatter = parseFrontmatter(content);
  const importPath = extractImportPath(content, framework.package);
  const exportedNames = extractExportedNames(content, framework.package);
  const examples = extractExamples(content);
  const subComponents = extractSubComponents(content);
  const hooks = extractHooks(content);

  const allProps = extractPropsTable(content);
  const subPropNames = new Set(
    subComponents.flatMap((sc) => sc.props.map((p) => p.name))
  );

  const seen = new Set();
  const props = allProps.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    if (subComponents.length > 0 && subPropNames.has(p.name)) return false;
    return true;
  });

  if (!importPath && props.length === 0 && examples.length === 0) return null;

  const component = {
    slug,
    name: frontmatter.title || slug,
    description: frontmatter.description || "",
    ...(importPath && { importPath }),
    ...(exportedNames.length > 0 && { exports: exportedNames }),
    ...(props.length > 0 && { props }),
    ...(examples.length > 0 && { examples }),
    ...(subComponents.length > 0 && { subComponents }),
    ...(hooks.length > 0 && { hooks }),
    docsUrl: `${framework.docsUrl}/${slug}`,
  };

  return component;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generate(framework) {
  const files = framework.meta
    ? JSON.parse(readFileSync(framework.meta, "utf-8")).pages.map((slug) => `${slug}.mdx`)
    : readdirSync(framework.dir).filter((f) => f.endsWith(".mdx"));

  console.error(`Processing ${files.length} ${framework.package} MDX files...`);

  const components = [];

  for (const file of files) {
    const result = processFile(join(framework.dir, file), framework);
    if (result) {
      components.push(result);
      const propCount = result.props?.length || 0;
      const exampleCount = result.examples?.length || 0;
      console.error(
        `  ${result.name}: ${propCount} props, ${exampleCount} examples`
      );
    }
  }

  const manifest = {
    name: framework.package,
    version: "latest",
    description: framework.description,
    homepage: "https://plexui.com",
    docsUrl: framework.docsUrl,
    install: framework.install,
    setup: framework.setup,
    sizeScale: [
      "3xs",
      "2xs",
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
      "2xl",
      "3xl",
    ],
    colors: [
      "primary",
      "secondary",
      "danger",
      "success",
      "warning",
      "caution",
      "discovery",
      "info",
    ],
    variants: ["solid", "soft", "outline", "ghost"],
    componentCount: components.length,
    components,
    generatedAt: new Date().toISOString(),
  };

  // Ensure output directory exists
  const outputPath = join(ROOT, framework.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  console.error(
    `\nManifest written to ${framework.output} (${components.length} components)`
  );
}

generate(FRAMEWORKS.react);
generate(FRAMEWORKS.vue);
