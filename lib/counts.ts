/**
 * Build-time counts derived from the source tree, so prose like
 * "47 components" / "653 icons" stays in sync without manual editing.
 *
 * Both functions run once at module-load time on the server (during the
 * Next.js build). MDX pages and other server modules import the
 * resulting constants and inline them as JSX expressions — e.g.
 * `{COMPONENTS_COUNT} components` in a `.mdx` body. The values are
 * baked into the rendered HTML.
 */
import fs from 'node:fs';
import path from 'node:path';

const COMPONENTS_DIR = path.join(process.cwd(), 'content/components');
const ICON_INDEX = path.join(
  process.cwd(),
  'packages/ui/src/components/Icon/index.tsx'
);

/**
 * Files that live inside `content/components/` but aren't actual
 * component pages (the section index, the meta config, and the
 * cross-component Auth Forms and Settings Forms pages). Skipping them gives us
 * the canonical "how many components ship today" number.
 */
const NON_COMPONENT_FILES = new Set([
  'index.mdx',
  'meta.json',
  'auth-forms.mdx',
  'settings-forms.mdx',
]);

function countComponents(): number {
  return fs
    .readdirSync(COMPONENTS_DIR)
    .filter(
      (file) => file.endsWith('.mdx') && !NON_COMPONENT_FILES.has(file)
    ).length;
}

function countIcons(): number {
  const source = fs.readFileSync(ICON_INDEX, 'utf-8');
  // Each named icon (and its filled variant) is `export const X = ...`
  // or `export { X } from "..."` at the top level — counting top-level
  // `export ` keywords matches one icon per line.
  return (source.match(/^export\s/gm) ?? []).length;
}

/** Total component MDX pages under `content/components/`. */
export const COMPONENTS_COUNT = countComponents();

/** Total named icon exports in `@plexui/ui/components/Icon`. */
export const ICONS_COUNT = countIcons();
