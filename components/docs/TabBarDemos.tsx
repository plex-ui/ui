'use client';

import { useState, type ReactNode } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Calendar, Home, Images, SettingsCog } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { TabBar } from '@plexui/ui/components/TabBar';
import { Toolbar, type BarBackground } from '@plexui/ui/components/Toolbar';
import { BarBackgroundControl } from './ToolbarDemos';
import s from './PageDemos.module.css';
import t from './ToolbarDemos.module.css';

const TABS = [
  { value: 'home', label: 'Home', icon: <Home /> },
  { value: 'calendar', label: 'Calendar', icon: <Calendar /> },
  { value: 'photos', label: 'Photos', icon: <Images /> },
  { value: 'settings', label: 'Settings', icon: <SettingsCog /> },
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

function Screen({ tabs, search, minimize = false, background }: { tabs: typeof TABS; search?: boolean; minimize?: boolean; background?: BarBackground }) {
  const [tab, setTab] = useState(tabs[0].value);
  const title = tab === 'search' ? 'Search' : tabs.find((item) => item.value === tab)?.label ?? '';
  return (
    <Frame>
      <Page surface="grouped">
        <Toolbar background={background}>
          <Toolbar.Title>{title}</Toolbar.Title>
        </Toolbar>
        <Page.Content>
          <Rows label={title} />
        </Page.Content>
        <TabBar
          value={tab}
          onValueChange={setTab}
          search={search ? { value: 'search' } : undefined}
          minimizeBehavior={minimize ? 'onScrollDown' : 'never'}
          background={background}
        >
          {tabs.map((item) => <TabBar.Item key={item.value} {...item} />)}
        </TabBar>
      </Page>
    </Frame>
  );
}

export function TabBarOverviewDemo() {
  return <Screen tabs={TABS} />;
}

export function TabBarSearchDemo() {
  return <Screen tabs={TABS.slice(0, 3)} search />;
}

export function TabBarMinimizeDemo() {
  return <Screen tabs={TABS.slice(0, 3)} search minimize />;
}

export function TabBarBackgroundDemo() {
  const [background, setBackground] = useState<BarBackground>('soft');

  return (
    <>
      <BarBackgroundControl value={background} onChange={setBackground} />
      <Screen tabs={TABS} background={background} />
    </>
  );
}
