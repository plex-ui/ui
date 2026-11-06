'use client';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlRow } from './ButtonDemos';
import { usePreviewEmbed } from './PreviewEmbed';
import { useScreenPresentation } from './ScreenPresentationControls';
import { SegmentedComposer } from './SegmentedComposer';

/** A dedicated Dialog example; only its phone surface is configurable. */
export function DialogSegmentedComposerDemo() {
  const { surface, setSurface } = useScreenPresentation();
  const phonePreview = usePreviewEmbed() !== null;
  return <>
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlRow name="surface" phoneOnly>
        <SegmentedControl size="xs" value={surface} onChange={setSurface} aria-label="Surface">
          <SegmentedControl.Option value="grouped">Grouped</SegmentedControl.Option>
          <SegmentedControl.Option value="plain">Plain</SegmentedControl.Option>
        </SegmentedControl>
      </DemoControlRow>
    </div>
    <SegmentedComposer surface={surface} pinnedOpen={phonePreview} />
  </>;
}
