import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { h, reactive } from 'vue';
import { SettingsRegionFields as ReactRegion } from '../../components/docs/SettingsRegionFields';
import { filterRegions, initialRegion } from '../../components/docs/settingsRegionData';
import { SettingsRegionFields as VueRegion } from '../../components/docs/vue/SettingsRegionFields';
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
vi.mock('@plexui/ui/components/IndexBar', async () => import('../../packages/ui/src/components/IndexBar'));
vi.mock('@plexui/vue/components/IndexBar', async () => import('../../packages/vue/src/components/IndexBar'));
vi.mock('@plexui/ui/components/Input', async () => import('../../packages/ui/src/components/Input'));
vi.mock('@plexui/vue/components/Input', async () => import('../../packages/vue/src/components/Input'));
vi.mock('@plexui/ui/components/RadioGroup', async () => import('../../packages/ui/src/components/RadioGroup'));
vi.mock('@plexui/vue/components/RadioGroup', async () => import('../../packages/vue/src/components/RadioGroup'));
vi.mock('@plexui/ui/components/Toolbar', async () => import('../../packages/ui/src/components/Toolbar'));
vi.mock('@plexui/vue/components/Toolbar', async () => import('../../packages/vue/src/components/Toolbar'));

beforeEach(() => {
  document.documentElement.style.setProperty('--breakpoint-md', '768px');
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: !media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

const interact = async (action: () => void) => act(async () => { action(); await flushVue(); });
async function mount(framework: 'React' | 'Vue') {
  if (framework === 'React') {
    function Owner() {
      const [value, onChange] = useState(initialRegion);
      return <ReactRegion value={value} onChange={onChange} />;
    }
    render(<Owner />);
  } else {
    const state = reactive({ value: initialRegion });
    mountVue(() => h('div', [h(VueRegion as never, { value: state.value, 'onUpdate:value': (next: string) => { state.value = next; } })]));
    await flushVue();
  }
  return within(document.body);
}

test('the search narrows the countries to the names that hold it, sections without a match drop out', () => {
  expect(filterRegions('ger')).toEqual([{ letter: 'G', names: ['Germany'] }]);
  expect(filterRegions('  ').length).toBeGreaterThan(10);
  expect(filterRegions('zzz')).toEqual([]);
});

for (const framework of ['React', 'Vue'] as const) describe(`${framework} long choice in a sheet`, () => {
  test('the row opens the sheet with the chosen country checked; a tap chooses, closes and the row shows it', async () => {
    const ui = await mount(framework);
    const trigger = ui.getByRole('button', { name: 'Region: Spain' });
    await interact(() => fireEvent.click(trigger));
    const sheet = await waitFor(() => ui.getByRole('dialog', { name: 'Select Region' }));
    expect(within(sheet).getByRole('radio', { name: 'Spain' }).getAttribute('aria-checked')).toBe('true');
    expect(within(sheet).getByRole('textbox', { name: 'Search regions' })).toBeTruthy();
    await interact(() => fireEvent.change(within(sheet).getByRole('textbox', { name: 'Search regions' }), { target: { value: 'ger' } }));
    if (framework === 'Vue') await interact(() => fireEvent.input(within(sheet).getByRole('textbox', { name: 'Search regions' }), { target: { value: 'ger' } }));
    await waitFor(() => expect(within(sheet).getAllByRole('radio').map((radio) => radio.getAttribute('aria-label') ?? radio.closest('[data-row]')?.textContent)).toEqual(['Germany']));
    await interact(() => fireEvent.click(within(sheet).getByRole('radio', { name: 'Germany' })));
    await waitFor(() => expect(ui.queryByRole('dialog', { name: 'Select Region' })).toBeNull());
    expect(ui.getByRole('button', { name: 'Region: Germany' })).toBeTruthy();
  });

  test('a tap on the chosen country closes too, and the sheet opens again with the search cleared', async () => {
    const ui = await mount(framework);
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Region: Spain' })));
    let sheet = await waitFor(() => ui.getByRole('dialog', { name: 'Select Region' }));
    await interact(() => fireEvent.click(within(sheet).getByRole('radio', { name: 'Spain' })));
    await waitFor(() => expect(ui.queryByRole('dialog', { name: 'Select Region' })).toBeNull());
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Region: Spain' })));
    sheet = await waitFor(() => ui.getByRole('dialog', { name: 'Select Region' }));
    const search = within(sheet).getByRole('textbox', { name: 'Search regions' });
    await interact(() => { fireEvent.change(search, { target: { value: 'fra' } }); fireEvent.input(search, { target: { value: 'fra' } }); });
    await interact(() => fireEvent.click(within(sheet).getByRole('radio', { name: 'France' })));
    await waitFor(() => expect(ui.queryByRole('dialog', { name: 'Select Region' })).toBeNull());
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Region: France' })));
    sheet = await waitFor(() => ui.getByRole('dialog', { name: 'Select Region' }));
    expect((within(sheet).getByRole('textbox', { name: 'Search regions' }) as HTMLInputElement).value).toBe('');
    expect(within(sheet).getAllByRole('radio').length).toBeGreaterThan(30);
  });

  test('on a desktop the search stands over the list, one search only', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const ui = await mount(framework);
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Region: Spain' })));
    const sheet = await waitFor(() => ui.getByRole('dialog', { name: 'Select Region' }));
    expect(within(sheet).getAllByRole('textbox', { name: 'Search regions' })).toHaveLength(1);
    expect(sheet.querySelector('[data-placement="bottom"]')).toBeNull();
  });
});
