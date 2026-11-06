'use client';

import type React from 'react';
import { useState } from 'react';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Textarea } from '@plexui/ui/components/Textarea';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone a textarea is the value of a row in a FieldGroup, under its label, as in the Form Examples.
// The row is its frame and sets its type and insets, so the phone examples drop the desktop size and variant controls.
function PhoneTextareaRow({ label, errorMessage, children }: { label: string; errorMessage?: string; children: React.ReactElement }) {
  return (
    <PhoneRowsStage>
      <FieldGroup>
        <Field row orientation="vertical" label={label} errorMessage={errorMessage}>
          {children}
        </Field>
      </FieldGroup>
    </PhoneRowsStage>
  );
}

const LONG_REFERENCE = 'Invoice 2026-114 for the October design work, the extra review round, and the new icons we added to the November release at the end of the month.';

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
          <div className="min-w-0 flex-1">{renderRow(ri)}</div>
        </div>
      ))}
    </div>
  );
}

export function TextareaBaseDemo() {
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneTextareaRow label="Notes">
        <Textarea variant="ghost" placeholder="Add a note" autoResize rows={2} />
      </PhoneTextareaRow>
    );
  }
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <div className="w-full min-w-0 max-w-[400px]">
        <Textarea placeholder="Enter text..." autoResize rows={3} />
      </div>
    </div>
  );
}

export function TextareaVariantsDemo() {
  const phone = usePhoneRows();
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  if (phone) {
    return (
      <PhoneTextareaRow label="Note for the courier">
        <Textarea variant="ghost" placeholder="Gate code, floor, a safe place to leave it" autoResize rows={2} />
      </PhoneTextareaRow>
    );
  }
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
        <div className="w-full min-w-0 max-w-[400px]">
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
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneTextareaRow label="Message">
        <Textarea variant="ghost" placeholder="Write a message..." rows={4} />
      </PhoneTextareaRow>
    );
  }
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
        <div className="w-full min-w-0 max-w-[400px]">
          <Textarea placeholder="Write a message..." size={size} gutterSize={gutterSize} />
        </div>
      </div>
    </>
  );
}

export function TextareaDisabledDemo() {
  const phone = usePhoneRows();
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneTextareaRow label="Notes">
          <Textarea variant="ghost" disabled={disabled} defaultValue="Leave it at the front desk." autoResize rows={2} />
        </PhoneTextareaRow>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div className="w-full min-w-0 max-w-[400px]">
            <Textarea disabled={disabled} defaultValue="Jane Doe" aria-label="Name" />
          </div>
        </div>
      )}
    </>
  );
}

export function TextareaInvalidDemo() {
  const phone = usePhoneRows();
  const [invalid, setInvalid] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      {phone ? (
        // A row is the field's frame, so the error is the line under it
        <PhoneTextareaRow label="Reference" errorMessage={invalid ? 'Keep it under 140 characters.' : undefined}>
          <Textarea variant="ghost" defaultValue={LONG_REFERENCE} invalid={invalid} autoResize rows={2} />
        </PhoneTextareaRow>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div className="w-full min-w-0 max-w-[400px]">
            <Textarea invalid={invalid} placeholder="Invalid textarea" />
          </div>
        </div>
      )}
    </>
  );
}

export function TextareaAutoSelectDemo() {
  const phone = usePhoneRows();
  const [autoSelect, setAutoSelect] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="autoSelect" value={autoSelect} onChange={setAutoSelect} />
      </div>
      {phone ? (
        <PhoneTextareaRow label="Notes">
          <Textarea variant="ghost" defaultValue="Toggle to auto select" autoSelect={autoSelect} autoResize rows={2} />
        </PhoneTextareaRow>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div className="w-full min-w-0 max-w-[400px]">
            <Textarea defaultValue="Toggle to auto select" autoSelect={autoSelect} aria-label="Notes" />
          </div>
        </div>
      )}
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
  const phone = usePhoneRows();
  const field = (
    <Textarea
      variant={phone ? 'ghost' : undefined}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Type to grow..."
      autoResize={autoResize}
      rows={Number(rows)}
      maxRows={Number(maxRows)}
    />
  );
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
      {phone ? (
        <PhoneTextareaRow label="Notes">{field}</PhoneTextareaRow>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div className="w-full min-w-0 max-w-[400px]">{field}</div>
        </div>
      )}
    </>
  );
}

export function TextareaAutofillExtensionsDemo() {
  const phone = usePhoneRows();
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
      {phone ? (
        <PhoneTextareaRow label="Address">
          <Textarea
            key={String(allowAutofillExtensions)}
            variant="ghost"
            name="address"
            autoComplete="street-address"
            allowAutofillExtensions={allowAutofillExtensions}
            placeholder={allowAutofillExtensions ? 'Allowed' : 'Not allowed'}
            autoResize
            rows={2}
          />
        </PhoneTextareaRow>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <div className="w-full min-w-0 max-w-[400px]">
            <Textarea
              key={String(allowAutofillExtensions)}
              name="email"
              allowAutofillExtensions={allowAutofillExtensions}
              placeholder={allowAutofillExtensions ? 'Allowed' : 'Not allowed'}
            />
          </div>
        </div>
      )}
    </>
  );
}
