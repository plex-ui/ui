'use client';

import type React from 'react';
import { useRef, useState, type ReactNode } from 'react';
import { Plus, SettingsSlider, User, UserLock, Workspace } from '@plexui/ui/components/Icon';
import { Select } from '@plexui/ui/components/Select';
import { Popover } from '@plexui/ui/components/Popover';
import { Dialog } from '@plexui/ui/components/Dialog';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';
import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, usePhoneRows } from './PhoneRows';

// On a phone a select is the value of a row in a FieldGroup, a pop-up button at the row's end, as in the
// Form Examples. The row sets its type and insets, so the phone examples drop the desktop variant and size controls.
function PhoneSelectRow({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <PhoneRowsStage>
      <FieldGroup>
        <Field row label={label}>{children}</Field>
      </FieldGroup>
    </PhoneRowsStage>
  );
}

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

export function SelectBaseDemo() {
  const [variant, setVariant] = useState<(typeof SELECT_VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SELECT_SIZE_OPTIONS)[number]>('md');
  const [clearable, setClearable] = useState(false);
  const [checkPosition, setCheckPosition] = useState<(typeof CHECK_POSITION_OPTIONS)[number]>('start');
  const [multiple, setMultiple] = useState(false);

  const [singleFruit, setSingleFruit] = useState<string>('');
  const [multiFruits, setMultiFruits] = useState<string[]>([]);
  const phone = usePhoneRows();

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && (<>
        <DemoControlRow name="variant">
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
        </DemoControlRow>
        <DemoControlRow name="size">
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
        </DemoControlRow>
        </>)}
        <DemoControlRow name="checkPosition">
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
        </DemoControlRow>
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        <DemoControlBoolean name="multiple" value={multiple} onChange={setMultiple} />
      </div>
      {phone ? (
        <PhoneSelectRow label={multiple ? 'Fruits' : 'Fruit'}>
          {multiple ? (
            <Select
              key="multi"
              placeholder="None"
              options={fruitsOptions}
              name="fruits"
              multiple
              block={false}
              align="end"
              clearable={clearable}
              checkPosition={checkPosition}
              value={multiFruits}
              onChange={(values) => setMultiFruits(values.map(({ value }) => value))}
              TriggerView={MultiFruitTriggerView}
            />
          ) : (
            <Select
              key="single"
              placeholder="None"
              options={fruitsOptions}
              name="fruits"
              multiple={false}
              block={false}
              align="end"
              clearable={clearable}
              checkPosition={checkPosition}
              value={singleFruit}
              onChange={(params) => setSingleFruit(params.value)}
            />
          )}
        </PhoneSelectRow>
      ) : (
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
      )}
    </>
  );
}

export function SelectCustomViewsDemo() {
  const [role, setRole] = useState<string>('reader');
  const [variant, setVariant] = useState<(typeof SELECT_VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof SELECT_SIZE_OPTIONS)[number]>('md');
  const [checkPosition, setCheckPosition] = useState<(typeof CHECK_POSITION_OPTIONS)[number]>('start');
  const [showIcon, setShowIcon] = useState(true);
  const phone = usePhoneRows();

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!phone && (<>
        <DemoControlRow name="variant">
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
        </DemoControlRow>
        <DemoControlRow name="size">
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
        </DemoControlRow>
        </>)}
        <DemoControlRow name="checkPosition">
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
        </DemoControlRow>
        {!phone && <DemoControlBoolean name="triggerIcon" value={showIcon} onChange={setShowIcon} />}
      </div>
      {phone ? (
        <PhoneSelectRow label="Role">
          <Select
            value={role}
            options={roles}
            block={false}
            align="end"
            listMinWidth={260}
            checkPosition={checkPosition}
            onChange={({ value }) => setRole(value)}
          />
        </PhoneSelectRow>
      ) : (
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
      )}
    </>
  );
}

const ACTIONS = [
  { id: 'create', label: 'Create project', Icon: Plus, onSelect: () => {} },
  { id: 'overview', label: 'Organization overview', Icon: Workspace, onSelect: () => {} },
];

export function SelectActionsDemo() {
  const [value, setValue] = useState<string>('');
  const phone = usePhoneRows();

  if (phone) {
    return (
      <PhoneSelectRow label="Project">
        <Select value={value} block={false} options={items} placeholder="None" align="end" listMinWidth={240} onChange={(v) => setValue(v.value)} actions={ACTIONS} />
      </PhoneSelectRow>
    );
  }
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
        actions={ACTIONS}
      />
    </div>
  );
}

export function SelectGroupedOptionsDemo() {
  const [value, setValue] = useState<string>('1');
  const phone = usePhoneRows();

  if (phone) {
    return (
      <PhoneSelectRow label="Plan">
        <Select value={value} block={false} align="end" options={groupedItems} listMinWidth={300} searchPlaceholder="Select an option..." onChange={(v) => setValue(v.value)} />
      </PhoneSelectRow>
    );
  }
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
  const phone = usePhoneRows();

  if (phone) {
    return (
      <PhoneSelectRow label="Fruits">
        <Select
          placeholder="None"
          options={fruitsOptions}
          name="fruits"
          multiple
          clearable
          block={false}
          align="end"
          value={fruits}
          onChange={(values) => setFruits(values.map(({ value }) => value))}
          TriggerView={MultiFruitTriggerView}
        />
      </PhoneSelectRow>
    );
  }
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
  const phone = usePhoneRows();
  const heading = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<string[]>(DEFAULT_SHOWN_COLUMNS);

  const toggle = (id: string) => {
    setShown((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const shownColumns = ALL_COLUMNS.filter((c) => shown.includes(c.id));
  const hiddenColumns = ALL_COLUMNS.filter((c) => !shown.includes(c.id));
  const trigger = (
    <Button color="secondary" variant="outline" size="sm">
      <SettingsSlider width={15} height={15} /> Columns
    </Button>
  );

  // A phone presents the panel as a sheet of switch rows in a fixed order: as in iOS settings,
  // a row stays in place when its switch changes
  if (phone) return (
    <Dialog>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content mobileVariant="sheet" onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
        <Dialog.Header>
          <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Columns</Dialog.Title></div>
        </Dialog.Header>
        <Dialog.Body>
          <FieldGroup>
            {ALL_COLUMNS.map((col) => (
              <Field row key={col.id} label={col.label}>
                <Switch color="accent" checked={shown.includes(col.id)} onCheckedChange={() => toggle(col.id)} />
              </Field>
            ))}
          </FieldGroup>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );

  return (
    <Popover>
      <Popover.Trigger>{trigger}</Popover.Trigger>
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
                  <Switch checked aria-label={col.label} />
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
                  <Switch checked={false} aria-label={col.label} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
