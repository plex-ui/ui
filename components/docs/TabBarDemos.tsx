'use client';

import { useState, type ReactNode } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Calendar, Folder, Home, Images, SettingsCog, ShoppingBag } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { TabBar, type TabBarProps } from '@plexui/ui/components/TabBar';
import { Toolbar, type BarBackground } from '@plexui/ui/components/Toolbar';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { BAR_BACKGROUNDS } from './ToolbarDemos';
import s from './PageDemos.module.css';
import t from './ToolbarDemos.module.css';

const TABS = [
  { value: 'home', label: 'Home', icon: <Home /> },
  { value: 'calendar', label: 'Calendar', icon: <Calendar /> },
  { value: 'photos', label: 'Photos', icon: <Images /> },
  { value: 'settings', label: 'Settings', icon: <SettingsCog /> },
  { value: 'files', label: 'Files', icon: <Folder /> },
];

function Frame({ children }: { children: ReactNode }) {
  return <div data-demo-stage className={s.Stage}><div className={s.Frame}>{children}</div></div>;
}

function Rows({ label }: { label: string }) {
  return (
    <FieldGroup>
      {Array.from({ length: 24 }, (_, index) => (
        <div key={index} data-row className={t.Row}>
          <span>{label} {index + 1}</span>
        </div>
      ))}
    </FieldGroup>
  );
}

type TabBarMinimizeBehavior = NonNullable<TabBarProps['minimizeBehavior']>;

const BAG = { value: 'bag', label: 'Bag', icon: <ShoppingBag /> };

function Screen({ tabs, search, prominent, minimizeBehavior, background }: { tabs: typeof TABS; search: boolean; prominent: boolean; minimizeBehavior: TabBarMinimizeBehavior; background: BarBackground }) {
  const [tab, setTab] = useState(tabs[0].value);
  // A tab the settings take away leaves the first one selected
  const shown = [...tabs, ...(search ? [{ value: 'search', label: 'Search' }] : []), ...(prominent ? [BAG] : [])];
  const current = shown.find((item) => item.value === tab) ?? tabs[0];
  return (
    <Frame>
      <Page surface="grouped">
        <Toolbar background={background}>
          <Toolbar.Title>{current.label}</Toolbar.Title>
        </Toolbar>
        <Page.Content>
          <Rows label={current.label} />
        </Page.Content>
        <TabBar
          value={current.value}
          onValueChange={setTab}
          search={search ? { value: 'search' } : undefined}
          prominent={prominent ? BAG : undefined}
          minimizeBehavior={minimizeBehavior}
          background={background}
        >
          {tabs.map((item) => <TabBar.Item key={item.value} {...item} />)}
        </TabBar>
      </Page>
    </Frame>
  );
}

const COUNTS = ['2', '3', '4', '5'] as const;
const MINIMIZE: TabBarMinimizeBehavior[] = ['never', 'onScrollDown'];

/** One bar with its settings: the number of tabs, the search and prominent circles, minimizing and the background */
export function TabBarDemo() {
  const [count, setCount] = useState<(typeof COUNTS)[number]>('4');
  const [search, setSearch] = useState(false);
  const [prominent, setProminent] = useState(false);
  const [minimizeBehavior, setMinimizeBehavior] = useState<TabBarMinimizeBehavior>('never');
  const [background, setBackground] = useState<BarBackground>('soft');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="tabs">
          <SegmentedControl<(typeof COUNTS)[number]> aria-label="tabs" size="xs" value={count} onChange={setCount}>
            {COUNTS.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="search" value={search} onChange={setSearch} />
        <DemoControlBoolean name="prominent" value={prominent} onChange={setProminent} />
        <DemoControlRow name="minimizeBehavior">
          <SegmentedControl<TabBarMinimizeBehavior> aria-label="minimizeBehavior" size="xs" value={minimizeBehavior} onChange={setMinimizeBehavior}>
            {MINIMIZE.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="background">
          <SegmentedControl<BarBackground> aria-label="background" size="xs" value={background} onChange={setBackground}>
            {BAR_BACKGROUNDS.map((value) => <SegmentedControl.Option key={value} value={value}>{value}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <Screen tabs={TABS.slice(0, Number(count))} search={search} prominent={prominent} minimizeBehavior={minimizeBehavior} background={background} />
    </>
  );
}
