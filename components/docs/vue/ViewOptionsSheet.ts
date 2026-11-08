import { defineComponent, h, ref, type PropType } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogHeaderAction, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { DotsHorizontal } from '@plexui/vue/components/Icon';
import { Page, PageActions, PageBar, PageContent, PageHeader, PageTitle } from '@plexui/vue/components/Page';
import { Select } from '@plexui/vue/components/Select';
import { Switch } from '@plexui/vue/components/Switch';
import { extensionNote, groupingOptions, iconSizeOptions, initialViewOptions, sortOptions, viewOptionLabel, viewOptionValue, type ViewOptions } from '../viewOptionsData';
import s from '../ViewOptionsSheet.module.css';

export const ViewOptionsSheet = defineComponent({
  name: 'ViewOptionsSheet',
  props: {
    open: { type: Boolean, required: true },
    value: { type: Object as PropType<ViewOptions>, required: true },
  },
  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
    'update:value': (value: ViewOptions) => viewOptionValue(sortOptions, value.sort) !== undefined
      && viewOptionValue(groupingOptions, value.grouping) !== undefined
      && viewOptionValue(iconSizeOptions, value.iconSize) !== undefined
      && typeof value.showExtensions === 'boolean',
  },
  setup(props, { emit, slots }) {
    const heading = ref<HTMLDivElement | null>(null);
    const update = <Key extends keyof ViewOptions>(key: Key, next: ViewOptions[Key]) => emit('update:value', { ...props.value, [key]: next });

    return () => h(Dialog, { open: props.open, 'onUpdate:open': (open: boolean) => emit('update:open', open) }, () => [
      h(DialogTrigger, null, () => slots.trigger?.() ?? h(Button, { color: 'secondary', variant: 'soft', pill: true, uniform: true, 'aria-label': 'View options' }, () => h(DotsHorizontal))),
      h(DialogContent, {
        mobileVariant: 'sheet', surface: 'grouped', showClose: false,
        onOpenAutoFocus: (event: Event) => { event.preventDefault(); heading.value?.focus({ preventScroll: true }); },
      }, () => [
        h(DialogHeader, null, () => [
          h('div', { ref: heading, tabindex: -1, class: s.Heading }, [h(DialogTitle, null, () => 'View Options')]),
          h(DialogDescription, { class: 'sr-only' }, () => 'Choose how items are sorted and displayed. Changes apply immediately.'),
          h(DialogHeaderAction, null, () => h(DialogClose, null, () =>
            // The shared confirm of a bar: the accent capsule and the checkmark of native sheets (IMG_5686).
            h(NavigationButton, { action: 'confirm', 'aria-label': 'Done' }),
          )),
        ]),
        h(DialogBody, null, () => h('div', { class: s.Sections }, [
          h(FieldGroup, { 'aria-label': 'Sorting and grouping' }, () => [
            h(Field, { row: true, label: 'Sort By' }, () => h(Select, {
              value: props.value.sort, options: sortOptions, block: false, align: 'end',
              'onUpdate:value': (candidate: unknown) => { const next = viewOptionValue(sortOptions, candidate); if (next !== undefined) update('sort', next); },
            })),
            h(Field, { row: true, label: 'Group By' }, () => h(Select, {
              value: props.value.grouping, options: groupingOptions, block: false, align: 'end',
              'onUpdate:value': (candidate: unknown) => { const next = viewOptionValue(groupingOptions, candidate); if (next !== undefined) update('grouping', next); },
            })),
          ]),
          h(FieldGroup, { 'aria-label': 'Item size' }, () => h(Field, { row: true, label: 'Icon and List Size' }, () => h(Select, {
            value: props.value.iconSize, options: iconSizeOptions, block: false, align: 'end',
            'onUpdate:value': (candidate: unknown) => { const next = viewOptionValue(iconSizeOptions, candidate); if (next !== undefined) update('iconSize', next); },
          }))),
          h(FieldGroup, { class: s.Advanced }, {
            title: () => 'Advanced',
            footer: () => extensionNote,
            default: () => h(Field, { row: true, label: 'Show All Filename Extensions' }, () => h(Switch, {
              color: 'accent', checked: props.value.showExtensions,
              'onUpdate:checked': (checked: boolean) => update('showExtensions', checked),
            })),
          }),
        ])),
      ]),
    ]);
  },
});

export const ViewOptionsSheetDemo = defineComponent({
  name: 'ViewOptionsSheetDemo',
  props: { initialOpen: { type: Boolean, default: false } },
  setup(props) {
    const open = ref(props.initialOpen);
    const value = ref(initialViewOptions());
    return () => h('div', { 'data-demo-stage': '' }, [
      h(Page, { surface: 'grouped', class: s.Screen, 'data-preview-screen': '' }, () => [
        h(PageHeader, null, () => h(PageBar, null, () => [
          h(PageTitle, null, () => 'Files'),
          h(PageActions, null, () => h(ViewOptionsSheet, {
            open: open.value, value: value.value,
            'onUpdate:open': (next: boolean) => { open.value = next; },
            'onUpdate:value': (next: ViewOptions) => { value.value = next; },
          })),
        ])),
        h(PageContent, null, () => h(FieldGroup, null, {
          title: () => 'Current view',
          footer: () => 'Open View options to change these preferences.',
          default: () => [
          h(Field, { row: true, label: 'Sort By' }, () => h('output', viewOptionLabel(sortOptions, value.value.sort))),
          h(Field, { row: true, label: 'Group By' }, () => h('output', viewOptionLabel(groupingOptions, value.value.grouping))),
          h(Field, { row: true, label: 'Icon and List Size' }, () => h('output', viewOptionLabel(iconSizeOptions, value.value.iconSize))),
          h(Field, { row: true, label: 'Filename extensions' }, () => h('output', value.value.showExtensions ? 'Shown' : 'Hidden')),
          ],
        })),
      ]),
    ]);
  },
});
