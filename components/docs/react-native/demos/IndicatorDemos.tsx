import { useEffect, useState, type ComponentProps } from 'react';
import { CircularProgress, LoadingDots, LoadingIndicator } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

type CircularProgressProps = ComponentProps<typeof CircularProgress>;

const INDICATOR_OPTIONS = ['LoadingIndicator', 'CircularProgress', 'LoadingDots'] as const;
// The spinner and the dots draw in a text color: the primary text by default (the web's currentcolor), or another
const COLOR_OPTIONS = [
  { value: 'currentcolor', label: 'currentcolor' },
  { value: 'secondary', label: 'secondary' },
  { value: 'danger', label: 'danger' },
] as const;
const TRACK_COLOR_OPTIONS = [
  { value: 'default', label: 'default' },
  { value: 'var(--alpha-15)', label: '--alpha-15' },
] as const;
const TRACK_ACTIVE_COLOR_OPTIONS = [
  { value: 'default', label: 'default' },
  { value: 'var(--gray-1000)', label: '--gray-1000' },
] as const;

function DemoRangeControlRow({ name, min, max, step, value, onChange }: { name: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <DemoControlRow name={name}>
      <SliderValueControl ariaLabel={name} min={min} max={max} step={step} value={value} onChange={onChange} width="min(42vw, 340px)" />
    </DemoControlRow>
  );
}

/** A simulated ring that starts over every few seconds: `done` fills it, then it mounts again */
function SimulatedRing(props: CircularProgressProps) {
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

/**
 * The Overview, as the React page's Phone view, with every setting of the three indicators: `indicator` picks one,
 * and each setting is offered only for the ones it acts on. The phone's spinner is the iOS one, whose spokes take the
 * kit's widths for its size, so its `strokeWidth` is not offered (the ring's is). The spinner and the dots take a
 * text color with `color` (the web's text class), and the spinner's turn time with `duration` (the web's
 * `--indicator-rotate-duration`). Without `progress` the ring simulates it, and the preview sets `done` every 4
 * seconds to start it over.
 */
export const Overview = docsDemo(function Overview() {
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
  const textColor = color === 'currentcolor' ? undefined : color;
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
        {ring && <DemoRangeControlRow name="strokeWidth" min={1} max={4} step={1} value={strokeWidth} onChange={setStrokeWidth} />}
        {!ring && <Segments name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />}
        {spinner && <DemoRangeControlRow name="duration" min={200} max={3000} step={100} value={duration} onChange={setDuration} />}
        {ring && <DemoControlBoolean name="simulated" value={simulated} onChange={setSimulated} />}
        {ring && !simulated && <DemoRangeControlRow name="progress" min={0} max={100} step={1} value={progress} onChange={setProgress} />}
        {ring && simulated && <DemoRangeControlRow name="maxDuration" min={1000} max={30000} step={1000} value={maxDuration} onChange={setMaxDuration} />}
        {ring && <Segments name="trackColor" options={TRACK_COLOR_OPTIONS} value={trackColor} onChange={setTrackColor} />}
        {ring && <Segments name="trackActiveColor" options={TRACK_ACTIVE_COLOR_OPTIONS} value={trackActiveColor} onChange={setTrackActiveColor} />}
      </div>
      <RNScreen minHeight={228}>
        <View style={{ alignItems: 'center' }}>
          {spinner && <LoadingIndicator size={size} duration={duration} color={textColor} />}
          {ring && (simulated ? <SimulatedRing {...ringProps} maxDuration={maxDuration} /> : <CircularProgress {...ringProps} progress={progress} />)}
          {dots && <LoadingDots color={textColor} />}
        </View>
      </RNScreen>
    </>
  );
});
