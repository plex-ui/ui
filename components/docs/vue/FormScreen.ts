import { defineComponent, h, ref, useId as vueId, type PropType } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@plexui/vue/components/Dialog';
import { Page, PageContent, PageFooter } from '@plexui/vue/components/Page';
import { Toolbar, ToolbarContent, ToolbarLeading, ToolbarTitle } from '@plexui/vue/components/Toolbar';
import { VueDemoBackButton } from './VueDemoBackButton';
import { useDialogStagePresence as createDialogStagePresence } from './useDialogStagePresence';
import s from '../FormRowsDemos.module.css';

/** Presentation only: the calling form owns every value and selection. */
export const FormScreen = defineComponent({
  name: 'FormScreen',
  props: {
    title: { type: String, required: true },
    submitLabel: String,
    dialog: { type: Boolean, default: false },
    surface: { type: String as PropType<'plain' | 'grouped'>, default: 'grouped' },
    wide: { type: Boolean, default: false },
    fill: { type: Boolean, default: false },
    phonePreview: { type: Boolean, default: false },
    phoneHost: { type: Boolean, default: false },
  },
  emits: ['update:dialog'],
  setup(props, { slots, emit }) {
    const formId = `form-screen-${vueId()}`;
    const heading = ref<HTMLElement | null>(null);
    const presence = createDialogStagePresence(() => props.dialog, () => !props.phoneHost);
    const close = () => { if (!props.phonePreview) emit('update:dialog', false); };
    const form = () => h('form', {
      id: formId, class: ['flex flex-col gap-6 [--field-group-gap:13px]', props.fill && s.FillForm],
      onSubmit: (event: Event) => { event.preventDefault(); if (props.dialog) close(); },
    }, slots.default);
    const submit = () => h(Button, {
      // A desktop form ends with its action at the end, as the dialog's footer does; a phone takes the bottom Toolbar
      color: 'primary', pill: true,
      type: 'submit', form: formId,
    }, () => props.submitLabel);
    // The phone action: a bottom Toolbar takes the place of the footer.
    const phoneSubmit = () => h(Toolbar, { placement: 'bottom' }, () => h(ToolbarContent, { fill: true }, () =>
      h(Button, { color: 'primary', pill: true, block: true, type: 'submit', form: formId }, () => props.submitLabel)));
    return () => presence.present.value
      ? h(Dialog, { open: presence.open.value, 'onUpdate:open': (open: boolean) => { if (!open) close(); } }, () =>
          h(DialogContent, {
            mobileVariant: 'sheet', surface: props.surface, width: props.wide ? 600 : 480,
            class: s.FormDialog,
            onCloseAutoFocus: presence.onCloseAutoFocus,
            onOpenAutoFocus: (event: Event) => { presence.onOpenAutoFocus(event);
              event.preventDefault();
              if (!props.phonePreview) heading.value?.focus({ preventScroll: true });
            },
          }, () => [
            h(Toolbar, null, () => [
              h(ToolbarLeading, null, () => h(DialogClose, null, () => h(NavigationButton, { action: 'close', 'aria-label': 'Close dialog' }))),
              h(ToolbarTitle, null, () => props.title),
            ]),
            h(DialogHeader, null, () => [
              h('div', { ref: heading, tabindex: -1 }, [h(DialogTitle, null, () => props.title)]),
              h(DialogDescription, { class: 'sr-only' }, () => 'Review and edit these details.'),
            ]),
            h(DialogBody, { class: props.fill ? s.FillContent : undefined }, form),
            props.submitLabel && h(DialogFooter, null, () => [
              h(Button, { color: 'secondary', variant: 'outline', pill: true, onClick: close }, () => 'Cancel'),
              submit(),
            ]),
            props.submitLabel && phoneSubmit(),
          ]),
        )
      : h(Page, { ref: presence.pageRef, tabindex: -1, role: 'region', 'aria-label': props.title, surface: props.surface, class: 'h-dvh', 'data-form-screen': '', 'data-form-width': props.wide ? 'wide' : undefined }, () => [
          h(Toolbar, null, () => [
            h(ToolbarLeading, null, () => h(VueDemoBackButton)),
            h(ToolbarTitle, null, () => props.title),
          ]),
          h(PageContent, { fill: props.fill, 'data-form-content': '', 'data-form-content-fill': props.fill || undefined }, form),
          props.submitLabel && h(PageFooter, { 'data-form-footer': '' }, submit),
          props.submitLabel && phoneSubmit(),
        ]);
  },
});
