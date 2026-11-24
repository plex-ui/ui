import { useState } from 'react';
import { BottomActions, Button, Text, textColor, useTheme } from '@plexui/react-native';
import { Sparkles } from '@plexui/react-native/icons';
import { ScrollView, View } from 'react-native';
import { DemoControlBoolean, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

/**
 * The first screen of an onboarding with every setting: a symbol, a title and a line in the middle of the screen,
 * Continue at its bottom and, with `second`, a ghost Not now under it. `floating` lays the actions over the content,
 * which then scrolls under them and keeps their room at its end.
 */
export const Overview = docsDemo(function Overview() {
  const [second, setSecond] = useState(true);
  const [floating, setFloating] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="second" value={second} onChange={setSecond} />
        <DemoControlBoolean name="floating" value={floating} onChange={setFloating} />
      </div>
      <RNScreen screen minHeight={560}>
        <Welcome second={second} floating={floating} />
      </RNScreen>
    </>
  );
});

/** The screen's content and its actions, inside the screen so that they take its theme */
function Welcome({ second, floating }: { second: boolean; floating: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        // A floating bar stands over the content: its end keeps the bar's room, so the last line scrolls clear of it
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, paddingTop: 48, paddingBottom: floating ? (second ? 160 : 104) : 24 }}
      >
        <View style={{ marginBottom: 8 }}>
          <Sparkles size={48} color={textColor(theme, 'secondary')} />
        </View>
        <Text variant="title2" weight="bold" align="center">
          Welcome to Projects
        </Text>
        <Text variant="body" color="secondary" align="center">
          Plan the work, share the files and follow every change with your team, in one place.
        </Text>
      </ScrollView>
      <BottomActions floating={floating}>
        <Button color="primary" variant="solid">
          Continue
        </Button>
        {second ? (
          <Button color="secondary" variant="ghost">
            Not now
          </Button>
        ) : null}
      </BottomActions>
    </View>
  );
}
