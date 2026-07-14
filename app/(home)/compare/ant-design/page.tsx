import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';

type CellValue = true | false | string;

interface ComparisonRow {
  feature: string;
  plexui: CellValue;
  competitor: CellValue;
}

const rows: ComparisonRow[] = [
  {
    feature: 'Button/control sizes',
    plexui: '9 sizes (22px to 48px)',
    competitor: '3 sizes (small/middle/large)',
  },
  {
    feature: 'Total components',
    plexui: '35 components + 14 hooks',
    competitor: '60+ components',
  },
  {
    feature: 'Figma design system',
    plexui: 'Official Figma library',
    competitor: 'Official free Figma resources',
  },
  {
    feature: 'Design tokens',
    plexui: '3-layer token architecture',
    competitor: 'Design Token system (v5)',
  },
  {
    feature: 'Figma-to-code parity',
    plexui: 'Exact parity by design',
    competitor: 'Partial parity',
  },
  {
    feature: 'AI editor compatibility',
    plexui: 'Designed for AI-assisted workflows',
    competitor: 'Works, verbose API',
  },
  {
    feature: 'Icon library',
    plexui: '6,600+ icons bundled',
    competitor: '400+ Ant Design Icons',
  },
  {
    feature: 'Dark mode approach',
    plexui: 'Token-driven via semantic variables',
    competitor: 'ConfigProvider theme algorithm',
  },
  {
    feature: 'Accessibility',
    plexui: 'Radix-based, WAI-ARIA',
    competitor: 'Basic ARIA support',
  },
  {
    feature: 'TypeScript support',
    plexui: true,
    competitor: true,
  },
  {
    feature: 'Bundle size',
    plexui: 'Lightweight, tree-shakeable',
    competitor: 'Larger bundle, less/cssinjs',
  },
  {
    feature: 'Styling approach',
    plexui: 'Tailwind CSS 4 + CSS variables',
    competitor: 'CSS-in-JS (cssinjs) / Less',
  },
  {
    feature: 'Pricing',
    plexui: 'Free and open-source',
    competitor: 'Fully free (Pro components paid)',
  },
  {
    feature: 'Community size',
    plexui: 'Growing',
    competitor: 'Massive, especially in China/Asia',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Plex UI an Ant Design alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Both provide comprehensive React component libraries, but Plex UI focuses on modern CSS (Tailwind 4, no runtime), a 9-step sizing scale, and tighter Figma-to-code parity, while Ant Design offers a larger component catalog with deep enterprise adoption.',
      },
    },
    {
      '@type': 'Question',
      name: 'When should I choose Ant Design over Plex UI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Choose Ant Design if you need a battle-tested enterprise UI with 60+ components out of the box, extensive data display components like Table and Tree, or your team is already invested in the Ant Design ecosystem.',
      },
    },
    {
      '@type': 'Question',
      name: 'When does Plex UI make more sense than Ant Design?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Plex UI is a better fit when you want zero-runtime CSS with Tailwind, precise Figma-to-code parity, a lightweight bundle without CSS-in-JS overhead, and AI-first development workflows with predictable component APIs.',
      },
    },
  ],
};

export const metadata: Metadata = {
  title: 'Plex UI vs Ant Design — Feature Comparison (2026)',
  description:
    'Detailed comparison of Plex UI and Ant Design. 9 sizes vs 3, Figma parity, design tokens, bundle size, styling, and more.',
  alternates: {
    canonical: 'https://plexui.com/compare/ant-design',
  },
  openGraph: {
    title: 'Plex UI vs Ant Design — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and Ant Design. 9 sizes vs 3, Figma parity, design tokens, bundle size, styling, and more.',
    url: 'https://plexui.com/compare/ant-design',
    images: [{ url: '/opengraph-image.png' }],
  },
  twitter: {
    title: 'Plex UI vs Ant Design — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and Ant Design. 9 sizes vs 3, Figma parity, design tokens, bundle size, styling, and more.',
  },
  keywords: [
    'plex ui vs ant design',
    'ant design alternative',
    'antd alternative',
    'figma react design system comparison',
    'plex ui comparison',
  ],
};

function CellContent({ value }: { value: CellValue }) {
  if (value === true) {
    return <Check className="inline-block size-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />;
  }
  if (value === false) {
    return <Minus className="inline-block size-5 text-fd-muted-foreground" strokeWidth={2} />;
  }

  return <span className="text-sm font-medium text-fd-foreground">{value}</span>;
}

export default function AntDesignComparisonPage() {
  return (
    <main className="flex flex-1 flex-col bg-fd-background px-6 py-16 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-14">
        <section className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground md:text-5xl">
            Plex UI vs Ant Design
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fd-muted-foreground md:text-lg">
            A fair, side-by-side comparison for teams evaluating an Ant Design alternative with modern CSS, tighter Figma
            integration, and a lighter runtime footprint.
          </p>
        </section>

        <section aria-labelledby="tldr">
          <h2 id="tldr" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Key differences
          </h2>
           <div className="mt-4 space-y-3">
             <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
               <li>Plex UI uses Tailwind CSS 4 with zero-runtime styling, while Ant Design relies on CSS-in-JS or Less.</li>
               <li>Ant Design provides 60+ battle-tested components with deep enterprise and data-heavy use cases.</li>
               <li>Plex UI offers exact Figma-to-code parity and a 9-step sizing scale for precise layout control.</li>
               <li>Both support TypeScript, design tokens, and dark mode out of the box.</li>
             </ul>
           </div>
        </section>

        <section aria-labelledby="feature-comparison">
          <h2 id="feature-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Plex UI vs Ant Design feature comparison table
          </h2>

          <div className="mt-5 hidden overflow-hidden rounded-xl border border-fd-border sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/40">
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Feature</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Plex UI</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Ant Design</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.feature} className={index < rows.length - 1 ? 'border-b border-fd-border' : undefined}>
                    <td className="px-5 py-3 text-left text-sm text-fd-muted-foreground">{row.feature}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center">
                        <CellContent value={row.plexui} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center">
                        <CellContent value={row.competitor} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:hidden">
            {rows.map((row) => (
              <div key={row.feature} className="rounded-lg border border-fd-border p-4">
                <p className="text-sm font-medium text-fd-foreground">{row.feature}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-center text-xs text-fd-muted-foreground">
                  <div className="flex flex-col items-center">
                    <p className="mb-1 font-medium text-fd-foreground">Plex UI</p>
                    <CellContent value={row.plexui} />
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="mb-1">Ant Design</p>
                    <CellContent value={row.competitor} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

         <section aria-labelledby="where-antd-wins">
           <h2 id="where-antd-wins" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Where Ant Design wins
           </h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Huge component library with 60+ production-ready components covering enterprise and data-heavy UIs.</li>
             <li>Massive adoption and community, especially across China and Asia-Pacific markets.</li>
             <li>Extensive data display components like Table, Tree, Transfer, and Calendar out of the box.</li>
             <li>Enterprise-grade maturity with years of battle-testing at Ant Group scale.</li>
           </ul>

           <h2 className="mt-10 text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">Where Plex UI wins</h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Modern CSS with Tailwind 4 and zero runtime overhead, no CSS-in-JS dependency.</li>
             <li>9-step control sizing gives more precision than Ant Design's 3 size presets.</li>
             <li>Tighter Figma-to-code parity with an official Figma design system built in sync with React.</li>
             <li>Lighter bundle size with tree-shaking and no CSS-in-JS runtime cost.</li>
             <li>Designed for AI-assisted development workflows from the ground up.</li>
           </ul>
         </section>

        <section aria-labelledby="pricing-comparison" className="space-y-3">
          <h2 id="pricing-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Pricing comparison: Plex UI vs Ant Design
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            Both React libraries are free. Ant Design is fully open source, with paid Pro components (Ant Design Pro) for
            enterprise dashboards. Plex UI has no paid tier — every component ships in the open-source package.
          </p>
        </section>

         <section aria-labelledby="who-should-use-which" className="space-y-3">
           <h2 id="who-should-use-which" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Who should use which?
           </h2>
           <h3 className="mt-4 text-base font-semibold text-fd-foreground">Choose Ant Design if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>A massive component catalog with data-heavy components like Table, Tree, and Transfer.</li>
             <li>An established enterprise ecosystem with deep community support in Asia.</li>
             <li>A fully free, open-source stack with optional paid Pro templates.</li>
           </ul>

           <h3 className="mt-6 text-base font-semibold text-fd-foreground">Choose Plex UI if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Zero-runtime CSS with Tailwind and no CSS-in-JS overhead.</li>
             <li>Consistent sizing with 9-step controls across key components.</li>
             <li>Exact Figma-to-code parity with a synchronized design system.</li>
           </ul>
         </section>

        <section className="rounded-xl border border-fd-border bg-fd-accent/40 p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Explore Plex UI
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            Browse the component docs and see how the token system, size scale, and props hold up in practice.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/components"
              className="rounded-md border border-fd-primary bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
            >
              Explore components
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
