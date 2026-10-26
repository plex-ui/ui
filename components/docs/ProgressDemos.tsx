'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Progress } from '@plexui/ui/components/Progress';
import { Label } from '@plexui/ui/components/Label';

const Slider = dynamic(
  () => import('@plexui/ui/components/Slider').then((mod) => mod.Slider),
  { ssr: false }
);

/* ============================================================
   Overview — animates from initial to target on mount
   ============================================================ */

export function ProgressOverviewDemo() {
  const [value, setValue] = useState(13);

  useEffect(() => {
    const timer = setTimeout(() => setValue(66), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: '60%', minWidth: 240 }}>
      <Progress value={value} aria-label="Loading" />
    </div>
  );
}

/* ============================================================
   With label — field-style composition showing live percentage
   ============================================================ */

export function ProgressWithLabelDemo() {
  const uploaded = 3.2;
  const total = 4.8;
  const pct = Math.round((uploaded / total) * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        maxWidth: 320,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Label id="progress-upload-label">Uploading plex-ui.zip</Label>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          {uploaded} / {total} MB
        </span>
      </div>
      <Progress aria-labelledby="progress-upload-label" value={pct} />
    </div>
  );
}

/* ============================================================
   Controlled — bound to a Slider
   ============================================================ */

export function ProgressControlledDemo() {
  const [value, setValue] = useState(50);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        maxWidth: 320,
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <Progress value={value} aria-label="Progress" />
      <Slider value={value} onChange={setValue} min={0} max={100} step={1} />
    </div>
  );
}

