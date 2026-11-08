import { defineComponent, h, ref, useId, watch, type Component, type PropType } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@plexui/vue/components/Dialog';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Disclosure, Email, Fingerprint, InfoCircle, Key, Phone, ShieldKey } from '@plexui/vue/components/Icon';
import { Toolbar, ToolbarLeading, ToolbarTrailing } from '@plexui/vue/components/Toolbar';
import { useBreakpoint } from '@plexui/vue/composables/useBreakpoints';
import { aboutSignInMethods, setupIntro, setupMethods, type SetupChoicesLayout, type SetupMethod, type SetupMethodId } from '../setupChoicesData';
import s from '../SetupChoicesSheet.module.css';

const methodIcons: Record<SetupMethodId, Component> = { email: Email, phone: Phone, passkey: Fingerprint, 'security-key': Key };

/** The sheet shows the choices, or the step one of them opened. */
type Step = 'choices' | 'about' | SetupMethodId;

/**
 * Rows that open the next step: a leading icon, a title, an optional subtitle and a disclosure chevron. The whole
 * row is one button. On a phone the step replaces the choices in the same sheet, with Back where Close was.
 */
export const SetupChoicesSheet = defineComponent({
  name: 'SetupChoicesSheet',
  props: {
    open: { type: Boolean, required: true },
    /** `grouped`: the rows share one group, as in iOS Set Up eSIM. `separate`: each row is its own rounded cell. */
    layout: { type: String as PropType<SetupChoicesLayout>, default: 'grouped' },
    /** A secondary line under each row title. */
    subtitles: { type: Boolean, default: false },
  },
  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
    /** A method step was confirmed; the sheet then closes. */
    add: (method: SetupMethod) => setupMethods.includes(method),
  },
  setup(props, { emit, slots }) {
    const wide = useBreakpoint('md');
    const step = ref<Step>('choices');
    const heading = ref<HTMLDivElement | null>(null);
    const choices = ref<HTMLDivElement | null>(null);
    // Back returns focus to the control that opened the step, which the choices render again.
    let returnTo: Step | null = null;
    // A step that opens moves focus to its heading.
    let focusHeading = false;
    const subtitleId = useId();

    // After the DOM update, before the removed Back button leaves focus nowhere.
    watch(step, () => {
      if (focusHeading) heading.value?.focus({ preventScroll: true });
      else if (returnTo) choices.value?.querySelector<HTMLElement>(`[data-setup-step="${returnTo}"]`)?.focus({ preventScroll: true });
      focusHeading = false;
      returnTo = null;
    }, { flush: 'post' });

    const changeOpen = (next: boolean) => {
      if (next) step.value = 'choices';
      emit('update:open', next);
    };
    const go = (next: Step) => () => {
      focusHeading = true;
      step.value = next;
    };
    const back = () => {
      returnTo = step.value;
      step.value = 'choices';
    };
    const close = () => h(DialogClose, null, () => h(NavigationButton, { action: 'close', 'aria-label': 'Close dialog' }));

    return () => {
      const current = step.value;
      const method = current === 'choices' || current === 'about' ? undefined : setupMethods.find((candidate) => candidate.id === current);
      const heroIcon = method ? methodIcons[method.id] : current === 'about' ? InfoCircle : ShieldKey;
      const title = method?.title ?? (current === 'about' ? aboutSignInMethods.title : setupIntro.title);
      const groups = props.layout === 'grouped' ? [setupMethods] : setupMethods.map((item) => [item]);

      return h(Dialog, { open: props.open, 'onUpdate:open': changeOpen }, () => [
        h(DialogTrigger, null, () => slots.trigger?.() ?? h(Button, { color: 'primary', pill: true }, () => 'Add sign-in method')),
        h(DialogContent, {
          mobileVariant: 'sheet', surface: 'plain', width: 480, showClose: wide.value, class: s.Sheet,
          onOpenAutoFocus: (event: Event) => { event.preventDefault(); heading.value?.focus({ preventScroll: true }); },
        }, () => [
          // A phone Sheet: Close on the choices, Back and Close on a step. The toolbar takes no space from 768px.
          h(Toolbar, null, () => [
            h(ToolbarLeading, null, () => current === 'choices' ? close() : h(NavigationButton, { action: 'back', onClick: back })),
            current !== 'choices' && h(ToolbarTrailing, null, () => close()),
          ]),
          h(DialogBody, { class: s.Body }, () => [
            // The step's own heading leads the content, as in the native setup sheets: no title bar.
            h('div', { class: s.Hero }, [
              h(heroIcon, { class: s.HeroIcon, 'aria-hidden': 'true' }),
              h('div', { ref: heading, tabindex: -1, class: s.Heading }, [h(DialogTitle, { class: s.Title }, () => title)]),
              h(DialogDescription, { class: s.Description }, () => method?.detail ?? (current === 'about' ? aboutSignInMethods.paragraphs[0] : setupIntro.description)),
            ]),
            current === 'choices' && h('div', { ref: choices, class: s.Choices }, [
              h('div', null, [h(Button, { color: 'info', variant: 'ghost', class: s.Info, 'data-setup-step': 'about', onClick: go('about') }, () => [h(InfoCircle), 'About sign-in methods'])]),
              h('div', { class: s.Rows, 'data-layout': props.layout }, groups.map((group) => h(FieldGroup, {
                key: group.map((item) => item.id).join(), bodyClass: s.RowsBody, 'aria-label': props.layout === 'grouped' ? 'Sign-in methods' : undefined,
              }, () => group.map((item) => h('div', { key: item.id, 'data-row': '' }, [
                h(Button, {
                  block: true, color: 'secondary', variant: 'ghost', class: s.Row, 'data-setup-step': item.id,
                  'aria-describedby': props.subtitles ? `${subtitleId}-${item.id}` : undefined, onClick: go(item.id),
                }, () => h('span', { class: s.RowContent }, [
                  h(methodIcons[item.id], { class: s.RowIcon, 'aria-hidden': 'true' }),
                  h('span', { class: s.RowText }, [
                    h('span', { class: s.RowTitle }, item.title),
                    // The row is named by its title and described by its subtitle, so the subtitle is read once.
                    props.subtitles && h('span', { id: `${subtitleId}-${item.id}`, 'aria-hidden': 'true', class: s.RowSubtitle }, item.subtitle),
                  ]),
                  h(Disclosure, { class: s.Disclosure, 'aria-hidden': 'true' }),
                ])),
              ]))))),
            ]),
            current === 'about' && aboutSignInMethods.paragraphs.slice(1).map((paragraph) => h('p', { key: paragraph, class: s.Paragraph }, paragraph)),
          ]),
          (method || (current === 'about' && wide.value)) && h(DialogFooter, null, () => [
            wide.value && h(Button, { color: 'secondary', variant: 'soft', onClick: back }, () => 'Back'),
            method && h(Button, { color: 'primary', onClick: () => { emit('add', method); emit('update:open', false); } }, () => `Add ${method.title}`),
          ]),
        ]),
      ]);
    };
  },
});

/** The sheet over a page stage that reports the added method. */
export const SetupChoicesDemo = defineComponent({
  name: 'SetupChoicesDemo',
  props: {
    initialOpen: { type: Boolean, default: false },
    layout: { type: String as PropType<SetupChoicesLayout>, default: 'grouped' },
    subtitles: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref(props.initialOpen);
    const status = ref('');
    return () => h('div', { 'data-demo-stage': '', class: s.Stage }, [
      h(SetupChoicesSheet, {
        open: props.initialOpen || open.value, layout: props.layout, subtitles: props.subtitles,
        'onUpdate:open': (next: boolean) => { open.value = next; },
        onAdd: (method: SetupMethod) => { status.value = `${method.title} added in this preview.`; },
      }),
      h('p', { role: 'status', class: s.Status }, status.value),
    ]);
  },
});
