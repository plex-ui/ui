import type { CatalogIcon, IconCatalog } from '../types';

type JsonRecord = { name: string; svg: string; tags?: string[] };

/**
 * Loader for `@lucide/lab` — Lucide's experimental icon set.
 *
 * Lab icons aren't exported from `lucide-react` directly; the canonical
 * usage pattern is the `<Icon iconNode={...} />` HOC pattern, which is
 * why this catalog gets its own tab on `/icons/lucide` instead of
 * being merged into the main Lucide catalog. Lucide.dev does the same
 * "Include external libs / Lab" filter; we surface it as a clearly
 * labelled tab so the copy-import format matches the actual API users
 * need to write.
 *
 * Naming: `@lucide/lab`'s JS exports are camelCase (`burger`, not
 * `Burger`). The catalog stores names in PascalCase for grid-display
 * consistency with every other library; `buildImport`/`buildJsx`
 * lower-case the first letter so the generated snippet matches the
 * actual export shape.
 */
let cached: IconCatalog | null = null;

function pascalToCamel(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export async function loadLucideLabCatalog(): Promise<IconCatalog> {
  if (cached) return cached;

  const response = await fetch('/icon-libraries/lucide-lab.json');
  if (!response.ok) {
    throw new Error(
      `Failed to load Lucide Lab catalog (${response.status})`
    );
  }
  const records = (await response.json()) as JsonRecord[];

  const icons: CatalogIcon[] = records
    .map((record) => ({
      name: record.name,
      svg: record.svg,
      ...(record.tags && record.tags.length > 0
        ? { tags: record.tags }
        : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  cached = {
    id: 'lucide-lab',
    label: 'Lucide Lab',
    // Two-line import: <Icon> HOC from lucide-react, icon node from
    // @lucide/lab. The icon node is the camelCase form of the catalog
    // name (`Burger` → `burger`).
    buildImport: (name) =>
      `import { Icon } from 'lucide-react';\nimport { ${pascalToCamel(name)} } from '@lucide/lab';`,
    // Same rule as the other stroke catalogs: emit `strokeWidth` only when
    // the panel's value differs from Lucide's default (2).
    buildJsx: (name, opts) =>
      opts?.strokeWidth !== undefined && opts.strokeWidth !== 2
        ? `<Icon iconNode={${pascalToCamel(name)}} strokeWidth={${opts.strokeWidth}} />`
        : `<Icon iconNode={${pascalToCamel(name)}} />`,
    icons,
  };
  return cached;
}
