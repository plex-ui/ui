'use client';

import { DateTime } from 'luxon';
import { useState, type ComponentProps } from 'react';
import { VueDemo } from './VueDemo';

// DateInput's value is a Luxon DateTime, which MDX (a server component)
// cannot hand to a client component. Dates come in as ISO strings (or
// "today") and become DateTime values here, in the browser; `today` is in
// every template's scope, like the React demo's `DateTime.local()`
// (components/docs/DateInputDemos.tsx).

const toDateTime = (value: string | null) =>
  value === null ? null : value === 'today' ? DateTime.local() : DateTime.fromISO(value);

/** A VueDemo whose state can hold DateTime values: `dates={{ date: "2025-01-01" }}`. */
export function VueDateInputDemo({
  state,
  dates,
  ...props
}: ComponentProps<typeof VueDemo> & { dates?: Record<string, string | null> }) {
  const [scope] = useState(() => ({
    today: DateTime.local(),
    ...Object.fromEntries(Object.entries(dates ?? {}).map(([name, value]) => [name, toDateTime(value)])),
  }));
  return <VueDemo {...props} state={{ ...scope, ...state }} />;
}
