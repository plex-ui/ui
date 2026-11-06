import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FloatingLabelInputBirthdayDemo, FloatingLabelInputStatesDemo } from '../../components/docs/FloatingLabelInputDemos';
import { VueDemo, type VueDemoControl } from '../../components/docs/vue/VueDemo';
import { VueFloatingLabelInputDemo } from '../../components/docs/vue/VueFloatingLabelInputDemos';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
// Non-scoped parity CSS aliases PreviewEmbed.Root and FloatingLabelInput.Root.
// This suite mounts demos directly, so the embed-only child filter must not run.
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));

const mdx = readFileSync('content/vue/components/floating-label-input.mdx', 'utf8');
function example(name: string, next: string) {
  const source = mdx.slice(mdx.indexOf(`export const ${name} = `), mdx.indexOf(`export const ${next} = `)).replaceAll('export const ', 'const ');
  const result: unknown = new Function(`${source}; return { template: ${name}, controls: ${name}Controls };`)();
  if (!result || typeof result !== 'object' || !('template' in result) || typeof result.template !== 'string' || !('controls' in result) || !Array.isArray(result.controls)) {
    throw new Error(`Missing ${name} example`);
  }
  const controls: VueDemoControl[] = result.controls.map((control: unknown) => {
    if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('type' in control) || !('default' in control)) {
      throw new Error('Invalid demo control');
    }
    if (control.type === 'boolean' && typeof control.default === 'boolean') {
      return { name: control.name, type: 'boolean', default: control.default };
    }
    if (control.type !== 'select' || typeof control.default !== 'string' || !('label' in control) || typeof control.label !== 'string' || !('options' in control) || !Array.isArray(control.options)) {
      throw new Error('Invalid preset control');
    }
    const options = control.options.map((option: unknown) => {
      if (!option || typeof option !== 'object' || !('value' in option) || typeof option.value !== 'string' || !('label' in option) || typeof option.label !== 'string') throw new Error('Invalid preset option');
      return { value: option.value, label: option.label };
    });
    return { name: control.name, label: control.label, type: 'select', default: control.default, options };
  });
  return { template: result.template, controls };
}
const states = example('states', 'textarea');
const birthday = example('birthday', 'birthdayValidation');
const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(['React', 'Vue'])('%s floating label demo controls', (framework) => {
  test('state controls preserve the edited node, value and selection; only presets replace the value', async () => {
    const view = render(framework === 'React' ? <FloatingLabelInputStatesDemo /> : <VueDemo {...states} />);
    await interact(() => {});
    const page = within(view.container);
    const input = page.getByRole<HTMLInputElement>('textbox', { name: 'Email address' });
    await interact(() => fireEvent.input(input, { target: { value: 'edited@example.com' } }));
    await interact(() => { input.focus(); input.setSelectionRange(2, 7); });
    const toggle = async (name: string) => {
      await interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
      expect(page.getByRole('textbox', { name: 'Email address' })).toBe(input);
      expect(input.value).toBe('edited@example.com');
      expect([input.selectionStart, input.selectionEnd]).toEqual([2, 7]);
    };
    await toggle('invalid');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    await toggle('invalid');
    await toggle('errorMessage');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    await toggle('description');
    const described = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['Email is not valid.', "We'll never share your email with anyone else."]);
    await toggle('disabled');
    expect(input.disabled).toBe(true);
    await toggle('disabled');
    await toggle('readOnly');
    expect(input.readOnly).toBe(true);
    await toggle('readOnly');
    await toggle('errorMessage');
    await toggle('description');
    expect(page.queryByText('Email is not valid.')).toBeNull();
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'Filled', exact: true })));
    expect(input.value).toBe('jane.doe@example.com');
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'Empty', exact: true })));
    expect(input.value).toBe('');
    expect(page.getByRole('textbox', { name: 'Email address' })).toBe(input);
  });

  test('birthday controls keep partial mask edits; separator deletion and explicit presets remain usable', async () => {
    const view = render(framework === 'React' ? <FloatingLabelInputBirthdayDemo /> : <VueFloatingLabelInputDemo {...birthday} state={{ focused: false }} />);
    await interact(() => {});
    const page = within(view.container);
    const input = page.getByRole<HTMLInputElement>('textbox', { name: 'Birthday' });
    await interact(() => { input.focus(); fireEvent.input(input, { target: { value: '021' } }); });
    expect(input.value).toBe('02 / 1');
    await interact(() => input.setSelectionRange(5, 6));
    for (const name of ['invalid', 'disabled', 'readOnly']) {
      await interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
      expect(page.getByRole('textbox', { name: 'Birthday' })).toBe(input);
      expect(input.value).toBe('02 / 1');
      expect([input.selectionStart, input.selectionEnd]).toEqual([5, 6]);
    }
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    for (const name of ['invalid', 'disabled', 'readOnly']) {
      await interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    }
    await interact(() => fireEvent.input(input, { target: { value: '02 / ' } }));
    expect(input.value).toBe('02 / ');
    await interact(() => fireEvent.input(input, { target: { value: '02 /' } }));
    expect(input.value).toBe('0');
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'Filled', exact: true })));
    expect(input.value).toBe('01 / 15 / 1995');
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'Empty', exact: true })));
    expect(input.value).toBe('');
    expect(page.getByRole('textbox', { name: 'Birthday' })).toBe(input);
  });
});
