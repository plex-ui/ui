'use client';

import { useState } from 'react';
import { InputGroup } from '@plexui/ui/components/InputGroup';
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
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <SegmentedRow name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
        <SegmentedRow name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
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
    </>
  );
}

export function InputGroupVariantsDemo() {
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
  const controls = (
    <div data-demo-controls style={controlsTableStyle}>
      <SegmentedRow name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
      <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
    </div>
  );
  return { args: { size, pill }, controls };
}

export function InputGroupButtonDemo() {
  const { args, controls } = useSizePill();
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
  const { args, controls } = useSizePill();
  const [weightUnit, setWeightUnit] = useState<(typeof WEIGHT_UNITS)[number]['value']>('kg');
  const [lengthUnit, setLengthUnit] = useState<(typeof LENGTH_UNITS)[number]['value']>('cm');
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
  return (
    <div className="w-[400px]">
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
