export type ComposerMode = 'event' | 'reminder';
export type ComposerDraft = {
  title: string;
  notes: string;
  location: string;
  date: string | null;
  includeTime: boolean;
  urgent: boolean;
};
export type ComposerDrafts = Record<ComposerMode, ComposerDraft>;

/** Fixed local sample dates keep server and browser examples deterministic. */
export const createComposerDrafts = (): ComposerDrafts => ({
  event: { title: '', notes: '', location: '', date: '2026-11-12T09:00', includeTime: true, urgent: false },
  reminder: { title: '', notes: '', location: '', date: '2026-11-12T09:00', includeTime: true, urgent: false },
});
export const cloneComposerDrafts = (value: ComposerDrafts): ComposerDrafts => ({
  event: { ...value.event },
  reminder: { ...value.reminder },
});
export const composerModeLabel = (mode: ComposerMode) => mode === 'event' ? 'Event' : 'Reminder';
