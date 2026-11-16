'use client';

import { DateTime } from 'luxon';
import { useState } from 'react';
import {
  DateRangePicker,
  type DateRange,
  type DateRangeShortcut,
} from '@plexui/ui/components/DateRangePicker';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Select } from '@plexui/ui/components/Select';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, phoneCalendarSecondRowStageClassName, usePhoneRows } from './PhoneRows';
import { SliderValueControl } from './SliderValueControl';

// On a phone a date range picker is the value of a row in a FieldGroup: the range (short dates, None when empty)
// and its up-down chevrons at the row's end, as a pop-up, opening our calendar. The row sets its height and
// insets, so the phone drops the desktop size, pill, icon and clear button. In a row the month of a month stepper
// keeps the width of the longest month, so its arrows stay put.

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

const VARIANT_OPTIONS = ['outline', 'soft', 'ghost'] as const;
const DROPDOWN_ICON_OPTIONS = ['dropdown', 'chevronDown', 'none'] as const;
const DATE_FORMAT_OPTIONS = ['MM/dd/yy', 'MMM d', 'MMM d, yyyy'] as const;
const STEPPER_OPTIONS = ['none', 'month'] as const;
// None, or the last 30 days up to today
const LIMIT_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'past', label: 'last 30 days' },
] as const;
const RANGE_DAYS_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: '7', label: '7 days' },
] as const;
const WEEK_START_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
] as const;
const SIDE_OPTIONS = ['top', 'right', 'bottom', 'left'] as const;
const ALIGN_OPTIONS = ['start', 'center', 'end'] as const;

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

// The calendar shows no shortcuts below the md breakpoint. As in iOS settings, a phone offers them as a pop-up in a
// row of their own (kit Lists, trailing Pop-up) above the row of dates; the row reads Custom for any other range.
/** Whether the limits allow a range, as the calendar decides for a shortcut: whole days from min to max, and no
 * more than maxRangeDays days */
const allows = ([start, end]: DateRange, min?: DateTime, max?: DateTime, maxRangeDays?: number) =>
  !(min && start < min.startOf('day'))
  && !(max && end > max.endOf('day'))
  && !(maxRangeDays != null && end.startOf('day') > start.startOf('day').plus({ days: maxRangeDays - 1 }));
/** The Period options: a shortcut the limits rule out is disabled, as in the calendar */
const periodOptionsFor = (min?: DateTime, max?: DateTime, maxRangeDays?: number) =>
  dayShortcuts.map(({ label, getDateRange }) => ({ value: label, label, disabled: !allows(getDateRange(), min, max, maxRangeDays) }));
/** The label of the shortcut whose range the dates are, or '' */
const periodOf = (range: DateRange | null) => {
  if (!range) return '';
  return dayShortcuts.find(({ getDateRange }) => {
    const [start, end] = getDateRange();
    return range[0].hasSame(start, 'day') && range[1].hasSame(end, 'day');
  })?.label ?? '';
};

/** The Overview, with every setting of the picker: what the page's examples once showed one by one (Limits,
 * Shortcuts, Month stepper) are its settings (owner 11.11: the first preview has every setting). In a phone row the
 * row is the frame (variant, size, pill, block and the dropdown icon have no effect there), the dates are short with
 * no icon and the calendar opens under the row, so those settings, clearable, the date format and the placement stay
 * on desktop, keeping their choice. On a phone the shortcuts are a Period row of their own above the Dates row, and
 * the stage always keeps room for the calendar of that second row, so turning them on does not grow the preview.
 * `alignOffset` is offered with a start or end alignment. */
export function DateRangePickerOverviewDemo() {
  const [today] = useState(() => DateTime.local());
  const [value, setValue] = useState<DateRange | null>(null);
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(true);
  const [block, setBlock] = useState(false);
  const [clearable, setClearable] = useState(true);
  const [triggerShowIcon, setTriggerShowIcon] = useState(true);
  const [dropdownIconType, setDropdownIconType] = useState<(typeof DROPDOWN_ICON_OPTIONS)[number]>('dropdown');
  const [triggerDateFormat, setTriggerDateFormat] = useState<(typeof DATE_FORMAT_OPTIONS)[number]>('MM/dd/yy');
  const [stepper, setStepper] = useState<(typeof STEPPER_OPTIONS)[number]>('none');
  const [shortcuts, setShortcuts] = useState(false);
  const [limits, setLimits] = useState<(typeof LIMIT_OPTIONS)[number]['value']>('none');
  const [rangeDays, setRangeDays] = useState<(typeof RANGE_DAYS_OPTIONS)[number]['value']>('none');
  const [weekStartsOn, setWeekStartsOn] = useState<(typeof WEEK_START_OPTIONS)[number]['value']>('0');
  const [side, setSide] = useState<(typeof SIDE_OPTIONS)[number]>('bottom');
  const [sideOffset, setSideOffset] = useState(8);
  const [align, setAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('center');
  const [alignOffset, setAlignOffset] = useState(-5);
  const [disabled, setDisabled] = useState(false);
  const phone = usePhoneRows();
  const edge = align !== 'center';
  const shared = {
    triggerStepperUnit: stepper === 'month' ? ('month' as const) : undefined,
    min: limits === 'past' ? today.minus({ days: 29 }).startOf('day') : undefined,
    max: limits === 'past' ? today.endOf('day') : undefined,
    maxRangeDays: rangeDays === '7' ? 7 : undefined,
    weekStartsOn: weekStartsOn === '1' ? (1 as const) : (0 as const),
    disabled,
    value,
    onChange: (next: DateRange | null) => setValue(next),
  };
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && (
          <>
            <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
            <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
            <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
            <DemoControlBoolean name="block" value={block} onChange={setBlock} />
            <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
            <DemoControlBoolean name="triggerShowIcon" value={triggerShowIcon} onChange={setTriggerShowIcon} />
            <Segments name="dropdownIconType" options={DROPDOWN_ICON_OPTIONS} value={dropdownIconType} onChange={setDropdownIconType} />
            <Segments name="triggerDateFormat" options={DATE_FORMAT_OPTIONS} value={triggerDateFormat} onChange={setTriggerDateFormat} />
          </>
        )}
        <Segments name="triggerStepperUnit" options={STEPPER_OPTIONS} value={stepper} onChange={setStepper} />
        <DemoControlBoolean name="shortcuts" value={shortcuts} onChange={setShortcuts} />
        <Segments name="limits" options={LIMIT_OPTIONS} value={limits} onChange={setLimits} />
        <Segments name="maxRangeDays" options={RANGE_DAYS_OPTIONS} value={rangeDays} onChange={setRangeDays} />
        <Segments name="weekStartsOn" options={WEEK_START_OPTIONS} value={weekStartsOn} onChange={setWeekStartsOn} />
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
        <PhoneRowsStage className={phoneCalendarSecondRowStageClassName}>
          <FieldGroup>
            {shortcuts && (
              <Field row label="Period">
                <Select
                  value={periodOf(value)}
                  options={periodOptionsFor(shared.min, shared.max, shared.maxRangeDays)}
                  onChange={({ value: label }) => {
                    const shortcut = dayShortcuts.find((item) => item.label === label);
                    if (shortcut) setValue(shortcut.getDateRange());
                  }}
                  placeholder={value ? 'Custom' : 'None'}
                  block={false}
                  align="end"
                  disabled={disabled}
                />
              </Field>
            )}
            <Field row label="Dates">
              <DateRangePicker triggerShowIcon={false} triggerDateFormat="MMM d" placeholder="None" {...shared} />
            </Field>
          </FieldGroup>
        </PhoneRowsStage>
      ) : (
        <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
          <div style={block ? { width: 320 } : { width: 'fit-content' }}>
            <DateRangePicker
              variant={variant}
              size={size}
              pill={pill}
              block={block}
              clearable={clearable}
              triggerShowIcon={triggerShowIcon}
              dropdownIconType={dropdownIconType}
              triggerDateFormat={triggerDateFormat}
              shortcuts={shortcuts ? dayShortcuts : undefined}
              side={side}
              sideOffset={sideOffset}
              align={align}
              alignOffset={edge ? alignOffset : undefined}
              {...shared}
            />
          </div>
        </div>
      )}
    </>
  );
}
