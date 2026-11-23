import { useState } from 'react';
import { Checkbox, List, ListItem, NavigationButton, ThemeProvider, Toolbar, useTheme } from '@plexui/react-native';
import { ScrollView, View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const VARIANTS = ['solid', 'ghost'] as const;
const ORIENTATIONS = ['left', 'right'] as const;
// ThemeProvider's selectionColor: the fill of every checked box
const SELECTION_COLORS = ['primary', 'accent'] as const;

/** The three states of the Overview: a checked option, an unchecked one, and a parent whose items are partly on */
const OVERVIEW_OPTIONS = [
  { label: 'Photos', description: 'Back up photos and videos over Wi-Fi.', defaultChecked: true },
  { label: 'Messages', description: 'Include chats and attachments in each backup.', defaultChecked: false },
  { label: 'Folders', description: '3 of 5 folders are backed up.', defaultChecked: 'indeterminate' as const },
];

/**
 * The Overview, as the React page's Phone view: three boxes in their three states, with `variant`, a label, its
 * description and side, and `disabled`. `pill` is a desktop setting there (a phone box is round with or without it),
 * so the example leaves it out. `description` and `orientation` act only next to a label; without one each box is named
 * by its `accessibilityLabel`. `selectionColor`, set once on the app's ThemeProvider, fills a checked box.
 */
export const Overview = docsDemo(function Overview() {
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('solid');
  const [label, setLabel] = useState(true);
  const [description, setDescription] = useState(false);
  const [orientation, setOrientation] = useState<(typeof ORIENTATIONS)[number]>('left');
  const [disabled, setDisabled] = useState(false);
  const [selectionColor, setSelectionColor] = useState<(typeof SELECTION_COLORS)[number]>('primary');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />
        <DemoControlBoolean name="label" value={label} onChange={setLabel} />
        {label && <DemoControlBoolean name="description" value={description} onChange={setDescription} />}
        {label && <Segments name="orientation" options={ORIENTATIONS} value={orientation} onChange={setOrientation} />}
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <Segments name="selectionColor" options={SELECTION_COLORS} value={selectionColor} onChange={setSelectionColor} />
      </div>
      <RNScreen minHeight={200}>
        <ThemeProvider selectionColor={selectionColor}>
          {/* A column of labelled boxes, 12 apart (16 with descriptions, at most 384 wide); boxes alone stand in a row */}
          <View style={label ? { alignSelf: 'center', maxWidth: 384, gap: description ? 16 : 12 } : { alignSelf: 'center', flexDirection: 'row', gap: 16 }}>
            {OVERVIEW_OPTIONS.map((option) => (
              <Checkbox
                key={option.label}
                variant={variant}
                disabled={disabled}
                defaultChecked={option.defaultChecked}
                {...(label
                  ? { label: option.label, description: description ? option.description : undefined, orientation }
                  : { accessibilityLabel: option.label })}
              />
            ))}
          </View>
        </ThemeProvider>
      </RNScreen>
    </>
  );
});

const BACKUP = [
  { id: 'photos', label: 'Photos', checked: true },
  { id: 'contacts', label: 'Contacts', checked: true },
  { id: 'messages', label: 'Messages', checked: false },
];

/** Group with select all: the parent is indeterminate while only some of its items are checked */
export function SelectAll() {
  const [items, setItems] = useState(BACKUP);
  const allChecked = items.every((item) => item.checked);
  const noneChecked = items.every((item) => !item.checked);
  const parentChecked = allChecked ? true : noneChecked ? false : ('indeterminate' as const);
  return (
    <View style={{ alignSelf: 'center', gap: 12 }}>
      <Checkbox
        label="Back up"
        checked={parentChecked}
        onCheckedChange={() => {
          const next = !allChecked;
          setItems((prev) => prev.map((item) => ({ ...item, checked: next })));
        }}
      />
      <View style={{ paddingStart: 24, gap: 12 }}>
        {items.map((item) => (
          <Checkbox
            key={item.id}
            label={item.label}
            checked={item.checked}
            onCheckedChange={(next: boolean) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)))}
          />
        ))}
      </View>
    </View>
  );
}

const MEDIA = [
  { id: 'photos', label: 'Photos', checked: true },
  { id: 'videos', label: 'Videos', checked: false },
  { id: 'music', label: 'Music', checked: false },
  { id: 'podcasts', label: 'Podcasts', checked: false },
];

/** Group with description: a list whose header names the group, a row for each option ending with its box */
export function GroupWithDescription() {
  const [items, setItems] = useState(MEDIA);
  return (
    <List header="Download over cellular" description="Choose what can use mobile data.">
      {items.map((item) => (
        <ListItem
          key={item.id}
          label={item.label}
          trailing={
            <Checkbox
              accessibilityLabel={item.label}
              checked={item.checked}
              onCheckedChange={(next: boolean) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)))}
            />
          }
        />
      ))}
    </List>
  );
}

/** With Field: the terms as rows of a list, the error in its footer and the box it is about drawn invalid */
export const WithField = docsDemo(function WithField() {
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="showError" value={showError} onChange={setShowError} />
      </div>
      <RNScreen grouped headerFirst minHeight={200}>
        <List header="Terms" description="Please review and accept the terms before continuing." error={showError ? 'You must accept the terms to continue.' : undefined}>
          <ListItem
            label="I agree to the Terms of Service"
            trailing={<Checkbox accessibilityLabel="I agree to the Terms of Service" checked={agreed} onCheckedChange={setAgreed} invalid={showError} />}
          />
          <ListItem label="I agree to the Privacy Policy" trailing={<Checkbox accessibilityLabel="I agree to the Privacy Policy" />} />
        </List>
      </RNScreen>
    </>
  );
});

/** Rows to the next group's rows: iOS Settings' 35, less what its header (39) takes beyond the native step */
const GROUP_GAP = 35 - 18.67;

type Setting = 'emailMarketing' | 'emailSecurity' | 'pushMessages' | 'pushMentions' | 'pushComments';

/** Grouped sections: a Notifications screen, a group for email and one for push notifications */
export function GroupedSections() {
  const android = useTheme().isAndroid;
  const [settings, setSettings] = useState<Record<Setting, boolean>>({
    emailMarketing: true,
    emailSecurity: true,
    pushMessages: true,
    pushMentions: true,
    pushComments: false,
  });
  const box = (key: Setting, name: string) => (
    <Checkbox accessibilityLabel={name} checked={settings[key]} onCheckedChange={(next: boolean) => setSettings((prev) => ({ ...prev, [key]: next }))} />
  );
  return (
    <>
      <Toolbar>
        <Toolbar.Leading>
          <NavigationButton action="back" />
        </Toolbar.Leading>
        <Toolbar.Title>Notifications</Toolbar.Title>
      </Toolbar>
      {/* A settings page: 10 under the bar, 16 from the screen's edges; a group's header stands in the 35 between one
          group's rows and the next one's, as iOS Settings spaces them */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: android ? 12 : 10, paddingHorizontal: android ? 12 : 16, paddingBottom: 16, gap: android ? 12 : GROUP_GAP }}>
        <List header="Email notifications" description="Configure which emails you receive.">
          <ListItem label="Marketing" description="Receive emails about new products and features." trailing={box('emailMarketing', 'Marketing')} />
          <ListItem label="Security" description="Receive emails about account activity and security." trailing={box('emailSecurity', 'Security')} />
        </List>
        <List header="Push notifications" description="Configure which push notifications you receive.">
          <ListItem label="Direct messages" trailing={box('pushMessages', 'Direct messages')} />
          <ListItem label="Mentions" trailing={box('pushMentions', 'Mentions')} />
          <ListItem label="Comments" trailing={box('pushComments', 'Comments')} />
        </List>
      </ScrollView>
    </>
  );
}
