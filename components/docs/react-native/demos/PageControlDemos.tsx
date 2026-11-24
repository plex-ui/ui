import { useRef, useState, type ComponentType } from 'react';
import { PageControl, Text, textColor, useTheme } from '@plexui/react-native';
import { Folders, Heart, Images, LockKeyHole, MapPin, Pencil, RemoveTrash, Search, ShieldCheck, Sparkles, Users, Video } from '@plexui/react-native/icons';
import { ScrollView, View } from 'react-native';
import { DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { ONBOARDING_CARDS } from '../../pageControlData';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

const BACKGROUNDS = ['automatic', 'prominent', 'minimal'] as const;
type Background = (typeof BACKGROUNDS)[number];
const INDICATORS = ['dots', 'pill'] as const;
type Indicator = (typeof INDICATORS)[number];
const TONES = ['default', 'onColor'] as const;
type Tone = (typeof TONES)[number];
const PLACEMENTS = ['below', 'inside'] as const;
type Placement = (typeof PLACEMENTS)[number];
type Look = { background: Background; indicator: Indicator; tone: Tone; placement: Placement };
// `react-native` is untyped in the docs (types/plexui-react-native.d.ts): what the demo uses of the scroller and its events
type Scroller = { scrollTo: (to: { x: number; animated: boolean }) => void };
type LayoutEvent = { nativeEvent: { layout: { width: number } } };
type ScrollEvent = { nativeEvent: { contentOffset: { x: number } } };

/** The symbols of the onboarding's pages, as the React example's (pageControlData) */
const ICONS: Record<string, ComponentType<{ size?: number; color?: string }>> = { Folders, Heart, Images, LockKeyHole, MapPin, Pencil, RemoveTrash, Search, ShieldCheck, Sparkles, Users, Video };

/**
 * The Overview, one carousel with every setting, as the React page's: the pages of an onboarding, each a symbol, a
 * title and a line, that scroll sideways a page at a time, 160 tall, with the page control under them. From seven pages the dots past a window around the current page shrink.
 * A scrub moves the pages at once, a tap or a page's own scroll with their motion.
 */
export const Overview = docsDemo(function Overview() {
  const [count, setCount] = useState(5);
  const [background, setBackground] = useState<Background>('automatic');
  const [indicator, setIndicator] = useState<Indicator>('dots');
  const [tone, setTone] = useState<Tone>('default');
  const [placement, setPlacement] = useState<Placement>('below');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="pages">
          <SliderValueControl ariaLabel="pages" min={2} max={12} step={1} value={count} onChange={setCount} width="min(42vw, 340px)" />
        </DemoControlRow>
        <Segments name="background" options={BACKGROUNDS} value={background} onChange={setBackground} />
        <Segments name="indicator" options={INDICATORS} value={indicator} onChange={setIndicator} />
        <Segments name="tone" options={TONES} value={tone} onChange={setTone} />
        <Segments name="placement" options={PLACEMENTS} value={placement} onChange={setPlacement} />
      </div>
      <RNScreen minHeight={260}>
        <Carousel count={count} look={{ background, indicator, tone, placement }} />
      </RNScreen>
    </>
  );
});

/** The pages and their page control, inside the screen so that they take its theme (its scheme and platform) */
function Carousel({ count, look }: { count: number; look: Look }) {
  const theme = useTheme();
  const scroller = useRef<Scroller>(null);
  const [current, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  // Fewer pages than the page shown: the last one is, as the scroller clamps to it
  const page = Math.min(current, count - 1);
  // The onboarding's first pages, as many as the control asks for
  const pages = ONBOARDING_CARDS.slice(0, count);
  // `onColor`: the card in the accent, its text and symbols in white; the control takes white dots only on the card
  // (`inside`, over the card's bottom), under it on the page it keeps the label colors
  const onColor = look.tone === 'onColor';
  const inside = look.placement === 'inside';
  const ink = onColor ? '#FFFFFF' : undefined;
  return (
    <View
      style={[
        { alignSelf: 'stretch', alignItems: 'center', gap: 12 },
      ]}
    >
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(event: LayoutEvent) => setWidth(event.nativeEvent.layout.width)}
        onScroll={(event: ScrollEvent) => {
          if (width > 0) setPage(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        // The pages stand on a card: the secondary surface, or Material's filled card on Android
        style={{
          alignSelf: 'stretch',
          borderRadius: theme.length('--radius-2xl', 16),
          backgroundColor: onColor ? theme.colors.accent : theme.isAndroid ? theme.material.surfaceContainerHighest : theme.colors.surfaceSecondary,
        }}
      >
        {pages.map(({ icon, title, text }) => {
          const Icon = ICONS[icon];
          return (
            <View key={title} style={{ width, height: inside ? 184 : 160, paddingBottom: inside ? 24 : 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 24 }}>
              <View style={{ marginBottom: 4 }}>
                <Icon size={32} color={ink ?? textColor(theme, 'secondary')} />
              </View>
              <Text variant="headline" color={ink} align="center">
                {title}
              </Text>
              <Text variant="subheadline" color={onColor ? 'rgba(255, 255, 255, 0.8)' : 'secondary'} align="center">
                {text}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <PageControl
        count={count}
        value={page}
        background={look.background}
        indicator={look.indicator}
        tone={inside ? look.tone : 'default'}
        // Inside: over the card's bottom, as a photo carousel's dots
        style={inside ? { position: 'absolute', bottom: 0, alignSelf: 'center' } : undefined}
        onChange={(index: number, { scrubbing }: { scrubbing: boolean }) => {
          setPage(index);
          scroller.current?.scrollTo({ x: index * width, animated: !scrubbing && !theme.reducedMotion });
        }}
      />
    </View>
  );
}
