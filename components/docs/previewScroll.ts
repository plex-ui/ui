/** Wheel chaining for docs iframes. Real touch and product scroll locks stay native. */
const MAX_WHEEL_DELTA = 2000;
const SCROLL_EPSILON = 1;

function scrollable(element: Element): boolean {
  const overflow = getComputedStyle(element).overflowY;
  return /^(auto|scroll|overlay)$/.test(overflow)
    && element.scrollHeight > element.clientHeight + SCROLL_EPSILON;
}

function canScroll(element: Element, delta: number): boolean {
  return delta < 0
    ? element.scrollTop > SCROLL_EPSILON
    : element.scrollTop + element.clientHeight < element.scrollHeight - SCROLL_EPSILON;
}

export function isPreviewScrollDelta(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
    && value !== 0 && Math.abs(value) <= MAX_WHEEL_DELTA;
}

/** Capture before modal scroll locks; include menus portalled outside the preview root. */
export function installPreviewScrollBridge(doc: Document, forward: (delta: number) => void): () => void {
  const onWheel = (event: WheelEvent) => {
    if (!event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey
      || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? doc.documentElement.clientHeight : 1;
    const pixels = event.deltaY * unit;
    if (!Number.isFinite(pixels) || pixels === 0) return;
    const delta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, pixels));
    for (const target of event.composedPath()) {
      if (target instanceof Element && target !== doc.documentElement && target !== doc.body
        && target !== doc.scrollingElement && scrollable(target) && canScroll(target, delta)) return;
    }
    const root = doc.scrollingElement;
    // Viewport overflow can use the default 'visible' value. A modal's body lock wins.
    if (root && ![doc.documentElement, doc.body].some((el) => /^(hidden|clip)$/.test(getComputedStyle(el).overflowY))
      && canScroll(root, delta)) return;
    event.preventDefault();
    forward(delta);
  };
  doc.addEventListener('wheel', onWheel, { capture: true, passive: false });
  return () => doc.removeEventListener('wheel', onWheel, true);
}

/** Resume scrolling in the containing docs pane, then the page if that pane ends. */
export function scrollPreviewParent(frame: HTMLIFrameElement, delta: number): void {
  if (!isPreviewScrollDelta(delta)) return;
  let remaining = delta;
  const doc = frame.ownerDocument;
  for (let node = frame.parentElement; node && node !== doc.scrollingElement; node = node.parentElement) {
    if (!scrollable(node) || !canScroll(node, remaining)) continue;
    const before = node.scrollTop;
    node.scrollBy({ top: remaining, behavior: 'instant' });
    remaining -= node.scrollTop - before;
    if (Math.abs(remaining) < SCROLL_EPSILON) return;
  }
  doc.defaultView?.scrollBy({ top: remaining, behavior: 'instant' });
}
