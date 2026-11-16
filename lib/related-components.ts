/**
 * "Related components" map driving the card row that renders at the
 * bottom of every `/components/<slug>` page.
 *
 * Hand-curated rather than category-derived: a Button is meaningfully
 * related to ButtonGroup and Badge but not to Slider, even though
 * all three are technically "form controls". The map only encodes
 * pairings worth surfacing — components without natural neighbours
 * (e.g. Separator) just don't get a Related block.
 *
 * Each entry's value is an ordered list of slugs (most-related first,
 * 3–5 entries). The slug must match the URL segment under
 * `/components/<slug>`. Update this when adding a new component or
 * removing one.
 */
export const RELATED_COMPONENTS: Record<string, string[]> = {
  accordion: ['segmented-control', 'card', 'sidebar'],
  alert: ['toast', 'badge', 'empty-message', 'indicators'],
  avatar: ['avatar-group', 'badge', 'card'],
  'avatar-group': ['avatar', 'badge', 'card'],
  badge: ['alert', 'avatar', 'shimmer-text', 'indicators'],
  breadcrumb: ['sidebar', 'segmented-control', 'text-link'],
  button: ['button-group', 'text-link', 'badge'],
  'button-group': ['button', 'menu', 'segmented-control'],
  card: ['stats-card', 'empty-message', 'accordion'],
  checkbox: ['radio-group', 'switch', 'field'],
  'code-block': ['markdown', 'markdown-editor', 'tooltip'],
  // Menu, Context Menu, Select and Select Control are one iOS menu opened three ways (MenuFamilyNote): each links the others
  'context-menu': ['menu', 'select', 'popover'],
  'date-input': ['date-picker', 'date-range-picker', 'input'],
  'date-picker': ['date-input', 'date-range-picker', 'select'],
  'date-range-picker': ['date-picker', 'date-input', 'select'],
  dialog: ['popover', 'menu', 'tooltip', 'toast'],
  'empty-message': ['alert', 'card', 'indicators', 'shimmer-text'],
  field: ['input', 'textarea', 'floating-label-input'],
  'file-upload': ['input', 'field', 'progress', 'button'],
  'floating-label-input': ['input', 'field', 'textarea'],
  indicators: ['progress', 'progress-steps', 'shimmer-text', 'skeleton'],
  input: ['field', 'floating-label-input', 'textarea', 'otp-input'],
  'input-group': ['input', 'button-group', 'menu', 'textarea'],
  kbd: ['tooltip', 'menu', 'button'],
  markdown: ['markdown-editor', 'code-block', 'text-link'],
  'markdown-editor': ['markdown', 'code-block', 'textarea'],
  menu: ['context-menu', 'select', 'popover'],
  'otp-input': ['input', 'field', 'tag-input'],
  page: ['sidebar', 'card', 'segmented-control'],
  popover: ['tooltip', 'menu', 'dialog'],
  progress: ['progress-steps', 'indicators', 'skeleton', 'shimmer-text'],
  'progress-steps': ['progress', 'indicators', 'segmented-control'],
  'radio-group': ['checkbox', 'switch', 'select', 'field'],
  select: ['menu', 'context-menu', 'radio-group'],
  separator: ['card', 'menu', 'sidebar'],
  'shimmer-text': ['skeleton', 'badge', 'indicators'],
  sidebar: ['page', 'menu', 'segmented-control', 'accordion'],
  skeleton: ['shimmer-text', 'progress', 'indicators'],
  slider: ['input', 'progress', 'select'],
  sortable: ['field', 'table', 'stats-card'],
  'stats-card': ['card', 'badge', 'progress'],
  switch: ['checkbox', 'radio-group', 'field'],
  table: ['data-table', 'stats-card', 'card'],
  'data-table': ['table', 'checkbox', 'input'],
  'segmented-control': ['accordion', 'sidebar', 'button-group', 'select'],
  'tag-input': ['input', 'select', 'otp-input'],
  textarea: ['input', 'field', 'markdown-editor', 'floating-label-input'],
  'text-link': ['button', 'markdown', 'breadcrumb'],
  toast: ['alert', 'dialog', 'badge'],
  tooltip: ['popover', 'dialog', 'kbd'],
};

/** Returns up to `n` related slugs for a component, or empty if none mapped. */
export function getRelatedComponents(slug: string, n = 4): string[] {
  const related = RELATED_COMPONENTS[slug];
  return related ? related.slice(0, n) : [];
}
