import { useState } from 'react';
import { Text, TextLink, useTheme } from '@plexui/react-native';
import { ArrowTopRightSm } from '@plexui/react-native/icons';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

// The paragraph's own color, or the two text colors a paragraph takes in the docs (the React page's class names)
const COLOR_OPTIONS = [
  { value: 'default', label: 'default' },
  { value: 'text-secondary', label: 'secondary' },
  { value: 'text-tertiary', label: 'tertiary' },
] as const;
const UNDERLINE_OPTIONS = ['auto', 'on', 'off'] as const;
const WEIGHT_OPTIONS = [
  { value: 'font-normal', label: 'normal' },
  { value: 'font-medium', label: 'medium' },
  { value: 'font-semibold', label: 'semibold' },
] as const;

// The web's color classes: --color-text-secondary and --color-text-tertiary, not the phone's secondary and tertiary labels
const COLORS = { default: undefined, 'text-secondary': '--color-text-secondary', 'text-tertiary': '--color-text-tertiary' } as const;
const WEIGHTS = { 'font-normal': undefined, 'font-medium': 'medium', 'font-semibold': 'semibold' } as const;

// The example's links go nowhere
const stay = (event: { preventDefault(): void }) => event.preventDefault();

/**
 * The React page's Overview: the paragraph of Inline usage with every setting of its links. `colorClassName` is the
 * paragraph's color, which the links take unless `primary`; `underline` is unset (`auto`: on, but off for a primary
 * link), on or off; `external` gives the second link an external URL and the arrow that marks it; `weight` is the
 * links' weight (the web's font-weight class). The example stands alone, as the React example has no Phone preview of
 * its own.
 */
export const Overview = docsDemo(function Overview() {
  const [colorClassName, setColorClassName] = useState<(typeof COLOR_OPTIONS)[number]['value']>('default');
  const [primary, setPrimary] = useState(false);
  const [underline, setUnderline] = useState<(typeof UNDERLINE_OPTIONS)[number]>('auto');
  const [external, setExternal] = useState(false);
  const [weight, setWeight] = useState<(typeof WEIGHT_OPTIONS)[number]['value']>('font-normal');
  const underlined = underline === 'auto' ? undefined : underline === 'on';
  const link = { primary, underline: underlined, weight: WEIGHTS[weight] };
  const theme = useTheme();
  const token = COLORS[colorClassName];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="colorClassName" options={COLOR_OPTIONS} value={colorClassName} onChange={setColorClassName} />
        <DemoControlBoolean name="primary" value={primary} onChange={setPrimary} />
        <Segments name="underline" options={UNDERLINE_OPTIONS} value={underline} onChange={setUnderline} />
        <DemoControlBoolean name="external" value={external} onChange={setExternal} />
        <Segments name="weight" options={WEIGHT_OPTIONS} value={weight} onChange={setWeight} />
      </div>
      <RNScreen bare>
        <Text size="md" color={token ? theme.color(token) : 'primary'}>
          You can use the{' '}
          <TextLink href="#" onPress={stay} {...link}>
            responses endpoint
          </TextLink>{' '}
          to generate text. You can either use the API directly from an HTTP client of your choice, or use one of the{' '}
          {external ? (
            <TextLink href="https://example.com" {...link}>
              official SDKs <ArrowTopRightSm size={16} />
            </TextLink>
          ) : (
            <TextLink href="#" onPress={stay} {...link}>
              official SDKs
            </TextLink>
          )}{' '}
          for your preferred language.
        </Text>
      </RNScreen>
    </>
  );
});
