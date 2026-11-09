import { defineComponent, h, ref, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Slider } from '@plexui/vue/components/Slider';
import { Switch } from '@plexui/vue/components/Switch';
import { TextLink } from '@plexui/vue/components/TextLink';
import type { PlaybackPreferences } from '../settingsSliderData';
import s from '../SettingsSliderDemo.module.css';

export const SettingsSliderFields = defineComponent({
  name: 'SettingsSliderFields',
  props: { value: { type: Object as PropType<PlaybackPreferences>, required: true } },
  emits: { 'update:value': (value: PlaybackPreferences) => Boolean(value) },
  setup(props, { emit }) {
    const helpOpen = ref(false);
    const update = (next: Partial<PlaybackPreferences>) => emit('update:value', { ...props.value, ...next });
    return () => [
      h(FieldGroup, { 'aria-label': 'Playback options' }, () => h(Field, { row: true, label: 'Sound' }, () =>
        h(Switch, { color: 'accent', checked: props.value.sound, 'onUpdate:checked': (sound: boolean) => update({ sound }) }))),
      h(FieldGroup, { title: 'Volume' }, {
        default: () => h('div', { class: s.Row, 'data-row': '', 'data-slider-setting': '', 'data-disabled': !props.value.sound ? '' : undefined }, [
          h(Slider, { 'aria-label': 'Volume', min: 0, max: 100, step: 1, value: props.value.volume,
            disabled: !props.value.sound, class: s.Slider, 'onUpdate:value': (volume: number | number[]) => { if (typeof volume === 'number') update({ volume }); } }),
          h('output', { class: s.Value, 'aria-hidden': 'true' }, `${props.value.volume}%`),
        ]),
        // The link ends the footer's paragraph, as iOS writes "Learn more…" (Add Payment, IMG_5483 and 5489)
        footer: () => h('p', null, [
          'Choose the volume used for playback. Turning sound off keeps your last setting. ',
          h(Dialog, { open: helpOpen.value, 'onUpdate:open': (open: boolean) => { helpOpen.value = open; } }, () => [
            h(DialogTrigger, null, () => h(TextLink, { primary: true }, () => 'Learn more…')),
            h(DialogContent, { mobileVariant: 'sheet', width: 400 }, () => [
              h(DialogHeader, null, () => [
                h(DialogTitle, null, () => 'Playback volume'),
                h(DialogDescription, null, () => 'Volume applies while sound is enabled. Turn on consistent volume to keep quiet and loud recordings closer together.'),
              ]),
              h(DialogFooter, null, () => h(DialogClose, null, () => h(Button, { color: 'primary', pill: true }, () => 'Done'))),
            ]),
          ]),
        ]),
      }),
      h(FieldGroup, null, {
        default: () => h(Field, { row: true, label: 'Consistent volume' }, () =>
          h(Switch, { color: 'accent', checked: props.value.normalize, 'onUpdate:checked': (normalize: boolean) => update({ normalize }) })),
        footer: () => 'Reduce differences between quiet and loud recordings.',
      }),
    ];
  },
});
