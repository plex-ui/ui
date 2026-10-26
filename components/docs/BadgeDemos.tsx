'use client';

import React, { Fragment, useId, useState } from 'react';
import { Badge } from '@plexui/ui/components/Badge';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',
  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};
const labelStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: '0.875rem',
};

const SIZES = ['sm', 'md', 'lg'] as const;
const VARIANTS = ['soft', 'solid', 'outline'] as const;
const COLORS = [
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'discovery',
  'caution',
] as const;

function Matrix({
  rowLabels,
  columnLabels,
  renderCell,
}: {
  rowLabels: Readonly<string[]>;
  columnLabels: Readonly<string[]>;
  renderCell: (rowIndex: number, colIndex: number) => React.ReactNode;
}) {
  const template = `auto repeat(${columnLabels.length}, min-content)`;
  return (
    <div className="grid gap-6 items-center justify-center" style={{ gridTemplateColumns: template }}>
      <div />
      {columnLabels.map((col) => (
        <div key={col} className="text-center mb-1" style={labelStyle}>
          {col}
        </div>
      ))}
      {rowLabels.map((row, rowIndex) => (
        <Fragment key={row}>
          <div className="text-right mr-3" style={labelStyle}>
            {row}
          </div>
          {columnLabels.map((col, colIndex) => (
            <div key={`${row}-${col}`} className="text-center">
              {renderCell(rowIndex, colIndex)}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const controlId = useId();

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

export function BadgeColorsDemo() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="pt-1 pb-6 px-8 w-fit min-w-full">
        <Matrix
          rowLabels={VARIANTS}
          columnLabels={COLORS}
          renderCell={(rowIndex, colIndex) => (
            <Badge color={COLORS[colIndex]} variant={VARIANTS[rowIndex]}>
              Sample
            </Badge>
          )}
        />
      </div>
    </div>
  );
}

export function BadgeSizingDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [pill, setPill] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <div style={controlRowStyle}>
          <span style={controlLabelStyle}>size</span>
          <SegmentedControl<(typeof SIZES)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZES.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </div>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="py-10">
        <Badge color="info" size={size} pill={pill}>
          New
        </Badge>
      </div>
    </>
  );
}
