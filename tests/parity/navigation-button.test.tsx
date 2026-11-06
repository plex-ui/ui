import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { createRef, type FormEvent } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { h, reactive, type ComponentPublicInstance } from 'vue';
import { NavigationButton as ReactNavigationButton } from '../../packages/ui/src/components/Button';
import { NavigationButton as VueNavigationButton } from '../../packages/vue/src/components/Button';
import { Dialog as ReactDialog } from '../../packages/ui/src/components/Dialog';
import { Dialog as VueDialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../packages/vue/src/components/Dialog';
import { flushVue, mountVue } from './harness';

type Framework = 'React' | 'Vue';
type Action = 'back' | 'close' | 'confirm';
type Props = {
    action: Action;
    type?: 'button' | 'submit' | 'reset';
    form?: string;
    color?: 'primary' | 'secondary' | 'danger' | 'info';
    variant?: 'solid' | 'soft' | 'outline' | 'ghost';
    'aria-label'?: string;
    disabled?: boolean;
    loading?: boolean;
};
const labels: Record<Action, string> = { back: 'Back', close: 'Close', confirm: 'Confirm' };
const interact = async (callback: () => void) => act(async () => { callback(); await flushVue(); });
afterEach(async () => { cleanup(); await flushVue(); });

async function mountButton(framework: Framework, initial: Props) {
    const props = reactive({ ...initial });
    const clicked = vi.fn();
    const submitted = vi.fn();
    const reactRef = createRef<HTMLButtonElement>();
    let vueRef: Element | ComponentPublicInstance | null = null;
    const submit = (event: Event | FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submitted();
    };
    let rerender = () => {};
    if (framework === 'React') {
        const tree = () => <>
            <form id="navigation-owner" onSubmit={submit} />
            <ReactNavigationButton {...props} ref={reactRef} onClick={clicked} />
        </>;
        const view = render(tree());
        rerender = () => view.rerender(tree());
    } else {
        mountVue(() => h('div', [
            h('form', { id: 'navigation-owner', onSubmit: submit }),
            h(VueNavigationButton, { ...props, ref: (value: Element | ComponentPublicInstance | null) => { vueRef = value; }, onClick: clicked }),
        ]));
        await flushVue();
    }
    return {
        clicked,
        submitted,
        button: () => within(document.body).getByRole<HTMLButtonElement>('button'),
        refNode: () => {
            if (framework === 'React') return reactRef.current;
            if (vueRef instanceof Element) return vueRef;
            const element: unknown = vueRef?.$el;
            return element instanceof HTMLButtonElement ? element : null;
        },
        change: async (next: Partial<Props>) => interact(() => { Object.assign(props, next); rerender(); }),
    };
}

describe.each<Framework>(['React', 'Vue'])('%s NavigationButton', (framework) => {
    test.each<Action>(['back', 'close', 'confirm'])('%s has a default accessible name and role glyph', async (action) => {
        const view = await mountButton(framework, { action });
        const button = within(document.body).getByRole<HTMLButtonElement>('button', { name: labels[action], exact: true });
        expect(button.type).toBe('button');
        expect(button.getAttribute('data-color')).toBe(action === 'confirm' ? 'primary' : 'secondary');
        expect(button.getAttribute('data-variant')).toBe(action === 'confirm' ? 'solid' : 'soft');
        expect(button.getAttribute('data-navigation-action')).toBe(action);
        expect(button.querySelector(`[data-navigation-glyph="${action}"]`)?.getAttribute('aria-hidden')).toBe('true');
        expect(view.refNode()).toBe(button);
        await interact(() => fireEvent.click(button));
        expect(view.clicked).toHaveBeenCalledTimes(1);
        expect(view.submitted).not.toHaveBeenCalled();
    });

    test('preserves native form submission, explicit name/color and disabled/loading behavior', async () => {
        const view = await mountButton(framework, { action: 'confirm', form: 'navigation-owner', type: 'submit', 'aria-label': 'Save album', color: 'danger' });
        const button = view.button();
        expect(button.form?.id).toBe('navigation-owner');
        expect(button.getAttribute('aria-label')).toBe('Save album');
        expect(button.getAttribute('data-color')).toBe('danger');
        await interact(() => fireEvent.click(button));
        expect(view.submitted).toHaveBeenCalledTimes(1);
        expect(view.clicked).toHaveBeenCalledTimes(1);
        await view.change({ disabled: true });
        expect(button.disabled).toBe(true);
        await interact(() => fireEvent.click(button));
        expect(view.submitted).toHaveBeenCalledTimes(1);
        await view.change({ disabled: false, loading: true });
        expect(button.disabled).toBe(true);
        expect(button.hasAttribute('data-loading')).toBe(true);
        await interact(() => fireEvent.click(button));
        expect(view.clicked).toHaveBeenCalledTimes(1);
        await view.change({ loading: false });
        expect(button.disabled).toBe(false);
        button.focus();
        expect(document.activeElement).toBe(view.refNode());
        await interact(() => fireEvent.click(button));
        expect(view.submitted).toHaveBeenCalledTimes(2);
    });

    test('standard Dialog close retains its controlled dismissal callback', async () => {
        const changed = vi.fn();
        if (framework === 'React') {
            render(<ReactDialog open onOpenChange={changed}>
                <ReactDialog.Content>
                    <ReactDialog.Header>
                        <ReactDialog.Title>Navigation owner</ReactDialog.Title>
                        <ReactDialog.Description>Close the sample.</ReactDialog.Description>
                    </ReactDialog.Header>
                </ReactDialog.Content>
            </ReactDialog>);
        } else {
            mountVue(() => h(VueDialog, { open: true, 'onUpdate:open': changed }, () =>
                h(DialogContent, null, () => h(DialogHeader, null, () => [
                    h(DialogTitle, null, () => 'Navigation owner'),
                    h(DialogDescription, null, () => 'Close the sample.'),
                ])),
            ));
            await flushVue();
        }
        const close = within(document.body).getByRole('button', { name: 'Close dialog', exact: true });
        expect(close.getAttribute('data-navigation-action')).toBe('close');
        expect(close.querySelector('[data-navigation-glyph="close"]')?.getAttribute('viewBox')).toBe('0 0 20 20');
        await interact(() => fireEvent.click(close));
        expect(changed).toHaveBeenCalledTimes(1);
        expect(changed).toHaveBeenCalledWith(false);
    });
});

test.each<Action>(['back', 'close', 'confirm'])('%s glyph geometry is identical in React and Vue', async (action) => {
    const read = () => {
        const svg = document.querySelector('[data-navigation-glyph]');
        return { viewBox: svg?.getAttribute('viewBox'), path: svg?.querySelector('path')?.getAttribute('d') };
    };
    await mountButton('React', { action });
    const react = read();
    cleanup();
    await mountButton('Vue', { action });
    expect(read()).toEqual(react);
});
