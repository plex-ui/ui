import {
  docs,
  components,
  icons,
  vueComponents,
  blog as blogPosts,
} from 'fumadocs-mdx:collections/server';
import { loader } from 'fumadocs-core/source';
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

/** Components live at /components/* (peer of Docs/Bridge/Blog), not
 *  /components/*. Separate fumadocs source so the URL → MDX file
 *  resolution maps `content/components/<slug>.mdx` → `/components/<slug>`. */
export const componentsSource = loader({
  baseUrl: '/components',
  source: components.toFumadocsSource(),
});

/** Same pattern for the Icons section. */
export const iconsSource = loader({
  baseUrl: '/icons',
  source: icons.toFumadocsSource(),
});

/** Vue pages at /vue/components/*: same slugs as the React pages. */
export const vueComponentsSource = loader({
  baseUrl: '/vue/components',
  source: vueComponents.toFumadocsSource(),
});

export const blog = loader({
  baseUrl: '/blog',
  source: toFumadocsSource(blogPosts, []),
});
