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

/** A slider's cell in an inset grouped list on a phone, as iOS Settings draws a named slider (Accessibility: Eye
 * Tracking, Smoothing; Zoom, Maximum Zoom Level): the group's title names the slider, the slider fills the cell
 * between the row insets, and a short value ends the cell 12px after it, in the secondary label at the row's type
 * (Smoothing on the owner's 430pt iPhone: a 51pt row, 12.7pt from the track to "52%"). Where it is used the value
 * takes the width of its widest text (`min-w-[…ch]`), so the track keeps its length while the value changes. */
export const sliderCellClassName = 'flex min-h-[var(--field-row-min-height)] items-center gap-3 px-[var(--field-row-padding-inline)]';
export const sliderCellValueClassName = 'shrink-0 text-end text-[length:var(--field-row-label-font-size)] leading-[var(--field-row-label-line-height)] tabular-nums';
/** The value ending the cell is a field: a tap brings up the number pad and the typed number moves the slider, in
 * place, as Keynote for iPhone takes a value "in the field next to the slider" (support.apple.com, Change object
 * transparency). It keeps the value's look; the unit stays text around the number, and a tap on it focuses the number. */
export const sliderCellValueFieldClassName = 'inline-flex items-center justify-end cursor-text';
export const sliderCellValueInputClassName = 'min-w-[1ch] border-0 bg-transparent p-0 text-end tabular-nums [color:inherit] [font:inherit] outline-none disabled:cursor-default';
/** A disabled value takes the tertiary label, as the label of a disabled row does (Field.module.css). */
export const sliderCellValueDisabledClassName = 'text-[var(--mobile-label-tertiary,var(--color-text-disabled))]';
/** A value too long to stand beside the track (a range, several thumbs), or marks, go under it in the same cell, as
 * iOS Settings writes "100%" under Siri's Speaking Rate (IMG_5779, 430pt iPhone: a 68pt cell, the track's centre
 * 22pt from its top, the value in Subheadline 15/20 of the primary label centred on a line from 44pt, 4pt under it).
 * The track then stands in the cell's first 44px instead of the slider's 52px row. */
export const sliderCellStackedClassName = 'flex flex-col px-[var(--field-row-padding-inline)] pb-1 [--slider-control-height:44px]';
export const sliderCellValueBelowClassName = 'text-center text-[length:var(--field-row-description-font-size)] leading-[var(--field-row-description-line-height)] tabular-nums';

/** A row that is a button: its label centred in the accent (`color="info"`, `variant="ghost"`, `block`), at the
 * row's height and type, as Settings puts "Reset Font Size to Default" in a group of its own under Hover Text's size
 * slider (owner 14.11, IMG_5940 at 430pt: a 53pt cell, 35pt under the slider's, 17pt text). FieldGroup gives a
 * full-row button its pressed surface and the group's corners; these set the Button's own size hooks. */
export const rowButtonClassName = '[--button-size-md:var(--field-row-min-height)] [--button-font-size-md:var(--field-row-label-font-size)] [--button-line-height-md:var(--field-row-label-line-height)] [--button-font-weight:var(--field-row-label-font-weight)] [--button-touch-radius:0px]';

/** A section of an iOS inset grouped list on a phone screen, the shape and fill of a FieldGroup, with row insets. */
export const phoneSectionClassName = 'rounded-[var(--field-group-radius)] bg-[var(--field-group-background)] px-[var(--mobile-list-inset,20px)]';

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
