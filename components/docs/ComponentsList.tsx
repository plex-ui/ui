import Link from '@/components/layout/HoverPrefetchLink';
import componentsMeta from '@/content/components/meta.json';
import vueComponentsMeta from '@/content/vue/components/meta.json';
import { COMPONENT_GROUPS } from '@/lib/component-groups';

/**
 * Slug → display title overrides. Default behaviour is "title-case the slug",
 * e.g. `button-group` → `Button Group`. Anything where the displayed name
 * shouldn't follow that rule (initialisms, marketing names) goes here.
 */
const TITLE_OVERRIDES: Record<string, string> = {
  'otp-input': 'OTP Input',
  'floating-label-input': 'Float Input',
};

function slugToTitle(slug: string): string {
  if (TITLE_OVERRIDES[slug]) return TITLE_OVERRIDES[slug];
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * The component pages under their groups (lib/component-groups.ts), each a plain three-column text grid, as
 * shadcn/ui lists them on /components: links only, no card chrome.
 *
 * The pages come from `content/components/meta.json` (React) or `content/vue/components/meta.json` (Vue, generated
 * by `scripts/sync-vue-meta.mjs`), so a framework lists the pages it has.
 */
export function ComponentsList({ framework = 'react' }: { framework?: 'react' | 'vue' }) {
  const meta = framework === 'vue' ? vueComponentsMeta : componentsMeta;
  const base = framework === 'vue' ? '/vue/components' : '/components';
  const pages = new Set(meta.pages);
  const groups = COMPONENT_GROUPS.map((group) => ({
    ...group,
    slugs: group.slugs.filter((slug) => pages.has(slug)).sort((a, b) => slugToTitle(a).localeCompare(slugToTitle(b))),
  })).filter((group) => group.slugs.length > 0);

  return (
    <div className="not-prose my-8 flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`components-${group.id}`}>
          <h2 id={`components-${group.id}`} className="m-0 mb-4 text-sm font-medium text-fd-muted-foreground">
            {group.label}
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-x-12 gap-y-4 p-0 text-base sm:grid-cols-2 lg:grid-cols-3">
            {group.slugs.map((slug) => (
              <li key={slug} className="m-0 p-0">
                <Link
                  href={`${base}/${slug}`}
                  className="text-fd-foreground transition-colors hover:text-fd-muted-foreground"
                >
                  {slugToTitle(slug)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
