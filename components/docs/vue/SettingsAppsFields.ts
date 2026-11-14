import { defineComponent, h, type PropType } from 'vue';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Book, Compass, Fingerprint, Globe, Key, Music, Search, ShieldCheck } from '@plexui/vue/components/Icon';
import { Switch } from '@plexui/vue/components/Switch';
import { TextLink } from '@plexui/vue/components/TextLink';
import { autofillApps, hapticApps, type AutofillSettings } from '../settingsAppsData';
import s from '../SettingsAppsFields.module.css';

// Vue port of SettingsAppsFields.tsx: apps in rows with Field's `icon` slot (IMG_5952, IMG_5963).

const symbols = { key: Key, shield: ShieldCheck, fingerprint: Fingerprint, globe: Globe, compass: Compass, search: Search, book: Book, music: Music };

type IconStyle = 'tile' | 'outline' | 'plain';
const appPicture = (symbol: keyof typeof symbols, style: IconStyle, tile?: string) =>
  h('span', { class: s.Picture, 'data-style': style, style: tile ? { '--app-tile': tile } : undefined }, [h(symbols[symbol])]);
const iconStyleProp = (fallback: IconStyle) => ({ type: String as PropType<IconStyle>, default: fallback });

export const AutofillFields = defineComponent({
  name: 'AutofillFields',
  props: { value: { type: Object as PropType<AutofillSettings>, required: true }, iconStyle: iconStyleProp('tile') },
  emits: { 'update:value': (value: AutofillSettings) => typeof value === 'object' },
  setup(props, { emit }) {
    const set = (patch: Partial<AutofillSettings>) => emit('update:value', { ...props.value, ...patch });
    const setApp = (id: string, on: boolean) => set({ apps: { ...props.value.apps, [id]: on } });
    return () => [
      h(FieldGroup, null, {
        default: () => h(Field, { row: true, label: 'AutoFill Passwords and Passkeys' }, () =>
          h(Switch, { color: 'accent', checked: props.value.autofill, 'onUpdate:checked': (autofill: boolean) => set({ autofill }) })),
        footer: () => 'Automatically suggest passwords, passkeys, and verification codes when signing in to apps and websites.',
      }),
      props.value.autofill ? h(FieldGroup, { title: 'AutoFill from:' }, () => autofillApps.map((app) =>
        h(Field, { key: app.id, row: true, label: app.name, description: app.detail, class: props.value.apps[app.id] ? undefined : s.Off }, {
          icon: () => appPicture(app.symbol, props.iconStyle, app.tile),
          default: () => h(Switch, { color: 'accent', checked: props.value.apps[app.id], 'onUpdate:checked': (on: boolean) => setApp(app.id, on) }),
        }))) : null,
      h(FieldGroup, null, {
        default: () => h(Field, { row: true, label: 'Suggest Strong Passwords' }, () =>
          h(Switch, { color: 'accent', checked: props.value.strong, 'onUpdate:checked': (strong: boolean) => set({ strong }) })),
        footer: () => 'Automatically suggest unique, strong passwords when creating accounts or changing passwords.',
      }),
    ];
  },
});

export const HapticsFields = defineComponent({
  name: 'HapticsFields',
  props: { value: { type: Boolean, required: true }, iconStyle: iconStyleProp('outline') },
  emits: { 'update:value': (value: boolean) => typeof value === 'boolean' },
  setup(props, { emit }) {
    return () => [
      h(FieldGroup, null, {
        default: () => h(Field, { row: true, label: 'Music Haptics' }, () =>
          h(Switch, { color: 'accent', checked: props.value, 'onUpdate:checked': (on: boolean) => emit('update:value', on) })),
        footer: () => h('p', ['When available, Music Haptics plays the rhythm of a song as taps. ', h(TextLink, { primary: true, href: '#apps-in-rows' }, () => 'Learn more…')]),
      }),
      h(FieldGroup, { title: 'Available Apps' }, {
        default: () => hapticApps.map((app) =>
          h(Field, { key: app.id, row: true, label: app.name }, { icon: () => appPicture(app.symbol, props.iconStyle, app.tile), default: () => null })),
        footer: () => 'Apps which support Music Haptics.',
      }),
    ];
  },
});
