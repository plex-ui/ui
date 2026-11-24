'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { BarChart, Home, Mic, Music, Play, ShoppingBag, Skip, Sparkles, Stack } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { TabBar, type TabBarProps } from '@plexui/ui/components/TabBar';
import { Toolbar, type BarBackground } from '@plexui/ui/components/Toolbar';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { DemoControlsBottom } from './PreviewEmbed';
import { BarBackgroundRow } from './ToolbarDemos';
import s from './PageDemos.module.css';
import t from './ToolbarDemos.module.css';
import b from './TabBarDemos.module.css';
import { NOW_PLAYING, TAB_BAR_BADGES, TAB_BAR_PROMINENT, TAB_BAR_ROWS, TAB_BAR_TABS } from './tabBarData';

/** The sections of a music app (tabBarData), each with its symbol */
const ICONS: Record<string, ReactNode> = { home: <Home />, new: <Sparkles />, radio: <Mic />, library: <Stack />, charts: <BarChart /> };
const TABS: { value: string; label: string; icon: ReactNode }[] = TAB_BAR_TABS.map((tab) => ({ ...tab, icon: ICONS[tab.value] }));

function Frame({ children }: { children: ReactNode }) {
  return <div data-demo-stage className={s.Stage}><div className={s.Frame}>{children}</div></div>;
}

/** What the selected section lists: a title and, at the row's end, a detail */
function Rows({ section }: { section: string }) {
  return (
    <FieldGroup>
      {TAB_BAR_ROWS[section].map(([title, detail]) => (
        <div key={title} data-row className={t.Row}>
          <span>{title}</span>
          {detail && <span className={t.Value}>{detail}</span>}
        </div>
      ))}
    </FieldGroup>
  );
}

type TabBarMinimizeBehavior = NonNullable<TabBarProps['minimizeBehavior']>;

/** The app's own content in the bottom accessory: a now playing row */
function NowPlaying() {
  return (
    <div className={b.NowPlaying}>
      <span className={b.Artwork} aria-hidden="true"><Music /></span>
      <span className={b.Title}>{NOW_PLAYING}</span>
      <Button color="secondary" variant="ghost" uniform pill aria-label="Play"><Play /></Button>
      <Button color="secondary" variant="ghost" uniform pill aria-label="Next"><Skip /></Button>
    </div>
  );
}

const STORE = { ...TAB_BAR_PROMINENT, icon: <ShoppingBag /> };

function Screen({ tabs, search, prominent, badges, accessory, minimizeBehavior, toolbarBackground, background }: { tabs: typeof TABS; search: boolean; prominent: boolean; badges: boolean; accessory: boolean; minimizeBehavior: TabBarMinimizeBehavior; toolbarBackground: BarBackground; background: BarBackground }) {
  const [tab, setTab] = useState(tabs[0].value);
  // A tab the settings take away leaves the first one selected
  const shown = [...tabs, ...(search ? [{ value: 'search', label: 'Search' }] : []), ...(prominent ? [STORE] : [])];
  const current = shown.find((item) => item.value === tab) ?? tabs[0];
  return (
    <Frame>
      <Page surface="grouped" width="column">
        <Toolbar background={toolbarBackground}>
          <Toolbar.Title>{current.label}</Toolbar.Title>
        </Toolbar>
        <Page.Content>
          <Rows section={current.value} />
        </Page.Content>
        <TabBar
          value={current.value}
          onValueChange={setTab}
          search={search ? { value: 'search' } : undefined}
          prominent={prominent ? STORE : undefined}
          minimizeBehavior={minimizeBehavior}
          background={background}
          accessory={accessory && <NowPlaying />}
        >
          {tabs.map((item) => <TabBar.Item key={item.value} {...item} badge={badges ? TAB_BAR_BADGES[item.value] : undefined} />)}
        </TabBar>
      </Page>
    </Frame>
  );
}

const COUNTS = ['2', '3', '4', '5'] as const;
const MINIMIZE: TabBarMinimizeBehavior[] = ['never', 'onScrollDown'];

/**
 * The kit's Tab Bar - iPhone (507:24689) holds five tabs at most, the search or prominent circle counted:
 * with a circle the capsule keeps four. A count the circles leave no room for shows the largest that fits.
 */
const tabBarMaxTabs = (search: boolean, prominent: boolean) => 5 - Number(search) - Number(prominent);

/** One bar with its settings: the number of tabs, the search and prominent circles, badges, the accessory, minimizing
 * and the backgrounds */
export function TabBarDemo() {
  const [count, setCount] = useState<(typeof COUNTS)[number]>('4');
  const [search, setSearch] = useState(false);
  const [prominent, setProminent] = useState(false);
  const [badges, setBadges] = useState(false);
  const [accessory, setAccessory] = useState(false);
  const [minimizeBehavior, setMinimizeBehavior] = useState<TabBarMinimizeBehavior>('never');
  const [toolbarBackground, setToolbarBackground] = useState<BarBackground>('glass');
  const [background, setBackground] = useState<BarBackground>('soft');
  const max = tabBarMaxTabs(search, prominent);
  const shownCount = String(Math.min(Number(count), max)) as (typeof COUNTS)[number];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <BarBackgroundRow name="background (top)" value={toolbarBackground} onChange={setToolbarBackground} />
      </div>
      <Screen tabs={TABS.slice(0, Number(shownCount))} search={search} prominent={prominent} badges={badges} accessory={accessory} minimizeBehavior={minimizeBehavior} toolbarBackground={toolbarBackground} background={background} />
      {/* The bar is at the bottom of the screen, so its settings stand under the preview (owner 09.11) */}
      <DemoControlsBottom style={controlsTableStyle}>
        <DemoControlRow name="tabs">
          {/* The shown count coming back (the phone view's sync) keeps the count asked for, which returns with the room */}
          <SegmentedControl<(typeof COUNTS)[number]> aria-label="tabs" size="xs" value={shownCount} onChange={(value) => { if (value !== shownCount) setCount(value); }}>
            {COUNTS.map((value) => <SegmentedControl.Option key={value} value={value} disabled={Number(value) > max}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="search" value={search} onChange={setSearch} />
        <DemoControlBoolean name="prominent" value={prominent} onChange={setProminent} />
        <DemoControlBoolean name="badge" value={badges} onChange={setBadges} />
        <DemoControlBoolean name="accessory" value={accessory} onChange={setAccessory} />
        <DemoControlRow name="minimizeBehavior">
          <SegmentedControl<TabBarMinimizeBehavior> aria-label="minimizeBehavior" size="xs" value={minimizeBehavior} onChange={setMinimizeBehavior}>
            {MINIMIZE.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        <BarBackgroundRow name="background (bottom)" value={background} onChange={setBackground} />
      </DemoControlsBottom>
    </>
  );
}
