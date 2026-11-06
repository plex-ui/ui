import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { h, reactive } from 'vue';
import { Input as ReactInput } from '@plexui/ui/components/Input';
import { Input as VueInput } from '@plexui/vue/components/Input';
import { AuthFormStage as ReactAuth } from '../../components/docs/AuthFormStage';
import { FormScreen as ReactForm } from '../../components/docs/FormRowsDemos';
import { SettingsChecklistDemo as ReactSettings } from '../../components/docs/SettingsChecklistDemo';
import { ImageAlbumEditor as ReactAlbum } from '../../components/docs/ImageAlbumEditor';
import { AuthFormStage as VueAuth } from '../../components/docs/vue/AuthFormStage';
import { FormScreen as VueForm } from '../../components/docs/vue/FormScreen';
import { SettingsChecklistDemo as VueSettings } from '../../components/docs/vue/SettingsChecklistDemo';
import { ImageAlbumEditor as VueAlbum } from '../../components/docs/vue/ImageAlbumEditor';
import { animation, flushVue, mountVue } from './harness';

vi.mock('@plexui/ui/hooks/useBreakpoints', () => ({ useBreakpoint: () => false }));
vi.mock('@plexui/vue/composables/useBreakpoints', async () => {
  const { ref } = await import('vue');
  return { useBreakpoint: () => ref(false) };
});
vi.mock('@plexui/ui/components/Dialog', async () => import('../../packages/ui/src/components/Dialog'));
vi.mock('@plexui/vue/components/Dialog', async () => import('../../packages/vue/src/components/Dialog'));
vi.mock('@plexui/ui/components/Page', async () => import('../../packages/ui/src/components/Page'));
vi.mock('@plexui/vue/components/Page', async () => import('../../packages/vue/src/components/Page'));
vi.mock('@plexui/ui/components/Transition', async () => import('../../packages/ui/src/components/Transition'));
vi.mock('@plexui/vue/components/Transition', async () => import('../../packages/vue/src/components/Transition'));

type Framework = 'React' | 'Vue';
type Owner = 'Auth' | 'Form' | 'Settings' | 'Album';
const titles: Record<Owner, string> = { Auth: 'Password', Form: 'Payout details', Settings: 'Notifications', Album: 'New Album' };
const interact = async (action: () => void) => act(async () => { action(); await flushVue(); });
const settle = async () => {
  await interact(() => { vi.advanceTimersByTime(50); });
  await interact(() => { vi.advanceTimersByTime(350); });
  await interact(() => { vi.advanceTimersByTime(0); });
};
beforeEach(() => {
  animation.disabled = false;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(async () => {
  cleanup();
  await flushVue();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mountOwner(framework: Framework, owner: Owner, initiallyOpen = true) {
  const state = reactive({ dialog: initiallyOpen, phoneHost: false, value: 'GB29 NWBK 6016 1331 9268 19' });
  let rerender = () => {};
  const setOpen = (next: boolean) => { state.dialog = next; rerender(); };
  const setHost = (next: boolean) => { state.phoneHost = next; rerender(); };
  if (framework === 'React') {
    const input = () => <ReactInput aria-label="Draft" value={state.value} onChange={(event) => { state.value = event.target.value; rerender(); }} />;
    const tree = () => {
      if (owner === 'Auth') return <ReactAuth title={titles.Auth} dialog={state.dialog} onDialogChange={setOpen}>{input()}</ReactAuth>;
      if (owner === 'Form') return <ReactForm title={titles.Form} dialog={state.dialog} onDialogChange={setOpen}>{input()}</ReactForm>;
      if (owner === 'Settings') return <ReactSettings />;
      return <ReactAlbum dialog={state.dialog} phoneHost={state.phoneHost} onDialogChange={setOpen} />;
    };
    const view = render(tree());
    rerender = () => view.rerender(tree());
    if (owner === 'Settings') {
      const update = (next: boolean) => {
        const control = within(document.body).getByRole('switch', { name: 'dialog', exact: true, hidden: true });
        if ((control.getAttribute('aria-checked') === 'true') !== next) fireEvent.click(control);
      };
      if (initiallyOpen) await interact(() => update(true));
      return { setOpen: update, setHost };
    }
  } else {
    const properties = () => ({ dialog: state.dialog, phoneHost: state.phoneHost, 'onUpdate:dialog': setOpen });
    const input = () => h(VueInput, { 'aria-label': 'Draft', value: state.value, 'onUpdate:value': (value: string) => { state.value = value; } });
    mountVue(() => {
      if (owner === 'Auth') return h(VueAuth, { ...properties(), title: titles.Auth, mobile: true }, input);
      if (owner === 'Form') return h(VueForm, { ...properties(), title: titles.Form }, input);
      if (owner === 'Settings') return h(VueSettings, properties());
      return h(VueAlbum, properties());
    });
    await flushVue();
  }
  return { setOpen, setHost };
}

function dialog() { return document.querySelector<HTMLElement>('[data-plex-dialog]'); }
function page(owner: Owner) { return within(document.body).queryByRole('region', { name: titles[owner], exact: true }); }

// On a phone the Sheet's Close is in its top Toolbar; the Dialog's own Close button is the desktop one.
const sheetClose = () => within(document.querySelector<HTMLElement>('[data-plex-dialog] [data-toolbar][data-placement="top"]')!)
  .getByRole('button', { name: 'Close dialog' });

describe.each<Framework>(['React', 'Vue'])('%s docs stage modal lifecycle', (framework) => {
  test.each<Owner>(['Auth', 'Form', 'Settings', 'Album'])('%s keeps its single form until the real exit detaches', async (owner) => {
    const state = await mountOwner(framework, owner);
    await settle();
    const original = dialog();
    expect(original).not.toBeNull();
    const field = original?.querySelector<HTMLInputElement>('input:not([type="file"])');
    const value = field?.value;
    await interact(() => state.setOpen(false));
    expect(original?.isConnected).toBe(true);
    expect(page(owner)).toBeNull();
    if (field) expect(field.isConnected).toBe(true);
    await interact(() => { vi.advanceTimersByTime(50); });
    expect(original?.isConnected).toBe(true);
    await settle();
    expect(original?.isConnected).toBe(false);
    expect(dialog()).toBeNull();
    const replacement = page(owner);
    expect(replacement).not.toBeNull();
    if (field) {
      const replacementFields = replacement?.querySelectorAll<HTMLInputElement>('input:not([type="file"])');
      expect(replacementFields?.length).toBe(1);
      expect(replacementFields?.[0]?.value).toBe(value);
    }
  });

  test('closing before the enter animation settles does not strand an empty owner', async () => {
    const state = await mountOwner(framework, 'Form');
    await interact(() => state.setOpen(false));
    await settle();
    expect(dialog()).toBeNull();
    expect(page('Form')).not.toBeNull();
  });

  test('a reopened exit keeps the same form and ignores its old completion', async () => {
    const state = await mountOwner(framework, 'Form');
    await settle();
    const original = dialog();
    const field = original?.querySelector('input');
    await interact(() => state.setOpen(false));
    await interact(() => { vi.advanceTimersByTime(50); });
    await interact(() => state.setOpen(true));
    await settle();
    expect(dialog()).toBe(original);
    expect(dialog()?.querySelector('input')).toBe(field);
    expect(page('Form')).toBeNull();
    expect(original?.closest('[inert]')).toBeNull();
  });

  test('disabling a hidden host releases the owner and can reopen immediately', async () => {
    const state = await mountOwner(framework, 'Album');
    await settle();
    await interact(() => state.setHost(true));
    expect(dialog()).toBeNull();
    expect(page('Album')).not.toBeNull();
    await interact(() => state.setHost(false));
    await settle();
    expect(dialog()).not.toBeNull();
    expect(page('Album')).toBeNull();
    expect(document.querySelectorAll('[data-plex-dialog]').length).toBe(1);
  });

  test.each([false, true])('close returns focus to the Page after detach (animations disabled=%s)', async (disabled) => {
    animation.disabled = disabled;
    // jsdom clears _lastFocusedElement when a focused subtree detaches, making
    // hasFocus() false. Model the focused browser document independently.
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    await mountOwner(framework, 'Form');
    await settle();
    const original = dialog();
    const close = sheetClose();
    await interact(() => { close.focus(); fireEvent.click(close); });
    await settle();
    expect(original?.isConnected).toBe(false);
    expect(document.activeElement).toBe(page('Form'));
  });

  test('a document that lost focus does not focus the replacement Page', async () => {
    await mountOwner(framework, 'Form');
    await settle();
    const close = sheetClose();
    await interact(() => close.focus());
    // A parent iframe control or another document owns focus during closing.
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    await interact(() => fireEvent.click(close));
    await settle();
    expect(dialog()).toBeNull();
    expect(page('Form')).not.toBeNull();
    expect(document.activeElement).not.toBe(page('Form'));
  });

  test('initial Page render and an outside focus move do not steal focus', async () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside control';
    document.body.append(outside);
    outside.focus();
    const state = await mountOwner(framework, 'Form', false);
    expect(document.activeElement).toBe(outside);
    await interact(() => state.setOpen(true));
    await settle();
    await interact(() => state.setOpen(false));
    await interact(() => { vi.advanceTimersByTime(50); outside.focus(); });
    await settle();
    expect(document.activeElement).toBe(outside);
    expect(page('Form')).not.toBeNull();
  });
});
