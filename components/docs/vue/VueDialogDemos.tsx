'use client';

import type { ComponentProps } from 'react';
import { markRaw } from 'vue';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { ViewOptionsSheetDemo } from './ViewOptionsSheet';

export function VueDialogViewOptionsDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  return <VueDemo template={'<component :is="ViewOptionsSheetDemo" :initial-open="phonePreview" />'}
    state={{ ViewOptionsSheetDemo: markRaw(ViewOptionsSheetDemo) }} context={{ phonePreview }} />;
}

export function VueDialogPlacementDemo(props: ComponentProps<typeof VueDemo>) {
  const phone = usePhoneViewport();
  return (
    <VueDemo
      {...props}
      key={phone ? 'phone' : 'desktop'}
      controls={[{
        name: 'placement',
        type: 'select',
        options: phone ? ['bottom', 'fullscreen'] : ['center', 'top', 'bottom', 'start', 'end', 'fullscreen'],
        default: phone ? 'bottom' : 'end',
      }]}
    />
  );
}

export function VueDialogDetailsDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  const wide = useBreakpoint('md');
  return <VueDemo {...props} key={String(wide)} state={{ ...state, wide }} />;
}
