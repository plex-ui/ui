import { useState } from 'react';
import { BottomActions, Button, List, ListItem, Text, useTheme } from '@plexui/react-native';
import { CheckMd, Health } from '@plexui/react-native/icons';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const BACKGROUNDS = ['soft', 'fade'] as const;
type Background = (typeof BACKGROUNDS)[number];

/** The forms of a medication, as the Health app's "Choose the Medication Type" step lists them */
const COMMON_FORMS = ['Capsule', 'Tablet', 'Liquid', 'Topical'];
const MORE_FORMS = ['Cream', 'Device', 'Drops', 'Foam', 'Gel', 'Inhaler', 'Injection', 'Lotion', 'Patch', 'Powder', 'Spray'];

/**
 * A step of a setup flow with every setting, after the iOS 27 Health app's "Choose the Medication Type": a symbol, the
 * step's title and two lists of choices, Next at the bottom (disabled until a choice is made) and, with `second`, Skip
 * under it (iOS's glass capsule, Android's ghost button). `floating` lays the actions over the lists, which then scroll
 * under them and keep their room at their end; `background` sets the edge under them.
 */
export const Overview = docsDemo(function Overview() {
  const [second, setSecond] = useState(true);
  const [floating, setFloating] = useState(true);
  const [background, setBackground] = useState<Background>('soft');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="second" value={second} onChange={setSecond} />
        <DemoControlBoolean name="floating" value={floating} onChange={setFloating} />
        {floating ? <Segments name="background" options={BACKGROUNDS} value={background} onChange={setBackground} /> : null}
      </div>
      <RNScreen screen minHeight={560}>
        <MedicationType second={second} floating={floating} background={background} />
      </RNScreen>
    </>
  );
});

/** The step's content and its actions, inside the screen so that they take its theme */
function MedicationType({ second, floating, background }: { second: boolean; floating: boolean; background: Background }) {
  const theme = useTheme();
  // The screen is the window's height at most, so the lists scroll inside it, under floating actions
  const { height } = useWindowDimensions();
  const [form, setForm] = useState<string | null>(null);
  const row = (choice: string) => (
    <ListItem
      key={choice}
      label={choice}
      trailing={form === choice ? <CheckMd color={theme.colors.accent} /> : undefined}
      disclosure={false}
      onPress={() => setForm(choice)}
    />
  );
  return (
    <View style={{ flex: 1, maxHeight: height }}>
      <ScrollView
        style={{ flex: 1 }}
        // Floating actions stand over the lists: their end keeps the actions' room, so the last row scrolls clear of them
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 72, paddingBottom: floating ? (second ? 160 : 104) : 24 }}
      >
        {/* The symbol in the middle, the title at the rows' text, as Health sets a step over long lists */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Health size={64} color={theme.colors.accent} />
        </View>
        <Text variant="title2" weight="bold" style={{ marginHorizontal: 20, marginBottom: 8 }}>
          Choose the Medication Type
        </Text>
        <List surface="plain" header="Common Forms">
          {COMMON_FORMS.map(row)}
        </List>
        <List surface="plain" header="More Forms" style={{ marginTop: 16 }}>
          {MORE_FORMS.map(row)}
        </List>
      </ScrollView>
      <BottomActions floating={floating} background={background}>
        <Button color="primary" variant="solid" disabled={form === null}>
          Next
        </Button>
        {second ? <Button color="secondary">Skip</Button> : null}
      </BottomActions>
    </View>
  );
}
