'use client';

import { useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { InfoCircle, Plus } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import { nextVariantId, variantNameError, type ProductVariant } from './productVariantData';
import styles from './FormRowsDemos.module.css';

export type { ProductVariant } from './productVariantData';

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

  return <>
    <Field row fill className="max-md:[--field-row-action-size:44px] max-md:[--button-size-md:44px]" label="Variants"
      labelAction={wide ? <Tooltip content="Sizes and finishes a buyer can choose."><InfoCircle className="text-tertiary" /></Tooltip> : undefined}
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
    <Dialog open={open} onOpenChange={(next) => { if (!next) cancel(); }}>
      <Dialog.Content mobileVariant="sheet" surface="grouped" className={`${styles.TagEditor}${nested ? ` ${styles.TagEditorNested}` : ''}`}
        onOpenAutoFocus={(event) => { event.preventDefault(); focusName(); }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const doc = ownerDocument.current;
          const target = doc?.getElementById(sourceId.current) ?? doc?.getElementById(restoreId.current) ?? doc?.getElementById(addId);
          if (!doc || !target?.isConnected) return;
          // Preserve focus intentionally moved outside while the dialog exits.
          const active = doc.activeElement;
          if (active && active !== doc.body && active !== target && active.isConnected) return;
          target.focus({ preventScroll: true });
        }}>
        <Dialog.Header>
          <Dialog.Title>{editingId ? 'Edit variant' : 'Add variant'}</Dialog.Title>
          <Dialog.Description>A size, finish, or combination a buyer can choose.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <form ref={form} id={formId} noValidate onSubmit={save} className="flex flex-col gap-6">
            <FieldGroup>
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
    </Dialog>
  </>;
}
