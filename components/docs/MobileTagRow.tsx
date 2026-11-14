'use client';

import { useRef, useState, type MouseEvent } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure, SearchSm } from '@plexui/ui/components/Icon';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { Input } from '@plexui/ui/components/Input';
import styles from './FormRowsDemos.module.css';

export type MobileTagOption = {
  value: string;
  label: string;
  color?: 'discovery' | 'danger' | 'warning';
};

/** The row shows committed values; the Sheet owns a draft until Apply. The sheet picks as iOS does from a row with a
 * chevron: a checkmark in the tint at the end of each row picked, Clear all as the list's own action, and the search in the
 * bar at the bottom, in reach of the thumb (owner 14.11). */
export function MobileTagRow({ label, one, options, value, onChange }: {
  label: string;
  one: string;
  options: MobileTagOption[];
  onOptionsChange?: (options: MobileTagOption[]) => void;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const heading = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLButtonElement>(null);
  const selectedLabels = value.map((selected) => options.find((option) => option.value === selected)?.label ?? selected);
  const selectedText = selectedLabels.join(', ');
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;

  const show = (event: MouseEvent<HTMLButtonElement>) => {
    summary.current = event.currentTarget;
    setNested(Boolean(event.currentTarget.closest('[data-plex-dialog][data-mobile-variant="sheet"][data-mobile-placement="bottom"]')));
    setDraft([...value]);
    setQuery('');
    setOpen(true);
  };
  const toggle = (selected: string) => {
    setDraft((current) => current.includes(selected)
      ? current.filter((item) => item !== selected)
      : [...current, selected]);
  };
  const apply = () => {
    onChange(options.filter((option) => draft.includes(option.value)).map((option) => option.value));
    setOpen(false);
  };

  return (
    <>
      <div data-row>
        <Button className={styles.TagSummary} data-tag-summary block color="secondary" variant="ghost"
          aria-label={selectedText ? `${label}: ${selectedText}` : label}
          aria-haspopup="dialog" aria-expanded={open} onClick={show}>
          <span data-tag-summary-content>
            <span data-tag-summary-text>
              <span data-tag-summary-label>{label}</span>
              <span data-tag-summary-value>
                {selectedText && <span data-tag-summary-count>{selectedText}</span>}
              </span>
            </span>
            <Disclosure aria-hidden="true" data-no-autosize="" data-row-disclosure="" />
          </span>
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Content mobileVariant="sheet" surface="grouped" className={`${styles.TagEditor}${nested ? ` ${styles.TagEditorNested}` : ''}`}
          onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (summary.current?.isConnected) summary.current.focus({ preventScroll: true });
          }}>
          <Dialog.Header>
            <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>{label}</Dialog.Title></div>
            <Dialog.Description className="sr-only">
              Select {label.toLowerCase()}, or search for one {one}. Apply to save your changes.
            </Dialog.Description>
            <Dialog.HeaderAction>
              <NavigationButton action="confirm" aria-label={`Apply ${label.toLowerCase()}`} onClick={apply} />
            </Dialog.HeaderAction>
          </Dialog.Header>
          <Dialog.Body className="flex flex-col gap-6 [--field-group-gap:11px]">
            {shown.length > 0 && <FieldGroup aria-label={label} data-tag-options>
              {shown.map((option) => (
                <Field key={option.value} row label={option.label} data-tag-option>
                  <Checkbox variant="ghost" checked={draft.includes(option.value)} onCheckedChange={() => toggle(option.value)} />
                </Field>
              ))}
            </FieldGroup>}
            {shown.length === 0 && <p className={styles.TagNoMatches}>No {label.toLowerCase()} match “{query.trim()}”.</p>}
            {draft.length > 0 && !needle && <FieldGroup>
              <div data-row><Button block color="info" variant="ghost" onClick={() => setDraft([])}>Clear all</Button></div>
            </FieldGroup>}
          </Dialog.Body>
          <Toolbar placement="bottom">
            <Toolbar.Content fill>
              <Input variant="soft" pill placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label.toLowerCase()}`}
                startAdornment={<SearchSm />} value={query} onChange={(event) => setQuery(event.target.value)} />
            </Toolbar.Content>
          </Toolbar>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
