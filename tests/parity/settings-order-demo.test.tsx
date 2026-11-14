import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { h, reactive } from 'vue';
import * as ReactOrder from '../../components/docs/SettingsOrderFields';
import { initialLanguages, initialQuickSettings } from '../../components/docs/settingsOrderData';
import * as VueOrder from '../../components/docs/vue/SettingsOrderFields';
import { flushVue, mountVue } from './harness';

vi.mock('@plexui/ui/components/Button', async () => import('../../packages/ui/src/components/Button'));
vi.mock('@plexui/vue/components/Button', async () => import('../../packages/vue/src/components/Button'));
vi.mock('@plexui/ui/components/Dialog', async () => import('../../packages/ui/src/components/Dialog'));
vi.mock('@plexui/vue/components/Dialog', async () => import('../../packages/vue/src/components/Dialog'));
vi.mock('@plexui/ui/components/Field', async () => import('../../packages/ui/src/components/Field'));
vi.mock('@plexui/vue/components/Field', async () => import('../../packages/vue/src/components/Field'));
vi.mock('@plexui/ui/components/FieldGroup', async () => import('../../packages/ui/src/components/FieldGroup'));
vi.mock('@plexui/vue/components/FieldGroup', async () => import('../../packages/vue/src/components/FieldGroup'));
vi.mock('@plexui/ui/components/Icon', async () => import('../../packages/ui/src/components/Icon'));
vi.mock('@plexui/vue/components/Icon', async () => import('../../packages/vue/src/components/Icon'));
vi.mock('@plexui/ui/components/Select', async () => import('../../packages/ui/src/components/Select'));
vi.mock('@plexui/vue/components/Select', async () => import('../../packages/vue/src/components/Select'));
vi.mock('@plexui/ui/components/Slider', async () => import('../../packages/ui/src/components/Slider'));
vi.mock('@plexui/vue/components/Slider', async () => import('../../packages/vue/src/components/Slider'));
vi.mock('@plexui/ui/components/Checkbox', async () => import('../../packages/ui/src/components/Checkbox'));
vi.mock('@plexui/vue/components/Checkbox', async () => import('../../packages/vue/src/components/Checkbox'));
vi.mock('@plexui/ui/components/Sortable', async () => import('../../packages/ui/src/components/Sortable'));
vi.mock('@plexui/vue/components/Sortable', async () => import('../../packages/vue/src/components/Sortable'));
vi.mock('@plexui/ui/components/Stepper', async () => import('../../packages/ui/src/components/Stepper'));
vi.mock('@plexui/vue/components/Stepper', async () => import('../../packages/vue/src/components/Stepper'));

beforeEach(() => {
  document.documentElement.style.setProperty('--breakpoint-md', '768px');
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: !media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

const interact = async (action: () => void) => act(async () => { action(); await flushVue(); });
async function mount(framework: 'React' | 'Vue', kind: 'quick' | 'languages') {
  const initial = kind === 'quick' ? initialQuickSettings : initialLanguages;
  if (framework === 'React') {
    const Fields = (kind === 'quick' ? ReactOrder.QuickSettingsFields : ReactOrder.LanguagesFields) as (props: { value: unknown; onChange: (value: never) => void }) => JSX.Element;
    function Owner() {
      const [value, onChange] = useState<unknown>(initial);
      return <Fields value={value} onChange={onChange} />;
    }
    render(<Owner />);
  } else {
    const state = reactive({ value: structuredClone(initial) as unknown[] });
    const Fields = kind === 'quick' ? VueOrder.QuickSettingsFields : VueOrder.LanguagesFields;
    mountVue(() => h('div', [h(Fields as never, { value: state.value, 'onUpdate:value': (next: unknown[]) => { state.value = next; } })]));
    await flushVue();
  }
  return within(document.body);
}
const rows = () => [...document.querySelectorAll('[data-sortable] > [data-row]')].map((row) => row.textContent);

for (const framework of ['React', 'Vue'] as const) describe(`${framework} pick and order`, () => {
  test('the check leads the row and stays with it when the grip moves the row', async () => {
    const ui = await mount(framework, 'quick');
    const caption = ui.getByRole('checkbox', { name: 'Caption Panel' });
    expect(caption.getAttribute('aria-checked')).toBe('false');
    await interact(() => fireEvent.click(caption));
    expect(ui.getByRole('checkbox', { name: 'Caption Panel' }).getAttribute('aria-checked')).toBe('true');
    const grip = ui.getByRole('button', { name: 'Reorder Caption Panel' });
    await interact(() => { grip.focus(); fireEvent.keyDown(grip, { key: 'ArrowUp' }); });
    await waitFor(() => expect(rows().slice(2, 4)).toEqual(['Caption Panel', 'Braille Input']));
    expect(ui.getByRole('checkbox', { name: 'Caption Panel' }).getAttribute('aria-checked')).toBe('true');
  });

  test('languages: Add Language… adds to the end, and the first language is the app language', async () => {
    const ui = await mount(framework, 'languages');
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Add Language…' })));
    const sheet = await waitFor(() => ui.getByRole('dialog', { name: 'Add Language' }));
    await interact(() => fireEvent.click(within(sheet).getByRole('button', { name: /Deutsch/ })));
    await waitFor(() => expect(ui.queryByRole('dialog', { name: 'Add Language' })).toBeNull());
    expect(rows()).toEqual(['English (US)App Language: English', 'РусскийRussian', 'DeutschGerman']);
    const grip = ui.getByRole('button', { name: 'Reorder Deutsch' });
    await interact(() => { grip.focus(); fireEvent.keyDown(grip, { key: 'ArrowUp' }); });
    await interact(() => fireEvent.keyDown(ui.getByRole('button', { name: 'Reorder Deutsch' }), { key: 'ArrowUp' }));
    await waitFor(() => expect(rows()[0]).toBe('DeutschApp Language: German'));
  });
});

test('FieldGroup draws the row line between a sorted list and a plain row on either side of it', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync('packages/styles/src/components/FieldGroup/FieldGroup.module.css', 'utf8');
  for (const selector of ['.Body > [data-sortable] + [data-row]', '.Body > [data-row] + [data-sortable] > [data-row]:first-child']) {
    expect(css.split(selector).length - 1).toBeGreaterThanOrEqual(3);
  }
  expect(css).toContain('.Body > [data-sortable]:first-child > [data-row]:first-child > button');
  expect(css).toContain('.Body > [data-sortable]:last-child > [data-row]:last-child > button');
});
