'use client';

import type { CSSProperties } from 'react';
import { useId, useState } from 'react';
import { Progress } from '@plexui/ui/components/Progress';
import { Label } from '@plexui/ui/components/Label';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { SliderValueControl } from './SliderValueControl';
import { usePhoneRows } from './PhoneRows';

/**
 * The Overview, with every setting of a bar (row 33: one example per content, owner 11.11): a value that moves, a
 * label with its readout and a value bound to a control were four examples of one bar. The bar animates each change
 * of the value; with no value it is indeterminate.
 */
export function ProgressOverviewDemo() {
  const [value, setValue] = useState(66);
  const [indeterminate, setIndeterminate] = useState(false);
  const [label, setLabel] = useState(true);
  // On a phone the bar spans the screen between its margins, as an iOS progress view does
  const phone = usePhoneRows();
  const labelId = useId();

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="value">
          <SliderValueControl ariaLabel="value" min={0} max={100} step={1} value={value} onChange={setValue} width="min(42vw, 340px)" />
        </DemoControlRow>
        <DemoControlBoolean name="indeterminate" value={indeterminate} onChange={setIndeterminate} />
        <DemoControlBoolean name="label" value={label} onChange={setLabel} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 px-4 w-full">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: phone ? undefined : 320 }}>
          {label && (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
              <Label id={labelId}>Uploading plex-ui.zip</Label>
              {!indeterminate && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>{value}%</span>}
            </div>
          )}
          <Progress
            value={indeterminate ? null : value}
            aria-labelledby={label ? labelId : undefined}
            aria-label={label ? undefined : 'Uploading plex-ui.zip'}
          />
        </div>
      </div>
    </>
  );
}

/* ============================================================
   Segments — parts of one bar, as a bill paid in parts
   ============================================================ */

const BILL = [
  { value: 120, color: 'success', label: 'Paid' },
  { value: 45, color: 'warning', label: 'Pending' },
] as const;

export function ProgressSegmentsDemo() {
  const due = 200 - BILL.reduce((sum, part) => sum + part.value, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
      <Label id="progress-bill-label">Bill of $200</Label>
      <Progress aria-labelledby="progress-bill-label" max={200} segments={[...BILL]} style={{ '--progress-height': '8px' } as CSSProperties} />
      <span style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        120 paid · 45 pending · {due} due
      </span>
    </div>
  );
}

