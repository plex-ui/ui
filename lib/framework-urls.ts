import vueComponentsMeta from '@/content/vue/components/meta.json';

// The Vue component pages live at /vue/components/<slug> next to the React
// pages at /components/<slug>; the shared navigation is built from the
// React tree and mapped to Vue here.

const VUE_COMPONENT_SLUGS = new Set(vueComponentsMeta.pages.filter((slug) => slug !== 'index'));

/** `/vue/components/x` → `/components/x`; other paths unchanged. */
export function reactPath(pathname: string): string {
  return pathname.replace(/^\/vue(?=\/components(\/|$))/, '');
}

/**
 * On Vue pages (/vue/*), component links that have a Vue page point to it,
 * so navigation stays in the framework the reader picked. Components
 * without a Vue page keep their React link.
 */
export function frameworkUrl(pathname: string, url: string): string {
  if (!pathname.startsWith('/vue/')) return url;
  if (url === '/components') return '/vue/components';
  const match = url.match(/^\/components\/([^/]+)$/);
  return match && VUE_COMPONENT_SLUGS.has(match[1]) ? `/vue/components/${match[1]}` : url;
}
