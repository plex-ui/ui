import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { InputBirthdayDemo } from '../../components/docs/InputDemos';
import type { VueDemoControl } from '../../components/docs/vue/VueDemo';
import { VueInputDemo } from '../../components/docs/vue/VueInputDemos';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
// Non-scoped parity CSS aliases PreviewEmbed.Root. This suite mounts demos directly,
// so the embed-only child filter must not run.
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));

// The birthday mask lives on the Input page (Float Input links to it): the Vue example is read from its MDX, with the
// desktop controls of the page.
const mdx = readFileSync('content/vue/components/input.mdx', 'utf8');
const slice = (from: string, to: string) => mdx.slice(mdx.indexOf(`export const ${from} = `), mdx.indexOf(`export const ${to} = `)).replaceAll('export const ', 'const ');
const vue = new Function(`${slice('sizeOptions', 'overview')}; ${slice('birthday', 'birthdayValidation')}; return { template: birthday, controls: maskControls };`)() as { template: string; controls: VueDemoControl[] };

const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // A desktop window: the example shows its desktop field and controls
  document.documentElement.style.setProperty('--breakpoint-md', '768px');
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('min-width') && 1024 >= Number(/min-width: (\d+)px/.exec(query)?.[1]), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true, onchange: null }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.documentElement.style.removeProperty('--breakpoint-md'); });

describe.each(['React', 'Vue'])('%s Input birthday example', (framework) => {
  test('the desktop controls keep a partial mask edit and its selection; deleting a separator removes the digit before it', async () => {
    const view = render(framework === 'React' ? <InputBirthdayDemo /> : <VueInputDemo template={vue.template} controls={vue.controls} state={{ birthday: '' }} />);
    await interact(() => {});
    const page = within(view.container);
    const field = () => view.container.querySelector<HTMLInputElement>('input[inputmode="numeric"]');
    const input = field();
    if (!input) throw new Error('Missing birthday input');
    await interact(() => { input.focus(); fireEvent.input(input, { target: { value: '021' } }); });
    expect(input.value).toBe('02 / 1');
    await interact(() => input.setSelectionRange(5, 6));
    const keep = () => {
      expect(field()).toBe(input);
      expect(input.value).toBe('02 / 1');
      expect([input.selectionStart, input.selectionEnd]).toEqual([5, 6]);
    };
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'pill', exact: true })));
    keep();
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'soft', exact: true })));
    keep();
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'pill', exact: true })));
    keep();
    await interact(() => fireEvent.input(input, { target: { value: '02 / ' } }));
    expect(input.value).toBe('02 / ');
    await interact(() => fireEvent.input(input, { target: { value: '02 /' } }));
    expect(input.value).toBe('0');
    await interact(() => fireEvent.input(input, { target: { value: '01151995' } }));
    expect(input.value).toBe('01 / 15 / 1995');
  });
});
