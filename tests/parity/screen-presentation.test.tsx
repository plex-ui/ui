import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OAuthLoginFormDemo, OAuthSignupFormDemo } from '../../components/docs/OAuthFormDemos';
import { FloatingLabelInsideBillingFormDemo, FloatingLabelInputEmailLoginFormDemo, FloatingLabelInputPhoneLoginFormDemo, FloatingLabelInputPhoneSignupFormDemo, FloatingLabelInputPasswordFormDemo, FloatingLabelSelectAboutYouFormDemo } from '../../components/docs/FloatingLabelInputDemos';
import { FileUploadFormDemo } from '../../components/docs/FileUploadDemos';
import { CreatePasswordDemo } from '../../components/docs/OnboardingFlowDemos';
import { SettingsChecklistDemo } from '../../components/docs/SettingsChecklistDemo';
import { createDemoControlChannel, DemoControlHostContext } from '../../components/docs/PreviewEmbed';

vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => false }));
vi.mock('@plexui/ui/components/FileUpload', async () => import('../../packages/ui/src/components/FileUpload'));
beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const click = async (element: HTMLElement) => { await act(async () => { fireEvent.click(element); }); };
const input = (name: string) => within(document.body).getByLabelText<HTMLInputElement>(name, { selector: 'input', exact: true });

describe('Screen presentation keeps owner-held form data', () => {
  test.each([
    { name: 'OAuth login', Demo: OAuthLoginFormDemo, label: 'Email address', value: 'edited@plexui.com' },
    { name: 'OAuth signup', Demo: OAuthSignupFormDemo, label: 'Email address', value: 'edited@plexui.com' },
    { name: 'Billing', Demo: FloatingLabelInsideBillingFormDemo, label: 'Full name', value: 'Edited Name' },
    { name: 'Email login', Demo: FloatingLabelInputEmailLoginFormDemo, label: 'Email address', value: 'edited@plexui.com' },
    { name: 'Phone login', Demo: FloatingLabelInputPhoneLoginFormDemo, label: 'Phone number', value: '612345678' },
    { name: 'Phone signup', Demo: FloatingLabelInputPhoneSignupFormDemo, label: 'Email address', value: 'edited@plexui.com' },
    { name: 'Password', Demo: FloatingLabelInputPasswordFormDemo, label: 'Password', value: 'Edited123' },
    { name: 'About you', Demo: FloatingLabelSelectAboutYouFormDemo, label: 'Full name', value: 'Edited Name' },
    { name: 'Create password', Demo: CreatePasswordDemo, label: 'Password', value: 'Edited123' },
  ])('$name survives surface and Page/Dialog transitions', async ({ Demo, label, value }) => {
    render(<Demo />);
    const page = within(document.body);
    const dialog = page.getByRole('switch', { name: 'dialog', exact: true });
    const plain = page.getByRole('radio', { name: 'Plain', exact: true });
    const grouped = page.getByRole('radio', { name: 'Grouped', exact: true });
    const original = input(label);
    await act(async () => { fireEvent.change(original, { target: { value } }); });
    const edited = original.value;
    expect(edited).not.toBe('');
    expect(document.querySelector('.Page')?.getAttribute('data-surface')).toBe('grouped');
    await click(plain);
    expect(input(label)).toBe(original);
    expect(input(label).value).toBe(edited);
    await click(dialog);
    expect(input(label).value).toBe(edited);
    expect(document.querySelector('[role="dialog"]')?.getAttribute('data-surface')).toBe('plain');
    const inDialog = input(label);
    await click(grouped);
    expect(input(label)).toBe(inDialog);
    await click(dialog);
    const restoredPage = await page.findByRole('region');
    const restoredInput = await within(restoredPage).findByLabelText<HTMLInputElement>(label, { selector: 'input', exact: true });
    expect(restoredInput.value).toBe(edited);
  });

  test('removed upload files stay removed after presentation changes', async () => {
    render(<FileUploadFormDemo />);
    const page = within(document.body);
    const dialog = page.getByRole('switch', { name: 'dialog', exact: true });
    await click(page.getByLabelText('Remove government-id-scan.pdf', { exact: true }));
    await click(dialog);
    expect(page.queryByLabelText('Remove government-id-scan.pdf', { exact: true })).toBeNull();
    expect(page.getByLabelText('Remove passport-photo.png', { exact: true })).toBeTruthy();
    await click(dialog);
    const restoredPage = within(await page.findByRole('region'));
    expect(restoredPage.queryByLabelText('Remove government-id-scan.pdf', { exact: true })).toBeNull();
    expect(restoredPage.getByLabelText('Remove passport-photo.png', { exact: true })).toBeTruthy();
  });

  test('settings preserves the drill-in page, selections and Back across presentation changes', async () => {
    render(<SettingsChecklistDemo />);
    const page = within(document.body);
    const dialog = page.getByRole('switch', { name: 'dialog', exact: true });
    await click(page.getByRole('button', { name: 'Delivery: Email', exact: true }));
    await click(page.getByRole('checkbox', { name: 'Email', exact: true }));
    await click(dialog);
    expect(page.getByRole('checkbox', { name: 'Email', exact: true }).getAttribute('aria-checked')).toBe('false');
    await click(page.getByRole('button', { name: 'Back to notifications', exact: true }));
    expect(page.getByRole('button', { name: 'Delivery: None', exact: true })).toBeTruthy();
    await click(dialog);
    const restoredPage = within(await page.findByRole('region', { name: 'Notifications', exact: true }));
    expect(restoredPage.getByRole('button', { name: 'Delivery: None', exact: true })).toBeTruthy();
  });

  test('hidden Phone host keeps controls live without opening a Settings portal', async () => {
    const channel = createDemoControlChannel('settings', 'host');
    render(<DemoControlHostContext.Provider value={channel}><SettingsChecklistDemo /></DemoControlHostContext.Provider>);
    const toggle = within(document.body).getByRole('switch', { name: 'dialog', exact: true });
    await click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(within(document.body).queryByRole('dialog', { hidden: true })).toBeNull();
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });
});
