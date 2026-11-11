import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FloatingLabelInputOverviewDemo } from '../../components/docs/FloatingLabelInputDemos';
import type { VueDemoControl } from '../../components/docs/vue/VueDemo';
import { VuePhoneRowsDemo } from '../../components/docs/vue/VuePhoneRowsDemo';
import { phoneRows } from '../../components/docs/phoneRowsTemplate';
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
  const result: unknown = new Function(`${source}; return { template: ${name}, controls: ${name}Controls, phone: typeof ${name}Phone === 'string' ? ${name}Phone : undefined };`)();
  if (!result || typeof result !== 'object' || !('template' in result) || typeof result.template !== 'string' || !('controls' in result) || !Array.isArray(result.controls)) {
    throw new Error(`Missing ${name} example`);
  }
  const controls: VueDemoControl[] = result.controls.map((control: unknown) => {
    if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('type' in control) || !('default' in control)) {
      throw new Error('Invalid demo control');
    }
    if (control.type === 'boolean' && typeof control.default === 'boolean') {
      const label = 'label' in control && typeof control.label === 'string' ? control.label : undefined;
      const desktopOnly = 'desktopOnly' in control && control.desktopOnly === true;
      const when = 'when' in control && control.when && typeof control.when === 'object' ? { when: control.when as Record<string, string> } : {};
      return { name: control.name, label, desktopOnly, type: 'boolean', default: control.default, ...when };
    }
    if (control.type !== 'select' || typeof control.default !== 'string' || !('options' in control) || !Array.isArray(control.options)) {
      throw new Error('Invalid select control');
    }
    const label = 'label' in control && typeof control.label === 'string' ? control.label : undefined;
    // An option is its value, or a value under a label (the preset's Empty and Filled)
    const options = control.options.map((option: unknown) => {
      if (typeof option === 'string') return option;
      if (!option || typeof option !== 'object' || !('value' in option) || typeof option.value !== 'string' || !('label' in option) || typeof option.label !== 'string') throw new Error('Invalid option');
      return { value: option.value, label: option.label };
    });
    const desktopOnly = 'desktopOnly' in control && control.desktopOnly === true;
    return { name: control.name, label, desktopOnly, type: 'select', default: control.default, options };
  });
  const phone = 'phone' in result && typeof result.phone === 'string' ? result.phone : undefined;
  return { template: result.template, controls, phone };
}
const states = example('overview', 'textarea');
const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };
// The demos choose their phone layout by the md breakpoint: a desktop window unless a test narrows it
let width = 1024;
beforeEach(() => {
  width = 1024;
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  document.documentElement.style.setProperty('--breakpoint-md', '768px');
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('min-width') && width >= Number(/min-width: (\d+)px/.exec(query)?.[1]), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true, onchange: null }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.documentElement.style.removeProperty('--breakpoint-md'); });

describe.each(['React', 'Vue'])('%s floating label demo controls', (framework) => {
  test('state controls preserve the edited node, value and selection; only presets replace the value', async () => {
    const view = render(framework === 'React' ? <FloatingLabelInputOverviewDemo /> : <VuePhoneRowsDemo template={states.template} phoneTemplate={phoneRows(states.phone ?? '')} controls={states.controls} />);
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
    expect(page.queryByRole('button', { name: 'Clear input' })).toBeNull();
    await toggle('onClear');
    expect(page.getByRole('button', { name: 'Clear input' })).toBeTruthy();
    await toggle('readOnly');
    expect(page.queryByRole('button', { name: 'Clear input' })).toBeNull();
    await toggle('readOnly');
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Clear input' })));
    expect(input.value).toBe('');
    expect(page.getByRole('textbox', { name: 'Email address' })).toBe(input);
    await interact(() => fireEvent.input(input, { target: { value: 'edited@example.com' } }));
    await interact(() => input.setSelectionRange(2, 7));
    await toggle('onClear');
    expect(page.queryByRole('button', { name: 'Clear input' })).toBeNull();
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
});

describe.each(['React', 'Vue'])('%s floating label Overview: where the label rests and the shape (owner 11.11)', (framework) => {
  test('pill is offered only with the label on the border and keeps its choice; invalid only without an error message', async () => {
    const view = render(framework === 'React' ? <FloatingLabelInputOverviewDemo /> : <VuePhoneRowsDemo template={states.template} phoneTemplate={phoneRows(states.phone ?? '')} controls={states.controls} />);
    await interact(() => {});
    const page = within(view.container);
    const input = page.getByRole<HTMLInputElement>('textbox', { name: 'Email address' });
    await interact(() => fireEvent.input(input, { target: { value: 'edited@example.com' } }));
    // The field's root marks its shape and where its label rests
    const root = () => page.getByRole('textbox', { name: 'Email address' }).closest<HTMLElement>('.Root')!;
    const placement = (name: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: 'labelPlacement' })).getByRole('radio', { name })));
    const pill = () => page.queryByRole('switch', { name: 'pill', exact: true });
    expect(root().hasAttribute('data-pill')).toBe(true);
    await interact(() => fireEvent.click(pill()!));
    expect(root().hasAttribute('data-pill')).toBe(false);
    await placement('inside');
    expect(pill()).toBeNull();
    expect(root().getAttribute('data-label-placement')).toBe('inside');
    expect(root().hasAttribute('data-pill')).toBe(false);
    await placement('border');
    expect(pill()?.getAttribute('aria-checked')).toBe('false');
    expect(root().hasAttribute('data-label-placement')).toBe(false);
    expect(root().hasAttribute('data-pill')).toBe(false);
    // The settings keep the edited field
    expect(page.getByRole('textbox', { name: 'Email address' })).toBe(input);
    expect(input.value).toBe('edited@example.com');
    // An error message marks the field invalid, so invalid alone is offered without one
    expect(page.getByRole('switch', { name: 'invalid', exact: true })).toBeTruthy();
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'errorMessage', exact: true })));
    expect(page.queryByRole('switch', { name: 'invalid', exact: true })).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});

describe.each(['React', 'Vue'])('%s floating label Overview on a phone', (framework) => {
  test('the field is a cell named by its placeholder: the error inside the cell, the description in the footer', async () => {
    width = 402;
    const view = render(framework === 'React' ? <FloatingLabelInputOverviewDemo /> : <VuePhoneRowsDemo template={states.template} phoneTemplate={phoneRows(states.phone ?? '')} controls={states.controls} />);
    await interact(() => {});
    const page = within(view.container);
    const input = page.getByRole<HTMLInputElement>('textbox', { name: 'Email address' });
    expect(input.placeholder).toBe('Email address');
    const cell = input.closest('[data-slot="field"]');
    expect(cell?.hasAttribute('data-row')).toBe(true);
    expect(cell?.hasAttribute('data-label-hidden')).toBe(true);
    // A cell has no frame to color: invalid alone is a desktop control, hidden on a phone
    expect(page.getByRole('switch', { name: 'invalid', exact: true }).closest('[data-demo-desktop-only]')).not.toBeNull();
    // The label does not float and the cell is the frame: where the label rests and the shape are desktop settings
    expect(page.getByRole('radiogroup', { name: 'labelPlacement' }).closest('[data-demo-desktop-only]')).not.toBeNull();
    expect(page.getByRole('switch', { name: 'pill', exact: true }).closest('[data-demo-desktop-only]')).not.toBeNull();
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'errorMessage', exact: true })));
    expect(page.getByText('Email is not valid.').closest('[data-slot="field"]')).toBe(cell);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'description', exact: true })));
    const description = page.getByText("We'll never share your email with anyone else.");
    expect(description.closest('[data-slot="field"]')).toBeNull();
    expect(description.closest('[role="group"]')).toBe(cell?.closest('[role="group"]'));
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'Filled', exact: true })));
    expect(input.value).toBe('jane.doe@example.com');
    expect(page.queryByRole('button', { name: 'Clear input' })).toBeNull();
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'onClear', exact: true })));
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Clear input' })));
    expect(input.value).toBe('');
  });
});
