import { computed, defineComponent, h, ref, type PropType } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { Checkbox } from '@plexui/vue/components/Checkbox';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogHeaderAction, DialogTitle } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Disclosure, SearchSm } from '@plexui/vue/components/Icon';
import { Toolbar, ToolbarContent } from '@plexui/vue/components/Toolbar';
import { Input } from '@plexui/vue/components/Input';
import styles from '../FormRowsDemos.module.css';

export type MobileTagOption = {
  value: string;
  label: string;
  color?: 'discovery' | 'danger' | 'warning';
};

/** A Phone summary row whose Sheet edits a draft until Apply is pressed. The sheet picks as iOS does from a row with a
 * chevron: a checkmark in the tint at the end of each row picked, Clear all as the list's own action, and the search in the
 * bar at the bottom, in reach of the thumb (owner 14.11). */
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
    const draft = ref<string[]>([]);
    const query = ref('');
    const heading = ref<HTMLElement | null>(null);
    let summary: HTMLButtonElement | null = null;
    const selectedText = computed(() => props.modelValue.map((selected) => props.options.find((option) => option.value === selected)?.label ?? selected).join(', '));
    const needle = computed(() => query.value.trim().toLowerCase());
    const shown = computed(() => needle.value ? props.options.filter((option) => option.label.toLowerCase().includes(needle.value)) : props.options);

    const show = (event: MouseEvent) => {
      if (event.currentTarget instanceof HTMLButtonElement) {
        summary = event.currentTarget;
        nested.value = Boolean(summary.closest('[data-plex-dialog][data-mobile-variant="sheet"][data-mobile-placement="bottom"]'));
      }
      draft.value = [...props.modelValue];
      query.value = '';
      open.value = true;
    };
    const toggle = (value: string) => {
      draft.value = draft.value.includes(value)
        ? draft.value.filter((item) => item !== value)
        : [...draft.value, value];
    };
    const apply = () => {
      emit('update:modelValue', props.options.filter((option) => draft.value.includes(option.value)).map((option) => option.value));
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
                h(DialogDescription, { class: 'sr-only' }, () => `Select ${props.label.toLowerCase()}, or search for one ${props.one}. Apply to save your changes.`),
                h(DialogHeaderAction, null, {
                  default: () => h(NavigationButton, { action: 'confirm', 'aria-label': `Apply ${props.label.toLowerCase()}`, onClick: apply }),
                }),
              ],
            }),
            h(DialogBody, { class: 'flex flex-col gap-6 [--field-group-gap:11px]' }, {
              default: () => [
                shown.value.length > 0 && h(FieldGroup, { 'aria-label': props.label, 'data-tag-options': '' }, {
                  default: () => shown.value.map((option) => h(Field, {
                    key: option.value, row: true, label: option.label, 'data-tag-option': '',
                  }, () => h(Checkbox, {
                    variant: 'ghost', checked: draft.value.includes(option.value),
                    'onUpdate:checked': () => toggle(option.value),
                  }))),
                }),
                shown.value.length === 0 && h('p', { class: styles.TagNoMatches }, `No ${props.label.toLowerCase()} match “${query.value.trim()}”.`),
                draft.value.length > 0 && !needle.value && h(FieldGroup, null, {
                  default: () => h('div', { 'data-row': '' }, h(Button, { block: true, color: 'info', variant: 'ghost', onClick: () => { draft.value = []; } }, () => 'Clear all')),
                }),
              ],
            }),
            h(Toolbar, { placement: 'bottom' }, () => h(ToolbarContent, { fill: true }, () => h(Input, {
              variant: 'soft', pill: true, placeholder: `Search ${props.label.toLowerCase()}`, 'aria-label': `Search ${props.label.toLowerCase()}`,
              value: query.value, 'onUpdate:value': (value: string) => { query.value = value; },
            }, { startAdornment: () => h(SearchSm) }))),
          ],
        }),
      }),
    ];
  },
});
