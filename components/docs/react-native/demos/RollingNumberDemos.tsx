import { useState } from 'react';
import { Button, RollingNumber, Text, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlSelect, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const FORMATS = ['number', 'currency', 'percent'] as const;
type Format = (typeof FORMATS)[number];

/** Each format as `Intl.NumberFormat` takes it; percent shows the value as a share of 10,000 */
const FORMAT_OPTIONS: Record<Format, Intl.NumberFormatOptions> = {
  number: {},
  currency: { style: 'currency', currency: 'USD' },
  percent: { style: 'percent', maximumFractionDigits: 1 },
};

const STEPS = [-100, -1, 1, 25, 1000];
const ANIMATIONS = ['roll', 'count'] as const;

/**
 * The Overview, as the React page's Phone view: a total in the page's text-4xl semibold (36/40) over the buttons that
 * change it. Each changed digit rolls; separators, signs and the currency stand still. `animation` counts it instead.
 */
export const Overview = docsDemo(function Overview() {
  const [format, setFormat] = useState<Format>('currency');
  const [animation, setAnimation] = useState<(typeof ANIMATIONS)[number]>('roll');
  const [value, setValue] = useState(1284);
  const shown = format === 'percent' ? value / 10000 : value;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="format" options={FORMATS} value={format} onChange={setFormat} />
        <DemoControlSelect name="animation" options={ANIMATIONS} value={animation} onChange={setAnimation} />
      </div>
      <RNScreen minHeight={240}>
        <View style={{ alignItems: 'center', gap: 24 }}>
          <RollingNumber value={shown} animation={animation} locales="en-US" format={FORMAT_OPTIONS[format]} weight="semibold" style={{ fontSize: 36, lineHeight: 40 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {STEPS.map((step) => (
              <Button key={step} color="secondary" variant="soft" size="sm" onPress={() => setValue((current) => Math.max(0, current + step))}>
                {step > 0 ? `+${step}` : String(step)}
              </Button>
            ))}
          </View>
        </View>
      </RNScreen>
    </>
  );
});

/** In text: the number keeps the text's size, weight and baseline, so it stands in a sentence as any word does */
export function InText() {
  const theme = useTheme();
  const [count, setCount] = useState(3);
  const secondary = theme.color('--color-text-secondary');
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View style={{ flexDirection: 'row' }}>
        <RollingNumber value={count} locales="en-US" size="sm" color={secondary} />
        <Text size="sm" color={secondary}>
          {` ${count === 1 ? 'item' : 'items'} in your bag`}
        </Text>
      </View>
      <Button color="secondary" variant="soft" size="sm" style={{ alignSelf: 'center' }} onPress={() => setCount((current) => current + 7)}>
        Add 7
      </Button>
    </View>
  );
}
