'use client';

import React, { type ComponentType, type SVGProps } from 'react';
import { useState } from 'react';
import { Cabinet, CalendarAlt, User, Tools } from '@plexui/ui/components/Icon';
import { Field, type FieldChildProps } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Menu } from '@plexui/ui/components/Menu';
import { SelectControl } from '@plexui/ui/components/SelectControl';

import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone a select control is the value of a row in a FieldGroup: the value and its up-down chevrons at the
// row's end, as in the Form Examples. The row sets its height, insets, type and colors, so the phone examples
// drop the desktop size, pill, variant, start icon, dropdown icon, block and optical alignment controls.
function PhoneControlRows({ children }: { children: React.ReactNode }) {
  return (
    <PhoneRowsStage>
      <FieldGroup>{children}</FieldGroup>
    </PhoneRowsStage>
  );
}

const PERIODS = ['Today', 'Last week', 'Last month', 'Last 3 months'];

// On a phone the row's props (id, label) reach the trigger, and None in the menu clears it, as iOS pop-ups do
function PeriodMenu({ value, onChange, phone, control }: { value: string; onChange: (value: string) => void; phone: boolean; control?: FieldChildProps }) {
  return (
    <Menu>
      <Menu.Trigger>
        <SelectControl
          {...control}
          className={phone ? undefined : 'w-[200px]'}
          selected={!!value}
          onClearClick={phone ? undefined : () => onChange('')}
          StartIcon={phone ? undefined : StartIcon}
        >
          {value || (phone ? 'None' : 'Select date...')}
        </SelectControl>
      </Menu.Trigger>
      <Menu.Content minWidth={200} width={phone ? undefined : 200} align={phone ? 'end' : undefined}>
        <Menu.RadioGroup value={value} onChange={onChange}>
          {phone && <Menu.RadioItem value="">None</Menu.RadioItem>}
          {PERIODS.map((period) => (
            <Menu.RadioItem key={period} value={period}>{period}</Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu>
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
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneControlRows>
        <Field row label="Date">
          <SelectControl>None</SelectControl>
        </Field>
      </PhoneControlRows>
    );
  }
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
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneControlRows>
        <Field row label="Period">
          {(control) => <PeriodMenu value={value} onChange={setValue} phone control={control} />}
        </Field>
      </PhoneControlRows>
    );
  }
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <PeriodMenu value={value} onChange={setValue} phone={false} />
    </div>
  );
}

export function SelectControlVariantsDemo() {
  const [invalid, setInvalid] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneControlRows>
          <Field row label="Folder" errorMessage={invalid ? 'Choose a folder you can edit.' : undefined}>
            <SelectControl selected invalid={invalid} disabled={disabled}>
              Sample value
            </SelectControl>
          </Field>
        </PhoneControlRows>
      ) : (
      <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
        <div className="w-full min-w-0 max-w-[400px]">
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
      )}
    </>
  );
}

export function SelectControlClearableDemo() {
  const [value, setValue] = useState('Today');
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneControlRows>
        <Field row label="Date">
          <SelectControl selected={!!value} onClearClick={() => setValue('')}>
            {value || 'None'}
          </SelectControl>
        </Field>
      </PhoneControlRows>
    );
  }
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
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneControlRows>
        <Field row label="Model">
          <SelectControl>None</SelectControl>
        </Field>
        <Field row label="Tools">
          <SelectControl loading>Loading...</SelectControl>
        </Field>
        <Field row label="Date">
          <SelectControl selected>Today</SelectControl>
        </Field>
      </PhoneControlRows>
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
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="selected" value={selected} onChange={setSelected} />
      </div>
      {phone ? (
        <PhoneControlRows>
          <Field row label="Fruit">
            <SelectControl selected={selected}>Mango</SelectControl>
          </Field>
        </PhoneControlRows>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col gap-2 justify-center items-center py-10 w-full">
          <SelectControl className="w-[200px]" selected={selected}>
            Select...
          </SelectControl>
        </div>
      )}
    </>
  );
}

export function SelectControlDropdownIconDemo() {
  const [dropdownIconType, setDropdownIconType] = useState<(typeof DROPDOWN_ICON_OPTIONS)[number]>('dropdown');
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneControlRows>
        <Field row label="Date">
          <SelectControl selected>Today</SelectControl>
        </Field>
      </PhoneControlRows>
    );
  }
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
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
      </div>
      {phone ? (
        <PhoneControlRows>
          <Field row label="Calendar">
            <SelectControl selected loading={loading}>{loading ? 'Loading...' : 'Work'}</SelectControl>
          </Field>
        </PhoneControlRows>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <SelectControl className="w-[200px]" selected loading={loading} StartIcon={StartIcon}>
            Loading...
          </SelectControl>
        </div>
      )}
    </>
  );
}

export function SelectControlInvalidDemo() {
  const [invalid, setInvalid] = useState(true);
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      {phone ? (
        <PhoneControlRows>
          {/* A row is the control's frame, so the error is the line under it */}
          <Field row label="Topping" errorMessage={invalid ? 'Choose another topping.' : undefined}>
            <SelectControl invalid={invalid} selected>Pineapple</SelectControl>
          </Field>
        </PhoneControlRows>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <SelectControl className="w-[200px]" invalid={invalid} selected>
            Pineapple on pizza
          </SelectControl>
        </div>
      )}
    </>
  );
}

export function SelectControlDisabledDemo() {
  const [disabled, setDisabled] = useState(true);
  const phone = usePhoneRows();
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneControlRows>
          <Field row label="Role">
            <SelectControl disabled={disabled} selected>Reader</SelectControl>
          </Field>
        </PhoneControlRows>
      ) : (
        <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
          <SelectControl className="w-[200px]" disabled={disabled} selected StartIcon={UserIcon}>
            Reader
          </SelectControl>
        </div>
      )}
    </>
  );
}

export function SelectControlBlockDemo() {
  const [block, setBlock] = useState(true);
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneControlRows>
        <Field row label="Date">
          <SelectControl>None</SelectControl>
        </Field>
      </PhoneControlRows>
    );
  }
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
  const phone = usePhoneRows();
  if (phone) {
    return (
      <PhoneControlRows>
        <Field row label="Theme">
          <SelectControl selected>System</SelectControl>
        </Field>
      </PhoneControlRows>
    );
  }
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
          <div className="min-w-0 flex-1">{renderRow(rowIndex)}</div>
        </div>
      ))}
    </div>
  );
}
