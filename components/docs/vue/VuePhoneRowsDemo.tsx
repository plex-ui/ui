'use client';

import type { ComponentProps } from 'react';
import { usePhoneRows } from '../PhoneRows';
import { VueDemo } from './VueDemo';

/** The same grouped rows in Phone previews and on a real narrow viewport; desktop controls stay off the phone. */
export function VuePhoneRowsDemo({ template, phoneTemplate, stageClassName, phoneStageClassName, controls = [], desktopControls = [], desktopControlNames = [], ...props }: ComponentProps<typeof VueDemo> & {
  /** Controls shown after `controls` on desktop only */
  desktopControls?: ComponentProps<typeof VueDemo>['controls'];
  /** Names of `controls` left out on a phone, keeping the desktop order */
  desktopControlNames?: string[];
  phoneStageClassName?: string;
}) {
  const phone = usePhoneRows();
  // Every control keeps its value from the first render (a phone layout may come first while the page hydrates);
  // a phone only hides the desktop ones
  const hiddenControls = phone ? [...desktopControlNames, ...desktopControls.map((control) => control.name)] : [];
  return <VueDemo {...props} controls={[...controls, ...desktopControls]} hiddenControls={hiddenControls} template={phone ? phoneTemplate ?? template : template} stageClassName={phone ? phoneStageClassName ?? (stageClassName ? 'w-full' : undefined) : stageClassName} />;
}
