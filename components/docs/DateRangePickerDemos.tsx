'use client';

import React from 'react';
import { DateTime } from 'luxon';
import { useId, useState } from 'react';
import {
  DateRangePicker,
  type DateRange,
  type DateRangeShortcut,
} from '@plexui/ui/components/DateRangePicker';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',
  
  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const controlId = useId();

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

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

export function DateRangePickerLimitsDemo() {
  const today = DateTime.local();
  const minDate = today.minus({ days: 30 }).startOf('day');
  const maxDate = today.endOf('day');
  const [value, setValue] = useState<DateRange | null>(() =>
    getMonthStartAndEnd(today, { min: minDate, max: maxDate }),
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

export function DateRangePickerShortcutsDemo() {
  const [value, setValue] = useState<DateRange | null>(null);
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
