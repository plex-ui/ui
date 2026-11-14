import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { h, reactive } from 'vue';
import { SettingsVoiceFields as ReactFields } from '../../components/docs/SettingsVoiceFields';
import { defaultVoicePreferences, type VoicePreferences } from '../../components/docs/settingsVoiceData';
import { SettingsVoiceFields as VueFields } from '../../components/docs/vue/SettingsVoiceFields';
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
vi.mock('@plexui/ui/components/Stepper', async () => import('../../packages/ui/src/components/Stepper'));
vi.mock('@plexui/vue/components/Stepper', async () => import('../../packages/vue/src/components/Stepper'));

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
      const [value, onChange] = useState(defaultVoicePreferences);
      return <ReactFields value={value} onChange={onChange} />;
    }
    render(<Owner />);
  } else {
    const value = reactive({ ...defaultVoicePreferences });
    mountVue(() => h('div', [h(VueFields, { value, 'onUpdate:value': (next: VoicePreferences) => Object.assign(value, next) })]));
    await flushVue();
  }
  return within(document.body);
}

for (const framework of ['React', 'Vue'] as const) describe(`${framework} voice settings`, () => {
  test('each slider sits between its symbols, and its accent row brings back the default', async () => {
    const ui = await mount(framework);
    const rate = ui.getByRole('slider', { name: 'Rate' });
    expect(rate.closest('[class*="SliderAdorned"]')?.textContent).toBe('SlowFast');
    expect(ui.getByRole('slider', { name: 'Speech Volume' }).closest('[class*="SliderAdorned"]')?.querySelectorAll('svg')).toHaveLength(2);
    await interact(() => { rate.focus(); fireEvent.keyDown(rate, { key: 'End' }); });
    expect(rate.getAttribute('aria-valuenow')).toBe('100');
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Use Default Rate' })));
    expect(ui.getByRole('slider', { name: 'Rate' }).getAttribute('aria-valuenow')).toBe('50');
  });

  test('a stepper changes the number under its label; Reset asks first, then restores every default', async () => {
    const ui = await mount(framework);
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Raise timbre' })));
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Longer pause' })));
    expect(document.body.textContent).toContain('110');
    expect(document.body.textContent).toContain('2 seconds');
    await interact(() => fireEvent.click(ui.getByRole('button', { name: /Reset Voice Settings/ })));
    const alert = await waitFor(() => ui.getByRole('dialog', { name: 'Reset voice settings?' }));
    expect(alert.textContent).toContain('Reset voice settings?');
    await interact(() => fireEvent.click(within(alert).getByRole('button', { name: 'Reset' })));
    await waitFor(() => expect(ui.queryByRole('dialog', { name: 'Reset voice settings?' })).toBeNull());
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Reset Voice Settings'));
    expect(document.body.textContent).toContain('1 second');
    expect(document.body.textContent).not.toContain('110');
  });
});
