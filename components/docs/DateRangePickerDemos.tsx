'use client';

import { DateTime } from 'luxon';
import type React from 'react';
import { useState } from 'react';
import {
  DateRangePicker,
  type DateRange,
  type DateRangeShortcut,
} from '@plexui/ui/components/DateRangePicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, phoneCalendarSecondRowStageClassName, phoneCalendarStageClassName, usePhoneRows } from './PhoneRows';

// On a phone a date range picker is the value of a row in a FieldGroup: the range (short dates, None when empty)
// and its up-down chevrons at the row's end, as a pop-up, opening our calendar. The row sets its height and
// insets, so the phone examples drop the desktop size, pill, icon and clear button. In a row the month of a
// month stepper keeps the width of the longest month, so its arrows stay put.
function PhoneRangeRow({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <PhoneRowsStage className={phoneCalendarStageClassName}>
      <FieldGroup>
        <Field row label={label}>{children}</Field>
      </FieldGroup>
    </PhoneRowsStage>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

function getMonthStartAndEnd(
  date: DateTime,
  { min, max }: { min?: DateTime; max?: DateTime } = {},
): DateRange {
  const startOfMonth = date.startOf('month');
  const endOfMonth = date.endOf('month');
  return [
    min ? DateTime.max(min, startOfMonth) : startOfMonth,
    max ? DateTime.min(max, endOfMonth) : endOfMonth,
  ];
}

const dayShortcuts: DateRangeShortcut[] = [
  {
    label: 'Today',
    getDateRange: () => {
      const today = DateTime.local();
      return [today.startOf('day'), today.endOf('day')];
    },
  },
  {
    label: 'Yesterday',
    getDateRange: () => {
      const yesterday = DateTime.local().minus({ days: 1 });
      return [yesterday.startOf('day'), yesterday.endOf('day')];
    },
  },
  {
    label: 'Last 7 days',
    getDateRange: () => {
      const today = DateTime.local().endOf('day');
      // Inclusive of today: 7 days end today and start 6 days earlier
      return [today.minus({ days: 6 }).startOf('day'), today];
    },
  },
  {
    label: 'Last 30 days',
    getDateRange: () => {
      const today = DateTime.local().endOf('day');
      // Inclusive of today: 30 days end today and start 29 days earlier
      return [today.minus({ days: 29 }).startOf('day'), today];
    },
  },
];

export function DateRangePickerBaseDemo() {
  const [value, setValue] = useState<DateRange | null>(null);
  const [disabled, setDisabled] = useState(false);
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneRangeRow label="Dates">
          <DateRangePicker triggerShowIcon={false} triggerDateFormat="MMM d" placeholder="None" disabled={disabled} value={value} onChange={setValue} />
        </PhoneRangeRow>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <div style={{ width: 'fit-content' }}>
            <DateRangePicker size="lg" pill clearable disabled={disabled} value={value} onChange={setValue} />
          </div>
        </div>
      )}
    </>
  );
}

export function DateRangePickerLimitsDemo() {
  const today = DateTime.local();
  const minDate = today.minus({ days: 30 }).startOf('day');
  const maxDate = today.endOf('day');
  const [value, setValue] = useState<DateRange | null>(() =>
    getMonthStartAndEnd(today, { min: minDate, max: maxDate }),
  );
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneRangeRow label="Dates">
      <DateRangePicker triggerShowIcon={false} triggerDateFormat="MMM d" placeholder="None" value={value} onChange={setValue} min={minDate} max={maxDate} />
    </PhoneRangeRow>
  );
  return (
    <div style={{ width: 'fit-content' }}>
      <DateRangePicker
        size="lg"
        pill
        triggerShowIcon
        value={value}
        onChange={(next) => setValue(next as DateRange | null)}
        min={minDate}
        max={maxDate}
      />
    </div>
  );
}

// The calendar shows no shortcuts below the md breakpoint. As in iOS settings, a phone offers them as a pop-up in a
// row of their own (kit Lists, trailing Pop-up) above the row of dates; the row reads Custom for any other range.
const periodOptions = dayShortcuts.map(({ label }) => ({ value: label, label }));
/** The label of the shortcut whose range the dates are, or '' */
const periodOf = (range: DateRange | null) => {
  if (!range) return '';
  return dayShortcuts.find(({ getDateRange }) => {
    const [start, end] = getDateRange();
    return range[0].hasSame(start, 'day') && range[1].hasSame(end, 'day');
  })?.label ?? '';
};

export function DateRangePickerShortcutsDemo() {
  const [value, setValue] = useState<DateRange | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneRowsStage className={phoneCalendarSecondRowStageClassName}>
      <FieldGroup>
        <Field row label="Period">
          <Select
            value={periodOf(value)}
            options={periodOptions}
            onChange={({ value: label }) => {
              const shortcut = dayShortcuts.find((item) => item.label === label);
              if (shortcut) setValue(shortcut.getDateRange());
            }}
            placeholder={value ? 'Custom' : 'None'}
            block={false}
            align="end"
          />
        </Field>
        <Field row label="Dates">
          <DateRangePicker triggerShowIcon={false} triggerDateFormat="MMM d" placeholder="None" value={value} onChange={setValue} />
        </Field>
      </FieldGroup>
    </PhoneRowsStage>
  );
  return (
    <div style={{ width: 'fit-content' }}>
      <DateRangePicker
        size="lg"
        pill
        clearable
        value={value}
        onChange={(next) => setValue(next as DateRange | null)}
        shortcuts={dayShortcuts}
      />
    </div>
  );
}

export function DateRangePickerMonthStepperDemo() {
  const today = DateTime.local();
  const maxDate = today.endOf('day');
  const [value, setValue] = useState<DateRange | null>(() =>
    getMonthStartAndEnd(today, { max: today }),
  );
  return (
    <div style={{ width: 'fit-content' }}>
      <DateRangePicker
        size="lg"
        clearable
        pill
        triggerStepperUnit="month"
        value={value}
        onChange={(next) => setValue(next as DateRange | null)}
        max={maxDate}
      />
    </div>
  );
}

export function DateRangePickerMonthStepperDemoWithControls() {
  const today = DateTime.local();
  const maxDate = today.endOf('day');
  const [value, setValue] = useState<DateRange | null>(() =>
    getMonthStartAndEnd(today, { max: today }),
  );
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(true);
  const phone = usePhoneRows();

  if (phone) {
    return (
      <PhoneRangeRow label="Month">
        <DateRangePicker triggerStepperUnit="month" value={value} onChange={setValue} max={maxDate} />
      </PhoneRangeRow>
    );
  }
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage>
        <div style={{ width: 'fit-content' }}>
          <DateRangePicker
            size={size}
            clearable
            pill={pill}
            triggerStepperUnit="month"
            value={value}
            onChange={(next) => setValue(next as DateRange | null)}
            max={maxDate}
          />
        </div>
      </div>
    </>
  );
}
