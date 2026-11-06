import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { h, reactive } from 'vue';
import { SettingsSliderFields as ReactFields } from '../../components/docs/SettingsSliderFields';
import type { PlaybackPreferences } from '../../components/docs/settingsSliderData';
import { SettingsSliderFields as VueFields } from '../../components/docs/vue/SettingsSliderFields';
import { flushVue, mountVue } from './harness';

vi.mock('@plexui/ui/components/TextLink', async () => import('../../packages/ui/src/components/TextLink'));
vi.mock('@plexui/ui/components/Button', async () => import('../../packages/ui/src/components/Button'));
vi.mock('@plexui/ui/components/Field', async () => import('../../packages/ui/src/components/Field'));
vi.mock('@plexui/ui/components/FieldGroup', async () => import('../../packages/ui/src/components/FieldGroup'));
vi.mock('@plexui/ui/components/Slider', async () => import('../../packages/ui/src/components/Slider'));
vi.mock('@plexui/ui/components/Switch', async () => import('../../packages/ui/src/components/Switch'));
vi.mock('@plexui/ui/components/Dialog', async () => import('../../packages/ui/src/components/Dialog'));
vi.mock('@plexui/vue/components/TextLink', async () => import('../../packages/vue/src/components/TextLink'));
vi.mock('@plexui/vue/components/Button', async () => import('../../packages/vue/src/components/Button'));
vi.mock('@plexui/vue/components/Field', async () => import('../../packages/vue/src/components/Field'));
vi.mock('@plexui/vue/components/FieldGroup', async () => import('../../packages/vue/src/components/FieldGroup'));
vi.mock('@plexui/vue/components/Slider', async () => import('../../packages/vue/src/components/Slider'));
vi.mock('@plexui/vue/components/Switch', async () => import('../../packages/vue/src/components/Switch'));
vi.mock('@plexui/vue/components/Dialog', async () => import('../../packages/vue/src/components/Dialog'));

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
      const [value, onChange] = useState({ sound: true, volume: 52, normalize: false });
      return <ReactFields value={value} onChange={onChange} />;
    }
    render(<Owner />);
  } else {
    const value = reactive({ sound: true, volume: 52, normalize: false });
    mountVue(() => h('div', [h(VueFields, { value, 'onUpdate:value': (next: PlaybackPreferences) => Object.assign(value, next) })]));
    await flushVue();
  }
  return within(document.body);
}

for (const framework of ['React', 'Vue'] as const) describe(`${framework} grouped settings slider`, () => {
  test('keyboard changes the percentage; disabling sound retains it and blocks changes', async () => {
    const ui = await mount(framework);
    const slider = ui.getByRole('slider', { name: 'Volume' });
    await interact(() => { slider.focus(); fireEvent.keyDown(slider, { key: 'ArrowRight' }); });
    expect(slider.getAttribute('aria-valuenow')).toBe('53');
    expect(document.querySelector('[data-slider-setting] output')?.textContent).toBe('53%');
    await interact(() => fireEvent.click(ui.getByRole('switch', { name: 'Sound', exact: true })));
    expect(slider.hasAttribute('data-disabled') || slider.getAttribute('aria-disabled') === 'true').toBe(true);
    await interact(() => fireEvent.keyDown(slider, { key: 'ArrowRight' }));
    expect(slider.getAttribute('aria-valuenow')).toBe('53');
    await interact(() => fireEvent.click(ui.getByRole('switch', { name: 'Sound', exact: true })));
    await interact(() => fireEvent.keyDown(slider, { key: 'End' }));
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
    expect(document.querySelector('[data-slider-setting] output')?.textContent).toBe('100%');
    await interact(() => fireEvent.keyDown(slider, { key: 'Home' }));
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
  });

  test('help opens and closes without changing either preference', async () => {
    const ui = await mount(framework);
    await interact(() => fireEvent.click(ui.getByRole('switch', { name: 'Consistent volume' })));
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Learn more' })));
    const help = await ui.findByRole('dialog', { name: 'Playback volume' });
    expect(within(help).getByText(/Volume applies while sound is enabled/)).toBeTruthy();
    await interact(() => fireEvent.click(within(help).getByRole('button', { name: 'Done' })));
    await waitFor(() => expect(ui.queryByRole('dialog')).toBeNull());
    expect(ui.getByRole('switch', { name: 'Consistent volume' }).getAttribute('aria-checked')).toBe('true');
    expect(ui.getByRole('slider', { name: 'Volume' }).getAttribute('aria-valuenow')).toBe('52');
  });
});
