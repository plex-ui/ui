'use client';

import type React from 'react';
import { useId, useState } from 'react';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

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

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

const VARIANT_OPTIONS = ['outline', 'soft'] as const;
const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const GUTTER_OPTIONS = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;

function RowMatrix({
  rowLabels,
  renderRow,
}: {
  rowLabels: Readonly<string[]>;
  renderRow: (rowIndex: number) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {rowLabels.map((row, ri) => (
        <div key={ri} className="flex items-center">
          <div className="text-right text-sm mr-8 min-w-[4rem]" style={{ color: 'var(--color-text-tertiary)' }}>{row}</div>
          <div className="flex-1">{renderRow(ri)}</div>
        </div>
      ))}
    </div>
  );
}

export function TextareaBaseDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <div className="w-[400px]">
        <Textarea placeholder="Enter text..." autoResize rows={3} />
      </div>
    </div>
  );
}

export function TextareaVariantsDemo() {
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl<(typeof VARIANT_OPTIONS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <RowMatrix
            rowLabels={VARIANT_OPTIONS}
            renderRow={(row) => (
              <Textarea placeholder="Enter text..." className="w-full" variant={VARIANT_OPTIONS[row]} rows={3} />
            )}
          />
        </div>
      </div>
    </>
  );
}

export function TextareaSizingDemo() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [gutterSize, setGutterSize] = useState<(typeof GUTTER_OPTIONS)[number]>('md');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="gutterSize">
          <SegmentedControl<(typeof GUTTER_OPTIONS)[number]>
            value={gutterSize}
            onChange={setGutterSize}
            aria-label="gutterSize"
            size="xs"
          >
            {GUTTER_OPTIONS.map((g) => (
              <SegmentedControl.Option key={g} value={g}>
                {g}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <Textarea placeholder="Write a message..." size={size} gutterSize={gutterSize} />
        </div>
      </div>
    </>
  );
}

export function TextareaDisabledDemo() {
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <Textarea disabled={disabled} defaultValue="Jane Doe" aria-label="Name" />
        </div>
      </div>
    </>
  );
}

export function TextareaInvalidDemo() {
  const [invalid, setInvalid] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <Textarea invalid={invalid} placeholder="Invalid textarea" />
        </div>
      </div>
    </>
  );
}

export function TextareaAutoSelectDemo() {
  const [autoSelect, setAutoSelect] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="autoSelect" value={autoSelect} onChange={setAutoSelect} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <Textarea defaultValue="Toggle to auto select" autoSelect={autoSelect} aria-label="Notes" />
        </div>
      </div>
    </>
  );
}

const ROWS_OPTIONS = ['2', '3', '4', '5'] as const;
const MAX_ROWS_OPTIONS = ['4', '6', '8', '10'] as const;

export function TextareaAutoResizeDemo() {
  const [value, setValue] = useState('Line 1\nLine 2\nLine 3');
  const [autoResize, setAutoResize] = useState(true);
  const [rows, setRows] = useState<(typeof ROWS_OPTIONS)[number]>('3');
  const [maxRows, setMaxRows] = useState<(typeof MAX_ROWS_OPTIONS)[number]>('8');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="autoResize" value={autoResize} onChange={setAutoResize} />
        <DemoControlRow name="rows">
          <SegmentedControl<(typeof ROWS_OPTIONS)[number]>
            value={rows}
            onChange={setRows}
            aria-label="rows"
            size="xs"
          >
            {ROWS_OPTIONS.map((n) => (
              <SegmentedControl.Option key={n} value={n}>
                {n}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="maxRows">
          <SegmentedControl<(typeof MAX_ROWS_OPTIONS)[number]>
            value={maxRows}
            onChange={setMaxRows}
            aria-label="maxRows"
            size="xs"
          >
            {MAX_ROWS_OPTIONS.map((n) => (
              <SegmentedControl.Option key={n} value={n}>
                {n}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type to grow..."
            autoResize={autoResize}
            rows={Number(rows)}
            maxRows={Number(maxRows)}
          />
        </div>
      </div>
    </>
  );
}

export function TextareaAutofillExtensionsDemo() {
  const [allowAutofillExtensions, setAllowAutofillExtensions] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean
          name="allowAutofillExtensions"
          value={allowAutofillExtensions}
          onChange={setAllowAutofillExtensions}
        />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <Textarea
            key={String(allowAutofillExtensions)}
            name="email"
            allowAutofillExtensions={allowAutofillExtensions}
            placeholder={allowAutofillExtensions ? 'Allowed' : 'Not allowed'}
          />
        </div>
      </div>
    </>
  );
}
