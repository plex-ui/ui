import { defineComponent, h, ref, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { SoundOffSpeaker, SoundOnSpeaker } from '@plexui/vue/components/Icon';
import { Select } from '@plexui/vue/components/Select';
import { Slider } from '@plexui/vue/components/Slider';
import { Stepper } from '@plexui/vue/components/Stepper';
import { rowButtonClassName } from '../phoneRowsTemplate';
import { defaultVoicePreferences, pauseText, voiceOptions, voiceSliders, type VoicePreferences } from '../settingsVoiceData';
import s from '../SettingsVoiceDemo.module.css';

/** Vue port of SettingsVoiceFields.tsx: iOS Settings › Spoken Content › Voice (IMG_5944) with the Use Default rows
 * of VoiceOver's activities (IMG_5949). */
export const SettingsVoiceFields = defineComponent({
  name: 'SettingsVoiceFields',
  props: { value: { type: Object as PropType<VoicePreferences>, required: true } },
  emits: { 'update:value': (value: VoicePreferences) => Boolean(value) },
  setup(props, { emit }) {
    const confirm = ref(false);
    const update = (next: Partial<VoicePreferences>) => emit('update:value', { ...props.value, ...next });
    return () => {
      const value = props.value;
      return [
        h(FieldGroup, { 'aria-label': 'Voice' }, () => h(Field, { row: true, label: 'Voice' }, () =>
          h(Select, { value: value.voice, options: voiceOptions, block: false, align: 'end',
            'onUpdate:value': (voice: string) => update({ voice }) }))),
        ...voiceSliders.map((slider) => h(FieldGroup, { key: slider.key, title: slider.title }, () => [
          h('div', { class: s.Row, 'data-row': '' }, [
            h(Slider, { 'aria-label': slider.title, min: 0, max: 100, step: 1, value: value[slider.key], class: s.Slider,
              'onUpdate:value': (next: number | number[]) => { if (typeof next === 'number') update({ [slider.key]: next }); } }, {
              startAdornment: () => ('start' in slider ? slider.start : h(SoundOffSpeaker)),
              endAdornment: () => ('end' in slider ? slider.end : h(SoundOnSpeaker)),
            }),
          ]),
          h('div', { 'data-row': '' }, [
            h(Button, { block: true, color: 'info', variant: 'ghost', class: `${rowButtonClassName} ${s.Action}`,
              onClick: () => update({ [slider.key]: defaultVoicePreferences[slider.key] }) }, () => h('span', { class: s.ActionText }, slider.reset)),
          ]),
        ])),
        // The number under the label, the stepper at the end of the row (Timbre, Sentence Pause)
        h(FieldGroup, { 'aria-label': 'Timing' }, () => [
          h(Field, { row: true, label: 'Timbre', description: String(value.timbre) }, () =>
            h(Stepper, { value: value.timbre, min: 50, max: 150, step: 10, decrementLabel: 'Lower timbre', incrementLabel: 'Raise timbre',
              'onUpdate:value': (timbre: number) => update({ timbre }) })),
          h(Field, { row: true, label: 'Sentence Pause', description: pauseText(value.pause) }, () =>
            h(Stepper, { value: value.pause, min: 0, max: 5, decrementLabel: 'Shorter pause', incrementLabel: 'Longer pause',
              'onUpdate:value': (pause: number) => update({ pause }) })),
        ]),
        // The row is the dialog's trigger, so closing the alert returns focus to it
        h(FieldGroup, { 'aria-label': 'Reset' }, () => h('div', { 'data-row': '' }, [
          h(Dialog, { open: confirm.value, 'onUpdate:open': (open: boolean) => { confirm.value = open; } }, () => [
            h(DialogTrigger, null, () => h(Button, { block: true, color: 'danger', variant: 'ghost', class: `${rowButtonClassName} ${s.Action}`, 'data-described': '' }, () =>
              h('span', { class: s.ActionText }, ['Reset Voice Settings', h('span', { class: s.ActionDescription }, 'Reverts all voice changes to defaults.')]))),
            h(DialogContent, { mobileVariant: 'alert', surface: 'plain' }, () => [
              h(DialogHeader, null, () => [
                h(DialogTitle, null, () => 'Reset voice settings?'),
                h(DialogDescription, null, () => 'The voice, rate, pitch, volume, timbre and pause go back to their defaults.'),
              ]),
              h(DialogFooter, null, () => [
                h(DialogClose, null, () => h(Button, { color: 'secondary', variant: 'soft' }, () => 'Cancel')),
                h(Button, { color: 'danger', onClick: () => { emit('update:value', { ...defaultVoicePreferences }); confirm.value = false; } }, () => 'Reset'),
              ]),
            ]),
          ]),
        ])),
      ];
    };
  },
});
