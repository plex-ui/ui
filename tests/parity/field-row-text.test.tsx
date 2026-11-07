import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { h } from 'vue';
import { Field as RField } from '../../packages/ui/src/components/Field';
import { Input as RInput } from '../../packages/ui/src/components/Input';
import { Textarea as RTextarea } from '../../packages/ui/src/components/Textarea';
import { Field } from '../../packages/vue/src/components/Field';
import { Input } from '../../packages/vue/src/components/Input';
import { Textarea } from '../../packages/vue/src/components/Textarea';
import { flushVue, mountVue } from './harness';

type Editor = 'input' | 'textarea';
type EditorOptions = { disabled?: boolean; prevent?: boolean; type?: string };

const press = async (element: HTMLElement) => {
    await act(async () => {
        fireEvent.click(element);
        await flushVue();
    });
};

describe.each(['React', 'Vue'])('%s Field text row', (framework) => {
    const mountEditor = async (kind: Editor, options: EditorOptions = {}) => {
        const inputClick = vi.fn();
        const nestedClick = vi.fn();
        const rowClick = vi.fn((event: { preventDefault: () => void }) => {
            if (options.prevent) event.preventDefault();
        });
        if (framework === 'React') {
            render(
                <RField
                    row
                    orientation="vertical"
                    label="Details"
                    description="Supporting details"
                    labelAction={
                        <button type="button" onClick={nestedClick}>
                            Help
                        </button>
                    }
                    onClick={rowClick}
                >
                    {kind === 'input' ? (
                        <RInput
                            variant="ghost"
                            defaultValue="ES00 0000 0000"
                            disabled={options.disabled}
                            type={options.type}
                            onClick={inputClick}
                        />
                    ) : (
                        <RTextarea
                            variant="ghost"
                            defaultValue="Monthly payout"
                            disabled={options.disabled}
                            onClick={inputClick}
                        />
                    )}
                </RField>,
            );
        } else {
            mountVue(() =>
                h(
                    Field,
                    {
                        row: true,
                        orientation: 'vertical',
                        label: 'Details',
                        description: 'Supporting details',
                        onClick: rowClick,
                    },
                    {
                        default: () =>
                            kind === 'input'
                                ? h(Input, {
                                      variant: 'ghost',
                                      defaultValue: 'ES00 0000 0000',
                                      disabled: options.disabled,
                                      type: options.type,
                                      onClick: inputClick,
                                  })
                                : h(Textarea, {
                                      variant: 'ghost',
                                      defaultValue: 'Monthly payout',
                                      disabled: options.disabled,
                                      onClick: inputClick,
                                  }),
                        labelAction: () =>
                            h('button', { type: 'button', onClick: nestedClick }, 'Help'),
                    },
                ),
            );
            await flushVue();
        }
        const page = within(document.body);
        const control = page.getByRole('textbox', { name: 'Details' });
        if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
            throw new Error('Expected a native text editor');
        }
        const row = control.closest<HTMLElement>('[data-row]');
        if (!row) throw new Error('Missing text row');
        return { page, control, row, inputClick, nestedClick, rowClick };
    };

    test.each(['input', 'textarea'] as const)(
        '%s row focuses its linked editor without clicking or changing the selection',
        async (kind) => {
            const { page, control, row, inputClick, rowClick } = await mountEditor(kind);
            const value = control.value;
            control.setSelectionRange(2, 5);
            const focus = vi.spyOn(control, 'focus');
            expect(row.hasAttribute('tabindex')).toBe(false);
            for (const target of [row, page.getByText('Supporting details')]) {
                await press(target);
                expect(document.activeElement).toBe(control);
                expect(control.value).toBe(value);
                expect([control.selectionStart, control.selectionEnd]).toEqual([2, 5]);
            }
            expect(focus).toHaveBeenCalledTimes(2);
            expect(focus).toHaveBeenCalledWith({ preventScroll: true });
            expect(inputClick).not.toHaveBeenCalled();
            expect(rowClick).toHaveBeenCalledTimes(2);
        },
    );

    test('nested actions and direct editor clicks retain their own behavior', async () => {
        const { page, control, inputClick, nestedClick } = await mountEditor('input');
        const focus = vi.spyOn(control, 'focus');
        const help = page.getByRole('button', { name: 'Help' });
        help.focus();
        await press(help);
        expect(nestedClick).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(help);
        expect(focus).not.toHaveBeenCalled();
        expect(inputClick).not.toHaveBeenCalled();
        control.setSelectionRange(1, 4);
        await press(control);
        expect(inputClick).toHaveBeenCalledTimes(1);
        expect(focus).not.toHaveBeenCalled();
        expect([control.selectionStart, control.selectionEnd]).toEqual([1, 4]);
    });

    test.each(['input', 'textarea'] as const)(
        'disabled %s is not focused from the row',
        async (kind) => {
            const { page, control, row, inputClick } = await mountEditor(kind, { disabled: true });
            const focus = vi.spyOn(control, 'focus');
            await press(row);
            await press(page.getByText('Supporting details'));
            expect(focus).not.toHaveBeenCalled();
            expect(document.activeElement).not.toBe(control);
            expect(inputClick).not.toHaveBeenCalled();
        },
    );

    test('a prevented row click does not focus the editor', async () => {
        const { control, row, rowClick } = await mountEditor('input', { prevent: true });
        const focus = vi.spyOn(control, 'focus');
        await press(row);
        expect(rowClick).toHaveBeenCalledTimes(1);
        expect(focus).not.toHaveBeenCalled();
    });

    test('native labels activate their input once without programmatic focus forwarding', async () => {
        const { page, control, inputClick } = await mountEditor('input');
        const focus = vi.spyOn(control, 'focus');
        await press(page.getByText('Details', { selector: 'label' }));
        expect(inputClick).toHaveBeenCalledTimes(1);
        // jsdom forwards the native label click but does not implement its focus default.
        expect(focus).not.toHaveBeenCalled();
    });

    test.each(['hidden', 'file', 'range', 'date'])(
        '%s inputs are outside the text-editor whitelist',
        async (type) => {
            if (framework === 'React') {
                render(
                    <RField row label="Other">
                        <RInput type={type} />
                    </RField>,
                );
            } else {
                mountVue(() => h(Field, { row: true, label: 'Other' }, () => h(Input, { type })));
                await flushVue();
            }
            const control = document.querySelector('input');
            const row = control?.closest<HTMLElement>('[data-row]');
            if (!control || !row) throw new Error('Missing non-text input row');
            const focus = vi.spyOn(control, 'focus');
            const click = vi.spyOn(control, 'click');
            await press(row);
            expect(focus).not.toHaveBeenCalled();
            expect(click).not.toHaveBeenCalled();
        },
    );
});

describe('A start adornment in a row is a prefix of the value', () => {
    const css = readFileSync('packages/styles/src/components/Field/Field.module.css', 'utf8');
    const phone = css.slice(css.indexOf('@media (max-width: 767px)'));

    test('the value follows a text prefix with no gap: a ghost row anywhere, every phone row; an icon, a button and a trailing unit keep the gap', () => {
        const ghost = /\.Field:where\(\[data-row\]\) \.Control > \[data-variant="ghost"\] > :first-child:not\(input, textarea, svg, :has\(svg\)\) \+ :is\(input, textarea\) \{([^}]*)\}/.exec(css)?.[1] ?? '';
        expect(ghost).toContain('margin-inline-start: calc(-1 * var(--input-gap));');
        const input = /\.Field:where\(\[data-row\]\) \.Control > \[data-slot="input"\] > :first-child:not\(input, textarea, svg, :has\(svg\)\) \+ input \{([^}]*)\}/.exec(phone)?.[1] ?? '';
        expect(input).toContain('margin-inline-start: calc(-1 * var(--input-gap));');
        const group = /\.Field:where\(\[data-row\]\) \.Control > \[data-slot="input-group"\]:has\(> \[data-align="inline-start"\] > \[data-slot="input-group-text"\]:only-child\) > \[data-slot="input-group-control"\] \{([^}]*)\}/.exec(phone)?.[1] ?? '';
        expect(group).toContain('padding-inline-start: 0;');
        expect(css).not.toMatch(/inline-end[^{]*\{[^}]*padding-inline-end: 0;/);
        // A :has() inside :has() is invalid CSS and drops the whole rule.
        const nestedHas = (selector: string) => {
            const stack: boolean[] = [];
            for (let index = 0; index < selector.length; index++) {
                if (selector.startsWith(':has(', index)) {
                    if (stack.includes(true)) return true;
                    stack.push(true);
                    index += 4;
                } else if (selector[index] === '(') stack.push(false);
                else if (selector[index] === ')') stack.pop();
            }
            return false;
        };
        const selectors = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{};]+)\{/g)].map((match) => match[1].trim());
        expect(selectors.filter(nestedHas)).toEqual([]);
        expect(nestedHas(':has(> a:not(:has(svg)))')).toBe(true);
    });

    test.each(['React', 'Vue'])('%s renders the prefix right before the input of the row', async (framework) => {
        if (framework === 'React') {
            render(
                <RField row label="Website">
                    <RInput placeholder="acme.com" startAdornment={<span>https://</span>} endAdornment={<span>.com</span>} />
                </RField>,
            );
        } else {
            mountVue(() => h(Field, { row: true, label: 'Website' }, () => h(Input, { placeholder: 'acme.com' }, { startAdornment: () => h('span', 'https://'), endAdornment: () => h('span', '.com') })));
            await flushVue();
        }
        const input = document.querySelector<HTMLInputElement>('input[placeholder="acme.com"]');
        const container = input?.parentElement;
        expect(container?.getAttribute('data-slot')).toBe('input');
        expect(container?.firstElementChild?.textContent).toBe('https://');
        expect(input?.previousElementSibling).toBe(container?.firstElementChild);
        cleanup();
        document.body.innerHTML = '';
    });
});
