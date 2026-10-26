import Link from 'next/link';
import { componentsSource, vueComponentsSource } from '@/lib/source';
import { getRelatedComponents } from '@/lib/related-components';
import s from './RelatedComponents.module.css';

/**
 * "Related components" card row rendered at the bottom of every
 * /components/<slug> page. Pulls 3–4 hand-curated related slugs from
 * `lib/related-components.ts`, looks each up in `componentsSource` to
 * get its title + description, and renders a clickable card grid.
 *
 * Distributes link equity, increases time on site, and helps users
 * discover the catalog from any single component page they landed on.
 */
export function RelatedComponents({
  slug,
  framework = 'react',
}: {
  slug: string;
  /** On Vue pages, related components that have a Vue page link to it */
  framework?: 'react' | 'vue';
}) {
  const relatedSlugs = getRelatedComponents(slug, 4);
  if (relatedSlugs.length === 0) return null;

  const items = relatedSlugs
    .map((relatedSlug) => {
      const vuePage = framework === 'vue' ? vueComponentsSource.getPage([relatedSlug]) : undefined;
      const page = vuePage ?? componentsSource.getPage([relatedSlug]);
      if (!page) return null;
      return {
        slug: relatedSlug,
        href: vuePage ? `/vue/components/${relatedSlug}` : `/components/${relatedSlug}`,
        title: page.data.title,
        description: page.data.description,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return (
    <section className={`${s.Section} not-prose`} aria-labelledby="related-components-heading">
      <h2 id="related-components-heading" className={s.Heading}>
        Related components
      </h2>
      <div className={s.Grid}>
        {items.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            className={s.Card}
          >
            <span className={s.Title}>{item.title}</span>
            <span className={s.Description}>{item.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
