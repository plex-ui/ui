'use client';

import { useState } from 'react';
import { CopyTooltip } from '@plexui/ui/components/Tooltip';
import { Button } from '@plexui/ui/components/Button';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { SliderValueControl } from './SliderValueControl';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';

const SIDE_OPTIONS = ['top', 'right', 'bottom', 'left'] as const;
const ALIGN_OPTIONS = ['start', 'center', 'end'] as const;

export function CopyTooltipBaseDemo() {
  const [openDelay, setOpenDelay] = useState(150);
  const [sideOffset, setSideOffset] = useState(5);
  const [alignOffset, setAlignOffset] = useState(0);
  const [side, setSide] = useState<(typeof SIDE_OPTIONS)[number]>('top');
  const [align, setAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('center');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {/* A tap copies and opens the tooltip at once: the hover delay is for a pointer only */}
        <DemoControlRow name="openDelay" desktopOnly>
          <SliderValueControl
            ariaLabel="openDelay"
            min={0}
            max={1500}
            step={50}
            value={openDelay}
            onChange={setOpenDelay}
            width="min(42vw, 340px)"
          />
        </DemoControlRow>
        <DemoControlRow name="sideOffset">
          <SliderValueControl
            ariaLabel="sideOffset"
            min={0}
            max={40}
            step={1}
            value={sideOffset}
            onChange={setSideOffset}
            width="min(42vw, 340px)"
          />
        </DemoControlRow>
        <DemoControlRow name="alignOffset">
          <SliderValueControl
            ariaLabel="alignOffset"
            min={0}
            max={40}
            step={1}
            value={alignOffset}
            onChange={setAlignOffset}
            width="min(42vw, 340px)"
          />
        </DemoControlRow>
        <DemoControlRow name="side">
          <SegmentedControl<(typeof SIDE_OPTIONS)[number]>
            value={side}
            onChange={setSide}
            aria-label="side"
            size="xs"
          >
            {SIDE_OPTIONS.map((option) => (
              <SegmentedControl.Option key={option} value={option}>
                {option}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="align">
          <SegmentedControl<(typeof ALIGN_OPTIONS)[number]>
            value={align}
            onChange={setAlign}
            aria-label="align"
            size="xs"
          >
            {ALIGN_OPTIONS.map((option) => (
              <SegmentedControl.Option key={option} value={option}>
                {option}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage>
        <CopyTooltip
          copyValue="sess_12345abcdefg"
          openDelay={openDelay}
          align={align}
          sideOffset={sideOffset}
          side={side}
          alignOffset={alignOffset}
        >
          <Button color="secondary" variant="ghost" size="xl" aria-label="Copy session ID">
            sess_12345abcdefg
          </Button>
        </CopyTooltip>
      </div>
    </>
  );
}
