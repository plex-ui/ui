'use client';

import type { SVGProps } from 'react';
import { useState } from 'react';
import { Avatar, AvatarGroup } from '@plexui/ui/components/Avatar';
import { Robot } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { SliderValueControl } from './SliderValueControl';

const IconRobot = Robot as React.ComponentType<SVGProps<SVGSVGElement>>;
const AVATAR_IMAGE_URL =
  'https://gravatar.com/avatar/9531b260b9693f3394bea8646c6ea141ce58fe5a138b7db7729d60a4c5dde552';

export function AvatarGroupHeroContent() {
  return (
    <AvatarGroup size={48}>
      <Avatar
        name="Tyler"
        imageUrl={AVATAR_IMAGE_URL}
      />
      <Avatar name="Will" color="info" />
      <Avatar name="Tech support" Icon={IconRobot} color="discovery" />
      <Avatar overflowCount={5} color="success" variant="soft" />
    </AvatarGroup>
  );
}

export function AvatarGroupBaseDemo() {
  return (
    <AvatarGroup size={42}>
      <Avatar
        name="Tyler"
        imageUrl={AVATAR_IMAGE_URL}
      />
      <Avatar name="Jane" color="primary" variant="solid" />
      <Avatar name="Tech support" Icon={IconRobot} variant="solid" />
      <Avatar overflowCount={5} />
    </AvatarGroup>
  );
}

export function AvatarGroupDirectionDemo() {
  const [stack, setStack] = useState<'start' | 'end'>('end');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="stack">
          <SegmentedControl<'start' | 'end'>
            value={stack}
            onChange={setStack}
            aria-label="stack"
            size="xs"
          >
            <SegmentedControl.Option value="start">start</SegmentedControl.Option>
            <SegmentedControl.Option value="end">end</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <AvatarGroup stack={stack} size={42}>
          <Avatar
            name="Tyler"
            imageUrl={AVATAR_IMAGE_URL}
          />
          <Avatar name="Will" />
          <Avatar name="Tech support" Icon={IconRobot} variant="solid" />
          <Avatar overflowCount={5} variant="soft" />
        </AvatarGroup>
      </div>
    </>
  );
}

export function AvatarGroupSizingDemo() {
  const [size, setSize] = useState(48);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SliderValueControl
            ariaLabel="size"
            min={14}
            max={80}
            step={2}
            value={size}
            onChange={setSize}
            width="min(42vw, 340px)"
          />
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <AvatarGroup size={size}>
          <Avatar name="Tyler" color="info" />
          <Avatar name="Jane" color="discovery" />
          <Avatar name="Will" color="danger" />
          <Avatar overflowCount={5} />
        </AvatarGroup>
      </div>
    </>
  );
}
