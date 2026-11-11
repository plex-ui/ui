'use client';

import type { SVGProps } from 'react';
import { useState } from 'react';
import { Avatar } from '@plexui/ui/components/Avatar';
import { Robot } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { SliderValueControl } from './SliderValueControl';

const IconRobot = Robot as React.ComponentType<SVGProps<SVGSVGElement>>;
const COLOR_OPTIONS = ['primary', 'secondary', 'success', 'danger', 'info', 'discovery'] as const;
const VARIANT_OPTIONS = ['soft', 'solid'] as const;
const TYPE_OPTIONS = ['text', 'image', 'icon', 'overflow'] as const;
const ROUNDNESS_OPTIONS = ['full', 'xl', 'lg', 'md', 'sm', 'none'] as const;
// A literal class per roundness, so Tailwind finds each one in the source
const ROUNDED: Record<(typeof ROUNDNESS_OPTIONS)[number], string> = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  lg: 'rounded-lg',
  md: 'rounded-md',
  sm: 'rounded-sm',
  none: 'rounded-none',
};
const IMAGE_URL = 'https://gravatar.com/avatar/9531b260b9693f3394bea8646c6ea141ce58fe5a138b7db7729d60a4c5dde552';

function Segments<T extends string>({ name, options, value, onChange }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>
            {option}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

function SizeSlider({ name, min, max, step, value, onChange }: { name: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <DemoControlRow name={name}>
      <SliderValueControl ariaLabel={name} min={min} max={max} step={step} value={value} onChange={onChange} width="min(42vw, 340px)" />
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the avatar: what the page's examples once showed one by one (Text, Image,
 * Icon, Overflow count, Sizing, Colors & variants, Roundness, Interactive) are its settings (owner 11.11: «в первом
 * примере можно сразу показать все со всеми настройками»). `overflowCount` acts only on an overflow avatar, so it is
 * offered only for one; a loaded image covers the color, so `color` and `variant` are offered for every other type.
 * `onClick` makes the avatar a button, named by its `name`. A setting that is not offered keeps its choice and shows
 * its default, as in the Vue demo. */
export function AvatarOverviewDemo() {
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>('text');
  const [size, setSize] = useState(48);
  const [overflowCount, setOverflowCount] = useState(9);
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('secondary');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('soft');
  const [roundness, setRoundness] = useState<(typeof ROUNDNESS_OPTIONS)[number]>('full');
  const [onClick, setOnClick] = useState(false);
  const colored = type !== 'image';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="type" options={TYPE_OPTIONS} value={type} onChange={setType} />
        {type === 'overflow' && <SizeSlider name="overflowCount" min={1} max={999} step={1} value={overflowCount} onChange={setOverflowCount} />}
        <SizeSlider name="size" min={14} max={80} step={2} value={size} onChange={setSize} />
        {colored && <Segments name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />}
        {colored && <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />}
        <Segments name="roundness" options={ROUNDNESS_OPTIONS} value={roundness} onChange={setRoundness} />
        <DemoControlBoolean name="onClick" value={onClick} onChange={setOnClick} />
      </div>
      <div data-demo-stage className="flex-1 w-full py-12 flex items-center justify-center">
        <Avatar
          name={type === 'icon' ? 'Tech support' : type === 'overflow' ? `${overflowCount} more` : 'Tyler'}
          imageUrl={type === 'image' ? IMAGE_URL : undefined}
          Icon={type === 'icon' ? IconRobot : undefined}
          overflowCount={type === 'overflow' ? overflowCount : undefined}
          size={size}
          color={colored ? color : 'secondary'}
          variant={colored ? variant : 'soft'}
          className={ROUNDED[roundness]}
          onClick={onClick ? () => {} : undefined}
        />
      </div>
    </>
  );
}
