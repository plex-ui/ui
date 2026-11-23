import { useState, type ReactNode } from 'react';
import { Heading, Text, typeStyle, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlSelect, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const VARIANTS = [
  'largeTitle',
  'title1',
  'title2',
  'title3',
  'headline',
  'body',
  'callout',
  'subheadline',
  'footnote',
  'caption1',
  'caption2',
] as const;
const TEXT_SIZES = ['lg', 'md', 'sm', 'xs', '2xs', '3xs'] as const;
const HEADING_SIZES = ['5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs'] as const;
// `auto` leaves the prop unset: the platform style sets the size, and the style or the heading sets the weight
const SIZES = ['auto', '3xs', '2xs', 'xs', 'sm', 'md', 'lg'] as const;
const WEIGHTS = ['auto', 'regular', 'medium', 'semibold', 'bold'] as const;
// `inverse` is for text on a solid, inverted background, which the screen is not
const COLORS = [
  'primary',
  'secondary',
  'tertiary',
  'disabled',
  'accent',
  'danger',
  'success',
  'warning',
  'caution',
  'info',
  'discovery',
] as const;
const ALIGNS = ['left', 'center', 'right'] as const;
// The docs see @plexui/react-native untyped (types/plexui-react-native.d.ts): its unions, from the lists above
type TextVariant = (typeof VARIANTS)[number];
type HeadingSize = (typeof HEADING_SIZES)[number];
type TextColor = (typeof COLORS)[number];

const unset = <T extends string>(value: T | 'auto') => (value === 'auto' ? undefined : value);

/**
 * The Overview, the typography page's example (Get started, Building your first app and a paragraph) with every setting
 * of Text on the paragraph: a platform `variant` or a Plex UI `size` in its place, `weight`, `color`, `align` and
 * `mono`; and the size of the Heading above it.
 */
export const Overview = docsDemo(function Overview() {
  const [heading, setHeading] = useState<HeadingSize>('xl');
  const [size, setSize] = useState<(typeof SIZES)[number]>('auto');
  const [variant, setVariant] = useState<TextVariant>('body');
  const [weight, setWeight] = useState<(typeof WEIGHTS)[number]>('auto');
  const [color, setColor] = useState<TextColor>('primary');
  const [align, setAlign] = useState<(typeof ALIGNS)[number]>('left');
  const [mono, setMono] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="heading" options={HEADING_SIZES} value={heading} onChange={setHeading} />
        <DemoControlSelect name="size" options={SIZES} value={size} onChange={setSize} />
        {/* A size of the Plex UI scale takes the place of the platform style */}
        {size === 'auto' && <DemoControlSelect name="variant" options={VARIANTS} value={variant} onChange={setVariant} />}
        <DemoControlSelect name="weight" options={WEIGHTS} value={weight} onChange={setWeight} />
        <DemoControlSelect name="color" options={COLORS} value={color} onChange={setColor} />
        <Segments name="align" options={ALIGNS} value={align} onChange={setAlign} />
        <DemoControlBoolean name="mono" value={mono} onChange={setMono} />
      </div>
      <RNScreen minHeight={240}>
        <View>
          <Text variant="subheadline" color="secondary" style={{ marginBottom: 4 }}>
            Get started
          </Text>
          <Heading size={heading} style={{ marginBottom: 12 }}>
            Building your first app
          </Heading>
          <Text
            variant={variant}
            size={unset(size)}
            weight={unset(weight)}
            color={color}
            align={align}
            mono={mono}
          >
            Start from a template, add your first screen and preview it on your phone in a few minutes. You can change
            any of it later.
          </Text>
        </View>
      </RNScreen>
    </>
  );
});

/** One row of a scale: the name drawn in its own style, and its size and line height at the end */
function ScaleRow({ sample, metrics }: { sample: ReactNode; metrics: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>{sample}</View>
      <Text variant="footnote" color="secondary" tabularNums>
        {metrics}
      </Text>
    </View>
  );
}

/**
 * The platform's text styles under Apple's names, each drawn in its own style with its size and line height: iOS's
 * sizes on iOS, the nearest Material 3 role on Android.
 */
export function PlatformStyles() {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {VARIANTS.map((variant) => {
        const style = typeStyle(theme.platform, variant);
        return (
          <ScaleRow
            key={variant}
            sample={
              <Text variant={variant} numberOfLines={1}>
                {variant}
              </Text>
            }
            metrics={`${style.fontSize}/${style.lineHeight}${style.weight === 'regular' ? '' : ` ${style.weight}`}`}
          />
        );
      })}
    </View>
  );
}

/**
 * The Plex UI scale, as the typography page's Scales table: Heading from 5xl to xs and Text from lg to 3xs, each drawn
 * at its size with its size and line height. The same on both platforms.
 */
export function Scale() {
  const theme = useTheme();
  const metrics = (token: string) =>
    `${theme.length(`${token}-size`, 0)}/${theme.length(`${token}-line-height`, 0)}`;
  return (
    // The large headings set their line at their size (72/72, 60/60) and their glyphs reach past it: rows 12 apart
    <View style={{ gap: 12 }}>
      {HEADING_SIZES.map((size) => (
        <ScaleRow
          key={size}
          sample={
            <Heading size={size} numberOfLines={1}>
              {size}
            </Heading>
          }
          metrics={metrics(`--font-heading-${size}`)}
        />
      ))}
      {TEXT_SIZES.map((size) => (
        <ScaleRow
          key={size}
          sample={
            <Text size={size} numberOfLines={1}>
              Text {size}
            </Text>
          }
          metrics={metrics(`--font-text-${size}`)}
        />
      ))}
    </View>
  );
}

// A trip's expenses: their 1s and 8s show the figures' widths
const AMOUNTS = [
  { label: 'Coffee', amount: '$4.11' },
  { label: 'Lunch', amount: '$18.80' },
  { label: 'Taxi', amount: '$31.10' },
  { label: 'Hotel', amount: '$888.00' },
  { label: 'Total', amount: '$942.01' },
];

/**
 * Figures of one width: `tabularNums` gives every figure the width of the widest, so the digits of the amounts stand
 * in columns; without it a 1 is narrower than an 8.
 */
export const Figures = docsDemo(function Figures() {
  const [tabularNums, setTabularNums] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="tabularNums" value={tabularNums} onChange={setTabularNums} />
      </div>
      <RNScreen minHeight={168}>
        <View style={{ gap: 4 }}>
          {AMOUNTS.map(({ label, amount }) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text weight={label === 'Total' ? 'semibold' : undefined}>{label}</Text>
              <Text weight={label === 'Total' ? 'semibold' : undefined} tabularNums={tabularNums}>
                {amount}
              </Text>
            </View>
          ))}
        </View>
      </RNScreen>
    </>
  );
});
