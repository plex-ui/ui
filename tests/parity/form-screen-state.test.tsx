import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FormRowsGroupsDemo, FormRowsInputsDemo, FormRowsPayoutDemo, FormScreen } from '../../components/docs/FormRowsDemos';
import { OTPInputVerificationDemo } from '../../components/docs/OTPInputDemos';
import { createDemoControlChannel, DemoControlHostContext } from '../../components/docs/PreviewEmbed';

vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => false }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const click = async (node: HTMLElement) => { await act(async () => { fireEvent.click(node); }); };
const change = async (node: HTMLElement, value: string) => {
  await act(async () => { fireEvent.change(node, { target: { value } }); });
};

describe('form presentation state', () => {
  test('the hidden Phone control host never opens a portal or locks the documentation page', async () => {
    const host = createDemoControlChannel('screen-host-test', 'host');
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    const screen = <FormScreen title="Product" dialog><input aria-label="Product name" value="Cedar table" readOnly /></FormScreen>;
    const view = render(<DemoControlHostContext.Provider value={host}>{screen}</DemoControlHostContext.Provider>);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[data-form-screen]')).toBeTruthy();
    expect(document.body.style.overflow).toBe(bodyOverflow);
    expect(document.documentElement.style.overflow).toBe(rootOverflow);
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
    view.rerender(<DemoControlHostContext.Provider value={null}>{screen}</DemoControlHostContext.Provider>);
    const dialog = await within(document.body).findByRole('dialog', { name: 'Product' });
    expect(within(dialog).getByRole('textbox', { name: 'Product name' })).toHaveProperty('value', 'Cedar table');
  });

  test('contact values survive Page/Dialog and surface changes', async () => {
    render(<FormRowsInputsDemo />);
    const page = within(document.body);
    const dialog = page.getByRole('switch', { name: 'dialog' });
    const plain = page.getByRole('radio', { name: 'Plain' });
    await change(page.getByRole('textbox', { name: 'First name' }), 'Ada');
    await change(page.getByRole('textbox', { name: 'Note for the courier' }), 'Leave at reception');
    await click(plain);
    await click(dialog);
    expect(page.getByRole('textbox', { name: 'First name' }).getAttribute('value')).toBe('Ada');
    await click(page.getByRole('button', { name: 'Cancel' }));
    const restoredPage = await page.findByRole('region', { name: 'Edit contact', exact: true });
    expect(within(restoredPage).getByRole('textbox', { name: 'Note for the courier' })).toHaveProperty('value', 'Leave at reception');
    expect(restoredPage.getAttribute('data-surface')).toBe('plain');
  });

  test('product and its custom tag catalogue survive parent presentation switches', async () => {
    render(<FormRowsGroupsDemo />);
    const page = within(document.body);
    const dialog = page.getByRole('switch', { name: 'dialog' });
    await change(page.getByRole('textbox', { name: 'Name', exact: true }), 'Cedar table');
    await click(page.getByRole('button', { name: 'Materials: Oak, Steel' }));
    let editor = within(await page.findByRole('dialog', { name: 'Materials' }));
    await change(editor.getByRole('textbox', { name: 'New material' }), 'Cedar');
    await click(editor.getByRole('button', { name: 'Add', exact: true }));
    await click(editor.getByRole('button', { name: 'Apply materials' }));
    await page.findByRole('button', { name: 'Materials: Oak, Steel, Cedar', exact: true });
    await click(dialog);
    expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveProperty('value', 'Cedar table');
    await click(page.getByRole('button', { name: 'Materials: Oak, Steel, Cedar' }));
    editor = within(await page.findByRole('dialog', { name: 'Materials' }));
    expect(editor.getByRole('checkbox', { name: 'Cedar', exact: true }).getAttribute('aria-checked')).toBe('true');
    await click(editor.getByRole('checkbox', { name: 'Cedar', exact: true }));
    await click(editor.getByRole('button', { name: 'Close dialog', exact: true }));
    expect(await page.findByRole('button', { name: 'Materials: Oak, Steel, Cedar', exact: true })).toBeTruthy();
    // On a phone the Sheet's action is in its bottom Toolbar; Dialog.Footer is the desktop one.
    const sheet = page.getByRole('dialog', { name: 'Edit product' });
    await click(within(sheet.querySelector<HTMLElement>('[data-toolbar][data-placement="bottom"]')!).getByRole('button', { name: 'Save changes' }));
    const restoredPage = within(await page.findByRole('region', { name: 'Edit product', exact: true }));
    expect(restoredPage.getByRole('button', { name: 'Materials: Oak, Steel, Cedar', exact: true })).toBeTruthy();
    expect(restoredPage.getByRole('textbox', { name: 'Name', exact: true })).toHaveProperty('value', 'Cedar table');
  });

  test('payout error is a presentation prop and preserves the input node, value and caret', async () => {
    render(<FormRowsPayoutDemo />);
    const page = within(document.body);
    const input = page.getByRole('textbox', { name: 'IBAN' }) as HTMLInputElement;
    await change(input, 'ES91 edited');
    input.focus(); input.setSelectionRange(3, 6);
    await click(page.getByRole('switch', { name: 'error' }));
    expect(page.getByRole('textbox', { name: 'IBAN' })).toBe(input);
    expect(input.value).toBe('ES91 edited');
    expect(input.selectionStart).toBe(3);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('error');
    await click(page.getByRole('switch', { name: 'error' }));
    expect(page.queryByText('Enter a valid IBAN.')).toBeNull();
    expect(page.getByRole('textbox', { name: 'IBAN' })).toBe(input);
  });
});

describe.each(['email', 'phone'] as const)('%s verification state', (channel) => {
  test('error changes both input modes without replacing their values', async () => {
    render(<OTPInputVerificationDemo initialChannel={channel} />);
    const page = within(document.body);
    const error = page.getByRole('switch', { name: 'error' });
    await click(page.getByRole('radio', { name: 'Text field' }));
    const input = page.getByRole('textbox', { name: 'Code', exact: true }) as HTMLInputElement;
    await change(input, 'AB12CD');
    input.focus(); input.setSelectionRange(2, 4);
    await click(error);
    expect(page.getByRole('textbox', { name: 'Code', exact: true })).toBe(input);
    expect(input.value).toBe('AB12CD');
    expect(input.selectionStart).toBe(2);
    expect(page.getByText('Incorrect code')).toBeTruthy();
    await click(error);
    expect(page.queryByText('Incorrect code')).toBeNull();
    await click(page.getByRole('radio', { name: 'Per-digit' }));
    const digit = page.getByLabelText('Digit 1', { exact: true, selector: 'input' });
    await act(async () => { fireEvent.input(digit, { target: { value: '7' } }); });
    await click(error);
    expect(page.getByLabelText('Digit 1', { exact: true, selector: 'input' })).toBe(digit);
    expect(digit).toHaveProperty('value', '7');
    expect(page.getByText('Incorrect code')).toBeTruthy();
    await click(page.getByRole('radio', { name: 'Text field' }));
    expect(page.getByRole('textbox', { name: 'Code', exact: true })).toHaveProperty('value', 'AB12CD');
    const dialog = page.getByRole('switch', { name: 'dialog' });
    await click(dialog);
    expect(page.getByRole('textbox', { name: 'Code', exact: true })).toHaveProperty('value', 'AB12CD');
    await click(dialog);
    await click(page.getByRole('radio', { name: 'Per-digit' }));
    expect(page.getByLabelText('Digit 1', { exact: true, selector: 'input' })).toHaveProperty('value', '7');
  });
});
