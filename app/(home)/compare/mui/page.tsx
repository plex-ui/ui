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
    competitor: '3 sizes (small/medium/large)',
  },
  {
    feature: 'Total components',
    plexui: '35 components + 14 hooks',
    competitor: '50+ components',
  },
  {
    feature: 'Figma design system',
    plexui: 'Official Figma library',
    competitor: 'Official paid kit (Material UI for Figma)',
  },
  {
    feature: 'Design tokens',
    plexui: '3-layer token architecture',
    competitor: 'Theme object with createTheme()',
  },
  {
    feature: 'Figma-to-code parity',
    plexui: 'Exact parity by design',
    competitor: 'Partial — Figma kit is separate product',
  },
  {
    feature: 'AI editor compatibility',
    plexui: 'Designed for AI-assisted workflows',
    competitor: 'Works, but verbose API',
  },
  {
    feature: 'Icon library',
    plexui: '6,600+ icons bundled',
    competitor: '2,100+ Material Icons',
  },
  {
    feature: 'Dark mode approach',
    plexui: 'Token-driven via semantic variables',
    competitor: 'Theme palette mode',
  },
  {
    feature: 'Accessibility',
    plexui: 'WAI-ARIA compliant',
    competitor: 'WAI-ARIA compliant',
  },
  {
    feature: 'TypeScript support',
    plexui: true,
    competitor: true,
  },
  {
    feature: 'Bundle size',
    plexui: 'Lightweight, tree-shakeable',
    competitor: 'Larger bundle, @emotion dependency',
  },
  {
    feature: 'Styling approach',
    plexui: 'Tailwind CSS 4 + CSS variables',
    competitor: 'Emotion/styled-components + sx prop',
  },
  {
    feature: 'Pricing',
    plexui: 'Free and open-source',
    competitor: 'Core free; Pro/Premium from $15/mo',
  },
  {
    feature: 'Community size',
    plexui: 'Growing',
    competitor: 'Largest React UI community',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Plex UI a good alternative to MUI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Both provide production-grade React component libraries, but Plex UI uses modern CSS (Tailwind CSS 4, no runtime styling), offers a 9-step control size scale, and maintains exact Figma-to-code parity by design.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Plex UI compare to Material UI in bundle size?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Plex UI produces a lighter bundle because it relies on Tailwind CSS 4 and CSS variables instead of a runtime CSS-in-JS engine like Emotion, which MUI depends on by default.',
      },
    },
    {
      '@type': 'Question',
      name: 'When should I choose MUI over Plex UI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Choose MUI when you need the largest possible component catalog out of the box, strong enterprise adoption references, or want to leverage the extensive Material Design ecosystem and community.',
      },
    },
  ],
};

export const metadata: Metadata = {
  title: 'Plex UI vs MUI — Feature Comparison (2026)',
  description:
    'Detailed comparison of Plex UI and MUI (Material UI). Bundle size, Figma parity, design tokens, styling approach, pricing, and more.',
  alternates: {
    canonical: 'https://plexui.com/compare/mui',
  },
  openGraph: {
    title: 'Plex UI vs MUI — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and MUI (Material UI). Bundle size, Figma parity, design tokens, styling approach, pricing, and more.',
    url: 'https://plexui.com/compare/mui',
    images: [{ url: '/opengraph-image.png' }],
  },
  twitter: {
    title: 'Plex UI vs MUI — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and MUI (Material UI). Bundle size, Figma parity, design tokens, styling approach, pricing, and more.',
  },
  keywords: [
    'mui alternative',
    'material ui alternative',
    'plex ui vs mui',
    'plex ui vs material ui',
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

export default function MuiComparisonPage() {
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
            Plex UI vs MUI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fd-muted-foreground md:text-lg">
            A fair, side-by-side comparison for teams evaluating a Material UI alternative with modern CSS, lighter
            bundles, tighter Figma parity, and predictable sizing.
          </p>
        </section>

        <section aria-labelledby="tldr">
          <h2 id="tldr" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Key differences
          </h2>
           <div className="mt-4 space-y-3">
             <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
               <li>MUI offers the largest React component catalog and the biggest community in the ecosystem.</li>
               <li>Plex UI uses Tailwind CSS 4 and CSS variables instead of runtime CSS-in-JS, resulting in lighter bundles.</li>
               <li>Plex UI provides 9 production-ready control sizes, while MUI provides 3 (small, medium, large).</li>
               <li>Both have official Figma kits, but Plex UI maintains exact Figma-to-code parity by design.</li>
             </ul>
           </div>
        </section>

        <section aria-labelledby="feature-comparison">
          <h2 id="feature-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Plex UI vs MUI feature comparison table
          </h2>

          <div className="mt-5 hidden overflow-hidden rounded-xl border border-fd-border sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/40">
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Feature</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Plex UI</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">MUI</th>
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
                    <p className="mb-1">MUI</p>
                    <CellContent value={row.competitor} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

         <section aria-labelledby="where-mui-wins">
           <h2 id="where-mui-wins" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Where MUI wins
           </h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Massive component library with 50+ ready-to-use components covering most use cases.</li>
             <li>Largest React UI community with extensive documentation, tutorials, and Stack Overflow answers.</li>
             <li>Strong enterprise adoption and proven track record at scale.</li>
             <li>Comprehensive theming system with createTheme() for deep customization.</li>
           </ul>

           <h2 className="mt-10 text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">Where Plex UI wins</h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Modern CSS approach (Tailwind CSS 4 + CSS variables) with no runtime styling overhead.</li>
             <li>Lighter bundle size without @emotion or styled-components dependencies.</li>
             <li>Tighter Figma-to-code parity with exact design-to-implementation alignment.</li>
             <li>9-step control sizing gives more precision than small/medium/large for complex layouts.</li>
             <li>Built with explicit AI editor compatibility for fast code generation workflows.</li>
           </ul>
         </section>

        <section aria-labelledby="pricing-comparison" className="space-y-3">
          <h2 id="pricing-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Pricing comparison: Plex UI vs MUI
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            Both ecosystems offer free core React libraries. MUI charges a per-developer monthly subscription for Pro and
            Premium components (DataGrid, Date Pickers, etc.), starting at $15/month. Plex UI is free end to end — every
            component is in the open-source package, with no paid tier and no recurring costs.
          </p>
        </section>

         <section aria-labelledby="who-should-use-which" className="space-y-3">
           <h2 id="who-should-use-which" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Who should use which?
           </h2>
           <h3 className="mt-4 text-base font-semibold text-fd-foreground">Choose MUI if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>The widest component catalog with advanced data components (DataGrid, Date Pickers).</li>
             <li>A well-established ecosystem with extensive community support.</li>
             <li>Material Design conventions and familiarity across your team.</li>
           </ul>

           <h3 className="mt-6 text-base font-semibold text-fd-foreground">Choose Plex UI if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Modern CSS without runtime overhead and smaller production bundles.</li>
             <li>Consistent sizing with 9-step controls across key components.</li>
             <li>A production-ready token architecture with exact Figma parity.</li>
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
