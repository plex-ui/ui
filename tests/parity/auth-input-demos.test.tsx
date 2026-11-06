import { createRef } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { h, reactive, ref as vueRef } from 'vue';
import { AuthFields } from '../../components/docs/AuthFields';
import { AuthInput } from '../../components/docs/AuthInput';
import { AuthFields as VueAuthFields } from '../../components/docs/vue/AuthFields';
import { AuthInput as VueAuthInput } from '../../components/docs/vue/AuthInput';
import { flushVue, mountVue } from './harness';

const viewport = vi.hoisted(() => ({ wide: false }));
vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => viewport.wide }));

type Values = {
    email: string;
    password: string;
    error: string;
    wide: boolean;
    readonly: boolean;
    disabled: boolean;
};
const interact = async (action: () => void) => {
    await act(async () => {
        action();
        await flushVue();
    });
};

async function mountInputs(framework: string) {
    const values = reactive<Values>({
        email: 'sample@example.test',
        password: 'Sample123',
        error: 'Check this address.',
        wide: false,
        readonly: false,
        disabled: false,
    });
    const focused = vi.fn();
    const keyed = vi.fn();
    const changed = vi.fn();
    const revealed = vi.fn();
    const autofilled = vi.fn();
    const reactRef = createRef<HTMLInputElement>();
    const vueControl = vueRef<{ focus: () => void; input: HTMLInputElement | null } | null>(null);
    let refresh: (() => void) | undefined;
    const update = (key: 'email' | 'password', value: string) => {
        changed(value);
        values[key] = value;
        refresh?.();
    };
    const fields = () => (
        <>
            <span id="external-hint">External hint</span>
            <AuthFields className="flex flex-col gap-3">
                <AuthInput
                    ref={reactRef}
                    id="auth-fixture-email"
                    name="email"
                    label="Email address"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    maxLength={80}
                    aria-describedby="external-hint"
                    data-fixture-control="email"
                    value={values.email}
                    onChange={(event) => update('email', event.target.value)}
                    readOnly={values.readonly}
                    disabled={values.disabled}
                    errorMessage={values.error || undefined}
                    description="Use your own address."
                    onFocus={focused}
                    onKeyDown={(event) => keyed(event.key)}
                    onAutofill={autofilled}
                    onClear={() => update('email', '')}
                />
                <AuthInput
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={values.password}
                    onChange={(event) => update('password', event.target.value)}
                    onRevealedChange={revealed}
                    disabled={values.disabled}
                />
            </AuthFields>
        </>
    );
    if (framework === 'React') {
        const view = render(fields());
        refresh = () => view.rerender(fields());
    } else {
        mountVue(() =>
            h('div', [
                h('span', { id: 'external-hint' }, 'External hint'),
                h(
                    VueAuthFields,
                    { mobile: !values.wide, class: 'flex flex-col gap-3' },
                    {
                        default: () => [
                            h(VueAuthInput, {
                                ref: vueControl,
                                id: 'auth-fixture-email',
                                name: 'email',
                                label: 'Email address',
                                type: 'email',
                                inputmode: 'email',
                                autocomplete: 'email',
                                required: true,
                                maxlength: 80,
                                'aria-describedby': 'external-hint',
                                'data-fixture-control': 'email',
                                value: values.email,
                                'onUpdate:value': (value: string) => update('email', value),
                                readonly: values.readonly,
                                disabled: values.disabled,
                                errorMessage: values.error || undefined,
                                description: 'Use your own address.',
                                onFocus: focused,
                                onKeydown: (event: KeyboardEvent) => keyed(event.key),
                                onAutofill: autofilled,
                                onClear: () => update('email', ''),
                            }),
                            h(VueAuthInput, {
                                label: 'Password',
                                type: 'password',
                                autocomplete: 'new-password',
                                value: values.password,
                                'onUpdate:value': (value: string) => update('password', value),
                                onRevealedChange: revealed,
                                disabled: values.disabled,
                            }),
                        ],
                    },
                ),
            ]),
        );
        await flushVue();
    }
    return {
        values,
        focused,
        keyed,
        changed,
        revealed,
        autofilled,
        focus: () =>
            framework === 'React' ? reactRef.current?.focus() : vueControl.value?.focus(),
        input: () => (framework === 'React' ? reactRef.current : vueControl.value?.input),
        mutate: async (change: () => void) =>
            interact(() => {
                change();
                refresh?.();
            }),
        resize: async (wide: boolean) =>
            interact(() => {
                viewport.wide = wide;
                values.wide = wide;
                refresh?.();
            }),
    };
}

afterEach(() => {
    cleanup();
    viewport.wide = false;
});

describe.each(['React', 'Vue'])('%s auth input adapter', (framework) => {
    test('names inputs, forwards native attributes and ref, and keeps all error descriptions associated', async () => {
        const view = await mountInputs(framework);
        const page = within(document.body);
        const email = page.getByLabelText<HTMLInputElement>('Email address', { selector: 'input' });
        expect(email).toBe(view.input());
        expect(email.name).toBe('email');
        expect(email.type).toBe('email');
        expect(email.required).toBe(true);
        expect(email.maxLength).toBe(80);
        expect(email.autocomplete).toBe('email');
        expect(email.inputMode).toBe('email');
        expect(email.dataset.fixtureControl).toBe('email');
        expect(email.placeholder).toBe('Email address');
        expect(email.getAttribute('aria-invalid')).toBe('true');
        const descriptions = email.getAttribute('aria-describedby')?.split(' ') ?? [];
        expect(descriptions).toHaveLength(3);
        expect(descriptions.map((id) => document.getElementById(id)?.textContent)).toEqual([
            'External hint',
            'Check this address.',
            'Use your own address.',
        ]);
        expect(document.querySelectorAll('[data-auth-fields]')).toHaveLength(1);
        expect(document.querySelectorAll('[data-auth-input]')).toHaveLength(2);
        expect(document.querySelector('.TypeableLabel')).toBeNull();
        await interact(() => {
            view.focus();
            fireEvent.keyDown(email, { key: 'ArrowLeft' });
        });
        expect(document.activeElement).toBe(email);
        expect(view.focused).toHaveBeenCalledTimes(1);
        expect(view.keyed).toHaveBeenCalledWith('ArrowLeft');
        await interact(() => {
            // React selects the prefixed listener in jsdom; Vue binds the native name.
            for (const type of ['animationstart', 'webkitAnimationStart']) {
                const event = new Event(type, { bubbles: true });
                Object.defineProperty(event, 'animationName', { value: 'native-autofill-in' });
                email.dispatchEvent(event);
            }
        });
        expect(view.autofilled).toHaveBeenCalledTimes(1);
    });

    test('controlled typing, reveal and clear preserve values and focus without replacing the field', async () => {
        const view = await mountInputs(framework);
        const page = within(document.body);
        const email = page.getByLabelText<HTMLInputElement>('Email address', { selector: 'input' });
        await interact(() => {
            fireEvent.input(email, { target: { value: 'updated@example.test' } });
            fireEvent.change(email, { target: { value: 'updated@example.test' } });
        });
        expect(view.values.email).toBe('updated@example.test');
        expect(view.changed).toHaveBeenCalledWith('updated@example.test');
        const password = page.getByLabelText<HTMLInputElement>('Password', { selector: 'input' });
        await interact(() => {
            password.focus();
            password.setSelectionRange(2, 5);
            const reveal = page.getByRole('button', { name: 'Show', exact: true });
            expect(fireEvent.pointerDown(reveal, { button: 0, pointerType: 'touch' })).toBe(false);
            fireEvent.click(reveal);
        });
        expect(password.type).toBe('text');
        expect(password.value).toBe('Sample123');
        expect(document.activeElement).toBe(password);
        expect([password.selectionStart, password.selectionEnd]).toEqual([2, 5]);
        expect(view.revealed).toHaveBeenCalledWith(true);
        expect(
            page.getByRole('button', { name: 'Hide', exact: true }).getAttribute('aria-pressed'),
        ).toBe('true');
        await interact(() =>
            fireEvent.click(page.getByRole('button', { name: 'Clear input', exact: true })),
        );
        expect(view.values.email).toBe('');
        expect(document.activeElement).toBe(email);
        expect(page.getByLabelText('Email address', { selector: 'input' })).toBe(email);
    });

    test('Phone/Desktop remount retains controlled values and one input per label', async () => {
        const view = await mountInputs(framework);
        await view.mutate(() => {
            view.values.email = 'kept@example.test';
            view.values.error = '';
        });
        for (const wide of [true, false]) {
            await view.resize(wide);
            const inputs = within(document.body).getAllByLabelText<HTMLInputElement>(
                'Email address',
                { selector: 'input' },
            );
            expect(inputs).toHaveLength(1);
            expect(inputs[0].value).toBe('kept@example.test');
            expect(
                within(document.body).getByLabelText('Password', { selector: 'input' }),
            ).toHaveProperty('value', 'Sample123');
            expect(Boolean(document.querySelector('[data-auth-input]'))).toBe(!wide);
            expect(Boolean(document.querySelector('.TypeableLabel'))).toBe(wide);
            await interact(view.focus);
            expect(document.activeElement).toBe(inputs[0]);
        }
    });

    test('readonly and disabled flags reach the native field and disable destructive adornments', async () => {
        const view = await mountInputs(framework);
        await view.mutate(() => {
            view.values.readonly = true;
        });
        const page = within(document.body);
        expect(page.getByLabelText('Email address', { selector: 'input' })).toHaveProperty(
            'readOnly',
            true,
        );
        expect(page.queryByRole('button', { name: 'Clear input', exact: true })).toBeNull();
        await view.mutate(() => {
            view.values.disabled = true;
        });
        expect(page.getByLabelText('Email address', { selector: 'input' })).toHaveProperty(
            'disabled',
            true,
        );
        expect(page.queryByRole('button', { name: 'Show', exact: true })).toBeNull();
    });
});
