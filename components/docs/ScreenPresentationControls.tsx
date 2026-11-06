'use client';

import { useState } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow } from './ButtonDemos';

export type ScreenSurface = 'plain' | 'grouped';

/** Keep presentation choices beside the screen's domain state, above either layout. */
export function useScreenPresentation() {
  const [dialog, setDialog] = useState(false);
  const [surface, setSurface] = useState<ScreenSurface>('grouped');
  return { dialog, setDialog, surface, setSurface };
}

/** Rows only: the caller owns the shared data-demo-controls container. */
export function ScreenPresentationControls({ dialog, setDialog, surface, setSurface }: ReturnType<typeof useScreenPresentation>) {
  return <>
    <DemoControlBoolean name="dialog" value={dialog} onChange={setDialog} />
    <DemoControlRow name="surface" phoneOnly>
      <SegmentedControl size="xs" value={surface} onChange={setSurface} aria-label="Surface">
        <SegmentedControl.Option value="grouped">Grouped</SegmentedControl.Option>
        <SegmentedControl.Option value="plain">Plain</SegmentedControl.Option>
      </SegmentedControl>
    </DemoControlRow>
  </>;
}
