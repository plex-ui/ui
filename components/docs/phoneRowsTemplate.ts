// Plain module (no 'use client'), so MDX pages can call these while rendering on the server.

/** A compact slice of a grouped settings screen at the phone's width; it fills the preview's height. */
export const phoneRowsClassName = 'flex w-full grow flex-col gap-6 bg-[var(--mobile-surface-grouped-primary)] px-4 py-6 [--field-group-background:var(--mobile-surface-grouped-secondary)]';

/** A Vue template of phone rows on the grouped surface, the same wrapper as the React `PhoneRows`. */
export function phoneRows(rows: string) {
  return `<div data-phone-rows class="${phoneRowsClassName}">
${rows}
</div>`;
}

/** The code of an example that has a desktop and a phone form, in Vue comments. */
export function withPhone(desktop: string, phone: string, note?: string) {
  return `<!-- Desktop -->
${desktop}

<!-- Phone${note ? `: ${note}` : ''} -->
${phone}`;
}
