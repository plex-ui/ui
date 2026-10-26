'use client';

import { DateTime } from 'luxon';
import { useState } from 'react';
import { DateInput } from '@plexui/ui/components/DateInput';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Input } from '@plexui/ui/components/Input';

export function DatePickerBaseDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  return (
    <DatePicker
      id="date-picker-base"
      triggerDateFormat="MM/dd/yy"
      size="lg"
      pill
      clearable
      value={selectedDate}
      onChange={(next) => setSelectedDate(next as DateTime | null)}
    />
  );
}

export function DatePickerLimitsDemo() {
  const today = DateTime.local();
  const minDate = today.minus({ days: 30 }).startOf('day');
  const maxDate = today.plus({ days: 30 }).endOf('day');
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(today);
  return (
    <DatePicker
      id="date-picker-limits"
      triggerDateFormat="MM/dd/yy"
      size="lg"
      pill
      triggerShowIcon
      value={selectedDate}
      onChange={(next) => setSelectedDate(next as DateTime | null)}
      min={minDate}
      max={maxDate}
    />
  );
}

export function DatePickerWithoutIconDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  return (
    <DatePicker
      id="date-picker-no-icon"
      triggerDateFormat="MM/dd/yy"
      size="lg"
      triggerShowIcon={false}
      placeholder="Choose a date"
      value={selectedDate}
      onChange={(next) => setSelectedDate(next as DateTime | null)}
    />
  );
}

export function DatePickerDisabledDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(DateTime.local());
  return (
    <DatePicker
      id="date-picker-disabled"
      triggerDateFormat="MM/dd/yy"
      size="lg"
      disabled
      value={selectedDate}
      onChange={(next) => setSelectedDate(next as DateTime | null)}
    />
  );
}

export function DatePickerDobDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  return (
    <DatePicker
      id="date-picker-dob"
      triggerDateFormat="MMMM d, yyyy"
      size="lg"
      pill
      clearable
      placeholder="Select your birthday"
      captionLayout="dropdown"
      value={selectedDate}
      onChange={(next) => setSelectedDate(next as DateTime | null)}
      max={DateTime.local()}
    />
  );
}

export function DatePickerTimeDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  return (
    <DatePicker
      id="date-picker-time"
      triggerDateFormat="MM/dd/yy HH:mm"
      size="lg"
      pill
      clearable
      placeholder="Select date & time"
      showTime
      value={selectedDate}
      onChange={(next) => setSelectedDate(next as DateTime | null)}
    />
  );
}

export function DatePickerDateTimeDropdownDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  return (
    <DatePicker
      id="date-picker-datetime-dropdown"
      triggerDateFormat="MMM d, yyyy HH:mm"
      size="lg"
      pill
      clearable
      placeholder="Schedule event"
      captionLayout="dropdown"
      showTime
      yearRange={[2020, 2030]}
      value={selectedDate}
      onChange={(next) => setSelectedDate(next as DateTime | null)}
    />
  );
}

export function DatePickerTwoFieldDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const [time, setTime] = useState('10:30');

  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d:]/g, '');
    const digits = raw.replace(/:/g, '');
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2, 4);
    } else if (digits.length === 2 && !raw.includes(':')) {
      formatted = digits + ':';
    }
    setTime(formatted.slice(0, 5));

    const parts = formatted.split(':');
    if (parts.length === 2 && parts[1].length === 2 && selectedDate) {
      const h = Math.min(23, Number(parts[0]) || 0);
      const m = Math.min(59, Number(parts[1]) || 0);
      setSelectedDate(selectedDate.set({ hour: h, minute: m }));
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <DatePicker
        id="date-picker-two-field-date"
        triggerDateFormat="MMM d, yyyy"
        size="lg"
        pill
        captionLayout="dropdown"
        triggerShowIcon={false}
        dropdownIconType="none"
        placeholder="Select date"
        value={selectedDate}
        onChange={(next) => {
          const dt = next as DateTime | null;
          if (dt && time) {
            const [h, m] = time.split(':').map(Number);
            setSelectedDate(dt.set({ hour: h || 0, minute: m || 0 }));
          } else {
            setSelectedDate(dt);
          }
        }}
      />
      <Input
        id="date-picker-two-field-time"
        size="lg"
        pill
        value={time}
        onChange={handleTimeInput}
        placeholder="HH:MM"
        maxLength={5}
        style={{ width: '72px' }}
      />
    </div>
  );
}

export function DatePickerMaskedDateDemo() {
  const [date, setDate] = useState<DateTime | null>(null);
  return (
    <div className="w-[200px]">
      <DateInput value={date} onChange={setDate} mode="mm/dd/yyyy" separator="/" aria-label="Date" />
    </div>
  );
}

export function DatePickerMaskedDateTimeDemo() {
  const [dateTime, setDateTime] = useState<DateTime | null>(null);
  return (
    <div className="w-[260px]">
      <DateInput
        value={dateTime}
        onChange={setDateTime}
        mode="mm/dd/yyyy"
        separator="/"
        timeMode="HH:MM"
        aria-label="Date and time"
      />
    </div>
  );
}
