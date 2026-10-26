/**
 * Generates the component manifests for @plexui/mcp from MDX documentation files.
 *
 * Parses content/components/*.mdx → packages/mcp/src/data/manifest.json (React)
 * and content/vue/components/*.mdx → packages/mcp/src/data/manifest-vue.json (Vue).
 *
 * Extracts: title, description, import path, props, examples, sub-components.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import ts from "typescript";
import { unified } from "unified";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FRAMEWORKS = {
  react: {
    dir: join(ROOT, "content/components"),
    output: "packages/mcp/src/data/manifest.json",
    package: "@plexui/ui",
    docsUrl: "https://plexui.com/components",
    description:
      "The most flexible UI kit for React. Production-grade components, design tokens and a 9-size scale that AI agents use correctly.",
    install: "npm install @plexui/ui",
    setup: {
      css: '@layer theme, base, components, utilities;\n@import "tailwindcss";\n@import "@plexui/ui/css";\n@source "../node_modules/@plexui/ui";',
      provider:
        'Wrap your app with <PlexUIProvider linkComponent={Link}> from "@plexui/ui/components/PlexUIProvider" (your router\'s Link, or "a")',
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
    install: "npm install @plexui/vue @plexui/styles",
    setup: {
      css: '@layer theme, base, components, utilities;\n@import "tailwindcss";\n@import "@plexui/styles/css";\n@source "../node_modules/@plexui/vue";',
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

function extractImports(content, pkg) {
  // <UsageBlock>{`import { Table, TableRow } from "@plexui/ui/components/Table";
  // import { DataTable } from "@plexui/ui/components/DataTable";`}</UsageBlock>
  const imports = [];
  for (const block of content.matchAll(/<UsageBlock>\{`([\s\S]*?)`\}<\/UsageBlock>/g)) {
    const statement = new RegExp(`import \\{([^}]+)\\} from "(${escapeRegExp(pkg)}/[^"]+)"`, "g");
    for (const match of block[1].matchAll(statement)) {
      const names = match[1].split(",").map((s) => s.trim()).filter(Boolean);
      imports.push({ path: match[2], names });
    }
  }
  return imports;
}

// ---------------------------------------------------------------------------
// Parse the page: mdast with MDX + GFM, and the page's exports evaluated
// ---------------------------------------------------------------------------

/**
 * Parses an MDX page and evaluates its top-level `export` declarations (the
 * Vue pages build their example templates there, sometimes with helper
 * functions) in a sandbox, so examples come out as the strings the page
 * renders. Declarations that need an import are skipped.
 */
/**
 * String constants a docs module exports (`export const vueProgressOverviewCode
 * = \`<script setup>...\``), which pages import as an example's `code`. The
 * module's top-level constants and functions are evaluated one by one in a
 * sandbox, like the page's own exports, so a code string assembled from other
 * strings and helpers resolves too; anything that needs an import is skipped.
 */
function importedStrings(specifier) {
  if (!specifier.startsWith("@/")) return {};
  const base = join(ROOT, specifier.slice(2));
  const file = ["", ".tsx", ".ts", ".mjs", ".js"].map((ext) => base + ext).find((path) => existsSync(path));
  if (!file) return {};
  const text = readFileSync(file, "utf-8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  // Imported names (icons, components) become stub functions: code strings only
  // need the data around them (`nodeTypes` maps types to icons and labels)
  const stubs = {};
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    const names = [
      statement.importClause?.name?.text,
      ...(bindings && ts.isNamedImports(bindings) ? bindings.elements.map((e) => e.name.text) : []),
    ].filter(Boolean);
    for (const name of names) stubs[name] = { [name]: (value) => value }[name];
  }
  const context = vm.createContext(stubs);
  const exported = [];
  let pending = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) && !ts.isFunctionDeclaration(statement)) continue;
    const isExported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (isExported && ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) exported.push(declaration.name.text);
      }
    }
    const code = text.slice(statement.getStart(source), statement.end).replace(/^export\s+/, "");
    // Constants are evaluated inside a function and only copied to the sandbox
    // when they succeed, so a failed one never leaves an `undefined` binding
    const names = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.filter((d) => ts.isIdentifier(d.name)).map((d) => d.name.text)
      : [];
    const wrapped = names.length > 0 ? `(() => { ${code}\nreturn { ${names.join(", ")} }; })()` : code;
    pending.push(
      ts.transpileModule(wrapped, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve } })
        .outputText,
    );
  }
  // A constant may use one declared further down: retry until nothing new evaluates
  while (pending.length > 0) {
    const failed = pending.filter((js) => {
      try {
        const values = vm.runInContext(js, context, { timeout: 1000 });
        if (values && typeof values === "object") Object.assign(context, values);
        return false;
      } catch {
        return true; // needs an import (a component, React, Vue) or a later constant
      }
    });
    if (failed.length === pending.length) break;
    pending = failed;
  }
  const strings = {};
  for (const name of exported) {
    if (typeof context[name] === "string") strings[name] = context[name];
  }
  return strings;
}

function parsePage(content) {
  const tree = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).parse(content);
  const context = vm.createContext({});
  for (const node of tree.children) {
    if (node.type !== "mdxjsEsm") continue;
    for (const statement of node.data?.estree?.body ?? []) {
      if (statement.type === "ImportDeclaration") {
        const strings = importedStrings(statement.source.value);
        for (const specifier of statement.specifiers) {
          const name = specifier.imported?.name;
          if (name && name in strings) context[specifier.local.name] = strings[name];
        }
        continue;
      }
      const declaration =
        statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
      if (!declaration) continue;
      // `var` so each declaration lands on the shared context
      const source = content
        .slice(declaration.start, declaration.end)
        .replace(/^(const|let)\s/, "var ");
      try {
        vm.runInContext(source, context, { timeout: 1000 });
      } catch {
        // Uses an import (a demo component, data from another module)
      }
    }
  }
  return { tree, context };
}

/** Evaluates a JSX attribute expression (`code={...}`) on the page's context. */
function evaluateExpression(value, context) {
  try {
    return vm.runInContext(`(${value})`, context, { timeout: 1000 });
  } catch {
    return undefined;
  }
}

const textOf = (node) => {
  if (!node) return "";
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(textOf).join("");
};

const attribute = (node, name) => node.attributes?.find((a) => a.name === name);

/** Top-level blocks, looking through wrapper elements such as `<div id="first-component-page">`. */
function* blocks(nodes) {
  for (const node of nodes) {
    if (node.type === "mdxJsxFlowElement" && !["PropsTable", "ComponentPreview"].includes(node.name) && node.children?.length) {
      yield* blocks(node.children);
    } else {
      yield node;
    }
  }
}

// ---------------------------------------------------------------------------
// Extract examples from ### headings + <ComponentPreview>
// ---------------------------------------------------------------------------

function extractExamples(content, { tree, context }) {
  const examples = [];
  let name = null;

  const visit = (node) => {
    if (node.type === "heading") {
      name = node.depth === 3 ? textOf(node).trim() : null;
      return;
    }
    if ((node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.name === "ComponentPreview") {
      const codeAttribute = attribute(node, "code");
      const code =
        typeof codeAttribute?.value === "string"
          ? codeAttribute.value
          : evaluateExpression(codeAttribute?.value?.value, context);
      // Details text (strip JSX tags)
      const detailsAttribute = attribute(node, "details");
      const detailsSource = detailsAttribute?.value?.value?.match(/^<>([\s\S]*)<\/>$/)?.[1];
      const details = detailsSource
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      // One example per heading: the first preview (a section may show several)
      if (name && typeof code === "string" && code.trim()) {
        examples.push({ name, code: code.trim(), ...(details && { details }) });
        name = null;
      } else if (name && codeAttribute) {
        console.warn(`[manifest] "${name}": the preview's code could not be resolved; the example is skipped`);
      }
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of blocks(tree.children)) visit(node);

  return examples;
}

// ---------------------------------------------------------------------------
// Extract props from <PropsTable data={[...]} /> and Markdown tables, owned by
// the component (or sub-component) whose API section they sit in
// ---------------------------------------------------------------------------

const cleanProp = (prop) => {
  const clean = {
    name: prop.name,
    type: prop.type,
    default: prop.default,
    description: prop.description,
  };
  for (const key of Object.keys(clean)) {
    if (clean[key] === undefined || clean[key] === "") delete clean[key];
  }
  return clean;
};

// Fallback for tables that cannot be evaluated (e.g. JSX in a cell)
const PROP_ROW =
  /\{\s*prop:\s*"([^"]*)"(?:,\s*type:\s*(?:"([^"]*)"|'([^']*)'))?(?:,\s*default:\s*(?:"([^"]*)"|'([^']*)'))?(?:,\s*description:\s*"([^"]*)")?\s*\}/g;

function propsFromPropsTable(node, context) {
  const source = attribute(node, "data")?.value?.value;
  const rows = evaluateExpression(source, context);
  if (!Array.isArray(rows)) {
    return [...(source ?? "").matchAll(PROP_ROW)].map((m) =>
      cleanProp({ name: m[1], type: m[2] || m[3], default: m[4] || m[5], description: m[6] }),
    );
  }
  return rows
    .filter((row) => row && typeof row.prop === "string")
    .map((row) =>
      cleanProp({
        name: row.prop,
        type: typeof row.type === "string" ? row.type : undefined,
        default: typeof row.default === "string" ? row.default : undefined,
        description: typeof row.description === "string" ? row.description : undefined,
      }),
    );
}

function propsFromMarkdownTable(node) {
  const [header, ...rows] = node.children;
  const columns = header.children.map((cell) => textOf(cell).trim().toLowerCase());
  const column = (...names) => columns.findIndex((c) => names.includes(c));
  const nameColumn = column("prop", "name", "property", "attribute");
  if (nameColumn === -1) return [];
  const typeColumn = column("type");
  const defaultColumn = column("default");
  const descriptionColumn = column("description");
  const cell = (row, index) => (index === -1 ? undefined : textOf(row.children[index]).trim());
  return rows
    .map((row) =>
      cleanProp({
        name: cell(row, nameColumn),
        type: cell(row, typeColumn),
        default: cell(row, defaultColumn),
        description: cell(row, descriptionColumn),
      }),
    )
    .filter((prop) => prop.name);
}

/**
 * Props of the page's component, plus sub-components: inside the "Reference"
 * or "API" section, a `### Name` heading or a paragraph that is only a bold
 * name (`**DialogContent**`, optionally followed by "(root)") starts a
 * sub-component; a name equal to the page's component, or marked "(root)",
 * belongs to the component itself.
 */
function extractProps({ tree, context }, componentNames) {
  const props = [];
  const subComponents = [];
  let inApi = false;
  let current = null;

  const startSection = (rawName) => {
    const name = rawName.replace(/\s*\(root\)\s*$/i, "").trim();
    const isRoot = /\(root\)\s*$/i.test(rawName) || componentNames.has(name.replace(/\./g, ""));
    if (isRoot) {
      current = null;
      return;
    }
    current = { name, descriptionLines: [], props: [] };
    subComponents.push(current);
  };

  for (const node of blocks(tree.children)) {
    if (node.type === "heading" && node.depth <= 2) {
      inApi = /^(reference|api)$/i.test(textOf(node).trim());
      current = null;
      continue;
    }
    if (inApi && node.type === "heading" && node.depth === 3) {
      startSection(textOf(node).trim());
      continue;
    }
    if (inApi && node.type === "paragraph" && node.children[0]?.type === "strong") {
      const name = textOf(node.children[0]).trim();
      const rest = textOf({ children: node.children.slice(1) }).trim();
      if (/^[A-Z][\w.]*$/.test(name)) {
        startSection(/^\(root\)/i.test(rest) ? `${name} (root)` : name);
        // "**Name**: description" on one line
        const description = rest.replace(/^\(root\)/i, "").replace(/^[:\s]+/, "").trim();
        if (current && description) current.descriptionLines.push(description);
        continue;
      }
    }

    const tableProps =
      node.type === "mdxJsxFlowElement" && node.name === "PropsTable"
        ? propsFromPropsTable(node, context)
        : node.type === "table"
          ? propsFromMarkdownTable(node)
          : null;
    if (tableProps) {
      (current ? current.props : props).push(...tableProps);
      continue;
    }

    if (current && node.type === "paragraph" && current.props.length === 0) {
      const text = textOf(node).replace(/\s+/g, " ").trim();
      if (text) current.descriptionLines.push(text);
    }
  }

  const unique = (list) => {
    const seen = new Set();
    return list.filter((prop) => (seen.has(prop.name) ? false : (seen.add(prop.name), true)));
  };

  return {
    props: unique(props),
    subComponents: subComponents
      .filter((sub) => sub.props.length > 0)
      .map((sub) => ({
        name: sub.name,
        ...(sub.descriptionLines.length > 0 && { description: sub.descriptionLines.join(" ") }),
        props: unique(sub.props),
      })),
  };
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
  // Every import of the page's UsageBlock (Table also imports DataTable)
  const imports = extractImports(content, framework.package);
  const importPath = imports[0]?.path ?? null;
  const exportedNames = imports.flatMap((entry) => entry.names);
  const page = parsePage(content);
  const examples = extractExamples(content, page);
  const hooks = extractHooks(content);
  // The page's own component: its title without spaces (a page may document several)
  const componentNames = new Set([frontmatter.title].filter(Boolean).map((name) => name.replace(/\s/g, "")));
  const { props, subComponents } = extractProps(page, componentNames);

  if (!importPath && props.length === 0 && examples.length === 0) return null;

  const component = {
    slug,
    name: frontmatter.title || slug,
    description: frontmatter.description || "",
    ...(importPath && { importPath }),
    ...(exportedNames.length > 0 && { exports: exportedNames }),
    ...(imports.length > 1 && { imports }),
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

  const outputPath = join(ROOT, framework.output);
  if (CHECK) {
    // Same content apart from the timestamp
    const committed = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf-8")) : null;
    const strip = (data) => JSON.stringify({ ...data, generatedAt: undefined });
    if (!committed || strip(committed) !== strip(manifest)) stale.push(framework.output);
    return;
  }

  // Ensure output directory exists
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  console.error(
    `\nManifest written to ${framework.output} (${components.length} components)`
  );
}

// `--check` writes nothing and fails when a committed manifest is out of date
const CHECK = process.argv.includes("--check");
const stale = [];

generate(FRAMEWORKS.react);
generate(FRAMEWORKS.vue);

if (CHECK) {
  if (stale.length > 0) {
    console.error(`Out of date (run node scripts/generate-mcp-manifest.mjs): ${stale.join(", ")}`);
    process.exit(1);
  }
  console.error("MCP manifests are up to date.");
}
