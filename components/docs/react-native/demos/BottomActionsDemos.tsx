import { useState } from 'react';
import { BottomActions, Button, List, ListItem, NavigationButton, Text, Toolbar, useHideOnScroll, useTheme } from '@plexui/react-native';
import { CheckMd, Health } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { PhonePage } from './ToolbarDemos';

const BACKGROUNDS = ['soft', 'fade', 'none'] as const;
type Background = (typeof BACKGROUNDS)[number];

/** The forms of a medication, as the Health app's "Choose the Medication Type" step lists them */
const COMMON_FORMS = ['Capsule', 'Tablet', 'Liquid', 'Topical'];
const MORE_FORMS = ['Cream', 'Device', 'Drops', 'Foam', 'Gel', 'Inhaler', 'Injection', 'Lotion', 'Patch', 'Powder', 'Spray'];

/**
 * A step of a setup flow with every setting, after the iOS 27 Health app's "Choose the Medication Type": the sheet's
 * bar (Back, the medication's name, Close), a symbol 24 under it, the step's title and two lists of choices, Next at the bottom (disabled until a choice is made) and, with `second`, Skip
 * under it (iOS's glass capsule, Android's ghost button). `floating` lays the actions over the lists, which then scroll
 * under them and keep their room at their end; `background` sets the edge under them; `hideOnScroll` moves them away
 * as the lists scroll down (useHideOnScroll) and back on the way up and at the end.
 */
export const Overview = docsDemo(function Overview() {
  const [second, setSecond] = useState(true);
  const [floating, setFloating] = useState(true);
  const [background, setBackground] = useState<Background>('soft');
  const [hideOnScroll, setHideOnScroll] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="second" value={second} onChange={setSecond} />
        <DemoControlBoolean name="floating" value={floating} onChange={setFloating} />
        {floating ? <Segments name="background" options={BACKGROUNDS} value={background} onChange={setBackground} /> : null}
        {floating ? <DemoControlBoolean name="hideOnScroll" value={hideOnScroll} onChange={setHideOnScroll} /> : null}
      </div>
      <RNScreen screen minHeight={640}>
        <MedicationType second={second} floating={floating} background={background} hideOnScroll={floating && hideOnScroll} />
      </RNScreen>
    </>
  );
});

/** The step's content and its actions, inside the screen so that they take its theme */
function MedicationType({ second, floating, background, hideOnScroll }: { second: boolean; floating: boolean; background: Background; hideOnScroll: boolean }) {
  const theme = useTheme();
  const hide = useHideOnScroll();
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
    <PhonePage
      top={(scrolled, canvas) => (
        <Toolbar scrolled={scrolled} canvasColor={canvas}>
          <Toolbar.Leading>
            <NavigationButton action="back" />
          </Toolbar.Leading>
          <Toolbar.Title>Ibuprofen</Toolbar.Title>
          <Toolbar.Trailing>
            <NavigationButton action="close" />
          </Toolbar.Trailing>
        </Toolbar>
      )}
      onScroll={hideOnScroll ? hide.onScroll : undefined}
      // Floating actions stand over the lists, which scroll under them and keep their room at their end
      bottom={() => (
        <BottomActions floating={floating} background={background} hidden={hideOnScroll && hide.hidden}>
          <Button color="primary" variant="solid" disabled={form === null}>
            Next
          </Button>
          {second ? <Button color="secondary">Skip</Button> : null}
        </BottomActions>
      )}
    >
      {/* As Health sets a step over long lists (measured on iOS 27): the symbol's drawing in the middle 24 under the
          bar's buttons, the title's line 29 under it at the rows' text, no description (a step that needs one sets it
          under the title, in the secondary label). The page starts 16 under the bar's 10 of padding, and the symbol's
          box keeps 5 round its drawing: -8 over it, 24 under it */}
      <View style={{ alignItems: 'center', marginTop: -8, marginBottom: 24 }}>
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
    </PhonePage>
  );
}
