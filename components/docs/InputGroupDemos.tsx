'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { InputGroup } from '@plexui/ui/components/InputGroup';
import { DropdownIcon } from '@plexui/ui/components/SelectControl';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Menu } from '@plexui/ui/components/Menu';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { LoadingIndicator } from '@plexui/ui/components/Indicator';
import {
  ArrowUpSm,
  CameraPhoto,
  ChevronDownMd,
  Copy,
  CreditCard,
  Email,
  FileCode,
  Play,
  Search,
} from '@plexui/ui/components/Icon';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone an input group is the value of a row in a FieldGroup, as the Weight row of the Form Examples:
// its prefix, unit and button sit in the row, the row's label names it, and the row is its frame. The row
// sets its height, insets and type, so the phone examples drop the desktop size, variant and pill controls.
// A block addon (a heading or a counter) becomes the row's label or the group's footer. With a prefix the
// group takes `columns`, so the value starts at the column, as in the Input examples; without one the value
// ends at the row's edge with its unit after it ("72 kg"). A row keeps a prefix or a unit, not both: in a
// column the unit would stand at the far edge, away from its value.

function PhoneWebsiteRow({ disabled, invalid, loading }: { disabled?: boolean; invalid?: boolean; loading?: boolean }) {
  return (
    <Field row label="Website" errorMessage={invalid ? 'Enter a valid address.' : undefined}>
      {(control) => (
        <InputGroup disabled={disabled} invalid={invalid}>
          <InputGroup.Input {...control} placeholder="acme.com" inputMode="url" autoCapitalize="none" spellCheck={false} />
          <InputGroup.Addon>
            <InputGroup.Text>https://</InputGroup.Text>
          </InputGroup.Addon>
          {/* The address being checked; in a field the indicator is 20px, the iOS 27 Regular spinner */}
          {loading && (
            <InputGroup.Addon align="inline-end">
              <LoadingIndicator />
            </InputGroup.Addon>
          )}
        </InputGroup>
      )}
    </Field>
  );
}

function PhoneAmountRow({ disabled }: { disabled?: boolean }) {
  return (
    <Field row label="Amount">
      {(control) => (
        <InputGroup disabled={disabled}>
          <InputGroup.Input {...control} placeholder="0.00" inputMode="decimal" />
          <InputGroup.Addon>
            <InputGroup.Text>$</InputGroup.Text>
          </InputGroup.Addon>
        </InputGroup>
      )}
    </Field>
  );
}

// A value with its unit after it ends at the row's edge, as iOS writes "5 km", so its group takes no columns
function PhoneDistanceRow({ disabled }: { disabled?: boolean }) {
  return (
    <Field row label="Distance">
      {(control) => (
        <InputGroup disabled={disabled}>
          <InputGroup.Input {...control} defaultValue="5" inputMode="decimal" />
          <InputGroup.Addon align="inline-end">
            <InputGroup.Text>km</InputGroup.Text>
          </InputGroup.Addon>
        </InputGroup>
      )}
    </Field>
  );
}

function PhoneUnitMenu<T extends string>({ units, value, onChange }: { units: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <Menu>
      <Menu.Trigger>
        <InputGroup.Button aria-label={`Unit: ${value}`} className="text-secondary font-normal">
          {value}
          <span className="ms-1"><DropdownIcon iconType="dropdown" /></span>
        </InputGroup.Button>
      </Menu.Trigger>
      <Menu.Content align="end" minWidth="auto">
        {units.map((unit) => (
          <Menu.CheckboxItem key={unit.value} checked={value === unit.value} onCheckedChange={() => onChange(unit.value)} indicatorPosition="start" indicatorVariant="ghost">
            {unit.label}
          </Menu.CheckboxItem>
        ))}
      </Menu.Content>
    </Menu>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const VARIANT_OPTIONS = ['outline', 'soft'] as const;

type Size = (typeof SIZE_OPTIONS)[number];
type Variant = (typeof VARIANT_OPTIONS)[number];

function SegmentedRow<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <DemoControlRow name={name}>
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

const ALIGN_OPTIONS = ['inline-start', 'inline-end', 'block-start', 'block-end'] as const;
type Align = (typeof ALIGN_OPTIONS)[number];

/**
 * The Overview, with every setting of a group: what the page's examples once showed one by one (Variants, Align,
 * Spinner, Sizes) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»);
 * Text, Button, Dropdown and Textarea stay, each other content in its addons. `align` places the caption of the amount:
 * before or after the value, or as a row above or below it; a group with a block addon lays its addons out as rows, so
 * the caption is that group's only addon. `loading` shows a spinner after the value while it is searched or checked. On a phone the group is the value of a row: the row is its frame and sets its height, so
 * `size`, `variant`, `pill` and `align` stay on the desktop (a block addon becomes the row's label or the group's
 * footer there).
 */
export function InputGroupOverviewDemo() {
  const [size, setSize] = useState<Size>('md');
  const [variant, setVariant] = useState<Variant>('outline');
  const [pill, setPill] = useState(false);
  const [align, setAlign] = useState<Align>('inline-start');
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const args = { size, variant, pill, disabled, invalid };
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && <SegmentedRow name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />}
        {!phone && <SegmentedRow name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />}
        {!phone && <DemoControlBoolean name="pill" value={pill} onChange={setPill} />}
        {!phone && <SegmentedRow name="align" options={ALIGN_OPTIONS} value={align} onChange={setAlign} />}
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <FieldGroup columns>
            <PhoneWebsiteRow disabled={disabled} invalid={invalid} loading={loading} />
            <PhoneAmountRow disabled={disabled} />
          </FieldGroup>
          <FieldGroup>
            <PhoneDistanceRow disabled={disabled} />
          </FieldGroup>
        </PhoneRowsStage>
      ) : (
      <div data-demo-stage className="py-10">
        <div className="flex flex-col gap-2.5 w-[320px]">
          <InputGroup {...args}>
            <InputGroup.Input placeholder="Search..." />
            <InputGroup.Addon>
              <Search />
            </InputGroup.Addon>
            {loading && (
              <InputGroup.Addon align="inline-end">
                <LoadingIndicator />
              </InputGroup.Addon>
            )}
            <InputGroup.Addon align="inline-end">
              <InputGroup.Text>12 results</InputGroup.Text>
            </InputGroup.Addon>
          </InputGroup>
          <InputGroup {...args}>
            <InputGroup.Input placeholder="example" />
            <InputGroup.Addon>
              <InputGroup.Text>https://</InputGroup.Text>
            </InputGroup.Addon>
            <InputGroup.Addon align="inline-end">
              <InputGroup.Text>.com</InputGroup.Text>
            </InputGroup.Addon>
          </InputGroup>
          {/* A group with a block addon is a column: its only addon here, so the text can take every place */}
          <InputGroup {...args}>
            <InputGroup.Input placeholder="0.00" inputMode="decimal" />
            <InputGroup.Addon align={align}>
              <InputGroup.Text>Amount in USD</InputGroup.Text>
            </InputGroup.Addon>
          </InputGroup>
          <InputGroup {...args}>
            <InputGroup.Input placeholder="Ask anything..." />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button variant="solid" color="primary" uniform aria-label="Send">
                <ArrowUpSm />
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </div>
      )}
    </>
  );
}

export function InputGroupTextDemo() {
  const [post, setPost] = useState('');
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneRowsStage>
        {/* A prefix in a row; a counter is the group's footer. */}
        <FieldGroup columns>
          <Field row label="Page">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} placeholder="docs" autoCapitalize="none" spellCheck={false} />
                <InputGroup.Addon>
                  <InputGroup.Text>plexui.com/</InputGroup.Text>
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
        </FieldGroup>
        {/* The counter of a block-end addon is the group's footer */}
        <FieldGroup footer={`${280 - post.length} characters left`}>
          <Field row orientation="vertical" label="Post">
            <Textarea variant="ghost" placeholder="What's happening?" maxLength={280} value={post} onChange={(event) => setPost(event.target.value)} autoResize rows={2} />
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 w-[320px]">
      <InputGroup>
        <InputGroup.Input placeholder="0.00" inputMode="decimal" />
        <InputGroup.Addon>
          <InputGroup.Text>$</InputGroup.Text>
        </InputGroup.Addon>
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>USD</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Input placeholder="example" />
        <InputGroup.Addon>
          <InputGroup.Text>https://</InputGroup.Text>
        </InputGroup.Addon>
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>.com</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Input placeholder="username" />
        <InputGroup.Addon>
          <Email />
        </InputGroup.Addon>
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>@company.com</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Textarea
          placeholder="What's happening?"
          maxLength={280}
          value={post}
          onChange={(event) => setPost(event.target.value)}
        />
        <InputGroup.Addon align="block-end">
          <InputGroup.Text>{280 - post.length} characters left</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup>
    </div>
  );
}

/** `size` and `pill` controls shared by the examples that show them */
function useSizePill() {
  const [size, setSize] = useState<Size>('md');
  const [pill, setPill] = useState(false);
  const phone = usePhoneRows();
  const controls = phone ? null : (
    <div data-demo-controls style={controlsTableStyle}>
      <SegmentedRow name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
      <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
    </div>
  );
  return { args: { size, pill }, controls, phone };
}

export function InputGroupButtonDemo() {
  const { args, controls, phone } = useSizePill();
  if (phone) {
    return (
      <PhoneRowsStage>
        {/* The main action is the button under the rows. */}
        <FieldGroup>
          <Field row label="Link">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} defaultValue="plexui.com/r/input-group" readOnly />
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Button uniform aria-label="Copy link">
                    <Copy />
                  </InputGroup.Button>
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
          <Field row label="Card">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} placeholder="Card number" inputMode="numeric" autoComplete="cc-number" />
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Button uniform aria-label="Scan card">
                    <CameraPhoto />
                  </InputGroup.Button>
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
        </FieldGroup>
        {/* A form's main action is the full-width button under its rows, not a button inside a row */}
        <Button color="primary" size="3xl" pill block>Pay</Button>
      </PhoneRowsStage>
    );
  }
  return (
    <>
      {controls}
      <div data-demo-stage className="py-10">
        <div className="flex flex-col gap-2.5 w-[320px]">
          <InputGroup {...args}>
            <InputGroup.Input defaultValue="plexui.com/r/input-group" readOnly />
            <InputGroup.Addon>
              <InputGroup.Text>https://</InputGroup.Text>
            </InputGroup.Addon>
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button uniform aria-label="Copy link">
                <Copy />
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup>
          <InputGroup {...args}>
            <InputGroup.Input placeholder="Search the docs..." />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button variant="soft">Search</InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup>
          <InputGroup {...args}>
            <InputGroup.Input placeholder="Card number" inputMode="numeric" />
            <InputGroup.Addon>
              <CreditCard />
            </InputGroup.Addon>
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button variant="solid" color="primary">
                Pay
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </div>
    </>
  );
}

const WEIGHT_UNITS = [
  { value: 'kg', label: 'Kilograms' },
  { value: 'lb', label: 'Pounds' },
  { value: 'st', label: 'Stones' },
] as const;

const LENGTH_UNITS = [
  { value: 'cm', label: 'Centimeters' },
  { value: 'm', label: 'Meters' },
  { value: 'in', label: 'Inches' },
  { value: 'ft', label: 'Feet' },
] as const;

function UnitMenu<T extends string>({
  units,
  value,
  onChange,
  label,
}: {
  units: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <Menu>
      <Menu.Trigger>
        <InputGroup.Button aria-label={`${label} unit`}>
          {value}
          <ChevronDownMd />
        </InputGroup.Button>
      </Menu.Trigger>
      <Menu.Content align="end" minWidth={160}>
        {units.map((unit) => (
          <Menu.CheckboxItem
            key={unit.value}
            checked={value === unit.value}
            onCheckedChange={() => onChange(unit.value)}
            indicatorVariant="ghost"
          >
            {unit.label} ({unit.value})
          </Menu.CheckboxItem>
        ))}
      </Menu.Content>
    </Menu>
  );
}

export function InputGroupDropdownDemo() {
  const { args, controls, phone } = useSizePill();
  const [weightUnit, setWeightUnit] = useState<(typeof WEIGHT_UNITS)[number]['value']>('kg');
  const [lengthUnit, setLengthUnit] = useState<(typeof LENGTH_UNITS)[number]['value']>('cm');
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <Field row label="Weight">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} defaultValue="72" inputMode="decimal" />
                <InputGroup.Addon align="inline-end">
                  <PhoneUnitMenu units={WEIGHT_UNITS} value={weightUnit} onChange={setWeightUnit} />
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
          <Field row label="Height">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} defaultValue="180" inputMode="decimal" />
                <InputGroup.Addon align="inline-end">
                  <PhoneUnitMenu units={LENGTH_UNITS} value={lengthUnit} onChange={setLengthUnit} />
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <>
      {controls}
      <div data-demo-stage className="py-10">
        <div className="flex flex-col gap-2.5 w-[320px]">
          <InputGroup {...args}>
            <InputGroup.Input defaultValue="72" inputMode="decimal" aria-label="Weight" />
            <InputGroup.Addon>
              <InputGroup.Text>Weight</InputGroup.Text>
            </InputGroup.Addon>
            <InputGroup.Addon align="inline-end">
              <UnitMenu units={WEIGHT_UNITS} value={weightUnit} onChange={setWeightUnit} label="Weight" />
            </InputGroup.Addon>
          </InputGroup>
          <InputGroup {...args}>
            <InputGroup.Input defaultValue="180" inputMode="decimal" aria-label="Height" />
            <InputGroup.Addon>
              <InputGroup.Text>Height</InputGroup.Text>
            </InputGroup.Addon>
            <InputGroup.Addon align="inline-end">
              <UnitMenu units={LENGTH_UNITS} value={lengthUnit} onChange={setLengthUnit} label="Height" />
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </div>
    </>
  );
}

export function InputGroupTextareaDemo() {
  const phone = usePhoneRows();
  if (phone) {
    // The header is the row's label, the status line the group's footer, the action the button under the group
    return (
      <PhoneRowsStage>
        <FieldGroup footer="Line 1, Column 1">
          <Field row orientation="vertical" label="script.js">
            <Textarea variant="ghost" placeholder="console.log('Hello, world!');" rows={4} className="font-mono" autoCapitalize="none" spellCheck={false} />
          </Field>
        </FieldGroup>
        <Button color="primary" size="3xl" pill block>Run</Button>
      </PhoneRowsStage>
    );
  }
  return (
    <div className="w-full min-w-0 max-w-[400px]">
      <InputGroup>
        <InputGroup.Textarea placeholder="console.log('Hello, world!');" rows={4} className="font-mono" />
        <InputGroup.Addon align="block-start">
          <InputGroup.Text>
            <FileCode />
            script.js
          </InputGroup.Text>
          <InputGroup.Button uniform aria-label="Copy" className="ml-auto">
            <Copy />
          </InputGroup.Button>
        </InputGroup.Addon>
        <InputGroup.Addon align="block-end">
          <InputGroup.Text>Line 1, Column 1</InputGroup.Text>
          <InputGroup.Button variant="solid" color="primary" className="ml-auto">
            Run
            <Play />
          </InputGroup.Button>
        </InputGroup.Addon>
      </InputGroup>
    </div>
  );
}
