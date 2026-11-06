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
  ChevronDownMd,
  Copy,
  CreditCard,
  Email,
  FileCode,
  InfoCircle,
  Play,
  Search,
} from '@plexui/ui/components/Icon';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone an input group is the value of a row in a FieldGroup, as the Weight row of the Form Examples:
// its prefix, unit and button sit in the row, the row's label names it, and the row is its frame. The row
// sets its height, insets and type, so the phone examples drop the desktop size, variant and pill controls.
// A block addon (a heading or a counter) becomes the row's label or the group's footer. With a prefix the
// group takes `columns`, so the value starts at the column, as in the Input examples.

function PhoneWebsiteRow({ disabled, invalid }: { disabled?: boolean; invalid?: boolean }) {
  return (
    <Field row label="Website" errorMessage={invalid ? 'Enter a valid address.' : undefined}>
      {(control) => (
        <InputGroup disabled={disabled} invalid={invalid}>
          <InputGroup.Input {...control} placeholder="acme.com" inputMode="url" autoCapitalize="none" spellCheck={false} />
          <InputGroup.Addon>
            <InputGroup.Text>https://</InputGroup.Text>
          </InputGroup.Addon>
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
          <InputGroup.Addon align="inline-end">
            <InputGroup.Text>USD</InputGroup.Text>
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

export function InputGroupOverviewDemo() {
  const [size, setSize] = useState<Size>('md');
  const [variant, setVariant] = useState<Variant>('outline');
  const [pill, setPill] = useState(false);
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
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      {phone ? (
        <PhoneRowsStage>
          <FieldGroup columns>
            <PhoneWebsiteRow disabled={disabled} invalid={invalid} />
            <PhoneAmountRow disabled={disabled} />
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

export function InputGroupVariantsDemo() {
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup columns>
          <PhoneWebsiteRow />
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 w-[320px]">
      {VARIANT_OPTIONS.map((variant) => (
        <InputGroup key={variant} variant={variant}>
          <InputGroup.Input placeholder={variant === 'outline' ? 'Outline' : 'Soft'} />
          <InputGroup.Addon>
            <Search />
          </InputGroup.Addon>
        </InputGroup>
      ))}
    </div>
  );
}

export function InputGroupSizesDemo() {
  const [pill, setPill] = useState(false);
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup columns>
          <PhoneWebsiteRow />
          <PhoneAmountRow />
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="flex flex-col gap-2.5 w-[360px]">
          {SIZE_OPTIONS.map((size) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-8 shrink-0 text-right text-sm text-tertiary">{size}</span>
              <InputGroup size={size} pill={pill}>
                <InputGroup.Input placeholder="Search..." />
                <InputGroup.Addon>
                  <Search />
                </InputGroup.Addon>
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Button>Search</InputGroup.Button>
                </InputGroup.Addon>
              </InputGroup>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function InputGroupAlignDemo() {
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup columns>
          <Field row label="Amount">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} placeholder="0.00" inputMode="decimal" />
                <InputGroup.Addon align="inline-start">
                  <InputGroup.Text>$</InputGroup.Text>
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
          <Field row label="Weight">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} placeholder="0" inputMode="decimal" />
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Text>kg</InputGroup.Text>
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 w-[320px]">
      <InputGroup>
        <InputGroup.Input placeholder="inline-start" />
        <InputGroup.Addon align="inline-start">
          <Search />
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Input placeholder="inline-end" />
        <InputGroup.Addon align="inline-end">
          <InfoCircle />
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Input placeholder="Ada Lovelace" />
        <InputGroup.Addon align="block-start">
          <InputGroup.Text>Full name</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Input placeholder="0.00" />
        <InputGroup.Addon align="block-end">
          <InputGroup.Text>Amount in USD</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup>
    </div>
  );
}

export function InputGroupTextDemo() {
  const [post, setPost] = useState('');
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup columns>
          <PhoneAmountRow />
          <PhoneWebsiteRow />
          <Field row label="Email">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} placeholder="name" inputMode="email" autoCapitalize="none" spellCheck={false} />
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Text>@plexui.com</InputGroup.Text>
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
        <FieldGroup columns>
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

export function InputGroupSpinnerDemo() {
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneRowsStage>
        <FieldGroup>
          <Field row label="Library">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} defaultValue="Searching..." readOnly />
                <InputGroup.Addon align="inline-end">
                  <LoadingIndicator />
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
          <Field row label="Changes">
            {(control) => (
              <InputGroup>
                <InputGroup.Input {...control} defaultValue="Saving..." readOnly />
                <InputGroup.Addon align="inline-end">
                  <LoadingIndicator />
                </InputGroup.Addon>
              </InputGroup>
            )}
          </Field>
        </FieldGroup>
      </PhoneRowsStage>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 w-[320px]">
      <InputGroup>
        <InputGroup.Input defaultValue="Searching..." readOnly />
        <InputGroup.Addon align="inline-end">
          <LoadingIndicator />
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Input defaultValue="Processing..." readOnly />
        <InputGroup.Addon>
          <LoadingIndicator />
        </InputGroup.Addon>
      </InputGroup>
      <InputGroup>
        <InputGroup.Input defaultValue="Saving changes" readOnly />
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>Saving...</InputGroup.Text>
          <LoadingIndicator />
        </InputGroup.Addon>
      </InputGroup>
    </div>
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
