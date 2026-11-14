import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { h, reactive } from 'vue';
import { ImageAlbumEditor as ReactEditor } from '../../components/docs/ImageAlbumEditor';
import { ImageAlbumEditor as VueEditor } from '../../components/docs/vue/ImageAlbumEditor';
import { flushVue, mountVue } from './harness';

const viewport = vi.hoisted(() => ({ wide: false }));
vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => viewport.wide }));
vi.mock('@plexui/vue/composables/useBreakpoints', async () => {
    const { ref } = await import('vue');
    return { useBreakpoint: () => ref(viewport.wide) };
});
vi.mock('@plexui/ui/components/Field', async () => import('../../packages/ui/src/components/Field'));
vi.mock('@plexui/vue/components/Field', async () => import('../../packages/vue/src/components/Field'));

vi.mock(
    '@plexui/ui/components/Button',
    async () => import('../../packages/ui/src/components/Button'),
);
vi.mock(
    '@plexui/vue/components/Button',
    async () => import('../../packages/vue/src/components/Button'),
);
vi.mock(
    '@plexui/ui/components/FieldError',
    async () => import('../../packages/ui/src/components/FieldError'),
);
vi.mock(
    '@plexui/vue/components/FieldError',
    async () => import('../../packages/vue/src/components/FieldError'),
);
vi.mock(
    '@plexui/ui/components/FieldGroup',
    async () => import('../../packages/ui/src/components/FieldGroup'),
);
vi.mock(
    '@plexui/vue/components/FieldGroup',
    async () => import('../../packages/vue/src/components/FieldGroup'),
);
vi.mock(
    '@plexui/ui/components/Image',
    async () => import('../../packages/ui/src/components/Image'),
);
vi.mock(
    '@plexui/vue/components/Image',
    async () => import('../../packages/vue/src/components/Image'),
);
vi.mock('@plexui/ui/components/Page', async () => import('../../packages/ui/src/components/Page'));
vi.mock(
    '@plexui/vue/components/Page',
    async () => import('../../packages/vue/src/components/Page'),
);
vi.mock(
    '@plexui/ui/components/FileUpload',
    async () => import('../../packages/ui/src/components/FileUpload'),
);
vi.mock(
    '@plexui/vue/components/FileUpload',
    async () => import('../../packages/vue/src/components/FileUpload'),
);
vi.mock(
    '@plexui/ui/components/Dialog',
    async () => import('../../packages/ui/src/components/Dialog'),
);
vi.mock(
    '@plexui/vue/components/Dialog',
    async () => import('../../packages/vue/src/components/Dialog'),
);
vi.mock(
    '@plexui/ui/components/Input',
    async () => import('../../packages/ui/src/components/Input'),
);
vi.mock(
    '@plexui/vue/components/Input',
    async () => import('../../packages/vue/src/components/Input'),
);

type Framework = 'React' | 'Vue';
type Presentation = { dialog: boolean; surface: 'plain' | 'grouped'; phonePreview: boolean };
const NativeURL = URL;
const created = vi.fn<(file: Blob) => string>();
const revoked = vi.fn<(url: string) => void>();
const disposeEditors: Array<() => Promise<void>> = [];

beforeEach(() => {
    viewport.wide = false;
    let sequence = 0;
    created.mockReset().mockImplementation(() => `blob:album-${++sequence}`);
    revoked.mockReset();
    vi.stubGlobal(
        'URL',
        class extends NativeURL {
            static createObjectURL = created;
            static revokeObjectURL = revoked;
        },
    );
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
});
afterEach(async () => {
    for (const dispose of disposeEditors) await dispose();
    disposeEditors.length = 0;
    cleanup();
    vi.unstubAllGlobals();
});

const interact = async (callback: () => void) =>
    act(async () => {
        callback();
        await flushVue();
    });
const page = () => within(document.body);
const fileInput = () => {
    const element = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!element) throw new Error('Photo picker was not rendered');
    return element;
};
const nameInput = () => page().getByRole<HTMLInputElement>('textbox', { name: 'Album Name' });
const setName = async (name: string) =>
    interact(() => {
        fireEvent.input(nameInput(), { target: { value: name } });
        fireEvent.change(nameInput(), { target: { value: name } });
    });
const choose = async (files: File[]) =>
    interact(() => {
        fireEvent.change(fileInput(), { target: { files } });
    });
const save = async () =>
    interact(() => {
        const form = nameInput().form;
        if (!form) throw new Error('Album name has no form');
        fireEvent.submit(form);
    });
const cancel = async () =>
    interact(() => {
        fireEvent.click(page().getByRole('button', { name: 'Cancel album changes' }));
    });
const photo = (name: string) => new File(['test fixture'], name, { type: 'image/png' });

async function mountEditor(framework: Framework, dialog = false, phonePreview = true) {
    const props: Presentation = { dialog, surface: 'grouped', phonePreview };
    const onDialogChange = vi.fn<(open: boolean) => void>();
    if (framework === 'React') {
        const view = render(<ReactEditor {...props} onDialogChange={onDialogChange} />);
        const unmount = async () => interact(view.unmount);
        disposeEditors.push(unmount);
        return {
            onDialogChange,
            change: async (next: Partial<Presentation>) =>
                interact(() => {
                    Object.assign(props, next);
                    view.rerender(<ReactEditor {...props} onDialogChange={onDialogChange} />);
                }),
            unmount,
        };
    }
    const state = reactive({ props, visible: true });
    mountVue(() => (state.visible ? h(VueEditor, { ...state.props, 'onUpdate:dialog': onDialogChange }) : h('div')));
    await flushVue();
    const unmount = async () =>
        interact(() => {
            state.visible = false;
        });
    disposeEditors.push(unmount);
    return {
        onDialogChange,
        change: async (next: Partial<Presentation>) =>
            interact(() => {
                Object.assign(state.props, next);
            }),
        unmount,
    };
}

describe.each<Framework>(['React', 'Vue'])('%s image album composition', (framework) => {
    test.each([false, true])('desktop has a labeled default input and text actions (dialog=%s)', async (dialog) => {
        viewport.wide = true;
        const view = await mountEditor(framework, dialog, false);
        const input = nameInput();
        expect([...input.labels ?? []].map(label => label.textContent)).toContain('Album Name');
        expect(input.closest('[data-slot="input"]')?.getAttribute('data-size')).toBe('md');
        expect(input.closest('[data-slot="input"]')?.getAttribute('data-variant')).toBe('outline');
        expect(document.querySelector('.Page .Bar')).toBeNull();
        expect(input.closest('[data-preview-keyboard]')).toBeNull();
        expect(page().queryByRole('button', { name: 'Save album', exact: true })).toBeNull();
        const submit = page().getByRole<HTMLButtonElement>('button', { name: 'Save', exact: true });
        expect(submit.form).toBe(input.form);
        expect(submit.closest('.Footer') !== null).toBe(dialog);
        await interact(() => fireEvent.click(submit));
        expect(page().getByRole('alert').textContent).toContain('Enter an album name.');
        expect(document.activeElement).toBe(input);
        expect(view.onDialogChange).not.toHaveBeenCalled();
        const first = photo('desktop-saved.png');
        await choose([first]);
        await setName('Saved desktop album');
        await interact(() => fireEvent.click(submit));
        expect(page().getByRole('status').textContent).toBe('Album saved.');
        if (dialog) expect(view.onDialogChange).toHaveBeenLastCalledWith(false);
        await choose([photo('desktop-unsaved.png')]);
        await setName('Discard this change');
        await interact(() => fireEvent.click(page().getByRole('button', { name: 'Cancel', exact: true })));
        expect(nameInput().value).toBe('Saved desktop album');
        expect(page().getByRole('status').textContent).toBe('Changes canceled.');
        await waitFor(() => expect(created).toHaveBeenLastCalledWith(first));
        expect(revoked).toHaveBeenCalledWith('blob:album-2');
    });

    test('desktop to Phone presentation keeps the local draft and one form owner', async () => {
        viewport.wide = true;
        const view = await mountEditor(framework, false, false);
        await choose([photo('responsive.png')]);
        await setName('Responsive draft');
        await view.change({ phonePreview: true });
        expect(nameInput().value).toBe('Responsive draft');
        expect(nameInput().closest('[data-slot="input"]')?.getAttribute('data-variant')).toBe('ghost');
        expect(nameInput().closest('[data-preview-keyboard]')?.getAttribute('data-preview-keyboard')).toBe('text');
        expect(nameInput().hasAttribute('autofocus')).toBe(false);
        expect(page().getByRole('button', { name: 'Save album', exact: true })).toBeTruthy();
        expect(page().queryByRole('button', { name: 'Save', exact: true })).toBeNull();
        await view.change({ phonePreview: false, dialog: true });
        expect(nameInput().value).toBe('Responsive draft');
        expect(page().getByAltText('Album cover preview').getAttribute('src')).toBe('blob:album-1');
        expect(document.querySelectorAll('form')).toHaveLength(1);
        expect(page().getByRole<HTMLButtonElement>('button', { name: 'Save', exact: true }).form).toBe(nameInput().form);
        expect(created).toHaveBeenCalledTimes(1);
        await view.unmount();
        expect(revoked).toHaveBeenCalledWith('blob:album-1');
    });

    test.each([false, true])(
        'uses a named field, topbar actions and explicit name validation (dialog=%s)',
        async (dialog) => {
            await mountEditor(framework, dialog);
            expect(page().getByRole('img', { name: 'No album photo' })).toBeTruthy();
            expect(
                page()
                    .getByRole('button', { name: 'Add Photos', exact: true })
                    .getAttribute('type'),
            ).toBe('button');
            const button = page().getByRole('button', { name: 'Save album' });
            expect(button.getAttribute('form')).toBe(nameInput().form?.id);
            await save();
            expect(page().getByRole('alert').textContent).toContain('Enter an album name.');
            expect(document.activeElement).toBe(nameInput());
            await setName('Local album');
            await save();
            expect(page().getByRole('status').textContent).toBe('Album saved.');
        },
    );

    test('Phone sheet base Close cancels the draft and preserves the preview owner', async () => {
        await mountEditor(framework, true);
        const first = photo('phone-saved.png');
        await choose([first]);
        await setName('Saved Phone album');
        await save();
        await choose([photo('phone-draft.png')]);
        await setName('Discard this title');
        await interact(() => fireEvent.click(page().getByRole('button', { name: 'Close dialog', exact: true })));
        expect(nameInput().value).toBe('Saved Phone album');
        expect(page().getByRole('status').textContent).toBe('Changes canceled.');
        expect(document.querySelector('[data-plex-dialog]')).toBeTruthy();
        expect(document.querySelectorAll('form')).toHaveLength(1);
        await waitFor(() => expect(created).toHaveBeenLastCalledWith(first));
    });

    test('picker cancel and rejection preserve the chosen photo and title', async () => {
        await mountEditor(framework);
        await setName('Local album');
        const first = photo('first.png');
        await choose([first]);
        const preview = await page().findByAltText<HTMLImageElement>('Album cover preview');
        expect(preview.getAttribute('src')).toBe('blob:album-1');
        expect(created).toHaveBeenCalledWith(first);
        expect(page().queryByRole('list', { name: 'Attached files' })).toBeNull();
        await choose([]);
        expect(page().getByAltText('Album cover preview').getAttribute('src')).toBe('blob:album-1');
        await choose([new File(['not a photo'], 'note.txt', { type: 'text/plain' })]);
        expect(page().getByRole('alert').textContent).toContain('File type not accepted');
        expect(nameInput().value).toBe('Local album');
        expect(page().getByRole('button', { name: 'Change photo', exact: true })).toBeTruthy();
        expect(created).toHaveBeenCalledTimes(1);
        await save();
        expect(page().getByRole('status').textContent).toBe('Album saved.');
        expect(page().queryByRole('alert')).toBeNull();
    });

    test('Done commits and Cancel restores the last saved local draft', async () => {
        await mountEditor(framework);
        const first = photo('saved.png');
        await choose([first]);
        await setName('Saved album');
        await save();
        await choose([photo('draft.png')]);
        await setName('Unsaved name');
        await cancel();
        expect(nameInput().value).toBe('Saved album');
        expect(page().getByRole('status').textContent).toBe('Changes canceled.');
        await waitFor(() => expect(created).toHaveBeenLastCalledWith(first));
        expect(revoked).toHaveBeenCalledWith('blob:album-2');
    });

    test('presentation and surface keep the draft; all temporary URLs are released', async () => {
        const view = await mountEditor(framework);
        await choose([photo('first.png')]);
        await setName('Retained name');
        await view.change({ dialog: true, surface: 'plain' });
        expect(nameInput().value).toBe('Retained name');
        expect(page().getByAltText('Album cover preview').getAttribute('src')).toBe('blob:album-1');
        await view.change({ dialog: false, surface: 'grouped' });
        // The Page returns once the Sheet has finished its exit.
        await waitFor(() => expect(fileInput()).toBeTruthy());
        expect(nameInput().value).toBe('Retained name');
        expect(created).toHaveBeenCalledTimes(1);
        await choose([photo('second.png')]);
        expect(revoked).toHaveBeenCalledWith('blob:album-1');
        await view.unmount();
        expect(revoked).toHaveBeenCalledWith('blob:album-2');
        expect(revoked).toHaveBeenCalledTimes(2);
    });

    test('a decode failure has an accessible fallback and can be replaced', async () => {
        await mountEditor(framework);
        await choose([photo('bad-image.png')]);
        const image = await page().findByAltText('Album cover preview');
        await interact(() => {
            fireEvent.error(image);
        });
        expect(page().getByRole('img', { name: 'Photo preview unavailable' })).toBeTruthy();
        expect(page().getByRole('alert').textContent).toContain('could not be displayed');
        await choose([photo('replacement.png')]);
        expect(page().queryByRole('alert')).toBeNull();
        expect(await page().findByAltText('Album cover preview')).toBeTruthy();
    });
});

test('on a desktop the form stands inside its card with padding, React and Vue (owner 14.11: «разломано все»)', async () => {
  // The group's card holds rows and keeps no padding of its own: the form's card gives it the row's inset
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(`${process.cwd()}/components/docs/ImageAlbumDemo.module.css`, 'utf8');
  expect(css).toMatch(/\.DesktopBody \{\s*padding: var\(--field-row-padding-inline\);/);
  expect(readFileSync(`${process.cwd()}/components/docs/ImageAlbumEditor.tsx`, 'utf8')).toContain('description="Choose a cover photo and name." bodyClassName={s.DesktopBody}');
  expect(readFileSync(`${process.cwd()}/components/docs/vue/ImageAlbumEditor.ts`, 'utf8')).toContain("description: 'Choose a cover photo and name.', bodyClass: s.DesktopBody");
});
