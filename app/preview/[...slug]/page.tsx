import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { componentsSource, source, vueComponentsSource } from '@/lib/source';
import { getMDXComponents } from '@/mdx-components';
import { PreviewEmbed } from '@/components/docs/PreviewEmbed';

// One preview of a docs page on its own, for the phone view of ComponentPreview:
// /preview/components/field?key=… renders /components/field and shows only that preview.

export const metadata: Metadata = { robots: { index: false, follow: false } };

function pageFor(slug: string[]) {
  const [section, ...rest] = slug;
  if (section === 'components') return componentsSource.getPage(rest.length ? rest : undefined);
  if (section === 'vue' && rest[0] === 'components') {
    const vueSlug = rest.slice(1);
    return vueComponentsSource.getPage(vueSlug.length ? vueSlug : undefined);
  }
  if (section === 'docs') return source.getPage(rest.length ? rest : undefined);
  return undefined;
}

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ slug }, { key }] = await Promise.all([props.params, props.searchParams]);
  const page = pageFor(slug);
  if (!page || !key) notFound();

  const MDX = page.data.body;

  return (
    <PreviewEmbed target={key}>
      <MDX components={getMDXComponents()} />
    </PreviewEmbed>
  );
}
