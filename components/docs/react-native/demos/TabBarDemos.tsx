import { useState, type ReactNode } from 'react';
import { Button, List, ListItem, TabBar, Text, Toolbar, useTabBarMinimize, useTheme, withAlpha } from '@plexui/react-native';
import { BarChart, Home, Mic, Music, Play, PlaySm, ShoppingBag, Skip, Sparkles, Stack } from '@plexui/react-native/icons';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { DemoControlsBottom } from '../../PreviewEmbed';
import { NOW_PLAYING, TAB_BAR_BADGES, TAB_BAR_PROMINENT, TAB_BAR_ROWS, TAB_BAR_TABS } from '../../tabBarData';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';
import { PhonePage } from './ToolbarDemos';

/** The bar backgrounds of the React page that the React Native bars draw (`blur` has none) */
const BAR_BACKGROUNDS = ['soft', 'hard', 'glass'] as const;
type BarBackground = (typeof BAR_BACKGROUNDS)[number];

type Tab = { value: string; label: string; icon: ReactNode };

/** The sections of a music app, as the React example's (tabBarData), each with its symbol */
const ICONS: Record<string, ReactNode> = { home: <Home />, new: <Sparkles />, radio: <Mic />, library: <Stack />, charts: <BarChart /> };
const TABS: Tab[] = TAB_BAR_TABS.map((tab) => ({ ...tab, icon: ICONS[tab.value] }));

const STORE: Tab = { ...TAB_BAR_PROMINENT, icon: <ShoppingBag /> };

/** What the selected section lists, as the React example: a title and, at the row's end, a detail */
function Rows({ section }: { section: string }) {
  return (
    <List>
      {TAB_BAR_ROWS[section].map(([title, detail]) => (
        <ListItem key={title} label={title} value={detail} />
      ))}
    </List>
  );
}

/**
 * The app's own content in the bottom accessory: a now playing row, the artwork 16 inside the capsule on iOS. On
 * Android the artwork is a 40dp disc of the accent at 10%, 8 inside the glass capsule and concentric with it, and
 * both controls are filled symbols
 */
function NowPlaying() {
  const theme = useTheme();
  const android = theme.isAndroid;
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, paddingLeft: android ? 0 : 16, paddingRight: android ? 0 : 8 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={
          android
            ? { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(theme.material.primary, 0.1) }
            : { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color('--color-background-secondary-soft-alpha') }
        }
      >
        <Music size={20} color={android ? theme.material.primary : undefined} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
        {NOW_PLAYING}
      </Text>
      <Button color="secondary" variant="ghost" uniform accessibilityLabel="Play">
        {android ? <PlaySm /> : <Play />}
      </Button>
      <Button color="secondary" variant="ghost" uniform accessibilityLabel="Next">
        <Skip />
      </Button>
    </View>
  );
}

type MinimizeBehavior = 'never' | 'onScrollDown';

function Screen({ tabs, search, prominent, badges, accessory, minimizeBehavior, toolbarBackground, background }: {
  tabs: Tab[];
  search: boolean;
  prominent: boolean;
  badges: boolean;
  accessory: boolean;
  minimizeBehavior: MinimizeBehavior;
  toolbarBackground: BarBackground;
  background: BarBackground;
}) {
  const [tab, setTab] = useState(tabs[0].value);
  // minimizeBehavior "onScrollDown": the bar minimizes while the list scrolls down and comes back when it scrolls up
  const { onScroll, minimized, onMinimizedChange } = useTabBarMinimize();
  const minimize = minimizeBehavior === 'onScrollDown';
  // A tab the settings take away leaves the first one selected
  const shown = [...tabs, ...(search ? [{ value: 'search', label: 'Search' }] : []), ...(prominent ? [STORE] : [])];
  const current = shown.find((item) => item.value === tab) ?? tabs[0];
  return (
    <PhonePage
      onScroll={minimize ? onScroll : undefined}
      top={(scrolled, canvas) => (
        <Toolbar background={toolbarBackground} scrolled={scrolled} canvasColor={canvas}>
          <Toolbar.Title>{current.label}</Toolbar.Title>
        </Toolbar>
      )}
      bottom={(scrolled, canvas) => (
        <TabBar
          value={current.value}
          onValueChange={setTab}
          search={search ? { value: 'search' } : undefined}
          prominent={prominent ? STORE : undefined}
          minimized={minimize && minimized}
          onMinimizedChange={onMinimizedChange}
          background={background}
          scrolled={scrolled} canvasColor={canvas}
          accessory={accessory ? <NowPlaying /> : undefined}
        >
          {tabs.map((item) => (
            <TabBar.Item key={item.value} {...item} badge={badges ? TAB_BAR_BADGES[item.value] : undefined} />
          ))}
        </TabBar>
      )}
    >
      <Rows section={current.value} />
    </PhonePage>
  );
}

const COUNTS = ['2', '3', '4', '5'] as const;
const MINIMIZE: MinimizeBehavior[] = ['never', 'onScrollDown'];

/** Five tabs at most, the search and prominent circles counted: with a circle the capsule keeps four */
const tabBarMaxTabs = (search: boolean, prominent: boolean) => 5 - Number(search) - Number(prominent);

/**
 * One bar with its settings, as the React page's Overview: the number of tabs, the search and prominent tabs, badges,
 * the accessory, minimizing on scroll and the backgrounds of the two bars. Minimizing is iOS's. On Android the tabs
 * float in a glass capsule, search and the prominent tab in circles beside it.
 */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const [count, setCount] = useState<(typeof COUNTS)[number]>('4');
  const [search, setSearch] = useState(false);
  const [prominent, setProminent] = useState(false);
  const [badges, setBadges] = useState(false);
  const [accessory, setAccessory] = useState(false);
  const [minimizeBehavior, setMinimizeBehavior] = useState<MinimizeBehavior>('never');
  const [toolbarBackgroundPick, setToolbarBackground] = useState<BarBackground>();
  // iOS 26's glass top bar, Android's soft edge, until the reader picks
  const toolbarBackground = toolbarBackgroundPick ?? (android ? 'soft' : 'glass');
  const [background, setBackground] = useState<BarBackground>('soft');
  const max = tabBarMaxTabs(search, prominent);
  const shownCount = String(Math.min(Number(count), max)) as (typeof COUNTS)[number];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="background (top)" options={BAR_BACKGROUNDS} value={toolbarBackground} onChange={setToolbarBackground} />
      </div>
      <RNScreen screen grouped minHeight={640}>
        <Screen
          tabs={TABS.slice(0, Number(shownCount))}
          search={search}
          prominent={prominent}
          badges={badges}
          accessory={accessory}
          minimizeBehavior={android ? 'never' : minimizeBehavior}
          toolbarBackground={toolbarBackground}
          background={background}
        />
      </RNScreen>
      {/* The bar is at the bottom of the screen, so its settings stand under the preview */}
      <DemoControlsBottom style={controlsTableStyle}>
        <DemoControlRow name="tabs">
          {/* The shown count coming back (the phone view's sync) keeps the count asked for, which returns with the room */}
          <SegmentedControl<(typeof COUNTS)[number]>
            aria-label="tabs"
            size="xs"
            value={shownCount}
            onChange={(value) => {
              if (value !== shownCount) setCount(value);
            }}
          >
            {COUNTS.map((value) => (
              <SegmentedControl.Option key={value} value={value} disabled={Number(value) > max}>
                {value}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="search" value={search} onChange={setSearch} />
        <DemoControlBoolean name="prominent" value={prominent} onChange={setProminent} />
        <DemoControlBoolean name="badge" value={badges} onChange={setBadges} />
        <DemoControlBoolean name="accessory" value={accessory} onChange={setAccessory} />
        {!android && <Segments name="minimizeBehavior" options={MINIMIZE} value={minimizeBehavior} onChange={setMinimizeBehavior} />}
        <Segments name="background (bottom)" options={BAR_BACKGROUNDS} value={background} onChange={setBackground} />
      </DemoControlsBottom>
    </>
  );
});
