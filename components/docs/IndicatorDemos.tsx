'use client';

import { useEffect, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import {
  CircularProgress,
  LoadingDots,
  LoadingIndicator,
} from '@plexui/ui/components/Indicator';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { SliderValueControl } from './SliderValueControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';

type CircularProgressProps = ComponentProps<typeof CircularProgress>;

const INDICATOR_OPTIONS = ['LoadingIndicator', 'CircularProgress', 'LoadingDots'] as const;
// The spinner and the dots draw in the text color, so a text class colors them; `currentcolor` keeps the
// surrounding one. The ring has its own track colors. Each value is a literal class or color, as in the code.
const COLOR_OPTIONS = [
  { value: 'currentcolor', label: 'currentcolor' },
  { value: 'text-secondary', label: 'secondary' },
  { value: 'text-danger', label: 'danger' },
] as const;
const TRACK_COLOR_OPTIONS = [
  { value: 'default', label: 'default' },
  { value: 'var(--alpha-15)', label: '--alpha-15' },
] as const;
const TRACK_ACTIVE_COLOR_OPTIONS = [
  { value: 'default', label: 'default' },
  { value: 'var(--gray-1000)', label: '--gray-1000' },
] as const;

function DemoRangeControlRow({
  name,
  min,
  max,
  step,
  value,
  onChange,
  desktopOnly,
}: {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  desktopOnly?: boolean;
}) {
  return (
    <DemoControlRow name={name} desktopOnly={desktopOnly}>
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

function Segments<T extends string>({ name, options, value, onChange }: { name: string; options: readonly (T | { value: T; label: string })[]; value: T; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => {
          const { value: optionValue, label } = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <SegmentedControl.Option key={optionValue} value={optionValue}>
              {label}
            </SegmentedControl.Option>
          );
        })}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** A simulated ring that starts over every few seconds: `done` fills it, then it mounts again */
function CircularProgressIndicatorDemo(props: CircularProgressProps) {
  const [done, setDone] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let hold: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setDone(true);
      hold = setTimeout(() => {
        setDone(false);
        setTick((t) => t + 1);
      }, 500);
    }, 4000);
    return () => {
      clearInterval(id);
      clearTimeout(hold);
    };
  }, []);

  return <CircularProgress key={tick} {...props} done={done} />;
}

/** The Overview, with every setting of the three indicators: what the page's examples once showed one by one
 * (LoadingIndicator, Sizing & stroke, Color, Duration, CircularProgress, Progress, LoadingDots, Phone spinner) are
 * its settings (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»). `indicator` picks the
 * component, and each setting is offered only for the ones it acts on: `size` and `strokeWidth` for the spinner and
 * the ring, `color` (the text color) for the spinner and the dots, `duration` for the spinner, and `progress`,
 * `maxDuration` and the track colors for the ring. Without `progress` the ring simulates it, and the preview sets
 * `done` every 4 seconds to start it over. A setting that is not offered keeps its choice and shows its default, as
 * in the Vue demo. On a phone the spinner is the iOS 27 one, whose spokes take the kit's widths for its size, so its
 * `strokeWidth` is a desktop setting there, and the phone shows it unset; the ring's applies on both. */
export function IndicatorOverviewDemo() {
  const phone = usePhoneRows();
  const [indicator, setIndicator] = useState<(typeof INDICATOR_OPTIONS)[number]>('LoadingIndicator');
  const [size, setSize] = useState(20);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]['value']>('currentcolor');
  const [duration, setDuration] = useState(800);
  const [simulated, setSimulated] = useState(true);
  const [progress, setProgress] = useState(25);
  const [maxDuration, setMaxDuration] = useState(15000);
  const [trackColor, setTrackColor] = useState<(typeof TRACK_COLOR_OPTIONS)[number]['value']>('default');
  const [trackActiveColor, setTrackActiveColor] = useState<(typeof TRACK_ACTIVE_COLOR_OPTIONS)[number]['value']>('default');
  const spinner = indicator === 'LoadingIndicator';
  const ring = indicator === 'CircularProgress';
  const dots = indicator === 'LoadingDots';
  const className = color === 'currentcolor' ? undefined : color;
  const ringProps = {
    size,
    strokeWidth,
    trackColor: trackColor === 'default' ? undefined : trackColor,
    trackActiveColor: trackActiveColor === 'default' ? undefined : trackActiveColor,
  };
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="indicator" options={INDICATOR_OPTIONS} value={indicator} onChange={setIndicator} />
        {!dots && <DemoRangeControlRow name="size" min={10} max={50} step={1} value={size} onChange={setSize} />}
        {!dots && <DemoRangeControlRow name="strokeWidth" min={1} max={4} step={1} value={strokeWidth} onChange={setStrokeWidth} desktopOnly={spinner} />}
        {!ring && <Segments name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />}
        {spinner && <DemoRangeControlRow name="duration" min={200} max={3000} step={100} value={duration} onChange={setDuration} />}
        {ring && <DemoControlBoolean name="simulated" value={simulated} onChange={setSimulated} />}
        {ring && !simulated && <DemoRangeControlRow name="progress" min={0} max={100} step={1} value={progress} onChange={setProgress} />}
        {ring && simulated && <DemoRangeControlRow name="maxDuration" min={1000} max={30000} step={1000} value={maxDuration} onChange={setMaxDuration} />}
        {ring && <Segments name="trackColor" options={TRACK_COLOR_OPTIONS} value={trackColor} onChange={setTrackColor} />}
        {ring && <Segments name="trackActiveColor" options={TRACK_ACTIVE_COLOR_OPTIONS} value={trackActiveColor} onChange={setTrackActiveColor} />}
      </div>
      <div data-demo-stage className="flex-1 w-full py-12 flex items-center justify-center">
        {spinner && (
          <div style={{ '--indicator-rotate-duration': `${duration}ms` } as CSSProperties}>
            <LoadingIndicator size={size} strokeWidth={phone ? undefined : strokeWidth} className={className} />
          </div>
        )}
        {ring && (simulated
          ? <CircularProgressIndicatorDemo {...ringProps} maxDuration={maxDuration} />
          : <CircularProgress {...ringProps} progress={progress} />)}
        {dots && <LoadingDots className={className} />}
      </div>
    </>
  );
}
