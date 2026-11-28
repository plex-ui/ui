import { useState } from 'react';
import { Card, ProgressScale, Text, ThemeProvider } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, DemoControlSelect, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

const BANDS = ['Low', 'Some', 'Both', 'Most', 'High'];
const MARKERS = ['knob', 'drop'] as const;
const MOTIONS = ['change', 'enter', 'none'] as const;
type Marker = (typeof MARKERS)[number];
type Motion = (typeof MOTIONS)[number];

/** The first value coming in: the marker from the scale's start, its band lighting after it */
const ENTER = { value: { duration: 1200, delay: 100 }, light: { duration: 450 } };

/**
 * The Overview: a value on five labelled bands in an inset grouped card, as Health draws a range. `marker` drop sets
 * `--scale-marker` in a brand round the scale; `animated` enter replays the first value coming in.
 */
export const Overview = docsDemo(function Overview() {
  const [value, setValue] = useState(50);
  const [marker, setMarker] = useState<Marker>('knob');
  const [motion, setMotion] = useState<Motion>('change');
  const [labels, setLabels] = useState(true);
  const animated = motion === 'enter' ? ENTER : motion === 'change';
  const scale = (
    <ProgressScale
      // A new key replays the first value coming in
      key={motion === 'enter' ? `enter-${value}` : 'scale'}
      aria-label="Balance"
      bands={BANDS}
      value={value}
      animated={animated}
      showLabels={labels}
    />
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="value">
          <SliderValueControl ariaLabel="value" min={0} max={100} step={1} value={value} onChange={setValue} width="min(42vw, 340px)" />
        </DemoControlRow>
        <DemoControlSelect name="marker" options={MARKERS} value={marker} onChange={setMarker} />
        <DemoControlSelect name="animated" options={MOTIONS} value={motion} onChange={setMotion} />
        <DemoControlBoolean name="labels" value={labels} onChange={setLabels} />
      </div>
      <RNScreen grouped minHeight={240}>
        <Card>
          <View style={{ gap: 12 }}>
            <Text variant="headline">Balance</Text>
            {marker === 'drop' ? <ThemeProvider brand={{ tokens: { '--scale-marker': 'drop', '--scale-band-height': '2', '--scale-marker-size': '13', '--scale-marker-fillet': '5', '--scale-marker-color': 'var(--color-accent)' } }}>{scale}</ThemeProvider> : scale}
          </View>
        </Card>
      </RNScreen>
    </>
  );
});
