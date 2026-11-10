import { defineComponent, h, nextTick, ref, shallowRef, useId, type PropType } from 'vue';
import { DateTime } from 'luxon';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { DatePicker } from '@plexui/vue/components/DatePicker';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogHeaderAction, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Bell, Calendar, Clock, PlusCircle } from '@plexui/vue/components/Icon';
import { Input } from '@plexui/vue/components/Input';
import { SegmentedControl, SegmentedControlOption } from '@plexui/vue/components/SegmentedControl';
import { Select } from '@plexui/vue/components/Select';
import { Switch } from '@plexui/vue/components/Switch';
import { Textarea } from '@plexui/vue/components/Textarea';
import {
  COMPOSER_REPEATS, cloneComposerDrafts, composerEndBeforeStart, composerModeLabel, composerSummaryHours, createComposerDrafts,
  moveComposerEnd, moveComposerStart, type ComposerDraft, type ComposerMode,
} from '../segmentedComposerData';
import s from '../SegmentedComposer.module.css';

const DAY_FORMAT = 'EEE, MMM d, yyyy';
const ROW_DAY_FORMAT = 'MMM d, yyyy';
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
    const startId = `${rowId}-starts`;
    // Calendar shows a new event's time as one summary; a tap opens it into the rows that set it (IMG_5433, IMG_5641).
    const timeOpen = ref(false);
    const update = <Key extends keyof ComposerDraft>(key: Key, value: ComposerDraft[Key]) => {
      drafts.value = { ...drafts.value, [mode.value]: { ...drafts.value[mode.value], [key]: value } };
    };
    const changeStart = (next: DateTime | null) => {
      const current = drafts.value[mode.value];
      drafts.value = { ...drafts.value, [mode.value]: { ...current, ...moveComposerStart(current, next) } };
    };
    const openTime = () => {
      timeOpen.value = true;
      void nextTick(() => document.getElementById(startId)?.focus());
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
      timeOpen.value = false;
      open.value = true;
    };
    const confirm = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const draft = drafts.value[mode.value];
      if (!draft.title.trim() || (mode.value === 'event' && composerEndBeforeStart(draft))) return;
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
      const end = draft.end ? DateTime.fromISO(draft.end) : null;
      const endBeforeStart = mode.value === 'event' && composerEndBeforeStart(draft);
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
                disabled: !draft.title.trim() || endBeforeStart, 'aria-label': `Save ${mode.value}`,
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
                ...(mode.value === 'event' ? (timeOpen.value ? [
                  // Starts and Ends: a date and a time, each its own capsule. Native's time capsule opens a wheel; until
                  // PlexUI has one, either capsule opens the calendar with its time fields. All-day leaves the dates.
                  h(FieldGroup, { 'aria-label': 'Date and time' }, () => [
                    h(Field, { row: true, label: 'Starts', id: startId }, () => h(DatePicker, {
                      value: start, 'onUpdate:value': changeStart, showTime: !draft.allDay, triggerDateFormat: ROW_DAY_FORMAT,
                      triggerTimeFormat: draft.allDay ? undefined : TIME_FORMAT, triggerShowIcon: false,
                    })),
                    // An end before the start is struck through, as Calendar shows it, and Save waits for a later end.
                    h(Field, { row: true, label: 'Ends' }, () => h(DatePicker, {
                      value: end, 'onUpdate:value': (next: DateTime | null) => update('end', moveComposerEnd(drafts.value[mode.value], next)), showTime: !draft.allDay,
                      triggerDateFormat: ROW_DAY_FORMAT, triggerTimeFormat: draft.allDay ? undefined : TIME_FORMAT, triggerShowIcon: false,
                      triggerClassName: endBeforeStart ? s.Struck : undefined, 'aria-describedby': endBeforeStart ? `${rowId}-ends-early` : undefined,
                    })),
                    h(Field, { row: true, label: 'All-day' }, () => h(Switch, {
                      color: 'accent', checked: draft.allDay, 'onUpdate:checked': (next: boolean) => update('allDay', next),
                    })),
                    h(Field, { row: true, label: 'Repeat' }, () => h(Select, {
                      value: draft.repeat, options: COMPOSER_REPEATS, block: false, align: 'end',
                      'onUpdate:value': (next: unknown) => { if (typeof next === 'string') update('repeat', next); },
                    })),
                  ]),
                  endBeforeStart && h('span', { id: `${rowId}-ends-early`, class: 'sr-only' }, 'The event ends before it starts.'),
                ] : [
                  // The summary: the day at the start, the hours at the end (IMG_5433).
                  h(FieldGroup, { 'aria-label': 'Date and time', bodyClass: s.RowsBody }, () => h('div', { 'data-row': '' }, [h(Button, {
                    block: true, color: 'primary', variant: 'ghost', size: '3xl', pill: false, class: s.Summary, 'aria-expanded': 'false', onClick: openTime,
                  }, () => [
                    h('span', { class: s.SummaryDay }, start?.toFormat(DAY_FORMAT) ?? 'Date'),
                    // Read as one phrase; out of the flow, so the day and the hours keep the row's two ends.
                    h('span', { class: 'sr-only' }, ', '),
                    h('span', { class: s.SummaryHours }, composerSummaryHours(draft)),
                  ])])),
                ]) : [h(FieldGroup, { 'aria-label': 'Notes' }, () => h('div', { 'data-row': '' }, [h(Textarea, {
                      variant: 'ghost', rows: 1, autoResize: true, class: s.Text, 'aria-label': 'Notes', value: draft.notes, placeholder: 'Notes',
                      'onUpdate:value': (next: string) => update('notes', next),
                    })]))]),
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
