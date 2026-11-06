import { computed, defineComponent, h, ref, type PropType } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { Checkbox } from '@plexui/vue/components/Checkbox';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogHeaderAction, DialogTitle } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Disclosure } from '@plexui/vue/components/Icon';
import { Input } from '@plexui/vue/components/Input';
import styles from '../FormRowsDemos.module.css';

export type MobileTagOption = {
  value: string;
  label: string;
  color?: 'discovery' | 'danger' | 'warning';
};

/** A Phone summary row whose Sheet edits a draft until Apply is pressed. */
export const MobileTagRow = defineComponent({
  name: 'MobileTagRow',
  props: {
    label: { type: String, required: true },
    one: { type: String, required: true },
    options: { type: Array as PropType<MobileTagOption[]>, required: true },
    modelValue: { type: Array as PropType<string[]>, required: true },
  },
  emits: {
    'update:options': (options: MobileTagOption[]) => Array.isArray(options),
    'update:modelValue': (value: string[]) => Array.isArray(value),
  },
  setup(props, { emit }) {
    const open = ref(false);
    const nested = ref(false);
    const draftCatalog = ref<MobileTagOption[]>([]);
    const draft = ref<string[]>([]);
    const newLabel = ref('');
    const heading = ref<HTMLElement | null>(null);
    let summary: HTMLButtonElement | null = null;
    const selectedText = computed(() => props.modelValue.map((selected) => props.options.find((option) => option.value === selected)?.label ?? selected).join(', '));

    const show = (event: MouseEvent) => {
      if (event.currentTarget instanceof HTMLButtonElement) {
        summary = event.currentTarget;
        nested.value = Boolean(summary.closest('[data-plex-dialog][data-mobile-variant="sheet"][data-mobile-placement="bottom"]'));
      }
      draftCatalog.value = props.options.map((option) => ({ ...option }));
      draft.value = [...props.modelValue];
      newLabel.value = '';
      open.value = true;
    };
    const toggle = (value: string) => {
      draft.value = draft.value.includes(value)
        ? draft.value.filter((item) => item !== value)
        : [...draft.value, value];
    };
    const add = () => {
      const label = newLabel.value.trim();
      if (!label) return;
      const duplicate = draftCatalog.value.find((option) => option.label.trim().toLowerCase() === label.toLowerCase());
      if (duplicate) {
        if (!draft.value.includes(duplicate.value)) draft.value = [...draft.value, duplicate.value];
      } else {
        let index = 1;
        while (draftCatalog.value.some((option) => option.value === `custom-${index}`) || draft.value.includes(`custom-${index}`)) index++;
        const option = { value: `custom-${index}`, label };
        draftCatalog.value = [...draftCatalog.value, option];
        draft.value = [...draft.value, option.value];
      }
      newLabel.value = '';
    };
    const apply = () => {
      emit('update:options', draftCatalog.value.map((option) => ({ ...option })));
      emit('update:modelValue', [...draft.value]);
      open.value = false;
    };

    return () => [
      h('div', { 'data-row': '' }, [h(Button, {
        color: 'secondary', variant: 'ghost', block: true,
        class: styles.TagSummary, 'data-tag-summary': '',
        'aria-label': selectedText.value ? `${props.label}: ${selectedText.value}` : props.label,
        'aria-haspopup': 'dialog', 'aria-expanded': open.value,
        onClick: show,
      }, () => h('span', { 'data-tag-summary-content': '' }, [
        h('span', { 'data-tag-summary-text': '' }, [
          h('span', { 'data-tag-summary-label': '' }, props.label),
          h('span', { 'data-tag-summary-value': '' }, [
            selectedText.value && h('span', { 'data-tag-summary-count': '' }, selectedText.value),
          ]),
        ]),
        h(Disclosure, { 'aria-hidden': 'true', 'data-no-autosize': '', 'data-row-disclosure': '' }),
      ]))]),
      h(Dialog, {
        'open': open.value,
        'onUpdate:open': (value: boolean) => { open.value = value; },
      }, {
        default: () => h(DialogContent, {
          mobileVariant: 'sheet', surface: 'grouped', class: [styles.TagEditor, nested.value && styles.TagEditorNested],
          onOpenAutoFocus: (event: Event) => {
            event.preventDefault();
            heading.value?.focus({ preventScroll: true });
          },
          onCloseAutoFocus: (event: Event) => {
            event.preventDefault();
            if (summary?.isConnected) summary.focus({ preventScroll: true });
          },
        }, {
          default: () => [
            h(DialogHeader, null, {
              default: () => [
                h('div', { ref: heading, tabindex: -1, class: 'outline-none' }, [
                  h(DialogTitle, null, () => props.label),
                ]),
                h(DialogDescription, { class: 'sr-only' }, () => `Select ${props.label.toLowerCase()} or add a new ${props.one}. Apply to save your changes.`),
                h(DialogHeaderAction, null, {
                  default: () => h(NavigationButton, { action: 'confirm', 'aria-label': `Apply ${props.label.toLowerCase()}`, onClick: apply }),
                }),
              ],
            }),
            h(DialogBody, { class: 'flex flex-col gap-6' }, {
              default: () => [
                h(FieldGroup, { 'aria-label': props.label, 'data-tag-options': '' }, {
                  default: () => draftCatalog.value.map((option) => h(Field, {
                    key: option.value, row: true, label: option.label, 'data-tag-option': '',
                  }, () => h(Checkbox, {
                    variant: 'ghost', checked: draft.value.includes(option.value),
                    'onUpdate:checked': () => toggle(option.value),
                  }))),
                }),
                h('form', { onSubmit: (event: Event) => { event.preventDefault(); add(); } }, [
                  h(FieldGroup, null, {
                    default: () => h(Input, {
                      'class': styles.TagAddInput, 'variant': 'ghost', 'aria-label': `New ${props.one}`,
                      'value': newLabel.value,
                      'onUpdate:value': (value: string) => { newLabel.value = value; },
                      'placeholder': `Add new ${props.one}…`, 'autoComplete': 'off',
                    }, {
                      endAdornment: () => h(Button, {
                        class: styles.TagAddAction, type: 'submit', color: 'info', variant: 'ghost', disabled: !newLabel.value.trim(),
                      }, () => 'Add'),
                    }),
                  }),
                ]),
              ],
            }),
          ],
        }),
      }),
    ];
  },
});
