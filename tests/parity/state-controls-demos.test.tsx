import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ButtonStatesDemo } from '../../components/docs/ButtonDemos';
import { DateInputOverviewDemo } from '../../components/docs/DateInputDemos';
import { DatePickerBaseDemo } from '../../components/docs/DatePickerDemos';
import { VueDemo, type VueDemoControl, type VueDemoOption, type VueDemoWhen } from '../../components/docs/vue/VueDemo';
import { VueDateInputDemo } from '../../components/docs/vue/VueDateInputDemos';
import { VueDatePickerDemo } from '../../components/docs/vue/VueDatePickerDemos';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
// Non-scoped parity CSS aliases primitive .Root classes and the embed-only filter.
// These tests mount demos directly, without a PreviewEmbed host.
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));
vi.mock('@plexui/ui/components/DatePicker', async () => import('../../packages/ui/src/components/DatePicker'));
vi.mock('@plexui/vue/components/DatePicker', async () => import('../../packages/vue/src/components/DatePicker'));

function example(page: string, name: string) {
  const mdx = readFileSync(`content/vue/components/${page}.mdx`, 'utf8');
  const read = (key: string): unknown => {
    const marker = `export const ${key} = `;
    const start = mdx.indexOf(marker);
    if (start < 0) throw new Error(`Missing ${key}`);
    const rest = mdx.slice(start + marker.length);
    const end = rest.search(/\nexport const |\n<UsageBlock>/);
    return new Function(`return ${rest.slice(0, end).trim()}`)();
  };
  const template = read(name);
  const rawControls = read(`${name}Controls`);
  if (typeof template !== 'string' || !Array.isArray(rawControls)) throw new Error('Invalid demo');
  const controls: VueDemoControl[] = rawControls.map((control: unknown) => {
    if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('type' in control) || !('default' in control)) throw new Error('Invalid control');
    const when = 'when' in control && control.when && typeof control.when === 'object' ? { when: control.when as VueDemoWhen } : {};
    if (control.type === 'boolean' && typeof control.default === 'boolean') return { name: control.name, type: 'boolean', default: control.default, ...when };
    if (control.type === 'range' && typeof control.default === 'number' && 'min' in control && typeof control.min === 'number' && 'max' in control && typeof control.max === 'number' && 'step' in control && typeof control.step === 'number') {
      return { name: control.name, type: 'range', default: control.default, min: control.min, max: control.max, step: control.step, ...when };
    }
    // An option is its value, or a value under a label (`none` for an unset time)
    const isOption = (option: unknown): option is VueDemoOption => typeof option === 'string'
      || (!!option && typeof option === 'object' && 'value' in option && typeof option.value === 'string' && 'label' in option && typeof option.label === 'string');
    if (control.type !== 'select' || typeof control.default !== 'string' || !('options' in control) || !Array.isArray(control.options) || !control.options.every(isOption)) throw new Error('Invalid select');
    return { name: control.name, type: 'select', default: control.default, options: control.options, ...when };
  });
  return { template, controls };
}
const button = example('button', 'states');
const dateInput = example('date-input', 'overview');
const datePicker = example('date-picker', 'overview');
const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  document.documentElement.style.setProperty('--breakpoint-md', '768px');
  // jsdom has no layout. Give Popper a visible anchor and viewport so
  // hideWhenDetached does not hide an otherwise mounted calendar.
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024);
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(768);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 40));
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('min-width') && 1024 >= Number(/min-width: (\d+)px/.exec(query)?.[1]), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true, onchange: null }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.documentElement.style.removeProperty('--breakpoint-md'); });

describe.each(['React', 'Vue'])('%s state-only demo consolidation', (framework) => {
  test('loading blocks the same buttons without visual disablement; disabled remains independent', async () => {
    const view = render(framework === 'React' ? <ButtonStatesDemo /> : <VueDemo {...button} />);
    await interact(() => {});
    const page = within(view.container);
    // Every variant takes the states (owner 08.11), so the example shows all four
    const names = ['Solid', 'Soft', 'Outline', 'Ghost'];
    const buttons = names.map((name) => page.getByRole<HTMLButtonElement>('button', { name }));
    expect(buttons.map((b) => b.dataset.variant)).toEqual(['solid', 'soft', 'outline', 'ghost']);
    for (const b of buttons) expect(b.disabled).toBe(false);
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'loading' })));
    for (const b of buttons) {
      expect(b.disabled).toBe(true);
      expect(b.hasAttribute('data-loading')).toBe(true);
      expect(b.hasAttribute('data-disabled')).toBe(false);
    }
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    for (const b of buttons) expect(b.hasAttribute('data-disabled')).toBe(true);
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'loading' })));
    for (const b of buttons) {
      expect(b.disabled).toBe(true);
      expect(b.hasAttribute('data-loading')).toBe(false);
    }
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    for (const b of buttons) expect(b.disabled).toBe(false);
    names.forEach((name, i) => expect(page.getByRole('button', { name })).toBe(buttons[i]));
  });

  test('date input preserves a typed date through disabled and accepts edits after re-enabling', async () => {
    const view = render(framework === 'React' ? <DateInputOverviewDemo /> : <VueDateInputDemo {...dateInput} state={{ date: null }} />);
    await interact(() => {});
    const page = within(view.container);
    const input = page.getByRole<HTMLInputElement>('textbox');
    await interact(() => { input.focus(); fireEvent.input(input, { target: { value: '15.01.2025' } }); });
    expect(input.value).toBe('15.01.2025');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(input.disabled).toBe(true);
    expect(input.value).toBe('15.01.2025');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(input.disabled).toBe(false);
    expect(page.getByRole('textbox')).toBe(input);
    await interact(() => { fireEvent.input(input, { target: { value: '16.02.2026' } }); input.blur(); });
    expect(input.value).toBe('16.02.2026');
  });

  test('date picker preserves its selection and trigger through disabled, then opens again', async () => {
    const view = render(framework === 'React' ? <DatePickerBaseDemo /> : <VueDatePickerDemo {...datePicker} />);
    await interact(() => {});
    const page = within(view.container);
    const trigger = page.getByRole('button', { name: 'Select date...' });
    await interact(() => fireEvent.click(trigger));
    const selected = DateTime.local().set({ day: 15 });
    const day = await waitFor(() => within(document.body).getByRole('button', { name: selected.toLocaleString(DateTime.DATE_HUGE), exact: true }));
    await interact(() => fireEvent.click(day));
    expect(trigger.textContent).toContain(selected.toFormat('MM/dd/yy'));
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(trigger.textContent).toContain(selected.toFormat('MM/dd/yy'));
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(trigger.getAttribute('aria-disabled')).not.toBe('true');
    expect(view.container.querySelector('#date-picker-base')).toBe(trigger);
    await interact(() => fireEvent.click(trigger));
    await waitFor(() => expect(within(document.body).getByRole('button', { name: selected.toLocaleString(DateTime.DATE_HUGE), exact: true }).getAttribute('aria-pressed')).toBe('true'));
  });
});
