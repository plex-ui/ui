// Plain module (no 'use client'), so MDX pages can call these while rendering on the server.

/** A compact slice of a grouped settings screen at the phone's width; it fills the preview's height. */
export const phoneRowsClassName = 'flex w-full grow flex-col gap-6 bg-[var(--mobile-surface-grouped-primary)] px-4 py-6 [--field-group-background:var(--mobile-surface-grouped-secondary)]';

/** A phone stage whose row opens our calendar keeps room for its tallest, six-week month under the first row, on the
 * same grouped surface, so opening the calendar neither grows the preview nor shows another background. At 402×812 a
 * six-week month ends 471px below the top of the rows (DatePicker; 465px for DateRangePicker) and 523px with the time
 * list; each reserve leaves 16px under it. */
export const phoneCalendarStageClassName = 'flex w-full min-h-[488px] flex-col';
export const phoneCalendarTimeStageClassName = 'flex w-full min-h-[540px] flex-col';
/** The same room for a DateRangePicker in the second row, one 52px row lower: 517px and 16px under it. */
export const phoneCalendarSecondRowStageClassName = 'flex w-full min-h-[533px] flex-col';

/** A section of an iOS inset grouped list on a phone screen, the shape and fill of a FieldGroup, with row insets. */
export const phoneSectionClassName = 'rounded-[var(--field-group-radius)] bg-[var(--field-group-background)] px-4';

/** A Vue template as a phone screen, the same wrapper as the React `PhoneScreen`: a grouped Page, and with
 * `section` a section of an inset grouped list around the example. */
export function phoneScreen(template: string, { section = false }: { section?: boolean } = {}) {
  const content = section ? `<div class="${phoneSectionClassName}">${template}</div>` : template;
  return `<div data-demo-stage><Page surface="grouped" class="h-dvh"><PageContent>${content}</PageContent></Page></div>`;
}

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
