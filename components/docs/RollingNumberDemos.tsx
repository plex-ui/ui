'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { RollingNumber } from '@plexui/ui/components/RollingNumber';
import { controlsTableStyle, DemoControlSelect } from './ButtonDemos';

const FORMATS = ['number', 'currency', 'percent'] as const;
type Format = (typeof FORMATS)[number];

/** Each format as `Intl.NumberFormat` takes it; percent shows the value as a share of 10,000 */
const FORMAT_OPTIONS: Record<Format, Intl.NumberFormatOptions> = {
  number: {},
  currency: { style: 'currency', currency: 'USD' },
  percent: { style: 'percent', maximumFractionDigits: 1 },
};

const STEPS = [-100, -1, 1, 25, 1000];

export function RollingNumberOverviewDemo() {
  const [format, setFormat] = useState<Format>('currency');
  const [value, setValue] = useState(1284);
  const shown = format === 'percent' ? value / 10000 : value;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="format" options={FORMATS} value={format} onChange={setFormat} />
      </div>
      <div data-demo-stage className="flex w-full flex-1 flex-col items-center justify-center gap-6 py-12">
        <RollingNumber value={shown} locales="en-US" format={FORMAT_OPTIONS[format]} className="text-4xl font-semibold" />
        <div className="flex flex-wrap justify-center gap-2">
          {STEPS.map((step) => (
            <Button key={step} color="secondary" variant="soft" size="sm" onClick={() => setValue((current) => Math.max(0, current + step))}>
              {step > 0 ? `+${step}` : step}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}

export function RollingNumberInTextDemo() {
  const [count, setCount] = useState(3);
  return (
    <div data-demo-stage className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-12">
      <p className="text-sm text-secondary">
        <RollingNumber value={count} locales="en-US" /> {count === 1 ? 'item' : 'items'} in your bag
      </p>
      <Button color="secondary" variant="soft" size="sm" onClick={() => setCount((current) => current + 7)}>
        Add 7
      </Button>
    </div>
  );
}
