'use client';

import { useState, type ReactNode } from 'react';
import {
  Bell,
  Home,
  SettingsCog,
} from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, useDesktopOnlyState, usePhoneRows } from './PhoneRows';

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const VARIANT_OPTIONS = ['segmented', 'underline'] as const;
const ORIENTATION_OPTIONS = ['horizontal', 'vertical'] as const;

// On a phone the tabs stand on a grouped screen 16px from its edges, where horizontal tabs fill the row as
// every iOS 26 kit example does (370 of 402) and vertical tabs are a list card.
function TabsStage({ children }: { children: ReactNode }) {
  const phone = usePhoneRows();
  if (phone) return <PhoneRowsStage>{children}</PhoneRowsStage>;
  return (
    <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
      {children}
    </div>
  );
}

// ─── Overview demo with all controls ───
export function TabsOverviewDemo() {
  const [tab, setTab] = useState('overview');
  const [variant, setVariant, shownVariant] = useDesktopOnlyState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('horizontal');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill, shownPill] = useDesktopOnlyState(true);
  const [flush, setFlush, shownFlush] = useDesktopOnlyState(false);
  const [block, setBlock, shownBlock] = useDesktopOnlyState(false);
  const [disabled, setDisabled] = useState(false);
  const [reportsDisabled, setReportsDisabled] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant" desktopOnly>
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
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" desktopOnly value={pill} onChange={setPill} />
        <DemoControlBoolean name="flush" desktopOnly value={flush} onChange={setFlush} />
        <DemoControlBoolean name="block" desktopOnly value={block} onChange={setBlock} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="reportsDisabled" value={reportsDisabled} onChange={setReportsDisabled} />
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant={shownVariant}
          orientation={orientation}
          size={shownSize}
          pill={shownPill}
          flush={shownFlush}
          block={shownBlock}
          disabled={disabled}
          aria-label="Demo tabs"
        >
          <SegmentedControl.Option value="overview">Overview</SegmentedControl.Option>
          <SegmentedControl.Option value="analytics">Analytics</SegmentedControl.Option>
          <SegmentedControl.Option value="reports" disabled={reportsDisabled}>Reports</SegmentedControl.Option>
          <SegmentedControl.Option value="settings">Settings</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Underline horizontal ───
export function TabsUnderlineDemo() {
  const [tab, setTab] = useState('overview');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant="underline"
          size={shownSize}
          aria-label="Sections"
        >
          <SegmentedControl.Option value="overview">Overview</SegmentedControl.Option>
          <SegmentedControl.Option value="analytics">Analytics</SegmentedControl.Option>
          <SegmentedControl.Option value="reports">Reports</SegmentedControl.Option>
          <SegmentedControl.Option value="settings">Settings</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Underline flush ───
export function TabsUnderlineFlushDemo() {
  const [tab, setTab] = useState('overview');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant="underline"
          flush
          size={shownSize}
          aria-label="Sections"
        >
          <SegmentedControl.Option value="overview">Overview</SegmentedControl.Option>
          <SegmentedControl.Option value="analytics">Analytics</SegmentedControl.Option>
          <SegmentedControl.Option value="reports">Reports</SegmentedControl.Option>
          <SegmentedControl.Option value="settings">Settings</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Underline block ───
export function TabsUnderlineBlockDemo() {
  const [tab, setTab] = useState('overview');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant="underline"
          block
          size={shownSize}
          aria-label="Sections"
        >
          <SegmentedControl.Option value="overview">Overview</SegmentedControl.Option>
          <SegmentedControl.Option value="analytics">Analytics</SegmentedControl.Option>
          <SegmentedControl.Option value="reports">Reports</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Underline with icons ───
export function TabsUnderlineIconsDemo() {
  const [tab, setTab] = useState('home');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('lg');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant="underline"
          size={shownSize}
          aria-label="Navigation"
        >
          <SegmentedControl.Option value="home" icon={<Home />}>Home</SegmentedControl.Option>
          <SegmentedControl.Option value="settings" icon={<SettingsCog />}>Settings</SegmentedControl.Option>
          <SegmentedControl.Option value="notifications" icon={<Bell />}>Notifications</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Segmented with icons ───
export function TabsSegmentedIconsDemo() {
  const [tab, setTab] = useState('home');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill, shownPill] = useDesktopOnlyState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" desktopOnly value={pill} onChange={setPill} />
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          size={shownSize}
          pill={shownPill}
          aria-label="Navigation"
        >
          <SegmentedControl.Option value="home" icon={<Home />}>Home</SegmentedControl.Option>
          <SegmentedControl.Option value="settings" icon={<SettingsCog />}>Settings</SegmentedControl.Option>
          <SegmentedControl.Option value="notifications" icon={<Bell />}>Notifications</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Icon only ───
export function TabsIconOnlyDemo() {
  const [tab, setTab] = useState('home');
  const [variant, setVariant, shownVariant] = useDesktopOnlyState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');
  const [pill, setPill, shownPill] = useDesktopOnlyState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant" desktopOnly>
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        {variant === 'segmented' && (
          <DemoControlBoolean name="pill" desktopOnly value={pill} onChange={setPill} />
        )}
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant={shownVariant}
          size={shownSize}
          pill={shownPill}
          aria-label="Navigation"
        >
          <SegmentedControl.Option value="home" icon={<Home />} aria-label="Home" />
          <SegmentedControl.Option value="settings" icon={<SettingsCog />} aria-label="Settings" />
          <SegmentedControl.Option value="notifications" icon={<Bell />} aria-label="Notifications" />
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Segmented with badge ───
export function TabsSegmentedBadgeDemo() {
  const [tab, setTab] = useState('all');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill, shownPill] = useDesktopOnlyState(true);
  const [badgePill, setBadgePill] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" desktopOnly value={pill} onChange={setPill} />
        <DemoControlBoolean name="badgePill" value={badgePill} onChange={setBadgePill} />
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          size={shownSize}
          pill={shownPill}
          aria-label="Filter"
        >
          <SegmentedControl.Option value="all" badge={{ content: 128, pill: badgePill }}>All</SegmentedControl.Option>
          <SegmentedControl.Option value="unread" badge={{ content: 12, color: "info", pill: badgePill }}>Unread</SegmentedControl.Option>
          <SegmentedControl.Option value="flagged" badge={{ content: 3, color: "danger", pill: badgePill }}>Flagged</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Underline with badge ───
export function TabsUnderlineBadgeDemo() {
  const [tab, setTab] = useState('all');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [badgePill, setBadgePill] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="badgePill" value={badgePill} onChange={setBadgePill} />
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant="underline"
          size={shownSize}
          aria-label="Filter"
        >
          <SegmentedControl.Option value="all" badge={{ content: 128, pill: badgePill }}>All</SegmentedControl.Option>
          <SegmentedControl.Option value="unread" badge={{ content: 12, color: "info", pill: badgePill }}>Unread</SegmentedControl.Option>
          <SegmentedControl.Option value="flagged" badge={{ content: 3, color: "danger", pill: badgePill }}>Flagged</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Vertical segmented ───
export function TabsVerticalSegmentedDemo() {
  const [tab, setTab] = useState('account');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          orientation="vertical"
          size={shownSize}
          aria-label="Settings"
        >
          <SegmentedControl.Option value="account">Account</SegmentedControl.Option>
          <SegmentedControl.Option value="password">Password</SegmentedControl.Option>
          <SegmentedControl.Option value="notifications">Notifications</SegmentedControl.Option>
          <SegmentedControl.Option value="display">Display</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Vertical underline ───
export function TabsVerticalUnderlineDemo() {
  const [tab, setTab] = useState('account');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant="underline"
          orientation="vertical"
          size={shownSize}
          aria-label="Settings"
        >
          <SegmentedControl.Option value="account">Account</SegmentedControl.Option>
          <SegmentedControl.Option value="password">Password</SegmentedControl.Option>
          <SegmentedControl.Option value="notifications">Notifications</SegmentedControl.Option>
          <SegmentedControl.Option value="display">Display</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Vertical underline with icons ───
export function TabsVerticalUnderlineIconsDemo() {
  const [tab, setTab] = useState('home');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('lg');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant="underline"
          orientation="vertical"
          size={shownSize}
          aria-label="Navigation"
        >
          <SegmentedControl.Option value="home" icon={<Home />}>Home</SegmentedControl.Option>
          <SegmentedControl.Option value="settings" icon={<SettingsCog />}>Settings</SegmentedControl.Option>
          <SegmentedControl.Option value="notifications" icon={<Bell />}>Notifications</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Sizing demo with interactive controls ───
export function TabsSizingDemo() {
  const [tab, setTab] = useState('overview');
  const [variant, setVariant, shownVariant] = useDesktopOnlyState<(typeof VARIANT_OPTIONS)[number]>('underline');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant" desktopOnly>
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          variant={shownVariant}
          size={shownSize}
          aria-label="Demo tabs"
        >
          <SegmentedControl.Option value="overview">Overview</SegmentedControl.Option>
          <SegmentedControl.Option value="analytics">Analytics</SegmentedControl.Option>
          <SegmentedControl.Option value="reports">Reports</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Scrollable ───
export function TabsScrollableDemo() {
  const [tab, setTab] = useState('1');
  const [variant, setVariant, shownVariant] = useDesktopOnlyState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  const [size, setSize, shownSize] = useDesktopOnlyState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="variant" desktopOnly>
          <SegmentedControl value={variant} onChange={setVariant} size="xs" aria-label="variant">
            {VARIANT_OPTIONS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>{v}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size" desktopOnly>
          <SegmentedControl value={size} onChange={setSize} size="xs" aria-label="size">
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <div className="flex w-full min-w-0 max-w-[400px]">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            variant={shownVariant}
            size={shownSize}
            aria-label="Scrollable tabs"
          >
            <SegmentedControl.Option value="1">Overview</SegmentedControl.Option>
            <SegmentedControl.Option value="2">Analytics</SegmentedControl.Option>
            <SegmentedControl.Option value="3">Reports</SegmentedControl.Option>
            <SegmentedControl.Option value="4">Settings</SegmentedControl.Option>
            <SegmentedControl.Option value="5">Members</SegmentedControl.Option>
            <SegmentedControl.Option value="6">Billing</SegmentedControl.Option>
            <SegmentedControl.Option value="7">Security</SegmentedControl.Option>
            <SegmentedControl.Option value="8">Integrations</SegmentedControl.Option>
          </SegmentedControl>
        </div>
      </TabsStage>
    </>
  );
}

const OVERFLOW_WIDTHS = ['240', '360', '560'] as const;

export function TabsOverflowMenuDemo() {
  const [tab, setTab] = useState('code');
  const [chosenWidth, setWidth] = useState<(typeof OVERFLOW_WIDTHS)[number]>('360');
  // A phone screen is narrower than 560px, so a phone offers the widths it can show
  const phone = usePhoneRows();
  const widths = phone ? OVERFLOW_WIDTHS.filter((w) => w !== '560') : OVERFLOW_WIDTHS;
  const width = phone && chosenWidth === '560' ? '360' : chosenWidth;

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="container width">
          <SegmentedControl value={width} onChange={setWidth} size="xs" aria-label="container width">
            {widths.map((w) => (
              <SegmentedControl.Option key={w} value={w}>{w}px</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <TabsStage>
        <div className="flex min-w-0 max-w-full" style={{ width: Number(width) }}>
          <SegmentedControl value={tab} onChange={setTab} variant="underline" overflow="menu" aria-label="Repository">
            <SegmentedControl.Option value="code">Code</SegmentedControl.Option>
            <SegmentedControl.Option value="issues" badge={12}>Issues</SegmentedControl.Option>
            <SegmentedControl.Option value="pulls" badge={3}>Pull requests</SegmentedControl.Option>
            <SegmentedControl.Option value="actions">Actions</SegmentedControl.Option>
            <SegmentedControl.Option value="projects">Projects</SegmentedControl.Option>
            <SegmentedControl.Option value="insights">Insights</SegmentedControl.Option>
            <SegmentedControl.Option value="settings">Settings</SegmentedControl.Option>
          </SegmentedControl>
        </div>
      </TabsStage>
    </>
  );
}

