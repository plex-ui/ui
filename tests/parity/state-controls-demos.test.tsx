import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { DateTime, Settings } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ButtonStatesDemo } from '../../components/docs/ButtonDemos';
import { DateInputOverviewDemo } from '../../components/docs/DateInputDemos';
import { DatePickerOverviewDemo } from '../../components/docs/DatePickerDemos';
import { VueDemo, type VueDemoControl, type VueDemoOption, type VueDemoWhen } from '../../components/docs/vue/VueDemo';
import { VueDateInputDemo } from '../../components/docs/vue/VueDateInputDemos';
import { VueDatePickerDemo } from '../../components/docs/vue/VueDatePickerDemos';
import { phoneRows } from '../../components/docs/phoneRowsTemplate';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
// Non-scoped parity CSS aliases primitive .Root classes and the embed-only filter.
// These tests mount demos directly, without a PreviewEmbed host.
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));
vi.mock('@plexui/ui/components/DatePicker', async () => import('../../packages/ui/src/components/DatePicker'));
vi.mock('@plexui/vue/components/DatePicker', async () => import('../../packages/vue/src/components/DatePicker'));

/** An `export const` of a Vue page */
function pageExport(page: string, key: string): unknown {
  const mdx = readFileSync(`content/vue/components/${page}.mdx`, 'utf8');
  const marker = `export const ${key} = `;
  const start = mdx.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${key}`);
  const rest = mdx.slice(start + marker.length);
  const end = rest.search(/\nexport const |\n\{\/\*|\n<UsageBlock>/);
  return new Function(`return ${rest.slice(0, end).trim()}`)();
}

function example(page: string, name: string) {
  const read = (key: string) => pageExport(page, key);
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
// The Date Picker Overview as its page mounts it: its phone row, and the controls it keeps on desktop
const datePicker = {
  ...example('date-picker', 'overview'),
  phoneTemplate: phoneRows(pageExport('date-picker', 'overviewPhone') as string),
  desktopControlNames: pageExport('date-picker', 'overviewDesktopControls') as string[],
};
const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };
// A viewport that can turn from a desktop into a phone and back, firing the media queries' change listeners
function viewport() {
  let wide = true;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return wide ? query.includes('min-width') && 1024 >= Number(/min-width: (\d+)px/.exec(query)?.[1]) : !query.includes('min-width'); },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
    onchange: null,
  }));
  return (next: 'desktop' | 'phone') => interact(() => { wide = next === 'desktop'; listeners.forEach((listener) => listener()); });
}
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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.documentElement.style.removeProperty('--breakpoint-md'); Settings.now = () => Date.now(); });

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
    const view = render(framework === 'React' ? <DatePickerOverviewDemo /> : <VueDatePickerDemo {...datePicker} />);
    await interact(() => {});
    const page = within(view.container);
    const trigger = page.getByRole('button', { name: 'Select date' });
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

  test('date picker: one Overview carries every setting, each offered where it acts (owner 11.11)', async () => {
    // Today is the 15th of November 2026, so 30 days back is the 16th of October
    Settings.now = () => new Date(2026, 10, 15, 12).valueOf();
    const view = render(framework === 'React' ? <DatePickerOverviewDemo /> : <VueDatePickerDemo {...datePicker} />);
    await interact(() => {});
    const page = within(view.container);
    const trigger = () => view.container.querySelector<HTMLElement>('#date-picker-base')!;
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const offered = (name: string) => page.queryByRole('radiogroup', { name }) !== null || page.queryByRole('slider', { name }) !== null;
    const calendar = () => within(document.body);
    const open = async () => { await interact(() => fireEvent.click(trigger())); await waitFor(() => calendar().getByRole('button', { name: 'Next month' })); };
    const close = () => interact(() => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' }));
    const day = (date: DateTime) => calendar().getByRole<HTMLButtonElement>('button', { name: date.toLocaleString(DateTime.DATE_HUGE), exact: true });
    // A time format comes with a time, a year range with the dropdown caption, an align offset with an edge
    expect([offered('triggerTimeFormat'), offered('yearRange'), offered('alignOffset')]).toEqual([false, false, false]);
    // The dropdown icon: the double chevron (two glyphs, one for a phone), a chevron, or none
    const glyphs = () => trigger().querySelectorAll('[data-no-autosize]').length;
    const dropdownGlyphs = glyphs();
    await choose('dropdownIconType', 'chevronDown');
    expect(glyphs()).toBe(dropdownGlyphs - 1);
    await choose('dropdownIconType', 'none');
    expect(glyphs()).toBe(dropdownGlyphs - 2);
    await choose('dropdownIconType', 'dropdown');
    // The trigger's frame and icons
    await choose('variant', 'soft');
    await choose('size', 'md');
    await toggle('pill');
    await toggle('block');
    expect([trigger().dataset.variant, trigger().dataset.size, trigger().hasAttribute('data-pill'), trigger().hasAttribute('data-block')]).toEqual(['soft', 'md', false, true]);
    // The calendar icon leads the trigger
    const leadsWithIcon = () => trigger().firstElementChild?.tagName.toLowerCase() === 'svg';
    expect(leadsWithIcon()).toBe(true);
    await toggle('triggerShowIcon');
    expect(leadsWithIcon()).toBe(false);
    // A picked date in the chosen format, then a time as a part of its own
    await choose('triggerDateFormat', 'MMM d, yyyy');
    await open();
    const selected = DateTime.local().set({ day: 15 });
    await interact(() => fireEvent.click(day(selected)));
    await close();
    expect(trigger().textContent).toContain(selected.toFormat('MMM d, yyyy'));
    // A picked date can be cleared, unless the picker is not clearable
    const clear = () => trigger().querySelector('[aria-label="Clear current value"]');
    expect(clear()).not.toBeNull();
    await toggle('clearable');
    expect(clear()).toBeNull();
    await toggle('clearable');
    await toggle('showTime');
    expect(offered('triggerTimeFormat')).toBe(true);
    expect(trigger().querySelector('[data-date-part="time"]')?.textContent).toMatch(/^\d{2}:\d{2}$/);
    await choose('triggerTimeFormat', 'h:mm a');
    expect(trigger().querySelector('[data-date-part="time"]')?.textContent).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    await toggle('showTime');
    expect(offered('triggerTimeFormat')).toBe(false);
    expect(trigger().querySelector('[data-date-part]')).toBeNull();
    // The dropdown caption: month and year selects, and the years they offer
    const years = async () => {
      await open();
      await interact(() => fireEvent.click(calendar().getByRole('button', { name: /^Year/ })));
      const listed = (await waitFor(() => calendar().getAllByRole('option'))).map((option) => option.textContent?.trim());
      await close();
      await close();
      return [listed[0], listed.at(-1), listed.length];
    };
    await choose('captionLayout', 'dropdown');
    expect(offered('yearRange')).toBe(true);
    expect(await years()).toEqual(['2026', '1906', 121]);
    await choose('yearRange', '2020–2030');
    expect(await years()).toEqual(['2030', '2020', 11]);
    // Limits: with min or max the years are those they allow, so a range of its own is not offered
    await choose('limits', 'to today');
    expect(offered('yearRange')).toBe(false);
    expect(await years()).toEqual(['2026', '1906', 121]);
    await choose('captionLayout', 'buttons');
    // Up to today: no month after this one
    await open();
    expect(calendar().getByRole('button', { name: 'Next month' }).hasAttribute('disabled')).toBe(true);
    await close();
    // 30 days either side of today: the 16th of October to the 15th of December
    await choose('limits', '±30 days');
    await open();
    await interact(() => fireEvent.click(calendar().getByRole('button', { name: 'Previous month' })));
    expect([day(DateTime.local(2026, 10, 15)).disabled, day(DateTime.local(2026, 10, 16)).disabled]).toEqual([true, false]);
    expect(calendar().getByRole('button', { name: 'Previous month' }).hasAttribute('disabled')).toBe(true);
    await close();
    await choose('limits', 'none');
    await open();
    expect(calendar().getByRole('button', { name: 'Next month' }).hasAttribute('disabled')).toBe(false);
    await close();
    // Placement: the side and alignment reach the calendar
    const placement = async () => {
      await open();
      const content = document.body.querySelector('[data-side]');
      const placed = [content?.getAttribute('data-side'), content?.getAttribute('data-align')];
      await close();
      return placed;
    };
    expect(await placement()).toEqual(['bottom', 'center']);
    await choose('side', 'top');
    await choose('align', 'start');
    expect(offered('alignOffset')).toBe(true);
    expect(await placement()).toEqual(['top', 'start']);
    await choose('align', 'center');
    expect(offered('alignOffset')).toBe(false);
    await toggle('disabled');
    expect(trigger().getAttribute('aria-disabled')).toBe('true');
  });

  test('date picker on a phone: the compact date of a row; frame, format, icons and placement stay on desktop', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: !query.includes('min-width'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true, onchange: null }));
    const view = render(framework === 'React' ? <DatePickerOverviewDemo /> : <VueDatePickerDemo {...datePicker} />);
    await interact(() => {});
    const page = within(view.container);
    const trigger = () => view.container.querySelector<HTMLElement>('#date-picker-base')!;
    expect(trigger().closest('[data-slot="field"]')?.hasAttribute('data-row')).toBe(true);
    for (const name of ['variant', 'size', 'pill', 'block', 'triggerShowIcon', 'dropdownIconType', 'triggerDateFormat', 'side', 'sideOffset', 'align']) {
      const control = page.queryByRole('radiogroup', { name }) ?? page.queryByRole('switch', { name, exact: true }) ?? page.queryByRole('slider', { name });
      expect(!control || !!control.closest('[data-demo-desktop-only]')).toBe(true);
    }
    for (const name of ['clearable', 'showTime', 'captionLayout', 'limits', 'disabled']) {
      expect(page.queryByRole('radiogroup', { name }) ?? page.queryByRole('switch', { name, exact: true })).not.toBeNull();
    }
    // No calendar icon: the date leads the capsule
    expect(trigger().firstElementChild?.tagName.toLowerCase()).not.toBe('svg');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'showTime', exact: true })));
    await interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: 'triggerTimeFormat' })).getByRole('radio', { name: 'h:mm a', exact: true })));
    await interact(() => fireEvent.click(trigger()));
    const selected = DateTime.local().set({ day: 15 });
    const day = await waitFor(() => within(document.body).getByRole('button', { name: selected.toLocaleString(DateTime.DATE_HUGE), exact: true }));
    await interact(() => fireEvent.click(day));
    expect(trigger().querySelector('[data-date-part="date"]')?.textContent).toBe(selected.toFormat('MMM d, yyyy'));
    expect(trigger().querySelector('[data-date-part="time"]')?.textContent).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  test('date picker: desktop choices stay off the phone row and come back on desktop', async () => {
    const show = viewport();
    const view = render(framework === 'React' ? <DatePickerOverviewDemo /> : <VueDatePickerDemo {...datePicker} />);
    await interact(() => {});
    const page = within(view.container);
    const trigger = () => view.container.querySelector<HTMLElement>('#date-picker-base')!;
    const frame = () => [trigger().dataset.variant, trigger().dataset.size, trigger().firstElementChild?.tagName.toLowerCase() === 'svg'];
    await interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: 'variant' })).getByRole('radio', { name: 'soft', exact: true })));
    await interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: 'size' })).getByRole('radio', { name: 'sm', exact: true })));
    expect(frame()).toEqual(['soft', 'sm', true]);
    await show('phone');
    expect(trigger().closest('[data-slot="field"]')?.hasAttribute('data-row')).toBe(true);
    const [variant, size, icon] = frame();
    expect([variant === 'soft', size === 'sm', icon]).toEqual([false, false, false]);
    await show('desktop');
    expect(trigger().closest('[data-slot="field"]')).toBeNull();
    expect(frame()).toEqual(['soft', 'sm', true]);
  });
});
