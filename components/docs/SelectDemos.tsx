'use client';

import React, { useState, type ReactNode } from 'react';
import { Plus, SettingsSlider, User, UserLock, Workspace } from '@plexui/ui/components/Icon';
import { Select } from '@plexui/ui/components/Select';
import { Popover } from '@plexui/ui/components/Popover';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';
import { Button } from '@plexui/ui/components/Button';

const fruitsOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Grapes', value: 'grapes' },
  { label: 'Mango', value: 'mango' },
  { label: 'Pineapple', value: 'pineapple' },
  { label: 'Watermelon', value: 'watermelon' },
];

const items = [
  { label: 'List item 1', value: '1' },
  { label: 'List item 2', value: '2' },
  { label: 'List item 3', value: '3', disabled: true },
  { label: 'List item 4', value: '4' },
  { label: 'List item 5', value: '5' },
  { label: 'List item 6', value: '6' },
  { label: 'List item 7', value: '7' },
  { label: 'List item 8', value: '8' },
];

const groupedItems = [
  {
    label: 'Plans',
    options: [
      {
        label: 'Enterprise Plus',
        value: '1',
        tooltip: {
          content: 'Advanced features with priority support and SLA',
          maxWidth: 248,
        },
      },
      {
        label: 'Enterprise',
        value: '1o',
        tooltip: {
          content: 'Full-featured plan for large organizations',
          maxWidth: 248,
        },
      },
      { label: 'Professional Plus', value: '2' },
      { label: 'Professional', value: '3' },
      { label: 'Basic Plus', value: '4' },
      { label: 'Basic', value: '5' },
      { label: 'Starter', value: '6' },
      { label: 'Free', value: '7' },
      { label: 'Team Advanced', value: '4a' },
      { label: 'Team Standard', value: '4b' },
      { label: 'Team Basic', value: '4c' },
      { label: 'Business Premium', value: '4d' },
      { label: 'Business Standard', value: '4e' },
      { label: 'Business Lite', value: '4f' },
      { label: 'Individual Pro', value: '4g' },
      { label: 'Individual', value: '4h' },
      { label: 'Premium Legacy', value: '4omega' },
      { label: 'Standard Legacy', value: '4ultra' },
    ],
    optionsLimit: {
      limit: 7,
      label: 'Show all',
    },
  },
  {
    label: 'Custom Deployments',
    options: [
      { label: 'Production US-East (v2.4.1)', value: 'ft1' },
      { label: 'Production EU-West (v2.4.0)', value: 'ft2' },
      { label: 'Staging US-West (v2.5.0-rc1)', value: 'ft3' },
      { label: 'Development (latest)', value: 'ft4' },
      { label: 'QA Environment (v2.4.1)', value: 'ft5' },
    ],
    optionsLimit: {
      limit: 100,
      label: 'Show all',
    },
  },
];

const RoleOptionDescription = ({ children }: { children: ReactNode }) => (
  <div className="font-normal text-secondary py-px text-[0.935em] leading-[1.45]">{children}</div>
);

type Role = {
  value: string;
  label: string;
  description: ReactNode;
};

const roles: Role[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: (
      <RoleOptionDescription>
        Can modify project information and manage project members
      </RoleOptionDescription>
    ),
  },
  {
    value: 'reader',
    label: 'Reader',
    description: (
      <RoleOptionDescription>
        Can make API requests that read or modify data
      </RoleOptionDescription>
    ),
  },
];

const SELECT_VARIANT_OPTIONS = ['outline', 'soft', 'ghost'] as const;
const SELECT_SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;
const CHECK_POSITION_OPTIONS = ['start', 'end'] as const;

const selectControlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',
  width: '100%',
};

const selectControlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const selectControlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function SelectDemoControlRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={selectControlRowStyle}>
      <span style={selectControlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

export function SelectBaseDemo() {
  const [variant, setVariant] = useState<(typeof SELECT_VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SELECT_SIZE_OPTIONS)[number]>('md');
  const [clearable, setClearable] = useState(false);
  const [checkPosition, setCheckPosition] = useState<(typeof CHECK_POSITION_OPTIONS)[number]>('start');
  const [multiple, setMultiple] = useState(false);

  const [singleFruit, setSingleFruit] = useState<string>('');
  const [multiFruits, setMultiFruits] = useState<string[]>([]);

  return (
    <>
      <div data-demo-controls style={selectControlsTableStyle}>
        <SelectDemoControlRow name="variant">
          <SegmentedControl<(typeof SELECT_VARIANT_OPTIONS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {SELECT_VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </SelectDemoControlRow>
        <SelectDemoControlRow name="size">
          <SegmentedControl<(typeof SELECT_SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SELECT_SIZE_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </SelectDemoControlRow>
        <SelectDemoControlRow name="checkPosition">
          <SegmentedControl<(typeof CHECK_POSITION_OPTIONS)[number]>
            value={checkPosition}
            onChange={setCheckPosition}
            aria-label="checkPosition"
            size="xs"
          >
            {CHECK_POSITION_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </SelectDemoControlRow>
        <SelectDemoControlRow name="clearable">
          <Switch checked={clearable} onCheckedChange={setClearable} aria-label="clearable" />
        </SelectDemoControlRow>
        <SelectDemoControlRow name="multiple">
          <Switch checked={multiple} onCheckedChange={setMultiple} aria-label="multiple" />
        </SelectDemoControlRow>
      </div>
      <div
        data-demo-stage
        className="flex-1 w-full py-12 flex items-center justify-center"
      >
        <div style={{ width: 200 }}>
          {multiple ? (
            <Select
              key="multi"
              placeholder="Select fruits..."
              options={fruitsOptions}
              name="fruits"
              multiple
              variant={variant}
              size={size}
              clearable={clearable}
              checkPosition={checkPosition}
              value={multiFruits}
              onChange={(values) => setMultiFruits(values.map(({ value }) => value))}
              TriggerView={MultiFruitTriggerView}
            />
          ) : (
            <Select
              key="single"
              placeholder="Select a fruit..."
              options={fruitsOptions}
              name="fruits"
              multiple={false}
              variant={variant}
              size={size}
              clearable={clearable}
              checkPosition={checkPosition}
              value={singleFruit}
              onChange={(params) => setSingleFruit(params.value)}
            />
          )}
        </div>
      </div>
    </>
  );
}

export function SelectCustomViewsDemo() {
  const [role, setRole] = useState<string>('reader');
  const [variant, setVariant] = useState<(typeof SELECT_VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SELECT_SIZE_OPTIONS)[number]>('md');
  const [checkPosition, setCheckPosition] = useState<(typeof CHECK_POSITION_OPTIONS)[number]>('start');
  const [showIcon, setShowIcon] = useState(true);

  return (
    <>
      <div data-demo-controls style={selectControlsTableStyle}>
        <SelectDemoControlRow name="variant">
          <SegmentedControl<(typeof SELECT_VARIANT_OPTIONS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {SELECT_VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </SelectDemoControlRow>
        <SelectDemoControlRow name="size">
          <SegmentedControl<(typeof SELECT_SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SELECT_SIZE_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </SelectDemoControlRow>
        <SelectDemoControlRow name="checkPosition">
          <SegmentedControl<(typeof CHECK_POSITION_OPTIONS)[number]>
            value={checkPosition}
            onChange={setCheckPosition}
            aria-label="checkPosition"
            size="xs"
          >
            {CHECK_POSITION_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </SelectDemoControlRow>
        <SelectDemoControlRow name="triggerIcon">
          <Switch checked={showIcon} onCheckedChange={setShowIcon} aria-label="triggerIcon" />
        </SelectDemoControlRow>
      </div>
      <div data-demo-stage className="flex-1 w-full py-12 flex items-center justify-center">
        <div style={{ width: 220 }}>
          <Select
            value={role}
            options={roles}
            placeholder="Select role..."
            align="start"
            listMinWidth={260}
            variant={variant}
            size={size}
            checkPosition={checkPosition}
            onChange={({ value }) => setRole(value)}
            TriggerStartIcon={showIcon ? (role === 'owner' ? UserLock : User) : undefined}
          />
        </div>
      </div>
    </>
  );
}

export function SelectActionsDemo() {
  const [value, setValue] = useState<string>('');

  return (
    <div style={{ width: 150 }}>
      <Select
        variant="soft"
        value={value}
        block
        options={items}
        placeholder="Select..."
        align="start"
        listMinWidth={240}
        onChange={(v) => setValue(v.value)}
        actions={[
          { id: 'create', label: 'Create project', Icon: Plus, onSelect: () => {} },
          { id: 'overview', label: 'Organization overview', Icon: Workspace, onSelect: () => {} },
        ]}
      />
    </div>
  );
}

export function SelectGroupedOptionsDemo() {
  const [value, setValue] = useState<string>('1');

  return (
    <div style={{ width: 200 }}>
      <Select
        variant="outline"
        value={value}
        side="bottom"
        size="lg"
        options={groupedItems}
        listMinWidth={300}
        searchPlaceholder="Select an option..."
        clearable
        onChange={(v) => setValue(v.value)}
      />
    </div>
  );
}

function MultiFruitTriggerView({
  values,
  selectedAll,
}: {
  values: { label: string }[];
  selectedAll: boolean;
}) {
  const displayValue = selectedAll
    ? 'All fruits'
    : values.length === 1
      ? values[0].label
      : `${values.length} fruits`;

  return <>{displayValue}</>;
}

export function SelectMultiSelectDemo() {
  const [fruits, setFruits] = useState<string[]>([]);

  return (
    <div style={{ width: 200 }}>
      <Select
        variant="soft"
        placeholder="Select fruits..."
        options={fruitsOptions}
        name="fruits"
        multiple
        clearable
        value={fruits}
        onChange={(values) => setFruits(values.map(({ value }) => value))}
        TriggerView={MultiFruitTriggerView}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column configuration demo (Popover + Switch)
// ---------------------------------------------------------------------------

const ALL_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'created', label: 'Created at' },
  { id: 'lastLogin', label: 'Last login' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'phone', label: 'Phone' },
];

const DEFAULT_SHOWN_COLUMNS = ['name', 'email', 'role', 'status'];

export function SelectColumnConfigDemo() {
  const [shown, setShown] = useState<string[]>(DEFAULT_SHOWN_COLUMNS);

  const toggle = (id: string) => {
    setShown((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const shownColumns = ALL_COLUMNS.filter((c) => shown.includes(c.id));
  const hiddenColumns = ALL_COLUMNS.filter((c) => !shown.includes(c.id));

  return (
    <Popover>
      <Popover.Trigger>
        <Button color="secondary" variant="outline" size="sm">
          <SettingsSlider width={15} height={15} /> Columns
        </Button>
      </Popover.Trigger>
      <Popover.Content minWidth={240} side="bottom" align="start">
        <div className="py-1.5">
          {shownColumns.length > 0 && (
            <div>
              {shownColumns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer hover:bg-alpha/5"
                  onClick={() => toggle(col.id)}
                >
                  <span className="text-sm">{col.label}</span>
                  <Switch checked />
                </div>
              ))}
            </div>
          )}
          {hiddenColumns.length > 0 && (
            <div>
              {hiddenColumns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer hover:bg-alpha/5"
                  onClick={() => toggle(col.id)}
                >
                  <span className="text-sm text-tertiary">{col.label}</span>
                  <Switch checked={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
