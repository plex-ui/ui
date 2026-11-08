import { defineComponent, h, provide, ref, useId as vueId, type PropType, type VNode } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import { X } from '@plexui/vue/components/Icon';
import {
    Dialog,
    DialogClose,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@plexui/vue/components/Dialog';
import { Page, PageContent } from '@plexui/vue/components/Page';
import { Toolbar, ToolbarContent, ToolbarLeading } from '@plexui/vue/components/Toolbar';
import { VueDemoBackButton } from './VueDemoBackButton';
import { authMobileKey } from './AuthFields';
import { useDialogStagePresence as createDialogStagePresence } from './useDialogStagePresence';
import authStyles from '../AuthFormStage.module.css';
import { DemoNavigationView } from './DemoNavigation';
import type { DemoNavigation } from '../demoNavigationMotion';

/** Vue counterpart of AuthFormStage; both use the same layout styles. */
export const AuthFormStage = defineComponent({
    name: 'AuthFormStage',
    props: {
        title: { type: String, required: true },
        dialog: { type: Boolean, default: false },
        mobile: { type: Boolean, default: false },
        phonePreview: { type: Boolean, default: false },
        phoneHost: { type: Boolean, default: false },
        keyboard: { type: String, default: undefined },
        surface: { type: String as PropType<'plain' | 'grouped'>, default: 'grouped' },
        onBack: { type: Function as PropType<() => void>, default: undefined },
        backLabel: { type: String, default: undefined },
        navigation: { type: Object as PropType<DemoNavigation>, default: undefined },
    },
    emits: ['update:dialog'],
    setup(props, { slots, emit }) {
        provide(authMobileKey, () => props.mobile);
        const heading = ref<HTMLElement | null>(null);
        const formId = vueId();
        const presence = createDialogStagePresence(() => props.dialog, () => !props.phoneHost && props.mobile);
        return () => {
            const motion = props.mobile ? props.navigation : undefined;
            const onBack = props.onBack;
            const backLabel = props.backLabel;
            const back = () => h(VueDemoBackButton, { onBack, label: backLabel });
            const formContent = () => motion
                ? h(DemoNavigationView, { navigation: motion }, () => h('div', { class: authStyles.Form }, slots.default?.({ formId })))
                : slots.default?.({ formId });
            // The title stays in the form; the bars carry only the way out and the action.
            const bar = (leading: () => VNode, control: 'back' | 'close') => h(Toolbar, null, () =>
                h(ToolbarLeading, null, () => motion ? h(DemoNavigationView, { navigation: motion, part: 'bar', control }, leading) : leading()));
            const close = () => h(DialogClose, null, () => h(NavigationButton, { action: 'close', 'aria-label': 'Close dialog' }));
            const phoneFooter = () => slots.footer && h(Toolbar, { placement: 'bottom' }, () =>
                h(ToolbarContent, { fill: true, class: authStyles.PhoneFooter }, () => slots.footer?.({ formId })));
            if (presence.present.value || (props.dialog && !props.phoneHost)) {
                if (presence.present.value) {
                    return h(
                        Dialog,
                        {
                            open: presence.open.value,
                            'onUpdate:open': (open: boolean) => {
                                if (!props.phonePreview) emit('update:dialog', open);
                            },
                        },
                        {
                            default: () =>
                                h(
                                    DialogContent,
                                    {
                                        mobileVariant: 'sheet',
                                        class: authStyles.Sheet,
                                        surface: props.surface,
                                        // The top Toolbar holds Close or Back.
                                        showClose: false,
                                        onCloseAutoFocus: presence.onCloseAutoFocus,
                                        onOpenAutoFocus: (event: Event) => { presence.onOpenAutoFocus(event);
                                            event.preventDefault();
                                            if (!props.phonePreview)
                                                heading.value?.focus({ preventScroll: true });
                                        },
                                    },
                                    {
                                        default: () => [
                                            onBack ? bar(back, 'back') : bar(close, 'close'),
                                            h(DialogHeader, null, {
                                                default: () => [
                                                    h('div', { ref: heading, tabindex: -1 }, [
                                                        h(
                                                            DialogTitle,
                                                            { class: 'sr-only' },
                                                            () => props.title,
                                                        ),
                                                    ]),
                                                    h(
                                                        DialogDescription,
                                                        { class: 'sr-only' },
                                                        () => 'Review and submit this form.',
                                                    ),
                                                ],
                                            }),
                                            h(DialogBody, null, {
                                                default: () =>
                                                    h(
                                                        'div',
                                                        {
                                                            class: authStyles.Form,
                                                            'data-preview-keyboard': props.keyboard,
                                                        },
                                                        formContent(),
                                                    ),
                                            }),
                                            phoneFooter(),
                                        ],
                                    },
                                ),
                        },
                    );
                }
                return h('div', { class: authStyles.DesktopOverlay }, [
                    h('div', { class: authStyles.DesktopPanel }, [
                        h('div', { class: authStyles.DesktopToolbar }, [
                            h(
                                Button,
                                {
                                    color: 'secondary',
                                    variant: 'ghost',
                                    size: 'lg',
                                    uniform: true,
                                    'aria-label': 'Close',
                                    onClick: () => emit('update:dialog', false),
                                },
                                () => h(X),
                            ),
                        ]),
                        h('div', { class: authStyles.DesktopBody }, formContent()),
                    ]),
                ]);
            }
            return h(
                Page,
                { ref: presence.pageRef, tabindex: -1, role: 'region', 'aria-label': props.title, class: authStyles.Screen, surface: props.surface },
                {
                    default: () => [
                        bar(back, 'back'),
                        h(
                            PageContent,
                            { class: authStyles.Content },
                            {
                                default: () =>
                                    h(
                                        'div',
                                        {
                                            class: authStyles.Form,
                                            'data-preview-keyboard': props.keyboard,
                                        },
                                        formContent(),
                                    ),
                            },
                        ),
                        props.mobile && phoneFooter(),
                    ],
                },
            );
        };
    },
});
