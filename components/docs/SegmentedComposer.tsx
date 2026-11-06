'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';
import { Textarea } from '@plexui/ui/components/Textarea';
import { cloneComposerDrafts, composerModeLabel, createComposerDrafts, type ComposerDraft, type ComposerMode } from './segmentedComposerData';
import s from './SegmentedComposer.module.css';

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
  const draft = drafts[mode];
  const label = composerModeLabel(mode);
  const update = <Key extends keyof ComposerDraft>(key: Key, value: ComposerDraft[Key]) =>
    setDrafts((current) => ({ ...current, [mode]: { ...current[mode], [key]: value } }));
  const cancel = () => {
    setDrafts(cloneComposerDrafts(saved.current));
    setStatus('Changes canceled.');
    setOpen(false);
  };
  const changeOpen = (next: boolean) => {
    if (!next) { cancel(); return; }
    setDrafts(cloneComposerDrafts(saved.current));
    setStatus('');
    setOpen(true);
  };
  const changeMode = (next: ComposerMode) => { setMode(next); setStatus(''); };
  const confirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draft.title.trim()) return;
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
                disabled={!draft.title.trim()} aria-label={`Save ${mode}`} />
            </Dialog.HeaderAction>
          </Dialog.Header>
          <Dialog.Body className={s.Body}>
            <form id={formId} className={s.Form} onSubmit={confirm}>
              <FieldGroup aria-label={`${label} details`}>
                <Field row orientation="vertical" label={`${label} title`}>
                  <Input variant="ghost" value={draft.title} placeholder={`Name this ${mode}`} onChange={(event) => update('title', event.target.value)} />
                </Field>
                <Field row orientation="vertical" label="Notes">
                  <Textarea variant="ghost" rows={2} autoResize value={draft.notes} placeholder="Add notes" onChange={(event) => update('notes', event.target.value)} />
                </Field>
              </FieldGroup>
              {mode === 'event' ? (
                  <FieldGroup title="Date and location">
                    <Field row label="Starts">
                      <DatePicker value={draft.date ? DateTime.fromISO(draft.date) : null}
                        onChange={(next) => update('date', next?.toISO() ?? null)} showTime
                        variant="ghost" pill={false} triggerShowIcon={false} aria-label="Event start" />
                    </Field>
                    <Field row orientation="vertical" label="Location">
                      <Input variant="ghost" value={draft.location} placeholder="Add a place or video link" onChange={(event) => update('location', event.target.value)} />
                    </Field>
                  </FieldGroup>
              ) : (
                <FieldGroup title="Date and time" footer="Use the urgent flag for a reminder that needs attention.">
                  <Field row label="Due">
                    <DatePicker value={draft.date ? DateTime.fromISO(draft.date) : null}
                      onChange={(next) => update('date', next?.toISO() ?? null)} showTime={draft.includeTime}
                      variant="ghost" pill={false} triggerShowIcon={false} aria-label="Reminder due date" />
                  </Field>
                  <Field row label="Time"><Switch color="accent" checked={draft.includeTime} onCheckedChange={(next) => update('includeTime', next)} /></Field>
                  <Field row label="Urgent"><Switch color="accent" checked={draft.urgent} onCheckedChange={(next) => update('urgent', next)} /></Field>
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
