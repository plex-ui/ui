import { source, componentsSource, iconsSource, vueComponentsSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Separate fumadocs sources (post-2026-04-26 URL split — see
// .memory/decisions/0013-component-and-icon-pages-at-top-level.md)
// each get their own search index. The route merges results from
// all of them so a single user query covers /docs/*, /components/*,
// /vue/components/* and /icons/* in one response.
const docsApi = createFromSource(source);
const componentsApi = createFromSource(componentsSource);
const iconsApi = createFromSource(iconsSource);
const vueComponentsApi = createFromSource(vueComponentsSource);

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
