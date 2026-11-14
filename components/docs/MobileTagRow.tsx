'use client';

import { useRef, useState, type MouseEvent } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import styles from './FormRowsDemos.module.css';

export type MobileTagOption = {
  value: string;
  label: string;
  color?: 'discovery' | 'danger' | 'warning';
};

/** The row shows committed values; the Sheet owns a draft until Apply. */
export function MobileTagRow({ label, one, options, onOptionsChange, value, onChange }: {
  label: string;
  one: string;
  options: MobileTagOption[];
  onOptionsChange: (options: MobileTagOption[]) => void;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  const [draftCatalog, setDraftCatalog] = useState<MobileTagOption[]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const heading = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLButtonElement>(null);
  const selectedLabels = value.map((selected) => options.find((option) => option.value === selected)?.label ?? selected);
  const selectedText = selectedLabels.join(', ');

  const show = (event: MouseEvent<HTMLButtonElement>) => {
    summary.current = event.currentTarget;
    setNested(Boolean(event.currentTarget.closest('[data-plex-dialog][data-mobile-variant="sheet"][data-mobile-placement="bottom"]')));
    setDraftCatalog([...options]);
    setDraft([...value]);
    setNewLabel('');
    setOpen(true);
  };
  const toggle = (selected: string) => {
    setDraft((current) => current.includes(selected)
      ? current.filter((item) => item !== selected)
      : [...current, selected]);
  };
  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    const duplicate = draftCatalog.find((option) => option.label.trim().toLowerCase() === label.toLowerCase());
    if (duplicate) {
      setDraft((current) => current.includes(duplicate.value) ? current : [...current, duplicate.value]);
    } else {
      let index = 1;
      while (draftCatalog.some((option) => option.value === `custom-${index}`) || draft.includes(`custom-${index}`)) index++;
      const option = { value: `custom-${index}`, label };
      setDraftCatalog((current) => [...current, option]);
      setDraft((current) => [...current, option.value]);
    }
    setNewLabel('');
  };
  const apply = () => {
    onOptionsChange(draftCatalog);
    onChange([...draft]);
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
              Select {label.toLowerCase()} or add a new {one}. Apply to save your changes.
            </Dialog.Description>
            <Dialog.HeaderAction>
              <NavigationButton action="confirm" aria-label={`Apply ${label.toLowerCase()}`} onClick={apply} />
            </Dialog.HeaderAction>
          </Dialog.Header>
          <Dialog.Body className="flex flex-col gap-6 [--field-group-gap:13px]">
            <FieldGroup aria-label={label} data-tag-options>
              {draftCatalog.map((option) => (
                <Field key={option.value} row label={option.label} data-tag-option>
                  <Checkbox variant="ghost" checked={draft.includes(option.value)} onCheckedChange={() => toggle(option.value)} />
                </Field>
              ))}
            </FieldGroup>
            <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); add(); }}>
              <FieldGroup>
                <Input className={styles.TagAddInput} variant="ghost" aria-label={`New ${one}`}
                  value={newLabel} onChange={(event) => setNewLabel(event.target.value)}
                  placeholder={`Add new ${one}…`} autoComplete="off" endAdornment={
                    <Button className={styles.TagAddAction} type="submit" color="info" variant="ghost" disabled={!newLabel.trim()}>Add</Button>
                  } />
              </FieldGroup>
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
