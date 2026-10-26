'use client';

import { DateTime } from 'luxon';
import { useState, type ComponentProps } from 'react';
import { VueDemo } from './VueDemo';

// A Vue template reads values from its setup scope, and MDX cannot pass
// luxon DateTimes or functions to a client component. The DatePicker and
// DateRangePicker examples use these the way a real app defines them in
// <script setup>: `DateTime`, the limits and shortcuts of the React demos
// (components/docs/DatePickerDemos.tsx, DateRangePickerDemos.tsx), and the
// time helpers of the "Two fields" example. Dates are computed when a demo
// mounts, as the React demos compute them when they render.

type DateRange = [DateTime, DateTime];

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

const dayShortcuts = [
  {
    label: 'Today',
    getDateRange: (): DateRange => {
      const today = DateTime.local();
      return [today.startOf('day'), today.endOf('day')];
    },
  },
  {
    label: 'Yesterday',
    getDateRange: (): DateRange => {
      const yesterday = DateTime.local().minus({ days: 1 });
      return [yesterday.startOf('day'), yesterday.endOf('day')];
    },
  },
  {
    label: 'Last 7 days',
    getDateRange: (): DateRange => {
      const today = DateTime.local().endOf('day');
      return [today.minus({ days: 7 }).startOf('day'), today];
    },
  },
  {
    label: 'Last 30 days',
    getDateRange: (): DateRange => {
      const today = DateTime.local().endOf('day');
      return [today.minus({ days: 30 }).startOf('day'), today];
    },
  },
];

/** "Two fields": the typed time, masked to HH:MM as in the React demo */
const formatTime = (value: string) => {
  const raw = value.replace(/[^\d:]/g, '');
  const digits = raw.replace(/:/g, '');
  let formatted = digits;
  if (digits.length >= 3) {
    formatted = digits.slice(0, 2) + ':' + digits.slice(2, 4);
  } else if (digits.length === 2 && !raw.includes(':')) {
    formatted = digits + ':';
  }
  return formatted.slice(0, 5);
};

/** "Two fields": a complete typed time (HH:MM) moves the picked date's time */
const applyTime = (date: DateTime | null, time: string) => {
  const parts = time.split(':');
  if (parts.length === 2 && parts[1].length === 2 && date) {
    const h = Math.min(23, Number(parts[0]) || 0);
    const m = Math.min(59, Number(parts[1]) || 0);
    return date.set({ hour: h, minute: m });
  }
  return date;
};

/** "Two fields": a picked date takes the typed time */
const withTime = (date: DateTime | null, time: string) => {
  if (date && time) {
    const [h, m] = time.split(':').map(Number);
    return date.set({ hour: h || 0, minute: m || 0 });
  }
  return date;
};

/**
 * A VueDemo whose template can use `DateTime`, `minDate` / `maxDate` (30 days
 * either side of today) and the "Two fields" helpers. `selectedDate` starts
 * empty, or at today with `startAtToday`.
 */
export function VueDatePickerDemo({
  state,
  startAtToday = false,
  ...props
}: ComponentProps<typeof VueDemo> & { startAtToday?: boolean }) {
  const [scope] = useState(() => {
    const today = DateTime.local();
    return {
      DateTime,
      minDate: today.minus({ days: 30 }).startOf('day'),
      maxDate: today.plus({ days: 30 }).endOf('day'),
      selectedDate: startAtToday ? today : null,
      formatTime,
      applyTime,
      withTime,
    };
  });
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}

/**
 * A VueDemo whose template can use `DateTime`, `dayShortcuts`, `minDate`
 * (30 days ago) and `maxDate` (the end of today). `value` starts empty, at
 * this month within the limits (`initialRange="limits"`), or at this month
 * up to today (`initialRange="month"`).
 */
export function VueDateRangePickerDemo({
  state,
  initialRange,
  ...props
}: ComponentProps<typeof VueDemo> & { initialRange?: 'limits' | 'month' }) {
  const [scope] = useState(() => {
    const today = DateTime.local();
    const minDate = today.minus({ days: 30 }).startOf('day');
    const maxDate = today.endOf('day');
    const value =
      initialRange === 'limits'
        ? getMonthStartAndEnd(today, { min: minDate, max: maxDate })
        : initialRange === 'month'
          ? getMonthStartAndEnd(today, { max: today })
          : null;
    return { DateTime, dayShortcuts, minDate, maxDate, value };
  });
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}
