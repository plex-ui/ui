import { defineComponent, h, ref, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Checkbox } from '@plexui/vue/components/Checkbox';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Sortable, SortableHandle } from '@plexui/vue/components/Sortable';
import { rowButtonClassName } from '../phoneRowsTemplate';
import { allLanguages, languageDetail, type QuickSetting } from '../settingsOrderData';
import s from '../SettingsVoiceDemo.module.css';

/** Vue port of QuickSettingsFields in SettingsOrderFields.tsx (IMG_5946). */
export const QuickSettingsFields = defineComponent({
  name: 'QuickSettingsFields',
  props: { value: { type: Array as PropType<QuickSetting[]>, required: true } },
  emits: { 'update:value': (value: QuickSetting[]) => Array.isArray(value) },
  setup(props, { emit }) {
    return () => h(FieldGroup, { 'aria-label': 'Quick Settings' }, {
      default: () => h(Sortable, { value: props.value, handles: true, 'onUpdate:value': (value: unknown[]) => emit('update:value', value as QuickSetting[]) }, () =>
        props.value.map((item) => h('div', { key: item.id, 'data-row': '' }, [
          h(SortableHandle, { ariaLabel: `Reorder ${item.label}` }),
          h('div', { class: s.CheckRow }, [
            h(Checkbox, { variant: 'ghost', label: item.label, checked: item.on,
              'onUpdate:checked': (on: boolean | 'indeterminate') => emit('update:value', props.value.map((row) => (row.id === item.id ? { ...row, on: on === true } : row))) }),
          ]),
        ]))),
      footer: () => 'Checked settings appear in Quick Settings, in this order.',
    });
  },
});

/** Vue port of LanguagesFields in SettingsOrderFields.tsx (IMG_5951). */
export const LanguagesFields = defineComponent({
  name: 'LanguagesFields',
  props: { value: { type: Array as PropType<string[]>, required: true } },
  emits: { 'update:value': (value: string[]) => Array.isArray(value) },
  setup(props, { emit }) {
    const adding = ref(false);
    return () => {
      const rest = allLanguages.filter((language) => !props.value.includes(language.id));
      return h(FieldGroup, { title: 'Preferred Languages' }, {
        default: () => [
          h(Sortable, { value: props.value, handles: true, 'onUpdate:value': (value: unknown[]) => emit('update:value', value as string[]) }, () =>
            props.value.map((id, index) => {
              const language = allLanguages.find((item) => item.id === id)!;
              return h('div', { key: id, 'data-row': '' }, [
                h(SortableHandle, { ariaLabel: `Reorder ${language.label}` }),
                h('div', { class: s.TextRow }, [language.label, h('span', { class: s.ActionDescription }, languageDetail(language, index === 0))]),
              ]);
            })),
          h('div', { 'data-row': '' }, [
            h(Dialog, { open: adding.value, 'onUpdate:open': (open: boolean) => { adding.value = open; } }, () => [
              h(DialogTrigger, null, () => h(Button, { block: true, color: 'info', variant: 'ghost', class: `${rowButtonClassName} ${s.Action}` }, () =>
                h('span', { class: s.ActionText }, 'Add Language…'))),
              h(DialogContent, { mobileVariant: 'sheet', width: 400 }, () => [
                h(DialogHeader, null, () => [
                  h(DialogTitle, null, () => 'Add Language'),
                  h(DialogDescription, { class: 'sr-only' }, () => 'Choose a language to add to the end of the list.'),
                ]),
                // The trigger stays enabled, so focus can return to it after the last language is added
                h(DialogBody, null, () => h(FieldGroup, { 'aria-label': 'Languages' }, {
                  default: () => rest.map((language) =>
                    h('div', { key: language.id, 'data-row': '' }, [
                      h(Button, { block: true, color: 'secondary', variant: 'ghost', class: `${rowButtonClassName} ${s.Action}`,
                        onClick: () => { emit('update:value', [...props.value, language.id]); adding.value = false; } }, () =>
                        h('span', { class: s.ActionText }, [language.label, h('span', { class: s.ActionDescription }, language.english)])),
                    ])),
                  ...(rest.length === 0 ? { footer: () => 'Every language is in the list.' } : {}),
                })),
              ]),
            ]),
          ]),
        ],
        footer: () => 'Apps and websites will use the first language in this list that they support.',
      });
    };
  },
});
