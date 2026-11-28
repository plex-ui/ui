import { useEffect, useRef, useState, type ComponentType } from 'react';
import { PageControl, Text, cardColors, textColor, useTheme } from '@plexui/react-native';
import { Folders, Heart, Images, LockKeyHole, MapPin, Pencil, RemoveTrash, Search, ShieldCheck, Sparkles, Users, Video } from '@plexui/react-native/icons';
import { Animated, ScrollView, View } from 'react-native';
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
const SIZES = ['md', 'sm'] as const;
type Size = (typeof SIZES)[number];
const DIRECTIONS = ['horizontal', 'vertical'] as const;
type Direction = (typeof DIRECTIONS)[number];
const FOLLOWS = ['scroll', 'value'] as const;
type Follow = (typeof FOLLOWS)[number];
type Look = { background: Background; indicator: Indicator; tone: Tone; placement: Placement; size: Size; direction: Direction; follow: Follow };
// `react-native` is untyped in the docs (types/plexui-react-native.d.ts): what the demo uses of the scroller and its events
type Scroller = { scrollTo: (to: { x?: number; y?: number; animated: boolean }) => void; getScrollableNode?: () => HTMLElement | null };
type LayoutEvent = { nativeEvent: { layout: { width: number } } };
type ScrollEvent = { nativeEvent: { contentOffset: { x: number; y: number } } };

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
  const [size, setSize] = useState<Size>('md');
  const [direction, setDirection] = useState<Direction>('horizontal');
  const [follow, setFollow] = useState<Follow>('scroll');
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
        <Segments name="size" options={SIZES} value={size} onChange={setSize} />
        <Segments name="direction" options={DIRECTIONS} value={direction} onChange={setDirection} />
        <Segments name="position" options={FOLLOWS} value={follow} onChange={setFollow} />
      </div>
      <RNScreen minHeight={260}>
        <Carousel count={count} look={{ background, indicator, tone, placement, size, direction, follow }} />
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
  const [column, setColumn] = useState(0);
  // The pages' scroll as a fractional page, which the control follows on every frame (`position`)
  const [scrolled] = useState(() => new Animated.Value(0));
  // The page the control asked for while the pages scroll to it: the scroll passes the pages between and should not
  // set them as the current one
  const heading = useRef<{ page: number; until: number } | null>(null);
  // The pages' scroll as a fractional page, which a resize keeps right
  const pageNow = useRef(0);
  // Fewer pages than the page shown: the last one is, as the scroller clamps to it
  const page = Math.min(current, count - 1);
  // The onboarding's first pages, as many as the control asks for
  const pages = ONBOARDING_CARDS.slice(0, count);
  // `onColor`: each card in a color of its own, its text and symbols in that color's ink; the control takes white dots
  // only on the cards (`inside`, over their edge), beside or under them on the page it keeps the label colors
  const onColor = look.tone === 'onColor';
  const inside = look.placement === 'inside';
  const vertical = look.direction === 'vertical';
  const gutter = 8;
  const target = theme.isAndroid ? 48 : 44;
  // Vertical pages are square cards the column's width that scroll up and down, a page each; the control stands over
  // their trailing edge, or beside them (its capsule 16 thick small, 24 otherwise, and its target past it, 12 from them)
  const capsule = look.size === 'sm' ? 16 : 24;
  const cardWidth = vertical ? Math.max(0, column - (inside ? 0 : Math.max(capsule, target) / 2 + capsule / 2 + 12)) : width;
  const cardHeight = vertical ? cardWidth : inside ? 184 : 160;
  const pageSize = vertical ? cardHeight + gutter : width;
  useMouseSwipe(scroller, pageSize, vertical, (index) => {
    heading.current = null;
    setPage(index);
  });
  // Inside, the control's 44 target over the card's edge, and the card's content clear of it: under a horizontal
  // control (its bottom), beside a vertical one (both sides, so that the content stays centred)
  const padding = vertical
    ? { paddingVertical: 24, paddingHorizontal: inside ? target : 24 }
    : { paddingHorizontal: 24, paddingBottom: inside ? 24 : 0 };
  const control = (
    <PageControl
      count={count}
      value={page}
      position={look.follow === 'scroll' ? scrolled : undefined}
      background={look.background}
      indicator={look.indicator}
      tone={inside ? look.tone : 'default'}
      size={look.size}
      direction={look.direction}
      // Inside: over the card's edge, its row as far in as the horizontal one is from the bottom
      style={inside ? (vertical ? { position: 'absolute', top: 0, bottom: 0, end: target / 2 - 8, justifyContent: 'center' } : { position: 'absolute', bottom: 0, alignSelf: 'center' }) : undefined}
      onChange={(index: number, { scrubbing }: { scrubbing: boolean }) => {
        setPage(index);
        // A finger or a wheel taking over lets it go: the wait ends with the scroll's own time
        heading.current = { page: index, until: Date.now() + 600 };
        // Then the page is where the pages stand, should a finger have stopped them elsewhere
        window.setTimeout(() => {
          heading.current = null;
          setPage(Math.round(pageNow.current));
        }, 650);
        const offset = index * pageSize;
        scroller.current?.scrollTo({ ...(vertical ? { y: offset } : { x: offset }), animated: !scrubbing && !theme.reducedMotion });
      }}
    />
  );
  return (
    <View
      onLayout={(event: LayoutEvent) => setColumn(event.nativeEvent.layout.width)}
      style={vertical ? { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12 } : { alignSelf: 'stretch', alignItems: 'center', gap: 12 }}
    >
      {/* A page is a card of its own that slides in whole, 8 from the next; the scroller reaches 4 past the column so
          that the cards line up with its edges */}
      <View style={vertical ? { width: cardWidth } : { alignSelf: 'stretch' }}>
        <ScrollView
          ref={scroller}
          horizontal={!vertical}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onLayout={(event: LayoutEvent) => setWidth(event.nativeEvent.layout.width)}
          onScroll={(event: ScrollEvent) => {
            const offset = vertical ? event.nativeEvent.contentOffset.y : event.nativeEvent.contentOffset.x;
            if (pageSize <= 0) return;
            pageNow.current = offset / pageSize;
            scrolled.setValue(offset / pageSize);
            const at = Math.round(offset / pageSize);
            if (heading.current != null && Date.now() < heading.current.until && Math.abs(offset / pageSize - heading.current.page) > 0.01) return;
            heading.current = null;
            setPage(at);
          }}
          // A drag turns the pages, so it selects no text on the web
          style={[vertical ? { height: pageSize, marginVertical: -gutter / 2 } : { alignSelf: 'stretch', marginHorizontal: -gutter / 2 }, { userSelect: 'none' }]}
        >
          {pages.map(({ icon, title, text }, index) => {
            const Icon = ICONS[icon];
            // A card: Card's solid fill (iOS's gray fill, seen on a white screen), or Material's filled card on Android; on color, a color per card
            const colors = onColor ? cardColors(theme, CARD_COLORS[index % CARD_COLORS.length]) : null;
            return (
              <View key={title} style={vertical ? { height: pageSize, paddingVertical: gutter / 2 } : { width, paddingHorizontal: gutter / 2 }}>
                <View
                  style={{
                    height: cardHeight,
                    ...padding,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderRadius: theme.length('--radius-2xl', 16),
                    backgroundColor: colors?.fill ?? (theme.isAndroid ? theme.material.surfaceContainerHighest : theme.color('--card-solid-section-background', theme.colors.surfaceSecondary)),
                  }}
                >
                  <View style={{ marginBottom: 4 }}>
                    <Icon size={32} color={colors?.ink ?? textColor(theme, 'secondary')} />
                  </View>
                  <Text variant="headline" color={colors?.ink} align="center">
                    {title}
                  </Text>
                  <Text variant="subheadline" color={colors ? colors.ink : 'secondary'} style={colors ? { opacity: 0.8 } : undefined} align="center">
                    {text}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        {inside ? control : null}
      </View>
      {inside ? null : control}
    </View>
  );
}

/** The cards' colors on color: a page may have a background of its own */
// Card's `color` values (the module is untyped in the docs, types/plexui-react-native.d.ts)
const CARD_COLORS: Array<'accent' | 'discovery' | 'success' | 'warning' | 'info' | 'danger'> = ['accent', 'discovery', 'success', 'warning', 'info', 'danger'];

/**
 * A mouse drags the pages on the web, as a finger does: react-native-web's scroller follows a finger and a trackpad but
 * not a mouse. The pages follow the drag and settle on the next page in its direction, or back on a short one.
 */
function useMouseSwipe(scroller: { current: Scroller | null }, width: number, vertical: boolean, onPage: (index: number) => void) {
  const pageChange = useRef(onPage);
  pageChange.current = onPage;
  useEffect(() => {
    const node = scroller.current?.getScrollableNode?.();
    if (!node || width <= 0) return;
    let start: { x: number; left: number } | null = null;
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      start = { x: vertical ? event.clientY : event.clientX, left: vertical ? node.scrollTop : node.scrollLeft };
      node.style.scrollSnapType = 'none';
      node.style.cursor = 'grabbing';
    };
    const move = (event: PointerEvent) => {
      if (!start) return;
      event.preventDefault();
      const to = start.left - ((vertical ? event.clientY : event.clientX) - start.x);
      if (vertical) node.scrollTop = to;
      else node.scrollLeft = to;
    };
    const up = (event: PointerEvent) => {
      if (!start) return;
      const dx = (vertical ? event.clientY : event.clientX) - start.x;
      const from = Math.round(start.left / width);
      const last = Math.max(0, Math.round(((vertical ? node.scrollHeight : node.scrollWidth) - width) / width));
      const index = Math.min(last, Math.max(0, Math.abs(dx) > width * 0.15 ? from - Math.sign(dx) : from));
      start = null;
      node.style.cursor = '';
      // `scroll`, not `scrollTo`: react-native-web puts its own scrollTo({ x }) on the scroller's node
      node.scroll({ [vertical ? 'top' : 'left']: index * width, behavior: 'smooth' });
      pageChange.current(index);
      // The snap again once the pages have settled
      window.setTimeout(() => (node.style.scrollSnapType = ''), 400);
    };
    node.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [scroller, width, vertical]);
}
