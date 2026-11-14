import { computed, defineComponent, h, ref } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Disclosure, SearchSm } from '@plexui/vue/components/Icon';
import { IndexBar } from '@plexui/vue/components/IndexBar';
import { Input } from '@plexui/vue/components/Input';
import { RadioGroup, RadioGroupItem } from '@plexui/vue/components/RadioGroup';
import { Toolbar, ToolbarContent, ToolbarLeading, ToolbarTitle } from '@plexui/vue/components/Toolbar';
import { useBreakpoint } from '@plexui/vue/composables/useBreakpoints';
import { rowButtonClassName } from '../phoneRowsTemplate';
import { filterRegions, jumpToRegion } from '../settingsRegionData';
import s from '../SettingsVoiceDemo.module.css';

/** Vue port of SettingsRegionFields.tsx: a long choice in a sheet (IMG_5950). */
export const SettingsRegionFields = defineComponent({
  name: 'SettingsRegionFields',
  props: {
    value: { type: String, required: true },
    phonePreview: { type: Boolean, default: false },
    phoneHost: { type: Boolean, default: false },
  },
  emits: { 'update:value': (value: string) => typeof value === 'string' },
  setup(props, { emit }) {
    const open = ref(false);
    const query = ref('');
    const list = ref<HTMLElement | null>(null);
    const wide = useBreakpoint('md');
    const sections = computed(() => filterRegions(query.value));
    const close = () => { open.value = false; query.value = ''; };
    const choose = (region: string | null) => { if (region) emit('update:value', region); close(); };
    // A tap on the country already chosen changes nothing, yet it closes the sheet as any choice does
    const closeOnChosen = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[role="radio"]')?.getAttribute('aria-checked') === 'true') close();
    };
    const search = () => h(Input, { variant: 'soft', pill: true, placeholder: 'Search', 'aria-label': 'Search regions', value: query.value,
      'onUpdate:value': (next: string) => { query.value = next; } }, { startAdornment: () => h(SearchSm) });
    return () => {
      const phone = props.phonePreview || props.phoneHost || !wide.value;
      return h(FieldGroup, { 'aria-label': 'Region' }, () => h('div', { 'data-row': '' }, [
        h(Dialog, { open: open.value, 'onUpdate:open': (next: boolean) => { open.value = next; if (!next) query.value = ''; } }, () => [
          h(DialogTrigger, null, () => h(Button, { block: true, color: 'secondary', variant: 'ghost', class: `${rowButtonClassName} ${s.Action}`, 'aria-label': `Region: ${props.value}` }, () =>
            h('span', { class: s.ValueRowContent }, ['Region', h('span', { class: s.ValueRowValue }, props.value), h(Disclosure, { 'data-no-autosize': '' })]))),
          h(DialogContent, { mobileVariant: 'sheet', surface: 'plain', width: 420 }, () => [
            phone ? h(Toolbar, null, () => [
              h(ToolbarLeading, null, () => h(DialogClose, null, () => h(NavigationButton, { action: 'close' }))),
              h(ToolbarTitle, null, () => 'Select Region'),
            ]) : null,
            h(DialogHeader, null, () => h(DialogTitle, null, () => 'Select Region')),
            h(DialogBody, null, () => [
              // On a desktop the search stands over the list; on a phone it is the bar at the bottom
              phone ? null : h('div', { class: s.ChoiceSearch }, search()),
              h('div', { ref: list, class: s.ChoiceList, onClick: closeOnChosen }, [
              h(RadioGroup, { direction: 'col', class: 'w-full', value: props.value, 'aria-label': 'Region', 'onUpdate:value': choose }, () =>
                sections.value.map(({ letter, names }) => h(FieldGroup, { key: letter, title: letter, 'data-section': letter }, () =>
                  names.map((name) => h(Field, { key: name, row: true, label: name }, () => h(RadioGroupItem, { value: name })))))),
              sections.value.length === 0 ? h('p', { class: s.ActionDescription }, `No regions match “${query.value}”.`) : null,
              ]),
            ]),
            // The index serves the whole list; a search narrows it, so the index steps aside
            query.value ? null : h(IndexBar, { items: sections.value.map(({ letter }) => letter), onSelect: (letter: string) => jumpToRegion(list.value, letter) }),
            phone ? h(Toolbar, { placement: 'bottom' }, () => h(ToolbarContent, { fill: true }, search)) : null,
          ]),
        ]),
      ]));
    };
  },
});
