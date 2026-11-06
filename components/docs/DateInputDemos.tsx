'use client';

import type React from 'react';
import { useState } from 'react';
import { DateTime } from 'luxon';
import { DateInput } from '@plexui/ui/components/DateInput';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone a date input is the value of a row in a FieldGroup, as the Input examples and the Form Examples
// put an input. The row is its frame and sets its height, insets and type, so the phone examples drop the
// desktop variant, size and pill controls.
function PhoneDateRow({ label, description, errorMessage, children }: { label: string; description?: string; errorMessage?: string; children: React.ReactElement }) {
  return (
    <PhoneRowsStage>
      <FieldGroup>
        <Field row label={label} description={description} errorMessage={errorMessage}>{children}</Field>
      </FieldGroup>
    </PhoneRowsStage>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

export function DateInputBaseDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const [clearable, setClearable] = useState(true);
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const phone = usePhoneRows();

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && (<>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
        </>)}
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneDateRow label="Date">
          <DateInput value={date} disabled={disabled} onChange={(v) => setDate(v)} clearable={clearable} />
        </PhoneDateRow>
      ) : (
      <div data-demo-stage className="py-10">
        <div className="w-[200px]">
          <DateInput
            value={date}
            disabled={disabled}
            onChange={(v) => setDate(v)}
            size={size}
            variant={variant}
            pill={pill}
            clearable={clearable}
          />
        </div>
      </div>
      )}
    </>
  );
}

export function DateInputLimitsDemo() {
  const today = DateTime.local();
  const [date, setDate] = useState<DateTime | null>(today);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRow label="Date">
      <DateInput
        value={date}
        onChange={(v) => setDate(v)}
        min={today.minus({ days: 30 }).startOf('day')}
        max={today.plus({ days: 30 }).endOf('day')}
        clearable
      />
    </PhoneDateRow>
  );
  return (
    <div className="w-[200px]">
      <DateInput
        value={date}
        onChange={(v) => setDate(v)}
        min={today.minus({ days: 30 }).startOf('day')}
        max={today.plus({ days: 30 }).endOf('day')}
        clearable
      />
    </div>
  );
}

export function DateInputUSFormatDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRow label="Date">
      <DateInput value={date} onChange={(v) => setDate(v)} mode="mm/dd/yyyy" separator="/" clearable />
    </PhoneDateRow>
  );
  return (
    <div className="w-[200px]">
      <DateInput value={date} onChange={(v) => setDate(v)} mode="mm/dd/yyyy" separator="/" clearable />
    </div>
  );
}

export function DateInputISOFormatDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRow label="Date">
      <DateInput value={date} onChange={(v) => setDate(v)} mode="yyyy/mm/dd" separator="-" clearable />
    </PhoneDateRow>
  );
  return (
    <div className="w-[200px]">
      <DateInput value={date} onChange={(v) => setDate(v)} mode="yyyy/mm/dd" separator="-" clearable />
    </div>
  );
}

export function DateInputWithFieldDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRow label="Date of birth" description="Enter your date of birth">
      <DateInput value={date} onChange={(v) => setDate(v)} clearable />
    </PhoneDateRow>
  );
  return (
    <div className="w-[200px]">
      <Field label="Date of birth" description="Enter your date of birth">
        <DateInput value={date} onChange={(v) => setDate(v)} clearable />
      </Field>
    </div>
  );
}

export function DateInputWithFieldErrorDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRow label="Date of birth" errorMessage={!date ? 'Date is required' : undefined}>
      <DateInput value={date} onChange={(v) => setDate(v)} clearable />
    </PhoneDateRow>
  );
  return (
    <div className="w-[200px]">
      <Field label="Date of birth" errorMessage={!date ? 'Date is required' : undefined}>
        <DateInput value={date} onChange={(v) => setDate(v)} clearable />
      </Field>
    </div>
  );
}

export function DateInputWithTimeDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRow label="Starts">
      <DateInput value={date} onChange={(v) => setDate(v)} timeMode="HH:MM" clearable />
    </PhoneDateRow>
  );
  return (
    <div className="w-[260px]">
      <DateInput value={date} onChange={(v) => setDate(v)} timeMode="HH:MM" clearable />
    </div>
  );
}

export function DateInputWithSecondsDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRow label="Logged">
      <DateInput value={date} onChange={(v) => setDate(v)} timeMode="HH:MM:SS" clearable />
    </PhoneDateRow>
  );
  return (
    <div className="w-[300px]">
      <DateInput value={date} onChange={(v) => setDate(v)} timeMode="HH:MM:SS" clearable />
    </div>
  );
}
