import { RootProvider } from 'fumadocs-ui/provider/next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { PlexThemeSync } from '@/components/PlexThemeSync';
import { COMPONENTS_COUNT } from '@/lib/counts';
import packageJson from '../packages/ui/package.json';
import './globals.css';

const homeTitle = 'Plex UI — React Design System for AI Code Editors';
const homeDescription = `Production-grade React design system with ${COMPONENTS_COUNT} components, 9-size scale (3xs–3xl), three-layer design tokens, and 6,600+ icons. Free MIT React library with pixel-perfect Figma parity. Built for Claude, Cursor, Codex.`;
const homeShortDescription = `${COMPONENTS_COUNT} React components with 9-size scale, three-layer design tokens, and 6,600+ icons. Free, open-source, and built for AI code editors.`;

export const metadata: Metadata = {
  // `default` is used on the home page; deeper pages set their own
  // `title` and the template wraps it as e.g. `Button — Plex UI`. This
  // adds brand recognition to every SERP entry without per-page edits.
  title: {
    default: homeTitle,
    template: '%s — Plex UI',
  },
  description: homeDescription,
  metadataBase: new URL('https://plexui.com'),
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: homeTitle,
    description: homeShortDescription,
    url: 'https://plexui.com',
    siteName: 'Plex UI',
    type: 'website',
    images: [{ url: 'https://plexui.com/opengraph-image.png?v=3', width: 2400, height: 1260, type: 'image/png' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ui_plex',
    title: homeTitle,
    description: homeShortDescription,
    images: ['https://plexui.com/opengraph-image.png?v=3'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://plexui.com/#organization',
      name: 'Plex UI',
      url: 'https://plexui.com',
      logo: 'https://plexui.com/favicon.svg',
      email: 'plexuikit@gmail.com',
      sameAs: [
        'https://github.com/plex-ui/docs',
        'https://www.threads.net/@plexuikit',
        'https://www.npmjs.com/package/@plexui/ui',
        'https://www.figma.com/community/file/1605261673441035444',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://plexui.com/#website',
      url: 'https://plexui.com',
      name: 'Plex UI',
      description: `Production-grade React design system with ${COMPONENTS_COUNT} components, 9-size scale, three-layer design tokens, and 6,600+ icons. Free and open-source, with pixel-perfect Figma parity.`,
      publisher: { '@id': 'https://plexui.com/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://plexui.com/#react-library',
      name: 'Plex UI React Library',
      image: 'https://plexui.com/opengraph-image.png?v=3',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      description: `Free, open-source React component library with ${COMPONENTS_COUNT} components, 9-size scale, three-layer design tokens, and dark mode. Built on Radix UI and Tailwind CSS 4. Designed for AI code editors like Claude, Cursor, and Codex.`,
      url: 'https://plexui.com/components',
      downloadUrl: 'https://www.npmjs.com/package/@plexui/ui',
      softwareVersion: packageJson.version,
      author: { '@id': 'https://plexui.com/#organization' },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        description: 'Free and open-source (MIT license)',
      },
      featureList: [
        `${COMPONENTS_COUNT} accessible React components`,
        '9-step unified size scale (3xs to 3xl)',
        'Three-layer CSS variable design token system',
        'Dark mode via CSS light-dark()',
        '6,600+ bundled icons',
        '14 React hooks',
        'Built on Radix UI + Tailwind CSS 4',
        'AI code editor ready (Claude, Cursor, Codex)',
      ],
    },

  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Surface the AI-crawler-friendly Markdown summary so
         * Perplexity, Phind, ExaBot, and other LLM-powered crawlers
         * pick up the canonical text representation of every page. */}
        <link
          rel="alternate"
          type="text/markdown"
          title="llms.txt"
          href="/llms.txt"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <PlexThemeSync>
            <div className="flex min-h-screen flex-1 flex-col">{children}</div>
          </PlexThemeSync>
        </RootProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
