import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createCommentVNode, h } from 'vue';
import { Menu as ReactMenu } from '../../packages/ui/src/components/Menu';
import {
    Menu,
    MenuContent,
    MenuHeader,
    MenuHeaderAction,
    MenuItem,
    MenuRadioGroup,
    MenuRadioItem,
    MenuTrigger,
} from '../../packages/vue/src/components/Menu';
import { flushVue, mountVue } from './harness';

// Menu.Header (plan 169i): the picture, name and kind of what the menu acts on, as the iOS Files menu of a file
// (iOS-menu IMG_5690), with a round action at its end that is a menu item; a mode, a horizontal radio group at the top of
// the menu (Photos, IMG_5665 and IMG_5666); and onOpenAutoFocus, which lets a menu that stands open leave focus where
// it is.

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

const key = async (target: Element, name: string) => {
    await act(async () => {
        fireEvent.keyDown(target, { key: name });
        await flushVue();
        await new Promise(resolve => setTimeout(resolve, 0));
    });
};

type Options = { onAction?: (event: Event) => void; onOpenAutoFocus?: (event: Event) => void; onMode?: (value: string) => void };

async function mount(framework: 'React' | 'Vue', { onAction = () => {}, onOpenAutoFocus, onMode = () => {} }: Options = {}) {
    if (framework === 'React') {
        render(
            <ReactMenu>
                <ReactMenu.Trigger><button type="button">Actions</button></ReactMenu.Trigger>
                <ReactMenu.Content onOpenAutoFocus={onOpenAutoFocus}>
                    <ReactMenu.Header
                        media={<img src="/demo/picture-1.svg" alt="" />}
                        description="Image · 382 KB"
                        action={<ReactMenu.HeaderAction aria-label="Share" onSelect={onAction}>S</ReactMenu.HeaderAction>}
                    >
                        Sunset.png
                    </ReactMenu.Header>
                    <ReactMenu.Item onSelect={() => {}}>Rename</ReactMenu.Item>
                    <ReactMenu.RadioGroup layout="horizontal" value="added" onChange={onMode}>
                        <ReactMenu.RadioItem value="added">Added</ReactMenu.RadioItem>
                        <ReactMenu.RadioItem value="captured">Captured</ReactMenu.RadioItem>
                    </ReactMenu.RadioGroup>
                </ReactMenu.Content>
            </ReactMenu>,
        );
    } else {
        mountVue(() => h(Menu, null, () => [
            h(MenuTrigger, null, () => h('button', { type: 'button' }, 'Actions')),
            h(MenuContent, { onOpenAutoFocus }, () => [
                h(MenuHeader, { description: 'Image · 382 KB' }, {
                    default: () => 'Sunset.png',
                    media: () => h('img', { src: '/demo/picture-1.svg', alt: '' }),
                    action: () => h(MenuHeaderAction, { ariaLabel: 'Share', onSelect: onAction }, () => 'S'),
                }),
                h(MenuItem, { onSelect: () => {} }, () => 'Rename'),
                h(MenuRadioGroup, { layout: 'horizontal', value: 'added', onChange: onMode }, () => [
                    h(MenuRadioItem, { value: 'added' }, () => 'Added'),
                    h(MenuRadioItem, { value: 'captured' }, () => 'Captured'),
                ]),
            ]),
        ]));
        await flushVue();
    }
    return within(document.body);
}

// A picture that renders nothing (false in React, a v-if placeholder in Vue) and no line under the title
async function mountBare(framework: 'React' | 'Vue') {
    if (framework === 'React') {
        render(
            <ReactMenu>
                <ReactMenu.Trigger><button type="button">Actions</button></ReactMenu.Trigger>
                <ReactMenu.Content>
                    <ReactMenu.Header media={false} description={null}>Notes</ReactMenu.Header>
                    <ReactMenu.Item onSelect={() => {}}>Rename</ReactMenu.Item>
                </ReactMenu.Content>
            </ReactMenu>,
        );
    } else {
        mountVue(() => h(Menu, null, () => [
            h(MenuTrigger, null, () => h('button', { type: 'button' }, 'Actions')),
            h(MenuContent, null, () => [
                h(MenuHeader, null, { default: () => 'Notes', media: () => [createCommentVNode('v-if')] }),
                h(MenuItem, { onSelect: () => {} }, () => 'Rename'),
            ]),
        ]));
        await flushVue();
    }
    return within(document.body);
}

describe.each(['React', 'Vue'] as const)('%s Menu header', framework => {
    afterEach(() => { vi.restoreAllMocks(); });

    test('the header names what the menu acts on; its action is the first item', async () => {
        const page = await mount(framework);
        await press(page.getByRole('button', { name: 'Actions' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const header = page.getByRole('menu').querySelector('[data-menu-header]')!;
        expect(header.textContent).toContain('Sunset.png');
        expect(header.textContent).toContain('Image · 382 KB');
        expect(header.querySelector('img')?.getAttribute('src')).toBe('/demo/picture-1.svg');
        expect(header.getAttribute('role')).toBeNull();
        expect(page.getAllByRole('menuitem').map(item => item.getAttribute('aria-label') ?? item.textContent)).toEqual(['Share', 'Rename']);
        expect(page.getByRole('menuitem', { name: 'Share' }).tagName).toBe('BUTTON');
    });

    test('the arrow keys reach the action; selecting it closes the menu', async () => {
        const onAction = vi.fn();
        const page = await mount(framework, { onAction });
        await press(page.getByRole('button', { name: 'Actions' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const menu = page.getByRole('menu');
        menu.focus();
        await key(menu, 'ArrowDown');
        expect(document.activeElement).toBe(page.getByRole('menuitem', { name: 'Share' }));
        await key(document.activeElement!, 'ArrowDown');
        expect(document.activeElement?.textContent).toBe('Rename');
        await key(document.activeElement!, 'ArrowUp');
        await key(document.activeElement!, 'Enter');
        await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
        expect(onAction).toHaveBeenCalledTimes(1);
    });

    test('a horizontal radio group is a mode: one checked, no indicator position', async () => {
        const page = await mount(framework);
        await press(page.getByRole('button', { name: 'Actions' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const group = page.getByRole('group');
        expect(group.getAttribute('data-layout')).toBe('horizontal');
        expect(group.hasAttribute('data-indicator-position')).toBe(false);
        const modes = within(group).getAllByRole('menuitemradio');
        expect(modes.map(mode => [mode.textContent, mode.getAttribute('aria-checked'), mode.getAttribute('data-state')])).toEqual([
            ['Added', 'true', 'checked'],
            ['Captured', 'false', 'unchecked'],
        ]);
    });

    // Plan 169j: the horizontal options are a mode, as Added and Captured order Photos (IMG_5666); the owner confirmed
    // that choosing one closes the menu, as any item does
    test('choosing a mode closes the menu', async () => {
        const onMode = vi.fn();
        const page = await mount(framework, { onMode });
        await press(page.getByRole('button', { name: 'Actions' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        await press(page.getByRole('menuitemradio', { name: 'Captured' }));
        expect(onMode).toHaveBeenCalledWith('captured');
        await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
    });

    test('a header draws no box for a picture or a line that renders nothing', async () => {
        const page = await mountBare(framework);
        await press(page.getByRole('button', { name: 'Actions' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const header = page.getByRole('menu').querySelector('[data-menu-header]')!;
        expect(header.textContent).toBe('Notes');
        expect(header.children).toHaveLength(1);
        expect(header.firstElementChild!.children).toHaveLength(1);
    });

    test('onOpenAutoFocus can leave focus where it is', async () => {
        const onOpenAutoFocus = vi.fn((event: Event) => event.preventDefault());
        const page = await mount(framework, { onOpenAutoFocus });
        const trigger = page.getByRole('button', { name: 'Actions' });
        trigger.focus();
        await key(trigger, 'Enter');
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        expect(onOpenAutoFocus).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(trigger);
    });

    test('focus returns to the trigger without scrolling', async () => {
        const page = await mount(framework);
        const trigger = page.getByRole('button', { name: 'Actions' });
        trigger.focus();
        await key(trigger, 'Enter');
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const focus = vi.spyOn(HTMLElement.prototype, 'focus');
        await key(document.activeElement!, 'Escape');
        await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
        expect(document.activeElement).toBe(trigger);
        const onTrigger = focus.mock.contexts.flatMap((element, index) => element === trigger ? [focus.mock.calls[index]] : []);
        expect(onTrigger.length).toBeGreaterThan(0);
        for (const args of onTrigger) expect(args[0]).toEqual({ preventScroll: true });
    });
});
