'use client';

import { useId, useState } from 'react';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Stepper } from '@plexui/ui/components/Stepper';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

export function StepperOverviewDemo() {
  const label = useId();
  const [guests, setGuests] = useState(2);
  return (
    <div className="flex items-center gap-4">
      <span id={label}>Guests</span>
      <span className="min-w-5 text-end font-medium tabular-nums" aria-hidden="true">{guests}</span>
      <Stepper aria-labelledby={label} value={guests} onChange={setGuests} min={1} max={8} />
    </div>
  );
}

export function StepperRowsDemo() {
  const phone = usePhoneRows();
  const [copies, setCopies] = useState(1);
  const [nights, setNights] = useState(3);
  const group = (
    <FieldGroup className="w-full max-w-[400px]" footer="Up to 20 copies and 14 nights.">
      <Field row label={copies === 1 ? '1 copy' : `${copies} copies`}>
        <Stepper value={copies} onChange={setCopies} min={1} max={20} />
      </Field>
      <Field row label={nights === 1 ? '1 night' : `${nights} nights`}>
        <Stepper value={nights} onChange={setNights} min={1} max={14} />
      </Field>
    </FieldGroup>
  );
  // On a phone the rows sit on the grouped surface of an iOS settings screen, as on the Input page
  return phone ? <PhoneRowsStage>{group}</PhoneRowsStage> : group;
}

export function StepperRangeDemo() {
  const opacityLabel = useId();
  const hourLabel = useId();
  const [opacity, setOpacity] = useState(0.5);
  const [hour, setHour] = useState(23);
  return (
    <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-4 gap-y-3">
      <span id={opacityLabel}>Opacity</span>
      <span className="text-end font-medium tabular-nums" aria-hidden="true">{Math.round(opacity * 100)}%</span>
      <Stepper aria-labelledby={opacityLabel} value={opacity} onChange={setOpacity} min={0} max={1} step={0.1} />
      <span id={hourLabel}>Hour</span>
      <span className="text-end font-medium tabular-nums" aria-hidden="true">{String(hour).padStart(2, '0')}:00</span>
      <Stepper aria-labelledby={hourLabel} value={hour} onChange={setHour} min={0} max={23} wrap />
    </div>
  );
}

export function StepperStatesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Stepper aria-label="At the lowest value" defaultValue={0} />
      <Stepper aria-label="Disabled" defaultValue={3} disabled />
      <Stepper aria-label="Square ends" defaultValue={3} pill={false} />
    </div>
  );
}
