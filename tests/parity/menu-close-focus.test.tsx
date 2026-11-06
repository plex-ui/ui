import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { h, ref } from 'vue';
import { Menu as ReactMenu } from '../../packages/ui/src/components/Menu';
import { Menu, MenuTrigger, MenuContent, MenuItem } from '../../packages/vue/src/components/Menu';
import { animation, flushVue, mountVue } from './harness';

const press = async (target: HTMLElement) => {
    await act(async () => {
        fireEvent.pointerDown(target, { button: 0, pointerType: 'mouse', pointerId: 1 });
        fireEvent.mouseDown(target, { button: 0 });
        await flushVue();
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    await act(async () => {
        fireEvent.pointerUp(target, { button: 0, pointerType: 'mouse', pointerId: 1 });
        fireEvent.mouseUp(target, { button: 0 });
        fireEvent.click(target, { button: 0, detail: 1 });
        await flushVue();
    });
};

describe.each(['React', 'Vue'] as const)('%s Menu close focus', framework => {
    // The menu plays its exit, as in a browser: jsdom's default skips it and leaves nothing frozen.
    beforeEach(() => { animation.disabled = false; });

    test("an owner whose state changes with the close gets its latest close-focus handler", async () => {
        // The owner records the close in its own state (Menu onClose), and that state picks where focus goes
        // next. The close and the owner's update render together, while the closing content is frozen for its
        // exit: a handler read from it would be the one from before the close. (An item's select is flushed on
        // its own before the menu closes, so the selection alone does not show this.)
        const earlier = vi.fn<(event: Event) => void>(event => event.preventDefault());
        const latest = vi.fn<(event: Event) => void>(event => event.preventDefault());
        if (framework === 'React') {
            function Fixture() {
                const [closed, setClosed] = useState(false);
                return <ReactMenu onClose={() => setClosed(true)}>
                    <ReactMenu.Trigger><button type="button">Actions</button></ReactMenu.Trigger>
                    <ReactMenu.Content onCloseAutoFocus={closed ? latest : earlier}>
                        <ReactMenu.Item onSelect={() => {}}>Archive</ReactMenu.Item>
                    </ReactMenu.Content>
                </ReactMenu>;
            }
            render(<Fixture />);
        } else {
            const closed = ref(false);
            mountVue(() => h(Menu, { onClose: () => { closed.value = true; } }, () => [
                h(MenuTrigger, null, () => h('button', { type: 'button' }, 'Actions')),
                h(MenuContent, { onCloseAutoFocus: closed.value ? latest : earlier }, () =>
                    h(MenuItem, { onSelect: () => {} }, () => 'Archive')),
            ]));
            await flushVue();
        }
        const page = within(document.body);
        await press(page.getByRole('button', { name: 'Actions' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        await press(page.getByRole('menuitem', { name: 'Archive' }));
        await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
        await waitFor(() => expect(latest).toHaveBeenCalledTimes(1));
        expect(earlier).not.toHaveBeenCalled();
    });
});
