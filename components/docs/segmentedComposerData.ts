import { DateTime } from 'luxon';

export type ComposerMode = 'event' | 'reminder';
export type ComposerDraft = {
  title: string;
  notes: string;
  location: string;
  date: string | null;
  /** The event's end; a reminder has none. */
  end: string | null;
  includeTime: boolean;
  allDay: boolean;
  repeat: string;
  urgent: boolean;
};
export type ComposerDrafts = Record<ComposerMode, ComposerDraft>;

/** Calendar's Repeat menu, its Custom item left out because it opens a screen of its own. */
export const COMPOSER_REPEATS = [
  { value: 'never', label: 'Never' },
  { value: 'day', label: 'Every Day' },
  { value: 'week', label: 'Every Week' },
  { value: 'two-weeks', label: 'Every 2 Weeks' },
  { value: 'month', label: 'Every Month' },
  { value: 'year', label: 'Every Year' },
];

/** Fixed local sample dates keep server and browser examples deterministic. */
export const createComposerDrafts = (): ComposerDrafts => ({
  event: { title: '', notes: '', location: '', date: '2026-11-12T09:00', end: '2026-11-12T10:00', includeTime: true, allDay: false, repeat: 'never', urgent: false },
  reminder: { title: '', notes: '', location: '', date: '2026-11-12T09:00', end: null, includeTime: true, allDay: false, repeat: 'never', urgent: false },
});
export const cloneComposerDrafts = (value: ComposerDrafts): ComposerDrafts => ({
  event: { ...value.event },
  reminder: { ...value.reminder },
});
export const composerModeLabel = (mode: ComposerMode) => mode === 'event' ? 'Event' : 'Reminder';

const TIME_FORMAT = 'HH:mm';
const parse = (value: string | null) => value ? DateTime.fromISO(value) : null;

/** An all-day edit picks a date alone: keep the time it had, for when All-day is turned off again. */
const withTimeOf = (date: DateTime, time: DateTime | null) =>
  time ? date.set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 }) : date;

/** Calendar moves the end with the start, so the event keeps its length: its hours, or all day its days. */
export const moveComposerStart = (draft: ComposerDraft, next: DateTime | null): Pick<ComposerDraft, 'date' | 'end'> => {
  const start = parse(draft.date);
  const end = parse(draft.end);
  if (!next) return { date: null, end: draft.end };
  if (draft.allDay) {
    const moved = withTimeOf(next, start);
    if (!start || !end) return { date: moved.toISO(), end: draft.end };
    const days = Math.round(end.startOf('day').diff(start.startOf('day'), 'days').days);
    return { date: moved.toISO(), end: withTimeOf(moved.startOf('day').plus({ days }), end).toISO() };
  }
  const length = start && end ? end.diff(start) : null;
  return { date: next.toISO(), end: length ? next.plus(length).toISO() : draft.end };
};

/** The end as picked; all day, its date with the time it had. */
export const moveComposerEnd = (draft: ComposerDraft, next: DateTime | null) =>
  next ? (draft.allDay ? withTimeOf(next, parse(draft.end)) : next).toISO() : null;

/** An end before the start: Calendar strikes it through and will not save. All-day events compare days. */
export const composerEndBeforeStart = (draft: ComposerDraft) => {
  const start = parse(draft.date);
  const end = parse(draft.end);
  if (!start || !end) return false;
  return draft.allDay ? end.startOf('day') < start.startOf('day') : end < start;
};

/** The collapsed summary's end: the hours of the event, or All-day; another day adds its date. */
export const composerSummaryHours = (draft: ComposerDraft) => {
  const start = parse(draft.date);
  const end = parse(draft.end);
  if (!start) return '';
  if (draft.allDay) return 'All-day';
  if (!end) return start.toFormat(TIME_FORMAT);
  const endText = end.hasSame(start, 'day') ? end.toFormat(TIME_FORMAT) : end.toFormat(`MMM d, ${TIME_FORMAT}`);
  return `${start.toFormat(TIME_FORMAT)} – ${endText}`;
};
