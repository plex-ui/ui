import { useState } from 'react';
import { Input, SystemKeyboard, Text, TextField, useTheme } from '@plexui/react-native';
import { StyleSheet, View } from 'react-native';
import { Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const KINDS = ['text', 'email', 'url', 'search', 'password', 'number', 'decimal', 'phone'] as const;
type Kind = (typeof KINDS)[number];
const RETURNS = ['default', 'go', 'search', 'send', 'next', 'done'] as const;
type ReturnKey = (typeof RETURNS)[number];
const MODES = ['auto', 'hidden'] as const;
type Mode = (typeof MODES)[number];

/** The words over the field of each kind */
const PLACEHOLDER: Record<Kind, string> = {
  text: 'Name',
  email: 'Email',
  url: 'Website',
  search: 'Search',
  password: 'Password',
  number: 'Code',
  decimal: 'Amount',
  phone: 'Phone',
};

/**
 * The keyboard for a field of each kind, with its return key: drawn still here, as the phone shows it under a focused
 * field; `hidden` draws none
 */
export const Overview = docsDemo(function Overview() {
  const [kind, setKind] = useState<Kind>('text');
  const [returnKey, setReturnKey] = useState<ReturnKey>('default');
  const [mode, setMode] = useState<Mode>('auto');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="kind" options={KINDS} value={kind} onChange={setKind} />
        <Segments name="returnKey" options={RETURNS} value={returnKey} onChange={setReturnKey} />
        <Segments name="mode" options={MODES} value={mode} onChange={setMode} />
      </div>
      <RNScreen screen minHeight={760} keyboard={false}>
        <Field kind={kind} />
        <SystemKeyboard mode={mode} field={{ kind, returnKey, caps: kind === 'text' || kind === 'search' }} />
      </RNScreen>
    </>
  );
});

function Field({ kind }: { kind: Kind }) {
  const android = useTheme().isAndroid;
  return (
    <View style={[styles.field, { paddingHorizontal: android ? 12 : 16 }]}>
      <Input placeholder={PLACEHOLDER[kind]} accessibilityLabel={PLACEHOLDER[kind]} />
    </View>
  );
}

/** A form: the keyboard comes up under the field the reader clicks, for its kind, and goes when it loses focus */
export const FollowsFocus = docsDemo(function FollowsFocus() {
  return (
    <RNScreen screen minHeight={760}>
      <View style={styles.form}>
        <TextField label="Name" placeholder="Jane Appleseed" returnKeyType="next" />
        <TextField label="Email" placeholder="jane@example.com" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
        <TextField label="Phone" placeholder="+1 415 555 0100" keyboardType="phone-pad" />
        <TextField label="Amount" placeholder="0.00" keyboardType="decimal-pad" />
        <Text variant="footnote" color="secondary">
          Click a field: its keyboard comes up. The keys do not type; type with your own keyboard.
        </Text>
      </View>
    </RNScreen>
  );
});

const styles = StyleSheet.create({
  field: { paddingTop: 72 },
  form: { paddingTop: 72, paddingHorizontal: 16, gap: 16 },
});
