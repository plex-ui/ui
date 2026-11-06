import { demoNavigationTiming, hideExitingDemoScreen, showEnteringDemoScreen } from './demoNavigationMotion';

// Web navigation adaptation: use PlexUI's existing large-motion duration/easing.
// The static iOS reference does not establish native timing or spring physics.
export const settingsNavigationTiming = demoNavigationTiming;

export const hideExitingSettingsScreen = (element: HTMLElement | SVGElement): void => {
  hideExitingDemoScreen(element);
  // Freeze an exit already in flight if the user immediately navigates again.
  element.dataset.settingsExitDirection = element.closest<HTMLElement>('[data-settings-direction]')?.dataset.settingsDirection ?? 'forward';
  element.style.top = element.style.getPropertyValue('--settings-exit-scroll-offset') || '0px';
};

export const showEnteringSettingsScreen = (element: HTMLElement | SVGElement): void => {
  showEnteringDemoScreen(element);
  delete element.dataset.settingsExitDirection;
  element.style.removeProperty('top');
};
