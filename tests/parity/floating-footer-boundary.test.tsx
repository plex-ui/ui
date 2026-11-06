import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { h, reactive } from 'vue';
import { Button as RButton } from '../../packages/ui/src/components/Button';
import { Dialog as RDialog } from '../../packages/ui/src/components/Dialog';
import { Menu as RMenu } from '../../packages/ui/src/components/Menu';
import { Page as RPage } from '../../packages/ui/src/components/Page';
import { Select as RSelect } from '../../packages/ui/src/components/Select';
import { Button } from '../../packages/vue/src/components/Button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../packages/vue/src/components/Dialog';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../packages/vue/src/components/Menu';
import { Page, PageContent, PageFooter } from '../../packages/vue/src/components/Page';
import { Select } from '../../packages/vue/src/components/Select';
import { readFloatingFooterInset as readReactInset } from '../../packages/ui/src/lib/floatingBoundary';
import { readFloatingFooterInset as readVueInset } from '../../packages/vue/src/lib/floatingBoundary';
import { flushVue, mountVue } from './harness';

type Framework = 'React' | 'Vue';
type Popup = 'select' | 'menu';
type Sample = { framework: Framework; popup: Popup; boundary: unknown; padding: unknown };
const captured = vi.hoisted(() => {
    const samples: Sample[] = [];
    return { samples };
});

// Keep the real popup/focus implementations. Capture only their documented
// positioning props; jsdom cannot establish real visual flip/scroll geometry.
vi.mock('radix-ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('radix-ui')>();
    const { createElement, forwardRef } = await import('react');
    const PopoverContent = forwardRef<
        HTMLDivElement,
        import('react').ComponentProps<typeof actual.Popover.Content>
    >(function CapturedPopover(props, ref) {
        captured.samples.push({
            framework: 'React',
            popup: 'select',
            boundary: props.collisionBoundary,
            padding: props.collisionPadding,
        });
        return createElement(actual.Popover.Content, { ...props, ref });
    });
    const DropdownContent = forwardRef<
        HTMLDivElement,
        import('react').ComponentProps<typeof actual.DropdownMenu.Content>
    >(function CapturedMenu(props, ref) {
        captured.samples.push({
            framework: 'React',
            popup: 'menu',
            boundary: props.collisionBoundary,
            padding: props.collisionPadding,
        });
        return createElement(actual.DropdownMenu.Content, { ...props, ref });
    });
    return {
        ...actual,
        Popover: { ...actual.Popover, Content: PopoverContent },
        DropdownMenu: { ...actual.DropdownMenu, Content: DropdownContent },
    };
});

vi.mock('reka-ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('reka-ui')>();
    const { defineComponent, h } = await import('vue');
    const PopoverContent = defineComponent({
        inheritAttrs: false,
        setup(_props, { attrs, slots }) {
            return () => {
                captured.samples.push({
                    framework: 'Vue',
                    popup: 'select',
                    boundary: attrs.collisionBoundary,
                    padding: attrs.collisionPadding,
                });
                return h(actual.PopoverContent, attrs, slots);
            };
        },
    });
    const DropdownMenuContent = defineComponent({
        inheritAttrs: false,
        setup(_props, { attrs, slots }) {
            return () => {
                captured.samples.push({
                    framework: 'Vue',
                    popup: 'menu',
                    boundary: attrs.collisionBoundary,
                    padding: attrs.collisionPadding,
                });
                return h(actual.DropdownMenuContent, attrs, slots);
            };
        },
    });
    return { ...actual, PopoverContent, DropdownMenuContent };
});

const geometry = { footerTop: 700, dialogFooterTop: 650, mobile: true };
class TestViewport extends EventTarget {
    offsetTop = 0;
    offsetLeft = 0;
    width = 400;
    height = 800;
    scale = 1;
    pageTop = 0;
    pageLeft = 0;
}
class TestMedia extends EventTarget {
    constructor(readonly media: string) {
        super();
    }
    get matches() {
        return this.media === '(max-width: 767px)' && geometry.mobile;
    }
}
const mediaQueries = new Map<string, TestMedia>();
let viewport = new TestViewport();
const observers = new Set<TestResizeObserver>();
class TestResizeObserver implements ResizeObserver {
    readonly targets = new Set<Element>();
    constructor(readonly callback: ResizeObserverCallback) {
        observers.add(this);
    }
    observe(target: Element) {
        this.targets.add(target);
    }
    unobserve(target: Element) {
        this.targets.delete(target);
    }
    disconnect() {
        this.targets.clear();
        observers.delete(this);
    }
}
function rect(element: HTMLElement) {
    if (element.classList.contains('fixture-page')) return new DOMRect(0, 0, 400, 800);
    if (element.classList.contains('fixture-page-footer'))
        return new DOMRect(0, geometry.footerTop, 400, 800 - geometry.footerTop);
    if (element.classList.contains('fixture-dialog')) return new DOMRect(0, 100, 400, 660);
    if (element.classList.contains('fixture-dialog-footer'))
        return new DOMRect(0, geometry.dialogFooterTop, 400, 760 - geometry.dialogFooterTop);
    return new DOMRect(20, 450, 360, 52);
}
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const interact = async (callback: () => void) =>
    act(async () => {
        callback();
        await flushVue();
        await frame();
        await flushVue();
    });
const resize = () => {
    for (const observer of [...observers]) observer.callback([], observer);
};
const page = () => within(document.body);
const latest = (framework: Framework, popup: Popup) => {
    const sample = captured.samples
        .filter((entry) => entry.framework === framework && entry.popup === popup)
        .at(-1);
    if (!sample) throw new Error('Popup did not receive positioning props');
    return sample;
};
const element = (selector: string) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Missing fixture ${selector}`);
    return node;
};

beforeEach(() => {
    geometry.footerTop = 700;
    geometry.dialogFooterTop = 650;
    geometry.mobile = true;
    viewport = new TestViewport();
    captured.samples.length = 0;
    observers.clear();
    mediaQueries.clear();
    vi.stubGlobal('visualViewport', viewport);
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    // The fixture gives anchors real bounds, so Floating UI also observes their
    // movement. jsdom has no IntersectionObserver; layout is verified in-browser.
    vi.stubGlobal('IntersectionObserver', class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
    });
    vi.stubGlobal('matchMedia', (query: string) => {
        let media = mediaQueries.get(query);
        if (!media) {
            media = new TestMedia(query);
            mediaQueries.set(query, media);
        }
        return media;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
        return rect(this);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
        return rect(this).height;
    });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function () {
        return rect(this).height;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () {
        return rect(this).width;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
        return rect(this).width;
    });
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
});
afterEach(() => {
    vi.unstubAllGlobals();
});

const countries = [
    { value: 'es', label: 'Spain' },
    { value: 'us', label: 'United States' },
    { value: 'ye', label: 'Yemen' },
];
async function mountFixture(
    framework: Framework,
    popup: Popup,
    dialog = false,
    avoidCollisions = true,
) {
    const state = reactive({ footer: true, dialogFooter: true });
    const changed = vi.fn();
    let refresh = () => {};
    const reactPopup = () =>
        popup === 'select' ? (
            <RSelect
                aria-label="Country"
                value="es"
                options={countries}
                onChange={changed}
                avoidCollisions={avoidCollisions}
            />
        ) : (
            <RMenu>
                <RMenu.Trigger>
                    <RButton>Actions</RButton>
                </RMenu.Trigger>
                <RMenu.Content>
                    <RMenu.Item onSelect={changed}>First action</RMenu.Item>
                    <RMenu.Item onSelect={changed}>Last action</RMenu.Item>
                </RMenu.Content>
            </RMenu>
        );
    const reactTree = () => (
        <RPage className="fixture-page">
            <RPage.Content>
                {dialog ? (
                    <RDialog open>
                        <RDialog.Content
                            className="fixture-dialog"
                            mobileVariant="sheet"
                            onOpenAutoFocus={(event) => event.preventDefault()}
                        >
                            <RDialog.Header>
                                <RDialog.Title>Country form</RDialog.Title>
                                <RDialog.Description>Choose a country.</RDialog.Description>
                            </RDialog.Header>
                            <RDialog.Body>{reactPopup()}</RDialog.Body>
                            {state.dialogFooter && (
                                <RDialog.Footer className="fixture-dialog-footer">
                                    <RButton>Continue in dialog</RButton>
                                </RDialog.Footer>
                            )}
                        </RDialog.Content>
                    </RDialog>
                ) : (
                    reactPopup()
                )}
            </RPage.Content>
            {state.footer && (
                <RPage.Footer className="fixture-page-footer">
                    <RButton>Continue</RButton>
                </RPage.Footer>
            )}
        </RPage>
    );
    const vuePopup = () =>
        popup === 'select'
            ? h(Select, {
                  ariaLabel: 'Country',
                  value: 'es',
                  options: countries,
                  onChange: changed,
                  avoidCollisions,
              })
            : h(Menu, null, () => [
                  h(MenuTrigger, null, () => h(Button, null, () => 'Actions')),
                  h(MenuContent, null, () => [
                      h(MenuItem, { onSelect: changed }, () => 'First action'),
                      h(MenuItem, { onSelect: changed }, () => 'Last action'),
                  ]),
              ]);
    const vueTree = () =>
        h(Page, { class: 'fixture-page' }, () => [
            h(PageContent, null, () =>
                dialog
                    ? h(Dialog, { open: true }, () =>
                          h(
                              DialogContent,
                              {
                                  class: 'fixture-dialog',
                                  mobileVariant: 'sheet',
                                  onOpenAutoFocus: (event: Event) => event.preventDefault(),
                              },
                              () => [
                                  h(DialogHeader, null, () => [
                                      h(DialogTitle, null, () => 'Country form'),
                                      h(DialogDescription, null, () => 'Choose a country.'),
                                  ]),
                                  h(DialogBody, null, vuePopup),
                                  state.dialogFooter &&
                                      h(DialogFooter, { class: 'fixture-dialog-footer' }, () =>
                                          h(Button, null, () => 'Continue in dialog'),
                                      ),
                              ],
                          ),
                      )
                    : vuePopup(),
            ),
            state.footer &&
                h(PageFooter, { class: 'fixture-page-footer' }, () =>
                    h(Button, null, () => 'Continue'),
                ),
        ]);
    if (framework === 'React') {
        const view = render(reactTree());
        refresh = () => view.rerender(reactTree());
    } else {
        mountVue(vueTree);
        await flushVue();
    }
    const trigger = page().getByRole('button', {
        name: popup === 'select' ? 'Country' : 'Actions',
        exact: true,
    });
    await interact(() => {
        fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse', pointerId: 1 });
        fireEvent.mouseDown(trigger, { button: 0 });
    });
    await interact(() => {
        fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse', pointerId: 1 });
        fireEvent.mouseUp(trigger, { button: 0 });
        fireEvent.click(trigger, { button: 0, detail: 1 });
    });
    await waitFor(() => expect(latest(framework, popup)).toBeTruthy());
    return {
        changed,
        trigger,
        setFooter: (shown: boolean) =>
            interact(() => {
                if (dialog) state.dialogFooter = shown;
                else state.footer = shown;
                refresh();
            }),
    };
}

describe.each<Framework>(['React', 'Vue'])('%s anchored popup footer boundary', (framework) => {
    test.each<Popup>(['select', 'menu'])(
        '%s uses the mounted Page footer and updates on resize/hide',
        async (popup) => {
            const fixture = await mountFixture(framework, popup);
            const root = element('.fixture-page');
            await waitFor(() => expect(latest(framework, popup).boundary).toBe(root));
            expect(latest(framework, popup).padding).toEqual(
                expect.objectContaining({ top: 30, bottom: 130 }),
            );
            await interact(() => {
                geometry.footerTop = 620;
                resize();
            });
            await waitFor(() =>
                expect(latest(framework, popup).padding).toEqual(
                    expect.objectContaining({ bottom: 210 }),
                ),
            );
            await interact(() => {
                element('.fixture-page-footer').hidden = true;
            });
            await waitFor(() => expect(latest(framework, popup).boundary).toBeUndefined());
            await interact(() => {
                element('.fixture-page-footer').hidden = false;
            });
            await waitFor(() => expect(latest(framework, popup).boundary).toBe(root));
            await fixture.setFooter(false);
            await waitFor(() => expect(latest(framework, popup).boundary).toBeUndefined());
            expect(latest(framework, popup).padding).toEqual(
                expect.objectContaining({ bottom: 30 }),
            );
            await fixture.setFooter(true);
            await waitFor(() => expect(latest(framework, popup).boundary).toBe(root));
            expect(latest(framework, popup).padding).toEqual(
                expect.objectContaining({ bottom: 210 }),
            );
        },
    );

    test.each<Popup>(['select', 'menu'])(
        '%s uses its nested Dialog footer and never falls back to the outer Page',
        async (popup) => {
            const fixture = await mountFixture(framework, popup, true);
            const dialog = element('.fixture-dialog');
            await waitFor(() => expect(latest(framework, popup).boundary).toBe(dialog));
            expect(latest(framework, popup).padding).toEqual(
                expect.objectContaining({ bottom: 140 }),
            );
            await fixture.setFooter(false);
            await waitFor(() => expect(latest(framework, popup).boundary).toBeUndefined());
            expect(element('.fixture-page-footer')).toBeTruthy();
        },
    );

    test('keyboard viewport clipping reserves only the visible footer portion', async () => {
        await mountFixture(framework, 'select');
        await interact(() => {
            geometry.footerTop = 400;
            viewport.height = 450;
            viewport.dispatchEvent(new Event('resize'));
        });
        await waitFor(() =>
            expect(latest(framework, 'select').padding).toEqual(
                expect.objectContaining({ bottom: 80 }),
            ),
        );
        await interact(() => {
            viewport.offsetTop = 100;
            viewport.height = 450;
            viewport.dispatchEvent(new Event('scroll'));
        });
        await waitFor(() =>
            expect(latest(framework, 'select').padding).toEqual(
                expect.objectContaining({ bottom: 180 }),
            ),
        );
    });

    test('desktop and avoidCollisions=false keep their original viewport contract', async () => {
        geometry.mobile = false;
        await mountFixture(framework, 'select', false, false);
        expect(latest(framework, 'select').boundary).toBeUndefined();
        await interact(() => {
            geometry.mobile = true;
            mediaQueries.get('(max-width: 767px)')?.dispatchEvent(new Event('change'));
            resize();
        });
        expect(latest(framework, 'select').boundary).toBeUndefined();
        expect(latest(framework, 'select').padding).toEqual({ bottom: 30, top: 30 });
    });

    test.each<Popup>(['select', 'menu'])(
        '%s starts on desktop with no Page boundary',
        async (popup) => {
            geometry.mobile = false;
            await mountFixture(framework, popup);
            expect(latest(framework, popup).boundary).toBeUndefined();
            expect(latest(framework, popup).padding).toEqual(
                expect.objectContaining({ bottom: 30, top: 30 }),
            );
        },
    );

    test('an open menu drops the mobile constraint on desktop resize', async () => {
        await mountFixture(framework, 'menu');
        await waitFor(() =>
            expect(latest(framework, 'menu').boundary).toBe(element('.fixture-page')),
        );
        await interact(() => {
            geometry.mobile = false;
            mediaQueries.get('(max-width: 767px)')?.dispatchEvent(new Event('change'));
        });
        await waitFor(() => expect(latest(framework, 'menu').boundary).toBeUndefined());
        expect(latest(framework, 'menu').padding).toEqual({
            top: 30,
            bottom: 30,
            left: 12,
            right: 12,
        });
    });

    test('the last option still scrolls into view and keyboard selection closes the popup', async () => {
        const fixture = await mountFixture(framework, 'select');
        const list = page().getByRole('listbox');
        await interact(() => {
            fireEvent.keyDown(list, { key: 'ArrowDown' });
        });
        await interact(() => {
            fireEvent.keyDown(list, { key: 'ArrowDown' });
        });
        expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts).toContain(
            page().getByRole('option', { name: 'Yemen' }),
        );
        await interact(() => {
            fireEvent.keyDown(list, { key: 'Enter' });
        });
        expect(fixture.changed).toHaveBeenCalledWith(expect.objectContaining({ value: 'ye' }));
        await waitFor(() => expect(fixture.trigger.getAttribute('aria-expanded')).toBe('false'));
        const root = element('.fixture-page');
        const footer = element('.fixture-page-footer');
        expect(
            [...observers].some(
                (observer) => observer.targets.has(root) && observer.targets.has(footer),
            ),
        ).toBe(false);
    });
});

test.each([readReactInset, readVueInset])(
    'geometry ignores hidden/detached footers and never subtracts offscreen height twice',
    (read) => {
        const root = document.createElement('div');
        root.className = 'fixture-page';
        const footer = document.createElement('div');
        footer.className = 'fixture-page-footer';
        root.append(footer);
        document.body.append(root);
        expect(read(root, footer)).toEqual({ boundary: root, bottom: 100 });
        viewport.height = 600;
        expect(read(root, footer)).toEqual({ boundary: root, bottom: 0 });
        footer.hidden = true;
        expect(read(root, footer)).toBeNull();
        footer.hidden = false;
        footer.remove();
        expect(read(root, footer)).toBeNull();
        root.remove();
    },
);
