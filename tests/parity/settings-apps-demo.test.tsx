import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { h, reactive } from 'vue';
import { readFileSync } from 'node:fs';
import { Field as ReactField } from '../../packages/ui/src/components/Field';
import { Field as VueField } from '../../packages/vue/src/components/Field';
import * as ReactApps from '../../components/docs/SettingsAppsFields';
import * as VueApps from '../../components/docs/vue/SettingsAppsFields';
import { initialAutofill } from '../../components/docs/settingsAppsData';
import { flushVue, mountVue } from './harness';

vi.mock('@plexui/ui/components/Field', async () => import('../../packages/ui/src/components/Field'));
vi.mock('@plexui/vue/components/Field', async () => import('../../packages/vue/src/components/Field'));
vi.mock('@plexui/ui/components/FieldGroup', async () => import('../../packages/ui/src/components/FieldGroup'));
vi.mock('@plexui/vue/components/FieldGroup', async () => import('../../packages/vue/src/components/FieldGroup'));
vi.mock('@plexui/ui/components/Icon', async () => import('../../packages/ui/src/components/Icon'));
vi.mock('@plexui/vue/components/Icon', async () => import('../../packages/vue/src/components/Icon'));
vi.mock('@plexui/ui/components/Switch', async () => import('../../packages/ui/src/components/Switch'));
vi.mock('@plexui/vue/components/Switch', async () => import('../../packages/vue/src/components/Switch'));
vi.mock('@plexui/ui/components/TextLink', async () => import('../../packages/ui/src/components/TextLink'));
vi.mock('@plexui/vue/components/TextLink', async () => import('../../packages/vue/src/components/TextLink'));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

const interact = async (action: () => void) => act(async () => { action(); await flushVue(); });

describe('Field icon', () => {
  test('a row puts the icon before its label, hidden from assistive technology; a field that is not a row has none', async () => {
    render(<div>
      <ReactField row label="Music" icon={<svg data-testid="react-icon" />}><input /></ReactField>
      <ReactField label="Plain" icon={<svg data-testid="react-plain" />}><input /></ReactField>
    </div>);
    mountVue(() => h('div', [
      h(VueField, { row: true, label: 'Classical' }, { icon: () => h('svg', { 'data-testid': 'vue-icon' }), default: () => h('input') }),
      h(VueField, { label: 'Plain Vue' }, { icon: () => h('svg', { 'data-testid': 'vue-plain' }), default: () => h('input') }),
      h(VueField, { row: true, label: 'Empty' }, { icon: () => null, default: () => h('input') }),
    ]));
    await flushVue();
    for (const id of ['react-icon', 'vue-icon']) {
      const column = document.querySelector(`[data-testid="${id}"]`)!.parentElement!;
      expect(column.getAttribute('aria-hidden')).toBe('true');
      expect(column.nextElementSibling?.querySelector('label')).toBeTruthy();
    }
    expect(document.querySelector('[data-testid="react-plain"]')).toBeNull();
    expect(document.querySelector('[data-testid="vue-plain"]')).toBeNull();
    const empty = [...document.querySelectorAll('[data-row]')].find((row) => row.textContent === 'Empty')!;
    expect(empty.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  test('the column moves the text and the line above the row, with tokens for a phone and a desktop', () => {
    const css = readFileSync('packages/styles/src/components/Field/Field.module.css', 'utf8');
    expect(css).toContain('.Field:where([data-row]):has(> .Icon)');
    expect(css).toContain('--field-group-separator-inset-start: calc(var(--field-row-padding-inline) + var(--field-row-icon-size) + var(--field-row-icon-gap))');
    const desktop = readFileSync('packages/styles/src/styles/variables-components.css', 'utf8');
    const phone = readFileSync('packages/styles/src/styles/touch.css', 'utf8');
    expect(desktop).toMatch(/--field-row-icon-size: 32px;[\s\S]*--field-row-icon-gap: 12px;/);
    expect(phone).toMatch(/--field-row-icon-size: 28px;\s*--field-row-icon-gap: 8px;/);
  });
});

test('a full row takes the pointer on every width and fills on hover; a row action does not shrink when pressed', () => {
  const field = readFileSync('packages/styles/src/components/Field/Field.module.css', 'utf8');
  const pointer = field.indexOf('cursor: pointer;');
  expect(pointer).toBeGreaterThan(0);
  expect(field.lastIndexOf('@media (max-width: 767px)', pointer)).toBeLessThan(field.lastIndexOf('}\n\n', pointer));
  expect(field).toContain('background: var(--field-row-hover-background);');
  const group = readFileSync('packages/styles/src/components/FieldGroup/FieldGroup.module.css', 'utf8');
  const desktop = group.slice(0, group.indexOf('@media'));
  expect(desktop).toContain('--button-mobile-material-scale: 1;');
  expect(desktop).toContain('.Body > [data-row]:first-child > button[data-block][data-variant="ghost"]::before');
});

for (const framework of ['React', 'Vue'] as const) describe(`${framework} apps in rows`, () => {
  async function mount() {
    if (framework === 'React') {
      function Owner() {
        const [value, onChange] = useState(initialAutofill);
        return <ReactApps.AutofillFields value={value} onChange={onChange} />;
      }
      render(<Owner />);
    } else {
      const state = reactive({ value: structuredClone(initialAutofill) });
      mountVue(() => h('div', [h(VueApps.AutofillFields as never, { value: state.value, 'onUpdate:value': (next: typeof initialAutofill) => { state.value = next; } })]));
      await flushVue();
    }
    return within(document.body);
  }

  test('each app has its picture, its name and a switch; an app turned off reads quieter; the feature switch hides the apps', async () => {
    const ui = await mount();
    const vault = ui.getByRole('switch', { name: 'Vault' });
    expect(vault.getAttribute('aria-checked')).toBe('false');
    expect(vault.closest('[data-row]')!.className).toMatch(/Off/);
    expect(vault.closest('[data-row]')!.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
    await interact(() => fireEvent.click(vault));
    await waitFor(() => expect(ui.getByRole('switch', { name: 'Vault' }).getAttribute('aria-checked')).toBe('true'));
    expect(ui.getByRole('switch', { name: 'Vault' }).closest('[data-row]')!.className).not.toMatch(/Off/);
    await interact(() => fireEvent.click(ui.getByRole('switch', { name: 'AutoFill Passwords and Passkeys' })));
    await waitFor(() => expect(ui.queryByRole('switch', { name: 'Vault' })).toBeNull());
  });
});

test('Sortable handlePlacement marks the list in React and Vue, and the styles place the grip at either end', async () => {
  const { Sortable: ReactSortable } = await import('../../packages/ui/src/components/Sortable');
  const { Sortable: VueSortable } = await import('../../packages/vue/src/components/Sortable');
  render(<ReactSortable value={['a']} onChange={() => {}} handles handlePlacement="end" data-testid="react-list"><div key="a">a</div></ReactSortable>);
  mountVue(() => h(VueSortable, { value: ['a'], handles: true, handlePlacement: 'end', 'data-testid': 'vue-list' }, () => [h('div', { key: 'a' }, 'a')]));
  await flushVue();
  for (const id of ['react-list', 'vue-list']) expect(document.querySelector(`[data-testid="${id}"]`)!.getAttribute('data-handle-placement')).toBe('end');
  const css = readFileSync('packages/styles/src/components/Sortable/Sortable.module.css', 'utf8');
  expect(css).toContain('.Sortable[data-handle-placement="end"] > :has(> .Handle) > .Handle');
  expect(css).toContain('.Sortable[data-handle-placement="start"] > :has(> .Handle) > .Handle');
});

for (const framework of ['React', 'Vue'] as const) test(`${framework}: the picture takes the style it is given`, async () => {
  if (framework === 'React') render(<ReactApps.HapticsFields value={false} onChange={() => {}} iconStyle="plain" />);
  else { mountVue(() => h(VueApps.HapticsFields as never, { value: false, iconStyle: 'plain' })); await flushVue(); }
  const pictures = [...document.querySelectorAll('[data-style]')];
  expect(pictures.length).toBe(2);
  expect(pictures.every((picture) => picture.getAttribute('data-style') === 'plain')).toBe(true);
});

test('every app has a tile color, so a tile style never draws a white symbol on nothing', async () => {
  const { autofillApps, hapticApps } = await import('../../components/docs/settingsAppsData');
  for (const app of [...autofillApps, ...hapticApps]) expect(app.tile).toMatch(/^#[0-9a-f]{6}$/);
});
