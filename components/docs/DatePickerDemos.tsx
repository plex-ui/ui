'use client';

import { DateTime } from 'luxon';
import type React from 'react';
import { useState } from 'react';
import { DateInput } from '@plexui/ui/components/DateInput';
import { DatePicker } from '@plexui/ui/components/DatePicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Input } from '@plexui/ui/components/Input';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow, Segments } from './ButtonDemos';
import { PhoneRowsStage, phoneCalendarStageClassName, phoneCalendarTimeStageClassName, usePhoneRows } from './PhoneRows';
import { SliderValueControl } from './SliderValueControl';

// On a phone a date picker is the value of a row in a FieldGroup, as in the Form Examples: the compact date
// of iOS, a capsule with the date and no icon, opening our calendar. The row sets its height and insets, so
// the phone examples drop the desktop size, pill and icon.
// A row that opens the calendar keeps room for its tallest month; a typed date input opens nothing.
function PhoneDateRows({ children, reserve = 'calendar' }: { children: React.ReactNode; reserve?: 'calendar' | 'time' | 'none' }) {
  const stage = reserve === 'none' ? undefined : reserve === 'time' ? phoneCalendarTimeStageClassName : phoneCalendarStageClassName;
  return (
    <PhoneRowsStage className={stage}>
      <FieldGroup>{children}</FieldGroup>
    </PhoneRowsStage>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const VARIANT_OPTIONS = ['outline', 'soft', 'ghost'] as const;
const DROPDOWN_ICON_OPTIONS = ['dropdown', 'chevronDown', 'none'] as const;
const DATE_FORMAT_OPTIONS = ['MM/dd/yy', 'MMM d, yyyy', 'MMMM d, yyyy'] as const;
const TIME_FORMAT_OPTIONS = ['HH:mm', 'h:mm a'] as const;
const CAPTION_OPTIONS = ['buttons', 'dropdown'] as const;
const YEAR_RANGE_OPTIONS = [
  { value: 'default', label: 'last 120 years' },
  { value: '2020-2030', label: '2020–2030' },
] as const;
// None, 30 days either side of today, or up to today (a date of birth)
const LIMIT_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'around', label: '±30 days' },
  { value: 'past', label: 'to today' },
] as const;
const SIDE_OPTIONS = ['top', 'right', 'bottom', 'left'] as const;
const ALIGN_OPTIONS = ['start', 'center', 'end'] as const;

/** The Overview, with every setting of the picker: what the page's examples once showed one by one (Limits, Date of
 * birth, Time picker, Dropdown + time, Without Icon) are its settings (owner 11.11: «в первом примере можно сразу
 * показать все со всеми настройками»). In a phone row the picker is the compact date of iOS: the row's capsule is
 * its frame (variant, size, pill, block and the dropdown icon have no effect there), it writes the date as iOS does,
 * with no icon, and opens the calendar under the row, so those settings, the date format, the icon and the placement
 * stay on desktop, keeping their choice; a time is a second capsule there, in either of the forms iOS writes a time.
 * `triggerTimeFormat` is offered with `showTime`, `alignOffset` with a start or end alignment, and `yearRange` with
 * the dropdown caption and no limits (with `min` or `max` the dropdown lists the years they allow). */
export function DatePickerOverviewDemo() {
  const [today] = useState(() => DateTime.local());
  const [value, setValue] = useState<DateTime | null>(null);
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(true);
  const [block, setBlock] = useState(false);
  const [clearable, setClearable] = useState(true);
  const [triggerShowIcon, setTriggerShowIcon] = useState(true);
  const [dropdownIconType, setDropdownIconType] = useState<(typeof DROPDOWN_ICON_OPTIONS)[number]>('dropdown');
  const [triggerDateFormat, setTriggerDateFormat] = useState<(typeof DATE_FORMAT_OPTIONS)[number]>('MM/dd/yy');
  const [showTime, setShowTime] = useState(false);
  const [triggerTimeFormat, setTriggerTimeFormat] = useState<(typeof TIME_FORMAT_OPTIONS)[number]>('HH:mm');
  const [captionLayout, setCaptionLayout] = useState<(typeof CAPTION_OPTIONS)[number]>('buttons');
  const [yearRange, setYearRange] = useState<(typeof YEAR_RANGE_OPTIONS)[number]['value']>('default');
  const [limits, setLimits] = useState<(typeof LIMIT_OPTIONS)[number]['value']>('none');
  const [side, setSide] = useState<(typeof SIDE_OPTIONS)[number]>('bottom');
  const [sideOffset, setSideOffset] = useState(8);
  const [align, setAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('center');
  const [alignOffset, setAlignOffset] = useState(-5);
  const [disabled, setDisabled] = useState(false);
  const phone = usePhoneRows();
  const dropdown = captionLayout === 'dropdown';
  const edge = align !== 'center';
  // With min or max the dropdown lists the years they allow, so a range of its own is offered without limits
  const ownYears = dropdown && limits === 'none';
  const picker = (
    <DatePicker
      id="date-picker-base"
      placeholder="Select date"
      showTime={showTime}
      triggerTimeFormat={showTime ? triggerTimeFormat : undefined}
      captionLayout={captionLayout}
      yearRange={ownYears && yearRange === '2020-2030' ? [2020, 2030] : undefined}
      min={limits === 'around' ? today.minus({ days: 30 }).startOf('day') : undefined}
      max={limits === 'around' ? today.plus({ days: 30 }).endOf('day') : limits === 'past' ? today.endOf('day') : undefined}
      clearable={clearable}
      disabled={disabled}
      value={value}
      onChange={setValue}
      {...(phone
        ? { triggerDateFormat: 'MMM d, yyyy', triggerShowIcon: false }
        : { variant, size, pill, block, triggerShowIcon, dropdownIconType, triggerDateFormat, side, sideOffset, align, alignOffset: edge ? alignOffset : undefined })}
    />
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && (
          <>
            <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
            <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
            <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
            <DemoControlBoolean name="block" value={block} onChange={setBlock} />
          </>
        )}
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        {!phone && (
          <>
            <DemoControlBoolean name="triggerShowIcon" value={triggerShowIcon} onChange={setTriggerShowIcon} />
            <Segments name="dropdownIconType" options={DROPDOWN_ICON_OPTIONS} value={dropdownIconType} onChange={setDropdownIconType} />
            <Segments name="triggerDateFormat" options={DATE_FORMAT_OPTIONS} value={triggerDateFormat} onChange={setTriggerDateFormat} />
          </>
        )}
        <DemoControlBoolean name="showTime" value={showTime} onChange={setShowTime} />
        {showTime && <Segments name="triggerTimeFormat" options={TIME_FORMAT_OPTIONS} value={triggerTimeFormat} onChange={setTriggerTimeFormat} />}
        <Segments name="captionLayout" options={CAPTION_OPTIONS} value={captionLayout} onChange={setCaptionLayout} />
        {ownYears && <Segments name="yearRange" options={YEAR_RANGE_OPTIONS} value={yearRange} onChange={setYearRange} />}
        <Segments name="limits" options={LIMIT_OPTIONS} value={limits} onChange={setLimits} />
        {!phone && (
          <>
            <Segments name="side" options={SIDE_OPTIONS} value={side} onChange={setSide} />
            <DemoControlRow name="sideOffset">
              <SliderValueControl ariaLabel="sideOffset" min={0} max={24} step={1} value={sideOffset} onChange={setSideOffset} width="min(42vw, 340px)" />
            </DemoControlRow>
            <Segments name="align" options={ALIGN_OPTIONS} value={align} onChange={setAlign} />
            {edge && (
              <DemoControlRow name="alignOffset">
                <SliderValueControl ariaLabel="alignOffset" min={-20} max={20} step={1} value={alignOffset} onChange={setAlignOffset} width="min(42vw, 340px)" />
              </DemoControlRow>
            )}
          </>
        )}
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        // The stage keeps room for the calendar with its time, so turning showTime on does not grow the preview
        <PhoneDateRows reserve="time">
          <Field row label="Date">{picker}</Field>
        </PhoneDateRows>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <div className="flex w-[320px] justify-center">{picker}</div>
        </div>
      )}
    </>
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
    <PhoneDateRows reserve="none">
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
