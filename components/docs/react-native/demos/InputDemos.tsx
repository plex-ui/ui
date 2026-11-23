import { useState, type ReactNode } from 'react';
import { Button, Input, List, ListItem, Text } from '@plexui/react-native';
import { Eye, EyeOff } from '@plexui/react-native/icons';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

/**
 * On a phone the React page puts an input in a row of a FieldGroup, its value at the row's end. React Native's form
 * row is a ListItem of a List: the label at its start and the input as its trailing control, which fills the room
 * after the label. On iOS the row draws it as the web's row does (no frame, the text at the end); Android keeps
 * its own field.
 */

function FieldRow({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <List>
      <ListItem label={label} error={error} trailing={children} />
    </List>
  );
}

const ADORNMENTS = ['none', 'start', 'end'] as const;
const USERNAME_ERROR = 'This username is taken.';

/**
 * The Overview, one username field with the settings of an input the React page's Phone preview offers that React
 * Native's Input has: `adornment` puts an `@` before the value (`startAdornment`) or a counter after it
 * (`endAdornment`), `clearable` passes `onClear`, and `selectTextOnFocus` is TextInput's own form of `autoSelect`. The
 * React row's `orientation` and `columns` have no React Native row to act on.
 */
export const Overview = docsDemo(function Overview() {
  const [value, setValue] = useState('janeappleseed');
  const [adornment, setAdornment] = useState<(typeof ADORNMENTS)[number]>('none');
  const [clearable, setClearable] = useState(false);
  const [selectTextOnFocus, setSelectTextOnFocus] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="adornment" options={ADORNMENTS} value={adornment} onChange={setAdornment} />
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        <DemoControlBoolean name="selectTextOnFocus" value={selectTextOnFocus} onChange={setSelectTextOnFocus} />
        <DemoControlBoolean name="readOnly" value={readOnly} onChange={setReadOnly} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      <RNScreen grouped>
        <FieldRow label="Username" error={invalid ? USERNAME_ERROR : undefined}>
          <Input
            variant="ghost"
           
            value={value}
            onChangeText={setValue}
            onClear={clearable ? () => setValue('') : undefined}
            maxLength={16}
            placeholder="Required"
            autoCapitalize="none"
            startAdornment={adornment === 'start' ? <Text color="secondary">@</Text> : undefined}
            endAdornment={
              adornment === 'end' ? (
                <Text color="secondary" tabularNums>
                  {value.length}/16
                </Text>
              ) : undefined
            }
            selectTextOnFocus={selectTextOnFocus}
            readOnly={readOnly}
            disabled={disabled}
            invalid={invalid}
            accessibilityLabel="Username"
          />
        </FieldRow>
      </RNScreen>
    </>
  );
});

/** The eye that shows or hides a secure value, at the end of its field. */
function VisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <Input.AdornmentButton accessibilityLabel={visible ? 'Hide' : 'Show'} selected={visible} onPress={onToggle}>
      {visible ? <EyeOff /> : <Eye />}
    </Input.AdornmentButton>
  );
}

/** A password row: an Input.AdornmentButton in `endAdornment` switches `secureTextEntry`. */
export const Password = docsDemo(function Password() {
  const [visible, setVisible] = useState(false);
  return (
    <RNScreen grouped>
      <FieldRow label="Password">
        <Input
          variant="ghost"
         
          placeholder="Required"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoComplete="password"
          endAdornment={<VisibilityToggle visible={visible} onToggle={() => setVisible((value) => !value)} />}
          accessibilityLabel="Password"
        />
      </FieldRow>
    </RNScreen>
  );
});

// The SSN pattern: XXX-XX-XXXX, a separator inserted as the digits come
const getSSNDigits = (value: string) => value.replace(/\D/g, '').slice(0, 9);

function formatSSN(raw: string) {
  const digits = getSSNDigits(raw);
  if (digits.length < 3) return digits;
  if (digits.length === 3) return `${digits}-`;
  if (digits.length < 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 5) return `${digits.slice(0, 3)}-${digits.slice(3)}-`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/** A masked SSN row: it formats as you type and hides as a secure field until the eye shows it. */
export const SSN = docsDemo(function SSN() {
  const [digits, setDigits] = useState('');
  const [visible, setVisible] = useState(false);
  const formatted = formatSSN(digits);
  return (
    <RNScreen grouped>
      <FieldRow label="SSN">
        <Input
          variant="ghost"
         
          placeholder="XXX-XX-XXXX"
          value={formatted}
          onChangeText={(next: string) => {
            const nextDigits = getSSNDigits(next);
            // A backspace over a separator removes the digit before it
            setDigits(next.length < formatted.length && nextDigits.length === digits.length ? digits.slice(0, -1) : nextDigits);
          }}
          secureTextEntry={!visible}
          maxLength={11}
          inputMode="numeric"
          autoComplete="off"
          endAdornment={<VisibilityToggle visible={visible} onToggle={() => setVisible((value) => !value)} />}
          accessibilityLabel="SSN"
        />
      </FieldRow>
    </RNScreen>
  );
});

// The birthday pattern: MM / DD / YYYY, a separator inserted as the digits come
const getBirthdayDigits = (value: string) => value.replace(/\D/g, '').slice(0, 8);

function formatBirthday(raw: string) {
  const digits = getBirthdayDigits(raw);
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length < 2) return month;
  if (digits.length === 2) return `${month} / `;
  if (digits.length < 4) return `${month} / ${day}`;
  if (digits.length === 4) return `${month} / ${day} / `;
  return `${month} / ${day} / ${year}`;
}

function isValidBirthday(value: string) {
  const parsed = value.match(/^(\d{2})\s\/\s(\d{2})\s\/\s(\d{4})$/);
  if (!parsed) return false;
  const month = Number(parsed[1]);
  const day = Number(parsed[2]);
  const year = Number(parsed[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= new Date(year, month, 0).getDate();
}

/** The Birthday row: it formats as you type, and the pattern is its placeholder. */
function BirthdayRow({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <FieldRow label="Birthday" error={error}>
      <Input
        variant="ghost"
       
        placeholder="MM / DD / YYYY"
        value={value}
        onChangeText={(next: string) => {
          const digits = getBirthdayDigits(next);
          // A backspace over a separator removes the digit before it
          onChange(formatBirthday(next.length < value.length && digits.length === getBirthdayDigits(value).length ? digits.slice(0, -1) : next));
        }}
        maxLength={14}
        inputMode="numeric"
        autoComplete="birthdate-full"
        invalid={!!error}
        accessibilityLabel="Birthday"
      />
    </FieldRow>
  );
}

export const Birthday = docsDemo(function Birthday() {
  const [birthday, setBirthday] = useState('');
  return (
    <RNScreen grouped>
      <BirthdayRow value={birthday} onChange={setBirthday} />
    </RNScreen>
  );
});

/** A date that does not exist marks the field `invalid` and shows the error under the row's label. */
export const BirthdayValidation = docsDemo(function BirthdayValidation() {
  const [birthday, setBirthday] = useState('02 / 30 / 2001');
  const error = birthday && !isValidBirthday(birthday) ? 'Please enter a valid date.' : undefined;
  return (
    <RNScreen grouped>
      <BirthdayRow value={birthday} onChange={setBirthday} error={error} />
    </RNScreen>
  );
});

/** An email row, then the screen's main action under the group: the large button as wide as the screen. */
export const WithButton = docsDemo(function WithButton() {
  return (
    <RNScreen grouped>
      <FieldRow label="Email">
        <Input variant="ghost" placeholder="name@example.com" inputMode="email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="Email" />
      </FieldRow>
      <Button color="primary" size="3xl" block>
        Subscribe
      </Button>
    </RNScreen>
  );
});
