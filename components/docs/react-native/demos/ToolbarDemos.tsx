import { Button, IconButton, List, ListItem, NavigationButton, SegmentedControl, Toolbar } from '@plexui/react-native';
import { ChatCompose, DotsHorizontal, Filter, PlusLg, Search, Share } from '@plexui/react-native/icons';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

/** The top of a phone screen: the bar from edge to edge, the canvas under it. */
const top = { margin: -16, flexGrow: 1 } as const;
/** The bottom of a phone screen. */
const bottom = { margin: -16, flexGrow: 1, justifyContent: 'flex-end' } as const;

export function Overview() {
  return (
    <View style={top}>
      <Toolbar safeArea={false}>
        <Toolbar.Leading>
          <NavigationButton action="back" />
        </Toolbar.Leading>
        <Toolbar.Title>Inbox</Toolbar.Title>
        <Toolbar.Trailing>
          <IconButton icon={<Search />} accessibilityLabel="Search" />
        </Toolbar.Trailing>
      </Toolbar>
    </View>
  );
}

export function Navigation() {
  return (
    <View style={top}>
      <Toolbar safeArea={false}>
        <Toolbar.Leading>
          <NavigationButton action="close" />
        </Toolbar.Leading>
        <Toolbar.Title subtitle="12 unread">Mailboxes</Toolbar.Title>
        <Toolbar.Trailing>
          <NavigationButton action="confirm" />
        </Toolbar.Trailing>
      </Toolbar>
    </View>
  );
}

export function Group() {
  return (
    <View style={top}>
      <Toolbar safeArea={false} titleAlign="start">
        <Toolbar.Leading>
          <NavigationButton action="back" />
        </Toolbar.Leading>
        <Toolbar.Title>Photos</Toolbar.Title>
        <Toolbar.Trailing>
          <Toolbar.Group>
            <IconButton icon={<Share />} accessibilityLabel="Share" />
            <IconButton icon={<DotsHorizontal />} accessibilityLabel="More" />
          </Toolbar.Group>
        </Toolbar.Trailing>
      </Toolbar>
    </View>
  );
}

export function LargeTitle() {
  return (
    <View style={top}>
      <Toolbar safeArea={false} titleStyle="large">
        <Toolbar.Leading>
          <Button variant="ghost">Edit</Button>
        </Toolbar.Leading>
        <Toolbar.Title subtitle="Updated just now">Notes</Toolbar.Title>
        <Toolbar.Trailing>
          <Toolbar.Group>
            <IconButton icon={<Filter />} accessibilityLabel="Filter" />
            <IconButton icon={<ChatCompose />} accessibilityLabel="New note" />
          </Toolbar.Group>
        </Toolbar.Trailing>
      </Toolbar>
    </View>
  );
}

export function Content() {
  const [period, setPeriod] = useState('week');
  return (
    <View style={top}>
      <Toolbar safeArea={false}>
        <Toolbar.Leading>
          <NavigationButton action="close" />
        </Toolbar.Leading>
        <Toolbar.Content>
          <SegmentedControl aria-label="Period" value={period} onChange={setPeriod}>
            <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
            <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
            <SegmentedControl.Tab value="month">Month</SegmentedControl.Tab>
          </SegmentedControl>
        </Toolbar.Content>
        <Toolbar.Trailing>
          <NavigationButton action="confirm" />
        </Toolbar.Trailing>
      </Toolbar>
    </View>
  );
}

export function Row() {
  const [filter, setFilter] = useState('all');
  return (
    <View style={top}>
      <Toolbar safeArea={false}>
        <Toolbar.Title>Chats</Toolbar.Title>
        <Toolbar.Trailing>
          <IconButton icon={<ChatCompose />} accessibilityLabel="New chat" />
        </Toolbar.Trailing>
        <Toolbar.Row>
          <SegmentedControl aria-label="Filter" value={filter} onChange={setFilter} block>
            <SegmentedControl.Tab value="all">All</SegmentedControl.Tab>
            <SegmentedControl.Tab value="unread">Unread</SegmentedControl.Tab>
            <SegmentedControl.Tab value="groups">Groups</SegmentedControl.Tab>
          </SegmentedControl>
        </Toolbar.Row>
      </Toolbar>
    </View>
  );
}

type ScrollEvent = { nativeEvent: { contentOffset: { y: number } } };

const MESSAGES = [
  ['Jane Cooper', 'Lunch on Friday?'],
  ['Design review', 'The new screens are up'],
  ['Alex Morgan', 'Sent you the photos'],
  ['Billing', 'Your receipt for November'],
  ['Sam Lee', 'Running ten minutes late'],
  ['Team', 'Standup moved to 10:30'],
  ['Priya Patel', 'Thanks for the notes'],
  ['Travel', 'Your flight is confirmed'],
  ['Chris Wong', 'Can you take a look?'],
  ['Newsletter', 'This week in design'],
];

export function Scrolled() {
  const [scrolled, setScrolled] = useState(false);
  const [background, setBackground] = useState<'glass' | 'hard' | 'soft' | 'none'>('glass');
  return (
    <View style={{ margin: -16, height: 320 }}>
      <ScrollView
        onScroll={(event: ScrollEvent) => setScrolled(event.nativeEvent.contentOffset.y > 0)}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 16, gap: 16 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <SegmentedControl aria-label="Background" value={background} onChange={setBackground} size="sm" block>
            <SegmentedControl.Tab value="glass">glass</SegmentedControl.Tab>
            <SegmentedControl.Tab value="hard">hard</SegmentedControl.Tab>
            <SegmentedControl.Tab value="soft">soft</SegmentedControl.Tab>
            <SegmentedControl.Tab value="none">none</SegmentedControl.Tab>
          </SegmentedControl>
        </View>
        <List surface="plain">
          {MESSAGES.map(([from, text]) => (
            <ListItem key={from} label={from} description={text} />
          ))}
        </List>
      </ScrollView>
      <Toolbar safeArea={false} scrolled={scrolled} background={background} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Toolbar.Leading>
          <NavigationButton action="back" />
        </Toolbar.Leading>
        <Toolbar.Title>Inbox</Toolbar.Title>
        <Toolbar.Trailing>
          <IconButton icon={<Search />} accessibilityLabel="Search" />
        </Toolbar.Trailing>
      </Toolbar>
    </View>
  );
}

export function Bottom() {
  return (
    <View style={bottom}>
      <Toolbar placement="bottom" safeArea={false}>
        <Toolbar.Leading>
          <IconButton icon={<Filter />} accessibilityLabel="Filter" />
        </Toolbar.Leading>
        <Toolbar.Content>
          <Toolbar.Group>
            <IconButton icon={<Share />} accessibilityLabel="Share" />
            <IconButton icon={<Search />} accessibilityLabel="Search" />
          </Toolbar.Group>
        </Toolbar.Content>
        <Toolbar.Trailing>
          <IconButton variant="solid" icon={<PlusLg />} accessibilityLabel="New" />
        </Toolbar.Trailing>
      </Toolbar>
    </View>
  );
}
