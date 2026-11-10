'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Bell, Calendar, Clock, PlusCircle } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { Switch } from '@plexui/ui/components/Switch';
import { Textarea } from '@plexui/ui/components/Textarea';
import {
  COMPOSER_REPEATS, cloneComposerDrafts, composerEndBeforeStart, composerModeLabel, composerSummaryHours, createComposerDrafts,
  moveComposerEnd, moveComposerStart, type ComposerDraft, type ComposerMode,
} from './segmentedComposerData';
import s from './SegmentedComposer.module.css';

const DAY_FORMAT = 'EEE, MMM d, yyyy';
const ROW_DAY_FORMAT = 'MMM d, yyyy';
const TIME_FORMAT = 'HH:mm';

/** Independent mode drafts; Confirm saves only the selected local sample. */
export function SegmentedComposer({ surface = 'grouped', pinnedOpen = false }: {
  surface?: 'plain' | 'grouped';
  /** Docs Phone previews remain open for inspection after Save and Cancel. */
  pinnedOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ComposerMode>('event');
  const saved = useRef(createComposerDrafts());
  const [drafts, setDrafts] = useState(createComposerDrafts);
  const [status, setStatus] = useState('');
  const heading = useRef<HTMLDivElement>(null);
  const formId = `composer-${useId()}`;
  const rowId = useId();
  const startId = `${rowId}-starts`;
  // Calendar shows a new event's time as one summary; a tap opens it into the rows that set it (IMG_5433, IMG_5641).
  const [timeOpen, setTimeOpen] = useState(false);
  const focusStart = useRef(false);
  const draft = drafts[mode];
  const start = draft.date ? DateTime.fromISO(draft.date) : null;
  const end = draft.end ? DateTime.fromISO(draft.end) : null;
  const endBeforeStart = mode === 'event' && composerEndBeforeStart(draft);
  const label = composerModeLabel(mode);
  const update = <Key extends keyof ComposerDraft>(key: Key, value: ComposerDraft[Key]) =>
    setDrafts((current) => ({ ...current, [mode]: { ...current[mode], [key]: value } }));
  const changeStart = (next: DateTime | null) =>
    setDrafts((current) => ({ ...current, [mode]: { ...current[mode], ...moveComposerStart(current[mode], next) } }));
  const openTime = () => { focusStart.current = true; setTimeOpen(true); };
  useEffect(() => {
    if (!timeOpen || !focusStart.current) return;
    focusStart.current = false;
    document.getElementById(startId)?.focus();
  }, [timeOpen, startId]);
  const cancel = () => {
    setDrafts(cloneComposerDrafts(saved.current));
    setStatus('Changes canceled.');
    setOpen(false);
  };
  const changeOpen = (next: boolean) => {
    if (!next) { cancel(); return; }
    setDrafts(cloneComposerDrafts(saved.current));
    setStatus('');
    setTimeOpen(false);
    setOpen(true);
  };
  const changeMode = (next: ComposerMode) => { setMode(next); setStatus(''); };
  const confirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draft.title.trim() || endBeforeStart) return;
    const committed = { ...draft, title: draft.title.trim() };
    saved.current = { ...saved.current, [mode]: committed };
    setDrafts((current) => ({ ...current, [mode]: committed }));
    setStatus(`${label} saved: ${committed.title}.`);
    setOpen(false);
  };

  return (
    <div data-demo-stage className={s.Stage}>
      <Dialog open={open || pinnedOpen} onOpenChange={changeOpen}>
        <Dialog.Trigger><Button color="primary" pill>Create item</Button></Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" surface={surface} width={560} className={s.Composer}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (!pinnedOpen) heading.current?.focus({ preventScroll: true });
          }}>
          <Dialog.Header className={s.Header}>
            <div ref={heading} tabIndex={-1} className={s.HeaderCenter}>
              <Dialog.Title className="sr-only">New calendar item</Dialog.Title>
              <SegmentedControl value={mode} onChange={changeMode} aria-label="Item type" block pill className={s.Mode}>
                <SegmentedControl.Option value="event">Event</SegmentedControl.Option>
                <SegmentedControl.Option value="reminder">Reminder</SegmentedControl.Option>
              </SegmentedControl>
            </div>
            <Dialog.Description className="sr-only">Choose a type, edit its draft, then save the local sample. Cancel discards unsaved changes.</Dialog.Description>
            <Dialog.HeaderAction className={s.Confirm}>
              <NavigationButton action="confirm" type="submit" form={formId}
                disabled={!draft.title.trim() || endBeforeStart} aria-label={`Save ${mode}`} />
            </Dialog.HeaderAction>
          </Dialog.Header>
          <Dialog.Body className={s.Body}>
            <form id={formId} className={s.Form} onSubmit={confirm}>
              {/* Calendar's composer names its fields by their placeholders alone, each field its own capsule
                  (IMG_5433, IMG_5434). */}
              <div className={s.Capsules}>
                <FieldGroup aria-label={`${label} title`}>
                  <div data-row>
                    <Input variant="ghost" size="3xl" className={s.Text} aria-label={`${label} title`} value={draft.title}
                      placeholder="Title" onChange={(event) => update('title', event.target.value)} />
                  </div>
                </FieldGroup>
                {mode === 'event' ? (timeOpen ? (<>
                  {/* Starts and Ends: a date and a time, each its own capsule. Native's time capsule opens a wheel; until
                      PlexUI has one, either capsule opens the calendar with its time fields. All-day leaves the dates. */}
                  <FieldGroup aria-label="Date and time">
                    <Field row label="Starts" id={startId}>
                      <DatePicker value={start} onChange={changeStart} showTime={!draft.allDay} triggerDateFormat={ROW_DAY_FORMAT}
                        triggerTimeFormat={draft.allDay ? undefined : TIME_FORMAT} triggerShowIcon={false} />
                    </Field>
                    {/* An end before the start is struck through, as Calendar shows it, and Save waits for a later end. */}
                    <Field row label="Ends">
                      <DatePicker value={end} onChange={(next) => update('end', moveComposerEnd(draft, next))} showTime={!draft.allDay}
                        triggerDateFormat={ROW_DAY_FORMAT} triggerTimeFormat={draft.allDay ? undefined : TIME_FORMAT} triggerShowIcon={false}
                        triggerClassName={endBeforeStart ? s.Struck : undefined} aria-describedby={endBeforeStart ? `${rowId}-ends-early` : undefined} />
                    </Field>
                    <Field row label="All-day">
                      <Switch color="accent" checked={draft.allDay} onCheckedChange={(next) => update('allDay', next)} />
                    </Field>
                    <Field row label="Repeat">
                      <Select value={draft.repeat} options={COMPOSER_REPEATS} onChange={(option) => update('repeat', option.value)}
                        block={false} align="end" />
                    </Field>
                  </FieldGroup>
                  {endBeforeStart && <span id={`${rowId}-ends-early`} className="sr-only">The event ends before it starts.</span>}
                </>) : (
                  <FieldGroup aria-label="Date and time" bodyClassName={s.RowsBody}>
                    <div data-row>
                      {/* The summary: the day at the start, the hours at the end (IMG_5433). */}
                      <Button block color="primary" variant="ghost" size="3xl" pill={false} className={s.Summary}
                        aria-expanded={false} onClick={openTime}>
                        <span className={s.SummaryDay}>{start?.toFormat(DAY_FORMAT) ?? 'Date'}</span>
                        {/* Read as one phrase; out of the flow, so the day and the hours keep the row's two ends. */}
                        <span className="sr-only">, </span>
                        <span className={s.SummaryHours}>{composerSummaryHours(draft)}</span>
                      </Button>
                    </div>
                  </FieldGroup>
                )
                ) : (
                  <FieldGroup aria-label="Notes">
                    <div data-row>
                      <Textarea variant="ghost" rows={1} autoResize className={s.Text} aria-label="Notes" value={draft.notes}
                        placeholder="Notes" onChange={(event) => update('notes', event.target.value)} />
                    </div>
                  </FieldGroup>
                )}
              </div>
              {mode === 'event' ? (
                <>
                  <FieldGroup title="Location">
                    <div data-row>
                      <Input variant="ghost" size="3xl" className={s.Text} aria-label="Location" value={draft.location}
                        startAdornment={<PlusCircle className={s.Adornment} aria-hidden="true" />}
                        placeholder="Location or Video Call" onChange={(event) => update('location', event.target.value)} />
                    </div>
                  </FieldGroup>
                  <FieldGroup title="Details">
                    <div data-row>
                      <Textarea variant="ghost" rows={1} autoResize className={s.Text} aria-label="Notes" value={draft.notes}
                        placeholder="Notes" onChange={(event) => update('notes', event.target.value)} />
                    </div>
                  </FieldGroup>
                </>
              ) : (
                <FieldGroup title="Date & Time" footer="Mark this reminder as urgent to set an alarm." bodyClassName={s.RowsBody}>
                  {/* Each row: an icon, a title and, when set, its value under the title in the accent (IMG_5434). The
                      whole Date row opens the calendar; with Time on, the calendar's time fields set the hour. */}
                  <div data-row className={s.IconRow}>
                    <Calendar className={s.RowIcon} aria-hidden="true" />
                    <span id={`${rowId}-date`} className={s.RowTitle}>Date</span>
                    <DatePicker value={start} onChange={(next) => update('date', next?.toISO() ?? null)} showTime={draft.includeTime}
                      triggerDateFormat={DAY_FORMAT} variant="ghost" size="3xl" pill={false} block triggerShowIcon={false}
                      dropdownIconType="none" triggerClassName={s.RowTrigger} aria-labelledby={`${rowId}-date`} />
                  </div>
                  <div data-row className={s.IconRow}>
                    <Clock className={s.RowIcon} aria-hidden="true" />
                    <span className={s.RowText}>
                      <span id={`${rowId}-time`} className={s.RowTitle}>Time</span>
                      {draft.includeTime && start && <span id={`${rowId}-time-value`} className={s.Annotation}>{start.toFormat(TIME_FORMAT)}</span>}
                    </span>
                    <Switch color="accent" checked={draft.includeTime} onCheckedChange={(next) => update('includeTime', next)}
                      aria-labelledby={`${rowId}-time`} aria-describedby={draft.includeTime && start ? `${rowId}-time-value` : undefined} />
                  </div>
                  <div data-row className={s.IconRow}>
                    <Bell className={s.RowIcon} aria-hidden="true" />
                    <span className={s.RowText}><span id={`${rowId}-urgent`} className={s.RowTitle}>Urgent</span></span>
                    <Switch color="accent" checked={draft.urgent} onCheckedChange={(next) => update('urgent', next)} aria-labelledby={`${rowId}-urgent`} />
                  </div>
                </FieldGroup>
              )}
              {pinnedOpen && <p role="status" className={s.Status}>{status}</p>}
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
      {!pinnedOpen && <p role="status" className={s.Status}>{status}</p>}
    </div>
  );
}
