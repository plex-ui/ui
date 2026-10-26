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
  accordion: ['tabs', 'card', 'sidebar'],
  alert: ['toast', 'badge', 'empty-message', 'indicators'],
  avatar: ['avatar-group', 'badge', 'card'],
  'avatar-group': ['avatar', 'badge', 'card'],
  badge: ['alert', 'avatar', 'shimmer-text', 'indicators'],
  button: ['button-group', 'button-link', 'badge'],
  'button-group': ['button', 'menu', 'tabs'],
  'button-link': ['button', 'text-link', 'button-group'],
  card: ['stat-card', 'empty-message', 'accordion'],
  checkbox: ['radio-group', 'switch', 'field', 'label'],
  'code-block': ['markdown', 'markdown-editor', 'copy-tooltip'],
  'copy-tooltip': ['tooltip', 'code-block', 'button'],
  'date-input': ['date-picker', 'date-range-picker', 'input'],
  'date-picker': ['date-input', 'date-range-picker', 'select'],
  'date-range-picker': ['date-picker', 'date-input', 'select'],
  dialog: ['popover', 'menu', 'tooltip', 'toast'],
  'empty-message': ['alert', 'card', 'indicators', 'shimmer-text'],
  field: ['label', 'input', 'textarea', 'floating-label-input'],
  'file-upload': ['input', 'field', 'progress', 'button'],
  'floating-label-input': ['input', 'field', 'textarea'],
  indicators: ['progress', 'progress-steps', 'shimmer-text', 'skeleton'],
  input: ['field', 'floating-label-input', 'textarea', 'otp-input'],
  'input-group': ['input', 'button-group', 'menu', 'textarea'],
  label: ['field', 'input', 'checkbox'],
  markdown: ['markdown-editor', 'code-block', 'text-link'],
  'markdown-editor': ['markdown', 'code-block', 'textarea'],
  menu: ['popover', 'button-group', 'sidebar', 'dialog'],
  'otp-input': ['input', 'field', 'tag-input'],
  popover: ['tooltip', 'menu', 'dialog'],
  progress: ['progress-steps', 'indicators', 'skeleton', 'shimmer-text'],
  'progress-steps': ['progress', 'indicators', 'tabs'],
  'radio-group': ['checkbox', 'switch', 'select', 'field'],
  select: ['select-control', 'radio-group', 'checkbox', 'tag-input'],
  'select-control': ['select', 'tabs', 'button-group'],
  separator: ['card', 'menu', 'sidebar'],
  'shimmer-text': ['skeleton', 'badge', 'indicators'],
  sidebar: ['menu', 'tabs', 'accordion'],
  skeleton: ['shimmer-text', 'progress', 'indicators'],
  slider: ['input', 'progress', 'select'],
  'stat-card': ['card', 'badge', 'progress'],
  switch: ['checkbox', 'radio-group', 'field'],
  table: ['stat-card', 'card', 'tabs'],
  tabs: ['accordion', 'sidebar', 'button-group', 'select-control'],
  'tag-input': ['input', 'select', 'otp-input'],
  textarea: ['input', 'field', 'markdown-editor', 'floating-label-input'],
  'text-link': ['button-link', 'markdown', 'button'],
  toast: ['alert', 'dialog', 'badge'],
  tooltip: ['popover', 'copy-tooltip', 'dialog'],
};

/** Returns up to `n` related slugs for a component, or empty if none mapped. */
export function getRelatedComponents(slug: string, n = 4): string[] {
  const related = RELATED_COMPONENTS[slug];
  return related ? related.slice(0, n) : [];
}
