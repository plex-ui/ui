import { useState, type ComponentProps } from 'react';
import { Field, Input, List, SystemKeyboard, Text, Toolbar } from '@plexui/react-native';
import { StyleSheet, View } from 'react-native';
import { Segments, controlsTableStyle } from '../../ButtonDemos';
import { DemoControlsBottom } from '../../PreviewEmbed';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

const KINDS = ['text', 'email', 'url', 'search', 'password', 'number', 'decimal', 'phone'] as const;
type Kind = (typeof KINDS)[number];
const RETURNS = ['default', 'go', 'search', 'send', 'next', 'done'] as const;
type ReturnKey = (typeof RETURNS)[number];
const MODES = ['auto', 'hidden'] as const;
type Mode = (typeof MODES)[number];
/** The shift: off, on for the next capital, or Caps Lock */
const CAPS = [
  { value: 'off', label: 'false' },
  { value: 'on', label: 'true' },
  { value: 'lock', label: 'lock' },
] as const;
type Caps = (typeof CAPS)[number]['value'];

/** The kinds with letters: the others bring a pad of digits, with no shift */
const LETTERS: readonly Kind[] = ['text', 'email', 'url', 'search', 'password'];

/** The name of the field of each kind */
const NAME: Record<Kind, string> = {
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
 * The keyboard for a field of each kind, with its return key and its shift: drawn still here, as the phone shows it
 * under a focused field; `hidden` draws none
 */
export const Overview = docsDemo(function Overview() {
  const ios = useNativePlatform() === 'ios';
  const [kind, setKind] = useState<Kind>('text');
  const [returnKey, setReturnKey] = useState<ReturnKey>('default');
  const [caps, setCaps] = useState<Caps>('on');
  const [mode, setMode] = useState<Mode>('auto');
  // A new kind starts as its field does: a name capitalizes its first letter, an address or a password does not
  const pickKind = (next: Kind) => {
    setKind(next);
    setCaps(next === 'text' || next === 'search' ? 'on' : 'off');
  };
  return (
    <>
      <RNScreen screen grouped={ios} minHeight={760} keyboard={false}>
        <Toolbar background="none">
          <Toolbar.Title>Overview</Toolbar.Title>
        </Toolbar>
        {/* iOS: a row of a grouped list, its name the placeholder (Calendar's new event). Android: the outlined field,
            its name floating in it */}
        <View style={ios ? styles.iosForm : styles.androidForm}>
          {ios ? (
            <List>
              <Field row hideLabel label={NAME[kind]}>
                <Input placeholder={NAME[kind]} />
              </Field>
            </List>
          ) : (
            <Field label={NAME[kind]}>
              <Input />
            </Field>
          )}
        </View>
        <SystemKeyboard mode={mode} field={{ kind, returnKey, caps: caps === 'lock' ? 'lock' : caps === 'on' }} />
      </RNScreen>
      {/* Under the phone, by the keyboard they set */}
      <DemoControlsBottom style={controlsTableStyle}>
        <Segments name="kind" options={KINDS} value={kind} onChange={pickKind} />
        <Segments name="returnKey" options={RETURNS} value={returnKey} onChange={setReturnKey} />
        {LETTERS.includes(kind) ? <Segments name="caps" options={CAPS} value={caps} onChange={setCaps} /> : null}
        <Segments name="mode" options={MODES} value={mode} onChange={setMode} />
      </DemoControlsBottom>
    </>
  );
});

const NOTE = 'Click a field: its keyboard comes up. The keys do not type; type with your own keyboard.';

/** The fields of the form, each with its keyboard */
const FIELDS: { label: string; placeholder: string; input: ComponentProps<typeof Input> }[] = [
  { label: 'Name', placeholder: 'Jane Appleseed', input: { autoComplete: 'name', returnKeyType: 'next' } },
  { label: 'Email', placeholder: 'jane@example.com', input: { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email', returnKeyType: 'next' } },
  { label: 'Phone', placeholder: '+1 415 555 0100', input: { keyboardType: 'phone-pad', autoComplete: 'tel' } },
  { label: 'Amount', placeholder: '0.00', input: { keyboardType: 'decimal-pad' } },
];

/**
 * A form: the keyboard comes up under the field the reader clicks, for its kind, and goes when it loses focus. On iOS
 * the fields are rows of a grouped list, their values in one column (Mail's new account); on Android outlined fields
 * with their names floating in them
 */
export const FollowsFocus = docsDemo(function FollowsFocus() {
  const ios = useNativePlatform() === 'ios';
  if (ios) {
    return (
      <RNScreen grouped minHeight={760}>
        <List columns footer={NOTE}>
          {FIELDS.map((field) => (
            <Field key={field.label} row label={field.label}>
              <Input placeholder={field.placeholder} {...field.input} />
            </Field>
          ))}
        </List>
      </RNScreen>
    );
  }
  return (
    <RNScreen minHeight={760}>
      <View style={styles.androidFields}>
        {FIELDS.map((field) => (
          <Field key={field.label} label={field.label}>
            <Input placeholder={field.placeholder} {...field.input} />
          </Field>
        ))}
        <Text variant="footnote" color="secondary">
          {NOTE}
        </Text>
      </View>
    </RNScreen>
  );
});

const styles = StyleSheet.create({
  // The screen's margins under the bar, as the other examples' screens: iOS 16, Android 12
  iosForm: { paddingTop: 16, paddingHorizontal: 16 },
  androidForm: { paddingTop: 12, paddingHorizontal: 12 },
  androidFields: { gap: 16 },
});
