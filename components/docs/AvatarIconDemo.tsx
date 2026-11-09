'use client';

import type { SVGProps } from 'react';
import { Fragment, useState } from 'react';
import { Avatar } from '@plexui/ui/components/Avatar';
import { Robot } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { SliderValueControl } from './SliderValueControl';

const IconRobot = Robot as React.ComponentType<SVGProps<SVGSVGElement>>;
const COLOR_OPTIONS = ['primary', 'secondary', 'success', 'danger', 'info', 'discovery'] as const;
const VARIANT_OPTIONS = ['soft', 'solid'] as const;
const ROUNDNESS_OPTIONS = [
  'rounded-full',
  'rounded-xl',
  'rounded-lg',
  'rounded-md',
  'rounded-sm',
  'rounded-none',
] as const;

export function AvatarSizingDemo() {
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
      <div
        data-demo-stage
        className="flex-1 w-full py-12 flex items-center justify-center"
      >
        <Avatar name="David" size={size} />
      </div>
    </>
  );
}

export function AvatarIconDemo() {
  return <Avatar Icon={IconRobot} size={48} />;
}

export function AvatarOverflowCountDemo() {
  const [size, setSize] = useState(48);
  const [count, setCount] = useState(9);


  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="overflowCount">
          <SliderValueControl
            ariaLabel="overflowCount"
            min={1}
            max={999}
            step={1}
            value={count}
            onChange={setCount}
            width="min(42vw, 340px)"
          />
        </DemoControlRow>
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
      <div
        data-demo-stage
        className="flex-1 w-full py-12 flex items-center justify-center"
      >
        <Avatar overflowCount={count} size={size} />
      </div>
    </>
  );
}

export function AvatarHeroStorybookDemo() {
  return (
    <>
      <Avatar
        name="Tyler"
        imageUrl="https://gravatar.com/avatar/9531b260b9693f3394bea8646c6ea141ce58fe5a138b7db7729d60a4c5dde552"
        size={48}
      />
      <Avatar name="Will" size={48} />
      <Avatar name="Tech support" Icon={IconRobot} size={48} color="primary" variant="solid" />
    </>
  );
}

export const AvatarHeroContent = AvatarHeroStorybookDemo;

export function AvatarInteractiveDemo() {
  return (
    <div className="flex items-center gap-4">
      <Avatar name="Will" size={48} onClick={() => {}} />
      <Avatar
        imageUrl="https://gravatar.com/avatar/9531b260b9693f3394bea8646c6ea141ce58fe5a138b7db7729d60a4c5dde552"
        name="Tyler"
        size={48}
        onClick={() => {}}
      />
      <Avatar name="Tech support" Icon={IconRobot} size={48} color="info" onClick={() => {}} />
    </div>
  );
}

export function AvatarColorsDemo() {
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
      <div
        data-demo-stage
        className="flex-1 w-full py-8 flex items-center justify-center"
      >
        <div
          className="grid items-center gap-x-8 gap-y-5"
          style={{
            gridTemplateColumns: `repeat(${VARIANT_OPTIONS.length}, minmax(0, auto)) auto`,
            justifyItems: 'center',
          }}
        >
          {VARIANT_OPTIONS.map((variant) => (
            <div
              key={`h-${variant}`}
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {variant}
            </div>
          ))}
          <div />
          {COLOR_OPTIONS.map((color, idx) => (
            <Fragment key={color}>
              {VARIANT_OPTIONS.map((variant) => (
                <Avatar
                  key={`${color}-${variant}`}
                  name={String.fromCharCode(65 + idx)}
                  color={color}
                  variant={variant}
                  size={size}
                />
              ))}
              <div
                className="text-sm font-medium justify-self-start"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {color}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

export function AvatarRoundnessDemo() {
  const [rounded, setRounded] = useState<(typeof ROUNDNESS_OPTIONS)[number]>('rounded-lg');
  const [size, setSize] = useState(48);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="roundness">
          <SegmentedControl<(typeof ROUNDNESS_OPTIONS)[number]>
            value={rounded}
            onChange={setRounded}
            aria-label="roundness"
            size="xs"
          >
            {ROUNDNESS_OPTIONS.map((r) => (
              <SegmentedControl.Option key={r} value={r}>
                {r.replace('rounded-', '')}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
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
      <div
        data-demo-stage
        className="flex-1 w-full py-12 flex items-center justify-center"
      >
        <Avatar
          name="Acme, co."
          color="primary"
          variant="solid"
          size={size}
          className={rounded}
        />
      </div>
    </>
  );
}
