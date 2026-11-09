import { PHONE_LAYOUT_SCOPE } from './phoneLayout';
/** Geometry shared by anchored menus in a Page or Dialog with pinned actions. */
export type FloatingFooterInset = { boundary: HTMLElement; bottom: number } | null;

export function readFloatingFooterInset(
    root: HTMLElement,
    footer: HTMLElement,
): FloatingFooterInset {
    const view = root.ownerDocument.defaultView;
    if (
        !view ||
        !root.isConnected ||
        !footer.isConnected ||
        footer.ownerDocument !== root.ownerDocument
    )
        return null;
    const rootRect = root.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const footerStyle = view.getComputedStyle(footer);
    if (
        rootRect.height <= 0 ||
        footerRect.height <= 0 ||
        footer.hidden ||
        footerStyle.visibility === 'hidden' ||
        footerStyle.visibility === 'collapse'
    )
        return null;

    const viewport = view.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom =
        viewportTop + (viewport?.height ?? root.ownerDocument.documentElement.clientHeight);
    // Popper clips against the element's client box, excluding its bottom border.
    const scale = root.offsetHeight > 0 ? rootRect.height / root.offsetHeight : 1;
    const rootBottom =
        rootRect.bottom -
        Math.max(0, root.offsetHeight - root.clientHeight - root.clientTop) * scale;
    const visibleTop = Math.max(rootRect.top + root.clientTop * scale, viewportTop);
    const visibleBottom = Math.min(rootBottom, viewportBottom);
    if (visibleBottom <= visibleTop || footerRect.bottom <= visibleTop) return null;

    // Clip first, then reserve only the footer portion inside the visible area.
    // A keyboard can clip the Page below its footer; subtracting its full height
    // in that case would unnecessarily shrink the menu a second time.
    const bottom = Math.ceil(Math.max(0, visibleBottom - Math.max(visibleTop, footerRect.top)));
    return { boundary: root, bottom };
}

/** Observe only for the lifetime of an open popup, and only on Phone. */
export function observeFloatingFooter(
    root: HTMLElement,
    footer: HTMLElement,
    onChange: (value: FloatingFooterInset) => void,
): () => void {
    const view = root.ownerDocument.defaultView;
    if (!view || typeof view.matchMedia !== 'function') return () => undefined;
    const media = view.matchMedia('(max-width: 767px)');
    let stopMobile: (() => void) | undefined;
    const start = () => {
        stopMobile?.();
        stopMobile = undefined;
        // A phone layout keeps its phone geometry at any window width
        if (!media.matches && !root.closest(PHONE_LAYOUT_SCOPE)) {
            onChange(null);
            return;
        }
        let frame: number | undefined;
        const measure = () => {
            frame = undefined;
            onChange(readFloatingFooterInset(root, footer));
        };
        const schedule = () => {
            frame ??= view.requestAnimationFrame(measure);
        };
        const resize =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : undefined;
        resize?.observe(root, { box: 'border-box' });
        resize?.observe(footer, { box: 'border-box' });
        const visibility = new MutationObserver(schedule);
        visibility.observe(footer, {
            attributes: true,
            attributeFilter: ['hidden', 'class', 'style'],
        });
        view.addEventListener('scroll', schedule, true);
        view.addEventListener('resize', schedule);
        view.visualViewport?.addEventListener('scroll', schedule);
        view.visualViewport?.addEventListener('resize', schedule);
        measure();
        stopMobile = () => {
            if (frame !== undefined) view.cancelAnimationFrame(frame);
            resize?.disconnect();
            visibility.disconnect();
            view.removeEventListener('scroll', schedule, true);
            view.removeEventListener('resize', schedule);
            view.visualViewport?.removeEventListener('scroll', schedule);
            view.visualViewport?.removeEventListener('resize', schedule);
        };
    };
    media.addEventListener('change', start);
    start();
    return () => {
        media.removeEventListener('change', start);
        stopMobile?.();
    };
}

export function sameFloatingFooterInset(a: FloatingFooterInset, b: FloatingFooterInset): boolean {
    return a === b || (!!a && !!b && a.boundary === b.boundary && a.bottom === b.bottom);
}
