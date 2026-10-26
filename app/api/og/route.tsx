import type { NextRequest } from 'next/server';
import { source, componentsSource, iconsSource, vueComponentsSource, blog } from '@/lib/source';
import {
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
  renderOgImage,
} from '@/lib/og-image';

/**
 * On-the-fly OpenGraph image generator. Each docs / components /
 * icons / blog page wires `generateMetadata` to point its
 * `openGraph.images` and `twitter.images` at this route — the route
 * looks up the page's title + description from the right fumadocs
 * source and renders a branded PNG via `renderOgImage`.
 *
 * We're using an API route instead of the file-convention
 * `opengraph-image.tsx` because Next.js (with Turbopack) refuses
 * to colocate metadata files inside an optional catch-all segment
 * (`[[...slug]]`), which is the URL shape every section here uses.
 *
 * Query params:
 *   type=components|vue-components|docs|icons|blog (required)
 *   slug=path/to/page              (optional — empty maps to section index)
 *
 * Runs on the Node.js runtime (not edge) because the fumadocs source
 * modules underneath read from `node:fs` / `node:path` to resolve MDX
 * pages — edge runtime would 500 with "Native module not found".
 */
export const runtime = 'nodejs';

const SECTION_LABELS = {
  components: 'Components',
  'vue-components': 'Vue components',
  docs: 'Docs',
  icons: 'Icons',
  blog: 'Blog',
} as const;

type SectionKey = keyof typeof SECTION_LABELS;

function isSectionKey(value: string | null): value is SectionKey {
  return value !== null && Object.prototype.hasOwnProperty.call(SECTION_LABELS, value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const slugParam = searchParams.get('slug') ?? '';

  if (!isSectionKey(type)) {
    return new Response('Invalid `type` query param', { status: 400 });
  }

  const slug = slugParam ? slugParam.split('/').filter(Boolean) : [];

  let title: string = SECTION_LABELS[type];
  let description: string | undefined;

  switch (type) {
    case 'components': {
      const page = componentsSource.getPage(slug);
      if (page) {
        title = page.data.title;
        description = page.data.description;
      }
      break;
    }
    case 'vue-components': {
      const page = vueComponentsSource.getPage(slug);
      if (page) {
        title = page.data.title;
        description = page.data.description;
      }
      break;
    }
    case 'docs': {
      const page = source.getPage(slug);
      if (page) {
        title = page.data.title;
        description = page.data.description;
      }
      break;
    }
    case 'icons': {
      const page = iconsSource.getPage(slug);
      if (page) {
        title = page.data.title;
        description = page.data.description;
      }
      break;
    }
    case 'blog': {
      // Blog uses a single-segment dynamic route (`[slug]`), so just
      // grab the first slug segment.
      const page = blog.getPage([slug[0] ?? '']);
      if (page) {
        title = page.data.title;
        description = page.data.description;
      }
      break;
    }
  }

  const image = renderOgImage({
    section: SECTION_LABELS[type],
    title,
    description,
  });

  // The ImageResponse already sets the correct headers; we just want
  // to add a cache header so Vercel's CDN keeps these warm. The image
  // only changes when the underlying MDX page does, which invalidates
  // on the next deploy anyway.
  image.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  image.headers.set('Content-Type', OG_IMAGE_CONTENT_TYPE);
  return image;
}

// Re-export so client code can compute the URL deterministically if
// needed; the runtime export above is the actual handler.
export const ogSize = OG_IMAGE_SIZE;
