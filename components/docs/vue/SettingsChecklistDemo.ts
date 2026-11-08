import { defineComponent, h, ref, watch, type PropType, type VNode } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { Checkbox } from '@plexui/vue/components/Checkbox';
import { Field } from '@plexui/vue/components/Field';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { Disclosure } from '@plexui/vue/components/Icon';
import { Menu, MenuCheckboxItem, MenuContent, MenuTrigger } from '@plexui/vue/components/Menu';
import { DropdownIcon } from '@plexui/vue/components/SelectControl';
import { Toolbar, ToolbarLeading, ToolbarTitle } from '@plexui/vue/components/Toolbar';
import { TransitionGroup } from '@plexui/vue/components/Transition';
import { Page, PageContent } from '@plexui/vue/components/Page';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@plexui/vue/components/Dialog';
import { useBreakpoint as breakpoint } from '@plexui/vue/composables/useBreakpoints';
import { VueDemoBackButton } from './VueDemoBackButton';
import { checklistSettings, checklistSummary, initialChecklistSelection, type SettingId } from '../settingsChecklistData';
import { hideExitingSettingsScreen, settingsNavigationTiming, showEnteringSettingsScreen } from '../settingsChecklistMotion';
import s from '../SettingsChecklistDemo.module.css';
import motionStyles from '../DemoNavigation.module.css';
import { useDialogStagePresence as createDialogStagePresence } from './useDialogStagePresence';
import authStyles from '../AuthFormStage.module.css';

export const SettingsChecklistDemo = defineComponent({
  name: 'SettingsChecklistDemo',
  props: {
    dialog: { type: Boolean, default: false },
    surface: { type: String as PropType<'plain' | 'grouped'>, default: 'grouped' },
    phonePreview: { type: Boolean, default: false },
    phoneHost: { type: Boolean, default: false },
  },
  emits: ['update:dialog'],
  setup(props, { emit }) {
    const wide = breakpoint('md');
    const presence = createDialogStagePresence(() => props.dialog, () => !props.phoneHost);
    const active = ref<SettingId | null>(null);
    const navigation = ref({ step: 0, direction: 'forward', scrollOffset: 0 });
    const selection = ref(initialChecklistSelection());
    const stage = ref<HTMLElement | null>(null);
    const contentRoot = ref<HTMLElement | null>(null);
    const title = ref<HTMLElement | null>(null);
    let savedScroll = 0;

    watch(active, (current, previous) => {
      const content = contentRoot.value ?? stage.value?.querySelector<HTMLElement>('[data-settings-content]');
      if (current) {
        if (content) content.scrollTop = 0;
        (title.value ?? stage.value?.querySelector<HTMLElement>('[data-settings-title]'))?.focus({ preventScroll: true });
      } else if (previous) {
        if (content) content.scrollTop = savedScroll;
        (contentRoot.value ?? stage.value)?.querySelector<HTMLButtonElement>(`[data-settings-step="${navigation.value.step}"] [data-setting="${previous}"]`)?.focus({ preventScroll: true });
      }
    }, { flush: 'post' });

    const open = (id: SettingId) => {
      savedScroll = (contentRoot.value ?? stage.value?.querySelector<HTMLElement>('[data-settings-content]'))?.scrollTop ?? 0;
      navigation.value = { step: navigation.value.step + 1, direction: 'forward', scrollOffset: -savedScroll };
      active.value = id;
    };

    const returnToSettings = () => {
      const scroll = (contentRoot.value ?? stage.value?.querySelector<HTMLElement>('[data-settings-content]'))?.scrollTop ?? 0;
      navigation.value = { step: navigation.value.step + 1, direction: 'back', scrollOffset: savedScroll - scroll };
      active.value = null;
    };

    const toggle = (id: SettingId, value: string, checked: boolean) => {
      const values = selection.value[id];
      selection.value = { ...selection.value, [id]: checked ? [...values, value] : values.filter((item) => item !== value) };
    };

    return () => {
      const phone = props.phonePreview || props.phoneHost || !wide.value;
      // Only a phone navigates into a setting; on desktop a row opens a menu of checkboxes.
      const setting = phone ? checklistSettings.find((item) => item.id === active.value) : undefined;
      const desktopRoot = !phone && !props.dialog;
      const row = (id: SettingId, label: string, summary: string, disabled: boolean | undefined, trailing: () => VNode, onClick?: () => void) => h(Button, {
        type: 'button', color: 'secondary', variant: 'ghost', block: true,
        class: s.RowButton, 'data-setting': id, disabled,
        'aria-label': `${label}: ${summary}`, onClick,
      }, () => h('span', { class: s.RowContent }, [
        h('span', { class: s.RowText }, [
          h('span', { class: s.RowLabel }, label),
          h('span', { class: s.RowValue }, summary),
        ]),
        trailing(),
      ]));
      const fields = () => setting
            ? h(FieldGroup, { key: setting.id, 'aria-label': setting.label }, {
                footer: () => 'Choose the updates you want to receive.',
                default: () => setting.options.map((option) => h(Field, { key: option.value, row: true, label: option.label }, () =>
                  h(Checkbox, {
                    variant: 'ghost', checked: selection.value[setting.id].includes(option.value),
                    'onUpdate:checked': (checked: boolean | 'indeterminate') => toggle(setting.id, option.value, checked === true),
                  }),
                )),
              })
            : h(FieldGroup, { title: desktopRoot ? 'Notifications' : undefined, 'aria-label': desktopRoot ? undefined : 'Notification settings' }, () =>
                checklistSettings.map((item) => {
                  const summary = checklistSummary(item, selection.value[item.id]);
                  return h('div', { key: item.id, 'data-row': '' }, [phone
                    ? row(item.id, item.label, summary, item.disabled, () => h(Disclosure, { class: s.Disclosure, 'data-no-autosize': '' }), () => open(item.id))
                    : h(Menu, null, () => [
                      h(MenuTrigger, null, () => row(item.id, item.label, summary, item.disabled, () => h(DropdownIcon, { iconType: 'dropdown' }))),
                      h(MenuContent, { align: 'end' }, () => item.options.map((option) => h(MenuCheckboxItem, {
                        key: option.value, checked: selection.value[item.id].includes(option.value),
                        'onUpdate:checked': (checked: boolean) => toggle(item.id, option.value, checked),
                        onSelect: (event: Event) => event.preventDefault(),
                      }, () => option.label))),
                    ]),
                  ]);
                }),
              );
      // Capture this render's identity so a retained outgoing VNode keeps its own screen.
      const { step, direction, scrollOffset } = navigation.value;
      const screen = active.value ?? 'root';
      const transition = { ...settingsNavigationTiming, overlay: true, onExit: hideExitingSettingsScreen, onEnter: showEnteringSettingsScreen };
      const content = () => h('div', { class: motionStyles.Viewport, 'data-demo-navigation-direction': direction, 'data-settings-direction': direction }, [
        h(TransitionGroup, { ...transition, class: [s.ContentTransition, motionStyles.Content], transitionId: 'settings-content',
          style: { '--settings-exit-scroll-offset': `${scrollOffset}px` },
        }, () => h('div', { key: step, 'data-settings-screen': screen, 'data-settings-step': step }, [fields()])),
      ]);
      // Both screens of a Page show Back, so it stays in place; in a Dialog the root's Close and Back change places.
      const back = () => h('span', { class: s.BackViewport, 'data-demo-navigation-direction': direction, 'data-settings-direction': direction, 'data-demo-navigation-same': '' }, [h(TransitionGroup, { ...transition, class: [s.BarTransition, motionStyles.Bar] }, () => h(VueDemoBackButton, {
        key: step,
        onBack: setting ? returnToSettings : undefined,
        label: setting ? 'Back to notifications' : undefined,
      }))]);
      const label = setting?.label ?? 'Notifications';
      const titleContent = () => [
        h('span', { class: 'sr-only' }, label),
        h('span', { 'aria-hidden': 'true', class: [s.BarViewport, motionStyles.BarViewport], 'data-demo-navigation-direction': direction, 'data-settings-direction': direction }, [
          h(TransitionGroup, { ...transition, class: [s.BarTransition, motionStyles.Bar] }, () => h('span', { key: step }, label)),
        ]),
      ];
      const dialogAction = () => h('span', { class: s.BackViewport, 'data-demo-navigation-direction': direction, 'data-settings-direction': direction }, [
        h(TransitionGroup, { ...transition, class: [s.BarTransition, motionStyles.Bar] }, () => h('span', {
          key: step,
        }, [setting
          ? h(VueDemoBackButton, { onBack: returnToSettings, label: 'Back to notifications' })
          : h(DialogClose, null, () => h(NavigationButton, { action: 'close', 'aria-label': 'Close dialog' })),
        ])),
      ]);
      if (presence.present.value) return h(Dialog, {
        open: presence.open.value,
        'onUpdate:open': (open: boolean) => { if (!props.phonePreview) emit('update:dialog', open); },
      }, () => h(DialogContent, {
        mobileVariant: 'sheet', surface: props.surface, showClose: !phone,
        class: [authStyles.Sheet, s.Dialog],
        onCloseAutoFocus: presence.onCloseAutoFocus,
        onOpenAutoFocus: (event: Event) => { presence.onOpenAutoFocus(event); event.preventDefault(); },
      }, () => [
        phone && h(Toolbar, null, () => [
          h(ToolbarLeading, null, dialogAction),
          h(ToolbarTitle, null, titleContent),
        ]),
        h(DialogHeader, null, () => [
          h('div', { ref: title, 'data-settings-title': '', tabindex: -1 }, [h(DialogTitle, null, () => label)]),
          h(DialogDescription, { class: 'sr-only' }, () => 'Choose your notification preferences.'),
        ]),
        h(DialogBody, { class: s.DialogBody }, () => h('div', { ref: contentRoot, class: s.DialogContent, 'data-settings-content': '' }, [content()])),
      ]));
      return h('div', { ref: stage, 'data-demo-stage': '', class: s.Stage }, [
        h(Page, { ref: presence.pageRef, tabindex: -1, role: 'region', 'aria-label': setting?.label ?? 'Notifications', surface: props.surface, class: s.Screen, 'data-settings-root': desktopRoot ? '' : undefined, 'data-settings-direction': direction }, () => [
          phone && h(Toolbar, null, () => [
            h(ToolbarLeading, null, back),
            h(ToolbarTitle, { 'data-settings-title': '', tabindex: -1 }, titleContent),
          ]),
          h(PageContent, { 'data-settings-content': '' }, content),
        ]),
      ]);
    };
  },
});
