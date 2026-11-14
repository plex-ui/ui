import { defineComponent, h, ref, type PropType } from 'vue';
import { Button } from '@plexui/vue/components/Button';
import { Checkbox } from '@plexui/vue/components/Checkbox';
import { ColorWell } from '@plexui/vue/components/ColorPicker';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Bell, CameraPhoto, Disclosure, Globe, Heart, InfoCircle, Mic, SoundOffSpeaker, SoundOnSpeaker, Star } from '@plexui/vue/components/Icon';
import { Input } from '@plexui/vue/components/Input';
import { RadioGroup, RadioGroupItem } from '@plexui/vue/components/RadioGroup';
import { Select } from '@plexui/vue/components/Select';
import { Slider } from '@plexui/vue/components/Slider';
import { Sortable, SortableHandle } from '@plexui/vue/components/Sortable';
import { Stepper } from '@plexui/vue/components/Stepper';
import { Switch } from '@plexui/vue/components/Switch';
import { TextLink } from '@plexui/vue/components/TextLink';
import {
  balanceText, choiceOptions, defaultSliders, describedPictures, initialRows, offOnOptions, orderedPool, plainPictures, switchPictures,
  type CheckedRow, type ChoiceValue, type OrderValue, type PictureRow, type RowsValue, type SlidersValue,
} from '../settingsCombosData';
import s from '../SettingsVoiceDemo.module.css';
import sliderStyles from '../SettingsSliderDemo.module.css';
import pictureStyles from '../SettingsAppsFields.module.css';

// Vue port of SettingsCombos.tsx: the combination screens of Forms: Settings, in plain words (Row, Header, Footer).

const learnMore = () => h(TextLink, { primary: true, href: '#headers-and-footers' }, () => 'Learn more…');
const switchOf = (checked: boolean, onChange: (on: boolean) => void, control?: Record<string, unknown>) =>
  h(Switch, { ...control, 'color': 'accent', checked, 'onUpdate:checked': onChange });

export const RowsCombos = defineComponent({
  name: 'RowsCombos',
  props: { value: { type: Object as PropType<RowsValue>, required: true } },
  emits: { 'update:value': (value: RowsValue) => typeof value === 'object', page: () => true },
  setup(props, { emit }) {
    const confirm = ref(false);
    const set = (patch: Partial<RowsValue>) => emit('update:value', { ...props.value, ...patch });
    return () => [
      h(FieldGroup, null, {
        default: () => [
          h(Field, { row: true, label: 'Switch' }, () => switchOf(props.value.switch, (on) => set({ switch: on }))),
          h(Field, { row: true, label: 'Menu' }, () =>
            h(Select, { 'value': props.value.menu, 'options': offOnOptions, 'block': false, 'align': 'end', 'onUpdate:value': (menu: string) => set({ menu }) })),
          h(Field, { row: true, label: 'Status' }, {
            default: (control: Record<string, unknown>) => h('span', { class: s.StatusControl }, [
              h('span', { class: s.ValueRowValue }, props.value.status ? 'On' : 'Off'),
              switchOf(props.value.status, (status) => set({ status }), control),
            ]),
          }),
          h(Field, { row: true, label: 'Row with description', description: 'Description' }, () =>
            switchOf(props.value.described, (described) => set({ described }))),
        ],
        footer: () => 'Footer one line.',
      }),
      h(FieldGroup, { title: 'Header' }, () => [
        h('div', { 'data-row': '' }, h(Button, { block: true, color: 'primary', variant: 'ghost', onClick: () => emit('page') }, () =>
          h('span', { class: s.ValueRowContent }, ['Page', h('span', { class: s.ValueRowValue }, 'Value'), h(Disclosure, { 'data-no-autosize': '' })]))),
        h(Field, { row: true, label: 'Color' }, () => h(ColorWell, { 'value': props.value.color, 'onUpdate:value': (color: string) => set({ color }) })),
        h(Field, { row: true, label: 'Second color' }, () => h(ColorWell, { 'value': props.value.second, 'onUpdate:value': (second: string) => set({ second }) })),
        h('div', { 'data-row': '' }, h(Button, { block: true, color: 'info', variant: 'ghost', onClick: () => set({ color: null, second: null }) }, () => 'Reset Colors')),
      ]),
      h(FieldGroup, { 'aria-label': 'Action' }, () =>
        h('div', { 'data-row': '' }, h(Button, { block: true, color: 'info', variant: 'ghost', onClick: () => emit('page') }, () => 'Action'))),
      // A red row with its description stands alone in its group, as Reset Voice Settings (IMG_5944); the row is the
      // dialog's trigger, so closing the alert returns focus to it
      h(FieldGroup, { 'aria-label': 'Destructive action' }, () => [
        h('div', { 'data-row': '' }, h(Dialog, { 'open': confirm.value, 'onUpdate:open': (open: boolean) => { confirm.value = open; } }, () => [
          h(DialogTrigger, null, () => h(Button, { 'block': true, 'color': 'danger', 'variant': 'ghost', 'class': s.Action, 'data-described': '' }, () =>
            h('span', { class: s.ActionText }, ['Destructive action', h('span', { class: s.ActionDescription }, 'Asks first.')]))),
          h(DialogContent, { mobileVariant: 'alert', surface: 'plain' }, () => [
            h(DialogHeader, null, () => [
              h(DialogTitle, null, () => 'Reset every row?'),
              h(DialogDescription, null, () => 'The rows of this screen go back to their defaults.'),
            ]),
            h(DialogFooter, null, () => [
              h(DialogClose, null, () => h(Button, { color: 'secondary', variant: 'soft' }, () => 'Cancel')),
              h(Button, { color: 'danger', onClick: () => { emit('update:value', { ...initialRows }); confirm.value = false; } }, () => 'Reset'),
            ]),
          ]),
        ])),
      ]),
      h(FieldGroup, { 'aria-label': 'Centred action' }, () =>
        h('div', { 'data-row': '', 'data-align': 'center' }, h(Button, { block: true, color: 'primary', variant: 'ghost' }, () => 'Centred action'))),
    ];
  },
});

export const SliderCombos = defineComponent({
  name: 'SliderCombos',
  props: { value: { type: Object as PropType<SlidersValue>, required: true } },
  emits: { 'update:value': (value: SlidersValue) => typeof value === 'object' },
  setup(props, { emit }) {
    const set = (patch: Partial<SlidersValue>) => emit('update:value', { ...props.value, ...patch });
    const slid = (key: keyof SlidersValue) => (next: number | number[]) => { if (typeof next === 'number') set({ [key]: next }); };
    const number = (next: number) => set({ number: Math.min(100, Math.max(0, Math.round(next))) });
    // What is typed stays as typed until it is committed (blur or Return); a field left empty or not a number goes back
    const draft = ref<string | null>(null);
    // A step goes on from what is typed, not yet committed: the stepper stands at the typed number
    const typedOr = (fallback: number) => (draft.value !== null && draft.value.trim() !== '' && Number.isFinite(Number(draft.value)) ? Number(draft.value) : fallback);
    const commit = () => {
      if (draft.value !== null && draft.value.trim() !== '' && Number.isFinite(Number(draft.value))) number(Number(draft.value));
      draft.value = null;
    };
    return () => {
      const value = props.value;
      return [
        h(FieldGroup, { 'aria-label': 'Enabled' }, () => h(Field, { row: true, label: 'Switch' }, () => switchOf(value.enabled, (enabled) => set({ enabled })))),
        h(FieldGroup, { title: 'Slider' }, {
          default: () => h('div', { 'class': sliderStyles.Row, 'data-row': '', 'data-slider-setting': '', 'data-disabled': value.enabled ? undefined : '' }, [
            h(Slider, { 'aria-label': 'Slider', 'min': 0, 'max': 100, 'step': 1, 'value': value.slider, 'disabled': !value.enabled, 'class': sliderStyles.Slider, 'onUpdate:value': slid('slider') }),
            h('output', { 'class': sliderStyles.Value, 'aria-hidden': 'true' }, `${value.slider}%`),
          ]),
          footer: () => 'Turning the switch off keeps the value.',
        }),
        h(FieldGroup, { title: 'Symbols at the ends' }, () => [
          h('div', { 'class': s.Row, 'data-row': '' }, h(Slider, { 'aria-label': 'Symbols at the ends', 'min': 0, 'max': 100, 'step': 1, 'value': value.ends, 'class': s.Slider, 'onUpdate:value': slid('ends') }, {
            startAdornment: () => h(SoundOffSpeaker),
            endAdornment: () => h(SoundOnSpeaker),
          })),
          h('div', { 'data-row': '' }, h(Button, { block: true, color: 'info', variant: 'ghost', class: s.Action, onClick: () => set({ ends: defaultSliders.ends }) }, () =>
            h('span', { class: s.ActionText }, 'Use Default'))),
        ]),
        h(FieldGroup, { title: 'Balance' }, () => h('div', { 'class': s.BalanceRow, 'data-row': '' }, [
          h('div', { 'class': s.BalanceLabels, 'aria-hidden': 'true' }, [h('span', 'L'), h('span', balanceText(value.balance)), h('span', 'R')]),
          h(Slider, { 'aria-label': 'Balance', 'min': -1, 'max': 1, 'step': 0.05, 'value': value.balance, 'onUpdate:value': slid('balance') }),
        ])),
        h(FieldGroup, { 'aria-label': 'Steppers' }, () => h(Field, { row: true, label: 'Stepper', description: String(value.stepper) }, () =>
          h(Stepper, { 'value': value.stepper, 'min': 0, 'max': 10, 'decrementLabel': 'Decrease', 'incrementLabel': 'Increase', 'onUpdate:value': (stepper: number) => set({ stepper }) }))),
        h(FieldGroup, { title: 'Number' }, () => h('div', { 'class': s.NumberRow, 'data-row': '' }, [
          h(Input, { 'size': 'sm', 'variant': 'ghost', 'inputmode': 'numeric', 'class': s.NumberField, 'aria-label': 'Number', 'value': draft.value ?? String(value.number),
            'onUpdate:value': (text: string) => { draft.value = text; }, 'onBlur': commit,
            'onKeydown': (event: KeyboardEvent) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } } }),
          h(Stepper, { 'aria-label': 'Adjust Number', 'value': Math.min(100, Math.max(0, typedOr(value.number))), 'min': 0, 'max': 100, 'step': 10, 'decrementLabel': 'Less', 'incrementLabel': 'More',
            'onUpdate:value': (next: number) => { number(next); draft.value = null; } }),
        ])),
      ];
    };
  },
});

export const ChoiceCombos = defineComponent({
  name: 'ChoiceCombos',
  props: { value: { type: Object as PropType<ChoiceValue>, required: true } },
  emits: { 'update:value': (value: ChoiceValue) => typeof value === 'object', info: (option: string) => typeof option === 'string' },
  setup(props, { emit }) {
    const set = (patch: Partial<ChoiceValue>) => emit('update:value', { ...props.value, ...patch });
    return () => [
      h(RadioGroup, { 'direction': 'col', 'class': 'w-full', 'value': props.value.plain, 'aria-label': 'Choice', 'onUpdate:value': (plain: string | null) => plain && set({ plain }) }, () =>
        h(FieldGroup, null, {
          default: () => choiceOptions.map((option) => h(Field, { key: option.value, row: true, label: option.label }, () => h(RadioGroupItem, { value: option.value }))),
          footer: () => h('p', ['Footer with a link. ', learnMore()]),
        })),
      h(RadioGroup, { 'direction': 'col', 'class': 'w-full', 'value': props.value.detailed, 'aria-label': 'Choice with details', 'onUpdate:value': (detailed: string | null) => detailed && set({ detailed }) }, () =>
        h(FieldGroup, { title: 'Header' }, () => choiceOptions.map((option) =>
          h(Field, { key: option.value, row: true, label: option.label, description: 'Description' }, {
            default: () => h(RadioGroupItem, { value: option.value }),
            action: () => h(Button, { 'color': 'info', 'variant': 'ghost', 'uniform': true, 'pill': true, 'opticallyAlign': 'end', 'aria-label': `${option.label} details`, 'onClick': () => emit('info', option.value) }, () => h(InfoCircle)),
          })))),
    ];
  },
});

export const OrderCombos = defineComponent({
  name: 'OrderCombos',
  props: {
    value: { type: Object as PropType<OrderValue>, required: true },
    handles: { type: Boolean, default: true },
    handlePlacement: { type: String as PropType<'start' | 'end'>, default: undefined },
  },
  emits: { 'update:value': (value: OrderValue) => typeof value === 'object' },
  setup(props, { emit }) {
    const set = (patch: Partial<OrderValue>) => emit('update:value', { ...props.value, ...patch });
    return () => {
      const next = orderedPool.find((label) => !props.value.ordered.includes(label));
      return [
        h(FieldGroup, { 'aria-label': 'Checked rows' }, {
          default: () => h(Sortable, { 'value': props.value.checked, 'handles': props.handles, 'handlePlacement': props.handlePlacement, 'onUpdate:value': (checked: unknown[]) => set({ checked: checked as CheckedRow[] }) }, () =>
            props.value.checked.map((item) => h('div', { 'key': item.id, 'data-row': '' }, [
              h(SortableHandle, { ariaLabel: `Reorder ${item.label}` }),
              h('div', { class: s.CheckRow }, h(Checkbox, { 'variant': 'ghost', 'label': item.label, 'checked': item.on,
                'onUpdate:checked': (on: boolean | 'indeterminate') => set({ checked: props.value.checked.map((row) => (row.id === item.id ? { ...row, on: on === true } : row)) }) })),
            ]))),
          footer: () => 'Checked rows show, in this order.',
        }),
        h(FieldGroup, { title: 'Header' }, {
          default: () => [
            h(Sortable, { 'value': props.value.ordered, 'handles': props.handles, 'handlePlacement': props.handlePlacement, 'onUpdate:value': (ordered: unknown[]) => set({ ordered: ordered as string[] }) }, () =>
              props.value.ordered.map((label, index) => h('div', { 'key': label, 'data-row': '' }, [
                h(SortableHandle, { ariaLabel: `Reorder ${label}` }),
                h('div', { class: s.TextRow }, [label, h('span', { class: s.ActionDescription }, index === 0 ? 'First' : 'Description')]),
              ]))),
            h('div', { 'data-row': '' }, h(Button, { block: true, color: 'info', variant: 'ghost', class: s.Action, disabled: !next,
              onClick: () => next && set({ ordered: [...props.value.ordered, next] }) }, () => h('span', { class: s.ActionText }, 'Add Row…'))),
          ],
          footer: () => 'The first row comes first.',
        }),
      ];
    };
  },
});

// The kit's outlined icons, as everywhere in the kit (owner 14.11: «у нас везде outlined»), at a size Settings draws a tile's glyph
const symbols = { bell: Bell, globe: Globe, star: Star, heart: Heart, mic: Mic, camera: CameraPhoto };
type IconStyle = 'tile' | 'outline' | 'plain';
/** A picture in a row, which Field's `icon` slot sets in the row's image column */
const picture = (row: PictureRow, style: IconStyle) =>
  h('span', { 'class': pictureStyles.Picture, 'data-style': style, 'style': { '--app-tile': row.tile } }, [h(symbols[row.symbol])]);

export const PictureCombos = defineComponent({
  name: 'PictureCombos',
  props: {
    value: { type: Object as PropType<Record<string, boolean>>, required: true },
    iconStyle: { type: String as PropType<IconStyle>, default: 'tile' },
  },
  emits: { 'update:value': (value: Record<string, boolean>) => typeof value === 'object' },
  setup(props, { emit }) {
    const switchRow = (row: PictureRow, description?: string) =>
      h(Field, { key: row.id, row: true, label: row.label, description, class: props.value[row.id] ? undefined : pictureStyles.Off }, {
        icon: () => picture(row, props.iconStyle),
        default: () => switchOf(props.value[row.id], (on) => emit('update:value', { ...props.value, [row.id]: on })),
      });
    return () => [
      h(FieldGroup, { title: 'Header' }, () => switchPictures.map((row) => switchRow(row))),
      h(FieldGroup, { title: 'Header' }, { default: () => describedPictures.map((row) => switchRow(row, 'Description')), footer: () => 'Footer one line.' }),
      h(FieldGroup, { title: 'Header' }, {
        // Nothing to set: no control, so nothing takes the label's name
        default: () => plainPictures.map((row) => h(Field, { key: row.id, row: true, label: row.label }, { icon: () => picture(row, props.iconStyle), default: () => null })),
        footer: () => 'Nothing to set.',
      }),
    ];
  },
});

export const FooterCombos = defineComponent({
  name: 'FooterCombos',
  setup() {
    const row = () => h(Field, { row: true, label: 'Row' }, () => null);
    return () => [
      h(FieldGroup, { title: 'Header' }, { default: row, footer: () => 'Footer one line.' }),
      h(FieldGroup, { title: 'Prominent', headerProminence: 'increased' }, { default: row, footer: () => h('p', ['Footer with a link. ', learnMore()]) }),
      h(FieldGroup, { title: 'A header of a paragraph wraps to the width of the group and stands over its rows.' }, row),
      h(FieldGroup, null, {
        default: row,
        footer: () => [
          h('p', 'Footer with a list:'),
          h('ul', [h('li', 'Each item a line that starts with a bullet'), h('li', 'A longer item wraps back to the footer’s edge, under its bullet')]),
        ],
      }),
      h(FieldGroup, null, { default: row, footer: () => [h('p', 'Footer of two paragraphs.'), h('p', learnMore())] }),
    ];
  },
});
