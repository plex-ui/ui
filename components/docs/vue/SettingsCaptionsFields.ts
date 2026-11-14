import { defineComponent, h, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { ColorWell } from '@plexui/vue/components/ColorPicker';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Disclosure } from '@plexui/vue/components/Icon';
import { Select } from '@plexui/vue/components/Select';
import { Slider } from '@plexui/vue/components/Slider';
import { Switch } from '@plexui/vue/components/Switch';
import {
  boldOptions, captionsGestures, captionsNote, fontOptions, keepOptions, languageOptions, sizeOptions,
  type CaptionsAppearance, type CaptionsSettings,
} from '../settingsCaptionsData';
import s from '../SettingsVoiceDemo.module.css';

// Vue port of SettingsCaptionsFields.tsx: Live Captions with a list in a footer (IMG_5960) and its Appearance page with
// colors and a slider (IMG_5961).

type Option = { value: string; label: string };

export const CaptionsFields = defineComponent({
  name: 'CaptionsFields',
  props: { value: { type: Object as PropType<CaptionsSettings>, required: true } },
  emits: { 'update:value': (value: CaptionsSettings) => typeof value === 'object', appearance: () => true },
  setup(props, { emit }) {
    const set = (patch: Partial<CaptionsSettings>) => emit('update:value', { ...props.value, ...patch });
    const choice = (label: string, key: 'keep' | 'language', options: Option[]) => h(Field, { row: true, label }, () =>
      h(Select, { value: props.value[key], options, block: false, align: 'end', 'onUpdate:value': (next: string) => set({ [key]: next }) }));
    return () => [
      h(FieldGroup, null, {
        default: () => [
          h(Field, { row: true, label: 'Live Captions' }, () =>
            h(Switch, { color: 'accent', checked: props.value.on, 'onUpdate:checked': (on: boolean) => set({ on }) })),
          h('div', { 'data-row': '' }, h(Button, { block: true, color: 'primary', variant: 'ghost', onClick: () => emit('appearance') }, () =>
            h('span', { class: s.ValueRowContent }, ['Appearance', h('span', { class: s.ValueRowValue }), h(Disclosure, { 'data-no-autosize': '' })]))),
        ],
        footer: () => [h('p', captionsNote), h('ul', captionsGestures.map((line) => h('li', { key: line }, line)))],
      }),
      h(FieldGroup, { 'aria-label': 'Call captions' }, () => choice('Keep Call Captions', 'keep', keepOptions)),
      h(FieldGroup, { title: 'Supported Languages' }, () => choice('Current Language', 'language', languageOptions)),
    ];
  },
});

export const CaptionsAppearanceFields = defineComponent({
  name: 'CaptionsAppearanceFields',
  props: { value: { type: Object as PropType<CaptionsAppearance>, required: true } },
  emits: { 'update:value': (value: CaptionsAppearance) => typeof value === 'object' },
  setup(props, { emit }) {
    const set = (patch: Partial<CaptionsAppearance>) => emit('update:value', { ...props.value, ...patch });
    const choice = (label: string, key: 'bold' | 'size' | 'font', options: Option[]) => h(Field, { row: true, label }, () =>
      h(Select, { value: props.value[key], options, block: false, align: 'end', 'onUpdate:value': (next: string) => set({ [key]: next }) }));
    const well = (label: string, key: 'text' | 'background') => h(Field, { row: true, label }, () =>
      h(ColorWell, { value: props.value[key], 'onUpdate:value': (next: string) => set({ [key]: next }) }));
    return () => [
      h(FieldGroup, { 'aria-label': 'Text' }, () => [choice('Bold Text', 'bold', boldOptions), choice('Text Size', 'size', sizeOptions), choice('Font', 'font', fontOptions)]),
      h(FieldGroup, { title: 'Color Options' }, () => [
        well('Text Color', 'text'),
        well('Background Color', 'background'),
        h('div', { 'data-row': '' }, h(Button, {
          block: true, color: 'info', variant: 'ghost',
          onClick: () => set({ text: null, background: null }),
        }, () => 'Reset Colors')),
      ]),
      h(FieldGroup, { title: 'Idle Opacity' }, {
        default: () => h('div', { class: s.Row, 'data-row': '' }, h(Slider, {
          'aria-label': 'Idle Opacity', min: 0, max: 100, step: 5, value: props.value.opacity, class: s.Slider,
          'onUpdate:value': (next: number | number[]) => { if (typeof next === 'number') set({ opacity: next }); },
        }, { endAdornment: () => `${props.value.opacity}%` })),
        footer: () => 'Reduces the visibility of the Live Captions button when not in use.',
      }),
    ];
  },
});
