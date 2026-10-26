/**
 * Docs URLs that redirect to an anchor on their section's single page.
 *
 * Hooks and Concepts are one page each, so a leaf URL such as
 * `/docs/concepts/dark-mode` (an old link, or a leaf MDX file that still
 * exists) is sent to `/docs/concepts#dark-mode`. The docs route redirects
 * these, and the sitemap and the search index leave them out so crawlers
 * and search results only see the page that actually renders.
 */
export function getDocsSectionRedirect(slug?: string[]): string | null {
  // /docs is the Introduction page itself, so no redirect is needed.
  if (!slug || slug.length < 2) return null;

  const [section, ...rest] = slug;
  const leaf = rest.at(-1);
  if (!leaf) return null;

  if (section === 'hooks') {
    return `/docs/hooks#${leaf.replace(/-/g, '')}`;
  }

  if (section === 'concepts') {
    return `/docs/concepts#${leaf}`;
  }

  return null;
}
