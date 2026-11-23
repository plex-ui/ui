import { useState } from 'react';
import { Button, Field, InputGroup, List, LoadingIndicator, Menu, Text, Textarea, useTheme } from '@plexui/react-native';
import { CameraPhoto, ChevronUpDown, Copy } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';
import { Gap, Groups, groupGap } from './fieldRows';

/**
 * On a phone an input group is the value of a List row (`Field row`): its prefix, unit and button sit in the row, the
 * row's label names it, and the row is its frame. With a prefix the List takes `columns`, so the value starts at the
 * column; without one the value ends at the row's edge with its unit after it ("5 km").
 */

/** The Overview: a website with its `https://` prefix and an amount in a List with columns, a distance with its unit. */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      <RNScreen grouped>
        <Groups>
          <List columns>
            <Field row label="Website" errorMessage={invalid ? 'Enter a valid address.' : undefined}>
              <InputGroup disabled={disabled} invalid={invalid}>
                <InputGroup.Input placeholder="acme.com" inputMode="url" autoCapitalize="none" autoCorrect={false} />
                <InputGroup.Addon>
                  <InputGroup.Text>https://</InputGroup.Text>
                </InputGroup.Addon>
                {loading ? (
                  <InputGroup.Addon align="inline-end">
                    <LoadingIndicator />
                  </InputGroup.Addon>
                ) : null}
              </InputGroup>
            </Field>
            <Field row label="Amount">
              <InputGroup disabled={disabled}>
                <InputGroup.Input placeholder="0.00" inputMode="decimal" />
                <InputGroup.Addon>
                  <InputGroup.Text>$</InputGroup.Text>
                </InputGroup.Addon>
              </InputGroup>
            </Field>
          </List>
          <Gap size={groupGap(android)} />
          <List>
            <Field row label="Distance">
              <InputGroup disabled={disabled}>
                <InputGroup.Input defaultValue="5" inputMode="decimal" />
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Text>km</InputGroup.Text>
                </InputGroup.Addon>
              </InputGroup>
            </Field>
          </List>
        </Groups>
      </RNScreen>
    </>
  );
});

/** Text: a prefix in a row; a counter is the List's footer, under a textarea of its own row. */
export const TextAddon = docsDemo(function TextAddon() {
  const android = useNativePlatform() === 'android';
  const [post, setPost] = useState('');
  return (
    <RNScreen grouped>
      <Groups>
        <List columns>
          <Field row label="Page">
            <InputGroup>
              <InputGroup.Input placeholder="docs" autoCapitalize="none" autoCorrect={false} />
              <InputGroup.Addon>
                <InputGroup.Text>plexui.com/</InputGroup.Text>
              </InputGroup.Addon>
            </InputGroup>
          </Field>
        </List>
        <Gap size={groupGap(android)} />
        <List footer={`${280 - post.length} characters left`}>
          <Field row orientation="vertical" label="Post">
            <Textarea variant="ghost" placeholder="What's happening?" maxLength={280} value={post} onChangeText={setPost} autoResize rows={2} />
          </Field>
        </List>
      </Groups>
    </RNScreen>
  );
});

/** Button: an icon button at a row's end; the form's main action is the large button under the rows. */
export const ButtonAddon = docsDemo(function ButtonAddon() {
  return (
    <RNScreen grouped>
      <List>
        <Field row label="Link">
          <InputGroup>
            <InputGroup.Input defaultValue="plexui.com/r/input-group" readOnly />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button uniform accessibilityLabel="Copy link">
                <Copy />
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup>
        </Field>
        <Field row label="Card">
          <InputGroup>
            <InputGroup.Input placeholder="Card number" inputMode="numeric" autoComplete="cc-number" />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button uniform accessibilityLabel="Scan card">
                <CameraPhoto />
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup>
        </Field>
      </List>
      <Button color="primary" size="3xl" pill block>
        Pay
      </Button>
    </RNScreen>
  );
});

const WEIGHT_UNITS = [
  { value: 'kg', label: 'Kilograms' },
  { value: 'lb', label: 'Pounds' },
  { value: 'st', label: 'Stones' },
] as const;
const LENGTH_UNITS = [
  { value: 'cm', label: 'Centimeters' },
  { value: 'm', label: 'Meters' },
  { value: 'in', label: 'Inches' },
  { value: 'ft', label: 'Feet' },
] as const;

/** The unit after a value: its menu opens from the unit, which shows the menu picker's chevrons. */
function UnitMenu<T extends string>({ units, value, onChange }: { units: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const theme = useTheme();
  return (
    <Menu>
      <Menu.Trigger>
        <InputGroup.Button accessibilityLabel={`Unit: ${value}`} style={{ paddingHorizontal: 0 }}>
          {/* As the web's phone rows: the chevrons 6 after the unit, their box 2 past the row's inset */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginEnd: theme.isAndroid ? 0 : -2 }}>
            <Text color={theme.colors.labelSecondary} style={theme.isAndroid ? { fontSize: 16, lineHeight: 20 } : { fontSize: 17, lineHeight: 22 }}>
              {value}
            </Text>
            <ChevronUpDown size={17} color={theme.colors.labelSecondary} />
          </View>
        </InputGroup.Button>
      </Menu.Trigger>
      <Menu.Content align="end">
        {units.map((unit) => (
          <Menu.Item key={unit.value} checked={value === unit.value} onSelect={() => onChange(unit.value)}>
            {unit.label}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}

/** Dropdown: a unit that opens its menu, after the value. */
export const Dropdown = docsDemo(function Dropdown() {
  const [weightUnit, setWeightUnit] = useState<(typeof WEIGHT_UNITS)[number]['value']>('kg');
  const [lengthUnit, setLengthUnit] = useState<(typeof LENGTH_UNITS)[number]['value']>('cm');
  return (
    <RNScreen grouped>
      <List>
        <Field row label="Weight">
          <InputGroup>
            <InputGroup.Input defaultValue="72" inputMode="decimal" />
            <InputGroup.Addon align="inline-end">
              <UnitMenu units={WEIGHT_UNITS} value={weightUnit} onChange={setWeightUnit} />
            </InputGroup.Addon>
          </InputGroup>
        </Field>
        <Field row label="Height">
          <InputGroup>
            <InputGroup.Input defaultValue="180" inputMode="decimal" />
            <InputGroup.Addon align="inline-end">
              <UnitMenu units={LENGTH_UNITS} value={lengthUnit} onChange={setLengthUnit} />
            </InputGroup.Addon>
          </InputGroup>
        </Field>
      </List>
    </RNScreen>
  );
});

/** Textarea: the heading is the row's label, the status line the List's footer, the action the button under it. */
export const TextareaAddon = docsDemo(function TextareaAddon() {
  return (
    <RNScreen grouped>
      <List footer="Line 1, Column 1">
        <Field row orientation="vertical" label="script.js">
          <Textarea variant="ghost" placeholder="console.log('Hello, world!');" rows={4} autoCapitalize="none" autoCorrect={false} />
        </Field>
      </List>
      <Button color="primary" size="3xl" pill block>
        Run
      </Button>
    </RNScreen>
  );
});
