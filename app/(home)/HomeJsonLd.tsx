const faqs = [
  {
    question: 'How do I install Plex UI?',
    answer:
      'Install @plexui/ui from npm and import the stylesheet in your global CSS. The library is open-source and free — no account, no license key. See the installation guide for the full setup.',
  },
  {
    question: 'Can I use it in commercial projects?',
    answer:
      'Yes. @plexui/ui is open-source and free to use in commercial products, with no seat or project limits.',
  },
  {
    question: 'How do I receive updates?',
    answer:
      'Updates ship as regular npm releases. Bump the @plexui/ui version in your package.json to pick them up. The changelog lists every change per version.',
  },
  {
    question: 'How do I set up Plex UI for Claude, Cursor, or Codex?',
    answer:
      'Install @plexui/ui from npm and add the CSS import to your global stylesheet. The AI will recognize component names and props automatically. See the installation guide for the full setup.',
  },
  {
    question: 'What does "three-layer token system" mean?',
    answer:
      'Every value in the system flows through three layers: primitive tokens (raw colors, spacing, radii), semantic tokens (purpose-based aliases like "text-primary" or "bg-surface"), and component tokens (scoped to each component like "button-bg-solid"). Change one variable and the entire system updates.',
  },
  {
    question:
      'Why is Plex UI ideal for AI code editors like Claude, Cursor, and Codex?',
    answer:
      'AI code editors can write code, but they need proper building blocks to produce professional interfaces. Plex UI provides production-grade, well-structured components with consistent naming, a clear token system, and comprehensive props. Unlike unstyled primitives or limited kits like shadcn, Plex UI gives AI the full vocabulary to design real products.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export function HomeJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
  );
}
