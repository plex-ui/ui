'use client';

import { useId, useState } from 'react';
import { ToggleGroup } from '@plexui/ui/components/ToggleGroup';
import { controlsTableStyle, DemoControlBoolean, DemoControlSelect } from './ButtonDemos';
import { useDesktopOnlyState } from './PhoneRows';

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

const COLOR_OPTIONS = ['primary', 'secondary', 'danger', 'info', 'discovery', 'success', 'caution', 'warning'] as const;
const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

/** The Overview, with every setting of the group on the Clock app's Repeat row: what the page's example Color and size
 * showed are its settings, and the whole group's `disabled` too (owner 11.11: «в первом примере можно сразу показать все
 * со всеми настройками»). `uniform` stays on, as a letter needs it; the Text example shows items without it. */
export function ToggleGroupOverviewDemo() {
  const labelId = useId();
  const [days, setDays] = useState(['3', '4', '5']);
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');
  // Desktop settings: on a phone, where they are hidden, the items take their initial values
  const [, setSize, size] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');
  const [, setPill, pill] = useDesktopOnlyState(true);
  const [block, setBlock] = useState(true);
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />
        {/* On a phone the items are always round, and a round item is the Clock app's 35pt circle at every size */}
        <DemoControlSelect name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} desktopOnly />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <div className="flex w-full min-w-fit max-w-[350px] flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <span id={labelId}>Repeat</span>
            <span className="text-secondary">{repeatSummary(days)}</span>
          </div>
          <ToggleGroup aria-labelledby={labelId} value={days} onChange={setDays} color={color} size={size} pill={pill} uniform block={block} disabled={disabled}>
            {week.map((day) => (
              <ToggleGroup.Item key={day.value} value={day.value} aria-label={day.name}>
                {day.letter}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </>
  );
}

/** Disabled items, each kept as it is: a real form, where one way to be told is always on and another waits for a
 * phone number (the whole group's `disabled` is a setting of the Overview) */
export function ToggleGroupTextDemo() {
  return (
    <ToggleGroup aria-label="Show" defaultValue={['unread']}>
      <ToggleGroup.Item value="unread">Unread</ToggleGroup.Item>
      <ToggleGroup.Item value="starred">Starred</ToggleGroup.Item>
      <ToggleGroup.Item value="mentions">Mentions</ToggleGroup.Item>
    </ToggleGroup>
  );
}

export function ToggleGroupDisabledDemo() {
  const labelId = useId();
  return (
    <div className="flex flex-col items-start gap-3">
      <span id={labelId}>Notify me by</span>
      <ToggleGroup aria-labelledby={labelId} defaultValue={['email', 'push']}>
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
  );
}
