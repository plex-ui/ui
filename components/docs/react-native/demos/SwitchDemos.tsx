import { useState } from 'react';
import { List, ListItem, NavigationButton, Switch, ThemeProvider, Toolbar, useTheme } from '@plexui/react-native';
import { ScrollView } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

// ThemeProvider's selectionColor: the on color of every switch, checkbox and radio that sets none of its own
const SELECTION_COLORS = ['primary', 'accent'] as const;
// Two settings, one on and one off, so every setting shows on both states
const OVERVIEW_SWITCHES = [
  { name: 'notifications', label: 'Notifications', description: 'Messages and mentions.', defaultChecked: true },
  { name: 'summary', label: 'Weekly summary', description: 'Sent on Mondays.', defaultChecked: false },
] as const;

/**
 * The Overview, as the React page's Phone view: two settings, one on and one off, each switch the trailing control of
 * a list row that holds its label and description. The label stays at the start of the row, so `labelPosition`, a
 * desktop setting there, is not offered. The on color is the app's `selectionColor`, set on its ThemeProvider (the
 * React page's `color`; the accent is the platform toggle green on iOS, as there).
 */
export const Overview = docsDemo(function Overview() {
  const [selectionColor, setSelectionColor] = useState<(typeof SELECTION_COLORS)[number]>('accent');
  const [description, setDescription] = useState(false);
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="selectionColor" options={SELECTION_COLORS} value={selectionColor} onChange={setSelectionColor} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen grouped minHeight={200}>
        <ThemeProvider selectionColor={selectionColor}>
          <List>
            {OVERVIEW_SWITCHES.map((item) => (
              <ListItem
                key={item.name}
                label={item.label}
                description={description ? item.description : undefined}
                // A row whose switch is disabled reads as disabled: its label and description dim with it
                disabled={disabled}
                trailing={<Switch accessibilityLabel={item.label} defaultChecked={item.defaultChecked} disabled={disabled} />}
              />
            ))}
          </List>
        </ThemeProvider>
      </RNScreen>
    </>
  );
});

/** Controlled state: the `checked` control and the switch change one state */
export const Controlled = docsDemo(function Controlled() {
  const [checked, setChecked] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="checked" value={checked} onChange={setChecked} />
      </div>
      <RNScreen grouped minHeight={200}>
        <List>
          <ListItem label="Airplane mode" trailing={<Switch color="accent" accessibilityLabel="Airplane mode" checked={checked} onCheckedChange={setChecked} />} />
        </List>
      </RNScreen>
    </>
  );
});

/** Rows to the next group's rows: iOS Settings' 35, less what its header (39) takes beyond the native step */
const GROUP_GAP = 35 - 18.67;

/** Grouped settings: a Preferences screen of two groups, a locked setting explained by its row's description */
export function Settings() {
  const android = useTheme().isAndroid;
  return (
    <>
      <Toolbar>
        <Toolbar.Leading>
          <NavigationButton action="back" />
        </Toolbar.Leading>
        <Toolbar.Title>Preferences</Toolbar.Title>
      </Toolbar>
      {/* A settings page: 10 under the bar, 16 from the screen's edges */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: android ? 12 : 10, paddingHorizontal: android ? 12 : 16, paddingBottom: 16, gap: android ? 12 : GROUP_GAP }}>
        <List header="Notifications">
          <ListItem label="Push notifications" trailing={<Switch color="accent" accessibilityLabel="Push notifications" defaultChecked />} />
          <ListItem label="Product updates" description="A few emails a month." trailing={<Switch color="accent" accessibilityLabel="Product updates" />} />
        </List>
        <List header="Privacy" footer="You can change your data sharing preference at any time.">
          <ListItem label="Share usage data" trailing={<Switch color="accent" accessibilityLabel="Share usage data" />} />
          <ListItem label="Security alerts" description="Required for your account." disabled trailing={<Switch color="accent" accessibilityLabel="Security alerts" defaultChecked disabled />} />
        </List>
      </ScrollView>
    </>
  );
}
