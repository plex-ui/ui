'use client';

import type { ComponentProps } from 'react';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { VueDemo } from './VueDemo';
import styles from '../FormRowsDemos.module.css';

/** Full form compositions share the Page shell with the React examples. */
export function VueFormScreenDemo({ state, stageClassName, ...props }: ComponentProps<typeof VueDemo>) {
  const wide = useBreakpoint('md');
  return <VueDemo {...props} state={{ ...state, wide }} stageClassName={`${styles.ScreenStage} ${stageClassName ?? 'flex justify-center py-10'}`} />;
}
