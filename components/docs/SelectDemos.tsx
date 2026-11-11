'use client';

import type React from 'react';
import { useState, type ReactNode } from 'react';
import { Plus, User, UserLock, Workspace } from '@plexui/ui/components/Icon';
import { Select } from '@plexui/ui/components/Select';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
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

// A phone row passes its descriptions as text: the list sets them as an iOS menu does its subtitles (13pt, wrapped)
const phoneRoles = [
  { value: 'owner', label: 'Owner', description: 'Can modify project information and manage project members' },
  { value: 'reader', label: 'Reader', description: 'Can make API requests that read or modify data' },
];

const SELECT_VARIANT_OPTIONS = ['outline', 'soft', 'ghost'] as const;
const SELECT_SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;
const CHECK_POSITION_OPTIONS = ['start', 'end'] as const;

const OVERVIEW_SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const DROPDOWN_ICON_OPTIONS = ['dropdown', 'chevronDown', 'none'] as const;
const OVERVIEW_CHECK_POSITION_OPTIONS = ['start', 'end', 'none'] as const;
const SIDE_OPTIONS = ['bottom', 'top'] as const;
// Only without block: a block list matches its trigger. `start` is the default there
const ALIGN_OPTIONS = ['start', 'center', 'end'] as const;
// `none`: no opticallyAlign, the trigger keeps its gutter. `end` only with block: a narrower trigger does not reach the
// field's end, so the setting would move nothing
const OPTICAL_ALIGN_OPTIONS = ['none', 'start', 'end'] as const;

/** `syncValue`: the value asked for, which the Phone view trades with the page when it shows another (`end` shows as
 * `start` on a phone, where the checkmark leads every row) */
function Segments<T extends string>({ name, options, value, onChange, desktopOnly = false, syncValue }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void; desktopOnly?: boolean; syncValue?: T }) {
  return (
    <DemoControlRow name={name} desktopOnly={desktopOnly} syncValue={syncValue}>
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

/** The Overview, with every setting of the select: Multiple selection, once an example of its own, is its `multiple`
 * (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»). The select is the Fruit field of
 * a 290px form. A setting shows only where it acts: a block list matches its field, so `align` is offered only when
 * the select is not block, and `opticallyAlign` offsets a ghost trigger by its gutter, `start` its text onto the label's
 * edge and `end`, with block, its indicator onto the field's end, so it is offered only for `ghost`, where there is no
 * frame to keep. On a phone the select is the value of a row, which sets its height, insets, type and
 * colors, and its list opens over the value as an iOS pop-up menu with the checkmark leading, so variant, size, pill,
 * block, the dropdown icon, side, align and optical alignment are desktop settings, and checkPosition is start or none; a clearable select unsets its value
 * with the list's None row. */
export function SelectOverviewDemo() {
  const phone = usePhoneRows();
  const [fruit, setFruit] = useState('');
  const [fruits, setFruits] = useState<string[]>([]);
  const [variant, setVariant] = useState<(typeof SELECT_VARIANT_OPTIONS)[number]>('outline');
  const [size, setSize] = useState<(typeof OVERVIEW_SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(false);
  const [block, setBlock] = useState(true);
  const [dropdownIconType, setDropdownIconType] = useState<(typeof DROPDOWN_ICON_OPTIONS)[number]>('dropdown');
  const [checkPosition, setCheckPosition] = useState<(typeof OVERVIEW_CHECK_POSITION_OPTIONS)[number]>('start');
  const [side, setSide] = useState<(typeof SIDE_OPTIONS)[number]>('bottom');
  const [align, setAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('start');
  const [opticallyAlign, setOpticallyAlign] = useState<(typeof OPTICAL_ALIGN_OPTIONS)[number]>('none');
  const [clearable, setClearable] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  // A narrower trigger does not reach the field's end: without block `end` moves nothing, so it is not offered and
  // shows as `none`; the choice comes back with block, as in the Vue demo
  const opticalAlignOptions = block ? OPTICAL_ALIGN_OPTIONS : OPTICAL_ALIGN_OPTIONS.filter((option) => option !== 'end');
  const shownOpticalAlign = !block && opticallyAlign === 'end' ? 'none' : opticallyAlign;
  // On a phone the checkmark leads every row: `end` is `start` there, and `none` still leaves it out
  const checkPositionOptions = phone ? OVERVIEW_CHECK_POSITION_OPTIONS.filter((option) => option !== 'end') : OVERVIEW_CHECK_POSITION_OPTIONS;
  const shownCheckPosition = phone && checkPosition === 'end' ? 'start' : checkPosition;
  const shared = { options: fruitsOptions, name: 'fruits', clearable, loading, disabled };
  // The desktop field's own settings; a phone row sets its look and opens its list over the value
  const look = phone
    ? { placeholder: 'None', block: false, align: 'end' as const, checkPosition: shownCheckPosition }
    : {
      placeholder: multiple ? 'Select fruits...' : 'Select a fruit...',
      variant,
      size,
      pill,
      block,
      dropdownIconType,
      checkPosition,
      side,
      align: block ? undefined : align,
      // Wider than the trigger, so align places the list against it; a block list takes the trigger's width
      listMinWidth: block ? undefined : 240,
      opticallyAlign: variant === 'ghost' && shownOpticalAlign !== 'none' ? shownOpticalAlign : undefined,
    };
  const select = multiple ? (
    <Select
      key="multi"
      {...shared}
      {...look}
      multiple
      value={fruits}
      onChange={(values) => setFruits(values.map(({ value }) => value))}
      TriggerView={MultiFruitTriggerView}
    />
  ) : (
    <Select
      key="single"
      {...shared}
      {...look}
      multiple={false}
      value={fruit}
      onChange={(option) => setFruit(option.value)}
    />
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={SELECT_VARIANT_OPTIONS} value={variant} onChange={setVariant} desktopOnly />
        <Segments name="size" options={OVERVIEW_SIZE_OPTIONS} value={size} onChange={setSize} desktopOnly />
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />
        <DemoControlBoolean name="block" value={block} onChange={setBlock} desktopOnly />
        <Segments name="dropdownIconType" options={DROPDOWN_ICON_OPTIONS} value={dropdownIconType} onChange={setDropdownIconType} desktopOnly />
        <Segments name="checkPosition" options={checkPositionOptions} value={shownCheckPosition} onChange={setCheckPosition} syncValue={checkPosition} />
        <Segments name="side" options={SIDE_OPTIONS} value={side} onChange={setSide} desktopOnly />
        {!block && <Segments name="align" options={ALIGN_OPTIONS} value={align} onChange={setAlign} desktopOnly />}
        {variant === 'ghost' && <Segments name="opticallyAlign" options={opticalAlignOptions} value={shownOpticalAlign} onChange={setOpticallyAlign} desktopOnly />}
        <DemoControlBoolean name="clearable" value={clearable} onChange={setClearable} />
        <DemoControlBoolean name="multiple" value={multiple} onChange={setMultiple} />
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      {phone ? (
        <PhoneSelectRow label={multiple ? 'Fruits' : 'Fruit'}>{select}</PhoneSelectRow>
      ) : (
        <div data-demo-stage className="flex-1 w-full py-12 flex items-center justify-center">
          <div className="w-[290px]">
            <Field label={multiple ? 'Fruits' : 'Fruit'}>{select}</Field>
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
        {/* On a phone the checkmark leads every row, as in iOS menus, whatever checkPosition says */}
        {!phone && (
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
        )}
        {!phone && <DemoControlBoolean name="triggerIcon" value={showIcon} onChange={setShowIcon} />}
      </div>
      {phone ? (
        <PhoneSelectRow label="Role">
          <Select
            value={role}
            options={phoneRoles}
            block={false}
            align="end"
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
        <Select value={value} block={false} options={items} placeholder="None" align="end" onChange={(v) => setValue(v.value)} actions={ACTIONS} />
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
        <Select value={value} block={false} align="end" options={groupedItems} searchPlaceholder="Select an option..." onChange={(v) => setValue(v.value)} />
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
