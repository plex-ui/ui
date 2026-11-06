import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OTPInputOverviewDemo } from '../../components/docs/OTPInputDemos';
import { VueDemo, type VueDemoControl } from '../../components/docs/vue/VueDemo';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));

const mdx = readFileSync('content/vue/components/otp-input.mdx', 'utf8');
function expression(name: string, next: string): unknown {
  const start = `export const ${name} = `;
  const source = mdx.slice(mdx.indexOf(start) + start.length, mdx.indexOf(`export const ${next} = `)).trim();
  return new Function(`return ${source}`)();
}
const template = expression('overview', 'overviewControls');
if (typeof template !== 'string') throw new Error('OTP overview template is missing');
const controls = expression('overviewControls', 'overviewCode') as VueDemoControl[];

const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(['React', 'Vue'])('%s OTP overview controls', (framework) => {
  const example = () => framework === 'React'
    ? <OTPInputOverviewDemo />
    : <VueDemo template={template} controls={controls} stageClassName="py-10 flex justify-center" />;

  test('error and disabled preserve edited cells and selection; presets replace only on request', async () => {
    const view = render(example());
    await interact(() => {});
    const page = within(view.container);
    expect(page.getByRole('radio', { name: 'Empty', exact: true }).getAttribute('aria-checked')).toBe('true');
    const digit = page.getByLabelText<HTMLInputElement>('Digit 1', { exact: true, selector: 'input' });
    await interact(() => fireEvent.input(digit, { target: { value: '7' } }));
    await interact(() => { digit.focus(); digit.setSelectionRange(0, 1); });
    const cells = Array.from(view.container.querySelectorAll<HTMLInputElement>('input'));
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'error' })));
    expect(page.getByLabelText('Digit 1', { exact: true, selector: 'input' })).toBe(digit);
    expect(digit.value).toBe('7');
    expect([digit.selectionStart, digit.selectionEnd]).toEqual([0, 1]);
    expect(digit.getAttribute('aria-invalid')).toBe('true');
    const errorId = digit.getAttribute('aria-describedby');
    expect(errorId && document.getElementById(errorId)?.textContent).toContain('Invalid verification code.');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(cells.every((cell) => cell.disabled)).toBe(true);
    expect(Array.from(view.container.querySelectorAll('input'))).toEqual(cells);
    expect(digit.value).toBe('7');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'error' })));
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(page.queryByText('Invalid verification code.')).toBeNull();
    expect(digit.value).toBe('7');
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'Filled', exact: true })));
    expect(cells.map((cell) => cell.value).join('')).toBe('488030');
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'Empty', exact: true })));
    expect(cells.map((cell) => cell.value).join('')).toBe('');
    expect(Array.from(view.container.querySelectorAll('input'))).toEqual(cells);
  });

  test('separate preview instances keep values and controls independent', async () => {
    const first = render(example());
    const second = render(example());
    await interact(() => {});
    const a = within(first.container);
    const b = within(second.container);
    await interact(() => fireEvent.click(a.getByRole('radio', { name: 'Filled', exact: true })));
    await interact(() => fireEvent.click(a.getByRole('switch', { name: 'error' })));
    expect(a.getByLabelText('Digit 1', { exact: true, selector: 'input' })).toHaveProperty('value', '4');
    expect(b.getByLabelText('Digit 1', { exact: true, selector: 'input' })).toHaveProperty('value', '');
    expect(b.getByRole('switch', { name: 'error' }).getAttribute('aria-checked')).toBe('false');
    expect(b.queryByText('Invalid verification code.')).toBeNull();
  });
});
