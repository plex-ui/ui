import {
    computed,
    inject,
    provide,
    shallowRef,
    watch,
    type InjectionKey,
    type ShallowRef,
} from 'vue';
import {
    observeFloatingFooter,
    sameFloatingFooterInset,
    type FloatingFooterInset,
} from '../lib/floatingBoundary.js';

type BoundaryScope = {
    root: ShallowRef<HTMLElement | null>;
    footer: ShallowRef<HTMLElement | null>;
    setRoot: (element: unknown) => void;
    setFooter: (element: unknown) => void;
};
type CollisionPadding = Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
const FloatingBoundaryKey: InjectionKey<BoundaryScope> = Symbol('PlexUIFloatingBoundary');

/** A nested Dialog deliberately starts a new scope even before its footer mounts. */
export function provideFloatingBoundaryScope(): BoundaryScope {
    const root = shallowRef<HTMLElement | null>(null);
    const footer = shallowRef<HTMLElement | null>(null);
    const scope = {
        root,
        footer,
        setRoot: (node: unknown) => {
            root.value = node instanceof HTMLElement ? node : null;
        },
        setFooter: (node: unknown) => {
            footer.value = node instanceof HTMLElement ? node : null;
        },
    };
    provide(FloatingBoundaryKey, scope);
    return scope;
}

export const useFloatingBoundaryRegistration = () => inject(FloatingBoundaryKey, null);

export function useFloatingBoundary(active: () => boolean, padding: CollisionPadding) {
    const scope = useFloatingBoundaryRegistration();
    const inset = shallowRef<FloatingFooterInset>(null);
    watch(
        [active, () => scope?.root.value, () => scope?.footer.value],
        ([enabled, root, footer], _previous, onCleanup) => {
            const update = (next: FloatingFooterInset) => {
                if (!sameFloatingFooterInset(inset.value, next)) inset.value = next;
            };
            if (!enabled || !root || !footer) {
                update(null);
                return;
            }
            onCleanup(observeFloatingFooter(root, footer, update));
        },
        { immediate: true, flush: 'post' },
    );

    return computed(() => {
        const current =
            active() && inset.value?.boundary === scope?.root.value && scope?.footer.value
                ? inset.value
                : null;
        return current
            ? {
                  collisionBoundary: current.boundary,
                  collisionPadding: { ...padding, bottom: (padding.bottom ?? 0) + current.bottom },
              }
            : { collisionPadding: padding };
    });
}
