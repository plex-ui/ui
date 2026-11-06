'use client';

import { DateTime } from 'luxon';
import type React from 'react';
import { useState } from 'react';
import { DateInput } from '@plexui/ui/components/DateInput';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { controlsTableStyle, DemoControlBoolean } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone a date picker is the value of a row in a FieldGroup, as in the Form Examples: the compact date
// of iOS, a capsule with the date and no icon, opening our calendar. The row sets its height and insets, so
// the phone examples drop the desktop size, pill, icon and clear button.
function PhoneDateRows({ children }: { children: React.ReactNode }) {
  return (
    <PhoneRowsStage>
      <FieldGroup>{children}</FieldGroup>
    </PhoneRowsStage>
  );
}

export function DatePickerBaseDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const [disabled, setDisabled] = useState(false);
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneDateRows>
          <Field row label="Date">
            <DatePicker id="date-picker-base" triggerDateFormat="MMM d, yyyy" triggerShowIcon={false} placeholder="Select date" disabled={disabled} value={selectedDate} onChange={setSelectedDate} />
          </Field>
        </PhoneDateRows>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <DatePicker
            id="date-picker-base"
            triggerDateFormat="MM/dd/yy"
            size="lg"
            pill
            clearable
            disabled={disabled}
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
      )}
    </>
  );
}

export function DatePickerLimitsDemo() {
  const today = DateTime.local();
  const minDate = today.minus({ days: 30 }).startOf('day');
  const maxDate = today.plus({ days: 30 }).endOf('day');
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(today);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRows>
      <Field row label="Date">
        <DatePicker id="date-picker-limits" triggerDateFormat="MMM d, yyyy" triggerShowIcon={false} value={selectedDate} onChange={setSelectedDate} min={minDate} max={maxDate} />
      </Field>
    </PhoneDateRows>
  );
  return (
    <DatePicker
      id="date-picker-limits"
      triggerDateFormat="MM/dd/yy"
      size="lg"
      pill
      triggerShowIcon
      value={selectedDate}
      onChange={setSelectedDate}
      min={minDate}
      max={maxDate}
    />
  );
}

export function DatePickerWithoutIconDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRows>
      <Field row label="Date">
        <DatePicker id="date-picker-no-icon" triggerDateFormat="MMM d, yyyy" triggerShowIcon={false} placeholder="Choose a date" value={selectedDate} onChange={setSelectedDate} />
      </Field>
    </PhoneDateRows>
  );
  return (
    <DatePicker
      id="date-picker-no-icon"
      triggerDateFormat="MM/dd/yy"
      size="lg"
      triggerShowIcon={false}
      placeholder="Choose a date"
      value={selectedDate}
      onChange={setSelectedDate}
    />
  );
}

export function DatePickerDobDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRows>
      <Field row label="Birthday">
        <DatePicker id="date-picker-dob" triggerDateFormat="MMM d, yyyy" triggerShowIcon={false} placeholder="Select date" captionLayout="dropdown" value={selectedDate} onChange={setSelectedDate} max={DateTime.local()} />
      </Field>
    </PhoneDateRows>
  );
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
      onChange={setSelectedDate}
      max={DateTime.local()}
    />
  );
}

export function DatePickerTimeDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRows>
      <Field row label="Starts">
        <DatePicker id="date-picker-time" triggerDateFormat="MMM d, yyyy HH:mm" triggerShowIcon={false} placeholder="Select date" showTime value={selectedDate} onChange={setSelectedDate} />
      </Field>
    </PhoneDateRows>
  );
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
      onChange={setSelectedDate}
    />
  );
}

export function DatePickerDateTimeDropdownDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRows>
      <Field row label="Event">
        <DatePicker id="date-picker-datetime-dropdown" triggerDateFormat="MMM d, yyyy HH:mm" triggerShowIcon={false} placeholder="Select date" captionLayout="dropdown" showTime yearRange={[2020, 2030]} value={selectedDate} onChange={setSelectedDate} />
      </Field>
    </PhoneDateRows>
  );
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
      onChange={setSelectedDate}
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

  const onDateChange = (dt: DateTime | null) => {
    if (dt && time) {
      const [h, m] = time.split(':').map(Number);
      setSelectedDate(dt.set({ hour: h || 0, minute: m || 0 }));
    } else {
      setSelectedDate(dt);
    }
  };
  const phone = usePhoneRows();
  if (phone) {
    // Two rows: the compact date, then the time typed at the row's end
    return (
      <PhoneDateRows>
        <Field row label="Date">
          <DatePicker id="date-picker-two-field-date" triggerDateFormat="MMM d, yyyy" captionLayout="dropdown" triggerShowIcon={false} placeholder="Select date" value={selectedDate} onChange={onDateChange} />
        </Field>
        <Field row label="Time">
          <Input id="date-picker-two-field-time" value={time} onChange={handleTimeInput} placeholder="HH:MM" maxLength={5} inputMode="numeric" />
        </Field>
      </PhoneDateRows>
    );
  }

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
        onChange={onDateChange}
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
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRows>
      <Field row label="Date">
        <DateInput value={date} onChange={setDate} mode="mm/dd/yyyy" separator="/" />
      </Field>
    </PhoneDateRows>
  );
  return (
    <div className="w-[200px]">
      <DateInput value={date} onChange={setDate} mode="mm/dd/yyyy" separator="/" aria-label="Date" />
    </div>
  );
}

export function DatePickerMaskedDateTimeDemo() {
  const [dateTime, setDateTime] = useState<DateTime | null>(null);
  const phone = usePhoneRows();
  if (phone) return (
    <PhoneDateRows>
      <Field row label="Starts">
        <DateInput value={dateTime} onChange={setDateTime} mode="mm/dd/yyyy" separator="/" timeMode="HH:MM" />
      </Field>
    </PhoneDateRows>
  );
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
