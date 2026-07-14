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
    competitor: 'Unstyled — size is user-defined',
  },
  {
    feature: 'Total components',
    plexui: '35 components + 14 hooks',
    competitor: '28 primitives',
  },
  {
    feature: 'Figma design system',
    plexui: 'Official Figma library',
    competitor: false,
  },
  {
    feature: 'Design tokens',
    plexui: '3-layer token architecture',
    competitor: 'No token system (unstyled)',
  },
  {
    feature: 'Figma-to-code parity',
    plexui: 'Exact parity by design',
    competitor: 'No Figma workflow',
  },
  {
    feature: 'AI editor compatibility',
    plexui: 'Designed for AI-assisted workflows',
    competitor: 'Works as primitives layer',
  },
  {
    feature: 'Icon library',
    plexui: '6,600+ icons bundled',
    competitor: 'Radix Icons (318 icons, separate package)',
  },
  {
    feature: 'Dark mode approach',
    plexui: 'Token-driven via semantic variables',
    competitor: 'Unstyled — theme is user responsibility',
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
    feature: 'Styling approach',
    plexui: 'Tailwind CSS 4 + CSS variables',
    competitor: 'Unstyled — bring your own CSS',
  },
  {
    feature: 'Pricing',
    plexui: 'Free and open-source',
    competitor: 'Fully free and open-source',
  },
  {
    feature: 'Community size',
    plexui: 'Growing commercial + OSS audience',
    competitor: 'Large, established OSS community',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Plex UI a Radix UI alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'They solve different problems. Radix provides unstyled, accessible primitives. Plex UI provides a complete styled design system with Figma parity. Plex UI uses Radix primitives internally for accessibility.',
      },
    },
    {
      '@type': 'Question',
      name: 'When should I choose Radix UI over Plex UI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Choose Radix when you want full control over styling and are building a custom design system from scratch.',
      },
    },
    {
      '@type': 'Question',
      name: 'When does Plex UI make more sense?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'When you need a production-ready styled system with Figma assets, design tokens, and consistent sizing out of the box.',
      },
    },
  ],
};

export const metadata: Metadata = {
  title: 'Plex UI vs Radix UI — Feature Comparison (2026)',
  description:
    'Detailed comparison of Plex UI and Radix UI. Styled system vs unstyled primitives, Figma parity, design tokens, pricing, and more.',
  alternates: {
    canonical: 'https://plexui.com/compare/radix-ui',
  },
  openGraph: {
    title: 'Plex UI vs Radix UI — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and Radix UI. Styled system vs unstyled primitives, Figma parity, design tokens, pricing, and more.',
    url: 'https://plexui.com/compare/radix-ui',
    images: [{ url: '/opengraph-image.png' }],
  },
  twitter: {
    title: 'Plex UI vs Radix UI — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and Radix UI. Styled system vs unstyled primitives, Figma parity, design tokens, pricing, and more.',
  },
  keywords: [
    'plex ui vs radix',
    'radix ui alternative',
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

export default function RadixComparisonPage() {
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
            Plex UI vs Radix UI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fd-muted-foreground md:text-lg">
            A fair, side-by-side comparison for teams evaluating a styled design system against unstyled accessible
            primitives. Plex UI uses Radix internally — this page explains when each layer is the right choice.
          </p>
        </section>

        <section aria-labelledby="tldr">
          <h2 id="tldr" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Key differences
          </h2>
           <div className="mt-4 space-y-3">
             <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
               <li>Radix UI provides unstyled, accessible primitives — you bring all styling and design decisions.</li>
               <li>Plex UI builds on Radix primitives and adds production-ready styles, design tokens, and Figma parity.</li>
               <li>Radix is the right pick when you need full control over every visual detail from scratch.</li>
               <li>Plex UI is the right pick when you want a styled system that works out of the box with consistent sizing.</li>
             </ul>
           </div>
        </section>

        <section aria-labelledby="feature-comparison">
          <h2 id="feature-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Plex UI vs Radix UI feature comparison table
          </h2>

          <div className="mt-5 hidden overflow-hidden rounded-xl border border-fd-border sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/40">
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Feature</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Plex UI</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Radix UI</th>
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
                    <p className="mb-1">Radix UI</p>
                    <CellContent value={row.competitor} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

         <section aria-labelledby="where-radix-wins">
           <h2 id="where-radix-wins" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Where Radix UI wins
           </h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Fully unstyled primitives give maximum control over every visual detail.</li>
             <li>Battle-tested accessibility patterns trusted across the React ecosystem.</li>
             <li>Zero styling opinions — works with any CSS approach or design system.</li>
             <li>Large ecosystem of styled wrappers and community integrations built on top.</li>
           </ul>

           <h2 className="mt-10 text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">Where Plex UI wins</h2>
           <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Production-ready styles out of the box — no need to build a design system on top of primitives.</li>
             <li>Official Figma design system with exact Figma-to-code parity.</li>
             <li>9-step control sizing for precise density control across dashboards and marketing layouts.</li>
             <li>Three-layer design token architecture for scalable theming and component-level overrides.</li>
             <li>Built with explicit AI editor compatibility in mind for fast code generation workflows.</li>
           </ul>
         </section>

        <section aria-labelledby="pricing-comparison" className="space-y-3">
          <h2 id="pricing-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Pricing comparison: Plex UI vs Radix UI
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            Both are free and open-source. The difference is in the layer above the primitives: Plex UI ships styled,
            token-driven components with exact Figma-to-code parity, while Radix stops at unstyled primitives and leaves
            the design layer to you.
          </p>
        </section>

         <section aria-labelledby="who-should-use-which" className="space-y-3">
           <h2 id="who-should-use-which" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
             Who should use which?
           </h2>
           <h3 className="mt-4 text-base font-semibold text-fd-foreground">Choose Radix UI if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Full control over styling with no visual opinions imposed.</li>
             <li>A foundation for building a fully custom design system from scratch.</li>
             <li>Accessible primitives that integrate into any existing CSS workflow.</li>
           </ul>

           <h3 className="mt-6 text-base font-semibold text-fd-foreground">Choose Plex UI if you need</h3>
           <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
             <li>Design and code systems that stay aligned over time.</li>
             <li>Consistent sizing with 9-step controls across key components.</li>
             <li>A production-ready token architecture for long-term scaling.</li>
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
