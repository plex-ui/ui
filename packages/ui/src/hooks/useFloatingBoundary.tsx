'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import {
    observeFloatingFooter,
    sameFloatingFooterInset,
    type FloatingFooterInset,
} from '../lib/floatingBoundary';

type BoundaryScope = {
    root: HTMLElement | null;
    footer: HTMLElement | null;
    setRoot: (element: HTMLElement | null) => void;
    setFooter: (element: HTMLElement | null) => void;
};
type CollisionPadding = Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;

const FloatingBoundaryContext = createContext<BoundaryScope | null>(null);
export const FloatingBoundaryProvider = FloatingBoundaryContext.Provider;

/** A nested Dialog deliberately starts a new scope even before its footer mounts. */
export function useFloatingBoundaryScope(): BoundaryScope {
    const [root, setRoot] = useState<HTMLElement | null>(null);
    const [footer, setFooter] = useState<HTMLElement | null>(null);
    return useMemo(() => ({ root, footer, setRoot, setFooter }), [root, footer]);
}

export const useFloatingBoundaryRegistration = () => useContext(FloatingBoundaryContext);

export function useFloatingBoundary(active: boolean, padding: CollisionPadding) {
    const scope = useContext(FloatingBoundaryContext);
    const root = scope?.root;
    const footer = scope?.footer;
    const [inset, setInset] = useState<FloatingFooterInset>(null);
    useLayoutEffect(() => {
        const update = (next: FloatingFooterInset) =>
            setInset((current) => (sameFloatingFooterInset(current, next) ? current : next));
        if (!active || !root || !footer) {
            update(null);
            return;
        }
        return observeFloatingFooter(root, footer, update);
    }, [active, root, footer]);

    // Ignore a retained measurement while a scope is being replaced or closed.
    const current = active && inset?.boundary === root && footer ? inset : null;
    return current
        ? {
              collisionBoundary: current.boundary,
              collisionPadding: { ...padding, bottom: (padding.bottom ?? 0) + current.bottom },
          }
        : { collisionPadding: padding };
}
