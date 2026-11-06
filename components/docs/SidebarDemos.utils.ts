/** Leaf navigation closes the drawer; disclosure and popup buttons keep it open. */
export function isSidebarNavigationSelection(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const button = target.closest('[data-active]');
  return Boolean(button && !button.hasAttribute('aria-haspopup') &&
    !button.hasAttribute('aria-expanded') && !button.closest('li')?.querySelector(':scope > ul'));
}

