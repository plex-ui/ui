import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OTPInputVerificationDemo } from '../../components/docs/OTPInputDemos';
import { VueFormExampleDemo } from '../../components/docs/vue/VueFormExamplesDemos';
import { createVerificationAttempt, isVerificationCodeReady, startResendCountdown } from '../../components/docs/verificationCountdown';
import { flushVue } from './harness';

// A phone screen's action sits in a bottom Toolbar, which takes the place of the footer.
const PHONE_FOOTER = '[data-toolbar][data-placement="bottom"]';

const viewport = vi.hoisted(() => ({ wide: false }));
vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => viewport.wide }));
vi.mock('../../components/docs/VuePreview', async () => ({
    VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));

const mdx = readFileSync('content/vue/components/auth-forms.mdx', 'utf8');
function template(name: string, next: string): string {
    const prefix = `export const ${name} = `;
    const start = mdx.indexOf(prefix) + prefix.length;
    const result: unknown = new Function(`return ${mdx.slice(start, mdx.indexOf(`export const ${next} = `, start)).trim()}`)();
    if (typeof result !== 'string') throw new Error(`Missing ${name} template`);
    return result;
}
const verificationTemplate = template('verification', 'aboutYouFields');
const interact = async (action: () => void) => act(async () => { action(); await flushVue(); });
const tick = async (milliseconds: number) => act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); await flushVue(); });
const enter = async (input: HTMLElement, value: string) => interact(() => {
    fireEvent.input(input, { target: { value } });
    fireEvent.change(input, { target: { value } });
});

async function mountVerification(framework: string, recipient: 'email' | 'phone') {
    const view = render(framework === 'React'
        ? <OTPInputVerificationDemo initialChannel={recipient} />
        : <VueFormExampleDemo auth template={verificationTemplate} state={{ otpValue: '', code: '' }} controls={[
            { name: 'channel', type: 'select', options: [{ value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' }], default: recipient },
            { name: 'input', type: 'select', options: [{ value: 'per-digit', label: 'Per-digit' }, { value: 'text-field', label: 'Text field' }], default: 'per-digit' },
            { name: 'error', type: 'boolean', default: false },
            { name: 'cooldown', type: 'boolean', default: false },
            { name: 'verifying', type: 'boolean', default: false },
        ]} />);
    await act(async () => { await flushVue(); });
    return { ...view, page: within(view.container), resendLabel: recipient === 'email' ? 'Resend email' : 'Resend code' };
}

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); viewport.wide = false; vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('verification countdown clock', () => {
    test('uses elapsed time, finishes once, and its cancellation leaves no callback behind', () => {
        vi.useFakeTimers();
        const report = vi.fn();
        const complete = vi.fn();
        const cancel = startResendCountdown(report, complete);
        expect(report).toHaveBeenLastCalledWith(30);
        vi.advanceTimersByTime(1000);
        expect(report).toHaveBeenLastCalledWith(29);
        vi.setSystemTime(Date.now() + 35000);
        vi.advanceTimersByTime(1000);
        expect(report).toHaveBeenLastCalledWith(0);
        expect(complete).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(60000);
        expect(complete).toHaveBeenCalledTimes(1);
        cancel();
        const next = startResendCountdown(report, complete);
        expect(report).toHaveBeenLastCalledWith(30);
        next();
        const count = report.mock.calls.length;
        vi.advanceTimersByTime(60000);
        expect(report).toHaveBeenCalledTimes(count);
        expect(vi.getTimerCount()).toBe(0);
    });

    test('checks completeness without prescribing a text-code length or validating against a server', () => {
        expect(isVerificationCodeReady('per-digit', '12345')).toBe(false);
        expect(isVerificationCodeReady('per-digit', '123456')).toBe(true);
        expect(isVerificationCodeReady('per-digit', '12345A')).toBe(false);
        expect(isVerificationCodeReady('text-field', '  ')).toBe(false);
        expect(isVerificationCodeReady('text-field', 'A48B')).toBe(true);
        expect(isVerificationCodeReady('text-field', 'A48B-Z')).toBe(false);
    });
});

describe('verification attempt guard', () => {
    test('ignores duplicate completion and pending submissions until edit or resend', () => {
        const attempt = createVerificationAttempt();
        expect(attempt.start('per-digit', '12345')).toBe(false);
        expect(attempt.start('per-digit', '123456')).toBe(true);
        expect(attempt.start('per-digit', '123456')).toBe(false);
        expect(attempt.start('per-digit', '654321')).toBe(false);
        expect(attempt.start('text-field', 'A48B')).toBe(false);
        attempt.setPending(false);
        expect(attempt.start('per-digit', '123456')).toBe(false);
        attempt.edit('12345');
        expect(attempt.start('per-digit', '123456')).toBe(true);
        attempt.setPending(false);
        attempt.reset();
        expect(attempt.start('per-digit', '123456')).toBe(true);
    });

    test('explicit text submission can retry an unchanged code after pending finishes', () => {
        const attempt = createVerificationAttempt();
        expect(attempt.start('text-field', 'A48B')).toBe(true);
        expect(attempt.start('text-field', 'A48B')).toBe(false);
        attempt.setPending(false);
        expect(attempt.start('text-field', 'A48B')).toBe(true);
    });
});

describe.each(['React', 'Vue'])('%s verification actions', (framework) => {
    test('the channel control switches between email and phone copy and keeps the entered code', async () => {
        // Plan 177: Verify email and Confirm phone are one example; the channel only changes the copy.
        const view = await mountVerification(framework, 'email');
        const title = () => view.container.querySelector('[data-auth-title]')?.textContent;
        expect(title()).toBe('Verify your email address');
        expect(view.page.getByText('Enter the code sent to alex.johnson@example.com')).toBeTruthy();
        await interact(() => fireEvent.click(view.page.getByRole('radio', { name: 'Text field' })));
        const code = view.page.getByLabelText<HTMLInputElement>('Code', { selector: 'input', exact: true });
        await enter(code, 'A48B');
        await interact(() => fireEvent.click(view.page.getByRole('radio', { name: 'Phone' })));
        expect(title()).toBe('Confirm phone');
        expect(view.page.getByText('Enter the code sent to +1 555 123 4567')).toBeTruthy();
        expect(view.page.getByRole('button', { name: 'Resend code', exact: true })).toBeTruthy();
        expect(view.page.getByLabelText<HTMLInputElement>('Code', { selector: 'input', exact: true }).value).toBe('A48B');
    });

    test.each(['email', 'phone'] as const)('%s countdown restarts, expires, preserves values and cleans up on unmount', async (recipient) => {
        vi.useFakeTimers();
        const view = await mountVerification(framework, recipient);
        await interact(() => fireEvent.click(view.page.getByRole('radio', { name: 'Text field' })));
        const code = view.page.getByLabelText<HTMLInputElement>('Code', { selector: 'input', exact: true });
        await enter(code, 'A48B');
        await interact(() => fireEvent.click(view.page.getByRole('button', { name: view.resendLabel, exact: true })));
        expect(view.page.getByRole<HTMLButtonElement>('button', { name: `${view.resendLabel} (30s)` }).disabled).toBe(true);
        await tick(1000);
        expect(view.page.getByRole('button', { name: `${view.resendLabel} (29s)` })).toBeTruthy();
        await interact(() => fireEvent.click(view.page.getByRole('radio', { name: 'Plain' })));
        await tick(1000);
        expect(view.page.getByRole('button', { name: `${view.resendLabel} (28s)` })).toBeTruthy();
        expect(view.page.getByLabelText('Code', { selector: 'input', exact: true })).toBe(code);
        expect(code.value).toBe('A48B');
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'dialog' })));
        await tick(1000);
        const dialogResend = within(document.body).getByRole<HTMLButtonElement>('button', { name: `${view.resendLabel} (27s)` });
        const dialogSubmit = within(document.body).getByRole<HTMLButtonElement>('button', { name: 'Continue', exact: true });
        const dialogFooter = dialogSubmit.closest<HTMLElement>(PHONE_FOOTER);
        if (!dialogFooter) throw new Error('Dialog Continue has no footer');
        expect(within(dialogFooter).getAllByRole('button')).toEqual([dialogSubmit]);
        expect(dialogResend.form).toBe(dialogSubmit.form);
        expect(dialogFooter.contains(dialogResend)).toBe(false);
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'dialog', hidden: true })));
        await tick(1000);
        expect(view.page.getByRole('button', { name: `${view.resendLabel} (26s)` })).toBeTruthy();
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'cooldown' })));
        expect(view.page.getByRole<HTMLButtonElement>('button', { name: view.resendLabel, exact: true }).disabled).toBe(false);
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'cooldown' })));
        expect(view.page.getByRole('button', { name: `${view.resendLabel} (30s)` })).toBeTruthy();
        await tick(30000);
        expect(view.page.getByRole<HTMLButtonElement>('button', { name: view.resendLabel, exact: true }).disabled).toBe(false);
        expect(view.page.getByRole('switch', { name: 'cooldown' }).getAttribute('aria-checked')).toBe('false');
        await interact(() => fireEvent.click(view.page.getByRole('button', { name: view.resendLabel, exact: true })));
        view.unmount();
        await act(async () => { await flushVue(); });
        expect(vi.getTimerCount()).toBe(0);
    });

    test.each([false, true])('Resend follows the code while only Continue uses the Phone footer (wide=%s)', async (wide) => {
        viewport.wide = wide;
        const view = await mountVerification(framework, 'email');
        expect(view.page.queryByRole('button', { name: 'Continue', exact: true })).toBeNull();
        expect(view.container.querySelector(PHONE_FOOTER)).toBeNull();
        await interact(() => fireEvent.click(view.page.getByRole('radio', { name: 'Text field' })));
        const submit = view.page.getByRole<HTMLButtonElement>('button', { name: 'Continue', exact: true });
        const form = submit.form;
        if (!form) throw new Error('Continue is not associated with its form');
        expect(view.container.querySelectorAll('[data-verification-actions]')).toHaveLength(1);
        expect(form.contains(submit)).toBe(wide);
        expect(Boolean(submit.closest(PHONE_FOOTER))).toBe(!wide);
        const resend = view.page.getByRole<HTMLButtonElement>('button', { name: view.resendLabel, exact: true });
        expect(form.contains(resend)).toBe(true);
        expect(resend.closest(PHONE_FOOTER)).toBeNull();
        const footer = submit.closest<HTMLElement>(PHONE_FOOTER);
        if (footer) expect(within(footer).getAllByRole('button')).toEqual([submit]);
        expect(submit.disabled).toBe(true);
        await interact(() => fireEvent.submit(form));
        expect(view.page.getByRole('switch', { name: 'verifying' }).getAttribute('aria-checked')).toBe('false');
        const code = view.page.getByLabelText<HTMLInputElement>('Code', { selector: 'input', exact: true });
        await enter(code, 'A48B');
        code.setSelectionRange(1, 3);
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'error' })));
        expect(view.page.getByLabelText('Code', { selector: 'input', exact: true })).toBe(code);
        expect([code.selectionStart, code.selectionEnd]).toEqual([1, 3]);
        const error = view.page.getByText('Incorrect code');
        expect(Boolean(code.compareDocumentPosition(resend) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        expect(Boolean(error.compareDocumentPosition(resend) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        await interact(() => fireEvent.click(submit));
        expect(submit.getAttribute('data-loading')).toBe('');
        expect(submit.disabled).toBe(true);
        expect(code.disabled).toBe(true);
        expect(code.value).toBe('A48B');
        expect([code.selectionStart, code.selectionEnd]).toEqual([1, 3]);
        expect(view.page.getByRole<HTMLButtonElement>('button', { name: 'Resend email', exact: true }).disabled).toBe(true);
        await interact(() => fireEvent.submit(form));
        expect(view.page.getByRole('switch', { name: 'verifying' }).getAttribute('aria-checked')).toBe('true');
        expect(view.page.queryByRole('status')).toBeNull();
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'verifying' })));
        expect(submit.disabled).toBe(false);
        expect(code.disabled).toBe(false);
        expect(code.value).toBe('A48B');
        expect([code.selectionStart, code.selectionEnd]).toEqual([1, 3]);
    });

    test.each(['typing', 'paste', 'autofill'] as const)('%s completes once without Continue and permits an edited retry after an error', async (entry) => {
        const view = await mountVerification(framework, 'phone');
        const cells = view.page.getAllByLabelText<HTMLInputElement>(/^Digit \d$/, { selector: 'input' });
        const form = cells[0].form;
        if (!form) throw new Error('OTP has no form');
        expect(view.page.queryByRole('button', { name: 'Continue', exact: true })).toBeNull();
        expect(view.container.querySelector(PHONE_FOOTER)).toBeNull();
        await interact(() => fireEvent.submit(form));
        expect(form.getAttribute('aria-busy')).toBe('false');
        const actionSlot = form.querySelector('[data-verification-resend]');
        expect(actionSlot?.contains(view.page.getByRole('button', { name: view.resendLabel, exact: true }))).toBe(true);
        if (entry === 'typing') {
            for (let index = 0; index < 5; index += 1) {
                await interact(() => fireEvent.input(cells[index], { target: { value: String(index + 1) } }));
                expect(form.getAttribute('aria-busy')).toBe('false');
            }
            await interact(() => fireEvent.input(cells[5], { target: { value: '6' } }));
        } else if (entry === 'paste') {
            await interact(() => fireEvent.paste(cells[0], { clipboardData: { getData: () => '123 456' } }));
        } else {
            await interact(() => fireEvent.input(cells[0], { target: { value: '123456' } }));
        }
        expect(form.getAttribute('aria-busy')).toBe('true');
        expect(actionSlot?.contains(view.page.getByRole('status', { name: 'Checking code' }))).toBe(true);
        expect(form.querySelector('[data-verification-resend]')).toBe(actionSlot);
        expect(cells.map((cell) => cell.value).join('')).toBe('123456');
        expect(cells.every((cell) => cell.disabled)).toBe(true);
        expect(view.page.queryByRole('button', { name: 'Resend code', exact: true })).toBeNull();
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'error' })));
        expect(form.getAttribute('aria-busy')).toBe('false');
        expect(view.page.getByText('Incorrect code')).toBeTruthy();
        expect(view.page.queryByRole('status')).toBeNull();
        expect(cells.every((cell) => !cell.disabled)).toBe(true);
        expect(actionSlot?.contains(view.page.getByRole('button', { name: view.resendLabel, exact: true }))).toBe(true);
        expect(view.page.getAllByLabelText(/^Digit \d$/, { selector: 'input' })).toEqual(cells);
        expect(cells.map((cell) => cell.value).join('')).toBe('123456');
        await interact(() => fireEvent.input(cells[5], { target: { value: '6' } }));
        expect(form.getAttribute('aria-busy')).toBe('false');
        expect(view.page.getByText('Incorrect code')).toBeTruthy();
        await interact(() => fireEvent.input(cells[5], { target: { value: '' } }));
        expect(view.page.queryByText('Incorrect code')).toBeNull();
        await interact(() => fireEvent.input(cells[5], { target: { value: '6' } }));
        expect(form.getAttribute('aria-busy')).toBe('true');
        expect(cells.map((cell) => cell.value).join('')).toBe('123456');
    });

    test('completion blocks a same-tick resend before disabled controls have rendered', async () => {
        const view = await mountVerification(framework, 'email');
        const digit = view.page.getByLabelText<HTMLInputElement>('Digit 1', { selector: 'input', exact: true });
        const resend = view.page.getByRole('button', { name: 'Resend email', exact: true });
        await interact(() => {
            fireEvent.input(digit, { target: { value: '123456' } });
            fireEvent.click(resend);
        });
        expect(view.page.getByRole('switch', { name: 'verifying' }).getAttribute('aria-checked')).toBe('true');
        expect(view.page.getByRole('switch', { name: 'cooldown' }).getAttribute('aria-checked')).toBe('false');
    });

    test('resend resets completion without replacing the draft and presentation changes do not resubmit it', async () => {
        vi.useFakeTimers();
        const view = await mountVerification(framework, 'email');
        const first = view.page.getByLabelText<HTMLInputElement>('Digit 1', { selector: 'input', exact: true });
        await interact(() => fireEvent.input(first, { target: { value: '123456' } }));
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'verifying' })));
        await interact(() => fireEvent.click(view.page.getByRole('radio', { name: 'Plain' })));
        await interact(() => fireEvent.click(view.page.getByRole('switch', { name: 'dialog' })));
        const dialog = within(document.body).getByRole('dialog');
        expect(dialog.querySelector(PHONE_FOOTER)).toBeNull();
        expect(dialog.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
        expect(within(dialog).queryByRole('button', { name: 'Continue', exact: true })).toBeNull();
        const digit = within(dialog).getByLabelText<HTMLInputElement>('Digit 1', { selector: 'input', exact: true });
        await interact(() => fireEvent.input(digit, { target: { value: '123456' } }));
        expect(dialog.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
        await interact(() => fireEvent.click(within(dialog).getByRole('button', { name: 'Resend email', exact: true })));
        expect(within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Resend email (30s)' }).disabled).toBe(true);
        expect(within(dialog).getAllByLabelText<HTMLInputElement>(/^Digit \d$/, { selector: 'input' }).map((cell) => cell.value).join('')).toBe('123456');
        await interact(() => fireEvent.input(digit, { target: { value: '123456' } }));
        expect(dialog.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
        expect(within(dialog).getByRole('status', { name: 'Checking code' })).toBeTruthy();
    });

    test('separate previews own their entered code and resend timer', async () => {
        vi.useFakeTimers();
        const first = await mountVerification(framework, 'email');
        const second = await mountVerification(framework, 'email');
        await interact(() => fireEvent.click(first.page.getByRole('button', { name: 'Resend email', exact: true })));
        await tick(1000);
        expect(first.page.getByRole('button', { name: 'Resend email (29s)' })).toBeTruthy();
        expect(second.page.getByRole<HTMLButtonElement>('button', { name: 'Resend email', exact: true }).disabled).toBe(false);
        expect(second.page.getByRole('switch', { name: 'cooldown' }).getAttribute('aria-checked')).toBe('false');
    });
});
