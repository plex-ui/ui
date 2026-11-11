'use client';

import type React from 'react';
import { useState } from 'react';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Textarea } from '@plexui/ui/components/Textarea';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';
import { SliderValueControl } from './SliderValueControl';

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

function DesktopStage({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <div className="w-full min-w-0 max-w-[400px]">{children}</div>
    </div>
  );
}

function Segments<T extends string>({ name, options, value, onChange, desktopOnly = false }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void; desktopOnly?: boolean }) {
  return (
    <DemoControlRow name={name} desktopOnly={desktopOnly}>
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

const VARIANT_OPTIONS = ['outline', 'soft'] as const;
const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
// `auto`: no gutterSize, the size gives it
const GUTTER_OPTIONS = ['auto', '2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
// A note to the courier, three lines long: auto resize, rows and maxRows and auto select show on it
const NOTE = 'Gate code 4512\nThird floor, door on the left\nCall when you arrive';
const ERROR = 'Keep the note to two lines.';

const ROWS = { min: 1, max: 10, step: 1 } as const;

function Range({ name, value, onChange }: { name: string; value: number; onChange: (value: number) => void }) {
  return (
    <DemoControlRow name={name}>
      <SliderValueControl ariaLabel={name} {...ROWS} value={value} onChange={onChange} width="min(42vw, 340px)" />
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the textarea: what the page's examples once showed one by one (Variants,
 * Sizing, Disabled, Invalid, Auto resize, Auto select text, Autofill extensions) are its settings (owner 11.11: «в
 * первом примере можно сразу показать все со всеми настройками»). rows and maxRows take one scale, a slider of 1–10
 * with the number, Storybook's range control (owner 11.11: «что за градация странная?» of 2–5 and 4–10 by 2); 10 is
 * the default maxRows. The phone row is the frame and sets the type and insets, so variant, size and gutterSize are
 * desktop settings, and so are autofill extensions, a desktop matter: on iOS autofill comes from the system above the
 * keyboard. On a phone the error is the row's line under it. */
export function TextareaOverviewDemo() {
  const phone = usePhoneRows();
  const [value, setValue] = useState(NOTE);
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [gutterSize, setGutterSize] = useState<(typeof GUTTER_OPTIONS)[number]>('auto');
  const [rows, setRows] = useState(3);
  const [maxRows, setMaxRows] = useState(10);
  const [autoResize, setAutoResize] = useState(true);
  const [autoSelect, setAutoSelect] = useState(false);
  const [allowAutofillExtensions, setAllowAutofillExtensions] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const shared = {
    name: 'notes',
    value,
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value),
    placeholder: 'Add a note',
    rows,
    maxRows,
    autoResize,
    autoSelect,
    disabled,
    invalid,
  };
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} desktopOnly />
        <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} desktopOnly />
        <Segments name="gutterSize" options={GUTTER_OPTIONS} value={gutterSize} onChange={setGutterSize} desktopOnly />
        <Range name="rows" value={rows} onChange={setRows} />
        <Range name="maxRows" value={maxRows} onChange={setMaxRows} />
        <DemoControlBoolean name="autoResize" value={autoResize} onChange={setAutoResize} />
        <DemoControlBoolean name="autoSelect" value={autoSelect} onChange={setAutoSelect} />
        <DemoControlBoolean name="allowAutofillExtensions" value={allowAutofillExtensions} onChange={setAllowAutofillExtensions} desktopOnly />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      {phone ? (
        <PhoneTextareaRow label="Notes" errorMessage={invalid ? ERROR : undefined}>
          {/* A phone has no autofill extensions setting: its field takes the default, as the phone code does */}
          <Textarea variant="ghost" {...shared} />
        </PhoneTextareaRow>
      ) : (
        <DesktopStage>
          <Textarea
            // The extensions are let in, or kept out, as the field mounts
            key={String(allowAutofillExtensions)}
            variant={variant}
            size={size}
            gutterSize={gutterSize === 'auto' ? undefined : gutterSize}
            allowAutofillExtensions={allowAutofillExtensions}
            {...shared}
          />
        </DesktopStage>
      )}
    </>
  );
}
