import { useState, type ReactNode } from 'react';
import { Button, Checkbox, Field, Input, List, Select, Switch, Text, Textarea, useTheme } from '@plexui/react-native';
import { ArrowTopRightSm } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';
import { Gap, Groups, RowLink, groupGap } from './fieldRows';

const LAYOUTS = ['above', 'columns', 'end', 'hidden'] as const;
type Layout = (typeof LAYOUTS)[number];

const NOTE = "We'll never share your email with anyone else.";

/**
 * The Overview, one field in the four places of its label on a phone, as the React page's Phone view: a cell of a List
 * (the web's FieldGroup), the label above its value (`orientation="vertical"`), values in one column (`List columns`),
 * the value at the row's end, or the placeholder alone (`hideLabel`). The words that explain the field go in the List's
 * footer, a required field says so in its placeholder, and a label action stands under the group in the rows' text.
 */
export const Overview = docsDemo(function Overview() {
  const [layout, setLayout] = useState<Layout>('above');
  const [description, setDescription] = useState(true);
  const [error, setError] = useState(true);
  const [required, setRequired] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [labelAction, setLabelAction] = useState(false);
  const hidden = layout === 'hidden';
  const withLabelAction = labelAction && (layout === 'above' || layout === 'columns');
  const placeholder = (name: string, example: string) => (hidden ? name : required ? 'Required' : example);
  const orientation = layout === 'above' ? 'vertical' : undefined;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="layout" options={LAYOUTS} value={layout} onChange={setLayout} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="errorMessage" value={error} onChange={setError} />
        <DemoControlBoolean name="required" value={required} onChange={setRequired} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        {(layout === 'above' || layout === 'columns') && <DemoControlBoolean name="labelAction" value={labelAction} onChange={setLabelAction} />}
      </div>
      <RNScreen grouped>
        <Groups>
          <List columns={layout === 'columns'} footer={description ? NOTE : undefined}>
            <Field row label="Name" orientation={orientation} hideLabel={hidden}>
              <Input placeholder={placeholder('Name', 'Jane Appleseed')} autoComplete="name" disabled={disabled} />
            </Field>
            <Field row label="Email" orientation={orientation} hideLabel={hidden} errorMessage={error ? 'Enter a valid email address.' : undefined}>
              <Input
                key={String(error)}
                placeholder={placeholder('Email', 'name@example.com')}
                defaultValue={error ? 'jane@example' : undefined}
                inputMode="email"
                autoCapitalize="none"
                autoComplete="email"
                disabled={disabled}
              />
            </Field>
          </List>
          {/* A row has no label line: the link stands under the group in the rows' text */}
          {withLabelAction ? (
            <View style={{ marginTop: 15, alignItems: 'flex-start' }}>
              <RowLink>Use phone instead</RowLink>
            </View>
          ) : null}
        </Groups>
      </RNScreen>
    </>
  );
});

const ADDRESS = { street: '12 Market Street', city: 'Springfield', postcode: '62701' };

/** A List with a header (standard or increased), an action at its end, a footer, and `columns`. */
export const Group = docsDemo(function Group() {
  const [prominence, setProminence] = useState<'standard' | 'increased'>('standard');
  const [action, setAction] = useState(true);
  const [footer, setFooter] = useState(true);
  const [columns, setColumns] = useState(false);
  const [address, setAddress] = useState(ADDRESS);
  const edit = (key: keyof typeof ADDRESS) => (text: string) => setAddress({ ...address, [key]: text });
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="headerProminence" options={['standard', 'increased'] as const} value={prominence} onChange={setProminence} />
        <DemoControlBoolean name="action" value={action} onChange={setAction} />
        <DemoControlBoolean name="footer" value={footer} onChange={setFooter} />
        <DemoControlBoolean name="columns" value={columns} onChange={setColumns} />
      </div>
      <RNScreen grouped headerFirst>
        <List
          header="Billing address"
          headerProminence={prominence}
          action={
            action ? (
              <Button color="primary" variant="ghost" size="sm" onPress={() => setAddress({ street: '', city: '', postcode: '' })}>
                Clear
              </Button>
            ) : undefined
          }
          footer={
            footer ? (
              <>
                Your bank checks this address against your card. <RowLinkInline>Learn more</RowLinkInline>
              </>
            ) : undefined
          }
          columns={columns}
        >
          <Field row label="Street">
            <Input placeholder="Required" value={address.street} onChangeText={edit('street')} autoComplete="address-line1" />
          </Field>
          <Field row label="City">
            <Input placeholder="Required" value={address.city} onChangeText={edit('city')} autoComplete="address-line2" />
          </Field>
          <Field row label="Postcode">
            <Input placeholder="Required" value={address.postcode} onChangeText={edit('postcode')} autoComplete="postal-code" />
          </Field>
        </List>
      </RNScreen>
    </>
  );
});

/** A link inside a footer's words: the footer's type (13/16 on iOS, 14sp on Android), in the info text (iOS) or the accent. */
function RowLinkInline({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="link" onPress={() => {}} color={theme.isAndroid ? theme.colors.accent : theme.color("--color-text-info")} style={theme.isAndroid ? { fontSize: 14, lineHeight: 18 } : { fontSize: 13, lineHeight: 16 }}>
      {children}
    </Text>
  );
}

/**
 * Action rows: a ghost Button among a List's rows is the row, as an iOS list draws a button: tinted words where a
 * row's label starts, red for a destructive one, an arrow at the trailing edge for a link out, no chevron.
 */
export const ActionRows = docsDemo(function ActionRows() {
  const android = useNativePlatform() === 'android';
  const [trailingIcon, setTrailingIcon] = useState(true);
  const [destructive, setDestructive] = useState(true);
  const [centered, setCentered] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="trailingIcon" value={trailingIcon} onChange={setTrailingIcon} />
        <DemoControlBoolean name="destructive" value={destructive} onChange={setDestructive} />
        <DemoControlBoolean name="centered" value={centered} onChange={setCentered} />
      </div>
      <RNScreen grouped>
        <Groups>
          <List>
            <Button block color="info" variant="ghost">
              Edit Menu
            </Button>
            <Button block color="info" variant="ghost">
              Privacy Policy
              {trailingIcon ? <ArrowTopRightSm /> : null}
            </Button>
            {destructive ? (
              <Button block color="danger" variant="ghost">
                Delete Account
              </Button>
            ) : null}
          </List>
          {centered ? (
            <>
              <Gap size={groupGap(android)} />
              <List>
                <Button block color="info" variant="ghost" style={{ justifyContent: 'center' }}>
                  Reset to Default
                </Button>
              </List>
            </>
          ) : null}
        </Groups>
      </RNScreen>
    </>
  );
});

function SwitchRow({ label }: { label: string }) {
  return (
    <Field row label={label}>
      <Switch defaultChecked />
    </Field>
  );
}

/** Groups one after another, for every pairing of a footer above and a header below. */
export const Spacing = docsDemo(function Spacing() {
  const android = useNativePlatform() === 'android';
  return (
    <RNScreen grouped minHeight={760}>
      <Groups>
        <List>
          <SwitchRow label="Rows to rows" />
        </List>
        <Gap size={groupGap(android)} />
        <List>
          <SwitchRow label="No header" />
        </List>
        <Gap size={groupGap(android, { header: true })} />
        <List header="Header">
          <SwitchRow label="Under a header" />
        </List>
        <Gap size={groupGap(android)} />
        <List footer="A footer of one line.">
          <SwitchRow label="Over a footer" />
        </List>
        <Gap size={groupGap(android, { afterFooter: true })} />
        <List footer="A footer that runs on to a second line, so the next group stands 16 further down.">
          <SwitchRow label="After a footer" />
        </List>
        <Gap size={groupGap(android, { afterFooter: true, header: true })} />
        <List header="Header after a footer" footer="A footer of one line.">
          <SwitchRow label="Both" />
        </List>
        <Gap size={groupGap(android, { afterFooter: true, prominent: true })} />
        <List header="Prominent header" headerProminence="increased">
          <SwitchRow label="Prominent" />
        </List>
      </Groups>
    </RNScreen>
  );
});

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

/** Other controls: a Select is the value at the end of its row, a long text stands under its label. */
export const Controls = docsDemo(function Controls() {
  const [role, setRole] = useState('editor');
  return (
    <RNScreen grouped>
      <List>
        <Field row label="Role">
          <Select value={role} onChange={(option: { value: string }) => setRole(option.value)} options={ROLES} />
        </Field>
        <Field row label="Notes" orientation="vertical">
          <Textarea placeholder="Anything the team should know" rows={3} autoResize />
        </Field>
      </List>
    </RNScreen>
  );
});

/** A checkbox with its label: the label takes the body type of a list row and toggles the box. */
export const Label = docsDemo(function Label() {
  const [accepted, setAccepted] = useState(true);
  return (
    <RNScreen>
      <Checkbox checked={accepted} onCheckedChange={(next: boolean | 'indeterminate') => setAccepted(next === true)} label="Accept terms and conditions" />
    </RNScreen>
  );
});
