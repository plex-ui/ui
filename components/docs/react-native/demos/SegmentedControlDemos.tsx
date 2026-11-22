import { SegmentedControl, Text } from '@plexui/react-native';
import { Grid, List, Moon, Sun } from '@plexui/react-native/icons';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

const column = { alignSelf: 'stretch', alignItems: 'center', gap: 12 } as const;

/** A control hugs its segments at the start of its column: a row centers it on the screen. */
function Centered({ children }: { children: ReactNode }) {
  return <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center' }}>{children}</View>;
}

export function Overview() {
  const [period, setPeriod] = useState('week');
  return (
    <View style={column}>
      <Centered>
        <SegmentedControl aria-label="Period" value={period} onChange={setPeriod}>
          <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
          <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
          <SegmentedControl.Tab value="month">Month</SegmentedControl.Tab>
          <SegmentedControl.Tab value="year">Year</SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
      <Text variant="footnote" color="secondary">
        Period: {period}
      </Text>
    </View>
  );
}

export function Sizes() {
  const [small, setSmall] = useState('week');
  const [large, setLarge] = useState('week');
  const [flat, setFlat] = useState('week');
  return (
    <View style={column}>
      <Centered>
        <SegmentedControl aria-label="Small" size="sm" value={small} onChange={setSmall}>
          <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
          <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
          <SegmentedControl.Tab value="month">Month</SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
      <Centered>
        <SegmentedControl aria-label="Large" value={large} onChange={setLarge}>
          <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
          <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
          <SegmentedControl.Tab value="month">Month</SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
      <Centered>
        <SegmentedControl aria-label="Large flat" mobileMaterial="flat" value={flat} onChange={setFlat}>
          <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
          <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
          <SegmentedControl.Tab value="month">Month</SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
    </View>
  );
}

export function Widths() {
  const [content, setContent] = useState('all');
  const [block, setBlock] = useState('all');
  return (
    <View style={column}>
      <Centered>
        <SegmentedControl aria-label="Content width" mobileSegmentWidth="content" value={content} onChange={setContent}>
          <SegmentedControl.Tab value="all">All</SegmentedControl.Tab>
          <SegmentedControl.Tab value="unread">Unread</SegmentedControl.Tab>
          <SegmentedControl.Tab value="flagged">Flagged</SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
      <SegmentedControl aria-label="Block" block value={block} onChange={setBlock}>
        <SegmentedControl.Tab value="all">All</SegmentedControl.Tab>
        <SegmentedControl.Tab value="unread">Unread</SegmentedControl.Tab>
        <SegmentedControl.Tab value="flagged">Flagged</SegmentedControl.Tab>
      </SegmentedControl>
    </View>
  );
}

export function Symbols() {
  const [view, setView] = useState('grid');
  const [scheme, setScheme] = useState('light');
  return (
    <View style={column}>
      <Centered>
        <SegmentedControl aria-label="View" size="sm" value={view} onChange={setView}>
          <SegmentedControl.Tab value="grid" aria-label="Grid" icon={<Grid />} />
          <SegmentedControl.Tab value="list" aria-label="List" icon={<List />} />
        </SegmentedControl>
      </Centered>
      <Centered>
        <SegmentedControl aria-label="Appearance" value={scheme} onChange={setScheme}>
          <SegmentedControl.Tab value="light" icon={<Sun />}>
            Light
          </SegmentedControl.Tab>
          <SegmentedControl.Tab value="dark" icon={<Moon />}>
            Dark
          </SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
    </View>
  );
}

export function Disabled() {
  const [period, setPeriod] = useState('week');
  return (
    <View style={column}>
      <Centered>
        <SegmentedControl aria-label="Period" value={period} onChange={setPeriod}>
          <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
          <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
          <SegmentedControl.Tab value="month" disabled>
            Month
          </SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
      <Centered>
        <SegmentedControl aria-label="Period, disabled" value="week" disabled>
          <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
          <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
          <SegmentedControl.Tab value="month">Month</SegmentedControl.Tab>
        </SegmentedControl>
      </Centered>
    </View>
  );
}
