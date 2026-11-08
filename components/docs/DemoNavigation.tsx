'use client';

import { useState, type ReactNode } from 'react';
import { TransitionGroup } from '@plexui/ui/components/Transition';
import { demoNavigationTiming, hideExitingDemoScreen, showEnteringDemoScreen, type DemoNavigation } from './demoNavigationMotion';
import s from './DemoNavigation.module.css';

/** Keep navigation inside its existing Page or Sheet presentation. */
export function DemoNavigationView({ navigation, part = 'content', control, children }: {
  navigation: DemoNavigation;
  part?: 'content' | 'bar';
  /** The bar control this step shows ('back', 'close'): one the step before showed too stays in place. */
  control?: string;
  children: ReactNode;
}) {
  const Tag = part === 'bar' ? 'span' : 'div';
  const [shown, setShown] = useState({ step: navigation.step, control, same: false });
  if (shown.step !== navigation.step) setShown({ step: navigation.step, control, same: control !== undefined && control === shown.control });
  return <Tag className={part === 'bar' ? s.BarViewport : s.Viewport} data-demo-navigation-direction={navigation.direction}
    data-demo-navigation-same={shown.same ? '' : undefined}>
    <TransitionGroup {...demoNavigationTiming} as={Tag} overlay
      className={part === 'bar' ? s.Bar : s.Content}
      onExit={hideExitingDemoScreen} onEnter={showEnteringDemoScreen}>
      <Tag key={navigation.step}>{children}</Tag>
    </TransitionGroup>
  </Tag>;
}
