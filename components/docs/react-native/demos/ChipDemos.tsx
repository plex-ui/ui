import { useState, type ReactNode } from 'react';
import { Button, Chip, Text } from '@plexui/react-native';
import { AtSign, AvatarProfile, Email, Star } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

// Which of the props the chips set: `selected` and `onSelectedChange` (a filter chip), `onPress` alone (an action
// chip) or `onRemove` (an input chip)
const TYPES = ['filter', 'action', 'input'] as const;
const CHIPS: readonly { value: string; label: string; icon: ReactNode }[] = [
  { value: 'unread', label: 'Unread', icon: <Email /> },
  { value: 'starred', label: 'Starred', icon: <Star /> },
  { value: 'mentions', label: 'Mentions', icon: <AtSign /> },
];
// An input chip is a value the reader entered and can take back: the recipients of a message
const RECIPIENTS: readonly { value: string; label: string; icon: ReactNode }[] = [
  { value: 'anna', label: 'Anna Kim', icon: <AvatarProfile /> },
  { value: 'ben', label: 'Ben Carter', icon: <AvatarProfile /> },
  { value: 'maya', label: 'Maya Patel', icon: <AvatarProfile /> },
];

/** A row of chips, 8 apart, centered as the React Toggle Group centers its row on a phone */
const row = { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 8 } as const;

/**
 * Chips with every setting, as the filters of the React Toggle Group page's Text example (Unread, Starred and
 * Mentions, Unread on): `type` makes them filter chips that toggle, action chips that keep no state, or input chips,
 * the recipients of a message, with a cross that removes them (as the React Badge's `onRemove`); `icon` puts a symbol
 * before each label and `disabled` dims them.
 */
export const Overview = docsDemo(function Overview() {
  const [type, setType] = useState<(typeof TYPES)[number]>('filter');
  const [icon, setIcon] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [selected, setSelected] = useState<string[]>(['unread']);
  const [shown, setShown] = useState<string[]>(RECIPIENTS.map((chip) => chip.value));
  const chips = type === 'input' ? RECIPIENTS.filter((chip) => shown.includes(chip.value)) : CHIPS;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="type" options={TYPES} value={type} onChange={setType} />
        <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen minHeight={168}>
        {chips.length > 0 ? (
          <View style={row}>
            {chips.map((chip) => (
              <Chip
                key={chip.value}
                icon={icon ? chip.icon : undefined}
                disabled={disabled}
                selected={type === 'filter' ? selected.includes(chip.value) : undefined}
                onSelectedChange={
                  type === 'filter'
                    ? (on: boolean) => setSelected((list) => (on ? [...list, chip.value] : list.filter((value) => value !== chip.value)))
                    : undefined
                }
                onPress={type === 'action' ? () => {} : undefined}
                onRemove={type === 'input' ? () => setShown((list) => list.filter((value) => value !== chip.value)) : undefined}
                removeLabel={`Remove ${chip.label}`}
              >
                {chip.label}
              </Chip>
            ))}
          </View>
        ) : (
          <View style={{ alignSelf: 'center' }}>
            <Button color="secondary" variant="outline" size="sm" onPress={() => setShown(RECIPIENTS.map((chip) => chip.value))}>
              Show again
            </Button>
          </View>
        )}
      </RNScreen>
    </>
  );
});

/**
 * Disabled chips keep their state, as the React Toggle Group page's Disabled example keeps its items: Email stays on,
 * as account emails cannot be turned off, and SMS stays off until there is a phone number.
 */
export function Disabled() {
  return (
    <View style={{ alignItems: 'flex-start', gap: 12 }}>
      <Text size="md">Notify me by</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 }}>
        <Chip disabled defaultSelected>
          Email
        </Chip>
        <Chip defaultSelected>Push</Chip>
        <Chip disabled defaultSelected={false}>
          SMS
        </Chip>
      </View>
      <Text size="sm" color="secondary">
        Account emails are always on. Add a phone number to get SMS.
      </Text>
    </View>
  );
}
