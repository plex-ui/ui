import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { VueFormExampleDemo } from '../../components/docs/vue/VueFormExamplesDemos';
import { flushVue } from './harness';

const preview = vi.hoisted(() => ({ phoneHost: false }));
vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => false }));
vi.mock('../../components/docs/PreviewEmbed', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components/docs/PreviewEmbed')>()),
  usePhoneViewport: () => preview.phoneHost,
}));
vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));

const mdx = readFileSync('content/vue/components/form-examples.mdx', 'utf8');
function expression(name: string, next: string) {
  return mdx.slice(mdx.indexOf(`export const ${name} = `) + `export const ${name} = `.length, mdx.indexOf(`export const ${next} = `)).trim();
}
const verifyEmail: unknown = new Function(`return ${expression('verifyEmail', 'confirmPhone')}`)();
if (typeof verifyEmail !== 'string') throw new Error('Verification template is missing');
const formScreen: unknown = new Function(`return ${expression('formScreen', 'formScreenCode')}`)();
const payout: unknown = new Function('formScreen', `return ${expression('rowErrors', 'rowState')}`)(formScreen);
if (typeof payout !== 'string') throw new Error('Payout template is missing');
const groups: unknown = new Function('formScreen', `return ${expression('rowGroups', 'rowGroupsCode')}`)(formScreen);
if (typeof groups !== 'string') throw new Error('Grouped product template is missing');
const rowState: unknown = new Function(`return ${expression('rowState', 'uploadFile')}`)();
if (!rowState || typeof rowState !== 'object' || Array.isArray(rowState)) throw new Error('Product state is missing');

const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); preview.phoneHost = false; vi.unstubAllGlobals(); });

describe('Vue form presentation controls', () => {
  test('verification error preserves the input, value and caret, and Page/Sheet retains both mode values', async () => {
    const view = render(<VueFormExampleDemo auth template={verifyEmail} state={{ code: '', otpValue: '' }} controls={[
      { name: 'input', type: 'select', options: ['per-digit', 'text-field'], default: 'text-field' },
      { name: 'error', type: 'boolean', default: false },
      { name: 'cooldown', type: 'boolean', default: false },
      { name: 'verifying', type: 'boolean', default: false },
    ]} />);
    const page = within(document.body);
    const controls = within(view.container.querySelector<HTMLElement>('[data-demo-controls]')!);
    const code = page.getByRole<HTMLInputElement>('textbox', { name: 'Code' });
    await interact(() => fireEvent.input(code, { target: { value: 'ABC123' } }));
    code.setSelectionRange(2, 4);
    await interact(() => fireEvent.click(controls.getByRole('switch', { name: 'error' })));
    expect(page.getByRole('textbox', { name: 'Code' })).toBe(code);
    expect(code.value).toBe('ABC123');
    expect([code.selectionStart, code.selectionEnd]).toEqual([2, 4]);
    expect(code.getAttribute('aria-invalid')).toBe('true');
    const errorId = code.getAttribute('aria-describedby');
    expect(errorId && document.getElementById(errorId)?.textContent).toContain('Incorrect code');
    await interact(() => fireEvent.click(controls.getByRole('radio', { name: 'Plain' })));
    expect(page.getByRole('textbox', { name: 'Code' })).toBe(code);
    await interact(() => fireEvent.click(controls.getByRole('switch', { name: 'dialog' })));
    expect(page.getByRole('textbox', { name: 'Code' })).toHaveProperty('value', 'ABC123');
    expect(page.getByRole('dialog').getAttribute('data-surface')).toBe('plain');
    // Docs mirrors these controls outside the Phone iframe, beyond its modal scope.
    await interact(() => fireEvent.click(controls.getByRole('radio', { name: 'per-digit', hidden: true })));
    const digit = page.getByLabelText<HTMLInputElement>('Digit 1');
    await interact(() => fireEvent.input(digit, { target: { value: '7' } }));
    await interact(() => fireEvent.click(controls.getByRole('switch', { name: 'dialog', hidden: true })));
    expect(page.getByLabelText<HTMLInputElement>('Digit 1').value).toBe('7');
    await interact(() => fireEvent.click(controls.getByRole('radio', { name: 'text-field' })));
    expect(page.getByRole('textbox', { name: 'Code' })).toHaveProperty('value', 'ABC123');
  });

  test('payout errors and presentation preserve edits while separate previews own independent nested values', async () => {
    const shared = { payout: { accountHolder: 'Jane Doe', iban: 'ES91 2100', reference: 'Monthly payout' } };
    const example = () => <VueFormExampleDemo template={payout} state={shared} controls={[{ name: 'error', type: 'boolean', default: false }]} />;
    const first = render(example());
    const second = render(example());
    const scope = within(first.container);
    const controls = within(first.container.querySelector<HTMLElement>('[data-demo-controls]')!);
    const iban = scope.getByRole<HTMLInputElement>('textbox', { name: 'IBAN' });
    await interact(() => fireEvent.input(iban, { target: { value: 'ES12 edited' } }));
    await interact(() => fireEvent.click(controls.getByRole('switch', { name: 'error' })));
    expect(scope.getByRole('textbox', { name: 'IBAN' })).toBe(iban);
    expect(iban.value).toBe('ES12 edited');
    expect(within(second.container).getByRole('textbox', { name: 'IBAN' })).toHaveProperty('value', 'ES91 2100');
    expect(shared.payout.iban).toBe('ES91 2100');
    await interact(() => fireEvent.click(controls.getByRole('switch', { name: 'dialog' })));
    expect(within(document.body).getByRole('dialog').querySelector('input[aria-invalid="true"]')).toHaveProperty('value', 'ES12 edited');
  });

  test('Several groups keeps edited product data and nested tag drafts across Cancel, Save and presentation changes', async () => {
    const view = render(<VueFormExampleDemo template={groups} state={{ ...rowState }} controls={[{ name: 'columns', type: 'boolean', default: true }]} />);
    const page = within(document.body);
    const controls = within(view.container.querySelector<HTMLElement>('[data-demo-controls]')!);
    await interact(() => fireEvent.input(page.getByRole('textbox', { name: 'Name', exact: true }), { target: { value: 'Edited table' } }));
    await interact(() => fireEvent.click(controls.getByRole('switch', { name: 'dialog' })));
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Materials: Oak, Steel' })));
    const editor = within(page.getByRole('dialog', { name: 'Materials', exact: true }));
    await interact(() => fireEvent.click(editor.getByRole('checkbox', { name: 'Steel', exact: true })));
    await interact(() => fireEvent.click(editor.getByRole('button', { name: 'Apply materials' })));
    expect(page.getByRole('button', { name: 'Materials: Oak', exact: true })).toBeTruthy();
    // On a phone the Sheet discards from its top Toolbar; Cancel belongs to the desktop footer.
    const phoneBar = page.getByRole('dialog', { name: 'Edit product' }).querySelector<HTMLElement>('[data-toolbar][data-placement="top"]')!;
    await interact(() => fireEvent.click(within(phoneBar).getByRole('button', { name: 'Close dialog' })));
    expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveProperty('value', 'Edited table');
    await interact(() => fireEvent.click(controls.getByRole('switch', { name: 'dialog' })));
    const phoneFooter = page.getByRole('dialog', { name: 'Edit product' }).querySelector<HTMLElement>('[data-toolbar][data-placement="bottom"]')!;
    await interact(() => fireEvent.click(within(phoneFooter).getByRole('button', { name: 'Save changes' })));
    expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveProperty('value', 'Edited table');
    expect(page.getByRole('button', { name: 'Materials: Oak', exact: true })).toBeTruthy();
  });

  test('the hidden Phone host retains dialog controls without opening a modal over the documentation', async () => {
    preview.phoneHost = true;
    const view = render(<VueFormExampleDemo template={groups} state={{ ...rowState }} controls={[{ name: 'columns', type: 'boolean', default: true }]} />);
    const page = within(view.container);
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'dialog' })));
    expect(page.getByRole('switch', { name: 'dialog' }).getAttribute('aria-checked')).toBe('true');
    expect(within(document.body).queryByRole('dialog')).toBeNull();
    expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveProperty('value', 'Oak side table');
  });
});
