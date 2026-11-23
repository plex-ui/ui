import { useState } from 'react';
import { List, ListItem, Select } from '@plexui/react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

/** The docs see @plexui/react-native untyped: the option a Select passes to onChange. */
type Option = { value: string; label: string };

const CURRENCIES = [
  { label: 'US dollar', value: 'usd' },
  { label: 'Euro', value: 'eur' },
  { label: 'British pound', value: 'gbp' },
  { label: 'Japanese yen', value: 'jpy' },
  { label: 'Swiss franc', value: 'chf' },
  { label: 'Canadian dollar', value: 'cad' },
  { label: 'Australian dollar', value: 'aud' },
];

/**
 * The Currency row of a form, as the React page's Phone preview: the select is the value at the row's end, `None` while
 * nothing is chosen, and its list opens from it. Of the phone settings of the React example (`checkPosition`,
 * `clearable`, `multiple`, `loading`, `disabled`) React Native's Select has `disabled` only. A disabled row dims its
 * label too, as the React row does: the ListItem takes `disabled` with its field.
 */
export const Overview = docsDemo(function Overview() {
  const [currency, setCurrency] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen grouped>
        <List>
          <ListItem
            label="Currency"
            disabled={disabled}
            trailing={
              <Select
                aria-label="Currency"
                options={CURRENCIES}
                value={currency}
                onChange={(option: Option) => setCurrency(option.value)}
                placeholder="None"
                variant="ghost"
                block={false}
                disabled={disabled}
              />
            }
          />
        </List>
      </RNScreen>
    </>
  );
});

const ROLES = [
  { value: 'owner', label: 'Owner', description: 'Can manage members, billing and settings' },
  { value: 'editor', label: 'Editor', description: 'Can edit and comment' },
  { value: 'viewer', label: 'Viewer', description: 'Can view only' },
];

/** Options with a `description`, shown under the label in the list. */
export const Descriptions = docsDemo(function Descriptions() {
  const [role, setRole] = useState('editor');
  return (
    <RNScreen grouped>
      <List>
        <ListItem
          label="Role"
          trailing={
            <Select aria-label="Role" options={ROLES} value={role} onChange={(option: Option) => setRole(option.value)} variant="ghost" block={false} />
          }
        />
      </List>
    </RNScreen>
  );
});

const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date added' },
  { value: 'size', label: 'Size' },
];

const ALERTS = [
  { value: 'messages', label: 'Messages' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'reactions', label: 'Reactions' },
  { value: 'calls', label: 'Calls' },
];

const PICKERS = ['dialog', 'menu'] as const;

/**
 * What a press opens on Android: the choice dialog (`dialog`) or the row's menu (`menu`), with the chosen row checked
 * at its end. `multiple` switches the row to several choices: checkbox rows with Cancel and OK in the dialog. iOS
 * always opens its menu.
 */
export const Picker = docsDemo(function Picker() {
  const [picker, setPicker] = useState<(typeof PICKERS)[number]>('menu');
  const [multiple, setMultiple] = useState(false);
  const [sort, setSort] = useState('date');
  const [alerts, setAlerts] = useState<string[]>(['messages', 'mentions']);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="picker" options={PICKERS} value={picker} onChange={setPicker} />
        <DemoControlBoolean name="multiple" value={multiple} onChange={setMultiple} />
      </div>
      <RNScreen grouped>
        <List>
          {multiple ? (
            <ListItem
              label="Notify me about"
              trailing={
                <Select
                  multiple
                  aria-label="Notify me about"
                  options={ALERTS}
                  value={alerts}
                  onChange={(options: Option[]) => setAlerts(options.map((option) => option.value))}
                  picker={picker}
                  variant="ghost"
                  block={false}
                />
              }
            />
          ) : (
            <ListItem
              label="Sort by"
              trailing={
                <Select
                  aria-label="Sort by"
                  options={SORTS}
                  value={sort}
                  onChange={(option: Option) => setSort(option.value)}
                  picker={picker}
                  variant="ghost"
                  block={false}
                />
              }
            />
          )}
        </List>
      </RNScreen>
    </>
  );
});
