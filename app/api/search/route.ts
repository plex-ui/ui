import { source, componentsSource, iconsSource, vueComponentsSource } from '@/lib/source';
import { COMPONENTS_COUNT, ICONS_COUNT } from '@/lib/counts';
import { getDocsSectionRedirect } from '@/lib/docs-redirects';
import { findPath } from 'fumadocs-core/page-tree';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import { createSearchAPI, type AdvancedIndex } from 'fumadocs-core/search/server';

// Separate fumadocs sources (post-2026-04-26 URL split — see
// .memory/decisions/0013-component-and-icon-pages-at-top-level.md)
// each get their own search index. The route merges results from
// all of them so a single user query covers /docs/*, /components/*,
// /vue/components/* and /icons/* in one response.

type AnySource =
  | typeof source
  | typeof componentsSource
  | typeof iconsSource
  | typeof vueComponentsSource;

// MDX pages print `{COMPONENTS_COUNT}` / `{ICONS_COUNT}` from lib/counts;
// the indexer only sees the expression, so fill in the numbers here.
const fillCounts = (text: string) =>
  text
    .replace(/\bCOMPONENTS_COUNT\b/g, String(COMPONENTS_COUNT))
    .replace(/\bICONS_COUNT\b/g, String(ICONS_COUNT));

const fillStructuredData = (data: StructuredData): StructuredData => ({
  headings: data.headings.map((h) => ({ ...h, content: fillCounts(h.content) })),
  contents: data.contents.map((c) => ({ ...c, content: fillCounts(c.content) })),
});

/** Same index as fumadocs' default `createFromSource`, with:
 *  - `skip`: pages left out (docs leaves that redirect to an anchor),
 *  - `crumbPrefix`: prepended to the breadcrumbs, so Vue results read
 *    "Vue > Components" and can't be mistaken for the React pages. */
function buildIndexes(
  src: AnySource,
  { skip, crumbPrefix = [] }: { skip?: (slugs: string[]) => boolean; crumbPrefix?: string[] } = {},
): AdvancedIndex[] {
  const tree = src.getPageTree();
  return src
    .getPages()
    .filter((page) => !skip?.(page.slugs))
    .map((page) => {
      const path = findPath(tree.children, (node) => node.type === 'page' && node.url === page.url);
      const breadcrumbs = [...crumbPrefix];
      if (path) {
        path.pop();
        if (typeof tree.name === 'string' && tree.name) breadcrumbs.push(tree.name);
        for (const segment of path) {
          if (typeof segment.name === 'string' && segment.name) breadcrumbs.push(segment.name);
        }
      }
      return {
        id: page.url,
        url: page.url,
        title: page.data.title,
        description: page.data.description,
        breadcrumbs,
        structuredData: fillStructuredData(page.data.structuredData),
      };
    });
}

const docsApi = createSearchAPI('advanced', {
  indexes: () => buildIndexes(source, { skip: (slugs) => !!getDocsSectionRedirect(slugs) }),
});
const componentsApi = createSearchAPI('advanced', {
  indexes: () => buildIndexes(componentsSource),
});
const iconsApi = createSearchAPI('advanced', {
  indexes: () => buildIndexes(iconsSource),
});
const vueComponentsApi = createSearchAPI('advanced', {
  indexes: () => buildIndexes(vueComponentsSource, { crumbPrefix: ['Vue'] }),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') ?? '';
  const [docs, components, vueComponents, icons] = await Promise.all([
    docsApi.search(query),
    componentsApi.search(query),
    vueComponentsApi.search(query),
    iconsApi.search(query),
  ]);
  return Response.json([...docs, ...components, ...vueComponents, ...icons]);
}
