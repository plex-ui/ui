'use client';

import type { ComponentProps } from 'react';
import { usePhoneRows } from '../PhoneRows';
import { VueDemo } from './VueDemo';

/** The same grouped rows in Phone previews and on a real narrow viewport; desktop controls stay off the phone. */
export function VuePhoneRowsDemo({ template, phoneTemplate, stageClassName, phoneStageClassName, controls = [], desktopControls = [], ...props }: ComponentProps<typeof VueDemo> & { desktopControls?: ComponentProps<typeof VueDemo>['controls']; phoneStageClassName?: string }) {
  const phone = usePhoneRows();
  return <VueDemo {...props} controls={phone ? controls : [...controls, ...desktopControls]} template={phone ? phoneTemplate ?? template : template} stageClassName={phone ? phoneStageClassName ?? (stageClassName ? 'w-full' : undefined) : stageClassName} />;
}
