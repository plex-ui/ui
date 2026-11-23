import { useState, type ReactNode } from 'react';
import { List, ListItem, Stepper, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

/**
 * Groups on a settings screen, each after a footer: iOS Settings' 35 from one group's rows to the next, less the
 * 17.33 a footer already takes under it; on Android the footer's own 17 parts the cards.
 */
function Groups({ children }: { children: ReactNode }) {
  const android = useTheme().isAndroid;
  return <View style={{ gap: android ? 0 : 35 - 17.33 }}>{children}</View>;
}

/**
 * The Overview, as the React page's Phone view: two rows of a settings group, each naming its value in its label
 * (1 copy, 3 nights) with a stepper at its end, on the grouped background of a settings screen. `showValue` puts the
 * value in the stepper and the label only names it. A phone stepper is always the iOS capsule, so `pill`, a desktop
 * setting there, is not offered.
 */
export const Overview = docsDemo(function Overview() {
  const [disabled, setDisabled] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [copies, setCopies] = useState(1);
  const [nights, setNights] = useState(3);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="showValue" value={showValue} onChange={setShowValue} />
      </div>
      <RNScreen grouped minHeight={240}>
        <List footer="Up to 20 copies and 14 nights.">
          {/* With the value in the stepper the label only names it */}
          <ListItem
            label={showValue ? 'Copies' : copies === 1 ? '1 copy' : `${copies} copies`}
            trailing={<Stepper aria-label="Copies" value={copies} onChange={setCopies} min={1} max={20} disabled={disabled} showValue={showValue} />}
          />
          <ListItem
            label={showValue ? 'Nights' : nights === 1 ? '1 night' : `${nights} nights`}
            trailing={<Stepper aria-label="Nights" value={nights} onChange={setNights} min={1} max={14} disabled={disabled} showValue={showValue} />}
          />
        </List>
      </RNScreen>
    </>
  );
});

/**
 * Range, step and wrap: decimal steps add without drift, and with `wrap` the hour goes on from 0 past 23. The
 * footer says what `wrap` does, so turning it shows the change.
 */
export const Range = docsDemo(function Range() {
  const [wrap, setWrap] = useState(true);
  const [opacity, setOpacity] = useState(0.5);
  const [hour, setHour] = useState(23);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="wrap" value={wrap} onChange={setWrap} />
      </div>
      <RNScreen grouped minHeight={280}>
        <Groups>
          <List footer="Steps of 10% from 0% to 100%.">
            <ListItem
              label={`Opacity: ${Math.round(opacity * 100)}%`}
              trailing={<Stepper aria-label="Opacity" value={opacity} onChange={setOpacity} min={0} max={1} step={0.1} />}
            />
          </List>
          <List footer={wrap ? 'Past 23:00 the hour goes on from 00:00, and neither segment stops.' : 'The hour stops at 00:00 and 23:00, where a segment turns tertiary.'}>
            <ListItem
              label={`Hour: ${String(hour).padStart(2, '0')}:00`}
              trailing={<Stepper aria-label="Hour" value={hour} onChange={setHour} min={0} max={23} wrap={wrap} />}
            />
          </List>
        </Groups>
      </RNScreen>
    </>
  );
});

const CART = [
  { id: 'coffee', name: 'Flat White', quantity: 2, max: 9 },
  { id: 'croissant', name: 'Croissant', quantity: 1, max: 9 },
  { id: 'juice', name: 'Orange Juice', quantity: 3, max: 3 },
  { id: 'cake', name: 'Cheesecake', quantity: 1, max: 1 },
];

/**
 * In a cart: the quantity in the stepper, all its states at once (2 both ways, at one the minus a trash can, Orange
 * Juice at the 3 left, the one Cheesecake left); at one the trash can takes the item out.
 */
export const Cart = docsDemo(function Cart() {
  const [items, setItems] = useState(CART);
  const setQuantity = (id: string, quantity: number) => setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity } : item)));
  return (
    <RNScreen grouped minHeight={240}>
      <List footer={items.length ? 'At one, the minus is a trash can. Orange Juice has 3 left and Cheesecake 1.' : 'The bag is empty.'}>
        {items.map((item) => (
          <ListItem
            key={item.id}
            label={item.name}
            trailing={
              <Stepper
                aria-label={item.name}
                value={item.quantity}
                onChange={(quantity: number) => setQuantity(item.id, quantity)}
                min={1}
                max={item.max}
                showValue
                onRemove={() => setItems((current) => current.filter((other) => other.id !== item.id))}
                removeLabel={`Remove ${item.name}`}
              />
            }
          />
        ))}
      </List>
    </RNScreen>
  );
});
