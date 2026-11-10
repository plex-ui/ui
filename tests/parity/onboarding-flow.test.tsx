import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    CreatePasswordDemo,
    StorageLocationDemo,
    PASSWORD_HINT,
    VueCreatePasswordDemo,
    VueStorageLocationDemo,
} from '../../components/docs/OnboardingFlowDemos';
import { flushVue } from './harness';

// A phone screen's action sits in a bottom Toolbar, which takes the place of the footer.
const PHONE_FOOTER = '[data-toolbar][data-placement="bottom"]';

const viewport = vi.hoisted(() => ({ wide: false }));
vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => viewport.wide }));
// Keep the real Vue state/prop bridge, replacing only Next's lazy browser loader.
vi.mock('../../components/docs/VuePreview', async () => ({
    VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));

const mdx = readFileSync('content/vue/components/auth-forms.mdx', 'utf8');
function resolveTemplate(name: string): string {
    const declaration = `export const ${name} = `;
    const declarationStart = mdx.indexOf(declaration);
    if (declarationStart < 0) throw new Error(`Missing ${name} template`);
    const start = declarationStart + declaration.length;
    const closing = '</component>`';
    const end = mdx.indexOf(closing, start);
    if (end < 0) throw new Error(`Unclosed ${name} template`);
    const template: unknown = new Function(`return ${mdx.slice(start, end + closing.length)}`)();
    if (typeof template !== 'string') throw new Error(`${name} template was not resolved`);
    return template;
}
const templates = { password: resolveTemplate('createPassword'), storage: resolveTemplate('storageLocation') };
type Example = keyof typeof templates;
const interact = async (action: () => void) => {
    await act(async () => { action(); await flushVue(); });
};
const enter = async (input: HTMLElement, value: string) => interact(() => {
    fireEvent.input(input, { target: { value } });
    fireEvent.change(input, { target: { value } });
});
const input = (label: string) => within(document.body).getByLabelText<HTMLInputElement>(label, { selector: 'input', exact: true });
const button = (name = 'Continue') => within(document.body).getByRole<HTMLButtonElement>('button', { name, exact: true });
const choice = (name: string) => within(document.body).getByRole('radio', { name, exact: true });
const row = (name: string) => {
    const field = choice(name).closest<HTMLElement>('[data-row]');
    if (!field) throw new Error('Storage choice is not a whole-row Field');
    return field;
};
async function mountExample(framework: string, kind: Example = 'password') {
    const example = () => framework === 'React'
        ? kind === 'password' ? <CreatePasswordDemo /> : <StorageLocationDemo />
        : kind === 'password' ? <VueCreatePasswordDemo template={templates.password} /> : <VueStorageLocationDemo template={templates.storage} />;
    const view = render(example());
    await act(async () => { await flushVue(); });
    return { ...view, resize: async (wide: boolean) => interact(() => { viewport.wide = wide; view.rerender(example()); }) };
}

beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); viewport.wide = false; vi.unstubAllGlobals(); });

describe.each(['React', 'Vue'])('%s standalone password and storage examples', (framework) => {
    test.each([false, true])('password requirements remain associated outside the Phone group (wide=%s)', async (wide) => {
        viewport.wide = wide;
        await mountExample(framework);
        const hint = within(document.body).getByText(PASSWORD_HINT);
        const password = input('Password');
        const confirmation = input('Confirm Password');
        expect(hint.id).not.toBe('');
        expect(confirmation.getAttribute('aria-describedby')?.split(' ')).toContain(hint.id);
        if (wide) {
            expect(hint.closest('[data-auth-fields]')).toBeNull();
            expect(hint.closest('.Footer')).toBeNull();
        } else {
            expect(password.getAttribute('aria-describedby')?.split(' ')).toContain(hint.id);
            // The requirements are the footer of the linked field group.
            expect(hint.closest('.Footer')).not.toBeNull();
            const group = hint.closest('[data-auth-fields]');
            expect(group?.contains(password)).toBe(true);
            expect(group?.contains(confirmation)).toBe(true);
            expect(hint.closest('[data-auth-input]')).toBeNull();
            expect(hint.closest('[data-row]')).toBeNull();
        }
    });

    test.each([false, true])('one CTA submits its owner once, inline only on desktop (wide=%s)', async (wide) => {
        viewport.wide = wide;
        const previouslyFocused = document.createElement('button');
        document.body.append(previouslyFocused);
        previouslyFocused.focus();
        await mountExample(framework);
        expect(document.activeElement).toBe(previouslyFocused);
        const form = document.querySelector<HTMLFormElement>('form');
        if (!form) throw new Error('Password form was not mounted');
        const submit = vi.fn();
        form.addEventListener('submit', submit);
        expect(document.querySelectorAll('button[type="submit"]')).toHaveLength(1);
        expect(button().form).toBe(form);
        expect(form.contains(button())).toBe(wide);
        expect(Boolean(button().closest(PHONE_FOOTER))).toBe(!wide);
        expect(document.querySelector('.Page')?.getAttribute('data-surface')).toBe('grouped');
        await interact(() => fireEvent.click(button()));
        expect(submit).toHaveBeenCalledTimes(1);
        expect(input('Password').getAttribute('aria-invalid')).toBe('true');
        expect(input('Confirm Password').getAttribute('aria-invalid')).toBe('true');
        expect(within(document.body).getByText('Enter a password.')).toBeTruthy();
        expect(within(document.body).queryByRole('radiogroup', { name: 'Storage location' })).toBeNull();
        previouslyFocused.remove();
    });

    test('password validation completes only its own preview and clears sample values', async () => {
        await mountExample(framework);
        await enter(input('Password'), 'weak');
        await enter(input('Confirm Password'), 'weak');
        await interact(() => fireEvent.click(button()));
        const password = input('Password');
        expect(password.getAttribute('aria-invalid')).toBe('true');
        const hint = within(document.body).getByText(PASSWORD_HINT);
        const weakError = 'Password does not meet the requirements.';
        expect(within(document.body).getByText(weakError)).toBeTruthy();
        const descriptions = password.getAttribute('aria-describedby')?.split(' ').map((id) => document.getElementById(id));
        expect(descriptions?.map((node) => node?.textContent)).toEqual([PASSWORD_HINT, weakError]);
        expect(input('Confirm Password').getAttribute('aria-describedby')).toBe(hint.id);
        await enter(input('Password'), 'Sample123');
        await enter(input('Confirm Password'), 'Different123');
        await interact(() => fireEvent.click(button()));
        expect(input('Password').getAttribute('aria-invalid')).not.toBe('true');
        expect(within(document.body).getByText('Passwords do not match.')).toBeTruthy();
        await enter(input('Confirm Password'), 'Sample123');
        await interact(() => fireEvent.click(button()));
        expect(within(document.body).getByRole('status').textContent).toContain('Password validated. No account was created.');
        expect(within(document.body).queryByRole('heading', { name: 'Choose Storage Location' })).toBeNull();
        expect(input('Password').value).toBe('');
        expect(input('Confirm Password').value).toBe('');
        expect(input('Password').disabled).toBe(true);
        expect(input('Confirm Password').getAttribute('aria-invalid')).not.toBe('true');
        await interact(() => fireEvent.click(button('Start over')));
        expect(input('Password').disabled).toBe(false);
        expect(within(document.body).queryByRole('status')).toBeNull();
        expect(button().disabled).toBe(false);
    });

    test('whole-row storage selection requires explicit Continue; Start over clears only that form', async () => {
        await mountExample(framework, 'storage');
        expect(button().disabled).toBe(true);
        expect(within(document.body).queryByLabelText('Password', { exact: true })).toBeNull();
        await interact(() => fireEvent.click(row('European Union (EU)')));
        expect(choice('European Union (EU)').getAttribute('aria-checked')).toBe('true');
        expect(button().disabled).toBe(false);
        expect(within(document.body).queryByRole('status')).toBeNull();
        await interact(() => fireEvent.click(row('United States (US)')));
        expect(choice('European Union (EU)').getAttribute('aria-checked')).toBe('false');
        expect(choice('United States (US)').getAttribute('aria-checked')).toBe('true');
        await interact(() => fireEvent.click(button()));
        expect(within(document.body).getByRole('status').textContent).toContain('United States (US). No account was created.');
        await interact(() => fireEvent.click(row('European Union (EU)')));
        expect(choice('United States (US)').getAttribute('aria-checked')).toBe('true');
        await interact(() => fireEvent.click(button('Start over')));
        expect(button().disabled).toBe(true);
        expect(choice('United States (US)').getAttribute('aria-checked')).toBe('false');
        expect(within(document.body).queryByRole('status')).toBeNull();
        expect(within(document.body).queryByRole('button', { name: 'Back to password' })).toBeNull();
    });

    test.each(['password', 'storage'] as const)('%s preserves its draft across viewport, surface and Page/Dialog changes', async (kind) => {
        const view = await mountExample(framework, kind);
        if (kind === 'password') await enter(input('Password'), 'Sample123');
        else await interact(() => fireEvent.click(row('European Union (EU)')));
        const expectDraft = () => {
            if (kind === 'password') expect(input('Password').value).toBe('Sample123');
            else expect(choice('European Union (EU)').getAttribute('aria-checked')).toBe('true');
            expect(document.querySelectorAll('button[type="submit"]')).toHaveLength(1);
        };
        for (const wide of [true, false]) {
            await view.resize(wide);
            expectDraft();
            expect(Boolean(button().closest(PHONE_FOOTER))).toBe(!wide);
        }
        const plain = within(document.body).getByRole('radio', { name: 'Plain', exact: true });
        const grouped = within(document.body).getByRole('radio', { name: 'Grouped', exact: true });
        const dialog = within(document.body).getByRole('switch', { name: 'dialog', exact: true });
        await interact(() => fireEvent.click(plain));
        expectDraft();
        await interact(() => fireEvent.click(dialog));
        expectDraft();
        expect(document.querySelector('[role="dialog"]')?.getAttribute('data-surface')).toBe('plain');
        await interact(() => fireEvent.click(grouped));
        expectDraft();
        await interact(() => fireEvent.click(dialog));
        const restoredPage = within(await within(document.body).findByRole('region', {
            name: kind === 'password' ? 'Create Password' : 'Choose Storage Location', exact: true,
        }));
        if (kind === 'password') await restoredPage.findByLabelText('Password', { selector: 'input', exact: true });
        else await restoredPage.findByRole('radio', { name: 'European Union (EU)', exact: true });
        expectDraft();
    });

    test('password and storage previews coexist with independent forms, validation and completion', async () => {
        await mountExample(framework, 'password');
        await mountExample(framework, 'storage');
        const forms = [...document.querySelectorAll<HTMLFormElement>('form')];
        const actions = [...document.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];
        expect(new Set(forms.map((form) => form.id)).size).toBe(2);
        expect(actions.map((action) => action.form)).toEqual(forms);
        expect(within(document.body).queryByRole('radio', { name: 'Storage', exact: true })).toBeNull();
        await enter(input('Password'), 'Sample123');
        await interact(() => fireEvent.click(row('United States (US)')));
        await interact(() => fireEvent.click(actions[1]));
        expect(input('Password').value).toBe('Sample123');
        await interact(() => fireEvent.click(actions[0]));
        expect(input('Confirm Password').getAttribute('aria-invalid')).toBe('true');
        expect(choice('United States (US)').getAttribute('aria-checked')).toBe('true');
        expect(within(document.body).getByRole('status').textContent).toContain('United States (US)');
        await enter(input('Confirm Password'), 'Sample123');
        await interact(() => fireEvent.click(button()));
        expect(within(document.body).getAllByRole('status')).toHaveLength(2);
        await interact(() => fireEvent.click(within(document.body).getAllByRole('button', { name: 'Start over', exact: true })[0]));
        expect(input('Password').disabled).toBe(false);
        expect(choice('United States (US)').getAttribute('aria-checked')).toBe('true');
        expect(within(document.body).getByRole('status').textContent).toContain('United States (US)');
    });
});
