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
    feature: 'Figma variants',
    plexui: '22,000+',
    competitor: '8,000+',
  },
  {
    feature: 'Size scale per component',
    plexui: '9 sizes (22px to 48px)',
    competitor: '4 to 5 sizes',
  },
  {
    feature: 'Token layers',
    plexui: '3 layers (primitive, semantic, component)',
    competitor: 'Typically 2 layers',
  },
  {
    feature: 'Token implementation',
    plexui: 'CSS variables + Figma Variables',
    competitor: 'Figma Variables first',
  },
  {
    feature: 'React library',
    plexui: 'Free MIT package',
    competitor: 'Paid in full bundle (~$299)',
  },
  {
    feature: 'Figma-to-code parity',
    plexui: 'Exact parity by design',
    competitor: 'Approximate parity',
  },
  {
    feature: 'AI editor compatibility',
    plexui: 'Designed for AI-assisted coding',
    competitor: 'Not positioned for AI-first workflows',
  },
  {
    feature: 'Component count',
    plexui: '35 components + 14 hooks',
    competitor: 'Broad set across UI patterns',
  },
  {
    feature: 'Icon count',
    plexui: '6,600+',
    competitor: '2,000+',
  },
  {
    feature: 'Dark mode',
    plexui: true,
    competitor: true,
  },
  {
    feature: 'Templates and blocks',
    plexui: 'Growing collection',
    competitor: 'Larger template catalog',
  },
  {
    feature: 'Pricing',
    plexui: 'Free and open-source',
    competitor: 'Figma kits from $79; React in higher-tier bundles',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Plex UI an Untitled UI alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Plex UI and Untitled UI both target design systems, but Plex UI focuses on exact Figma-to-code parity, a 9-step size scale, and a free React package.',
      },
    },
    {
      '@type': 'Question',
      name: 'When does Untitled UI fit better?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Untitled UI is often a strong option for design-first teams that prioritize broad template catalogs, established Figma patterns, and a long-running ecosystem.',
      },
    },
    {
      '@type': 'Question',
      name: 'When should teams choose Plex UI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Choose Plex UI when you need consistent 9-size controls, three-layer tokens, and a synchronized workflow between Figma variables and production React components.',
      },
    },
  ],
};

export const metadata: Metadata = {
  title: 'Plex UI vs Untitled UI — Feature Comparison (2026)',
  description:
    'Detailed comparison of Plex UI and Untitled UI design systems. Size scale, token architecture, pricing, and Figma-to-code workflow.',
  alternates: {
    canonical: 'https://plexui.com/compare/untitled-ui',
  },
  openGraph: {
    title: 'Plex UI vs Untitled UI — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and Untitled UI design systems. Size scale, token architecture, pricing, and Figma-to-code workflow.',
    url: 'https://plexui.com/compare/untitled-ui',
    images: [{ url: '/opengraph-image.png' }],
  },
  twitter: {
    title: 'Plex UI vs Untitled UI — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and Untitled UI design systems. Size scale, token architecture, pricing, and Figma-to-code workflow.',
  },
  keywords: [
    'untitled ui alternative',
    'plex ui vs untitled ui',
    'figma react design system comparison',
    'design system pricing comparison',
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

export default function UntitledUiComparisonPage() {
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
            Plex UI vs Untitled UI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fd-muted-foreground md:text-lg">
            A practical comparison for teams choosing between a design-first system and a Figma + React workflow with
            exact parity.
          </p>
        </section>

        <section aria-labelledby="tldr">
          <h2 id="tldr" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Key differences
          </h2>
           <div className="mt-4 space-y-3">
             <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
               <li>Plex UI provides 9 control sizes and three-layer tokens for tighter design-to-code scaling.</li>
               <li>Untitled UI remains strong in templates, ecosystem maturity, and design-first workflows.</li>
               <li>Plex UI keeps React components free and aligns Figma variables with production code.</li>
               <li>Both support modern dark mode and strong accessibility baselines.</li>
             </ul>
           </div>
        </section>

        <section aria-labelledby="feature-comparison">
          <h2 id="feature-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Plex UI vs Untitled UI feature comparison table
          </h2>

          <div className="mt-5 hidden overflow-hidden rounded-xl border border-fd-border sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/40">
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Feature</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Plex UI</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Untitled UI</th>
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
                    <p className="mb-1">Untitled UI</p>
                    <CellContent value={row.competitor} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

         <section aria-labelledby="where-untitled-wins">
           <h2 id="where-untitled-wins" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Where Untitled UI wins
           </h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>More templates and prebuilt page patterns across marketing and product scenarios.</li>
             <li>Larger community footprint and broader third-party resources.</li>
             <li>Strong design-first approach with a longer market track record.</li>
           </ul>

           <h2 className="mt-10 text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">Where Plex UI wins</h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>9-size control system is more granular than typical 4 to 5 size scales.</li>
             <li>Free React library lowers implementation cost for engineering teams.</li>
             <li>Three-layer tokens improve maintainability for large product surfaces.</li>
             <li>Exact Figma parity and AI editor focus support faster implementation loops.</li>
           </ul>
         </section>

        <section aria-labelledby="pricing-comparison" className="space-y-3">
          <h2 id="pricing-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Pricing comparison: Plex UI vs Untitled UI
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            Plex UI ships every React component free on npm, with no paid tier. Untitled UI sells design kits, and React
            code access is generally tied to higher-priced bundles.
          </p>
        </section>

         <section aria-labelledby="who-should-use-which" className="space-y-3">
           <h2 id="who-should-use-which" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Who should use which?
           </h2>
           <h3 className="mt-4 text-base font-semibold text-fd-foreground">Choose Untitled UI if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>A design-first library with many page templates ready early in a project.</li>
             <li>An ecosystem with broad market awareness and longer history.</li>
             <li>Figma-first delivery where engineering assets are secondary.</li>
           </ul>

           <h3 className="mt-6 text-base font-semibold text-fd-foreground">Choose Plex UI if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>One system shared by designers and engineers with exact parity.</li>
             <li>Fine-grained sizing flexibility across real product surfaces.</li>
             <li>A free, open-source React library with exact Figma-to-code parity.</li>
           </ul>
         </section>

        <section className="rounded-xl border border-fd-border bg-fd-accent/40 p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Compare by trying the docs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            Browse the components and see how the sizing behavior holds up across real product surfaces.
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
