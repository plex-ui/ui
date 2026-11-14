import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useState, type ComponentType } from 'react';
import { h, reactive, type Component } from 'vue';
import { readFileSync } from 'node:fs';
import { Field as ReactField } from '../../packages/ui/src/components/Field';
import { Field as VueField } from '../../packages/vue/src/components/Field';
import * as ReactCombos from '../../components/docs/SettingsCombos';
import * as VueCombos from '../../components/docs/vue/SettingsCombos';
import {
  defaultSliders, describedPictures, initialChoice, initialOrder, initialPictures, initialRows, orderedPool, plainPictures, switchPictures,
} from '../../components/docs/settingsCombosData';
import { flushVue, mountVue } from './harness';

vi.mock('@plexui/ui/components/Button', async () => import('../../packages/ui/src/components/Button'));
vi.mock('@plexui/vue/components/Button', async () => import('../../packages/vue/src/components/Button'));
vi.mock('@plexui/ui/components/Checkbox', async () => import('../../packages/ui/src/components/Checkbox'));
vi.mock('@plexui/vue/components/Checkbox', async () => import('../../packages/vue/src/components/Checkbox'));
vi.mock('@plexui/ui/components/ColorPicker', async () => import('../../packages/ui/src/components/ColorPicker'));
vi.mock('@plexui/vue/components/ColorPicker', async () => import('../../packages/vue/src/components/ColorPicker'));
vi.mock('@plexui/ui/components/Dialog', async () => import('../../packages/ui/src/components/Dialog'));
vi.mock('@plexui/vue/components/Dialog', async () => import('../../packages/vue/src/components/Dialog'));
vi.mock('@plexui/ui/components/Field', async () => import('../../packages/ui/src/components/Field'));
vi.mock('@plexui/vue/components/Field', async () => import('../../packages/vue/src/components/Field'));
vi.mock('@plexui/ui/components/FieldGroup', async () => import('../../packages/ui/src/components/FieldGroup'));
vi.mock('@plexui/vue/components/FieldGroup', async () => import('../../packages/vue/src/components/FieldGroup'));
vi.mock('@plexui/ui/components/Icon', async () => import('../../packages/ui/src/components/Icon'));
vi.mock('@plexui/vue/components/Icon', async () => import('../../packages/vue/src/components/Icon'));
vi.mock('@plexui/ui/components/Input', async () => import('../../packages/ui/src/components/Input'));
vi.mock('@plexui/vue/components/Input', async () => import('../../packages/vue/src/components/Input'));
vi.mock('@plexui/ui/components/RadioGroup', async () => import('../../packages/ui/src/components/RadioGroup'));
vi.mock('@plexui/vue/components/RadioGroup', async () => import('../../packages/vue/src/components/RadioGroup'));
vi.mock('@plexui/ui/components/Select', async () => import('../../packages/ui/src/components/Select'));
vi.mock('@plexui/vue/components/Select', async () => import('../../packages/vue/src/components/Select'));
vi.mock('@plexui/ui/components/Slider', async () => import('../../packages/ui/src/components/Slider'));
vi.mock('@plexui/vue/components/Slider', async () => import('../../packages/vue/src/components/Slider'));
vi.mock('@plexui/ui/components/Sortable', async () => import('../../packages/ui/src/components/Sortable'));
vi.mock('@plexui/vue/components/Sortable', async () => import('../../packages/vue/src/components/Sortable'));
vi.mock('@plexui/ui/components/Stepper', async () => import('../../packages/ui/src/components/Stepper'));
vi.mock('@plexui/vue/components/Stepper', async () => import('../../packages/vue/src/components/Stepper'));
vi.mock('@plexui/ui/components/Switch', async () => import('../../packages/ui/src/components/Switch'));
vi.mock('@plexui/vue/components/Switch', async () => import('../../packages/vue/src/components/Switch'));
vi.mock('@plexui/ui/components/TextLink', async () => import('../../packages/ui/src/components/TextLink'));
vi.mock('@plexui/vue/components/TextLink', async () => import('../../packages/vue/src/components/TextLink'));

beforeEach(() => {
  document.documentElement.style.setProperty('--breakpoint-md', '768px');
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: !media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

const interact = async (action: () => void) => act(async () => { action(); await flushVue(); });

type Screen = 'RowsCombos' | 'SliderCombos' | 'ChoiceCombos' | 'OrderCombos' | 'PictureCombos';
const initial: Record<Screen, unknown> = {
  RowsCombos: initialRows, SliderCombos: defaultSliders, ChoiceCombos: initialChoice, OrderCombos: initialOrder, PictureCombos: initialPictures,
};
async function mount(framework: 'React' | 'Vue', screen: Screen, props: Record<string, unknown> = {}) {
  if (framework === 'React') {
    const Fields = ReactCombos[screen] as unknown as ComponentType<Record<string, unknown>>;
    function Owner() {
      const [value, onChange] = useState<unknown>(structuredClone(initial[screen]));
      return <Fields value={value} onChange={onChange} {...props} />;
    }
    render(<Owner />);
  } else {
    const state = reactive({ value: structuredClone(initial[screen]) });
    mountVue(() => h('div', [h(VueCombos[screen] as Component, { ...props, 'value': state.value, 'onUpdate:value': (next: unknown) => { state.value = next; } })]));
    await flushVue();
  }
  return within(document.body);
}
const sortedRows = (index: number) => [...document.querySelectorAll('[data-sortable]')][index]!.querySelectorAll(':scope > [data-row]');
const texts = (index: number) => [...sortedRows(index)].map((row) => row.textContent);

for (const framework of ['React', 'Vue'] as const) describe(`${framework} combination screens`, () => {
  test('rows: the state in words before its switch; the destructive row asks first, then resets every row', async () => {
    const ui = await mount(framework, 'RowsCombos');
    const status = ui.getByRole('switch', { name: 'Status' });
    expect(status.closest('[data-row]')!.textContent).toContain('Off');
    await interact(() => fireEvent.click(status));
    await waitFor(() => expect(ui.getByRole('switch', { name: 'Status' }).closest('[data-row]')!.textContent).toContain('On'));
    await interact(() => fireEvent.click(ui.getByRole('switch', { name: 'Switch' })));
    expect(ui.getByRole('switch', { name: 'Switch' }).getAttribute('aria-checked')).toBe('false');
    await interact(() => fireEvent.click(ui.getByRole('button', { name: /Destructive action/ })));
    const alert = await waitFor(() => ui.getByRole('dialog', { name: 'Reset every row?' }));
    await interact(() => fireEvent.click(within(alert).getByRole('button', { name: 'Reset' })));
    await waitFor(() => expect(ui.queryByRole('dialog', { name: 'Reset every row?' })).toBeNull());
    expect(ui.getByRole('switch', { name: 'Switch' }).getAttribute('aria-checked')).toBe('true');
    expect(ui.getByRole('switch', { name: 'Status' }).getAttribute('aria-checked')).toBe('false');
    expect(document.querySelector('[data-align="center"]')?.textContent).toBe('Centred action');
  });

  test('sliders: the switch turns the slider off and keeps it; symbols at the ends with Use Default; the balance', async () => {
    const ui = await mount(framework, 'SliderCombos');
    const slider = ui.getByRole('slider', { name: 'Slider' });
    await interact(() => { slider.focus(); fireEvent.keyDown(slider, { key: 'ArrowRight' }); });
    expect(document.querySelector('[data-slider-setting] output')?.textContent).toBe('51%');
    await interact(() => fireEvent.click(ui.getByRole('switch', { name: 'Switch' })));
    await interact(() => fireEvent.keyDown(ui.getByRole('slider', { name: 'Slider' }), { key: 'End' }));
    expect(ui.getByRole('slider', { name: 'Slider' }).getAttribute('aria-valuenow')).toBe('51');
    const ends = ui.getByRole('slider', { name: 'Symbols at the ends' });
    expect(ends.closest('[class*="SliderAdorned"]')?.querySelectorAll('svg')).toHaveLength(2);
    await interact(() => { ends.focus(); fireEvent.keyDown(ends, { key: 'End' }); });
    expect(ui.getByRole('slider', { name: 'Symbols at the ends' }).getAttribute('aria-valuenow')).toBe('100');
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Use Default' })));
    expect(ui.getByRole('slider', { name: 'Symbols at the ends' }).getAttribute('aria-valuenow')).toBe('50');
    expect(document.querySelector('[class*="BalanceLabels"]')?.textContent).toBe('L0.00R');
  });

  test('steppers: the number under the label; a number typed applies on Return, a step goes on from it, kept in 0–100', async () => {
    const ui = await mount(framework, 'SliderCombos');
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Increase' })));
    expect(ui.getByRole('group', { name: 'Steppers' }).textContent).toContain('4');
    const field = ui.getByRole('textbox', { name: 'Number' }) as HTMLInputElement;
    await interact(() => fireEvent.input(field, { target: { value: '95' } }));
    await interact(() => fireEvent.click(ui.getByRole('button', { name: 'More' })));
    await waitFor(() => expect((ui.getByRole('textbox', { name: 'Number' }) as HTMLInputElement).value).toBe('100'));
    await interact(() => fireEvent.input(ui.getByRole('textbox', { name: 'Number' }), { target: { value: '' } }));
    await interact(() => fireEvent.keyDown(ui.getByRole('textbox', { name: 'Number' }), { key: 'Enter' }));
    await waitFor(() => expect((ui.getByRole('textbox', { name: 'Number' }) as HTMLInputElement).value).toBe('100'));
  });

  test('choice: one row chosen in each group; a choice with an action leads with its mark and keeps the action at its end', async () => {
    const ui = await mount(framework, 'ChoiceCombos');
    const plain = within(ui.getByRole('radiogroup', { name: 'Choice' }));
    await interact(() => fireEvent.click(plain.getByRole('radio', { name: 'Option 3' })));
    await waitFor(() => expect(plain.getByRole('radio', { name: 'Option 3' }).getAttribute('aria-checked')).toBe('true'));
    const detailed = within(ui.getByRole('radiogroup', { name: 'Choice with details' }));
    expect(detailed.getByRole('radio', { name: 'Option 2' }).getAttribute('aria-checked')).toBe('true');
    expect(plain.getByRole('radio', { name: 'Option 2' }).getAttribute('aria-checked')).toBe('false');
    expect(detailed.getByRole('button', { name: 'Option 1 details' })).toBeTruthy();
  });

  test('order: the check stays with its row when the grip moves it; Add Row… adds the next row until there is none', async () => {
    const ui = await mount(framework, 'OrderCombos', { handlePlacement: 'end' });
    await interact(() => fireEvent.click(ui.getByRole('checkbox', { name: 'Row 3' })));
    const grip = ui.getByRole('button', { name: 'Reorder Row 3' });
    await interact(() => { grip.focus(); fireEvent.keyDown(grip, { key: 'ArrowUp' }); });
    await waitFor(() => expect(texts(0)).toEqual(['Row 1', 'Row 3', 'Row 2', 'Row 4']));
    expect(ui.getByRole('checkbox', { name: 'Row 3' }).getAttribute('aria-checked')).toBe('true');
    expect(texts(1)).toEqual(['Row AFirst', 'Row BDescription']);
    for (let i = 2; i < orderedPool.length; i += 1) await interact(() => fireEvent.click(ui.getByRole('button', { name: 'Add Row…' })));
    await waitFor(() => expect(sortedRows(1)).toHaveLength(orderedPool.length));
    expect(ui.getByRole('button', { name: 'Add Row…' }).hasAttribute('disabled')).toBe(true);
  });

  test('pictures: each row has its picture in the style given; a row turned off reads quieter; a row with nothing to set has no control', async () => {
    const ui = await mount(framework, 'PictureCombos', { iconStyle: 'outline' });
    const two = ui.getByRole('switch', { name: 'Row 2' });
    expect(two.closest('[data-row]')!.className).toMatch(/Off/);
    await interact(() => fireEvent.click(two));
    await waitFor(() => expect(ui.getByRole('switch', { name: 'Row 2' }).closest('[data-row]')!.className).not.toMatch(/Off/));
    const pictures = [...document.querySelectorAll('[data-style]')];
    expect(pictures).toHaveLength(6);
    expect(pictures.every((picture) => picture.getAttribute('data-style') === 'outline')).toBe(true);
    expect(ui.queryByRole('switch', { name: 'Row 5' })).toBeNull();
  });
});

test('every picture row has a tile color, so a tile style never draws a white symbol on nothing', () => {
  for (const row of [...switchPictures, ...describedPictures, ...plainPictures]) expect(row.tile).toMatch(/^#[0-9a-f]{6}$/);
});

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
    expect(css).toContain('--field-group-separator-inset-start: calc(var(--field-row-padding-inline) + var(--field-row-icon-offset) + var(--field-row-icon-size) + var(--field-row-icon-gap))');
    const desktop = readFileSync('packages/styles/src/styles/variables-components.css', 'utf8');
    const phone = readFileSync('packages/styles/src/styles/touch.css', 'utf8');
    expect(desktop).toMatch(/--field-row-icon-size: 32px;[\s\S]*--field-row-icon-gap: 12px;/);
    expect(phone).toMatch(/--field-row-icon-size: 28px;\s*--field-row-icon-gap: 14px;\s*--field-row-icon-offset: -2px;\s*--field-row-picture-offset: 0px;\s*--field-row-picture-gap: 8px;/);
    // An app's picture keeps a cell's own image place (AutoFill, IMG_5952); a symbol's tile stands as Settings' (IMG_6016)
    expect(css).toMatch(/\.Field:where\(\[data-row\]\):has\(> \.Icon > img\),[\s\S]*?--field-row-icon-offset: var\(--field-row-picture-offset\);\s*--field-row-icon-gap: var\(--field-row-picture-gap\);/);
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
  expect(desktop).toContain('.Body > [data-row]:first-child > :is(button, a)[data-block][data-variant="ghost"]::before');
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

test('FieldGroup draws the row line between a sorted list and a plain row on either side of it', () => {
  const css = readFileSync('packages/styles/src/components/FieldGroup/FieldGroup.module.css', 'utf8');
  for (const selector of ['.Body > [data-sortable] + [data-row]', '.Body > [data-row] + [data-sortable] > [data-row]:first-child']) {
    expect(css.split(selector).length - 1).toBeGreaterThanOrEqual(3);
  }
  expect(css).toContain('.Body > [data-sortable]:first-child > [data-row]:first-child > :is(button, a)');
  expect(css).toContain('.Body > [data-sortable]:last-child > [data-row]:last-child > :is(button, a)');
});

test('a ghost ButtonLink with block in a row is an action row too, and stays a link', async () => {
  const { ButtonLink: ReactLink } = await import('../../packages/ui/src/components/Button');
  const { ButtonLink: VueLink } = await import('../../packages/vue/src/components/Button');
  render(<div data-row><ReactLink href="mailto:help@example.com" block color="primary" variant="ghost">React mail</ReactLink></div>);
  mountVue(() => h('div', { 'data-row': '' }, [h(VueLink, { href: 'mailto:help@example.com', block: true, color: 'primary', variant: 'ghost' }, () => 'Vue mail')]));
  await flushVue();
  for (const name of ['React mail', 'Vue mail']) {
    const link = within(document.body).getByRole('link', { name });
    expect(link.tagName).toBe('A');
    expect(link.matches('[data-row] > :is(button, a)[data-block][data-variant="ghost"]')).toBe(true);
  }
  const css = readFileSync('packages/styles/src/components/FieldGroup/FieldGroup.module.css', 'utf8');
  expect(css).not.toMatch(/> button\[data-block\]/);
  expect(css).toContain('.Body > [data-row] > :is(button, a)[data-block][data-variant="ghost"]');
});
