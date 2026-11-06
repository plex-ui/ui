'use client';

import type { ReactNode } from 'react';
import { TransitionGroup } from '@plexui/ui/components/Transition';
import { demoNavigationTiming, hideExitingDemoScreen, showEnteringDemoScreen, type DemoNavigation } from './demoNavigationMotion';
import s from './DemoNavigation.module.css';

/** Keep navigation inside its existing Page or Sheet presentation. */
export function DemoNavigationView({ navigation, part = 'content', children }: {
  navigation: DemoNavigation;
  part?: 'content' | 'bar';
  children: ReactNode;
}) {
  const Tag = part === 'bar' ? 'span' : 'div';
  return <Tag className={part === 'bar' ? s.BarViewport : s.Viewport} data-demo-navigation-direction={navigation.direction}>
    <TransitionGroup {...demoNavigationTiming} as={Tag} overlay
      className={part === 'bar' ? s.Bar : s.Content}
      onExit={hideExitingDemoScreen} onEnter={showEnteringDemoScreen}>
      <Tag key={navigation.step}>{children}</Tag>
    </TransitionGroup>
  </Tag>;
}
