import { useId, useState } from 'react';
import { Progress, Text, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, DemoControlSelect, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

const PROGRESS_SIZES = ['sm', 'md', 'lg'] as const;
const PROGRESS_COLORS = ['primary', 'secondary', 'success', 'warning', 'caution', 'danger', 'info', 'discovery'] as const;
// The docs see @plexui/react-native untyped (types/plexui-react-native.d.ts), so its prop types are taken from the options
type ProgressSize = (typeof PROGRESS_SIZES)[number];
type ProgressColor = (typeof PROGRESS_COLORS)[number];

/** The readout beside a label and under a bar: 14 in the tertiary text, as the React page's span */
function Readout({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text color={theme.color('--color-text-tertiary')} style={{ fontSize: 14, lineHeight: 21 }}>
      {children}
    </Text>
  );
}

/**
 * The Overview, as the React page's Phone view: a bar of an upload between the screen's margins, its label and its
 * readout above it. The bar animates each change of `value`; `indeterminate` passes `null`, a sweep. With the label
 * the bar is named by it (`aria-labelledby`), without it by `aria-label`.
 */
export const Overview = docsDemo(function Overview() {
  const [value, setValue] = useState(66);
  const [indeterminate, setIndeterminate] = useState(false);
  const [label, setLabel] = useState(true);
  const [size, setSize] = useState<ProgressSize>('sm');
  const [color, setColor] = useState<ProgressColor>('primary');
  const labelId = useId();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="value">
          <SliderValueControl ariaLabel="value" min={0} max={100} step={1} value={value} onChange={setValue} width="min(42vw, 340px)" />
        </DemoControlRow>
        <DemoControlBoolean name="indeterminate" value={indeterminate} onChange={setIndeterminate} />
        <DemoControlBoolean name="label" value={label} onChange={setLabel} />
        <DemoControlSelect name="size" options={PROGRESS_SIZES} value={size} onChange={setSize} />
        <DemoControlSelect name="color" options={PROGRESS_COLORS} value={color} onChange={setColor} />
      </div>
      <RNScreen minHeight={168}>
        <View style={{ gap: 8 }}>
          {label && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
              <Text nativeID={labelId}>Uploading plex-ui.zip</Text>
              {!indeterminate && <Readout>{`${value}%`}</Readout>}
            </View>
          )}
          <Progress
            value={indeterminate ? null : value}
            size={size}
            color={color}
            aria-labelledby={label ? labelId : undefined}
            aria-label={label ? undefined : 'Uploading plex-ui.zip'}
          />
        </View>
      </RNScreen>
    </>
  );
});

const BILL = [
  { value: 120, color: 'success', label: 'Paid' },
  { value: 45, color: 'warning', label: 'Pending' },
] as const;

/** Segments: a bill paid in parts, what is paid and what is pending side by side, the track left for what is due */
export function Segments() {
  const due = 200 - BILL.reduce((sum, part) => sum + part.value, 0);
  return (
    <View style={{ alignSelf: 'center', width: '100%', maxWidth: 320, gap: 8 }}>
      <Text nativeID="progress-bill-label">Bill of $200</Text>
      <Progress aria-labelledby="progress-bill-label" max={200} segments={[...BILL]} size="lg" />
      <Readout>{`120 paid · 45 pending · ${due} due`}</Readout>
    </View>
  );
}
