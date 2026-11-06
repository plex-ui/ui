'use client';

import { useEffect, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import {
  CircularProgress,
  LoadingDots,
  LoadingIndicator,
} from '@plexui/ui/components/Indicator';
import { SliderValueControl } from './SliderValueControl';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';

type CircularProgressProps = ComponentProps<typeof CircularProgress>;

function DemoRangeControlRow({
  name,
  min,
  max,
  step,
  value,
  onChange,
}: {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <DemoControlRow name={name}>
      <SliderValueControl
        ariaLabel={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        width="min(42vw, 340px)"
      />
    </DemoControlRow>
  );
}

export function IndicatorHeroContent() {
  return (
    <div className="flex items-center gap-6">
      <LoadingIndicator size={20} />
      <CircularProgressIndicatorDemo size={24} />
      <LoadingDots />
    </div>
  );
}

function CircularProgressIndicatorDemo(props: CircularProgressProps) {
  const [done, setDone] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setTick((t) => t + 1);
      }, 500);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return <CircularProgress key={tick} {...props} done={done} />;
}

export function LoadingIndicatorSizingDemo() {
  const [size, setSize] = useState(30);
  const [strokeWidth, setStrokeWidth] = useState(2);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoRangeControlRow
          name="size"
          min={10}
          max={50}
          step={2}
          value={size}
          onChange={setSize}
        />
        <DemoRangeControlRow
          name="strokeWidth"
          min={1}
          max={10}
          step={1}
          value={strokeWidth}
          onChange={setStrokeWidth}
        />
      </div>
      <div data-demo-stage>
        <LoadingIndicator size={size} strokeWidth={strokeWidth} />
      </div>
    </>
  );
}

export function CircularProgressBaseDemo() {
  return <CircularProgressIndicatorDemo />;
}

export function CircularProgressStaticDemo() {
  return <CircularProgress progress={25} />;
}

export function CircularProgressSizingDemo() {
  const [size, setSize] = useState(30);
  const [strokeWidth, setStrokeWidth] = useState(2);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoRangeControlRow
          name="size"
          min={10}
          max={50}
          step={2}
          value={size}
          onChange={setSize}
        />
        <DemoRangeControlRow
          name="strokeWidth"
          min={1}
          max={4}
          step={1}
          value={strokeWidth}
          onChange={setStrokeWidth}
        />
      </div>
      <div data-demo-stage>
        <CircularProgressIndicatorDemo size={size} strokeWidth={strokeWidth} />
      </div>
    </>
  );
}

export function CircularProgressColorDemo() {
  return (
    <CircularProgressIndicatorDemo
      trackColor="var(--alpha-15)"
      trackActiveColor="var(--gray-1000)"
    />
  );
}

export function LoadingIndicatorDurationDemo() {
  return (
    <div style={{ '--indicator-rotate-duration': '3s' } as CSSProperties}>
      <LoadingIndicator />
    </div>
  );
}
