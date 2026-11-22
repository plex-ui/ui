import reactNativeComponentsMeta from '@/content/react-native/components/meta.json';
import vueComponentsMeta from '@/content/vue/components/meta.json';

// The Vue and React Native component pages live at /vue/components/<slug> and /react-native/components/<slug> next
// to the React pages at /components/<slug>; the shared navigation is built from the React tree and mapped here.

const COMPONENT_SLUGS: Record<string, Set<string>> = {
  vue: new Set(vueComponentsMeta.pages.filter((slug) => slug !== 'index')),
  'react-native': new Set(reactNativeComponentsMeta.pages.filter((slug) => slug !== 'index')),
};

/** `/vue/components/x` and `/react-native/components/x` → `/components/x`; other paths unchanged. */
export function reactPath(pathname: string): string {
  return pathname.replace(/^\/(vue|react-native)(?=\/components(\/|$))/, '');
}

/**
 * On Vue and React Native pages, component links that have a page in that framework point to it, so navigation
 * stays in the framework the reader picked. Components without one keep their React link.
 */
export function frameworkUrl(pathname: string, url: string): string {
  const framework = pathname.match(/^\/(vue|react-native)\//)?.[1];
  if (!framework) return url;
  if (url === '/components') return `/${framework}/components`;
  const match = url.match(/^\/components\/([^/]+)$/);
  return match && COMPONENT_SLUGS[framework].has(match[1]) ? `/${framework}/components/${match[1]}` : url;
}

/**
 * Pages of one entry in the docs tree, a React and a Vue page under the entry's url (Hooks and Composables, owner
 * 16.11): the sidebar highlights the entry and the page arrows step from it on either page.
 */
export const SAME_PAGE_URLS: Record<string, readonly string[]> = { '/docs/hooks': ['/docs/composables'] };

/** The tree entry's url of a page that is one of SAME_PAGE_URLS, else the page itself */
export const treeUrlOf = (pathname: string): string =>
  Object.entries(SAME_PAGE_URLS).find(([, urls]) => urls.includes(pathname))?.[0] ?? pathname;
