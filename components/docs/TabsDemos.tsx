'use client';

import React, { useId, useState } from 'react';
import {
  Bell,
  Home,
  SettingsCog,
} from '@plexui/ui/components/Icon';
import { Tabs } from '@plexui/ui/components/Tabs';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';

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

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const VARIANT_OPTIONS = ['segmented', 'underline'] as const;
const ORIENTATION_OPTIONS = ['horizontal', 'vertical'] as const;

// ─── Overview demo with all controls ───
export function TabsOverviewDemo() {
  const [tab, setTab] = useState('overview');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('horizontal');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(true);
  const [flush, setFlush] = useState(false);
  const [block, setBlock] = useState(false);
  const [disabled, setDisabled] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="orientation">
          <SegmentedControl value={orientation} onChange={setOrientation} size="xs" aria-label="orientation">
            {ORIENTATION_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>{o}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
        <DemoControlBoolean name="flush" value={flush} onChange={setFlush} />
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant={variant}
          orientation={orientation}
          size={size}
          pill={pill}
          flush={flush}
          block={block}
          disabled={disabled}
          aria-label="Demo tabs"
        >
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="reports">Reports</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Underline horizontal ───
export function TabsUnderlineDemo() {
  const [tab, setTab] = useState('overview');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant="underline"
          size={size}
          aria-label="Sections"
        >
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="reports">Reports</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Underline flush ───
export function TabsUnderlineFlushDemo() {
  const [tab, setTab] = useState('overview');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant="underline"
          flush
          size={size}
          aria-label="Sections"
        >
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="reports">Reports</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Underline block ───
export function TabsUnderlineBlockDemo() {
  const [tab, setTab] = useState('overview');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant="underline"
          block
          size={size}
          aria-label="Sections"
        >
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="reports">Reports</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Underline with icons ───
export function TabsUnderlineIconsDemo() {
  const [tab, setTab] = useState('home');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant="underline"
          size={size}
          aria-label="Navigation"
        >
          <Tabs.Tab value="home" icon={<Home />}>Home</Tabs.Tab>
          <Tabs.Tab value="settings" icon={<SettingsCog />}>Settings</Tabs.Tab>
          <Tabs.Tab value="notifications" icon={<Bell />}>Notifications</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Segmented with icons ───
export function TabsSegmentedIconsDemo() {
  const [tab, setTab] = useState('home');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          size={size}
          pill={pill}
          aria-label="Navigation"
        >
          <Tabs.Tab value="home" icon={<Home />}>Home</Tabs.Tab>
          <Tabs.Tab value="settings" icon={<SettingsCog />}>Settings</Tabs.Tab>
          <Tabs.Tab value="notifications" icon={<Bell />}>Notifications</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Icon only ───
export function TabsIconOnlyDemo() {
  const [tab, setTab] = useState('home');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        {variant === 'segmented' && (
          <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
        )}
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant={variant}
          size={size}
          pill={pill}
          aria-label="Navigation"
        >
          <Tabs.Tab value="home" icon={<Home />} aria-label="Home" />
          <Tabs.Tab value="settings" icon={<SettingsCog />} aria-label="Settings" />
          <Tabs.Tab value="notifications" icon={<Bell />} aria-label="Notifications" />
        </Tabs>
      </div>
    </>
  );
}

// ─── Segmented with badge ───
export function TabsSegmentedBadgeDemo() {
  const [tab, setTab] = useState('all');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(true);
  const [badgePill, setBadgePill] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
        <DemoControlBoolean name="badgePill" value={badgePill} onChange={setBadgePill} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          size={size}
          pill={pill}
          aria-label="Filter"
        >
          <Tabs.Tab value="all" badge={{ content: 128, pill: badgePill }}>All</Tabs.Tab>
          <Tabs.Tab value="unread" badge={{ content: 12, color: "info", pill: badgePill }}>Unread</Tabs.Tab>
          <Tabs.Tab value="flagged" badge={{ content: 3, color: "danger", pill: badgePill }}>Flagged</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Underline with badge ───
export function TabsUnderlineBadgeDemo() {
  const [tab, setTab] = useState('all');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [badgePill, setBadgePill] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="badgePill" value={badgePill} onChange={setBadgePill} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant="underline"
          size={size}
          aria-label="Filter"
        >
          <Tabs.Tab value="all" badge={{ content: 128, pill: badgePill }}>All</Tabs.Tab>
          <Tabs.Tab value="unread" badge={{ content: 12, color: "info", pill: badgePill }}>Unread</Tabs.Tab>
          <Tabs.Tab value="flagged" badge={{ content: 3, color: "danger", pill: badgePill }}>Flagged</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Vertical segmented ───
export function TabsVerticalSegmentedDemo() {
  const [tab, setTab] = useState('account');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          orientation="vertical"
          size={size}
          aria-label="Settings"
        >
          <Tabs.Tab value="account">Account</Tabs.Tab>
          <Tabs.Tab value="password">Password</Tabs.Tab>
          <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
          <Tabs.Tab value="display">Display</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Vertical underline ───
export function TabsVerticalUnderlineDemo() {
  const [tab, setTab] = useState('account');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant="underline"
          orientation="vertical"
          size={size}
          aria-label="Settings"
        >
          <Tabs.Tab value="account">Account</Tabs.Tab>
          <Tabs.Tab value="password">Password</Tabs.Tab>
          <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
          <Tabs.Tab value="display">Display</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Vertical underline with icons ───
export function TabsVerticalUnderlineIconsDemo() {
  const [tab, setTab] = useState('home');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant="underline"
          orientation="vertical"
          size={size}
          aria-label="Navigation"
        >
          <Tabs.Tab value="home" icon={<Home />}>Home</Tabs.Tab>
          <Tabs.Tab value="settings" icon={<SettingsCog />}>Settings</Tabs.Tab>
          <Tabs.Tab value="notifications" icon={<Bell />}>Notifications</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Disabled tab ───
export function TabsDisabledDemo() {
  const [tab, setTab] = useState('overview');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('underline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant={variant}
          size={size}
          aria-label="Sections"
        >
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="reports" disabled>Reports</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Sizing demo with interactive controls ───
export function TabsSizingDemo() {
  const [tab, setTab] = useState('overview');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('underline');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <Tabs
          value={tab}
          onChange={setTab}
          variant={variant}
          size={size}
          aria-label="Demo tabs"
        >
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="reports">Reports</Tabs.Tab>
        </Tabs>
      </div>
    </>
  );
}

// ─── Scrollable ───
export function TabsScrollableDemo() {
  const [tab, setTab] = useState('1');
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant">
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size">
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <div className="max-w-[400px] flex">
          <Tabs
            value={tab}
            onChange={setTab}
            variant={variant}
            size={size}
            aria-label="Scrollable tabs"
          >
            <Tabs.Tab value="1">Overview</Tabs.Tab>
            <Tabs.Tab value="2">Analytics</Tabs.Tab>
            <Tabs.Tab value="3">Reports</Tabs.Tab>
            <Tabs.Tab value="4">Settings</Tabs.Tab>
            <Tabs.Tab value="5">Members</Tabs.Tab>
            <Tabs.Tab value="6">Billing</Tabs.Tab>
            <Tabs.Tab value="7">Security</Tabs.Tab>
            <Tabs.Tab value="8">Integrations</Tabs.Tab>
          </Tabs>
        </div>
      </div>
    </>
  );
}

const OVERFLOW_WIDTHS = ['240', '360', '560'] as const;

export function TabsOverflowMenuDemo() {
  const [tab, setTab] = useState('code');
  const [width, setWidth] = useState<(typeof OVERFLOW_WIDTHS)[number]>('360');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="container width">
          <SegmentedControl value={width} onChange={setWidth} size="xs" aria-label="container width">
            {OVERFLOW_WIDTHS.map((w) => (
              <SegmentedControl.Option key={w} value={w}>{w}px</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <div className="flex" style={{ width: Number(width) }}>
          <Tabs value={tab} onChange={setTab} variant="underline" overflow="menu" aria-label="Repository">
            <Tabs.Tab value="code">Code</Tabs.Tab>
            <Tabs.Tab value="issues" badge={12}>Issues</Tabs.Tab>
            <Tabs.Tab value="pulls" badge={3}>Pull requests</Tabs.Tab>
            <Tabs.Tab value="actions">Actions</Tabs.Tab>
            <Tabs.Tab value="projects">Projects</Tabs.Tab>
            <Tabs.Tab value="insights">Insights</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
          </Tabs>
        </div>
      </div>
    </>
  );
}

