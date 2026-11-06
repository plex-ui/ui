import { defineComponent, h, ref, shallowRef, useId, type PropType } from 'vue';
import { DateTime } from 'luxon';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { DatePicker } from '@plexui/vue/components/DatePicker';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogHeaderAction, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Input } from '@plexui/vue/components/Input';
import { SegmentedControl, SegmentedControlOption } from '@plexui/vue/components/SegmentedControl';
import { Switch } from '@plexui/vue/components/Switch';
import { Textarea } from '@plexui/vue/components/Textarea';
import { cloneComposerDrafts, composerModeLabel, createComposerDrafts, type ComposerDraft, type ComposerMode } from '../segmentedComposerData';
import s from '../SegmentedComposer.module.css';

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
    const datePicker = (label: string, showTime: boolean) => {
      const date = drafts.value[mode.value].date;
      return h(DatePicker, {
        value: date ? DateTime.fromISO(date) : null,
        'onUpdate:value': (next: DateTime | null) => update('date', next?.toISO() ?? null),
        showTime, variant: 'ghost', pill: false, triggerShowIcon: false, ariaLabel: label,
      });
    };

    return () => {
      const draft = drafts.value[mode.value];
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
              h(FieldGroup, { 'aria-label': `${label} details` }, () => [
                h(Field, { row: true, orientation: 'vertical', label: `${label} title` }, () => h(Input, {
                  variant: 'ghost', value: draft.title, placeholder: `Name this ${mode.value}`,
                  'onUpdate:value': (next: string) => update('title', next),
                })),
                h(Field, { row: true, orientation: 'vertical', label: 'Notes' }, () => h(Textarea, {
                  variant: 'ghost', rows: 2, autoResize: true, value: draft.notes, placeholder: 'Add notes',
                  'onUpdate:value': (next: string) => update('notes', next),
                })),
              ]),
              mode.value === 'event'
                ? h(FieldGroup, { title: 'Date and location' }, () => [
                    h(Field, { row: true, label: 'Starts' }, () => datePicker('Event start', true)),
                    h(Field, { row: true, orientation: 'vertical', label: 'Location' }, () => h(Input, {
                      variant: 'ghost', value: draft.location, placeholder: 'Add a place or video link',
                      'onUpdate:value': (next: string) => update('location', next),
                    })),
                  ])
                : h(FieldGroup, { title: 'Date and time' }, {
                    default: () => [
                    h(Field, { row: true, label: 'Due' }, () => datePicker('Reminder due date', draft.includeTime)),
                    h(Field, { row: true, label: 'Time' }, () => h(Switch, {
                      color: 'accent', checked: draft.includeTime, 'onUpdate:checked': (next: boolean) => update('includeTime', next),
                    })),
                    h(Field, { row: true, label: 'Urgent' }, () => h(Switch, {
                      color: 'accent', checked: draft.urgent, 'onUpdate:checked': (next: boolean) => update('urgent', next),
                    })),
                    ],
                    footer: () => 'Use the urgent flag for a reminder that needs attention.',
                  }),
              props.pinnedOpen && h('p', { role: 'status', class: s.Status }, status.value),
            ])),
          ]),
        ]),
        !props.pinnedOpen && h('p', { role: 'status', class: s.Status }, status.value),
      ]);
    };
  },
});
