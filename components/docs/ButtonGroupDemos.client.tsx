'use client';

/**
 * The demos of `content/components/button-group.mdx`, drawn on the server like every other page (plan 175.3).
 * They were client-only for a useId drift between the server and the browser around the size toggle; the
 * page now hydrates without it, so the re-export only keeps the import path of the page.
 */

export {
  ButtonGroupOverviewDemo,
  ButtonGroupOrientationDemo,
  ButtonGroupSeparatorDemo,
  ButtonGroupInputDemo,
  ButtonGroupInputGroupDemo,
  ButtonGroupDropdownMenuDemo,
  ButtonGroupSelectDemo,
  ButtonGroupPopoverDemo,
} from './ButtonGroupDemos';
