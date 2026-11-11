import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { indentCode } from '../../components/docs/demoCode.mjs';
import { AccordionOverviewDemo } from '../../components/docs/AccordionDemos';
import { CheckboxOverviewDemo } from '../../components/docs/CheckboxDemos';
import { TabsOverviewDemo } from '../../components/docs/TabsDemos';
import { TableVariantDemo } from '../../components/docs/TableDemos';
import { TextareaOverviewDemo } from '../../components/docs/TextareaDemos';
import { SelectControlOverviewDemo } from '../../components/docs/SelectControlDemos';
import { SelectOverviewDemo } from '../../components/docs/SelectDemos';
import { ProgressStepsOverviewDemo } from '../../components/docs/ProgressStepsDemos';
import { RadioGroupOverviewDemo } from '../../components/docs/RadioGroupDemos';
import { VuePhoneRowsDemo } from '../../components/docs/vue/VuePhoneRowsDemo';
import { VueSelectDemo } from '../../components/docs/vue/VueSelectDemos';
import { phoneRows } from '../../components/docs/phoneRowsTemplate';
import { VueDemo, type VueDemoControl, type VueDemoOption } from '../../components/docs/vue/VueDemo';
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
vi.mock('@plexui/ui/components/Textarea', async () => import('../../packages/ui/src/components/Textarea'));
vi.mock('@plexui/vue/components/Textarea', async () => import('../../packages/vue/src/components/Textarea'));
vi.mock('@plexui/ui/components/SelectControl', async () => import('../../packages/ui/src/components/SelectControl'));
vi.mock('@plexui/vue/components/SelectControl', async () => import('../../packages/vue/src/components/SelectControl'));
vi.mock('@plexui/ui/components/Select', async () => import('../../packages/ui/src/components/Select'));
vi.mock('@plexui/vue/components/Select', async () => import('../../packages/vue/src/components/Select'));
vi.mock('@plexui/ui/components/RadioGroup', async () => import('../../packages/ui/src/components/RadioGroup'));
vi.mock('@plexui/vue/components/RadioGroup', async () => import('../../packages/vue/src/components/RadioGroup'));

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
  // A templated example (demoCode.mjs) builds its code from constants and helpers of the page
  const referenced = Object.fromEntries(references.map((key) => [key, read(key, { indentCode })]));
  const template = read(name, { indentCode, ...referenced });
  const rawControls = read(`${name}Controls`, referenced);
  if (typeof template !== 'string' || !Array.isArray(rawControls)) throw new Error('Invalid demo');
  const controls: VueDemoControl[] = rawControls.map((control: unknown) => {
    if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('type' in control) || !('default' in control)) throw new Error('Invalid control');
    const when = 'when' in control && control.when && typeof control.when === 'object' ? { when: control.when as Record<string, unknown> } : {};
    // A control's phone settings: hidden there (`desktopOnly`, giving its `phoneDefault`), or other options
    const phoneSettings = {
      ...('desktopOnly' in control && control.desktopOnly === true ? { desktopOnly: true } : {}),
      ...('phoneDefault' in control && (typeof control.phoneDefault === 'string' || typeof control.phoneDefault === 'boolean') ? { phoneDefault: control.phoneDefault } : {}),
    };
    if (control.type === 'boolean' && typeof control.default === 'boolean') return { name: control.name, type: 'boolean', default: control.default, ...when, ...phoneSettings };
    if (control.type === 'range' && typeof control.default === 'number' && 'min' in control && typeof control.min === 'number' && 'max' in control && typeof control.max === 'number' && 'step' in control && typeof control.step === 'number') {
      return { name: control.name, type: 'range', default: control.default, min: control.min, max: control.max, step: control.step, ...when, ...phoneSettings };
    }
    // An option is its value, or a value under a label offered only while its `when` holds (icon only, horizontal)
    const isOption = (option: unknown): option is VueDemoOption => typeof option === 'string'
      || (!!option && typeof option === 'object' && 'value' in option && typeof option.value === 'string' && 'label' in option && typeof option.label === 'string');
    if (control.type !== 'select' || typeof control.default !== 'string' || !('options' in control) || !Array.isArray(control.options) || !control.options.every(isOption)) throw new Error('Invalid select control');
    const phoneOptions = 'phoneOptions' in control && Array.isArray(control.phoneOptions) && control.phoneOptions.every(isOption) ? { phoneOptions: control.phoneOptions } : {};
    return { name: control.name, type: 'select', default: control.default, options: control.options, ...when, ...phoneSettings, ...phoneOptions };
  });
  return { template, controls };
}
const checkbox = example('checkbox', 'overview');
const accordion = example('accordion', 'overview', ['overviewAccordion']);
const tabs = example('segmented-control', 'overview', ['SIZES', 'VARIANTS', 'ORIENTATIONS']);
const table = example('table', 'variant');
const textareaOverview = example('textarea', 'overview');
/** A select example as its page mounts it: the page's VueSelectDemo props (its phone template, desktop-only controls and
 * state) over the template and controls, with the helpers VueSelectDemo gives every template */
function selectExample(page: string, name: string, references: string[] = []) {
  const mdx = readFileSync(`content/vue/components/${page}.mdx`, 'utf8');
  const marker = `export const ${name}Phone = `;
  const rest = mdx.slice(mdx.indexOf(marker) + marker.length);
  const phone = new Function(`return ${rest.slice(0, rest.search(/\nexport const |\n<UsageBlock>/)).trim()}`)() as string;
  const tag = mdx.split('\n').find((line) => line.includes('<VueSelectDemo') && line.includes(`template={${name}}`));
  if (!tag) throw new Error(`Missing the ${name} demo of ${page}`);
  const desktopControlNames = JSON.parse(/desktopControlNames=\{(\[[^\]]*\])\}/.exec(tag)![1]) as string[];
  const state = new Function(`return ${/state=\{(\{[^}]*\})\}/.exec(tag)![1]}`)() as Record<string, unknown>;
  return { ...example(page, name, references), phoneTemplate: phoneRows(phone), desktopControlNames, state };
}
const selectControlOverview = selectExample('select-control', 'overview');
const selectOverview = selectExample('select', 'overview', ['VARIANTS']);
const progressOverview = example('progress-steps', 'overview');
/** The Radio Group Overview as its page mounts it, with its phone rows */
const radioOverview = (() => {
  const mdx = readFileSync('content/vue/components/radio-group.mdx', 'utf8');
  const marker = 'export const overviewPhone = ';
  const rest = mdx.slice(mdx.indexOf(marker) + marker.length);
  const phone = new Function(`return ${rest.slice(0, rest.search(/\nexport const /)).trim()}`)() as string;
  return { ...example('radio-group', 'overview'), phoneTemplate: phoneRows(phone), state: { frequency: 'daily' } };
})();
const progressSteps = [
  { title: 'Your details', description: 'Please provide your name and email', icon: 'Email' },
  { title: 'Company details', description: 'A few details about your company', icon: 'Globe' },
  { title: 'Invite your team', description: 'Start collaborating with your team', icon: 'Users' },
  { title: 'Add your socials', description: 'Share posts to your social accounts', icon: 'Bolt' },
];
const interact = async (action: () => void) => { await act(async () => { action(); await flushVue(); }); };

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // A desktop page: demos with desktop-only controls (Tabs size and pill) ask for the viewport
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(['React', 'Vue'])('%s consolidated catalogue states', (framework) => {
  test('checkbox: one Overview of the three states carries every setting, each where it acts, and disabled keeps the states (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <CheckboxOverviewDemo /> : <VueDemo {...checkbox} />);
    await interact(() => {});
    const page = within(view.container);
    const box = (name: string) => page.getByRole<HTMLButtonElement>('checkbox', { name, exact: true });
    const group = (name: string) => within(page.getByRole('radiogroup', { name }));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name })));
    const boxes = () => page.getAllByRole<HTMLButtonElement>('checkbox');
    expect(box('Share usage data').getAttribute('aria-checked')).toBe('true');
    expect(box('Enable notifications').getAttribute('aria-checked')).toBe('false');
    expect(box('Sync all folders').getAttribute('aria-checked')).toBe('mixed');
    for (const item of boxes()) expect(item.getAttribute('data-variant')).toBe('solid');
    // pill rounds the box of both variants: the solid fill, the ghost hover tint and focus ring
    await toggle('pill');
    for (const item of boxes()) expect(item.hasAttribute('data-pill')).toBe(true);
    await interact(() => fireEvent.click(group('variant').getByRole('radio', { name: 'ghost' })));
    expect(page.getByRole('switch', { name: 'pill' }).getAttribute('aria-checked')).toBe('true');
    for (const item of boxes()) {
      expect(item.getAttribute('data-variant')).toBe('ghost');
      expect(item.hasAttribute('data-pill')).toBe(true);
    }
    await interact(() => fireEvent.click(group('variant').getByRole('radio', { name: 'solid' })));
    // description and orientation act next to a label
    expect(box('Share usage data').getAttribute('aria-describedby')).toBeNull();
    await toggle('description');
    expect(page.getByText('Help improve the product with anonymous usage reports.')).toBeTruthy();
    expect(box('Share usage data').getAttribute('aria-describedby')).toBeTruthy();
    await interact(() => fireEvent.click(group('orientation').getByRole('radio', { name: 'right' })));
    for (const item of boxes()) expect(item.closest('[data-orientation]')?.getAttribute('data-orientation')).toBe('right');
    await toggle('label');
    expect(page.queryByRole('switch', { name: 'description' })).toBeNull();
    expect(page.queryByRole('radiogroup', { name: 'orientation' })).toBeNull();
    expect(page.queryByText('Share usage data')).toBeNull();
    expect(page.queryByText('Help improve the product with anonymous usage reports.')).toBeNull();
    expect(box('Share usage data').getAttribute('aria-label')).toBe('Share usage data');
    expect(box('Share usage data').getAttribute('aria-describedby')).toBeNull();
    // The choices come back with the label
    await toggle('label');
    expect(page.getByText('Help improve the product with anonymous usage reports.')).toBeTruthy();
    expect(group('orientation').getByRole('radio', { name: 'right' }).getAttribute('aria-checked')).toBe('true');
    // disabled keeps a user's change and the indeterminate state
    await interact(() => fireEvent.click(box('Enable notifications')));
    expect(box('Enable notifications').getAttribute('aria-checked')).toBe('true');
    await toggle('disabled');
    for (const item of boxes()) expect(item.disabled).toBe(true);
    await interact(() => fireEvent.click(box('Enable notifications')));
    expect(box('Enable notifications').getAttribute('aria-checked')).toBe('true');
    expect(box('Sync all folders').getAttribute('aria-checked')).toBe('mixed');
    await toggle('disabled');
    await interact(() => fireEvent.click(box('Enable notifications')));
    expect(box('Enable notifications').getAttribute('aria-checked')).toBe('false');
  });

  test('radio group: one Overview carries direction, orientation, descriptions and both kinds of disabled (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <RadioGroupOverviewDemo /> : <VuePhoneRowsDemo {...radioOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const radio = (name: string) => page.getByRole<HTMLButtonElement>('radio', { name, exact: true });
    const group = (name: string) => within(page.getByRole('radiogroup', { name }));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const items = () => ['Daily', 'Weekly', 'Monthly', 'Never'].map(radio);
    const list = () => page.getByRole('radiogroup', { name: 'Notification frequency' });
    expect(radio('Daily').getAttribute('aria-checked')).toBe('true');
    expect(list().getAttribute('data-direction')).toBe('col');
    // A column with the indicator after the label fills the group, so the indicators line up
    await interact(() => fireEvent.click(group('orientation').getByRole('radio', { name: 'right' })));
    expect(list().classList.contains('w-56')).toBe(true);
    for (const item of items()) {
      expect(item.closest('[data-orientation]')?.getAttribute('data-orientation')).toBe('right');
      expect(item.closest('[data-orientation]')?.hasAttribute('data-block')).toBe(true);
    }
    await interact(() => fireEvent.click(group('direction').getByRole('radio', { name: 'row' })));
    expect(list().getAttribute('data-direction')).toBe('row');
    expect(list().classList.contains('w-56')).toBe(false);
    for (const item of items()) expect(item.closest('[data-orientation]')?.hasAttribute('data-block')).toBe(false);
    // An item's description sits outside its label and describes it
    expect(radio('Daily').getAttribute('aria-describedby')).toBeNull();
    await toggle('description');
    const described = document.getElementById(radio('Daily').getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toBe('A summary every morning.');
    await toggle('itemDisabled');
    expect(items().map((item) => item.disabled)).toEqual([false, false, true, false]);
    await interact(() => fireEvent.click(radio('Weekly')));
    expect(radio('Weekly').getAttribute('aria-checked')).toBe('true');
    await toggle('disabled');
    for (const item of items()) expect(item.disabled).toBe(true);
    // A disabled group disables every option: itemDisabled is offered only while it is enabled, and keeps its choice
    expect(page.queryByRole('switch', { name: 'itemDisabled', exact: true })).toBeNull();
    await toggle('disabled');
    expect(page.getByRole('switch', { name: 'itemDisabled', exact: true }).getAttribute('aria-checked')).toBe('true');
    expect(items().map((item) => item.disabled)).toEqual([false, false, true, false]);
    expect(radio('Weekly').getAttribute('aria-checked')).toBe('true');
  });

  test('radio group on a phone: rows of a FieldGroup, with row descriptions and Monthly disabled; direction and orientation are desktop settings', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: !media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const view = render(framework === 'React' ? <RadioGroupOverviewDemo /> : <VuePhoneRowsDemo {...radioOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const radio = (name: string) => page.getByRole<HTMLButtonElement>('radio', { name, exact: true });
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const row = (name: string) => radio(name).closest<HTMLElement>('[data-slot="field"]');
    for (const name of ['Daily', 'Weekly', 'Monthly', 'Never']) expect(row(name)?.hasAttribute('data-row')).toBe(true);
    // Hidden on a phone: left out, or marked for the stylesheet
    for (const name of ['direction', 'orientation']) {
      const control = page.queryByRole('radiogroup', { name });
      expect(!control || !!control.closest('[data-demo-desktop-only]')).toBe(true);
    }
    expect(row('Daily')?.textContent).not.toContain('A summary every morning.');
    await toggle('description');
    expect(row('Daily')?.textContent).toContain('A summary every morning.');
    await toggle('itemDisabled');
    expect(['Daily', 'Weekly', 'Monthly', 'Never'].map((name) => radio(name).disabled)).toEqual([false, false, true, false]);
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

  test('accordion type, collapsible and card are settings of the one Overview (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <AccordionOverviewDemo /> : <VueDemo {...accordion} />);
    await interact(() => {});
    const page = within(view.container);
    const trigger = (name: string) => page.getByRole<HTMLButtonElement>('button', { name });
    // single and collapsible: the open item closes, and opening another closes the first
    expect(trigger('What are your shipping options?').getAttribute('aria-expanded')).toBe('true');
    await interact(() => fireEvent.click(trigger('What are your shipping options?')));
    expect(trigger('What are your shipping options?').getAttribute('aria-expanded')).toBe('false');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'collapsible' })));
    expect(trigger('What are your shipping options?').getAttribute('aria-expanded')).toBe('true');
    await interact(() => fireEvent.click(trigger('What are your shipping options?')));
    expect(trigger('What are your shipping options?').getAttribute('aria-expanded')).toBe('true');
    // multiple: several items stay open, and collapsible, which only a single accordion has, is not offered
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'multiple' })));
    expect(page.queryByRole('switch', { name: 'collapsible' })).toBeNull();
    await interact(() => fireEvent.click(trigger('How can I contact customer support?')));
    expect(trigger('What are your shipping options?').getAttribute('aria-expanded')).toBe('true');
    expect(trigger('How can I contact customer support?').getAttribute('aria-expanded')).toBe('true');
    // card: the same accordion inside a Card with its header
    expect(page.queryByText('Orders & returns')).toBeNull();
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'card' })));
    expect(page.getByText('Orders & returns')).toBeTruthy();
    expect(page.getAllByRole('button', { name: /\?$/ })).toHaveLength(3);
  });

  test('textarea: every setting is a control of the one Overview, rows and maxRows on one 1–10 scale (owner 11.11)', async () => {
    const note = 'Gate code 4512\nThird floor, door on the left\nCall when you arrive';
    const view = render(framework === 'React' ? <TextareaOverviewDemo /> : <VueDemo {...textareaOverview} state={{ value: note }} />);
    await interact(() => {});
    const page = within(view.container);
    const area = () => page.getByPlaceholderText<HTMLTextAreaElement>('Add a note');
    const frame = () => area().closest('[data-variant]');
    expect(area().value).toBe(note);
    expect(frame()?.getAttribute('data-variant')).toBe('outline');
    expect(frame()?.getAttribute('data-size')).toBe('md');
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'soft' })));
    await interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: 'size' })).getByRole('radio', { name: 'lg' })));
    expect(frame()?.getAttribute('data-variant')).toBe('soft');
    expect(frame()?.getAttribute('data-size')).toBe('lg');
    // rows and maxRows: sliders of one scale, 1 to 10 by one
    for (const name of ['rows', 'maxRows']) {
      const slider = page.getByRole('slider', { name });
      expect([slider.getAttribute('aria-valuemin'), slider.getAttribute('aria-valuemax')]).toEqual(['1', '10']);
    }
    expect(area().getAttribute('rows')).toBe('3');
    const rows = page.getByRole('slider', { name: 'rows' });
    await interact(() => { fireEvent.keyDown(rows, { key: 'ArrowRight' }); });
    await interact(() => { fireEvent.keyDown(rows, { key: 'ArrowRight' }); });
    expect(area().getAttribute('rows')).toBe('5');
    // The extensions are let in or kept out as the field mounts: the text the user typed stays
    await interact(() => fireEvent.input(area(), { target: { value: 'Typed' } }));
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'allowAutofillExtensions' })));
    expect(area().value).toBe('Typed');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'disabled' })));
    expect(area().disabled).toBe(true);
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'invalid' })));
    expect(frame()?.hasAttribute('data-invalid')).toBe(true);
    for (const name of ['autoResize', 'autoSelect']) expect(page.getByRole('switch', { name })).toBeTruthy();
  });

  test('select control: every setting is a control of the one Overview, optical alignment only for ghost (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <SelectControlOverviewDemo /> : <VueSelectDemo {...selectControlOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const control = () => view.container.querySelector<HTMLElement>('[data-slot="select-control"]')!;
    const group = (name: string) => within(page.getByRole('radiogroup', { name }));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name })));
    const pick = async (period: string) => {
      await interact(() => { control().focus(); fireEvent.keyDown(control(), { key: 'Enter' }); });
      await interact(() => fireEvent.click(within(document.body).getByRole('menuitemradio', { name: period })));
    };
    // The trigger of the Period field, named by its label and its value, a placeholder until a period is picked
    expect(page.getByRole('button', { name: 'Period Select date...' })).toBe(control());
    expect(control().getAttribute('data-variant')).toBe('outline');
    expect(control().getAttribute('data-size')).toBe('md');
    expect(control().className).toContain('w-[200px]');
    expect(control().querySelector('.StartIcon')).toBeTruthy();
    expect(control().querySelector('.DropdownIcon')).toBeTruthy();
    for (const name of ['pill', 'startIcon', 'clearable', 'loading', 'invalid', 'disabled', 'block']) expect(page.getByRole('switch', { name })).toBeTruthy();
    // selected follows the value, and a clearable control unsets it
    await pick('Last week');
    expect(page.getByRole('button', { name: 'Period Last week' })).toBe(control());
    expect(['true', '']).toContain(control().getAttribute('data-selected'));
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Clear current value' })));
    expect(page.getByRole('button', { name: 'Period Select date...' })).toBe(control());
    expect(['true', '']).not.toContain(control().getAttribute('data-selected'));
    await toggle('clearable');
    await pick('Today');
    expect(page.getByRole('button', { name: 'Period Today' })).toBe(control());
    expect(page.queryByRole('button', { name: 'Clear current value' })).toBeNull();
    // Optical alignment offsets a ghost control by its gutter; a framed control keeps it, and `end` needs block
    expect(page.queryByRole('radiogroup', { name: 'opticallyAlign' })).toBeNull();
    await interact(() => fireEvent.click(group('variant').getByRole('radio', { name: 'ghost' })));
    expect(group('opticallyAlign').queryByRole('radio', { name: 'end' })).toBeNull();
    await interact(() => fireEvent.click(group('opticallyAlign').getByRole('radio', { name: 'start' })));
    expect(control().getAttribute('data-optically-align')).toBe('start');
    await toggle('block');
    await interact(() => fireEvent.click(group('opticallyAlign').getByRole('radio', { name: 'end' })));
    expect(control().getAttribute('data-optically-align')).toBe('end');
    // Without block `end` moves nothing: it is no longer offered, and the control keeps its gutter
    await toggle('block');
    expect(group('opticallyAlign').queryByRole('radio', { name: 'end' })).toBeNull();
    expect(control().hasAttribute('data-optically-align')).toBe(false);
    await interact(() => fireEvent.click(group('opticallyAlign').getByRole('radio', { name: 'start' })));
    await interact(() => fireEvent.click(group('variant').getByRole('radio', { name: 'soft' })));
    expect(page.queryByRole('radiogroup', { name: 'opticallyAlign' })).toBeNull();
    expect(control().hasAttribute('data-optically-align')).toBe(false);
    await interact(() => fireEvent.click(group('size').getByRole('radio', { name: 'lg' })));
    expect(control().getAttribute('data-variant')).toBe('soft');
    expect(control().getAttribute('data-size')).toBe('lg');
    await interact(() => fireEvent.click(group('dropdownIconType').getByRole('radio', { name: 'chevronDown' })));
    expect(control().querySelector('.DropdownIconChevron')).toBeTruthy();
    await interact(() => fireEvent.click(group('dropdownIconType').getByRole('radio', { name: 'none' })));
    expect(control().querySelector('.DropdownIcon')).toBeNull();
    await toggle('pill');
    expect(control().hasAttribute('data-pill')).toBe(true);
    await toggle('startIcon');
    expect(control().querySelector('.StartIcon')).toBeNull();
    // block fills the 290px field: no set width holds it
    await toggle('block');
    expect(control().hasAttribute('data-block')).toBe(true);
    expect(control().className).not.toContain('w-[200px]');
    await toggle('loading');
    expect(control().getAttribute('aria-busy')).toBe('true');
    await toggle('invalid');
    expect(control().hasAttribute('data-invalid')).toBe(true);
    expect(page.getByText('No data for this period.')).toBeTruthy();
    await toggle('disabled');
    expect(control().hasAttribute('data-disabled')).toBe(true);
  });

  test('select control: on a phone the row offers only the settings it uses, and a clearable control has None', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const view = render(framework === 'React' ? <SelectControlOverviewDemo /> : <VueSelectDemo {...selectControlOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const control = () => view.container.querySelector<HTMLElement>('[data-slot="select-control"]')!;
    // A desktop-only row is left out, or hidden on a phone (React marks it for the stylesheet)
    const offered = (role: string, name: string) => { const row = page.queryByRole(role, { name }); return !!row && !row.closest('[data-demo-desktop-only]'); };
    for (const name of ['variant', 'size', 'dropdownIconType', 'opticallyAlign']) expect(offered('radiogroup', name)).toBe(false);
    for (const name of ['pill', 'startIcon', 'block']) expect(offered('switch', name)).toBe(false);
    for (const name of ['clearable', 'loading', 'invalid', 'disabled']) expect(page.getByRole('switch', { name })).toBeTruthy();
    expect(page.getByRole('button', { name: 'Period None' })).toBe(control());
    expect(control().querySelector('.StartIcon')).toBeNull();
    const open = () => interact(() => { control().focus(); fireEvent.keyDown(control(), { key: 'Enter' }); });
    await open();
    expect(within(document.body).getByRole('menuitemradio', { name: 'None' })).toBeTruthy();
    await interact(() => fireEvent.click(within(document.body).getByRole('menuitemradio', { name: 'Last month' })));
    expect(page.getByRole('button', { name: 'Period Last month' })).toBe(control());
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'clearable' })));
    await open();
    expect(within(document.body).getByRole('menuitemradio', { name: 'Today' })).toBeTruthy();
    expect(within(document.body).queryByRole('menuitemradio', { name: 'None' })).toBeNull();
  });

  test('select: every setting is a control of the one Overview, align only without block, optical alignment only for ghost (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <SelectOverviewDemo /> : <VueSelectDemo {...selectOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const control = () => view.container.querySelector<HTMLElement>('[data-slot="select-control"]')!;
    const group = (name: string) => within(page.getByRole('radiogroup', { name }));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name })));
    // The Fruit field's trigger, named by its label and its value
    expect(page.getByRole('button', { name: 'Fruit Select a fruit...' })).toBe(control());
    expect(control().getAttribute('data-variant')).toBe('outline');
    expect(control().getAttribute('data-size')).toBe('md');
    expect(control().hasAttribute('data-block')).toBe(true);
    for (const name of ['variant', 'size', 'dropdownIconType', 'checkPosition', 'side']) expect(page.getByRole('radiogroup', { name })).toBeTruthy();
    for (const name of ['pill', 'block', 'clearable', 'multiple', 'loading', 'disabled']) expect(page.getByRole('switch', { name })).toBeTruthy();
    // The list follows checkPosition and side
    const list = async (check: (listbox: HTMLElement) => void) => {
      await interact(() => fireEvent.click(control()));
      const listbox = document.querySelector<HTMLElement>('[role="listbox"]');
      expect(listbox).toBeTruthy();
      check(listbox!);
      await interact(() => fireEvent.click(control()));
    };
    const positions = (listbox: HTMLElement) => [...new Set(Array.from(listbox.querySelectorAll('[data-position]'), (slot) => slot.getAttribute('data-position')))];
    await list((listbox) => expect(positions(listbox)).toEqual(['start']));
    await interact(() => fireEvent.click(group('checkPosition').getByRole('radio', { name: 'end' })));
    await list((listbox) => expect(positions(listbox)).toEqual(['end']));
    await interact(() => fireEvent.click(group('checkPosition').getByRole('radio', { name: 'none' })));
    await list((listbox) => expect(positions(listbox)).toEqual([]));
    await interact(() => fireEvent.click(group('side').getByRole('radio', { name: 'top' })));
    await list((listbox) => expect(listbox.closest('[data-side]')?.getAttribute('data-side')).toBe('top'));
    // A block list takes the trigger's width, so align is offered only without block, where the list is 240px
    expect(page.queryByRole('radiogroup', { name: 'align' })).toBeNull();
    await toggle('block');
    expect(control().hasAttribute('data-block')).toBe(false);
    await interact(() => fireEvent.click(group('align').getByRole('radio', { name: 'end' })));
    await list((listbox) => {
      expect(listbox.closest('[data-align]')?.getAttribute('data-align')).toBe('end');
      expect(listbox.closest<HTMLElement>('[style*="--select-list-min-width"]')?.style.getPropertyValue('--select-list-min-width')).toBe('240px');
    });
    // Optical alignment only for ghost, and `end` only with block
    expect(page.queryByRole('radiogroup', { name: 'opticallyAlign' })).toBeNull();
    await interact(() => fireEvent.click(group('variant').getByRole('radio', { name: 'ghost' })));
    expect(group('opticallyAlign').queryByRole('radio', { name: 'end' })).toBeNull();
    await interact(() => fireEvent.click(group('opticallyAlign').getByRole('radio', { name: 'start' })));
    expect(control().getAttribute('data-optically-align')).toBe('start');
    await toggle('block');
    expect(page.queryByRole('radiogroup', { name: 'align' })).toBeNull();
    await interact(() => fireEvent.click(group('opticallyAlign').getByRole('radio', { name: 'end' })));
    expect(control().getAttribute('data-optically-align')).toBe('end');
    await interact(() => fireEvent.click(group('variant').getByRole('radio', { name: 'soft' })));
    expect(page.queryByRole('radiogroup', { name: 'opticallyAlign' })).toBeNull();
    expect(control().hasAttribute('data-optically-align')).toBe(false);
    await interact(() => fireEvent.click(group('size').getByRole('radio', { name: '2xl' })));
    expect(control().getAttribute('data-variant')).toBe('soft');
    expect(control().getAttribute('data-size')).toBe('2xl');
    await interact(() => fireEvent.click(group('dropdownIconType').getByRole('radio', { name: 'chevronDown' })));
    expect(control().querySelector('.DropdownIconChevron')).toBeTruthy();
    await toggle('pill');
    expect(control().hasAttribute('data-pill')).toBe(true);
    // multiple: the Fruits field, an array of values
    await toggle('multiple');
    expect(page.getByRole('button', { name: 'Fruits Select fruits...' })).toBe(control());
    await toggle('loading');
    expect(control().getAttribute('aria-busy')).toBe('true');
    await toggle('disabled');
    expect(control().hasAttribute('data-disabled')).toBe(true);
  });

  test('select: on a phone the row offers only the settings it uses', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const view = render(framework === 'React' ? <SelectOverviewDemo /> : <VueSelectDemo {...selectOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const control = () => view.container.querySelector<HTMLElement>('[data-slot="select-control"]')!;
    // A desktop-only row is left out, or hidden on a phone (React marks it for the stylesheet)
    const offered = (role: string, name: string) => { const row = page.queryByRole(role, { name }); return !!row && !row.closest('[data-demo-desktop-only]'); };
    for (const name of ['variant', 'size', 'dropdownIconType', 'side', 'align', 'opticallyAlign']) expect(offered('radiogroup', name)).toBe(false);
    for (const name of ['pill', 'block']) expect(offered('switch', name)).toBe(false);
    for (const name of ['clearable', 'multiple', 'loading', 'disabled']) expect(page.getByRole('switch', { name })).toBeTruthy();
    // The checkmark leads every row: checkPosition is start or none there
    expect(offered('radiogroup', 'checkPosition')).toBe(true);
    expect(within(page.getByRole('radiogroup', { name: 'checkPosition' })).getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['start', 'none']);
    expect(page.getByRole('button', { name: 'Fruit None' })).toBe(control());
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'multiple' })));
    expect(page.getByRole('button', { name: 'Fruits None' })).toBe(control());
  });

  test('progress steps: every setting is a control of the one Overview, the minimal bar only with its own (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <ProgressStepsOverviewDemo /> : <VueDemo {...progressOverview} state={{ steps: progressSteps }} />);
    await interact(() => {});
    const page = within(view.container);
    const stage = () => view.container.querySelector<HTMLElement>('[data-demo-stage]')!;
    const list = () => stage().querySelector<HTMLElement>('ol')!;
    const group = (name: string) => within(page.getByRole('radiogroup', { name }));
    const options = (name: string) => group(name).getAllByRole('radio').map((radio) => radio.textContent);
    const names = () => Array.from(view.container.querySelectorAll('[data-demo-controls] [role=radiogroup], [data-demo-controls] [role=switch], [data-demo-controls] [role=slider]'), (control) => control.getAttribute('aria-label'));
    expect(names()).toEqual(['variant', 'current', 'orientation', 'size', 'color', 'connectorStyle', 'icons', 'text']);
    // current: a slider of 1–4 with its value; step 2 is active
    const current = page.getByRole('slider', { name: 'current' });
    expect([current.getAttribute('aria-valuemin'), current.getAttribute('aria-valuemax'), current.getAttribute('aria-valuenow')]).toEqual(['1', '4', '2']);
    expect(stage().querySelector('[aria-current="step"]')?.textContent).toContain('Company details');
    await interact(() => { fireEvent.keyDown(current, { key: 'ArrowRight' }); });
    expect(stage().querySelector('[aria-current="step"]')?.textContent).toContain('Invite your team');
    // orientation, size and the connectors reach the steps
    await interact(() => fireEvent.click(group('orientation').getByRole('radio', { name: 'vertical' })));
    expect(list().getAttribute('data-orientation')).toBe('vertical');
    await interact(() => fireEvent.click(group('size').getByRole('radio', { name: 'lg' })));
    expect(stage().querySelector('nav')?.getAttribute('data-size')).toBe('lg');
    await interact(() => fireEvent.click(group('connectorStyle').getByRole('radio', { name: 'dashed' })));
    expect(list().getAttribute('data-connector')).toBe('dashed');
    // At the last step every connector is completed and solid: the setting is not offered
    await interact(() => { fireEvent.keyDown(current, { key: 'ArrowRight' }); });
    expect(page.queryByRole('radiogroup', { name: 'connectorStyle' })).toBeNull();
    expect(list().getAttribute('data-connector')).toBe('solid');
    await interact(() => { fireEvent.keyDown(current, { key: 'ArrowLeft' }); });
    expect(list().getAttribute('data-connector')).toBe('dashed');
    // Text: the title and description, the title alone, or the indicators alone with the titles for screen readers
    const titles = () => Array.from(stage().querySelectorAll('li'), (step) => step.querySelector('[class*="StepTitle"]'));
    expect(stage().textContent).toContain('A few details about your company');
    await interact(() => fireEvent.click(group('text').getByRole('radio', { name: 'title' })));
    expect(stage().textContent).toContain('Company details');
    expect(stage().textContent).not.toContain('A few details about your company');
    await interact(() => fireEvent.click(group('text').getByRole('radio', { name: 'none' })));
    expect(titles().map((title) => title?.hasAttribute('data-visually-hidden'))).toEqual([true, true, true, true]);
    expect(titles().map((title) => title?.textContent)).toEqual(progressSteps.map((step) => step.title));
    // Icons replace the numbers of the steps ahead
    const indicator = () => stage().querySelectorAll('li')[3].querySelector('[class*="StepIndicator"]')!;
    expect(indicator().textContent).toBe('4');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'icons' })));
    expect(indicator().textContent).toBe('');
    expect(indicator().querySelector('svg')).toBeTruthy();
    // The minimal bar: its segments, with its own settings only; it draws sm as md
    await interact(() => fireEvent.click(group('variant').getByRole('radio', { name: 'minimal' })));
    expect(names()).toEqual(['variant', 'current', 'size', 'color']);
    expect(options('size')).toEqual(['md', 'lg']);
    const bar = stage().querySelector('[role="progressbar"]');
    expect(bar?.getAttribute('aria-valuemax')).toBe('4');
    expect(bar?.getAttribute('aria-valuenow')).toBe('3');
    expect(bar?.getAttribute('data-size')).toBe('lg');
    await interact(() => fireEvent.click(group('color').getByRole('radio', { name: 'success' })));
    expect(stage().querySelector('[role="progressbar"]')?.getAttribute('data-color')).toBe('success');
  });

  test('progress steps: on a phone the steps stand vertically and orientation is not offered', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const view = render(framework === 'React' ? <ProgressStepsOverviewDemo /> : <VueDemo {...progressOverview} phone state={{ steps: progressSteps }} />);
    await interact(() => {});
    const page = within(view.container);
    const row = page.queryByRole('radiogroup', { name: 'orientation' });
    expect(!!row && !row.closest('[data-demo-desktop-only]')).toBe(false);
    expect(view.container.querySelector('[data-demo-stage] ol')?.getAttribute('data-orientation')).toBe('vertical');
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

  test('segmented control: icons and badges are settings of the Overview, each shown where it acts (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <TabsOverviewDemo /> : <VueDemo {...tabs} state={{ tab: 'day' }} />);
    await interact(() => {});
    const page = within(view.container);
    // Day is the first tab; with a badge its accessible name takes the count too
    const day = () => within(page.getByRole('radiogroup', { name: 'Calendar view' })).getAllByRole('radio')[0];
    const iconOption = (name: string) => within(page.getByRole('radiogroup', { name: 'icon' })).queryByRole('radio', { name });
    const choose = (group: string, name: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: group })).getByRole('radio', { name })));
    expect(day().querySelector('svg')).toBeNull();
    // start: an icon before the label; only: the icon alone, the label its accessible name
    await choose('icon', 'start');
    expect(day().querySelector('svg')).not.toBeNull();
    expect(day().textContent).toBe('Day');
    // badge: a count after the label, and badgePill only with a badge
    expect(page.queryByRole('switch', { name: 'badgePill' })).toBeNull();
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'badge' })));
    expect(day().textContent).toBe('Day3');
    expect(page.getByRole('switch', { name: 'badgePill' })).toBeTruthy();
    // A count names what it counts: icon-only tabs carry none (owner 11.11: «зачем это вообще?»)
    await choose('icon', 'only');
    expect(day().querySelector('svg')).not.toBeNull();
    expect(day().textContent).toBe('');
    expect(page.queryByRole('switch', { name: 'badge' })).toBeNull();
    expect(page.queryByRole('switch', { name: 'badgePill' })).toBeNull();
    // Vertical tabs are a list whose rows have titles: no icon only there, and one chosen shows as none
    await choose('orientation', 'vertical');
    expect(iconOption('only')).toBeNull();
    expect(iconOption('none')?.getAttribute('aria-checked')).toBe('true');
    // A vertical tab draws the checkmark of a phone list row, its one symbol without an icon
    expect(day().querySelectorAll('svg')).toHaveLength(1);
    // With its label back the tab takes the badge chosen before
    expect(day().textContent).toBe('Day3');
    expect(page.getByRole('switch', { name: 'badge' })).toBeTruthy();
    await choose('orientation', 'horizontal');
    expect(iconOption('only')?.getAttribute('aria-checked')).toBe('true');
    // pill acts on the segmented variant, flush on underline
    expect(page.getByRole('switch', { name: 'pill' })).toBeTruthy();
    expect(page.queryByRole('switch', { name: 'flush' })).toBeNull();
    await interact(() => fireEvent.click(page.getByRole('radio', { name: 'underline' })));
    expect(page.queryByRole('switch', { name: 'pill' })).toBeNull();
    expect(page.getByRole('switch', { name: 'flush' })).toBeTruthy();
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
