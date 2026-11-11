import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { indentCode } from '../../components/docs/demoCode.mjs';
import { AccordionOverviewDemo } from '../../components/docs/AccordionDemos';
import { AlertOverviewDemo } from '../../components/docs/AlertDemos';
import { AvatarOverviewDemo } from '../../components/docs/AvatarIconDemo';
import { IndicatorOverviewDemo } from '../../components/docs/IndicatorDemos';
import { CheckboxOverviewDemo } from '../../components/docs/CheckboxDemos';
import { TabsOverviewDemo } from '../../components/docs/TabsDemos';
import { TableVariantDemo } from '../../components/docs/TableDemos';
import { TextareaOverviewDemo } from '../../components/docs/TextareaDemos';
import { TextLinkOverviewDemo } from '../../components/docs/TextLinkDemos';
import { EmptyMessageOverviewDemo } from '../../components/docs/EmptyMessageDemos';
import { DateInputOverviewDemo } from '../../components/docs/DateInputDemos';
import { SelectControlOverviewDemo } from '../../components/docs/SelectControlDemos';
import { SelectOverviewDemo } from '../../components/docs/SelectDemos';
import { ProgressStepsOverviewDemo } from '../../components/docs/ProgressStepsDemos';
import { RadioGroupOverviewDemo } from '../../components/docs/RadioGroupDemos';
import { SortableOverviewDemo } from '../../components/docs/SortableDemos';
import { BadgeOverviewDemo } from '../../components/docs/BadgeDemos';
import { SkeletonOverviewDemo } from '../../components/docs/SkeletonDemos';
import { PageOverviewDemo } from '../../components/docs/PageDemos';
import { SliderOverviewDemo } from '../../components/docs/SliderDemos';
import { TipOverviewDemo } from '../../components/docs/TipDemos';
import { ToastDemosHost, ToastOverviewDemo } from '../../components/docs/ToastDemos';
import { VueToastDemo, VueToastDemosHost } from '../../components/docs/vue/VueToastDemos';
import { TOAST_LONG_DESCRIPTION, TOAST_MESSAGES } from '../../components/docs/toastMessages';
import { compact as reactCompact, toast as reactToast } from '@plexui/ui/components/Toast';
import { compact as vueCompact, toast as vueToast } from '@plexui/vue/components/Toast';
import { VuePhoneRowsDemo } from '../../components/docs/vue/VuePhoneRowsDemo';
import { VueSelectDemo } from '../../components/docs/vue/VueSelectDemos';
import { phoneRows, sliderCellClassName, sliderCellStackedClassName, sliderCellValueBelowClassName, sliderCellValueClassName, sliderCellValueDisabledClassName } from '../../components/docs/phoneRowsTemplate';
import { VueDemo, type VueDemoControl, type VueDemoLoop, type VueDemoOption, type VueDemoWhen } from '../../components/docs/vue/VueDemo';
import { VueDataTableDemo } from '../../components/docs/vue/VueDataTableDemos';
import { VueAvatarDemo } from '../../components/docs/vue/VueAvatarDemos';
import { VueDateInputDemo } from '../../components/docs/vue/VueDateInputDemos';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));
vi.mock('@plexui/ui/components/Accordion', async () => import('../../packages/ui/src/components/Accordion'));
vi.mock('@plexui/vue/components/Accordion', async () => import('../../packages/vue/src/components/Accordion'));
vi.mock('@plexui/ui/components/Avatar', async () => import('../../packages/ui/src/components/Avatar'));
vi.mock('@plexui/vue/components/Avatar', async () => import('../../packages/vue/src/components/Avatar'));
vi.mock('@plexui/ui/components/Indicator', async () => import('../../packages/ui/src/components/Indicator'));
vi.mock('@plexui/vue/components/Indicator', async () => import('../../packages/vue/src/components/Indicator'));
vi.mock('@plexui/ui/components/Alert', async () => import('../../packages/ui/src/components/Alert'));
vi.mock('@plexui/vue/components/Alert', async () => import('../../packages/vue/src/components/Alert'));
vi.mock('@plexui/ui/components/TextLink', async () => import('../../packages/ui/src/components/TextLink'));
vi.mock('@plexui/vue/components/TextLink', async () => import('../../packages/vue/src/components/TextLink'));
vi.mock('@plexui/ui/components/EmptyMessage', async () => import('../../packages/ui/src/components/EmptyMessage'));
vi.mock('@plexui/vue/components/EmptyMessage', async () => import('../../packages/vue/src/components/EmptyMessage'));
vi.mock('@plexui/ui/components/DateInput', async () => import('../../packages/ui/src/components/DateInput'));
vi.mock('@plexui/vue/components/DateInput', async () => import('../../packages/vue/src/components/DateInput'));
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
    const when = 'when' in control && control.when && typeof control.when === 'object' ? { when: control.when as VueDemoWhen } : {};
    // A control's phone settings: hidden there (`desktopOnly`, giving its `phoneDefault`), or other options
    const phoneSettings = {
      ...('desktopOnly' in control && (control.desktopOnly === true || (!!control.desktopOnly && typeof control.desktopOnly === 'object'))
        ? { desktopOnly: control.desktopOnly as true | Record<string, unknown> } : {}),
      ...('phoneOnly' in control && (control.phoneOnly === true || (!!control.phoneOnly && typeof control.phoneOnly === 'object'))
        ? { phoneOnly: control.phoneOnly as true | Record<string, unknown> } : {}),
      ...('phoneDefault' in control && (typeof control.phoneDefault === 'string' || typeof control.phoneDefault === 'boolean') ? { phoneDefault: control.phoneDefault } : {}),
    };
    if (control.type === 'boolean' && typeof control.default === 'boolean') return { name: control.name, type: 'boolean', default: control.default, ...when, ...phoneSettings };
    if (control.type === 'range' && typeof control.default === 'number' && 'min' in control && typeof control.min === 'number' && 'max' in control && typeof control.max === 'number' && 'step' in control && typeof control.step === 'number') {
      const phoneDefault = 'phoneDefault' in control && (control.phoneDefault === null || typeof control.phoneDefault === 'number') ? { phoneDefault: control.phoneDefault } : {};
      return { name: control.name, type: 'range', default: control.default, min: control.min, max: control.max, step: control.step, ...when, ...phoneSettings, ...phoneDefault };
    }
    // An option is its value, or a value under a label offered only while its `when` holds (icon only, horizontal)
    const isOption = (option: unknown): option is VueDemoOption => typeof option === 'string'
      || (!!option && typeof option === 'object' && 'value' in option && typeof option.value === 'string' && 'label' in option && typeof option.label === 'string');
    if (control.type !== 'select' || typeof control.default !== 'string' || !('options' in control) || !Array.isArray(control.options) || !control.options.every(isOption)) throw new Error('Invalid select control');
    const phoneOptions = 'phoneOptions' in control && Array.isArray(control.phoneOptions) && control.phoneOptions.every(isOption) ? { phoneOptions: control.phoneOptions } : {};
    const menu = 'menu' in control && control.menu === true ? { menu: true } : {};
    return { name: control.name, type: 'select', default: control.default, options: control.options, ...when, ...phoneSettings, ...phoneOptions, ...menu };
  });
  return { template, controls };
}
const checkbox = example('checkbox', 'overview');
const avatar = example('avatar', 'overview');
const alert = example('alert', 'overview');
const textLink = example('text-link', 'overview');
const emptyMessage = example('empty-message', 'overview');
/** The Indicators Overview as its page mounts it, with the loop that restarts its simulated ring */
const indicators = (() => {
  const mdx = readFileSync('content/vue/components/indicators.mdx', 'utf8');
  const marker = 'export const overviewLoop = ';
  const rest = mdx.slice(mdx.indexOf(marker) + marker.length);
  const loop = new Function(`return ${rest.slice(0, rest.search(/\nexport const |\n<UsageBlock>/)).trim()}`)() as VueDemoLoop;
  return { ...example('indicators', 'overview'), loop };
})();
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
/** The Date Input Overview as its page mounts it, with its phone row and desktop-only controls */
const dateInputOverview = (() => {
  const mdx = readFileSync('content/vue/components/date-input.mdx', 'utf8');
  const marker = 'export const overviewPhone = ';
  const rest = mdx.slice(mdx.indexOf(marker) + marker.length);
  const phone = new Function(`return ${rest.slice(0, rest.search(/\nexport const /)).trim()}`)() as string;
  const tag = mdx.split('\n').find((line) => line.includes('<VueDateInputDemo') && line.includes('template={overview}'));
  if (!tag) throw new Error('Missing the Date Input Overview');
  const desktopControlNames = JSON.parse(/desktopControlNames=\{(\[[^\]]*\])\}/.exec(tag)![1]) as string[];
  return { ...example('date-input', 'overview'), phoneTemplate: phoneRows(phone), desktopControlNames, state: { date: null } };
})();
/** The Badge Overview as its page mounts it, with its labels */
/** A plain value a Vue page exports (a demo's state) */
function pageValue(page: string, key: string): unknown {
  const mdx = readFileSync(`content/vue/components/${page}.mdx`, 'utf8');
  const rest = mdx.slice(mdx.indexOf(`export const ${key} = `) + `export const ${key} = `.length);
  return new Function(`return ${rest.slice(0, rest.search(/\nexport const |\n\{\/\*|\n<UsageBlock>/)).trim()}`)();
}
const badgeOverview = { ...example('badge', 'overview'), state: pageValue('badge', 'overviewState') as Record<string, unknown> };
/** The Sortable Overview as its page mounts it, with the page's rows */
const sortableOverview = (() => {
  const mdx = readFileSync('content/vue/components/sortable.mdx', 'utf8');
  const marker = 'export const sections = ';
  const rest = mdx.slice(mdx.indexOf(marker) + marker.length);
  const sections = new Function(`return ${rest.slice(0, rest.search(/\nexport const /)).trim()}`)() as unknown[];
  return { ...example('sortable', 'overview'), state: { rows: sections } };
})();
/** The Page Overview as its page mounts it: its frame and rows, and its controls as written (labels, bottom placement) */
const pageOverview = (() => {
  const mdx = readFileSync('content/vue/components/page.mdx', 'utf8');
  const read = (key: string, bindings: Record<string, unknown> = {}): unknown => {
    const rest = mdx.slice(mdx.indexOf(`export const ${key} = `) + `export const ${key} = `.length);
    return new Function(...Object.keys(bindings), `return ${rest.slice(0, rest.search(/\nexport const |\n\{\/\*|\n<UsageBlock>/)).trim()}`)(...Object.values(bindings));
  };
  const styles = { Row: 'Row', Value: 'Value', Frame: 'Frame' };
  const template = read('overview', { frame: read('frame', { pageStyles: styles }), list: read('list', { toolbarStyles: styles }) }) as string;
  return { template, controls: read('overviewControls') as VueDemoControl[], state: { rows: read('rows') } };
})();
/** The Slider Overview as its page mounts it: its phone cell, its state (a value for each number of thumbs, the
 * scale's marks) and its controls */
const sliderOverview = (() => {
  const mdx = readFileSync('content/vue/components/slider.mdx', 'utf8');
  const read = (key: string, bindings: Record<string, unknown> = {}): unknown => {
    const rest = mdx.slice(mdx.indexOf(`export const ${key} = `) + `export const ${key} = `.length);
    return new Function(...Object.keys(bindings), `return ${rest.slice(0, rest.search(/\nexport const |\n<UsageBlock>/)).trim()}`)(...Object.values(bindings));
  };
  const cells = { sliderCellClassName, sliderCellStackedClassName, sliderCellValueBelowClassName, sliderCellValueClassName, sliderCellValueDisabledClassName };
  return {
    template: read('overview') as string,
    phoneTemplate: phoneRows(read('overviewPhone', cells) as string),
    controls: read('overviewControls') as VueDemoControl[],
    state: read('overviewState') as Record<string, unknown>,
  };
})();
/** The Tip Overview as its page mounts it: one template for both views (a phone sets it in grouped rows) */
const tipOverview = (() => {
  const mdx = readFileSync('content/vue/components/tip.mdx', 'utf8');
  const read = (key: string): unknown => {
    const rest = mdx.slice(mdx.indexOf(`export const ${key} = `) + `export const ${key} = `.length);
    return new Function(`return ${rest.slice(0, rest.search(/\nexport const |\n<UsageBlock>/)).trim()}`)();
  };
  const template = read('overview') as string;
  return { template, phoneTemplate: phoneRows(template), stageClassName: read('stage') as string, phoneStageClassName: 'w-full', controls: read('overviewControls') as VueDemoControl[], state: { shown: true } };
})();
/** A viewport a test can narrow to a phone and widen again, telling the demos' media queries */
function viewport() {
  let wide = true;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return wide ? query.includes('min-width') : !query.includes('min-width'); },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
    onchange: null,
  }));
  return (next: 'desktop' | 'phone') => interact(() => { wide = next === 'desktop'; listeners.forEach((listener) => listener()); });
}
/** Where a demo control shows: on both, a desktop or a phone only, or neither (its row's flags) */
const pageControlPlace = (control: HTMLElement | null) => {
  const row = control?.closest<HTMLElement>('[data-demo-controls] > *');
  const desktop = row?.hasAttribute('data-demo-desktop-only');
  const phone = row?.hasAttribute('data-demo-phone-only');
  return desktop && phone ? 'neither' : desktop ? 'desktop' : phone ? 'phone' : 'both';
};
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
  test('avatar: one Overview carries every setting, each where it acts (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <AvatarOverviewDemo /> : <VueAvatarDemo {...avatar} stageClassName="flex" />);
    await interact(() => {});
    const page = within(view.container);
    const shown = () => view.container.querySelector<HTMLElement>('[data-demo-stage] [data-color]')!;
    const group = (name: string) => page.queryByRole('radiogroup', { name });
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(group(name)!).getByRole('radio', { name: option, exact: true })));
    // An initial of the name; the count is offered only for an overflow avatar
    expect(shown().textContent).toBe('T');
    expect(page.queryByRole('slider', { name: 'overflowCount' })).toBeNull();
    await choose('color', 'danger');
    await choose('variant', 'solid');
    expect([shown().dataset.color, shown().dataset.variant]).toEqual(['danger', 'solid']);
    await choose('type', 'overflow');
    expect(page.getByRole('slider', { name: 'overflowCount' })).toBeTruthy();
    expect(shown().textContent).toBe('+9');
    // A loaded photo covers the color: color and variant are not offered, and the avatar gets their defaults
    await choose('type', 'image');
    expect(group('color')).toBeNull();
    expect(group('variant')).toBeNull();
    expect([shown().dataset.color, shown().dataset.variant]).toEqual(['secondary', 'soft']);
    expect(shown().querySelector('img')?.getAttribute('src')).toContain('gravatar.com');
    // They keep their choice for the next type
    await choose('type', 'icon');
    expect(within(group('color')!).getByRole('radio', { name: 'danger' }).getAttribute('aria-checked')).toBe('true');
    expect([shown().dataset.color, shown().dataset.variant]).toEqual(['danger', 'solid']);
    expect(shown().querySelector('svg')).not.toBeNull();
    await choose('roundness', 'lg');
    expect(shown().classList.contains('rounded-lg')).toBe(true);
    expect(shown().classList.contains('rounded-full')).toBe(false);
    // onClick makes the avatar a button named by its name
    expect(page.queryByRole('button', { name: 'Tech support' })).toBeNull();
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'onClick', exact: true })));
    expect(page.getByRole('button', { name: 'Tech support' })).toBe(shown());
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'onClick', exact: true })));
    expect(shown().tagName).toBe('SPAN');
    // size sets the width and height; the count follows its slider, and so does its name as a button
    const size = page.getByRole('slider', { name: 'size' });
    expect([size.getAttribute('aria-valuemin'), size.getAttribute('aria-valuemax')]).toEqual(['14', '80']);
    await interact(() => { fireEvent.keyDown(size, { key: 'ArrowRight' }); });
    expect(shown().style.getPropertyValue('--avatar-size')).toBe('50px');
    await choose('type', 'overflow');
    await interact(() => { fireEvent.keyDown(page.getByRole('slider', { name: 'overflowCount' }), { key: 'ArrowRight' }); });
    expect(shown().textContent).toBe('+10');
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'onClick', exact: true })));
    expect(page.getByRole('button', { name: '10 more' })).toBe(shown());
  });

  test('indicators: one Overview of the three indicators carries every setting, each for the ones it acts on (owner 11.11)', async () => {
    vi.useFakeTimers();
    try {
      const view = render(framework === 'React' ? <IndicatorOverviewDemo /> : <VueDemo {...indicators} stageClassName="flex" />);
      await interact(() => {});
      const page = within(view.container);
      const stage = () => view.container.querySelector<HTMLElement>('[data-demo-stage]')!;
      const offered = () => [...view.container.querySelectorAll('[data-demo-controls] [role="radiogroup"], [data-demo-controls] [role="slider"], [data-demo-controls] [role="switch"]')]
        .map((control) => control.getAttribute('aria-label') ?? control.id);
      const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
      const wait = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); await flushVue(); });
      // The spinner: its size, stroke, text color and turn; it does not restart
      expect(offered()).toEqual(['indicator', 'size', 'strokeWidth', 'color', 'duration']);
      const spinner = stage().querySelector<HTMLElement>('[class*="LoadingIndicator"]')!;
      expect(spinner.style.getPropertyValue('--indicator-size')).toBe('20px');
      expect(spinner.style.getPropertyValue('--indicator-stroke')).toBe('2px');
      // The spinner's stroke is a desktop setting: the phone spinner takes the kit's spokes for its size
      expect(page.getByRole('slider', { name: 'strokeWidth' }).closest('[data-demo-desktop-only]')).not.toBeNull();
      expect(spinner.parentElement?.style.getPropertyValue('--indicator-rotate-duration')).toBe('800ms');
      await choose('color', 'danger');
      expect(stage().querySelector('[class*="LoadingIndicator"]')?.classList.contains('text-danger')).toBe(true);
      const turning = stage().querySelector('[class*="LoadingIndicator"]');
      await wait(4600);
      expect(stage().querySelector('[class*="LoadingIndicator"]')).toBe(turning);
      // The ring: progress, simulated or fixed, and its track colors; the simulated one starts over
      await choose('indicator', 'CircularProgress');
      expect(offered()).toEqual(['indicator', 'size', 'strokeWidth', 'simulated', 'maxDuration', 'trackColor', 'trackActiveColor']);
      expect(page.getByRole('slider', { name: 'strokeWidth' }).closest('[data-demo-desktop-only]')).toBeNull();
      const simulated = stage().querySelector<HTMLElement>('[class*="Container"]');
      expect(simulated?.style.getPropertyValue('--circular-progress-stroke')).toBe('2px');
      // It simulates progress: the ring fills as time goes on, until the loop starts it over
      const offset = () => Number(stage().querySelectorAll('svg')[1]?.style.strokeDashoffset);
      await wait(1000);
      const early = offset();
      await wait(1000);
      expect(early).toBeLessThan(50);
      expect(offset()).toBeLessThan(early);
      await wait(2600);
      expect(stage().querySelector('[class*="Container"]')).not.toBe(simulated);
      await interact(() => fireEvent.click(page.getByRole('switch', { name: 'simulated', exact: true })));
      expect(offered()).toEqual(['indicator', 'size', 'strokeWidth', 'simulated', 'progress', 'trackColor', 'trackActiveColor']);
      expect(stage().querySelectorAll('svg')[1]?.style.strokeDashoffset).toBe('37.5');
      await choose('trackActiveColor', '--gray-1000');
      const fixed = stage().querySelector<HTMLElement>('[class*="Container"]')!;
      expect(fixed.style.getPropertyValue('--circular-progress-track-active-color')).toBe('var(--gray-1000)');
      expect(fixed.style.getPropertyValue('--circular-progress-track-color')).toBe('');
      await wait(4600);
      expect(stage().querySelector('[class*="Container"]')).toBe(fixed);
      // Simulated again, the ring starts over, as it would on its page
      await interact(() => fireEvent.click(page.getByRole('switch', { name: 'simulated', exact: true })));
      await wait(200);
      expect(offset()).toBeGreaterThan(early);
      // The dots take the text color alone, and the color kept its choice
      await choose('indicator', 'LoadingDots');
      expect(offered()).toEqual(['indicator', 'color']);
      expect(stage().querySelector('[class*="LoadingDots"]')?.classList.contains('text-danger')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test('indicators: on a phone the spinner keeps the kit spokes, and its stroke is not offered; the ring keeps its stroke', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const view = render(framework === 'React' ? <IndicatorOverviewDemo /> : <VueDemo {...indicators} stageClassName="flex" />);
    await interact(() => {});
    const page = within(view.container);
    const stage = () => view.container.querySelector<HTMLElement>('[data-demo-stage]')!;
    expect(stage().querySelector<HTMLElement>('[class*="LoadingIndicator"]')?.style.getPropertyValue('--indicator-stroke')).toBe('');
    expect(page.getByRole('slider', { name: 'strokeWidth' }).closest('[data-demo-desktop-only]')).not.toBeNull();
    await interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: 'indicator' })).getByRole('radio', { name: 'CircularProgress', exact: true })));
    expect(page.getByRole('slider', { name: 'strokeWidth' }).closest('[data-demo-desktop-only]')).toBeNull();
    expect(stage().querySelector<HTMLElement>('[class*="Container"]')?.style.getPropertyValue('--circular-progress-stroke')).toBe('2px');
  });

  test('alert: one Overview carries every setting, each where it acts (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <AlertOverviewDemo /> : <VueDemo {...alert} stageClassName="flex" />);
    await interact(() => {});
    const page = within(view.container);
    const shown = () => view.container.querySelector<HTMLElement>('[data-demo-stage] [data-actions-placement]')!;
    const indicator = () => shown().querySelector(':scope > [class*="Indicator"]');
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const dismiss = () => page.queryAllByRole('button', { name: 'Dismiss' });
    expect(shown().textContent).toContain('Scheduled maintenance');
    expect(shown().textContent).toContain("We'll be offline");
    // Not dismissible until onDismiss is set, as the component
    expect(dismiss()).toHaveLength(0);
    // color, of seven options, is a menu; variant a row of segments
    expect(page.queryByRole('radiogroup', { name: 'color' })).toBeNull();
    await interact(() => fireEvent.click(page.getByRole('button', { name: /^color/ })));
    const colors = await within(document.body).findByRole('listbox');
    await interact(() => fireEvent.click(within(colors).getByRole('option', { name: 'danger', exact: true })));
    await choose('variant', 'soft');
    expect([shown().dataset.color, shown().dataset.variant]).toEqual(['danger', 'soft']);
    // The indicator: the color's icon, another icon, or none
    const own = indicator()?.innerHTML;
    expect(own).toBeTruthy();
    await choose('indicator', 'custom');
    expect(indicator()?.querySelector('svg')).not.toBeNull();
    expect(indicator()?.innerHTML).not.toBe(own);
    await choose('indicator', 'none');
    expect(indicator()).toBeNull();
    // Where the actions stand and their size on a phone are offered only with actions, on a desktop and on a phone
    expect(page.queryByRole('radiogroup', { name: 'actionsPlacement' })).toBeNull();
    expect(page.queryByRole('radiogroup', { name: 'mobileActions' })).toBeNull();
    await toggle('actions');
    expect(page.getByRole('button', { name: 'Set reminder' })).toBeTruthy();
    expect(page.getByRole('radiogroup', { name: 'actionsPlacement' }).closest('[data-demo-desktop-only]')).not.toBeNull();
    expect(page.getByRole('radiogroup', { name: 'mobileActions' }).closest('[data-demo-phone-only]')).not.toBeNull();
    await choose('actionsPlacement', 'bottom');
    expect(shown().dataset.actionsPlacement).toBe('bottom');
    await choose('mobileActions', 'own');
    expect(shown().dataset.mobileActions).toBe('own');
    await toggle('onDismiss');
    expect(dismiss().length).toBeGreaterThan(0);
    // A solid alert has no buttons, which do not read on its color: actions and onDismiss go, and keep their choice
    await choose('variant', 'solid');
    for (const name of ['actions', 'onDismiss']) expect(page.queryByRole('switch', { name, exact: true })).toBeNull();
    expect(page.queryByRole('radiogroup', { name: 'actionsPlacement' })).toBeNull();
    expect(page.queryByRole('button', { name: 'Set reminder' })).toBeNull();
    expect(dismiss()).toHaveLength(0);
    expect(shown().dataset.actionsPlacement).toBe('end');
    await choose('variant', 'outline');
    expect(page.getByRole('button', { name: 'Set reminder' })).toBeTruthy();
    expect(dismiss().length).toBeGreaterThan(0);
    expect(shown().dataset.actionsPlacement).toBe('bottom');
    // An alert needs a title or a description: description is offered only with a title, and keeps its choice
    await toggle('description');
    expect(shown().textContent).not.toContain("We'll be offline");
    await toggle('title');
    expect(page.queryByRole('switch', { name: 'description', exact: true })).toBeNull();
    expect(shown().textContent).not.toContain('Scheduled maintenance');
    expect(shown().textContent).toContain("We'll be offline");
    await toggle('title');
    expect(page.getByRole('switch', { name: 'description', exact: true }).getAttribute('aria-checked')).toBe('false');
    expect(shown().textContent).not.toContain("We'll be offline");
    await toggle('banner');
    expect(shown().hasAttribute('data-banner')).toBe(true);
    await toggle('onDismiss');
    expect(dismiss()).toHaveLength(0);
    // Without actions, their settings go and the alert gets their defaults
    await toggle('actions');
    expect(page.queryByRole('button', { name: 'Set reminder' })).toBeNull();
    expect(page.queryByRole('radiogroup', { name: 'mobileActions' })).toBeNull();
    expect(shown().dataset.mobileActions).toBeUndefined();
    expect(shown().dataset.actionsPlacement).toBe('end');
  });

  test('text link: one Overview on a paragraph carries every setting (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <TextLinkOverviewDemo /> : <VueDemo {...textLink} stageClassName="flex" />);
    await interact(() => {});
    const page = within(view.container);
    const paragraph = () => view.container.querySelector<HTMLElement>('[data-demo-stage] p')!;
    const links = () => [...paragraph().querySelectorAll<HTMLAnchorElement>('a')];
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    expect(links().map((link) => link.textContent?.trim())).toEqual(['responses endpoint', 'official SDKs']);
    expect(paragraph().className).toBe('');
    // The paragraph takes the color class
    expect(within(page.getByRole('radiogroup', { name: 'colorClassName' })).getAllByRole('radio').map((option) => option.textContent)).toEqual(['default', 'secondary', 'tertiary']);
    await choose('colorClassName', 'secondary');
    expect(paragraph().className).toBe('text-secondary');
    // primary and underline: unset, the underline is on unless the link is primary
    const marks = () => links().map((link) => ({ primary: link.hasAttribute('data-primary'), underline: link.hasAttribute('data-underline') }));
    expect(marks()).toEqual([{ primary: false, underline: true }, { primary: false, underline: true }]);
    await toggle('primary');
    expect(marks()).toEqual([{ primary: true, underline: false }, { primary: true, underline: false }]);
    await choose('underline', 'on');
    expect(marks()).toEqual([{ primary: true, underline: true }, { primary: true, underline: true }]);
    await toggle('primary');
    await choose('underline', 'off');
    expect(marks()).toEqual([{ primary: false, underline: false }, { primary: false, underline: false }]);
    await choose('underline', 'auto');
    expect(marks()).toEqual([{ primary: false, underline: true }, { primary: false, underline: true }]);
    // external: the second link opens an external URL in a new tab, marked by the arrow
    expect(links()[1].getAttribute('target')).toBeNull();
    await toggle('external');
    expect(links()[1].getAttribute('href')).toBe('https://example.com');
    expect(links()[1].getAttribute('target')).toBe('_blank');
    expect(links()[1].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links()[1].querySelector('svg')).not.toBeNull();
    expect(links()[0].getAttribute('target')).toBeNull();
    // weight: a font-weight class on both links
    await choose('weight', 'semibold');
    expect(links().every((link) => link.classList.contains('font-semibold'))).toBe(true);
    await choose('weight', 'normal');
    expect(links().some((link) => /font-/.test(link.className))).toBe(false);
  });

  test('empty message: one Overview carries every setting, each where it acts (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <EmptyMessageOverviewDemo /> : <VueDemo {...emptyMessage} stageClassName="flex" />);
    await interact(() => {});
    const page = within(view.container);
    const root = () => view.container.querySelector<HTMLElement>('[data-demo-stage] [data-fill]')!;
    const part = (name: string) => root().querySelector<HTMLElement>(`:scope > [class*="${name}"]`);
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const offered = (name: string) => page.queryByRole('radiogroup', { name }) !== null;
    const buttons = () => [...root().querySelectorAll('button')].map((button) => button.textContent?.trim());
    expect(root().dataset.fill).toBe('static');
    expect(part('Title')?.textContent).toBe('No projects yet');
    expect(part('Description')?.textContent?.trim()).toBe('Create your first project to get started');
    expect(buttons()).toEqual(['New project']);
    expect(root().querySelector<HTMLElement>('button')?.dataset.size).toBe('xl');
    // The icon and the title take their own color (a warning icon over a plain title); the description keeps its own
    await choose('iconColor', 'warning');
    expect([part('IconBadge')?.dataset.color, part('Title')?.dataset.color]).toEqual(['warning', 'secondary']);
    await choose('titleColor', 'danger');
    expect(part('Title')?.dataset.color).toBe('danger');
    expect(part('Description')?.hasAttribute('data-color')).toBe(false);
    // The icon's own size acts in a message of the default size; a small message gives its icon the small badge
    await choose('iconSize', 'sm');
    expect(part('IconBadge')?.dataset.size).toBe('sm');
    await choose('fill', 'absolute');
    await choose('size', 'sm');
    await choose('align', 'start');
    expect([root().dataset.fill, root().dataset.size, root().dataset.align]).toEqual(['absolute', 'sm', 'start']);
    expect(root().parentElement?.style.position).toBe('relative');
    expect(offered('iconSize')).toBe(false);
    expect(part('IconBadge')?.dataset.size).toBe('md');
    expect(root().querySelector<HTMLElement>('button')?.dataset.size).toBe('md');
    await choose('size', 'md');
    expect(part('IconBadge')?.dataset.size).toBe('sm');
    // actions: buttons, two buttons, a text link or none
    await choose('actions', 'two');
    expect(buttons()).toEqual(['New project', 'Browse templates']);
    await choose('actions', 'link');
    expect(buttons()).toEqual([]);
    expect(part('ActionRow')?.querySelector('a')?.textContent?.trim()).toBe('Learn more');
    expect(part('ActionRow')?.querySelector('a')?.getAttribute('href')).toBe('#');
    expect(part('ActionRow')?.classList.contains('text-sm')).toBe(true);
    await choose('actions', 'none');
    expect(part('ActionRow')).toBeNull();
    // A message needs a title or a description: description is offered only with a title, and keeps its choice;
    // each part's color is offered with its part and keeps its choice
    await toggle('description');
    expect(part('Description')).toBeNull();
    await toggle('title');
    expect(page.queryByRole('switch', { name: 'description', exact: true })).toBeNull();
    expect(offered('titleColor')).toBe(false);
    expect(offered('iconColor')).toBe(true);
    expect(part('Title')).toBeNull();
    expect(part('Description')).not.toBeNull();
    await toggle('icon');
    expect(part('IconBadge')).toBeNull();
    expect([offered('iconColor'), offered('iconSize')]).toEqual([false, false]);
    await toggle('title');
    await toggle('icon');
    expect(within(page.getByRole('radiogroup', { name: 'titleColor' })).getByRole('radio', { name: 'danger', exact: true }).getAttribute('aria-checked')).toBe('true');
    expect([part('IconBadge')?.dataset.color, part('IconBadge')?.dataset.size, part('Title')?.dataset.color]).toEqual(['warning', 'sm', 'danger']);
    expect(page.getByRole('switch', { name: 'description', exact: true }).getAttribute('aria-checked')).toBe('false');
    expect(part('Description')).toBeNull();
  });

  test('date input: one Overview carries every setting: format, time, limits; the time settings come with a time (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <DateInputOverviewDemo /> : <VueDateInputDemo {...dateInputOverview} stageClassName="py-10" />);
    await interact(() => {});
    const page = within(view.container);
    const input = () => view.container.querySelector<HTMLInputElement>('[data-demo-stage] input')!;
    const frame = () => input().closest<HTMLElement>('[data-variant]')!;
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const offered = (name: string) => page.queryByRole('radiogroup', { name }) !== null || page.queryByRole('slider', { name }) !== null;
    const width = () => [...input().closest('[data-demo-stage]')!.querySelectorAll<HTMLElement>('div')].find((div) => /w-\[\d+px\]/.test(div.className))?.className;
    expect(input().placeholder).toBe('DD.MM.YYYY');
    expect(width()).toBe('w-[200px]');
    expect([offered('dateTimeSeparator'), offered('timeStep')]).toEqual([false, false]);
    // limits: a date typed past one becomes that limit, 30 days before today
    const today = DateTime.local();
    await toggle('limits');
    await interact(() => { input().focus(); fireEvent.input(input(), { target: { value: '01.01.2000' } }); });
    expect(input().value).toBe(today.minus({ days: 30 }).toFormat('dd.MM.yyyy'));
    // clearable: a clear button empties the field
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Clear input' })));
    expect(input().value).toBe('');
    await toggle('limits');
    await interact(() => { input().focus(); fireEvent.input(input(), { target: { value: '01.01.2000' } }); });
    expect(input().value).toBe('01.01.2000');
    await toggle('clearable');
    expect(page.queryByRole('button', { name: 'Clear input' })).toBeNull();
    await toggle('clearable');
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Clear input' })));
    // mode orders the parts, separator stands between them
    await choose('mode', 'mm/dd/yyyy');
    await choose('separator', '/');
    expect(input().placeholder).toBe('MM/DD/YYYY');
    await choose('mode', 'yyyy/mm/dd');
    await choose('separator', '-');
    expect(input().placeholder).toBe('YYYY-MM-DD');
    // A time comes with its separator and its arrow-key step, and a wider field
    await choose('timeMode', 'HH:MM');
    expect(input().placeholder).toBe('YYYY-MM-DD, HH:MM');
    expect(width()).toBe('w-[260px]');
    expect([offered('dateTimeSeparator'), offered('timeStep')]).toEqual([true, true]);
    await choose('dateTimeSeparator', 'space');
    expect(input().placeholder).toBe('YYYY-MM-DD HH:MM');
    await choose('timeMode', 'HH:MM:SS');
    expect(input().placeholder).toBe('YYYY-MM-DD HH:MM:SS');
    expect(width()).toBe('w-[300px]');
    await choose('timeMode', 'HH:MM AA');
    expect(input().placeholder).toMatch(/^YYYY-MM-DD HH:MM\s+AA$/);
    expect(width()).toBe('w-[300px]');
    // Without a time, its settings go and keep their choice
    await choose('timeMode', 'none');
    expect(input().placeholder).toBe('YYYY-MM-DD');
    expect([offered('dateTimeSeparator'), offered('timeStep')]).toEqual([false, false]);
    await choose('timeMode', 'HH:MM');
    expect(input().placeholder).toBe('YYYY-MM-DD HH:MM');
    // The frame's settings
    await choose('variant', 'soft');
    await choose('size', 'lg');
    await toggle('pill');
    await toggle('invalid');
    expect([frame().dataset.variant, frame().dataset.size, frame().hasAttribute('data-pill'), frame().hasAttribute('data-invalid')]).toEqual(['soft', 'lg', true, true]);
    await toggle('disabled');
    expect(input().disabled).toBe(true);
    expect(page.getByRole('switch', { name: 'limits', exact: true }).getAttribute('aria-checked')).toBe('false');
  });

  test('sortable: one Overview of rows; handles shows the grips and disabled turns dragging off (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <SortableOverviewDemo /> : <VueDemo {...sortableOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const list = () => view.container.querySelector<HTMLElement>('[data-sortable]')!;
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    expect(list().querySelectorAll(':scope > [data-row]')).toHaveLength(4);
    expect([list().dataset.handles, list().hasAttribute('data-disabled')]).toEqual(['false', false]);
    expect(page.getByRole('button', { name: 'Reorder Orders' })).toBeTruthy();
    await toggle('handles');
    expect(list().dataset.handles).toBe('true');
    await toggle('disabled');
    expect(list().hasAttribute('data-disabled')).toBe(true);
    // The rows keep their switches through the settings
    expect(list().querySelectorAll('[role="switch"]')).toHaveLength(4);
  });

  test('skeleton: the Overview carries circle, the one setting (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <SkeletonOverviewDemo /> : <VueDemo {...example('skeleton', 'overview')} />);
    await interact(() => {});
    const page = within(view.container);
    const avatar = () => view.container.querySelector<HTMLElement>('[data-demo-stage] .size-12')!;
    expect(avatar().hasAttribute('data-circle')).toBe(true);
    await interact(() => fireEvent.click(page.getByRole('switch', { name: 'circle', exact: true })));
    expect(avatar().hasAttribute('data-circle')).toBe(false);
  });

  test('badge: one Overview carries color, variant, size, pill, what leads the text and the cross (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <BadgeOverviewDemo /> : <VueDemo {...badgeOverview} stageClassName="flex justify-center py-10" />);
    await interact(() => {});
    const page = within(view.container);
    // The badge, not the Show again button that takes its place
    const badge = () => view.container.querySelector<HTMLElement>('[data-demo-stage] [data-color]:not(button)');
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    expect([badge()?.dataset.color, badge()?.dataset.variant, badge()?.dataset.size, badge()?.textContent?.trim()]).toEqual(['info', 'soft', 'md', 'New']);
    // color, of seven options, is a menu
    await interact(() => fireEvent.click(page.getByRole('button', { name: /^color/ })));
    const colors = await within(document.body).findByRole('listbox');
    await interact(() => fireEvent.click(within(colors).getByRole('option', { name: 'danger', exact: true })));
    await choose('variant', 'outline');
    await choose('size', 'xl');
    await toggle('pill');
    expect([badge()?.dataset.color, badge()?.dataset.variant, badge()?.dataset.size, badge()?.hasAttribute('data-pill')]).toEqual(['danger', 'outline', 'xl', true]);
    // An icon or a loading indicator leads the text
    await choose('leading', 'icon');
    expect([badge()?.querySelector('svg') !== null, badge()?.textContent?.trim()]).toEqual([true, 'Beta']);
    await choose('leading', 'loading');
    expect([badge()?.classList.contains('gap-1.5'), badge()?.textContent?.trim()]).toEqual([true, 'In progress']);
    // The cross removes the badge; Show again brings it back
    expect(page.queryByRole('button', { name: 'Remove In progress' })).toBeNull();
    await toggle('onRemove');
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Remove In progress' })));
    expect(badge()).toBeNull();
    await interact(() => fireEvent.click(page.getByRole('button', { name: 'Show again' })));
    expect(badge()?.textContent?.trim()).toBe('In progress');
  });

  test('toast: one Overview carries every setting of a toast; persistent comes with a way to close it (owner 11.11)', async () => {
    // compact is a class to spread into the options: `className` in React, `class` in Vue
    const [toast, compactClass] = framework === 'React' ? [reactToast, reactCompact.className] : [vueToast, vueCompact.class];
    const view = render(framework === 'React'
      ? <><ToastOverviewDemo /><ToastDemosHost /></>
      : <><VueToastDemo {...example('toast', 'overview')} /><VueToastDemosHost /></>);
    await interact(() => {});
    const page = within(view.container);
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const offered = (name: string) => page.queryByRole('switch', { name, exact: true }) !== null;
    const show = async () => {
      await interact(() => fireEvent.click(page.getByRole('button', { name: 'Show toast' })));
      return waitFor(() => {
        const item = document.querySelector<HTMLElement>('[data-sonner-toast]');
        if (!item) throw new Error('No toast');
        return item;
      });
    };
    try {
      // The code declares the messages it shows
      const code = readFileSync(framework === 'React' ? 'content/components/toast.mdx' : 'content/vue/components/toast.mdx', 'utf8');
      for (const message of Object.values(TOAST_MESSAGES)) expect(code).toContain(`{ title: "${message.title}", description: "${message.description}", action: "${message.action}" }`);
      expect(code).toContain(`const longDescription = "${TOAST_LONG_DESCRIPTION}"`);
      // Persistent waits to be closed: it comes with an action or a close button
      expect(offered('persistent')).toBe(false);
      await toggle('closeButton');
      expect(offered('persistent')).toBe(true);
      await toggle('closeButton');
      expect(offered('persistent')).toBe(false);
      await choose('action', 'action');
      expect(offered('persistent')).toBe(true);
      await choose('action', 'action + cancel');
      expect(offered('persistent')).toBe(true);
      // Hidden, it keeps its choice, and the toast shown does not wait: an error that closes itself is no alert
      await toggle('persistent');
      await choose('action', 'none');
      expect(offered('persistent')).toBe(false);
      await choose('type', 'error');
      const passing = await show();
      expect([passing.querySelector('[data-action]'), passing.querySelector('[role="alert"]')]).toEqual([null, null]);
      await interact(() => { toast.dismiss(); });
      await waitFor(() => expect(document.querySelector('[data-sonner-toast]')).toBeNull());
      await choose('description', 'short');
      await choose('action', 'action + cancel');
      expect(page.getByRole('switch', { name: 'persistent', exact: true }).getAttribute('aria-checked')).toBe('true');
      await toggle('closeButton');
      await toggle('compact');
      const shown = await show();
      expect(shown.dataset.type).toBe('error');
      expect(shown.querySelector('[data-title]')?.textContent).toBe('Failed to assign owner');
      expect(shown.querySelector('[data-description]')?.textContent).toBe('The owner has left the workspace.');
      expect([shown.querySelector('[data-action]')?.textContent, shown.querySelector('[data-cancel]')?.textContent]).toEqual(['Retry', 'Cancel']);
      expect(shown.querySelector('[data-close-button]')).not.toBeNull();
      expect(shown.classList.contains(compactClass)).toBe(true);
      // An error that waits to be closed is an alert
      expect(shown.querySelector('[role="alert"]')).not.toBeNull();
    } finally {
      await interact(() => { toast.dismiss(); });
    }
  });

  test('date input on a phone: the value of a row; variant, size, pill and invalid stay on desktop', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: !media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const view = render(framework === 'React' ? <DateInputOverviewDemo /> : <VueDateInputDemo {...dateInputOverview} stageClassName="py-10" />);
    await interact(() => {});
    const page = within(view.container);
    const input = () => view.container.querySelector<HTMLInputElement>('input')!;
    expect(input().closest('[data-slot="field"]')?.hasAttribute('data-row')).toBe(true);
    expect(input().closest('[data-slot="field"]')?.textContent).toContain('Date');
    for (const name of ['variant', 'size', 'pill', 'invalid']) {
      const control = page.queryByRole('radiogroup', { name }) ?? page.queryByRole('switch', { name, exact: true });
      expect(!control || !!control.closest('[data-demo-desktop-only]')).toBe(true);
    }
    await interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name: 'timeMode' })).getByRole('radio', { name: 'HH:MM', exact: true })));
    expect(input().placeholder).toBe('DD.MM.YYYY, HH:MM');
  });

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

  test('page: one Overview carries every setting, each where it acts (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <PageOverviewDemo /> : <VueDemo {...pageOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const root = () => view.container.querySelector<HTMLElement>('[data-demo-stage] [data-surface]')!;
    const bars = () => [...view.container.querySelectorAll<HTMLElement>('[data-demo-stage] [data-background]')];
    const group = (name: string) => page.queryByRole('radiogroup', { name });
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(group(name)!).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const where = pageControlPlace;
    const text = (name: string) => page.queryByText(name) !== null;
    // The old Overview: a full page, a glass header with its line, a title and New order; no footer
    expect([root().dataset.width, root().dataset.surface]).toEqual(['full', 'plain']);
    expect(bars().map((bar) => bar.dataset.background)).toEqual(['glass']);
    expect(bars()[0].hasAttribute('data-divider')).toBe(true);
    expect([text('New order'), page.queryByRole('button', { name: 'Back' }) !== null, text('24 open'), text('Export orders')]).toEqual([true, false, false, false]);
    expect(group('background (bottom)')).toBeNull();
    // Width and fill act on desktop, the surface and the bars' backgrounds on a phone
    expect([where(group('width')), where(page.getByRole('switch', { name: 'fill', exact: true })), where(group('surface')), where(group('background (top)'))]).toEqual(['desktop', 'desktop', 'phone', 'phone']);
    await choose('width', 'column');
    await choose('surface', 'grouped');
    expect([root().dataset.width, root().dataset.surface]).toEqual(['column', 'grouped']);
    // On a phone only a glass or hard header draws the line
    const divider = () => page.getByRole('switch', { name: 'divider', exact: true });
    expect(where(divider())).toBe('both');
    await choose('background (top)', 'soft');
    expect(where(divider())).toBe('desktop');
    await choose('background (top)', 'hard');
    expect([bars()[0].dataset.background, where(divider())]).toEqual(['hard', 'both']);
    await toggle('divider');
    expect(bars()[0].hasAttribute('data-divider')).toBe(false);
    // The bar: a Back button, a subtitle, the actions
    await toggle('leading');
    await toggle('subtitle');
    await toggle('actions');
    expect([text('New order'), page.queryByRole('button', { name: 'Back' }) !== null, text('24 open'), text('Updated now')]).toEqual([false, true, true, true]);
    expect(view.container.querySelector('[data-fill]')).toBeNull();
    // A filled page does not scroll under its header: on desktop the divider goes, and the header takes its default
    await toggle('fill');
    expect(view.container.querySelector('[data-demo-stage] [data-fill]')).not.toBeNull();
    expect([where(divider()), bars()[0].hasAttribute('data-divider')]).toEqual(['phone', true]);
    await choose('background (top)', 'soft');
    expect(where(divider())).toBe('neither');
    await choose('background (top)', 'hard');
    // The footer, and its background with it
    await toggle('footer');
    expect([text('Export orders'), bars().map((bar) => bar.dataset.background)]).toEqual([true, ['hard', 'soft']]);
    expect(where(group('background (bottom)'))).toBe('phone');
    await choose('background (bottom)', 'solid');
    expect(bars().map((bar) => bar.dataset.background)).toEqual(['hard', 'solid']);
    await toggle('footer');
    expect([text('Export orders'), group('background (bottom)')]).toEqual([false, null]);
  });

  test('page on a phone: the desktop settings give their defaults; the divider goes under a soft or solid header', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: !media.includes('min-width'), media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    const view = render(framework === 'React' ? <PageOverviewDemo /> : <VueDemo {...pageOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const root = () => view.container.querySelector<HTMLElement>('[data-demo-stage] [data-surface]')!;
    const header = () => view.container.querySelector<HTMLElement>('[data-demo-stage] [data-background]')!;
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option, exact: true })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name, exact: true })));
    const divider = () => page.getByRole('switch', { name: 'divider', exact: true });
    // The hidden controls stay mounted (the preview hides them): a choice made there does not reach the phone
    await choose('width', 'column');
    await toggle('fill');
    expect([root().dataset.width, view.container.querySelector('[data-demo-stage] [data-fill]')]).toEqual(['full', null]);
    await choose('surface', 'grouped');
    expect(root().dataset.surface).toBe('grouped');
    // Under the glass header the divider is offered, filled page or not: a phone page scrolls as a whole
    expect(pageControlPlace(divider())).toBe('phone');
    await toggle('divider');
    expect(header().hasAttribute('data-divider')).toBe(false);
    await choose('background (top)', 'solid');
    expect([pageControlPlace(divider()), header().dataset.background, header().hasAttribute('data-divider')]).toEqual(['neither', 'solid', true]);
  });

  test('slider: one Overview carries every setting on one scale, each where it acts (owner 11.11)', async () => {
    const view = render(framework === 'React' ? <SliderOverviewDemo /> : <VuePhoneRowsDemo {...sliderOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const stage = () => view.container.querySelector<HTMLElement>('[data-demo-stage]')!;
    const root = () => stage().querySelector<HTMLElement>('[data-orientation]')!;
    const thumbs = () => within(stage()).queryAllByRole('slider');
    const values = () => thumbs().map((thumb) => thumb.getAttribute('aria-valuenow'));
    const text = () => stage().textContent!.replace(/\s+/g, ' ');
    const group = (name: string) => within(page.getByRole('radiogroup', { name }));
    const choose = (name: string, option: string) => interact(() => fireEvent.click(group(name).getByRole('radio', { name: option })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name })));
    const minSteps = () => page.queryByRole('slider', { name: 'minStepsBetweenThumbs' });
    const marks = () => Array.from(stage().querySelectorAll('[data-mark]'), (mark) => mark.textContent);
    for (const name of ['thumbs', 'unit', 'orientation']) expect(page.getByRole('radiogroup', { name })).toBeTruthy();
    for (const name of ['resetValue', 'marks', 'colors', 'tooltip', 'disabled']) expect(page.getByRole('switch', { name })).toBeTruthy();
    // One thumb at 50 of 0–100, its label and a reset button over the value and its %
    expect(values()).toEqual(['50']);
    expect(root().getAttribute('data-orientation')).toBe('horizontal');
    expect(within(stage()).getByText('Example field')).toBeTruthy();
    expect(within(stage()).getByRole('button', { name: 'Reset to default' })).toBeTruthy();
    expect(text()).toContain('%');
    expect(minSteps()).toBeNull();
    await toggle('resetValue');
    expect(within(stage()).queryByRole('button', { name: 'Reset to default' })).toBeNull();
    // Two thumbs: a range, kept minStepsBetweenThumbs apart, with no reset button (one value only)
    await choose('thumbs', 'two');
    expect(values()).toEqual(['25', '75']);
    expect(text()).toContain('25% – 75%');
    expect(page.queryByRole('switch', { name: 'resetValue' })).toBeNull();
    expect(minSteps()?.getAttribute('aria-valuenow')).toBe('5');
    const push = async (times: number) => {
      const thumb = thumbs()[0];
      await interact(() => thumb.focus());
      for (let i = 0; i < times; i += 1) await interact(() => fireEvent.keyDown(thumb, { key: 'ArrowRight', shiftKey: true }));
    };
    // Ten steps at a time from 25: 5 steps apart stops the first thumb at 65, 20 at 55
    await push(5);
    expect(values()).toEqual(['65', '75']);
    await interact(() => minSteps()!.focus());
    await interact(() => fireEvent.keyDown(minSteps()!, { key: 'End' }));
    expect(minSteps()?.getAttribute('aria-valuenow')).toBe('20');
    await choose('thumbs', 'three');
    expect(values()).toEqual(['10', '40', '70']);
    await choose('thumbs', 'two');
    expect(values()).toEqual(['65', '75']);
    await choose('thumbs', 'three');
    await push(3);
    expect(values()).toEqual(['20', '40', '70']);
    // unit follows the value, prefixUnit comes before it, none is a bare number
    await choose('unit', 'prefixUnit');
    expect(text()).toContain('$20 – $40 – $70');
    await choose('unit', 'none');
    expect(text()).toContain('20 – 40 – 70');
    // The scale's marks, the track's colors, a tooltip on the label
    await toggle('marks');
    expect(marks()).toEqual(['0', '25', '50', '75', '100']);
    await toggle('colors');
    const colors = stage().querySelector<HTMLElement>('[style*="--slider-track-color"]')!;
    expect(colors.style.getPropertyValue('--slider-track-color')).toBe('#61C454');
    expect(colors.style.getPropertyValue('--slider-range-color')).toBe('#EF4146');
    await toggle('tooltip');
    expect(within(stage()).getByText('Example field').closest('[data-state]')).toBeTruthy();
    // A vertical slider draws no marks, so they are not offered there, and they come back with the horizontal one
    await choose('orientation', 'vertical');
    expect(root().getAttribute('data-orientation')).toBe('vertical');
    expect(page.queryByRole('switch', { name: 'marks' })).toBeNull();
    expect(marks()).toEqual([]);
    await choose('orientation', 'horizontal');
    expect(marks()).toHaveLength(5);
    await toggle('disabled');
    expect(thumbs().every((thumb) => thumb.hasAttribute('data-disabled'))).toBe(true);
    // A disabled slider hides its reset button, so resetValue is not offered; enabled again, it keeps the choice
    await choose('thumbs', 'one');
    expect(page.queryByRole('switch', { name: 'resetValue' })).toBeNull();
    await toggle('disabled');
    expect(page.getByRole('switch', { name: 'resetValue' }).getAttribute('aria-checked')).toBe('false');
    expect(within(stage()).queryByRole('button', { name: 'Reset to default' })).toBeNull();
    // prefixUnit stands before one value too
    await choose('unit', 'prefixUnit');
    expect([text().includes('$'), text().includes('%')]).toEqual([true, false]);
  });

  test('slider on a phone: one value ends the cell, a range goes under the track, marks take its place', async () => {
    const show = viewport();
    const view = render(framework === 'React' ? <SliderOverviewDemo /> : <VuePhoneRowsDemo {...sliderOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name })));
    // A desktop-only row is left out, or hidden on a phone (marked for the stylesheet)
    const offered = (role: string, name: string) => { const row = page.queryByRole(role, { name }); return !!row && !row.closest('[data-demo-desktop-only]'); };
    // On desktop: three thumbs, marks, then a vertical slider, which draws none
    await choose('thumbs', 'three');
    await toggle('marks');
    await choose('orientation', 'vertical');
    expect(view.container.querySelectorAll('[data-mark]')).toHaveLength(0);
    await show('phone');
    const cell = () => view.container.querySelector<HTMLElement>('[data-row]')!;
    const slider = () => cell().querySelector<HTMLElement>('[data-orientation]')!;
    // The phone slider is horizontal, in a cell of a group its title names, with no label row of its own
    expect(within(view.container).getByText('Example field').closest('[data-row]')).toBeNull();
    expect(slider().getAttribute('data-orientation')).toBe('horizontal');
    expect(within(cell()).getAllByRole('slider').map((thumb) => thumb.getAttribute('aria-label'))).toEqual(['Example field Value 1 of 3', 'Example field Value 2 of 3', 'Example field Value 3 of 3']);
    for (const [role, name] of [['switch', 'resetValue'], ['switch', 'tooltip'], ['radiogroup', 'orientation']]) expect(offered(role, name), name).toBe(false);
    expect(offered('slider', 'minStepsBetweenThumbs')).toBe(true);
    // Marks show the scale in the value's place, so the unit is not offered with them
    expect(offered('switch', 'marks')).toBe(true);
    expect(Array.from(cell().querySelectorAll('[data-mark]'), (mark) => mark.textContent)).toEqual(['0', '25', '50', '75', '100']);
    expect(cell().className).toBe(sliderCellStackedClassName);
    expect(offered('radiogroup', 'unit')).toBe(false);
    // Without marks a range goes under the track
    await toggle('marks');
    expect(offered('radiogroup', 'unit')).toBe(true);
    expect(cell().className).toBe(sliderCellStackedClassName);
    expect(cell().querySelector(`[class="${sliderCellValueBelowClassName}"]`)?.textContent).toBe('10% – 40% – 70%');
    await choose('unit', 'prefixUnit');
    expect(cell().textContent).toContain('$10 – $40 – $70');
    // One value ends the cell, and takes the tertiary label when the slider is disabled
    await choose('thumbs', 'one');
    expect(cell().className).toBe(sliderCellClassName);
    const value = () => cell().lastElementChild!;
    expect(value().textContent).toBe('$50');
    expect(value().className).toContain('text-secondary');
    await toggle('disabled');
    expect(value().className).toContain(sliderCellValueDisabledClassName);
    expect(within(cell()).getByRole('slider').hasAttribute('data-disabled')).toBe(true);
    // A range under the track takes it too
    await choose('thumbs', 'two');
    expect(value().className).toBe(`${sliderCellValueBelowClassName} ${sliderCellValueDisabledClassName}`);
    // One thumb with marks: the scale under the track in the value's place
    await choose('thumbs', 'one');
    await toggle('marks');
    expect(cell().className).toBe(sliderCellStackedClassName);
    expect(cell().querySelectorAll('[data-mark]')).toHaveLength(5);
    expect(cell().textContent).not.toContain('$50');
    // The track's colors reach the cell
    await toggle('colors');
    expect(cell().querySelector<HTMLElement>('[style*="--slider-track-color"]')?.style.getPropertyValue('--slider-range-color')).toBe('#EF4146');
    await show('desktop');
    expect(view.container.querySelector('[data-demo-stage] [data-orientation]')?.getAttribute('data-orientation')).toBe('vertical');
    expect(page.getByRole('radiogroup', { name: 'orientation' })).toBeTruthy();
  });

  test('tip: one Overview carries every setting of an inline tip, the phone actions only on a phone (owner 11.11)', async () => {
    const show = viewport();
    const view = render(framework === 'React' ? <TipOverviewDemo /> : <VuePhoneRowsDemo {...tipOverview} />);
    await interact(() => {});
    const page = within(view.container);
    const stage = () => view.container.querySelector<HTMLElement>('[data-demo-stage]')!;
    const tip = () => stage().querySelector<HTMLElement>('.Tip');
    const choose = (name: string, option: string) => interact(() => fireEvent.click(within(page.getByRole('radiogroup', { name })).getByRole('radio', { name: option })));
    const toggle = (name: string) => interact(() => fireEvent.click(page.getByRole('switch', { name })));
    const press = (name: string) => interact(() => fireEvent.click(within(stage()).getByRole('button', { name })));
    const actions = () => Array.from(tip()!.querySelectorAll<HTMLElement>('button[data-variant]'), (button) => `${button.textContent} ${button.dataset.variant}`).filter((label) => !label.startsWith(' '));
    const bell = () => within(stage()).queryByRole('button', { name: 'Notifications' });
    for (const name of ['icon', 'onClose']) expect(page.getByRole('switch', { name })).toBeTruthy();
    for (const name of ['actions', 'arrowEdge']) expect(page.getByRole('radiogroup', { name })).toBeTruthy();
    // The kit's notifications tip: a symbol, the message and Close, no actions and no arrow
    expect(within(tip()!).getByText('Turn on notifications')).toBeTruthy();
    const symbols = tip()!.querySelectorAll('svg').length;
    await toggle('icon');
    expect(tip()!.querySelectorAll('svg')).toHaveLength(symbols - 1);
    await toggle('icon');
    expect([tip()!.hasAttribute('data-arrow-edge'), bell(), page.queryByRole('radiogroup', { name: 'mobileActions' })]).toEqual([false, null, null]);
    await press('Close tip');
    expect(tip()).toBeNull();
    await press('Show the tip again');
    expect(tip()).toBeTruthy();
    await toggle('onClose');
    expect(within(tip()!).queryByRole('button', { name: 'Close tip' })).toBeNull();
    // One soft action, as a card that asks for a permission; two, the second one solid
    await choose('actions', 'one');
    expect(actions()).toEqual(['Turn on soft']);
    await choose('actions', 'two');
    expect(actions()).toEqual(['Not now soft', 'Turn on solid']);
    // How a phone draws them is offered only there, and only with actions
    expect(page.getByRole('radiogroup', { name: 'mobileActions' }).closest('[data-demo-phone-only]')).toBeTruthy();
    // The arrow points at the control the tip explains, on that side
    await choose('arrowEdge', 'top');
    expect(tip()!.dataset.arrowEdge).toBe('top');
    expect(bell()!.compareDocumentPosition(tip()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const order = () => [bell()!.compareDocumentPosition(tip()!) & Node.DOCUMENT_POSITION_FOLLOWING ? 'control first' : 'tip first', tip()!.parentElement!.className.includes('flex-row') ? 'row' : 'column'];
    await choose('arrowEdge', 'left');
    expect([tip()!.dataset.arrowEdge, ...order()]).toEqual(['left', 'control first', 'row']);
    await choose('arrowEdge', 'bottom');
    expect([tip()!.dataset.arrowEdge, ...order()]).toEqual(['bottom', 'tip first', 'column']);
    await choose('arrowEdge', 'right');
    expect([tip()!.dataset.arrowEdge, ...order()]).toEqual(['right', 'tip first', 'row']);
    // On a phone the tip is the card of a grouped list, over or under its control (no sideways arrow, so the one
    // chosen on desktop shows as none), its actions rows of text or, chosen, its buttons
    await show('phone');
    expect(tip()!.closest('[data-phone-rows]')).toBeTruthy();
    expect(within(page.getByRole('radiogroup', { name: 'arrowEdge' })).getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['none', 'top', 'bottom']);
    expect([tip()!.hasAttribute('data-arrow-edge'), bell()]).toEqual([false, null]);
    await choose('arrowEdge', 'top');
    expect([tip()!.dataset.arrowEdge, ...order()]).toEqual(['top', 'control first', 'column']);
    expect(tip()!.hasAttribute('data-mobile-actions')).toBe(false);
    await choose('mobileActions', 'buttons');
    expect(tip()!.dataset.mobileActions).toBe('buttons');
    await choose('actions', 'none');
    expect([tip()!.hasAttribute('data-mobile-actions'), page.queryByRole('radiogroup', { name: 'mobileActions' })]).toEqual([false, null]);
    await show('desktop');
    // The code sample lays the tip out as the demo does
    const code = readFileSync(framework === 'React' ? 'content/components/tip.mdx' : 'content/vue/components/tip.mdx', 'utf8');
    for (const part of ['md:max-w-[360px]', 'min-w-0 flex-1', 'shrink-0', 'Show the tip again', '"none"']) expect(code, part).toContain(part);
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
