'use client';

import { useLayoutEffect } from 'react';

/** How long the page must keep its size before the linked section is left alone. */
const SETTLED_MS = 1500;
/** The longest a slow page may take to settle. */
const LIMIT_MS = 15000;
const READER_INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

/**
 * Opened at a section link (`#section`), the browser scrolls to the section before the examples hydrate. Then each
 * example picks its phone or desktop composition and shows its controls, so the sections above it can grow or shrink
 * and carry the linked heading away (on Toolbar by about 450px, on Date Picker out of the window). Until the reader
 * scrolls, clicks or types, keep the linked heading where the link put it while the page settles. A reload or a step
 * back in history keeps the position the browser restores.
 */
export function KeepLinkedSectionInView() {
  // A layout effect, so the observer is in place before the hydrated page is first painted: each resize is then
  // answered before the browser paints the moved heading.
  useLayoutEffect(() => {
    const hash = window.location.hash.slice(1);
    let id = hash;
    try {
      id = decodeURIComponent(hash);
    } catch {
      // A malformed escape, such as `#100%`: look the id up as written.
    }
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!id || (navigation && navigation.type !== 'navigate')) return;

    let settled = 0;
    let kept: number | undefined;
    const keep = () => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
      kept = window.scrollY;
      window.clearTimeout(settled);
      settled = window.setTimeout(stop, SETTLED_MS);
    };
    // Scrolling that the page did not do, such as dragging the scrollbar, which may send no pointer event.
    const scrolled = () => {
      if (kept !== undefined && Math.abs(window.scrollY - kept) > 1) stop();
    };
    const observer = new ResizeObserver(keep);
    const limit = window.setTimeout(stop, LIMIT_MS);
    function stop() {
      observer.disconnect();
      window.clearTimeout(settled);
      window.clearTimeout(limit);
      READER_INPUT.forEach((type) => window.removeEventListener(type, stop));
      window.removeEventListener('scroll', scrolled);
    }

    READER_INPUT.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    window.addEventListener('scroll', scrolled, { passive: true });
    observer.observe(document.body);
    return stop;
  }, []);

  return null;
}
