import { useState } from 'react';
import { List, ListItem, NavigationButton, RadioGroup, ThemeProvider, Toolbar, useTheme } from '@plexui/react-native';
import { ScrollView } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

// ThemeProvider's selectionColor: the mark of the chosen option
const SELECTION_COLORS = ['primary', 'accent'] as const;
const FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'A summary every morning.' },
  { value: 'weekly', label: 'Weekly', description: 'A digest every Monday.' },
  { value: 'monthly', label: 'Monthly', description: 'A recap on the first of the month.' },
  { value: 'never', label: 'Never', description: 'Only security alerts.' },
];

/**
 * The Overview, as the React page's Phone view: each option is a row of a list and the chosen row ends with its mark.
 * `direction` and `orientation` are desktop layouts there (a phone list is a column, its mark ends the row), so the
 * example offers `description`, `disabled` and `itemDisabled` (Monthly), which a disabled group leaves out. A disabled
 * option dims its row's label with it. `selectionColor`, set once on the app's ThemeProvider, colors the mark.
 */
export const Overview = docsDemo(function Overview() {
  const [frequency, setFrequency] = useState('daily');
  const [description, setDescription] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [itemDisabled, setItemDisabled] = useState(false);
  const [selectionColor, setSelectionColor] = useState<(typeof SELECTION_COLORS)[number]>('primary');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        {!disabled && <DemoControlBoolean name="itemDisabled" value={itemDisabled} onChange={setItemDisabled} />}
        <Segments name="selectionColor" options={SELECTION_COLORS} value={selectionColor} onChange={setSelectionColor} />
      </div>
      <RNScreen grouped minHeight={200}>
        <ThemeProvider selectionColor={selectionColor}>
          <RadioGroup aria-label="Notification frequency" value={frequency} onChange={setFrequency} disabled={disabled}>
            <List header="Notification frequency">
              {FREQUENCIES.map((option) => {
                const off = disabled || (itemDisabled && option.value === 'monthly');
                return (
                  <ListItem
                    key={option.value}
                    label={option.label}
                    description={description ? option.description : undefined}
                    disabled={off}
                    trailing={<RadioGroup.Item value={option.value} aria-label={option.label} disabled={itemDisabled && option.value === 'monthly'} />}
                  />
                );
              })}
            </List>
          </RadioGroup>
        </ThemeProvider>
      </RNScreen>
    </>
  );
});

/** With Field: the list's header names the choice */
export function WithField() {
  const [value, setValue] = useState('email');
  return (
    <RadioGroup aria-label="Notification method" value={value} onChange={setValue}>
      <List header="Notification method" description="Choose how you want to receive notifications.">
        <ListItem label="Email" trailing={<RadioGroup.Item value="email" aria-label="Email" />} />
        <ListItem label="SMS" trailing={<RadioGroup.Item value="sms" aria-label="SMS" />} />
        <ListItem label="Push notification" trailing={<RadioGroup.Item value="push" aria-label="Push notification" />} />
      </List>
    </RadioGroup>
  );
}

/** With Field error: nothing chosen yet, and the error in the list's footer */
export const WithFieldError = docsDemo(function WithFieldError() {
  const [value, setValue] = useState<string | undefined>(undefined);
  const [showError, setShowError] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="showError" value={showError} onChange={setShowError} />
      </div>
      <RNScreen grouped minHeight={200}>
        <RadioGroup aria-label="Subscription plan" value={value} onChange={setValue}>
          <List header="Subscription plan" description="Select a plan to continue." error={showError && value == null ? 'Please select a subscription plan.' : undefined}>
            <ListItem label="Pay monthly" description="$9.99/month" trailing={<RadioGroup.Item value="monthly" aria-label="Pay monthly" />} />
            <ListItem label="Pay yearly" description="$99.99/year" trailing={<RadioGroup.Item value="yearly" aria-label="Pay yearly" />} />
            <ListItem label="Pay once" description="$299.99 for lifetime access" trailing={<RadioGroup.Item value="lifetime" aria-label="Pay once" />} />
          </List>
        </RadioGroup>
      </RNScreen>
    </>
  );
});

/** Rows to the next group's rows: iOS Settings' 35, less what its header (39) takes beyond the native step */
const GROUP_GAP = 35 - 18.67;

/** Grouped sections: a Preferences screen with a choice in each group */
export function GroupedSections() {
  const android = useTheme().isAndroid;
  const [visibility, setVisibility] = useState('owners');
  const [view, setView] = useState('list');
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
        <RadioGroup aria-label="Visibility" value={visibility} onChange={setVisibility}>
          <List header="Visibility" description="Control who can see project resources.">
            <ListItem label="Hidden" trailing={<RadioGroup.Item value="hidden" aria-label="Hidden" />} />
            <ListItem label="Visible to organization owners" trailing={<RadioGroup.Item value="owners" aria-label="Visible to organization owners" />} />
            <ListItem label="Visible to everyone" trailing={<RadioGroup.Item value="everyone" aria-label="Visible to everyone" />} />
          </List>
        </RadioGroup>
        <RadioGroup aria-label="Default view" value={view} onChange={setView}>
          <List header="Default view" description="What opens first in a project.">
            <ListItem label="Board" trailing={<RadioGroup.Item value="board" aria-label="Board" />} />
            <ListItem label="List" trailing={<RadioGroup.Item value="list" aria-label="List" />} />
            <ListItem label="Timeline" trailing={<RadioGroup.Item value="timeline" aria-label="Timeline" />} />
          </List>
        </RadioGroup>
      </ScrollView>
    </>
  );
}
