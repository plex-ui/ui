'use client';

import { useState, type ReactNode } from 'react';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Stepper } from '@plexui/ui/components/Stepper';
import { controlsTableStyle, DemoControlBoolean } from './ButtonDemos';
import { PhoneRowsStage, useDesktopOnlyState, usePhoneRows } from './PhoneRows';

/** A stepper stands in a row that names its value, as in iOS Settings: on a phone the rows sit on the grouped surface
 * of a settings screen, on a desktop they stand in the middle of the preview (owner 10.11: «нужен row»). */
function Rows({ children }: { children: ReactNode }) {
  return usePhoneRows() ? (
    <PhoneRowsStage>{children}</PhoneRowsStage>
  ) : (
    <div data-demo-stage className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-6 py-12 [--field-group-gap:11px]">
      {children}
    </div>
  );
}

const GROUP = 'w-full max-w-[400px]';

export function StepperOverviewDemo() {
  const [disabled, setDisabled] = useState(false);
  // A phone stepper is always the iOS capsule, so pill is a desktop setting
  const [pill, setPill, shownPill] = useDesktopOnlyState(true);
  const [copies, setCopies] = useState(1);
  const [nights, setNights] = useState(3);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
      </div>
      <Rows>
        <FieldGroup className={GROUP} footer="Up to 20 copies and 14 nights.">
          <Field row label={copies === 1 ? '1 copy' : `${copies} copies`}>
            <Stepper value={copies} onChange={setCopies} min={1} max={20} disabled={disabled} pill={shownPill} />
          </Field>
          <Field row label={nights === 1 ? '1 night' : `${nights} nights`}>
            <Stepper value={nights} onChange={setNights} min={1} max={14} disabled={disabled} pill={shownPill} />
          </Field>
        </FieldGroup>
      </Rows>
    </>
  );
}

export function StepperRangeDemo() {
  const [wrap, setWrap] = useState(true);
  const [opacity, setOpacity] = useState(0.5);
  const [hour, setHour] = useState(23);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="wrap" value={wrap} onChange={setWrap} />
      </div>
      <Rows>
        <FieldGroup className={GROUP} footer="Steps of 10% from 0% to 100%.">
          <Field row label={`Opacity: ${Math.round(opacity * 100)}%`}>
            <Stepper value={opacity} onChange={setOpacity} min={0} max={1} step={0.1} />
          </Field>
        </FieldGroup>
        {/* The footer says what wrap does, so turning it shows the change (owner 10.11: «не понятно что меняется») */}
        <FieldGroup
          className={GROUP}
          footer={wrap ? 'Past 23:00 the hour goes on from 00:00, and neither segment stops.' : 'The hour stops at 00:00 and 23:00, where a segment turns tertiary.'}
        >
          <Field row label={`Hour: ${String(hour).padStart(2, '0')}:00`}>
            <Stepper value={hour} onChange={setHour} min={0} max={23} wrap={wrap} />
          </Field>
        </FieldGroup>
      </Rows>
    </>
  );
}

const CART = [
  { id: 'coffee', name: 'Flat White', quantity: 2 },
  { id: 'croissant', name: 'Croissant', quantity: 1 },
  { id: 'juice', name: 'Orange Juice', quantity: 1 },
];

/** A cart: at one the minus is a trash can that takes the item out (owner 15.11: «Да», console) */
export function StepperRemoveDemo() {
  const [items, setItems] = useState(CART);
  const setQuantity = (id: string, quantity: number) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity } : item)));
  return (
    <Rows>
      <FieldGroup className={GROUP} footer={items.length ? 'At one, the minus is a trash can that takes the item out.' : 'The bag is empty.'}>
        {items.map((item) => (
          <Field key={item.id} row label={`${item.quantity} × ${item.name}`}>
            <Stepper
              value={item.quantity}
              onChange={(quantity) => setQuantity(item.id, quantity)}
              min={1}
              max={9}
              onRemove={() => setItems((current) => current.filter((other) => other.id !== item.id))}
              removeLabel={`Remove ${item.name}`}
            />
          </Field>
        ))}
      </FieldGroup>
    </Rows>
  );
}
