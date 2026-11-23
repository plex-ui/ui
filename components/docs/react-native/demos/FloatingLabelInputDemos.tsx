import { useState } from 'react';
import { Field, FloatingLabelInput, List, Select } from '@plexui/react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

const PRESETS = ['Empty', 'Filled'] as const;
const EMAIL = 'jane.doe@example.com';
const DESCRIPTION = "We'll never share your email with anyone else.";

/**
 * The Overview, with the settings of the React page's Phone view: a value preset, the error message, the description,
 * disabled, read-only and the clear button. On iOS the field is a cell named by its placeholder (a List of its own, the
 * description in its footer); on Android the outlined field with its label floating onto the line, on the screen's own
 * background.
 */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState(false);
  const [description, setDescription] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [clearable, setClearable] = useState(false);
  const preset = value === '' ? 'Empty' : value === EMAIL ? 'Filled' : ('custom' as never);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="preset" options={PRESETS} value={preset} onChange={(next) => setValue(next === 'Filled' ? EMAIL : '')} />
        <DemoControlBoolean name="errorMessage" value={errorMessage} onChange={setErrorMessage} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="readOnly" value={readOnly} onChange={setReadOnly} />
        <DemoControlBoolean name="onClear" value={clearable} onChange={setClearable} />
      </div>
      <RNScreen grouped={!android}>
        <FloatingLabelInput
          label="Email address"
          type="email"
          value={value}
          onChangeText={setValue}
          errorMessage={errorMessage ? 'Email is not valid.' : undefined}
          description={description ? DESCRIPTION : undefined}
          disabled={disabled}
          readOnly={readOnly}
          onClear={clearable ? () => setValue('') : undefined}
        />
      </RNScreen>
    </>
  );
});

/** `multiline`: on iOS a cell that grows with its text from one line; on Android an outlined field of two lines. */
export const TextareaField = docsDemo(function TextareaField() {
  const android = useNativePlatform() === 'android';
  const [multiline, setMultiline] = useState(true);
  const [value, setValue] = useState('');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="multiline" options={['true', 'false'] as const} value={multiline ? 'true' : 'false'} onChange={(next) => setMultiline(next === 'true')} />
      </div>
      <RNScreen grouped={!android}>
        <FloatingLabelInput key={String(multiline)} label="Message" multiline={multiline} value={value} onChangeText={setValue} />
      </RNScreen>
    </>
  );
});

/** `type="password"`: the value hidden, with the eye that shows it at the end. */
export const Password = docsDemo(function Password() {
  const android = useNativePlatform() === 'android';
  return (
    <RNScreen grouped={!android}>
      <FloatingLabelInput label="Password" type="password" />
    </RNScreen>
  );
});

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

/** A Select named by its placeholder, alone in a label-hidden row: the cell of a floating-label select on a phone. */
export const SelectField = docsDemo(function SelectField() {
  const [role, setRole] = useState('');
  return (
    <RNScreen grouped>
      <List>
        <Field row hideLabel label="Role">
          <Select value={role} options={ROLES} onChange={(option: { value: string }) => setRole(option.value)} placeholder="Role" block />
        </Field>
      </List>
    </RNScreen>
  );
});
