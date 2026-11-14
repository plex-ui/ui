import { defineComponent, h, ref, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Disclosure } from '@plexui/vue/components/Icon';
import { Input } from '@plexui/vue/components/Input';
import { Select } from '@plexui/vue/components/Select';
import { Slider } from '@plexui/vue/components/Slider';
import { Stepper } from '@plexui/vue/components/Stepper';
import { Switch } from '@plexui/vue/components/Switch';
import { TextLink } from '@plexui/vue/components/TextLink';
import {
  actionOptions, balanceText, faceActions, offOnOptions, trackingModes,
  type AudioSettings, type HeadTrackingSettings,
} from '../settingsAudioData';
import s from '../SettingsVoiceDemo.module.css';

// Vue port of SettingsAudioFields.tsx: Audio & Visual with links in footers and the balance (IMG_5966, IMG_5962), and
// Head Tracking with a number in a field and a stepper (IMG_5965).

type Option = { value: string; label: string };
const select = (value: string, options: Option[], onChange: (value: string) => void) =>
  h(Select, { value, options, block: false, align: 'end', 'onUpdate:value': onChange });
const learnMore = () => h(TextLink, { primary: true, href: '#audio-and-visual' }, () => 'Learn more…');

export const AudioFields = defineComponent({
  name: 'AudioFields',
  props: { value: { type: Object as PropType<AudioSettings>, required: true } },
  emits: { 'update:value': (value: AudioSettings) => typeof value === 'object', liveListen: () => true },
  setup(props, { emit }) {
    const set = (patch: Partial<AudioSettings>) => emit('update:value', { ...props.value, ...patch });
    return () => [
      h(FieldGroup, { title: 'Audio' }, {
        default: () => h(Field, { row: true, label: 'Headphone Accommodations' }, () => select(props.value.accommodations, offOnOptions, (accommodations) => set({ accommodations }))),
        footer: () => h('p', ['You can customize the audio for supported headphones. ', learnMore()]),
      }),
      h(FieldGroup, null, {
        default: () => h(Field, { row: true, label: 'Background Sounds' }, () => select(props.value.background, offOnOptions, (background) => set({ background }))),
        footer: () => h('p', ['Plays background sounds to mask unwanted environmental noise. These sounds can minimize distractions and help you focus. ', learnMore()]),
      }),
      h(FieldGroup, { 'aria-label': 'Live Listen' }, () => h('div', { 'data-row': '' }, h(Button, { block: true, color: 'primary', variant: 'ghost', onClick: () => emit('liveListen') }, () =>
        h('span', { class: s.ValueRowContent }, ['Live Listen', h('span', { class: s.ValueRowValue }), h(Disclosure, { 'data-no-autosize': '' })])))),
      h(FieldGroup, null, {
        default: () => h(Field, { row: true, label: 'Mono Audio' }, () =>
          h(Switch, { color: 'accent', checked: props.value.mono, 'onUpdate:checked': (mono: boolean) => set({ mono }) })),
        footer: () => 'Make the left and right speakers play the same content.',
      }),
      h(FieldGroup, { title: 'Balance' }, {
        default: () => h('div', { class: s.BalanceRow, 'data-row': '' }, [
          h('div', { 'class': s.BalanceLabels, 'aria-hidden': 'true' }, [h('span', 'L'), h('span', balanceText(props.value.balance)), h('span', 'R')]),
          h(Slider, { 'aria-label': 'Balance', min: -1, max: 1, step: 0.05, value: props.value.balance,
            'onUpdate:value': (next: number | number[]) => { if (typeof next === 'number') set({ balance: next }); } }),
        ]),
        footer: () => 'Adjust the audio volume balance between left and right channels.',
      }),
    ];
  },
});

export const HeadTrackingFields = defineComponent({
  name: 'HeadTrackingFields',
  props: { value: { type: Object as PropType<HeadTrackingSettings>, required: true } },
  emits: { 'update:value': (value: HeadTrackingSettings) => typeof value === 'object' },
  setup(props, { emit }) {
    const set = (patch: Partial<HeadTrackingSettings>) => emit('update:value', { ...props.value, ...patch });
    const speed = (next: number) => set({ speed: Math.min(100, Math.max(0, Math.round(next))) });
    // What is typed stays as typed until it is committed (blur or Return); a field left empty or not a number goes back
    const draft = ref<string | null>(null);
    // A step goes on from what is typed, not yet committed: the stepper stands at the typed number (Codex #55, #56)
    const typedOr = (fallback: number) => (draft.value !== null && draft.value.trim() !== '' && Number.isFinite(Number(draft.value)) ? Number(draft.value) : fallback);
    const commit = () => {
      if (draft.value !== null && draft.value.trim() !== '' && Number.isFinite(Number(draft.value))) speed(Number(draft.value));
      draft.value = null;
    };
    return () => [
      h(FieldGroup, null, {
        default: () => h(Field, { row: true, label: 'Head Tracking' }, () =>
          h(Switch, { color: 'accent', checked: props.value.on, 'onUpdate:checked': (on: boolean) => set({ on }) })),
        footer: () => 'Head tracking uses the camera to track the movement of your head to control a pointer on screen, and tracks facial movements to perform actions.',
      }),
      h(FieldGroup, { title: 'Actions' }, () => faceActions.map((name) => h(Field, { key: name, row: true, label: name }, () =>
        select(props.value.actions[name], actionOptions, (next) => set({ actions: { ...props.value.actions, [name]: next } }))))),
      h(FieldGroup, { title: 'Pointer' }, () => h(Field, { row: true, label: 'Tracking Mode' }, () => select(props.value.mode, trackingModes, (mode) => set({ mode })))),
      h(FieldGroup, { title: 'Pointer Speed' }, () => h('div', { class: s.NumberRow, 'data-row': '' }, [
        h(Input, { 'size': 'sm', 'variant': 'ghost', 'inputmode': 'numeric', 'class': s.NumberField, 'aria-label': 'Pointer Speed', 'value': draft.value ?? String(props.value.speed),
          'onUpdate:value': (text: string) => { draft.value = text; }, 'onBlur': commit,
          'onKeydown': (event: KeyboardEvent) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } } }),
        h(Stepper, { 'aria-label': 'Adjust Pointer Speed', 'value': Math.min(100, Math.max(0, typedOr(props.value.speed))), 'min': 0, 'max': 100, 'step': 10, 'decrementLabel': 'Slower', 'incrementLabel': 'Faster',
          'onUpdate:value': (next: number) => { speed(next); draft.value = null; } }),
      ])),
    ];
  },
});
