'use client';

import type { ComponentProps } from 'react';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePhoneViewport } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';

/** The same settings rows in Phone previews and on a real narrow viewport. */
export function VueSwitchDemo({ template, phoneTemplate, stageClassName, phoneStageClassName, controls = [], desktopControls = [], ...props }: ComponentProps<typeof VueDemo> & { desktopControls?: ComponentProps<typeof VueDemo>['controls']; phoneStageClassName?: string }) {
  const preview = usePhoneViewport();
  const wide = useBreakpoint('md');
  const phone = preview || !wide;
  return <VueDemo {...props} controls={phone ? controls : [...controls, ...desktopControls]} template={phone ? phoneTemplate ?? template : template} stageClassName={phone ? phoneStageClassName ?? (stageClassName ? 'w-full' : undefined) : stageClassName} />;
}
