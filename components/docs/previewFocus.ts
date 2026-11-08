/**
 * Focus in a phone view. Until the reader is inside the iframe, nothing in it takes focus: a dialog that opens with
 * its page, an autoFocus field, a menu opened from a control above the phone. Moving focus into an iframe pulls it
 * out of the docs page, and the browser scrolls the page to that iframe, even for `focus({ preventScroll: true })`:
 * switching a page to Phone jumped to whichever example focused last.
 */
export type PreviewFocusGuard = {
  /** The docs page asked for focus here (its keyboard command): this iframe's focus calls work from now on. */
  engage: () => void;
  destroy: () => void;
};

export function installPreviewFocusGuard(view: Window & typeof globalThis): PreviewFocusGuard {
  let engaged = false;
  const restore: Array<() => void> = [];
  for (const prototype of [view.HTMLElement.prototype, view.SVGElement.prototype]) {
    const own = Object.getOwnPropertyDescriptor(prototype, 'focus');
    const native = prototype.focus;
    if (typeof native !== 'function') continue;
    Object.defineProperty(prototype, 'focus', {
      configurable: true,
      writable: true,
      value: function focus(this: HTMLElement | SVGElement, options?: FocusOptions) {
        // The reader is in this iframe once its document has focus: a tap, a click, Tab into it.
        if (!engaged && !view.document.hasFocus()) return;
        native.call(this, options);
      },
    });
    restore.push(() => {
      if (own) Object.defineProperty(prototype, 'focus', own);
      else delete (prototype as { focus?: unknown }).focus;
    });
  }
  return {
    engage() {
      engaged = true;
    },
    destroy() {
      restore.forEach((undo) => undo());
    },
  };
}

let guard: PreviewFocusGuard | null = null;

/** The guard of this phone view, installed once before the example hydrates; null on a docs page itself. */
export function previewFocusGuard(): PreviewFocusGuard | null {
  if (guard || typeof window === 'undefined' || window.parent === window || !window.location.pathname.startsWith('/preview/')) return guard;
  guard = installPreviewFocusGuard(window);
  return guard;
}
