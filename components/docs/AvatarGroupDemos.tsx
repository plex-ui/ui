'use client';

import type { SVGProps } from 'react';
import { useState } from 'react';
import { Avatar, AvatarGroup } from '@plexui/ui/components/Avatar';
import { Robot } from '@plexui/ui/components/Icon';
import { DemoControlRow, Segments, controlsTableStyle } from './ButtonDemos';
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

const STACKS = ['start', 'end'] as const;

/**
 * The Overview, one group with every setting: what the page's examples once showed one by one (Stacking direction,
 * Group sizing) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»).
 * `stack` says which avatar lies on top: the first (`start`) or the last (`end`); `size` sets every avatar of the group.
 * A group has no phone presentation of its own: on a phone it is the same group.
 */
export function AvatarGroupOverviewDemo() {
  const [stack, setStack] = useState<(typeof STACKS)[number]>('start');
  const [size, setSize] = useState(42);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="stack" options={STACKS} value={stack} onChange={setStack} />
        <DemoControlRow name="size">
          <SliderValueControl ariaLabel="size" min={14} max={80} step={2} value={size} onChange={setSize} width="min(42vw, 340px)" />
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <AvatarGroup stack={stack} size={size}>
          <Avatar name="Tyler" imageUrl={AVATAR_IMAGE_URL} />
          <Avatar name="Jane" color="primary" variant="solid" />
          <Avatar name="Tech support" Icon={IconRobot} variant="solid" />
          <Avatar overflowCount={5} />
        </AvatarGroup>
      </div>
    </>
  );
}
