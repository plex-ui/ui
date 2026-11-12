'use client';

import { Separator } from '@plexui/ui/components/Separator';

/* ============================================================
   Overview — profile-card pattern: header block, separator, body
   ============================================================ */

export function SeparatorOverviewDemo() {
  return (
    <div
      style={{
        display: 'flex',
        maxWidth: 384,
        flexDirection: 'column',
        gap: 16,
        fontSize: 'var(--font-text-sm-size)',
        lineHeight: 'var(--font-text-sm-line-height)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3 }}>
        <div style={{ fontWeight: 500 }}>Aisha Cooper</div>
        <div style={{ color: 'var(--color-text-tertiary)' }}>
          Engineering · Platform team
        </div>
      </div>
      <Separator />
      <div>
        Shipped 24 pull requests this week across CI/CD and developer tooling.
      </div>
    </div>
  );
}

/* ============================================================
   Vertical — package metadata strip
   ============================================================ */

export function SeparatorVerticalDemo() {
  return (
    <div
      style={{
        display: 'flex',
        height: 20,
        alignItems: 'center',
        gap: 16,
        fontSize: 'var(--font-text-sm-size)',
      }}
    >
      <div>MIT license</div>
      <Separator orientation="vertical" />
      <div>12k downloads</div>
      <Separator orientation="vertical" />
      <div>48 kB bundle</div>
    </div>
  );
}

/* ============================================================
   Menu — pricing tier strip, separators between plans
   ============================================================ */

export function SeparatorMenuDemo() {
  const plans = [
    { name: 'Starter', meta: 'Free · 1 project' },
    { name: 'Pro', meta: '$19/mo · Unlimited' },
    { name: 'Enterprise', meta: 'Custom · Priority SLA' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 'var(--font-text-sm-size)',
      }}
    >
      {plans.map((plan, i) => (
        <span key={plan.name} style={{ display: 'contents' }}>
          {i > 0 && <Separator orientation="vertical" />}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              lineHeight: 1.2,
            }}
          >
            <span style={{ fontWeight: 500 }}>{plan.name}</span>
            <span
              style={{
                fontSize: 'var(--font-text-xs-size)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {plan.meta}
            </span>
          </div>
        </span>
      ))}
    </div>
  );
}

/* ============================================================
   List — release metadata, separators between rows
   ============================================================ */

export function SeparatorListDemo() {
  const rows = [
    { label: 'Version', value: '0.9.0' },
    { label: 'Published', value: '2 days ago' },
    { label: 'Bundle', value: '48 kB' },
    { label: 'License', value: 'MIT' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        maxWidth: 384,
        flexDirection: 'column',
        gap: 8,
        fontSize: 'var(--font-text-sm-size)',
        lineHeight: 'var(--font-text-sm-line-height)',
      }}
    >
      {rows.map((row, i) => (
        <span key={row.label} style={{ display: 'contents' }}>
          {i > 0 && <Separator />}
          <dl
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: 0,
            }}
          >
            <dt>{row.label}</dt>
            <dd style={{ margin: 0, color: 'var(--color-text-tertiary)' }}>
              {row.value}
            </dd>
          </dl>
        </span>
      ))}
    </div>
  );
}
