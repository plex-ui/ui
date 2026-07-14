import Link from 'next/link';

type FooterLink = { label: string; href: string; external?: boolean };
type FooterGroup = { title: string; links: FooterLink[] };
type FooterColumn = FooterGroup[];

const componentLinks: FooterLink[] = [
  { label: 'Accordion', href: '/components/accordion' },
  { label: 'Alert', href: '/components/alert' },
  { label: 'Avatar', href: '/components/avatar' },
  { label: 'Avatar Group', href: '/components/avatar-group' },
  { label: 'Badge', href: '/components/badge' },
  { label: 'Button', href: '/components/button' },
  { label: 'Button Group', href: '/components/button-group' },
  { label: 'Button Link', href: '/components/button-link' },
  { label: 'Card', href: '/components/card' },
  { label: 'Checkbox', href: '/components/checkbox' },
  { label: 'Code Block', href: '/components/code-block' },
  { label: 'Copy Tooltip', href: '/components/copy-tooltip' },
  { label: 'Date Input', href: '/components/date-input' },
  { label: 'Date Picker', href: '/components/date-picker' },
  { label: 'Date Range Picker', href: '/components/date-range-picker' },
  { label: 'Dialog', href: '/components/dialog' },
  { label: 'Empty Message', href: '/components/empty-message' },
  { label: 'Field', href: '/components/field' },
  { label: 'File Upload', href: '/components/file-upload' },
  { label: 'Floating Label Input', href: '/components/floating-label-input' },
  { label: 'Indicators', href: '/components/indicators' },
  { label: 'Input', href: '/components/input' },
  { label: 'Label', href: '/components/label' },
  { label: 'Markdown', href: '/components/markdown' },
  { label: 'Markdown Editor', href: '/components/markdown-editor' },
  { label: 'Menu', href: '/components/menu' },
  { label: 'OTP Input', href: '/components/otp-input' },
  { label: 'Popover', href: '/components/popover' },
  { label: 'Progress', href: '/components/progress' },
  { label: 'Progress Steps', href: '/components/progress-steps' },
  { label: 'Radio Group', href: '/components/radio-group' },
  { label: 'Select', href: '/components/select' },
  { label: 'Select Control', href: '/components/select-control' },
  { label: 'Separator', href: '/components/separator' },
  { label: 'Shimmer Text', href: '/components/shimmer-text' },
  { label: 'Sidebar', href: '/components/sidebar' },
  { label: 'Skeleton', href: '/components/skeleton' },
  { label: 'Slider', href: '/components/slider' },
  { label: 'Stat Card', href: '/components/stat-card' },
  { label: 'Switch', href: '/components/switch' },
  { label: 'Table', href: '/components/table' },
  { label: 'Tabs', href: '/components/tabs' },
  { label: 'Tag Input', href: '/components/tag-input' },
  { label: 'Text Link', href: '/components/text-link' },
  { label: 'Textarea', href: '/components/textarea' },
  { label: 'Toast', href: '/components/toast' },
  { label: 'Tooltip', href: '/components/tooltip' },
];

/**
 * Footer columns mirror the docs sidebar groups (lib/docs-navigation.ts):
 * Get Started · Foundations · AI & Distribution · Icons · Components.
 * Plex UI brand column keeps the top-nav routes for symmetry with the
 * global header.
 */
const footerColumns: FooterColumn[] = [
  [
    {
      title: 'Plex UI',
      links: [
        { label: 'Home', href: '/' },
        { label: 'Components', href: '/components' },
        { label: 'Icons', href: '/icons' },
        { label: 'Docs', href: '/docs' },
        { label: 'Blog', href: '/blog' },
        { label: 'GitHub', href: 'https://github.com/plex-ui/docs', external: true },
      ],
    },
    {
      title: 'Get Started',
      links: [
        { label: 'Introduction', href: '/docs' },
        { label: 'Installation', href: '/docs/installation' },
        { label: 'Changelog', href: '/docs/changelog' },
      ],
    },
  ],
  [
    {
      title: 'Foundations',
      links: [
        { label: 'Design Tokens', href: '/docs/foundations/design-tokens' },
        { label: 'Colors', href: '/docs/foundations/colors' },
        { label: 'Typography', href: '/docs/foundations/typography' },
        { label: 'Concepts', href: '/docs/concepts' },
        { label: 'Hooks', href: '/docs/hooks' },
        { label: 'Transitions', href: '/docs/transitions' },
      ],
    },
    {
      title: 'AI & Distribution',
      links: [
        { label: 'AI Setup', href: '/docs/ai-setup' },
        { label: 'MCP Server', href: '/docs/mcp' },
        { label: 'Skills', href: '/docs/skills' },
        { label: 'Shadcn Registry', href: '/docs/registry' },
      ],
    },
    {
      title: 'Icons',
      links: [
        { label: 'Browse', href: '/icons' },
        { label: 'Plex', href: '/icons/plex' },
        { label: 'Lucide', href: '/icons/lucide' },
        { label: 'Tabler', href: '/icons/tabler' },
        { label: 'Hugeicons', href: '/icons/hugeicons' },
      ],
    },
  ],
  [{ title: 'Components', links: componentLinks }],
];

function FooterLinkItem({ label, href, external }: FooterLink) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
      >
        {label}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
    >
      {label}
    </Link>
  );
}

function FooterGroupBlock({
  group,
  multiColumn = false,
}: {
  group: FooterGroup;
  multiColumn?: boolean;
}) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold tracking-wide text-fd-foreground uppercase">
        {group.title}
      </h4>
      <ul
        className={
          multiColumn
            ? 'columns-2 sm:columns-3 md:columns-2 gap-x-6 [&>li]:break-inside-avoid space-y-2'
            : 'space-y-2'
        }
      >
        {group.links.map((link) => (
          <li key={link.href}>
            <FooterLinkItem {...link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-fd-border bg-fd-background px-6 pt-12 pb-8">
      <div className="mx-auto max-w-4xl">
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4"
        >
          {footerColumns.map((groups, i) => {
            const isComponents = i === footerColumns.length - 1;
            return (
              <div
                key={i}
                className={
                  isComponents
                    ? 'flex flex-col gap-8 col-span-full md:col-span-2'
                    : 'flex flex-col gap-8'
                }
              >
                {groups.map((group, j) => (
                  <FooterGroupBlock
                    key={`${i}-${j}`}
                    group={group}
                    multiColumn={isComponents}
                  />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center gap-2 border-t border-fd-border pt-6 text-sm text-fd-muted-foreground">
          <div>
            Built by Plex UI. The source code is available on{' '}
            <a
              href="https://github.com/plex-ui/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-fd-foreground"
            >
              GitHub
            </a>
            .
          </div>
          <a
            href="mailto:plexuikit@gmail.com"
            className="transition-colors hover:text-fd-foreground"
          >
            plexuikit@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
