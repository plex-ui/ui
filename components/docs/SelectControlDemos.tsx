'use client';

import React, { type ComponentType, type SVGProps } from 'react';
import { useId, useState } from 'react';
import { Cabinet, CalendarAlt, User, Tools } from '@plexui/ui/components/Icon';
import { Menu } from '@plexui/ui/components/Menu';
import { SelectControl } from '@plexui/ui/components/SelectControl';
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

const StartIcon = CalendarAlt as ComponentType<SVGProps<SVGSVGElement>>;
const CabinetIcon = Cabinet as ComponentType<SVGProps<SVGSVGElement>>;
const ToolsIcon = Tools as ComponentType<SVGProps<SVGSVGElement>>;
const UserIcon = User as ComponentType<SVGProps<SVGSVGElement>>;
const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const VARIANT_OPTIONS = ['soft', 'outline', 'ghost'] as const;
const DROPDOWN_ICON_OPTIONS = ['chevronDown', 'dropdown', 'none'] as const;

export function SelectControlStartIconDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <SelectControl className="w-[200px]" StartIcon={StartIcon}>
        Select date...
      </SelectControl>
    </div>
  );
}

export function SelectControlBaseDemo() {
  const [value, setValue] = useState('');
  const placeholder = 'Select date...';
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Menu>
        <Menu.Trigger>
          <SelectControl
            className="w-[200px]"
            selected={!!value}
            onClearClick={() => setValue('')}
            StartIcon={StartIcon}
          >
            {value || placeholder}
          </SelectControl>
        </Menu.Trigger>
        <Menu.Content minWidth={200} width={200}>
          <Menu.RadioGroup value={value} onChange={setValue}>
            <Menu.RadioItem value="Today">Today</Menu.RadioItem>
            <Menu.RadioItem value="Last week">Last week</Menu.RadioItem>
            <Menu.RadioItem value="Last month">Last month</Menu.RadioItem>
            <Menu.RadioItem value="Last 3 months">Last 3 months</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu>
    </div>
  );
}

export function SelectControlVariantsDemo() {
  const [invalid, setInvalid] = useState(false);
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[400px]">
          <RowMatrix
            rowLabels={VARIANT_OPTIONS}
            renderRow={(row) => (
              <SelectControl
                className="w-full"
                variant={VARIANT_OPTIONS[row]}
                selected
                StartIcon={CabinetIcon}
                onClearClick={() => { }}
                invalid={invalid}
                disabled={disabled}
              >
                Sample value
              </SelectControl>
            )}
          />
        </div>
      </div>
    </>
  );
}

export function SelectControlClearableDemo() {
  const [value, setValue] = useState('Selected value');
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <SelectControl
        className="w-[200px]"
        selected
        onClearClick={() => setValue('')}
        StartIcon={StartIcon}
      >
        {value || 'Select...'}
      </SelectControl>
    </div>
  );
}

export function SelectControlSizingDemo() {
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('outline');
  const args = { size, pill, variant, className: 'w-[200px]' };
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
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
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
        <div className="flex flex-col gap-2 justify-start items-start w-[240px]">
          <SelectControl {...args} dropdownIconType="none">
            Select...
          </SelectControl>
          <SelectControl {...args} loading>
            Select...
          </SelectControl>
          <SelectControl {...args}>
            Select...
          </SelectControl>
          <SelectControl {...args} StartIcon={ToolsIcon} dropdownIconType="none">
            Tool calls
          </SelectControl>
          <SelectControl
            {...args}
            onClearClick={() => { }}
            selected
            StartIcon={ToolsIcon}
            dropdownIconType="none"
          >
            With tool calls
          </SelectControl>
          <SelectControl
            {...args}
            onClearClick={() => { }}
            selected
            StartIcon={StartIcon}
            dropdownIconType="chevronDown"
          >
            Today
          </SelectControl>
          <SelectControl {...args} onClearClick={() => { }} selected StartIcon={StartIcon}>
            Today
          </SelectControl>
        </div>
      </div>
    </>
  );
}

export function SelectControlSelectedDemo() {
  const [selected, setSelected] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="selected" value={selected} onChange={setSelected} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col gap-2 justify-center items-center py-10 w-full">
        <SelectControl className="w-[200px]" selected={selected}>
          Select...
        </SelectControl>
      </div>
    </>
  );
}

export function SelectControlDropdownIconDemo() {
  const [dropdownIconType, setDropdownIconType] = useState<(typeof DROPDOWN_ICON_OPTIONS)[number]>('dropdown');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="dropdownIconType">
          <SegmentedControl<(typeof DROPDOWN_ICON_OPTIONS)[number]>
            value={dropdownIconType}
            onChange={setDropdownIconType}
            aria-label="dropdownIconType"
            size="xs"
          >
            {DROPDOWN_ICON_OPTIONS.map((d) => (
              <SegmentedControl.Option key={d} value={d}>
                {d}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <SelectControl
          className="w-[200px]"
          selected
          dropdownIconType={dropdownIconType}
          StartIcon={StartIcon}
        >
          Select date...
        </SelectControl>
      </div>
    </>
  );
}

export function SelectControlLoadingDemo() {
  const [loading, setLoading] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <SelectControl className="w-[200px]" selected loading={loading} StartIcon={StartIcon}>
          Loading...
        </SelectControl>
      </div>
    </>
  );
}

export function SelectControlInvalidDemo() {
  const [invalid, setInvalid] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <SelectControl className="w-[200px]" invalid={invalid} selected>
          Pineapple on pizza
        </SelectControl>
      </div>
    </>
  );
}

export function SelectControlDisabledDemo() {
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <SelectControl className="w-[200px]" disabled={disabled} selected StartIcon={UserIcon}>
          Reader
        </SelectControl>
      </div>
    </>
  );
}

export function SelectControlBlockDemo() {
  const [block, setBlock] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
      </div>
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-[290px] text-center p-2 border border-dashed border-alpha/20 rounded-md">
          <SelectControl size="lg" block={block} StartIcon={StartIcon}>
            Select...
          </SelectControl>
        </div>
      </div>
    </>
  );
}

export function SelectControlOpticalAlignmentDemo() {
  const [opticallyAlign, setOpticallyAlign] = useState<'start' | 'end'>('start');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="opticallyAlign">
          <SegmentedControl<'start' | 'end'>
            value={opticallyAlign}
            onChange={setOpticallyAlign}
            aria-label="opticallyAlign"
            size="xs"
          >
            <SegmentedControl.Option value="start">start</SegmentedControl.Option>
            <SegmentedControl.Option value="end">end</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 flex flex-col gap-2 justify-center items-center py-10 w-full">
        <div className="flex flex-col gap-3 w-[280px]">
          <div className="border border-dashed border-alpha/20 rounded-md py-4 px-6">
            <div className="mb-2 text-secondary text-sm">Default</div>
            <SelectControl className="w-full" selected variant="ghost">
              Ghost control
            </SelectControl>
          </div>
          <div className="border border-dashed border-alpha/20 rounded-md py-4 px-6">
            <div className="mb-2 text-secondary text-sm">
              opticallyAlign=&quot;{opticallyAlign}&quot;
            </div>
            <SelectControl
              className="w-full"
              selected
              variant="ghost"
              opticallyAlign={opticallyAlign}
            >
              Ghost control
            </SelectControl>
          </div>
        </div>
      </div>
    </>
  );
}

function RowMatrix({
  rowLabels,
  renderRow,
}: {
  rowLabels: Readonly<string[]>;
  renderRow: (rowIndex: number) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {rowLabels.map((row, rowIndex) => (
        <div key={row} className="flex items-center">
          <div className="text-right text-sm mr-8 min-w-[4rem]" style={{ color: 'var(--color-text-tertiary)' }}>{row}</div>
          <div className="flex-1">{renderRow(rowIndex)}</div>
        </div>
      ))}
    </div>
  );
}
