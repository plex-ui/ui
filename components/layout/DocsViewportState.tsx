'use client';

import { useEffect, useLayoutEffect } from 'react';

export function DocsViewportState({
  showLeftSidebar,
  showRightSidebar,
}: {
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
}) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute(
      'data-docs-left-sidebar',
      showLeftSidebar ? 'on' : 'off'
    );
    document.documentElement.setAttribute(
      'data-docs-right-sidebar',
      showRightSidebar ? 'on' : 'off'
    );
  }, [showLeftSidebar, showRightSidebar]);

  useEffect(() => {
    // Popover wrappers take their z-index from globals.css (!important), so nothing here writes to them.
    const applyScrollPolicy = () => {
      const leftViewport = document.querySelector<HTMLElement>(
        '#nd-sidebar .overscroll-contain'
      );
      if (leftViewport) {
        const fitsLeft = leftViewport.scrollHeight <= leftViewport.clientHeight + 1;
        leftViewport.style.overflowY = fitsLeft ? 'hidden' : 'auto';
        leftViewport.style.overscrollBehavior = 'contain';
      }

      const rightViewport = document.getElementById('nd-toc');
      if (rightViewport) {
        const fits = rightViewport.scrollHeight <= rightViewport.clientHeight + 1;
        rightViewport.style.overflowY = fits ? 'hidden' : 'auto';
        rightViewport.style.overscrollBehavior = 'contain';
      }
    };

    const frame = window.requestAnimationFrame(applyScrollPolicy);
    const timeout = window.setTimeout(applyScrollPolicy, 120);
    const timeoutLate = window.setTimeout(applyScrollPolicy, 420);
    const resizeObserver = new ResizeObserver(() => applyScrollPolicy());
    let leftViewport = document.querySelector<HTMLElement>(
      '#nd-sidebar .overscroll-contain'
    );
    let rightViewport = document.getElementById('nd-toc');
    // The policy reads the scroll sizes of the two sidebars, which makes the browser lay out the page. Run it only when
    // a change lands in a sidebar (or one of them is replaced), not on every change in the page, such as an example
    // opening a sheet.
    const mutationObserver = new MutationObserver((records) => {
      const left = document.querySelector<HTMLElement>('#nd-sidebar .overscroll-contain');
      const right = document.getElementById('nd-toc');
      const replaced = left !== leftViewport || right !== rightViewport;
      if (left && left !== leftViewport) resizeObserver.observe(left);
      if (right && right !== rightViewport) {
        resizeObserver.observe(right);
        mutationObserver.observe(right, { childList: true, subtree: true, attributes: true });
      }
      leftViewport = left;
      rightViewport = right;
      if (replaced || records.some(({ target }) => left?.contains(target) || right?.contains(target))) applyScrollPolicy();
    });

    if (leftViewport) resizeObserver.observe(leftViewport);
    if (rightViewport) {
      resizeObserver.observe(rightViewport);
      mutationObserver.observe(rightViewport, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('resize', applyScrollPolicy);
    window.addEventListener('hashchange', applyScrollPolicy);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.clearTimeout(timeoutLate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', applyScrollPolicy);
      window.removeEventListener('hashchange', applyScrollPolicy);
    };
  }, [showLeftSidebar, showRightSidebar]);

  return null;
}
