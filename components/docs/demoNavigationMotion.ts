export type DemoNavigation = { step: number; direction: 'forward' | 'back' };

// PlexUI web timing, not an estimate of a native spring from static references.
export const demoNavigationTiming = { enterDuration: 300, exitDuration: 300 };
const outgoingFormIds = new WeakMap<Element, Array<[HTMLFormElement, string]>>();

export function hideExitingDemoScreen(element: HTMLElement | SVGElement): void {
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('inert', '');
  const direction = element.closest<HTMLElement>('[data-demo-navigation-direction], [data-settings-direction]');
  element.dataset.demoExitDirection = direction?.dataset.demoNavigationDirection ?? direction?.dataset.settingsDirection ?? 'forward';
  // Freeze this departure's scroll compensation before a later navigation
  // changes the TransitionGroup style again. Keep the Settings87 caller valid.
  const offset = element.style.getPropertyValue('--demo-navigation-exit-scroll-offset') || element.style.getPropertyValue('--settings-exit-scroll-offset');
  if (offset) element.style.top = offset;
  // The incoming screen covers this one to its full height, even when it is shorter (DemoNavigation.module.css).
  element.parentElement?.style.setProperty('--demo-navigation-exit-height', `${element.getBoundingClientRect().height}px`);
  // A pinned CTA must only target the entering form during the transition.
  const ids: Array<[HTMLFormElement, string]> = [];
  element.querySelectorAll<HTMLFormElement>('form[id]').forEach((form) => {
    ids.push([form, form.id]);
    form.removeAttribute('id');
  });
  if (ids.length) outgoingFormIds.set(element, ids);
}

export function showEnteringDemoScreen(element: HTMLElement | SVGElement): void {
  element.removeAttribute('aria-hidden');
  element.removeAttribute('inert');
  delete element.dataset.demoExitDirection;
  element.style.removeProperty('top');
  outgoingFormIds.get(element)?.forEach(([form, id]) => {
    // The current render can have replaced the form or supplied a new ID.
    if (form.isConnected && !form.hasAttribute('id')) form.id = id;
  });
  outgoingFormIds.delete(element);
}
