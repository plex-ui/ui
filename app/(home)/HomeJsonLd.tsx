const faqs = [
  {
    question: 'How do I install Plex UI?',
    answer:
      'Install @plexui/ui (React) or @plexui/vue (Vue) from npm and import the stylesheet in your global CSS. The library is open-source and free: no account, no license key. See the installation guide for the full setup.',
  },
  {
    question: 'Can I use it in commercial projects?',
    answer:
      'Yes. Plex UI is MIT-licensed and free to use in commercial products, with no seat or project limits.',
  },
  {
    question: 'How do I receive updates?',
    answer:
      'Updates ship as regular npm releases. Bump the @plexui/ui or @plexui/vue version in your package.json to pick them up. The changelog lists every change per version.',
  },
  {
    question: 'How do I set up Plex UI for Claude or Codex?',
    answer:
      'Install the package, then add the Claude Code plugin or the Codex skill, or connect the Plex UI MCP server. The agent then works from the real component API: names, props, sizes and tokens. See the Skills and MCP guides.',
  },
  {
    question: 'What does "three-layer token system" mean?',
    answer:
      'Every value in the system flows through three layers: primitive tokens (raw colors, spacing, radii), semantic tokens (purpose-based aliases like "text-primary" or "bg-surface"), and component tokens (scoped to each component like "button-bg-solid"). Change one variable and the entire system updates.',
  },
  {
    question: 'Why is Plex UI a good fit for AI agents like Claude and Codex?',
    answer:
      'AI agents write code fast, but they need proper building blocks to produce professional interfaces. Plex UI gives them production-grade components with consistent naming, one size scale, a clear token system, and the same API in React and Vue, plus an MCP server and llms.txt so they use it correctly.',
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
