'use client';

import type { ComponentProps } from 'react';
import { markRaw } from 'vue';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { SetupChoicesDemo } from './SetupChoicesSheet';
import { ViewOptionsSheetDemo } from './ViewOptionsSheet';

export function VueDialogViewOptionsDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  return <VueDemo template={'<component :is="ViewOptionsSheetDemo" :initial-open="phonePreview" />'}
    state={{ ViewOptionsSheetDemo: markRaw(ViewOptionsSheetDemo) }} context={{ phonePreview }} />;
}

export function VueDialogSetupChoicesDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  return <VueDemo template={'<component :is="SetupChoicesDemo" :initial-open="phonePreview" :layout="layout" :subtitles="subtitles" />'}
    state={{ SetupChoicesDemo: markRaw(SetupChoicesDemo) }} context={{ phonePreview }}
    controls={[
      { name: 'layout', type: 'select', options: ['grouped', 'separate'], default: 'grouped' },
      { name: 'subtitles', type: 'boolean', default: false },
    ]} />;
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
