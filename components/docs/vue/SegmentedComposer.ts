import { defineComponent, h, ref, shallowRef, useId, type PropType } from 'vue';
import { DateTime } from 'luxon';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { DatePicker } from '@plexui/vue/components/DatePicker';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogHeaderAction, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Bell, Calendar, Clock, PlusCircle } from '@plexui/vue/components/Icon';
import { Input } from '@plexui/vue/components/Input';
import { SegmentedControl, SegmentedControlOption } from '@plexui/vue/components/SegmentedControl';
import { Switch } from '@plexui/vue/components/Switch';
import { Textarea } from '@plexui/vue/components/Textarea';
import { cloneComposerDrafts, composerModeLabel, createComposerDrafts, type ComposerDraft, type ComposerMode } from '../segmentedComposerData';
import s from '../SegmentedComposer.module.css';

const DAY_FORMAT = 'EEE, MMM d, yyyy';
const TIME_FORMAT = 'HH:mm';

export const SegmentedComposer = defineComponent({
  name: 'SegmentedComposer',
  props: {
    surface: { type: String as PropType<'plain' | 'grouped'>, default: 'grouped' },
    pinnedOpen: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref(false);
    const mode = ref<ComposerMode>('event');
    let saved = createComposerDrafts();
    const drafts = shallowRef(cloneComposerDrafts(saved));
    const status = ref('');
    const heading = ref<HTMLDivElement | null>(null);
    const formId = `composer-${useId()}`;
    const rowId = useId();
    const update = <Key extends keyof ComposerDraft>(key: Key, value: ComposerDraft[Key]) => {
      drafts.value = { ...drafts.value, [mode.value]: { ...drafts.value[mode.value], [key]: value } };
    };
    const cancel = () => {
      drafts.value = cloneComposerDrafts(saved);
      status.value = 'Changes canceled.';
      open.value = false;
    };
    const changeOpen = (next: boolean) => {
      if (!next) { cancel(); return; }
      drafts.value = cloneComposerDrafts(saved);
      status.value = '';
      open.value = true;
    };
    const confirm = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const draft = drafts.value[mode.value];
      if (!draft.title.trim()) return;
      const committed = { ...draft, title: draft.title.trim() };
      saved = { ...saved, [mode.value]: committed };
      drafts.value = { ...drafts.value, [mode.value]: committed };
      status.value = `${composerModeLabel(mode.value)} saved: ${committed.title}.`;
      open.value = false;
    };
    const changeMode = (next: string) => {
      if (next === 'event' || next === 'reminder') { mode.value = next; status.value = ''; }
    };
    const datePicker = (props: Record<string, unknown>) => {
      const date = drafts.value[mode.value].date;
      return h(DatePicker, {
        value: date ? DateTime.fromISO(date) : null,
        'onUpdate:value': (next: DateTime | null) => update('date', next?.toISO() ?? null),
        triggerDateFormat: DAY_FORMAT, variant: 'ghost', size: '3xl', pill: false, block: true, triggerShowIcon: false, dropdownIconType: 'none',
        ...props,
      });
    };

    return () => {
      const draft = drafts.value[mode.value];
      const start = draft.date ? DateTime.fromISO(draft.date) : null;
      const label = composerModeLabel(mode.value);
      return h('div', { 'data-demo-stage': '', class: s.Stage }, [
        h(Dialog, { open: open.value || props.pinnedOpen, 'onUpdate:open': changeOpen }, () => [
          h(DialogTrigger, null, () => h(Button, { color: 'primary', pill: true }, () => 'Create item')),
          h(DialogContent, {
            mobileVariant: 'sheet', surface: props.surface, width: 560, class: s.Composer,
            onOpenAutoFocus: (event: Event) => {
              event.preventDefault();
              if (!props.pinnedOpen) heading.value?.focus({ preventScroll: true });
            },
          }, () => [
            h(DialogHeader, { class: s.Header }, () => [
              h('div', { ref: heading, tabindex: -1, class: s.HeaderCenter }, [
                h(DialogTitle, { class: 'sr-only' }, () => 'New calendar item'),
                h(SegmentedControl, {
                  value: mode.value, 'onUpdate:value': changeMode, 'aria-label': 'Item type', block: true, pill: true, class: s.Mode,
                }, () => [
                  h(SegmentedControlOption, { value: 'event' }, () => 'Event'),
                  h(SegmentedControlOption, { value: 'reminder' }, () => 'Reminder'),
                ]),
              ]),
              h(DialogDescription, { class: 'sr-only' }, () => 'Choose a type, edit its draft, then save the local sample. Cancel discards unsaved changes.'),
              h(DialogHeaderAction, { class: s.Confirm }, () => h(NavigationButton, {
                action: 'confirm', type: 'submit', form: formId,
                disabled: !draft.title.trim(), 'aria-label': `Save ${mode.value}`,
              })),
            ]),
            h(DialogBody, { class: s.Body }, () => h('form', { id: formId, class: s.Form, onSubmit: confirm }, [
              // Calendar's composer names its fields by their placeholders alone, each field its own capsule
              // (IMG_5433, IMG_5434).
              h('div', { class: s.Capsules }, [
                h(FieldGroup, { 'aria-label': `${label} title` }, () => h('div', { 'data-row': '' }, [h(Input, {
                  variant: 'ghost', size: '3xl', class: s.Text, 'aria-label': `${label} title`, value: draft.title, placeholder: 'Title',
                  'onUpdate:value': (next: string) => update('title', next),
                })])),
                mode.value === 'event'
                  // The summary: the day at the start, the hours at the end. It opens the calendar, whose time
                  // fields set the start; the sample event lasts an hour.
                  ? h(FieldGroup, { 'aria-label': 'Date and time', bodyClass: s.RowsBody }, () => h('div', { 'data-row': '' }, [datePicker({
                      showTime: true, triggerClassName: s.Summary, ariaLabel: 'Event date and time',
                      triggerTimeFormat: start ? `${TIME_FORMAT} '– ${start.plus({ hours: 1 }).toFormat(TIME_FORMAT)}'` : TIME_FORMAT,
                    })]))
                  : h(FieldGroup, { 'aria-label': 'Notes' }, () => h('div', { 'data-row': '' }, [h(Textarea, {
                      variant: 'ghost', rows: 1, autoResize: true, class: s.Text, 'aria-label': 'Notes', value: draft.notes, placeholder: 'Notes',
                      'onUpdate:value': (next: string) => update('notes', next),
                    })])),
              ]),
              ...(mode.value === 'event'
                ? [
                    h(FieldGroup, { title: 'Location' }, () => h('div', { 'data-row': '' }, [h(Input, {
                      variant: 'ghost', size: '3xl', class: s.Text, 'aria-label': 'Location', value: draft.location, placeholder: 'Location or Video Call',
                      'onUpdate:value': (next: string) => update('location', next),
                    }, { startAdornment: () => h(PlusCircle, { class: s.Adornment, 'aria-hidden': 'true' }) })])),
                    h(FieldGroup, { title: 'Details' }, () => h('div', { 'data-row': '' }, [h(Textarea, {
                      variant: 'ghost', rows: 1, autoResize: true, class: s.Text, 'aria-label': 'Notes', value: draft.notes, placeholder: 'Notes',
                      'onUpdate:value': (next: string) => update('notes', next),
                    })])),
                  ]
                : [
                    h(FieldGroup, { title: 'Date & Time', bodyClass: s.RowsBody }, {
                      // Each row: an icon, a title and, when set, its value under the title in the accent (IMG_5434). The
                      // whole Date row opens the calendar; with Time on, the calendar's time fields set the hour.
                      default: () => [
                        h('div', { 'data-row': '', class: s.IconRow }, [
                          h(Calendar, { class: s.RowIcon, 'aria-hidden': 'true' }),
                          h('span', { id: `${rowId}-date`, class: s.RowTitle }, 'Date'),
                          datePicker({ showTime: draft.includeTime, triggerClassName: s.RowTrigger, ariaLabelledby: `${rowId}-date` }),
                        ]),
                        h('div', { 'data-row': '', class: s.IconRow }, [
                          h(Clock, { class: s.RowIcon, 'aria-hidden': 'true' }),
                          h('span', { class: s.RowText }, [
                            h('span', { id: `${rowId}-time`, class: s.RowTitle }, 'Time'),
                            draft.includeTime && start && h('span', { id: `${rowId}-time-value`, class: s.Annotation }, start.toFormat(TIME_FORMAT)),
                          ]),
                          h(Switch, {
                            color: 'accent', checked: draft.includeTime, 'onUpdate:checked': (next: boolean) => update('includeTime', next),
                            'aria-labelledby': `${rowId}-time`, 'aria-describedby': draft.includeTime && start ? `${rowId}-time-value` : undefined,
                          }),
                        ]),
                        h('div', { 'data-row': '', class: s.IconRow }, [
                          h(Bell, { class: s.RowIcon, 'aria-hidden': 'true' }),
                          h('span', { class: s.RowText }, [h('span', { id: `${rowId}-urgent`, class: s.RowTitle }, 'Urgent')]),
                          h(Switch, {
                            color: 'accent', checked: draft.urgent, 'onUpdate:checked': (next: boolean) => update('urgent', next),
                            'aria-labelledby': `${rowId}-urgent`,
                          }),
                        ]),
                      ],
                      footer: () => 'Mark this reminder as urgent to set an alarm.',
                    }),
                  ]),
              props.pinnedOpen && h('p', { role: 'status', class: s.Status }, status.value),
            ])),
          ]),
        ]),
        !props.pinnedOpen && h('p', { role: 'status', class: s.Status }, status.value),
      ]);
    };
  },
});
