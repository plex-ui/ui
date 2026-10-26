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
    competitor: '4 presets (sm/default/lg/icon)',
  },
  {
    feature: 'Total components',
    plexui: '35 components + 14 hooks',
    competitor: 'Large open registry, setup-dependent',
  },
  {
    feature: 'Frameworks',
    plexui: 'React and Vue, parity-tested',
    competitor: 'React (Vue via community shadcn-vue)',
  },
  {
    feature: 'Design tokens',
    plexui: '3-layer token architecture',
    competitor: 'Project-level CSS variables',
  },
  {
    feature: 'AI editor compatibility',
    plexui: 'Designed for AI-assisted workflows',
    competitor: 'Works well, not AI-specific',
  },
  {
    feature: 'Icon library',
    plexui: '6,600+ icons bundled',
    competitor: 'No bundled icon set',
  },
  {
    feature: 'Dark mode approach',
    plexui: 'Token-driven via semantic variables',
    competitor: 'Theme class + CSS variables',
  },
  {
    feature: 'Accessibility',
    plexui: 'Radix-based',
    competitor: 'Radix-based',
  },
  {
    feature: 'TypeScript support',
    plexui: true,
    competitor: true,
  },
  {
    feature: 'Tailwind version',
    plexui: 'Tailwind CSS 4',
    competitor: 'Tailwind CSS 4',
  },
  {
    feature: 'Pricing',
    plexui: 'Free and open-source',
    competitor: 'Free and open-source',
  },
  {
    feature: 'Community size',
    plexui: 'Growing commercial + OSS audience',
    competitor: 'Very large open-source community',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Plex UI a shadcn/ui alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Both provide React components on top of modern tooling, but Plex UI adds a 9-step control size scale, a three-layer token system, the same components for Vue, and an MCP server, llms.txt and a skill that keep AI agents on the real component API.',
      },
    },
    {
      '@type': 'Question',
      name: 'When should I choose shadcn/ui over Plex UI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Choose shadcn/ui if you want a fully free, unopinionated starting point and plan to build your own design system conventions from scratch.',
      },
    },
    {
      '@type': 'Question',
      name: 'When does Plex UI make more sense?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Plex UI is a better fit when your team needs consistent 9-size controls across components, production-ready tokens for scaling product UI, the same components in React and Vue, and AI agents that generate correct UI.',
      },
    },
  ],
};

export const metadata: Metadata = {
  title: 'Plex UI vs shadcn/ui — Feature Comparison (2026)',
  description:
    'Detailed comparison of Plex UI and shadcn/ui. 9 sizes vs 4, design tokens, React and Vue, AI agent tooling, pricing, and more.',
  alternates: {
    canonical: 'https://plexui.com/compare/shadcn-ui',
  },
  openGraph: {
    title: 'Plex UI vs shadcn/ui — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and shadcn/ui. 9 sizes vs 4, design tokens, React and Vue, AI agent tooling, pricing, and more.',
    url: 'https://plexui.com/compare/shadcn-ui',
    images: [{ url: '/opengraph-image.png' }],
  },
  twitter: {
    title: 'Plex UI vs shadcn/ui — Feature Comparison (2026)',
    description:
      'Detailed comparison of Plex UI and shadcn/ui. 9 sizes vs 4, design tokens, React and Vue, AI agent tooling, pricing, and more.',
  },
  keywords: [
    'plex ui vs shadcn',
    'shadcn alternative',
    'react design system comparison',
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

export default function ShadcnComparisonPage() {
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
            Plex UI vs shadcn/ui
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fd-muted-foreground md:text-lg">
            A fair, side-by-side comparison for teams evaluating a shadcn alternative with a token architecture,
            predictable sizing, and tooling for AI agents.
          </p>
        </section>

        <section aria-labelledby="tldr">
          <h2 id="tldr" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Key differences
          </h2>
          <div className="mt-4 space-y-3">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
              <li>Plex UI gives you 9 production-ready control sizes, while shadcn/ui provides 4 common size presets.</li>
              <li>shadcn/ui stays unmatched for zero-cost entry and open-source ecosystem depth.</li>
              <li>Plex UI ships the same components for React and Vue, plus an MCP server, llms.txt and a skill that keep AI agents on the real API.</li>
              <li>Both support modern React, TypeScript, accessibility, and Tailwind CSS 4 workflows.</li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="feature-comparison">
          <h2 id="feature-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Plex UI vs shadcn/ui feature comparison table
          </h2>

          <div className="mt-5 hidden overflow-hidden rounded-xl border border-fd-border sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-fd-border bg-fd-muted/40">
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Feature</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">Plex UI</th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-fd-foreground">shadcn/ui</th>
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
                    <p className="mb-1">shadcn/ui</p>
                    <CellContent value={row.competitor} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="where-shadcn-wins">
          <h2 id="where-shadcn-wins" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Where shadcn/ui wins
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            <li>Completely free starting point for teams that want maximum control and no commercial dependency.</li>
            <li>Massive community momentum, examples, and ecosystem references.</li>
            <li>Highly customizable approach for teams comfortable owning every design and implementation decision.</li>
          </ul>

          <h2 className="mt-10 text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">Where Plex UI wins</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            <li>9-step control sizing gives more precision for dense dashboards and spacious marketing layouts.</li>
            <li>The same components, props and markup in React and Vue, checked against each other by parity tests.</li>
            <li>Three-layer token model scales better for theming and component-level overrides.</li>
            <li>Built with explicit AI editor compatibility in mind for fast code generation workflows.</li>
          </ul>
        </section>

        <section aria-labelledby="pricing-comparison" className="space-y-3">
          <h2 id="pricing-comparison" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Pricing comparison: Plex UI vs shadcn/ui
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            Both libraries are free and open-source under MIT. Plex UI installs as npm packages (@plexui/ui and
            @plexui/vue) and also offers a shadcn registry, while shadcn/ui copies component source into your
            project.
          </p>
        </section>

        <section aria-labelledby="who-should-use-which" className="space-y-3">
          <h2 id="who-should-use-which" className="text-xl font-semibold tracking-tight text-fd-foreground md:text-2xl">
            Who should use which?
          </h2>
          <h3 className="mt-4 text-base font-semibold text-fd-foreground">Choose shadcn/ui if you need</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            <li>A fully free, open-source-only stack.</li>
            <li>Maximum flexibility to define your own design conventions from scratch.</li>
            <li>Broad community snippets for experimentation.</li>
          </ul>

          <h3 className="mt-6 text-base font-semibold text-fd-foreground">Choose Plex UI if you need</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fd-muted-foreground md:text-base">
            <li>One system for React and Vue that AI agents use correctly.</li>
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
