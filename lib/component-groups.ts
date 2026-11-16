/**
 * The groups of the component pages, in the order the sidebar, the /components list and the page arrows show them
 * (owner 16.11: a flat list of 67 mixed components, patterns and a utility). Every page of
 * content/components/meta.json is in exactly one group (tests/parity/docs-sync.test.ts); inside a group the pages
 * are in alphabetical order. Patterns are whole screens composed from the components, not components.
 */
export type ComponentGroup = { id: string; label: string; slugs: readonly string[] };

export const COMPONENT_GROUPS: readonly ComponentGroup[] = [
  {
    id: 'actions',
    label: 'Actions',
    slugs: ['button', 'button-group', 'context-menu', 'menu', 'swipe-actions', 'text-link'],
  },
  {
    id: 'text-input',
    label: 'Text Input',
    slugs: ['field', 'file-upload', 'floating-label-input', 'input', 'input-group', 'markdown-editor', 'otp-input', 'tag-input', 'textarea'],
  },
  {
    id: 'selection',
    label: 'Selection',
    slugs: [
      'checkbox',
      'color-picker',
      'date-input',
      'date-picker',
      'date-range-picker',
      'radio-group',
      'segmented-control',
      'select',
      'slider',
      'stepper',
      'switch',
      'toggle-group',
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    slugs: ['breadcrumb', 'index-bar', 'navigation-row', 'page', 'page-control', 'sidebar', 'tab-bar', 'toolbar'],
  },
  {
    id: 'overlays',
    label: 'Overlays',
    slugs: ['dialog', 'popover', 'tip', 'toast', 'tooltip'],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    slugs: ['alert', 'empty-message', 'indicators', 'progress', 'progress-steps', 'shimmer-text', 'skeleton'],
  },
  {
    id: 'content',
    label: 'Content',
    slugs: [
      'accordion',
      'avatar',
      'avatar-group',
      'badge',
      'card',
      'code-block',
      'data-table',
      'kbd',
      'markdown',
      'rolling-number',
      'separator',
      'sortable',
      'stats-card',
      'table',
    ],
  },
  {
    id: 'patterns',
    label: 'Patterns',
    slugs: ['auth-forms', 'settings-forms'],
  },
];

/** The page order: the groups, one after another */
export const COMPONENT_PAGE_ORDER: readonly string[] = COMPONENT_GROUPS.flatMap((group) => group.slugs);

/** The group a page is in */
export const componentGroupOf = (slug: string): ComponentGroup | undefined =>
  COMPONENT_GROUPS.find((group) => group.slugs.includes(slug));
