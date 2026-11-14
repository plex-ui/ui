'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure, InfoCircle, Plus } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { nextVariantId, variantNameError, type ProductVariant } from './productVariantData';
import styles from './FormRowsDemos.module.css';

export type { ProductVariant } from './productVariantData';

const NOTE = 'Sizes and finishes a buyer can choose.';

/** A row that opens what it holds: its name, its values at the end, a chevron (as Materials). */
function DrillRow({ id, label, name, value, onClick, expanded }: {
  id: string; label: string; name?: string; value?: string; expanded: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return <div data-row>
    <Button id={id} className={styles.TagSummary} data-tag-summary block color="secondary" variant="ghost"
      aria-label={name ?? (value ? `${label}: ${value}` : label)} aria-haspopup="dialog" aria-expanded={expanded} onClick={onClick}>
      <span data-tag-summary-content>
        <span data-tag-summary-text>
          <span data-tag-summary-label>{label}</span>
          <span data-tag-summary-value>{value && <span data-tag-summary-count>{value}</span>}</span>
        </span>
        <Disclosure aria-hidden="true" data-no-autosize="" data-row-disclosure="" />
      </span>
    </Button>
  </div>;
}

/** The parent owns saved choices; the editor owns one disposable name draft. */
export function ProductVariants({ value, onChange, wide }: {
  value: ProductVariant[];
  onChange: (value: ProductVariant[]) => void;
  wide: boolean;
}) {
  const id = useId();
  const addId = `variant-add-${id}`;
  const formId = `variant-form-${id}`;
  const editId = (variant: string) => `variant-edit-${id}-${variant}`;
  const listId = `variant-list-${id}`;
  const [listOpen, setListOpen] = useState(false);
  useEffect(() => { if (wide) setListOpen(false); }, [wide]);
  const listHeading = useRef<HTMLDivElement>(null);
  const listTrigger = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const restoreId = useRef(addId);
  const sourceId = useRef(addId);
  const ownerDocument = useRef<Document | null>(null);
  const focusName = () => form.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  const show = (event: MouseEvent<HTMLButtonElement>, variant?: ProductVariant) => {
    const trigger = event.currentTarget;
    ownerDocument.current = trigger.ownerDocument;
    restoreId.current = trigger.id;
    sourceId.current = trigger.id;
    setNested(Boolean(trigger.closest('[data-plex-dialog][data-mobile-variant="sheet"][data-mobile-placement="bottom"]')));
    setEditingId(variant?.id ?? null);
    setName(variant?.name ?? '');
    setError('');
    setOpen(true);
  };
  const cancel = () => { setOpen(false); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const message = variantNameError(value, name, editingId);
    if (message) { setError(message); focusName(); return; }
    const next = { id: editingId ?? nextVariantId(value), name: name.trim() };
    onChange(editingId ? value.map((variant) => variant.id === editingId ? next : variant) : [...value, next]);
    setOpen(false);
  };
  const remove = () => {
    const index = value.findIndex((variant) => variant.id === editingId);
    if (index < 0) { cancel(); return; }
    const neighbor = value[index + 1] ?? value[index - 1];
    restoreId.current = neighbor ? editId(neighbor.id) : addId;
    onChange(value.filter((variant) => variant.id !== editingId));
    setOpen(false);
  };

  const editor = <Dialog open={open} onOpenChange={(next) => { if (!next) cancel(); }}>
      <Dialog.Content mobileVariant="sheet" surface="grouped" className={`${styles.TagEditor}${nested ? ` ${styles.TagEditorNested}` : ''}`}
        onOpenAutoFocus={(event) => { event.preventDefault(); focusName(); }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const doc = ownerDocument.current;
          // The phone's Variants row last: an editor opened on a desktop and closed on a phone has its rows in the closed list.
          const target = doc?.getElementById(sourceId.current) ?? doc?.getElementById(restoreId.current) ?? doc?.getElementById(addId) ?? doc?.getElementById(listId);
          if (!doc || !target?.isConnected) return;
          // Preserve focus intentionally moved outside while the dialog exits.
          const active = doc.activeElement;
          if (active && active !== doc.body && active !== target && active.isConnected) return;
          target.focus({ preventScroll: true });
        }}>
        <Dialog.Header>
          <Dialog.Title>{editingId ? 'Edit variant' : 'Add variant'}</Dialog.Title>
          <Dialog.Description className="sr-only">A size, finish, or combination a buyer can choose.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <form ref={form} id={formId} noValidate onSubmit={save} className="flex flex-col gap-6 [--field-group-gap:11px]">
            {/* What a variant is explains the group, so it is the group's footer (iOS 26 kit Lists), not a line under the title. */}
            <FieldGroup footer="A size, finish, or combination a buyer can choose.">
              <Field row orientation="vertical" label="Variant name" errorMessage={error || undefined}>
                <Input variant="ghost" value={name} autoComplete="off" placeholder="For example, Small / natural"
                  onChange={(event) => { setName(event.target.value); setError(''); }} />
              </Field>
            </FieldGroup>
            {editingId && <Button type="button" color="danger" variant="ghost" onClick={remove}>Remove variant</Button>}
          </form>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" color="secondary" variant="soft" onClick={cancel}>Cancel</Button>
          <Button type="submit" form={formId} color="primary">Save variant</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>;

  // The list stands first and the editor second in both layouts, so neither remounts when the layout switches (an
  // editor that stays open keeps its place over the list); a desktop has no list, so it closes there.
  const list = (
    <Dialog open={listOpen && !wide} onOpenChange={setListOpen}>
      <Dialog.Content mobileVariant="sheet" surface="grouped" className={styles.TagEditor}
        onOpenAutoFocus={(event) => { event.preventDefault(); listHeading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = listTrigger.current;
            if (!trigger?.isConnected) return;
            // Preserve focus intentionally moved outside while the list exits (Codex #64)
            const active = trigger.ownerDocument.activeElement;
            if (active && active !== trigger.ownerDocument.body && active !== trigger && active.isConnected) return;
            trigger.focus({ preventScroll: true });
          }}>
        <Dialog.Header>
          <div ref={listHeading} tabIndex={-1} className="outline-none"><Dialog.Title>Variants</Dialog.Title></div>
          <Dialog.Description className="sr-only">{NOTE}</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body className="flex flex-col gap-6 [--field-group-gap:11px]">
          <FieldGroup aria-label="Variants" footer={NOTE}>
            {value.map((variant) => <DrillRow key={variant.id} id={editId(variant.id)} label={variant.name} name={`Edit ${variant.name}`}
              expanded={open && editingId === variant.id} onClick={(event) => show(event, variant)} />)}
            <div data-row><Button id={addId} type="button" block color="info" variant="ghost" aria-haspopup="dialog"
              aria-expanded={open && editingId === null} onClick={(event) => show(event)}>Add variant</Button></div>
          </FieldGroup>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );

  // On a phone Variants is a row with a chevron, as Materials: the variants at its end, and their own screen behind it,
  // where a variant row opens the variant and Add variant is a row of words in the tint under them. What variants are
  // stands on that screen, as its footer.
  if (!wide) return <>
    {list}
    {editor}
    <DrillRow id={listId} label="Variants" value={value.map((variant) => variant.name).join(', ')} expanded={listOpen}
      onClick={(event) => { listTrigger.current = event.currentTarget; setListOpen(true); }} />
  </>;

  return <>
    {list}
    {editor}
    <Field row fill className="max-md:[--field-row-action-size:44px] max-md:[--button-size-md:44px]" label="Variants"
      labelAction={wide ? <Tooltip content={NOTE}><InfoCircle className="text-tertiary" /></Tooltip> : undefined}
      action={<Tooltip content={wide ? 'Add variant' : null}>
        <Button id={addId} type="button" uniform={wide} pill color={wide ? 'secondary' : 'info'} variant={wide ? 'soft' : 'ghost'}
          aria-label="Add variant" aria-haspopup="dialog" aria-expanded={open && editingId === null} onClick={(event) => show(event)}>
          {wide ? <Plus /> : 'Add'}
        </Button>
      </Tooltip>}><div /></Field>
    {value.map((variant) => <Field key={variant.id} row fill label={variant.name}
      className="max-md:[--field-row-action-size:44px] max-md:[--button-size-md:44px]"
      action={<Button id={editId(variant.id)} type="button" color="info" variant="ghost" aria-label={`Edit ${variant.name}`}
        aria-haspopup="dialog" aria-expanded={open && editingId === variant.id} onClick={(event) => show(event, variant)}>Edit</Button>}><div /></Field>)}
  </>;
}
