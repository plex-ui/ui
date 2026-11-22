import { List, ListItem, TabBar, Text, useTabBarMinimize } from '@plexui/react-native';
import { Calendar, Chats, Home, Music, PlayCircle, PlusLg, SettingsCog } from '@plexui/react-native/icons';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

/** The bottom of a phone screen: the bar from edge to edge. */
const bottom = { margin: -16, flexGrow: 1, justifyContent: 'flex-end' } as const;

function tabs({ badges = {}, disabled }: { badges?: Record<string, ReactNode>; disabled?: string } = {}) {
  return [
    <TabBar.Item key="home" value="home" label="Home" icon={<Home />} badge={badges.home} disabled={disabled === 'home'} />,
    <TabBar.Item key="chats" value="chats" label="Chats" icon={<Chats />} badge={badges.chats} disabled={disabled === 'chats'} />,
    <TabBar.Item key="calendar" value="calendar" label="Calendar" icon={<Calendar />} badge={badges.calendar} disabled={disabled === 'calendar'} />,
    <TabBar.Item key="settings" value="settings" label="Settings" icon={<SettingsCog />} badge={badges.settings} disabled={disabled === 'settings'} />,
  ];
}

export function Overview() {
  const [tab, setTab] = useState('home');
  return (
    <View style={bottom}>
      <Text variant="footnote" color="secondary" align="center" style={{ marginBottom: 12 }}>
        Selected: {tab}
      </Text>
      <TabBar value={tab} onValueChange={setTab} safeArea={false}>
        <TabBar.Item value="home" label="Home" icon={<Home />} />
        <TabBar.Item value="chats" label="Chats" icon={<Chats />} badge={3} />
        <TabBar.Item value="calendar" label="Calendar" icon={<Calendar />} />
        <TabBar.Item value="settings" label="Settings" icon={<SettingsCog />} />
      </TabBar>
    </View>
  );
}

export function Search() {
  return (
    <View style={bottom}>
      <TabBar defaultValue="home" search={{ value: 'search' }} safeArea={false}>
        {tabs()}
      </TabBar>
    </View>
  );
}

export function Prominent() {
  return (
    <View style={bottom}>
      <TabBar defaultValue="home" prominent={{ value: 'new', label: 'New', icon: <PlusLg /> }} safeArea={false}>
        {tabs().slice(0, 3)}
      </TabBar>
    </View>
  );
}

export function Badges() {
  return (
    <View style={bottom}>
      <TabBar defaultValue="home" safeArea={false}>
        {tabs({ badges: { home: 0, chats: 128, calendar: 'New', settings: true } })}
      </TabBar>
    </View>
  );
}

export function Disabled() {
  return (
    <View style={bottom}>
      <TabBar defaultValue="home" safeArea={false}>
        {tabs({ disabled: 'calendar' })}
      </TabBar>
    </View>
  );
}

function NowPlaying() {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
      <Music size={20} />
      <Text variant="subheadline" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
        Morning walk
      </Text>
      <PlayCircle size={24} />
    </View>
  );
}

export function Accessory() {
  return (
    <View style={bottom}>
      <TabBar defaultValue="home" accessory={<NowPlaying />} safeArea={false}>
        {tabs()}
      </TabBar>
    </View>
  );
}

const NOTES = [
  'Groceries',
  'Trip to Lisbon',
  'Book list',
  'Meeting notes',
  'Gift ideas',
  'Recipes',
  'Workout plan',
  'Reading log',
  'Project ideas',
  'Packing list',
  'Movies to watch',
  'Garden',
];

export function Minimized() {
  const { onScroll, scrollEventThrottle, minimized, onMinimizedChange } = useTabBarMinimize();
  return (
    <View style={{ margin: -16, height: 360 }}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        <List surface="plain">
          {NOTES.map((note) => (
            <ListItem key={note} label={note} />
          ))}
        </List>
      </ScrollView>
      <TabBar
        defaultValue="home"
        search={{ value: 'search' }}
        minimized={minimized}
        onMinimizedChange={onMinimizedChange}
        safeArea={false}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        {tabs()}
      </TabBar>
    </View>
  );
}
