import { useState, type ComponentProps } from 'react';
import { ShimmerableText, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const ELEMENTS = ['div', 'h2', 'p', 'span'] as const;
type Element = (typeof ELEMENTS)[number];

/**
 * A text style per element, as the React page sets its classes: text-lg semibold (18/28), text-2xl bold, text-base,
 * text-sm secondary; the shimmer takes the page's text color, as the web one takes currentcolor.
 */
function useElementText(as: Element): Omit<ComponentProps<typeof ShimmerableText>, 'children'> {
  const theme = useTheme();
  const ink = theme.color('--color-text');
  switch (as) {
    case 'h2':
      return { size: 'lg', weight: 'bold', color: ink, style: { fontSize: 24, lineHeight: 32 } };
    case 'p':
      return { size: 'md', color: ink };
    case 'span':
      return { size: 'sm', color: theme.color('--color-text-secondary') };
    default:
      return { size: 'lg', weight: 'semibold', color: ink, style: { lineHeight: 28 } };
  }
}

/**
 * The Overview, as the React page's Phone view: one line of text alone on the phone, the element it renders and the
 * shimmer turned on and off. `ShimmerText` always shimmers; `ShimmerableText` with `shimmer` on is the same, and off
 * it finishes its sweep and stops.
 */
export const Overview = docsDemo(function Overview() {
  const [as, setAs] = useState<Element>('div');
  const [shimmer, setShimmer] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="as" options={ELEMENTS} value={as} onChange={setAs} />
        <DemoControlBoolean name="shimmer" value={shimmer} onChange={setShimmer} />
      </div>
      <RNScreen bare minHeight={168}>
        <View style={{ alignItems: 'center' }}>
          <Shimmer as={as} shimmer={shimmer} />
        </View>
      </RNScreen>
    </>
  );
});

/** The text in the screen's theme: the colors are read inside RNScreen, in its scheme and platform */
function Shimmer({ as, shimmer }: { as: Element; shimmer: boolean }) {
  const text = useElementText(as);
  return (
    <ShimmerableText as={as} shimmer={shimmer} {...text}>
      Generating response...
    </ShimmerableText>
  );
}
