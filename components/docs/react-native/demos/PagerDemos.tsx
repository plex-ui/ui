import { useState } from 'react';
import { List, ListItem, Pager, SegmentedControl, Toolbar, ToolbarInsetProvider, useTheme, useToolbarInset } from '@plexui/react-native';
import { ScrollView, View } from 'react-native';
import { DemoControlBoolean, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

/** The pages of a trip, each a segment over them */
const TABS = ['Plan', 'Stays', 'Notes'] as const;
type Tab = (typeof TABS)[number];

const ROWS: Record<Tab, { label: string; detail: string }[]> = {
  Plan: [
    { label: 'Fly to Lisbon', detail: 'Mon 9:40' },
    { label: 'Tram 28 to Alfama', detail: 'Mon 15:00' },
    { label: 'Sintra day trip', detail: 'Tue' },
    { label: 'Belém and the river', detail: 'Wed' },
    { label: 'Fly home', detail: 'Thu 18:20' },
  ],
  Stays: [
    { label: 'Casa do Largo', detail: '3 nights' },
    { label: 'Airport hotel', detail: '1 night' },
  ],
  Notes: [
    { label: 'Book Pena Palace', detail: 'Timed entry' },
    { label: 'Card for the metro', detail: 'Viva Viagem' },
    { label: 'Pastéis de nata', detail: 'Manteigaria' },
  ],
};

/**
 * The Overview: a segmented control over a pager, as Material's tabs over a pager. A swipe turns the pages and the
 * thumb follows the finger (`onPageScroll` into `position`); a segment pressed puts its page in place (`page`).
 * `swipe` off leaves the pages to the segments alone.
 */
export const Overview = docsDemo(function Overview() {
  const [swipe, setSwipe] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="swipe" value={swipe} onChange={setSwipe} />
      </div>
      <RNScreen screen grouped minHeight={520}>
        <Trip swipe={swipe} />
      </RNScreen>
    </>
  );
});

/** The control and its pages, inside the screen so that they take its theme */
function Trip({ swipe }: { swipe: boolean }) {
  return (
    <ToolbarInsetProvider>
      <TripScreen swipe={swipe} />
    </ToolbarInsetProvider>
  );
}

/** The bar floats over the pages: each page starts under it and runs on under its soft edge as it scrolls */
function TripScreen({ swipe }: { swipe: boolean }) {
  const [page, setPage] = useState(0);
  const [position, setPosition] = useState(0);
  // Each page's scroll, for the bar's edge to show once content is under it
  const [under, setUnder] = useState<Record<number, boolean>>({});
  const inset = useToolbarInset();
  // The bar's edge takes the grouped screen's gray
  const canvas = useTheme().colors.groupedBackground;
  return (
    <View style={{ flex: 1 }}>
      {/* The bar takes the status bar's room; its row holds the segments, as an iOS bar sets a segmented control */}
      <Toolbar floating background="soft" scrolled={!!under[page]} canvasColor={canvas}>
        <Toolbar.Title>Lisbon</Toolbar.Title>
        <Toolbar.Row>
          <SegmentedControl
            aria-label="Trip"
            block
            value={TABS[page]}
            position={position}
            onChange={(next: Tab) => setPage(TABS.indexOf(next))}
          >
            {TABS.map((tab) => (
              <SegmentedControl.Tab key={tab} value={tab}>
                {tab}
              </SegmentedControl.Tab>
            ))}
          </SegmentedControl>
        </Toolbar.Row>
      </Toolbar>
      <Pager page={page} onPageChange={setPage} onPageScroll={setPosition} scrollEnabled={swipe} style={{ flex: 1 }}>
        {TABS.map((tab, index) => (
          <ScrollView
            key={tab}
            scrollEventThrottle={16}
            onScroll={(event: { nativeEvent: { contentOffset: { y: number } } }) => {
              const next = event.nativeEvent.contentOffset.y > 0;
              setUnder((old) => (old[index] === next ? old : { ...old, [index]: next }));
            }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: inset.top + 16, paddingBottom: 24 }}
            scrollIndicatorInsets={{ top: inset.top }}
          >
            <List>
              {ROWS[tab].map((row) => (
                <ListItem key={row.label} label={row.label} value={row.detail} />
              ))}
            </List>
          </ScrollView>
        ))}
      </Pager>
    </View>
  );
}
