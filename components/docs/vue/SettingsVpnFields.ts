import { defineComponent, h, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { InfoCircle } from '@plexui/vue/components/Icon';
import { RadioGroup, RadioGroupItem } from '@plexui/vue/components/RadioGroup';
import { Switch } from '@plexui/vue/components/Switch';
import { TextLink } from '@plexui/vue/components/TextLink';
import { tvProviders, vpnConfigurations, type VpnSettings } from '../settingsVpnData';
import s from '../SettingsVoiceDemo.module.css';

// Vue port of SettingsVpnFields.tsx: the status with its switch, then the configurations, each choice leading with its
// check and an info button at its end (IMG_5959); and the TV providers with a centred row (IMG_5958).

export const VpnFields = defineComponent({
  name: 'VpnFields',
  props: { value: { type: Object as PropType<VpnSettings>, required: true } },
  emits: { 'update:value': (value: VpnSettings) => typeof value === 'object', info: (id: string) => typeof id === 'string' },
  setup(props, { emit }) {
    const set = (patch: Partial<VpnSettings>) => emit('update:value', { ...props.value, ...patch });
    return () => {
      const chosen = vpnConfigurations.find((item) => item.id === props.value.chosen);
      return [
        h(FieldGroup, null, {
          default: () => h(Field, { row: true, label: 'VPN Status' }, (control: Record<string, unknown>) =>
            h('span', { class: s.StatusControl }, [
              h('span', { class: s.ValueRowValue }, props.value.connected ? 'Connected' : 'Not Connected'),
              h(Switch, { ...control, color: 'accent', checked: props.value.connected, 'onUpdate:checked': (connected: boolean) => set({ connected }) }),
            ])),
          footer: () => `To connect without this switch, use the “${chosen?.type ?? 'VPN'}” app.`,
        }),
        h(RadioGroup, {
          direction: 'col', class: 'w-full', value: props.value.chosen, 'aria-label': 'Device VPN',
          'onUpdate:value': (next: string | null) => next && set({ chosen: next }),
        }, () => h(FieldGroup, { title: 'Device VPN' }, () => vpnConfigurations.map((item) =>
          h(Field, { key: item.id, row: true, label: item.name, description: item.type }, {
            default: () => h(RadioGroupItem, { value: item.id }),
            action: () => h(Button, { color: 'info', variant: 'ghost', uniform: true, pill: true, opticallyAlign: 'end', 'aria-label': `${item.name} details`, onClick: () => emit('info', item.id) }, () => h(InfoCircle)),
          })))),
      ];
    };
  },
});

export const TvProviderFields = defineComponent({
  name: 'TvProviderFields',
  emits: { provider: (name: string) => typeof name === 'string', regions: () => true },
  setup(_props, { emit }) {
    return () => [
      h(FieldGroup, { title: 'Watch TV shows and movies from apps included in your TV subscription. Select your TV provider to get started.' }, () =>
        tvProviders.map((name) => h('div', { key: name, 'data-row': '' },
          h(Button, { block: true, color: 'primary', variant: 'ghost', onClick: () => emit('provider', name) }, () => name)))),
      h(FieldGroup, null, {
        default: () => h('div', { 'data-row': '', 'data-align': 'center' },
          h(Button, { block: true, color: 'primary', variant: 'ghost', onClick: () => emit('regions') }, () => 'Other TV Provider Regions…')),
        footer: () => [
          h('p', 'If you don’t see your TV provider, sign in directly from the app you want to use.'),
          h('p', h(TextLink, { primary: true, href: '#tv-provider' }, () => 'About TV Provider & Privacy…')),
        ],
      }),
    ];
  },
});
