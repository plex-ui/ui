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
import { SliderValueControl } from './SliderValueControl';

// On a phone a date input is the value of a row in a FieldGroup, as the Input examples and the Form Examples
// put an input. The row is its frame and sets its height, insets and type, so the phone examples drop the
// desktop variant, size, pill and invalid controls (the row draws no border; a row shows its error under it).
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
const MODE_OPTIONS = ['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy/mm/dd'] as const;
const SEPARATOR_OPTIONS = ['.', '/', '-'] as const;
// No time (unset), or the time after the date
const TIME_MODE_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'HH:MM', label: 'HH:MM' },
  { value: 'HH:MM:SS', label: 'HH:MM:SS' },
  { value: 'HH:MM AA', label: 'HH:MM AA' },
] as const;
const DATE_TIME_SEPARATOR_OPTIONS = [
  { value: ', ', label: 'comma' },
  { value: ' ', label: 'space' },
] as const;
// The field takes the width of what it shows: a date, a date and a time, a date and a time with seconds or AM/PM
const STAGE_WIDTH = { none: 'w-[200px]', 'HH:MM': 'w-[260px]', 'HH:MM:SS': 'w-[300px]', 'HH:MM AA': 'w-[300px]' } as const;

function Segments<T extends string>({ name, options, value, onChange }: { name: string; options: readonly (T | { value: T; label: string })[]; value: T; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => {
          const { value: optionValue, label } = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <SegmentedControl.Option key={optionValue} value={optionValue}>
              {label}
            </SegmentedControl.Option>
          );
        })}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the field: what the page's examples once showed one by one (With time, With
 * seconds, Limits, US format, ISO format) are its settings (owner 11.11: «в первом примере можно сразу показать все
 * со всеми настройками»). `dateTimeSeparator` and `timeStep` act on a time, so they are offered with one; `limits`
 * sets `min` and `max` 30 days around today. On a phone the field is the value of a row, whose frame it takes, so
 * `variant`, `size`, `pill` and `invalid` (the row draws no border; Validation shows a row's error) stay on desktop,
 * keeping their choice. */
export function DateInputOverviewDemo() {
  const [today] = useState(() => DateTime.local());
  const [date, setDate] = useState<DateTime | null>(null);
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const [mode, setMode] = useState<(typeof MODE_OPTIONS)[number]>('dd/mm/yyyy');
  const [separator, setSeparator] = useState<(typeof SEPARATOR_OPTIONS)[number]>('.');
  const [timeMode, setTimeMode] = useState<(typeof TIME_MODE_OPTIONS)[number]['value']>('none');
  const [dateTimeSeparator, setDateTimeSeparator] = useState<(typeof DATE_TIME_SEPARATOR_OPTIONS)[number]['value']>(', ');
  const [timeStep, setTimeStep] = useState(0);
  const [limits, setLimits] = useState(false);
  const [clearable, setClearable] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const phone = usePhoneRows();
  const time = timeMode !== 'none';
  const input = (
    <DateInput
      value={date}
      onChange={setDate}
      mode={mode}
      separator={separator}
      timeMode={time ? timeMode : undefined}
      dateTimeSeparator={time ? dateTimeSeparator : undefined}
      timeStep={time ? timeStep : undefined}
      min={limits ? today.minus({ days: 30 }).startOf('day') : undefined}
      max={limits ? today.plus({ days: 30 }).endOf('day') : undefined}
      clearable={clearable}
      disabled={disabled}
      {...(phone ? {} : { variant, size, pill, invalid })}
    />
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && (
          <>
            <Segments name="variant" options={['outline', 'soft'] as const} value={variant} onChange={setVariant} />
            <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
            <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
          </>
        )}
        <Segments name="mode" options={MODE_OPTIONS} value={mode} onChange={setMode} />
        <Segments name="separator" options={SEPARATOR_OPTIONS} value={separator} onChange={setSeparator} />
        <Segments name="timeMode" options={TIME_MODE_OPTIONS} value={timeMode} onChange={setTimeMode} />
        {time && (
          <>
            <Segments name="dateTimeSeparator" options={DATE_TIME_SEPARATOR_OPTIONS} value={dateTimeSeparator} onChange={setDateTimeSeparator} />
            <DemoControlRow name="timeStep">
              <SliderValueControl ariaLabel="timeStep" min={0} max={15} step={1} value={timeStep} onChange={setTimeStep} width="min(42vw, 340px)" />
            </DemoControlRow>
          </>
        )}
        <DemoControlBoolean name="limits" value={limits} onChange={setLimits} />
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        {!phone && <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />}
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneDateRow label="Date">{input}</PhoneDateRow>
      ) : (
        <div data-demo-stage className="py-10">
          <div className={STAGE_WIDTH[timeMode]}>{input}</div>
        </div>
      )}
    </>
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
