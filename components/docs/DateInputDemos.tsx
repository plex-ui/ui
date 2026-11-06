'use client';

import { useState } from 'react';
import { DateTime } from 'luxon';
import { DateInput } from '@plexui/ui/components/DateInput';
import { Field } from '@plexui/ui/components/Field';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

export function DateInputBaseDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const [clearable, setClearable] = useState(true);
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
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
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
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
    </>
  );
}

export function DateInputLimitsDemo() {
  const today = DateTime.local();
  const [date, setDate] = useState<DateTime | null>(today);
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
  return (
    <div className="w-[200px]">
      <DateInput value={date} onChange={(v) => setDate(v)} mode="mm/dd/yyyy" separator="/" clearable />
    </div>
  );
}

export function DateInputISOFormatDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  return (
    <div className="w-[200px]">
      <DateInput value={date} onChange={(v) => setDate(v)} mode="yyyy/mm/dd" separator="-" clearable />
    </div>
  );
}

export function DateInputWithFieldDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
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
  return (
    <div className="w-[260px]">
      <DateInput value={date} onChange={(v) => setDate(v)} timeMode="HH:MM" clearable />
    </div>
  );
}

export function DateInputWithSecondsDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  return (
    <div className="w-[300px]">
      <DateInput value={date} onChange={(v) => setDate(v)} timeMode="HH:MM:SS" clearable />
    </div>
  );
}
