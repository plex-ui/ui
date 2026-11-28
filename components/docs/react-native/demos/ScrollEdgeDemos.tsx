import { useState } from 'react';
import { Avatar, List, ListItem, ScrollEdge, Text, useTheme } from '@plexui/react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo, useScreenCanvas } from '../RNScreen';

// The docs see react-native untyped (types/plexui-react-native.d.ts): the shapes used here
type ScrollEvent = { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } };

const EDGES = ['top', 'bottom'] as const;
type Edge = (typeof EDGES)[number];
const BACKGROUNDS = ['soft', 'fade'] as const;
type Background = (typeof BACKGROUNDS)[number];

const SECTIONS = [
  ['Personal details', 'Password & Security', 'Payment & Shipping', 'Subscriptions'],
  ['Notifications', 'Language', 'Appearance', 'Privacy', 'Storage'],
  ['Help', 'About', 'Sign out'],
];

/**
 * An account screen with no top bar: its own header scrolls up under the clock and the status icons, where the top
 * edge mutes it once it has scrolled; the bottom edge mutes the rows that run on to the screen's bottom.
 */
export const Overview = docsDemo(function Overview() {
  const [edge, setEdge] = useState<Edge>('top');
  const [background, setBackground] = useState<Background>('soft');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="edge" options={EDGES} value={edge} onChange={setEdge} />
        <Segments name="background" options={BACKGROUNDS} value={background} onChange={setBackground} />
      </div>
      <RNScreen screen grouped minHeight={640}>
        <Account edge={edge} background={background} />
      </RNScreen>
    </>
  );
});

function Account({ edge, background }: { edge: Edge; background: Background }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const canvas = useScreenCanvas();
  const [offset, setOffset] = useState(0);
  return (
    <View style={StyleSheet.absoluteFill}>
      <ScrollView
        style={{ flex: 1 }}
        scrollEventThrottle={16}
        onScroll={(event: ScrollEvent) => setOffset(event.nativeEvent.contentOffset.y)}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: theme.isAndroid ? 12 : 16, gap: 24 }}
      >
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Avatar name="Alex Morgan" size={88} />
          <Text variant="title2" weight="bold">
            Alex Morgan
          </Text>
          <Text variant="subheadline" color="secondary">
            alex@example.com
          </Text>
        </View>
        {SECTIONS.map((rows) => (
          <List key={rows[0]}>
            {rows.map((row) => (
              <ListItem key={row} label={row} onPress={() => {}} />
            ))}
          </List>
        ))}
      </ScrollView>
      <ScrollEdge edge={edge} background={background} scrolled={offset > 0} canvasColor={canvas} />
    </View>
  );
}
