// Plain module (no 'use client'), so MDX pages can render it on the server.
import Link from 'next/link';
import type { ReactNode } from 'react';

type Slug = 'menu' | 'context-menu' | 'select' | 'select-control';

/**
 * The "which to use" paragraph of the four pages of the iOS menu (owner 10.11: «чтобы было понятно что и где
 * искать»). iOS has one menu (UIMenu) and opens it three ways: from a button of actions (Menu), from a button that
 * shows a value, a pop-up button (Select), and from a touch and hold on an element (Context Menu); Select Control is
 * that value button alone. The sidebar lists them by name with the other components, as flat kits do (owner 10.11:
 * one nested group there looked out of place), so this line and Related components tie them together, and the phone
 * row they share is described once, on Menu.
 */
export function MenuFamilyNote({ current, framework = 'react' }: { current: Slug; framework?: 'react' | 'vue' }) {
  const base = framework === 'vue' ? '/vue/components' : '/components';
  const name = (slug: Slug, label: string): ReactNode =>
    slug === current ? <strong>{label}</strong> : <Link href={`${base}/${slug}`}>{label}</Link>;

  return (
    <p>
      One iOS menu, opened three ways: {name('menu', 'Menu')} from a button of actions, {name('select', 'Select')}{' '}
      from a button that shows a value, as an iOS pop-up button, and {name('context-menu', 'Context Menu')} from a
      touch and hold or a secondary click on an element. {name('select-control', 'Select Control')}{" is Select's "}
      button alone, for a list of your own. On a phone the three menus draw the same rows, described once under{' '}
      <Link href={`${base}/menu#on-a-phone`}>Menu › On a phone</Link>.
    </p>
  );
}
