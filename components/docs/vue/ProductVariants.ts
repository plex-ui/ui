import { defineComponent, h, ref, useId, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { InfoCircle, Plus } from '@plexui/vue/components/Icon';
import { Input } from '@plexui/vue/components/Input';
import { Tooltip } from '@plexui/vue/components/Tooltip';
import { nextVariantId, variantNameError, type ProductVariant } from '../productVariantData';
import styles from '../FormRowsDemos.module.css';

export type { ProductVariant } from '../productVariantData';

export const ProductVariants = defineComponent({
  name: 'ProductVariants',
  props: {
    modelValue: { type: Array as PropType<ProductVariant[]>, required: true },
    wide: { type: Boolean, required: true },
  },
  emits: { 'update:modelValue': (value: ProductVariant[]) => Array.isArray(value) },
  setup(props, { emit }) {
    const id = useId();
    const addId = `variant-add-${id}`;
    const formId = `variant-form-${id}`;
    const editId = (variant: string) => `variant-edit-${id}-${variant}`;
    const open = ref(false);
    const nested = ref(false);
    const editingId = ref<string | null>(null);
    const name = ref('');
    const error = ref('');
    const form = ref<HTMLFormElement | null>(null);
    let restoreId = addId;
    let sourceId = addId;
    let ownerDocument: Document | null = null;
    const focusName = () => form.value?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    const show = (event: MouseEvent, variant?: ProductVariant) => {
      const trigger = event.currentTarget;
      if (!(trigger instanceof HTMLButtonElement)) return;
      ownerDocument = trigger.ownerDocument;
      restoreId = trigger.id;
      sourceId = trigger.id;
      nested.value = Boolean(trigger.closest('[data-plex-dialog][data-mobile-variant="sheet"][data-mobile-placement="bottom"]'));
      editingId.value = variant?.id ?? null;
      name.value = variant?.name ?? '';
      error.value = '';
      open.value = true;
    };
    const cancel = () => { open.value = false; };
    const save = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const message = variantNameError(props.modelValue, name.value, editingId.value);
      if (message) { error.value = message; focusName(); return; }
      const next = { id: editingId.value ?? nextVariantId(props.modelValue), name: name.value.trim() };
      emit('update:modelValue', editingId.value
        ? props.modelValue.map((variant) => variant.id === editingId.value ? next : variant)
        : [...props.modelValue, next]);
      open.value = false;
    };
    const remove = () => {
      const index = props.modelValue.findIndex((variant) => variant.id === editingId.value);
      if (index < 0) { cancel(); return; }
      const neighbor = props.modelValue[index + 1] ?? props.modelValue[index - 1];
      restoreId = neighbor ? editId(neighbor.id) : addId;
      emit('update:modelValue', props.modelValue.filter((variant) => variant.id !== editingId.value));
      open.value = false;
    };
    const rowClass = 'max-md:[--field-row-action-size:44px] max-md:[--button-size-md:44px]';
    return () => [
      h(Field, { row: true, fill: true, class: rowClass, label: 'Variants' }, {
        default: () => h('div'),
        ...(props.wide ? { labelAction: () => h(Tooltip, { content: 'Sizes and finishes a buyer can choose.' }, () => h(InfoCircle, { class: 'text-tertiary' })) } : {}),
        action: () => h(Tooltip, { content: props.wide ? 'Add variant' : null }, () => h(Button, {
          id: addId, type: 'button', uniform: props.wide, pill: true, color: props.wide ? 'secondary' : 'info', variant: props.wide ? 'soft' : 'ghost',
          'aria-label': 'Add variant', 'aria-haspopup': 'dialog', 'aria-expanded': open.value && editingId.value === null,
          onClick: (event: MouseEvent) => show(event),
        }, () => props.wide ? h(Plus) : 'Add')),
      }),
      ...props.modelValue.map((variant) => h(Field, { key: variant.id, row: true, fill: true, class: rowClass, label: variant.name }, {
        default: () => h('div'),
        action: () => h(Button, {
          id: editId(variant.id), type: 'button', color: 'info', variant: 'ghost', 'aria-label': `Edit ${variant.name}`,
          'aria-haspopup': 'dialog', 'aria-expanded': open.value && editingId.value === variant.id,
          onClick: (event: MouseEvent) => show(event, variant),
        }, () => 'Edit'),
      })),
      h(Dialog, { open: open.value, 'onUpdate:open': (next: boolean) => { if (!next) cancel(); } }, () => h(DialogContent, {
        mobileVariant: 'sheet', surface: 'grouped', class: [styles.TagEditor, nested.value && styles.TagEditorNested],
        onOpenAutoFocus: (event: Event) => { event.preventDefault(); focusName(); },
        onCloseAutoFocus: (event: Event) => {
          event.preventDefault();
          const target = ownerDocument?.getElementById(sourceId) ?? ownerDocument?.getElementById(restoreId) ?? ownerDocument?.getElementById(addId);
          if (!ownerDocument || !target?.isConnected) return;
          const active = ownerDocument.activeElement;
          if (active && active !== ownerDocument.body && active !== target && active.isConnected) return;
          target.focus({ preventScroll: true });
        },
      }, () => [
        h(DialogHeader, null, () => [
          h(DialogTitle, null, () => editingId.value ? 'Edit variant' : 'Add variant'),
          h(DialogDescription, { class: 'sr-only' }, () => 'A size, finish, or combination a buyer can choose.'),
        ]),
        h(DialogBody, null, () => h('form', { ref: form, id: formId, noValidate: true, onSubmit: save, class: 'flex flex-col gap-6 [--field-group-gap:13px]' }, [
          // What a variant is explains the group, so it is the group's footer (iOS 26 kit Lists), not a line under the title.
          h(FieldGroup, null, {
            default: () => h(Field, { row: true, orientation: 'vertical', label: 'Variant name', errorMessage: error.value || undefined }, () => h(Input, {
              variant: 'ghost', value: name.value, autoComplete: 'off', placeholder: 'For example, Small / natural',
              'onUpdate:value': (next: string) => { name.value = next; error.value = ''; },
            })),
            footer: () => 'A size, finish, or combination a buyer can choose.',
          }),
          editingId.value && h(Button, { type: 'button', color: 'danger', variant: 'ghost', onClick: remove }, () => 'Remove variant'),
        ])),
        h(DialogFooter, null, () => [
          h(Button, { type: 'button', color: 'secondary', variant: 'soft', onClick: cancel }, () => 'Cancel'),
          h(Button, { type: 'submit', form: formId, color: 'primary' }, () => 'Save variant'),
        ]),
      ])),
    ];
  },
});
