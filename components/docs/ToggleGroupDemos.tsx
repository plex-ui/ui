'use client';

import { useId, useState } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { ToggleGroup } from '@plexui/ui/components/ToggleGroup';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';

// 1 January 2024 is a Monday: ISO weekdays 1 (Monday) to 7 (Sunday), named by Intl
const weekday = (day: number, style: 'narrow' | 'short' | 'long') =>
  new Intl.DateTimeFormat('en-US', { weekday: style, timeZone: 'UTC' }).format(Date.UTC(2024, 0, day));

const week = [1, 2, 3, 4, 5, 6, 7].map((day) => ({
  value: String(day),
  letter: weekday(day, 'narrow'),
  short: weekday(day, 'short'),
  name: weekday(day, 'long'),
}));

// As the iOS Clock Repeat row reads: Never, Every Wednesday, Wed, Thu, and Fri
const repeatSummary = (days: string[]) => {
  const chosen = week.filter((day) => days.includes(day.value));
  if (chosen.length === 0) return 'Never';
  if (chosen.length === 1) return `Every ${chosen[0].name}`;
  return new Intl.ListFormat('en-US').format(chosen.map((day) => day.short));
};

export function ToggleGroupOverviewDemo() {
  const labelId = useId();
  const [days, setDays] = useState(['3', '4', '5']);
  return (
    <div className="flex w-full max-w-[350px] flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <span id={labelId}>Repeat</span>
        <span className="text-secondary">{repeatSummary(days)}</span>
      </div>
      <ToggleGroup aria-labelledby={labelId} value={days} onChange={setDays} pill uniform block>
        {week.map((day) => (
          <ToggleGroup.Item key={day.value} value={day.value} aria-label={day.name}>
            {day.letter}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function ToggleGroupTextDemo() {
  return (
    <ToggleGroup aria-label="Show" defaultValue={['unread']}>
      <ToggleGroup.Item value="unread">Unread</ToggleGroup.Item>
      <ToggleGroup.Item value="starred">Starred</ToggleGroup.Item>
      <ToggleGroup.Item value="mentions">Mentions</ToggleGroup.Item>
    </ToggleGroup>
  );
}

const COLOR_OPTIONS = ['primary', 'secondary', 'danger', 'info', 'discovery', 'success', 'caution', 'warning'] as const;
const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

function OptionsControl<T extends string>({ name, options, value, onChange }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>
            {option}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

export function ToggleGroupColorDemo() {
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('info');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <OptionsControl name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />
        <OptionsControl name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <ToggleGroup aria-label="Toppings" color={color} size={size} pill={pill} defaultValue={['olives', 'basil']}>
          <ToggleGroup.Item value="olives">Olives</ToggleGroup.Item>
          <ToggleGroup.Item value="basil">Basil</ToggleGroup.Item>
          <ToggleGroup.Item value="onion">Onion</ToggleGroup.Item>
          <ToggleGroup.Item value="peppers">Peppers</ToggleGroup.Item>
        </ToggleGroup>
      </div>
    </>
  );
}

export function ToggleGroupDisabledDemo() {
  const labelId = useId();
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <div className="flex flex-col items-start gap-3">
          <span id={labelId}>Notify me by</span>
          <ToggleGroup aria-labelledby={labelId} disabled={disabled} defaultValue={['email', 'push']}>
            <ToggleGroup.Item value="email" disabled>
              Email
            </ToggleGroup.Item>
            <ToggleGroup.Item value="push">Push</ToggleGroup.Item>
            <ToggleGroup.Item value="sms" disabled>
              SMS
            </ToggleGroup.Item>
          </ToggleGroup>
          <span className="text-sm text-secondary">Account emails are always on. Add a phone number to get SMS.</span>
        </div>
      </div>
    </>
  );
}
