import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AccordionOverviewDemo } from '../../components/docs/AccordionDemos';
import { CheckboxVariantsDemo } from '../../components/docs/CheckboxDemos';
import { TabsOverviewDemo } from '../../components/docs/TabsDemos';
import { TableVariantDemo } from '../../components/docs/TableDemos';
import { VueDemo, type VueDemoControl } from '../../components/docs/vue/VueDemo';
import { VueDataTableDemo } from '../../components/docs/vue/VueDataTableDemos';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));
vi.mock('@plexui/ui/components/Accordion', async () => import('../../packages/ui/src/components/Accordion'));
vi.mock('@plexui/vue/components/Accordion', async () => import('../../packages/vue/src/components/Accordion'));
vi.mock('@plexui/ui/components/Checkbox', async () => import('../../packages/ui/src/components/Checkbox'));
vi.mock('@plexui/vue/components/Checkbox', async () => import('../../packages/vue/src/components/Checkbox'));
vi.mock('@plexui/ui/components/Tabs', async () => import('../../packages/ui/src/components/Tabs'));
vi.mock('@plexui/vue/components/Tabs', async () => import('../../packages/vue/src/components/Tabs'));
vi.mock('@plexui/ui/components/DataTable', async () => import('../../packages/ui/src/components/DataTable'));
vi.mock('@plexui/vue/components/DataTable', async () => import('../../packages/vue/src/components/DataTable'));

function example(page: string, name: string, references: string[] = []) {
  const mdx = readFileSync(`content/vue/components/${page}.mdx`, 'utf8');
  const read = (key: string, bindings: Record<string, unknown> = {}): unknown => {
    const marker = `export const ${key} = `;
    const start = mdx.indexOf(marker);
    if (start < 0) throw new Error(`Missing ${key}`);
    const rest = mdx.slice(start + marker.length);
    const boundary = rest.search(/\nexport const |\n<UsageBlock>/);
    return new Function(...Object.keys(bindings), `return ${(boundary < 0 ? rest : rest.slice(0, boundary)).trim()}`)(...Object.values(bindings));
  };
  const template = read(name);
  const rawControls = read(`${name}Controls`, Object.fromEntries(references.map((key) => [key, read(key)])));
  if (typeof template !== 'string' || !Array.isArray(rawControls)) throw new Error('Invalid demo');
  const controls: VueDemoControl[] = rawControls.map((control: unknown) => {
    if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('type' in control) || !('default' in control)) throw new Error('Invalid control');
    if (control.type === 'boolean' && typeof control.default === 'boolean') return { name: control.name, type: 'boolean', default: control.default };
    if (control.type !== 'select' || typeof control.default !== 'string' || !('options' in control) || !Array.isArray(control.options) || !control.options.every((option: unknown) => typeof option === 'string')) throw new Error('Invalid select control');
    return { name: control.name, type: 'select', default: control.default, options: control.options };
  });
  return { template, controls };
}
const checkbox = example('checkbox', 'variants');
const accordion = example('accordion', 'overview');
const tabs = example('segmented-control', 'overview', ['SIZES', 'VARIANTS', 'ORIENTATIONS']);
const table = example('table', 'variant');
const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // A desktop page: demos with desktop-only controls (Tabs size and pill) ask for the viewport
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(['React', 'Vue'])('%s consolidated catalogue states', (framework) => {
  test('checkbox variants retain user changes and indeterminate values while disabled', async () => {
    const view = render(framework === 'React' ? <CheckboxVariantsDemo /> : <VueDemo {...checkbox} />);
    await interact(() => {});
    const page = within(view.container);
    const unchecked = page.getAllByRole<HTMLButtonElement>('checkbox', { name: 'Unchecked', exact: true });
    const indeterminate = page.getAllByRole('checkbox', { name: 'Indeterminate', exact: true });
    for (const item of unchecked) await interact(() => fireEvent.click(item));
    const toggle = page.getByRole('switch', { name: 'disabled', exact: true });
    await interact(() => fireEvent.click(toggle));
    for (const item of unchecked) {
      expect(item.disabled).toBe(true);
      await interact(() => fireEvent.click(item));
      expect(item.getAttribute('aria-checked')).toBe('true');
    }
    for (const item of indeterminate) expect(item.getAttribute('aria-checked')).toBe('mixed');
    await interact(() => fireEvent.click(toggle));
    expect(page.getAllByRole('checkbox', { name: 'Unchecked', exact: true })).toEqual(unchecked);
    for (const item of unchecked) {
      expect(item.disabled).toBe(false);
      await interact(() => fireEvent.click(item));
      expect(item.getAttribute('aria-checked')).toBe('false');
    }
  });

  test('accordion disables only the middle trigger, preserves its open state and skips it by keyboard', async () => {
    const view = render(framework === 'React' ? <AccordionOverviewDemo /> : <VueDemo {...accordion} state={{ value: 'shipping' }} />);
    await interact(() => {});
    const page = within(view.container);
    const shipping = page.getByRole<HTMLButtonElement>('button', { name: 'What are your shipping options?' });
    const returns = page.getByRole<HTMLButtonElement>('button', { name: 'What is your return policy?' });
    const support = page.getByRole<HTMLButtonElement>('button', { name: 'How can I contact customer support?' });
    await interact(() => fireEvent.click(returns));
    const toggle = page.getByRole('switch', { name: 'returnsDisabled' });
    await interact(() => fireEvent.click(toggle));
    expect(returns.disabled).toBe(true);
    expect(returns.getAttribute('aria-expanded')).toBe('true');
    expect(shipping.disabled).toBe(false);
    expect(support.disabled).toBe(false);
    await interact(() => fireEvent.click(returns));
    expect(returns.getAttribute('aria-expanded')).toBe('true');
    await interact(() => { shipping.focus(); fireEvent.keyDown(shipping, { key: 'ArrowDown' }); });
    await waitFor(() => expect(document.activeElement).toBe(support));
    await interact(() => fireEvent.click(toggle));
    expect(page.getByRole('button', { name: 'What is your return policy?' })).toBe(returns);
    expect(returns.getAttribute('aria-expanded')).toBe('true');
    await interact(() => { shipping.focus(); fireEvent.keyDown(shipping, { key: 'ArrowDown' }); });
    await waitFor(() => expect(document.activeElement).toBe(returns));
    await interact(() => fireEvent.click(returns));
    expect(returns.getAttribute('aria-expanded')).toBe('false');
  });

  test('tabs keep selected Month while disabling it, separate group disablement and skip it in both orientations', async () => {
    const view = render(framework === 'React' ? <TabsOverviewDemo /> : <VueDemo {...tabs} state={{ tab: 'day' }} />);
    await interact(() => {});
    const page = within(view.container);
    const month = page.getByRole<HTMLButtonElement>('radio', { name: 'Month', exact: true });
    const week = page.getByRole<HTMLButtonElement>('radio', { name: 'Week', exact: true });
    const year = page.getByRole<HTMLButtonElement>('radio', { name: 'Year', exact: true });
    await interact(() => fireEvent.click(month));
    const itemToggle = page.getByRole('switch', { name: 'monthDisabled' });
    await interact(() => fireEvent.click(itemToggle));
    expect(month.disabled).toBe(true);
    expect(month.getAttribute('aria-checked')).toBe('true');
    expect(week.disabled).toBe(false);
    for (const [orientation, key] of [['horizontal', 'ArrowRight'], ['vertical', 'ArrowDown']]) {
      await interact(() => fireEvent.click(page.getByRole('radio', { name: orientation, exact: true })));
      await interact(() => { week.focus(); fireEvent.keyDown(week, { key }); });
      await waitFor(() => expect(document.activeElement).toBe(year));
      expect(month.getAttribute('aria-checked')).toBe('true');
    }
    const groupToggle = page.getByRole('switch', { name: 'disabled', exact: true });
    await interact(() => fireEvent.click(groupToggle));
    expect(week.disabled).toBe(true);
    await interact(() => fireEvent.click(groupToggle));
    expect(week.disabled).toBe(false);
    expect(month.disabled).toBe(true);
    await interact(() => fireEvent.click(itemToggle));
    expect(page.getByRole('radio', { name: 'Month', exact: true })).toBe(month);
    expect(month.disabled).toBe(false);
    expect(month.getAttribute('aria-checked')).toBe('true');
    await interact(() => fireEvent.click(week));
    expect(week.getAttribute('aria-checked')).toBe('true');
  });

  test('DataTable restores the sorted rows after empty, with default, text and rich message modes', async () => {
    const view = render(framework === 'React' ? <TableVariantDemo /> : <VueDataTableDemo example="variant" code={table.template} controls={table.controls} />);
    await interact(() => {});
    const page = within(view.container);
    const tableNode = page.getByRole('table');
    const name = page.getByRole('button', { name: 'Name', exact: true });
    const rowText = () => within(tableNode).getAllByRole('row').slice(1).map((row) => row.textContent);
    await interact(() => fireEvent.click(name));
    const sortedRows = rowText();
    expect(sortedRows.length).toBe(6);
    expect(name.getAttribute('data-sorted')).toBe('asc');
    const toggle = page.getByRole('switch', { name: 'empty', exact: true });
    await interact(() => fireEvent.click(toggle));
    expect(page.getByRole('table')).toBe(tableNode);
    expect(page.getByText('No users found.').tagName).not.toBe('STRONG');
    const messages = view.container.querySelector<HTMLElement>('[aria-label="emptyMessage"]');
    if (!messages) throw new Error('Missing emptyMessage control');
    await interact(() => fireEvent.click(within(messages).getByRole('radio', { name: 'rich', exact: true })));
    expect(page.getByText('No users found.').tagName).toBe('STRONG');
    await interact(() => fireEvent.click(within(messages).getByRole('radio', { name: 'default', exact: true })));
    expect(page.getByText('No results.')).toBeTruthy();
    expect(page.queryByText('No users found.')).toBeNull();
    await interact(() => fireEvent.click(toggle));
    expect(page.getByRole('table')).toBe(tableNode);
    expect(page.getByRole('button', { name: 'Name', exact: true })).toBe(name);
    expect(name.getAttribute('data-sorted')).toBe('asc');
    expect(rowText()).toEqual(sortedRows);
  });
});
