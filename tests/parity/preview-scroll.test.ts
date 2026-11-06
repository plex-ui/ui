import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installPreviewScrollBridge, isPreviewScrollDelta, scrollPreviewParent } from '../../components/docs/previewScroll';

function geometry(element: Element, height: number, contentHeight: number, top = 0) {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: height },
    scrollHeight: { configurable: true, value: contentHeight },
    scrollTop: { configurable: true, writable: true, value: top },
  });
}

function wheel(target: Element, init: WheelEventInit = {}) {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 60, ...init });
  target.dispatchEvent(event);
  return event;
}

function pane(height: number, contentHeight: number, top = 0) {
  const node = document.createElement('div');
  node.style.overflowY = 'auto';
  geometry(node, height, contentHeight, top);
  node.scrollBy = vi.fn((options?: ScrollToOptions | number) => {
    const delta = typeof options === 'object' ? options.top ?? 0 : 0;
    node.scrollTop = Math.max(0, Math.min(contentHeight - height, node.scrollTop + delta));
  });
  return node;
}

describe('Phone preview wheel handoff', () => {
  let uninstall: (() => void) | undefined;
  const forward = vi.fn();
  const scrollingElement = Object.getOwnPropertyDescriptor(document, 'scrollingElement');

  beforeEach(() => {
    forward.mockClear();
    Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.documentElement });
    geometry(document.documentElement, 874, 874);
    uninstall = installPreviewScrollBridge(document, forward);
  });

  afterEach(() => {
    uninstall?.();
    document.body.replaceChildren();
    document.body.removeAttribute('style');
    document.documentElement.removeAttribute('style');
    for (const key of ['clientHeight', 'scrollHeight', 'scrollTop']) Reflect.deleteProperty(document.documentElement, key);
    if (scrollingElement) Object.defineProperty(document, 'scrollingElement', scrollingElement);
    else Reflect.deleteProperty(document, 'scrollingElement');
    vi.restoreAllMocks();
  });

  test.each([60, -60])('short preview forwards %s without native double scrolling', (deltaY) => {
    expect(wheel(document.body, { deltaY }).defaultPrevented).toBe(true);
    expect(forward).toHaveBeenCalledExactlyOnceWith(deltaY);
  });

  test('long form retains native scrolling until it reaches the requested edge', () => {
    const form = pane(500, 1200, 200);
    const input = document.createElement('input');
    form.append(input);
    document.body.append(form);
    expect(wheel(input).defaultPrevented).toBe(false);
    expect(forward).not.toHaveBeenCalled();
    form.scrollTop = 700;
    expect(wheel(input).defaultPrevented).toBe(true);
    expect(forward).toHaveBeenCalledExactlyOnceWith(60);
    forward.mockClear();
    expect(wheel(input, { deltaY: -60 }).defaultPrevented).toBe(false);
    form.scrollTop = 0;
    expect(wheel(input, { deltaY: -60 }).defaultPrevented).toBe(true);
    expect(forward).toHaveBeenCalledExactlyOnceWith(-60);
  });

  test('portalled menu keeps its own scroll while a modal locks the document', () => {
    document.body.style.overflowY = 'hidden';
    const menu = pane(200, 600, 100);
    const option = document.createElement('button');
    menu.append(option);
    document.body.append(menu);
    expect(wheel(option).defaultPrevented).toBe(false);
    expect(forward).not.toHaveBeenCalled();
    menu.scrollTop = 400;
    expect(wheel(option).defaultPrevented).toBe(true);
    expect(forward).toHaveBeenCalledExactlyOnceWith(60);
  });

  test('a nested textarea and its containing form can both consume scroll', () => {
    const form = pane(400, 900, 100);
    const textarea = document.createElement('textarea');
    textarea.style.overflowY = 'auto';
    geometry(textarea, 100, 300, 0);
    form.append(textarea);
    document.body.append(form);
    expect(wheel(textarea).defaultPrevented).toBe(false);
    textarea.scrollTop = 200;
    expect(wheel(textarea).defaultPrevented).toBe(false);
    expect(forward).not.toHaveBeenCalled();
  });

  test('native document scroll is retained except while the viewport is locked', () => {
    geometry(document.documentElement, 874, 1800, 100);
    document.documentElement.style.overflowY = 'auto';
    expect(wheel(document.body).defaultPrevented).toBe(false);
    document.body.style.overflowY = 'hidden';
    expect(wheel(document.body).defaultPrevented).toBe(true);
    expect(forward).toHaveBeenCalledExactlyOnceWith(60);
  });

  test.each<WheelEventInit>([
    { ctrlKey: true }, { metaKey: true }, { shiftKey: true },
    { deltaX: 100 }, { deltaY: 0 }, { cancelable: false },
  ])('leaves zoom, horizontal and noncancelable gestures untouched: %j', (init) => {
    expect(wheel(document.body, init).defaultPrevented).toBe(false);
    expect(forward).not.toHaveBeenCalled();
  });

  test('normalizes line/page wheel units and bounds excessive deltas', () => {
    wheel(document.body, { deltaY: 2, deltaMode: 1 });
    wheel(document.body, { deltaY: -1, deltaMode: 2 });
    wheel(document.body, { deltaY: 10000 });
    expect(forward.mock.calls).toEqual([[32], [-874], [2000]]);
  });

  test('removes the listener on unmount', () => {
    uninstall?.();
    expect(wheel(document.body).defaultPrevented).toBe(false);
    expect(forward).not.toHaveBeenCalled();
  });

  test('parent continues in its nearest scrolling pane before the page', () => {
    const outer = pane(500, 800, 280);
    const inner = pane(200, 400, 170);
    const frame = document.createElement('iframe');
    inner.append(frame);
    outer.append(inner);
    document.body.append(outer);
    const windowScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    scrollPreviewParent(frame, 100);
    expect(inner.scrollTop).toBe(200);
    expect(outer.scrollTop).toBe(300);
    expect(windowScroll).toHaveBeenCalledExactlyOnceWith({ top: 50, behavior: 'instant' });
    windowScroll.mockClear();
    scrollPreviewParent(frame, -60);
    expect(inner.scrollTop).toBe(140);
    expect(windowScroll).not.toHaveBeenCalled();
  });

  test.each([null, undefined, '60', Number.NaN, Infinity, -Infinity, 0, 2001])('rejects malformed scroll payload %s', (delta) => {
    expect(isPreviewScrollDelta(delta)).toBe(false);
  });
});
