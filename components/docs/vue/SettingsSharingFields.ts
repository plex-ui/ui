import { defineComponent, h, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { RadioGroup, RadioGroupItem } from '@plexui/vue/components/RadioGroup';
import { Switch } from '@plexui/vue/components/Switch';
import { TextLink } from '@plexui/vue/components/TextLink';
import { receivingOptions, type SharingSettings } from '../settingsSharingData';

// Vue port of SettingsSharingFields.tsx: one choice checked with a link in its footer, switches under headers, a row
// in the accent (IMG_5955).

export const SharingFields = defineComponent({
  name: 'SharingFields',
  props: { value: { type: Object as PropType<SharingSettings>, required: true } },
  emits: { 'update:value': (value: SharingSettings) => typeof value === 'object', manage: () => true },
  setup(props, { emit }) {
    const set = (patch: Partial<SharingSettings>) => emit('update:value', { ...props.value, ...patch });
    const toggle = (label: string, key: 'together' | 'cellular', title: string, footer: string) =>
      h(FieldGroup, { title }, {
        default: () => h(Field, { row: true, label }, () =>
          h(Switch, { color: 'accent', checked: props.value[key], 'onUpdate:checked': (on: boolean) => set({ [key]: on }) })),
        footer: () => footer,
      });
    return () => [
      h(RadioGroup, {
        direction: 'col', class: 'w-full', value: props.value.receiving, 'aria-label': 'Receiving',
        'onUpdate:value': (receiving: string | null) => receiving && set({ receiving }),
      }, () => h(FieldGroup, null, {
        default: () => receivingOptions.map((option) => h(Field, { key: option.value, row: true, label: option.label }, () =>
          h(RadioGroupItem, { value: option.value }))),
        footer: () => h('p', ['Nearby Sharing lets you share instantly with people nearby. You can be discoverable to receive from everyone or only people in your contacts. ',
          h(TextLink, { primary: true, href: '#sharing-settings' }, () => 'About Nearby Sharing & Privacy…')]),
      })),
      toggle('Bringing Devices Together', 'together', 'Start Sharing By', 'Swap contact details, share photos, and more by holding the top of your phone close to another phone.'),
      toggle('Use Cellular Data', 'cellular', 'Out of Range', 'Continue to send and receive content when Wi-Fi is not available during Nearby Sharing.'),
      h(FieldGroup, null, {
        default: () => h('div', { 'data-row': '' }, h(Button, { block: true, color: 'info', variant: 'ghost', onClick: () => emit('manage') }, () => 'Manage Known Contacts')),
        footer: () => 'You will automatically appear for 30 days to people you have shared a one-time code with.',
      }),
    ];
  },
});
