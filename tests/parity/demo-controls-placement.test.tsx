import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DemoControlHostContext, DemoControlsBottomSlotContext, createDemoControlChannel } from '../../components/docs/PreviewEmbed';
import { TabBarDemo } from '../../components/docs/TabBarDemos';
import { VueDemo } from '../../components/docs/vue/VueDemo';
import { flushVue } from './harness';

vi.mock('../../components/docs/VuePreview', async () => ({
  VuePreview: (await import('../../components/docs/VuePreviewRuntime')).default,
}));
vi.mock('../../components/docs/PreviewEmbed.module.css', () => ({ default: { Root: 'PreviewEmbedRoot' } }));

afterEach(cleanup);

const option = (group: string, label: string) => {
  const button = [...document.querySelectorAll<HTMLButtonElement>(`[aria-label="${group}"] button`)].find((item) => item.textContent?.trim() === label);
  if (!button) throw new Error(`Missing option ${label} of ${group}`);
  return button;
};

// Owner 09.11: controls stand on the side of the screen they change, top or bottom, and the top and bottom bars
// take their own background. The kit's Tab Bar - iPhone holds five tabs at most, the search or prominent circle counted.
describe('demo controls by the part of the screen they change', () => {
  test('the TabBar demo keeps the top bar control above and the TabBar controls under the preview', () => {
    const { container } = render(<TabBarDemo />);
    const parts = [...container.children].map((element) => element.getAttribute('data-demo-controls') ?? (element.hasAttribute('data-demo-stage') ? 'stage' : 'other'));
    expect(parts).toEqual(['true', 'stage', 'bottom']);
    expect(container.querySelector('[data-demo-controls="true"]')?.textContent).toContain('background (top)');
    expect(container.querySelector('[data-demo-controls="bottom"]')?.textContent).toMatch(/tabs.*search.*prominent.*minimizeBehavior.*background \(bottom\)/);
    expect(container.querySelector('[data-toolbar][data-placement="top"]')?.getAttribute('data-background')).toBe('glass');
    expect(container.querySelector('nav[aria-label="Tabs"]')?.getAttribute('data-background')).toBe('soft');
  });

  test('a search or prominent circle leaves room for four tabs, and both for three', () => {
    const { container } = render(<TabBarDemo />);
    const tabs = () => [...container.querySelectorAll('nav[aria-label="Tabs"] [data-value]')].map((item) => item.getAttribute('data-value'));
    fireEvent.click(option('tabs', '5'));
    expect(tabs()).toEqual(['home', 'calendar', 'photos', 'settings', 'files']);
    fireEvent.click(screen.getByRole('switch', { name: 'search' }));
    expect(tabs()).toEqual(['home', 'calendar', 'photos', 'settings', 'search']);
    expect(option('tabs', '5').disabled).toBe(true);
    fireEvent.click(screen.getByRole('switch', { name: 'prominent' }));
    expect(tabs()).toEqual(['home', 'calendar', 'photos', 'search', 'bag']);
    expect(option('tabs', '4').disabled).toBe(true);
    fireEvent.click(screen.getByRole('switch', { name: 'search' }));
    fireEvent.click(screen.getByRole('switch', { name: 'prominent' }));
    expect(tabs()).toEqual(['home', 'calendar', 'photos', 'settings', 'files']);
  });

  test('the phone view sync keeps the count asked for when it gives back the shown one', () => {
    const view = (key: string) => (
      <DemoControlHostContext.Provider value={createDemoControlChannel(key, 'host')}>
        <TabBarDemo />
      </DemoControlHostContext.Provider>
    );
    const { container, rerender } = render(view('one'));
    const tabs = () => container.querySelectorAll('nav[aria-label="Tabs"] [data-value]').length;
    fireEvent.click(option('tabs', '5'));
    fireEvent.click(screen.getByRole('switch', { name: 'search' }));
    expect(tabs()).toBe(5);
    // A new channel, as after the page crosses 768px, publishes the shown 4 and hands it back to the control
    rerender(view('two'));
    fireEvent.click(screen.getByRole('switch', { name: 'search' }));
    expect(tabs()).toBe(5);
    expect(option('tabs', '5').getAttribute('data-state')).toBe('on');
  });

  test('in the phone view the bottom group follows the phone in the document', () => {
    const slot = document.createElement('div');
    document.body.append(slot);
    const { container } = render(
      <DemoControlsBottomSlotContext.Provider value={slot}>
        <TabBarDemo />
      </DemoControlsBottomSlotContext.Provider>,
    );
    expect(container.querySelector('[data-demo-controls="bottom"]')).toBeNull();
    expect(slot.firstElementChild?.getAttribute('data-demo-controls')).toBe('bottom');
    expect(slot.textContent).toContain('minimizeBehavior');
    slot.remove();
  });

  test('a VueDemo control with placement bottom stands under the stage, and limit caps a count', async () => {
    const { container } = render(
      <VueDemo
        template={'<span data-testid="count">{{ tabs }}</span>'}
        controls={[
          { name: 'search', type: 'boolean', default: false },
          { name: 'tabs', type: 'select', options: ['2', '3', '4', '5'], default: '5', limit: { total: 5, taken: ['search'] }, placement: 'bottom' },
        ]}
      />,
    );
    await act(flushVue);
    const parts = [...container.children].map((element) => element.getAttribute('data-demo-controls') ?? (element.hasAttribute('data-demo-stage') ? 'stage' : 'other'));
    expect(parts).toEqual(['true', 'stage', 'bottom']);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('5'));
    fireEvent.click(screen.getByRole('switch', { name: 'search' }));
    await act(flushVue);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'));
    expect(option('tabs', '5').disabled).toBe(true);
    expect(option('tabs', '4').getAttribute('data-state')).toBe('on');
  });

  test('the preview orders a bottom group after the stage and the phone, and the Vue pages match React', () => {
    const css = readFileSync('components/docs/ComponentPreview.module.css', 'utf8');
    expect(css).toMatch(/:is\(\.PreviewInner, \.PhoneControls\)>\[data-demo-controls="bottom"\] \{\n {2}order: 2;/);
    expect(css).toContain('.PhoneControls:empty {');
    expect(readFileSync('components/docs/ComponentPreview.tsx', 'utf8')).toContain('{phone && <div ref={setBottomControls} className={s.PhoneControls} />}');
    const tabBar = readFileSync('content/vue/components/tab-bar.mdx', 'utf8');
    expect(tabBar).toContain('limit: { total: 5, taken: ["search", "prominent"] }, placement: "bottom"');
    expect(tabBar).toContain('{ name: "toolbarBackground", label: "background (top)"');
    for (const page of ['toolbar', 'page', 'dialog']) {
      const mdx = readFileSync(`content/vue/components/${page}.mdx`, 'utf8');
      expect(mdx).toContain('{ name: "topBackground", label: "background (top)"');
      // A bottom bar the page may leave out takes a `when`: the regex lets its braces through
      expect(mdx).toMatch(/\{ name: "bottomBackground", label: "background \(bottom\)", [^\n]*default: "soft"[^\n]*placement: "bottom" \}/);
    }
    // The bottom bar of the Toolbar Overview, its own control under the preview, with no second search field
    expect(readFileSync('content/vue/components/toolbar.mdx', 'utf8')).toContain('{ name: "bottom", type: "select", options: ["none", "buttons", { value: "search", label: "search", when: { search: "none" } }, "action"], default: "none", placement: "bottom" }');
  });
});
