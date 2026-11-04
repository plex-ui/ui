'use client';

import type { ComponentProps } from 'react';
import { usePhoneViewport } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';

export function VueDialogPlacementDemo(props: ComponentProps<typeof VueDemo>) {
  const phone = usePhoneViewport();
  return (
    <VueDemo
      {...props}
      key={phone ? 'phone' : 'desktop'}
      controls={[{
        name: 'placement',
        type: 'select',
        options: phone ? ['center', 'bottom', 'fullscreen'] : ['center', 'top', 'bottom', 'start', 'end', 'fullscreen'],
        default: phone ? 'center' : 'end',
      }]}
    />
  );
}
