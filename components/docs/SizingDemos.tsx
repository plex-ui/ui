'use client';

import React, { useId, useState, type ComponentType, type SVGProps } from 'react';
import { DateTime } from 'luxon';
import { Button } from '@plexui/ui/components/Button';
import { Input } from '@plexui/ui/components/Input';
import { Select } from '@plexui/ui/components/Select';
import { DateRangePicker, type DateRange, type DateRangeShortcut } from '@plexui/ui/components/DateRangePicker';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';
import { SelectControl } from '@plexui/ui/components/SelectControl';
import { Menu } from '@plexui/ui/components/Menu';
import { ArrowRight, Delete, CompareArrows, Clear, Grid, Menu as MenuIcon, CalendarAlt } from '@plexui/ui/components/Icon';

const CalendarAltIcon = CalendarAlt as ComponentType<SVGProps<SVGSVGElement>>;

const dayShortcuts: DateRangeShortcut[] = [
  {
    label: 'Today',
    getDateRange: () => {
      const today = DateTime.local();
      return [today.startOf('day'), today.endOf('day')];
    },
  },
  {
    label: 'Last 7 days',
    getDateRange: () => {
      const today = DateTime.local().endOf('day');
      return [today.minus({ days: 6 }).startOf('day'), today];
    },
  },
  {
    label: 'Last 30 days',
    getDateRange: () => {
      const today = DateTime.local().endOf('day');
      return [today.minus({ days: 29 }).startOf('day'), today];
    },
  },
];

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-controls-bg, #ffffff)',
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
      <label htmlFor={controlId} style={controlLabelStyle}>
        {name}
      </label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={{ ...controlRowStyle, gap: 12 }}>
      <span style={{ ...controlLabelStyle, flexShrink: 0 }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', minWidth: 0 }}>{children}</div>
    </div>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
type ControlSize = (typeof SIZE_OPTIONS)[number];

const SIZE_HEIGHTS: Record<ControlSize, number> = {
  '3xs': 22,
  '2xs': 24,
  'xs': 26,
  'sm': 28,
  'md': 32,
  'lg': 36,
  'xl': 40,
  '2xl': 44,
  '3xl': 48,
};


export function SizingOverviewDemo() {
  const [size, setSize] = useState<ControlSize>('md');
  const [pill, setPill] = useState(true);
  const [segValue, setSegValue] = useState('all');
  const [iconSegValue, setIconSegValue] = useState('grid');
  const [selectValue, setSelectValue] = useState<string>('');
  const [inputValue, setInputValue] = useState('Clearable value');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <>
            <SegmentedControl<ControlSize>
              value={size}
              onChange={setSize}
              aria-label="Control size"
              size="xs"
            >
              {SIZE_OPTIONS.map((s) => (
                <SegmentedControl.Option key={s} value={s}>
                  {s}
                </SegmentedControl.Option>
              ))}
            </SegmentedControl>
          </>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div className="flex-1 flex flex-col gap-6 px-6 py-10 w-full" data-demo-stage>
        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button color="primary" size={size} pill={pill}>Submit</Button>
          <Button variant="soft" color="secondary" size={size} pill={pill}><CompareArrows /> Compare</Button>
          <Button color="danger" size={size} pill={pill}><Delete /></Button>
          <Button variant="outline" color="secondary" size={size} pill={pill}>Next <ArrowRight /></Button>
          <Button variant="ghost" color="secondary" size={size} pill={pill} uniform><Clear /></Button>
        </div>
        {/* SelectControl, Input, DateRangePicker */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Menu>
            <Menu.Trigger>
              <SelectControl
                selected={!!selectValue}
                onClearClick={() => setSelectValue('')}
                StartIcon={CalendarAltIcon}
                size={size}
                pill={pill}
              >
                {selectValue || 'Select date...'}
              </SelectControl>
            </Menu.Trigger>
            <Menu.Content minWidth={200} width={200}>
              <Menu.RadioGroup value={selectValue} onChange={setSelectValue}>
                <Menu.RadioItem value="Today">Today</Menu.RadioItem>
                <Menu.RadioItem value="Last week">Last week</Menu.RadioItem>
                <Menu.RadioItem value="Last month">Last month</Menu.RadioItem>
                <Menu.RadioItem value="Last 3 months">Last 3 months</Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu>
          <Input
            placeholder="Enter text..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onClear={() => setInputValue('')}
            size={size}
            pill={pill}
            className="w-[200px]"
          />
          <DateRangePicker
            value={dateRange}
            onChange={(next) => setDateRange(next as DateRange | null)}
            shortcuts={dayShortcuts}
            size={size}
            pill={pill}
            clearable
          />
        </div>
        {/* Segmented controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <SegmentedControl
            value={segValue}
            onChange={setSegValue}
            aria-label="View"
            size={size}
            pill={pill}
          >
            <SegmentedControl.Option value="all">All</SegmentedControl.Option>
            <SegmentedControl.Option value="active">Active</SegmentedControl.Option>
            <SegmentedControl.Option value="archived">Archived</SegmentedControl.Option>
          </SegmentedControl>
          <SegmentedControl
            value={iconSegValue}
            onChange={setIconSegValue}
            aria-label="Layout"
            size={size}
            pill={pill}
          >
            <SegmentedControl.Option value="grid" icon={<Grid />} aria-label="Grid view" />
            <SegmentedControl.Option value="list" icon={<MenuIcon />} aria-label="List view" />
          </SegmentedControl>
        </div>
      </div>
    </>
  );
}

export function SizingScaleDemo() {
  const [segValue, setSegValue] = useState('tab1');

  return (
    <div className="flex flex-col gap-6 w-full py-4 px-6" data-demo-stage>
      {SIZE_OPTIONS.map((size) => (
        <div key={size} className="flex items-center gap-4">
          <div className="w-20 flex-shrink-0 text-right">
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{size} ({SIZE_HEIGHTS[size]}px)</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button color="primary" size={size}>
              Button
            </Button>
            <Input placeholder="Input" size={size} className="w-[140px]" />
            <SegmentedControl value={segValue} onChange={setSegValue} aria-label="Tabs" size={size}>
              <SegmentedControl.Option value="tab1">Tab 1</SegmentedControl.Option>
              <SegmentedControl.Option value="tab2">Tab 2</SegmentedControl.Option>
            </SegmentedControl>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SizingFormDemo() {
  const [formSize, setFormSize] = useState<ControlSize>('lg');
  const [selectValue, setSelectValue] = useState<string>('');

  const roleOptions = [
    { label: 'Developer', value: 'developer' },
    { label: 'Designer', value: 'designer' },
    { label: 'Product Manager', value: 'pm' },
    { label: 'Engineering Manager', value: 'em' },
  ];

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="Form size">
          <SegmentedControl<ControlSize>
            value={formSize}
            onChange={setFormSize}
            aria-label="Form size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <div className="w-full max-w-[400px]">
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm mb-1 block text-secondary">Name</label>
              <Input placeholder="Jane Doe" size={formSize} />
            </div>
            <div>
              <label className="text-sm mb-1 block text-secondary">Email</label>
              <Input placeholder="jane@example.com" size={formSize} />
            </div>
            <div>
              <label className="text-sm mb-1 block text-secondary">Role</label>
              <Select
                value={selectValue}
                options={roleOptions}
                onChange={({ value }) => setSelectValue(value)}
                placeholder="Select role..."
                size={formSize}
                block
              />
            </div>
            <Button color="primary" size={formSize} block className="mt-2">
              Submit
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
