'use client';

import { useState, type ReactNode } from 'react';
import {
  Bell,
  Grid,
  Home,
  List,
  SettingsCog,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
} from '@plexui/ui/components/Icon';
import { NavigationButton } from '@plexui/ui/components/Button';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Page } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, useDesktopOnlyState, usePhoneRows } from './PhoneRows';
import pageStyles from './PageDemos.module.css';
import toolbarStyles from './ToolbarDemos.module.css';

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const VARIANT_OPTIONS = ['segmented', 'underline'] as const;
const ORIENTATION_OPTIONS = ['horizontal', 'vertical'] as const;
const MATERIAL_OPTIONS = ['flat', 'glass'] as const;
// On a phone the control has the two sizes of iOS 27.2: sm and smaller the small 32px one, md and larger the large
// 48px one
const PHONE_SIZE_OPTIONS = ['sm', 'md'] as const;
// Where the phone example puts the control: in a top bar (Calendar's invitations, IMG_5522; Contacts, IMG_5618), in a
// bottom bar (SwiftUI's Picker in the bottom toolbar, ref-app segmented-bottom) or above the content (Safari's
// bookmarks, IMG_5561). A day of a calendar scrolls under it, so the glass of the bars shows (owner 10.11: «плохой
// пример тк нет контента для скролла»).
const PLACEMENT_OPTIONS = ['top', 'bottom', 'content'] as const;
const AGENDA = ['Standup', 'Design review', 'Focus time', 'Lunch', 'Interviews', 'Planning', 'Gym', 'Dinner'];
const AGENDA_ROWS = Array.from({ length: 16 }, (_, index) => ({
  time: `${String(7 + index).padStart(2, '0')}:00`,
  title: AGENDA[index % AGENDA.length],
}));

function Agenda() {
  return (
    <FieldGroup>
      {AGENDA_ROWS.map(({ time, title }) => (
        <div key={time} data-row className={toolbarStyles.Row}>
          <span>{title}</span>
          <span className={toolbarStyles.Value}>{time}</span>
        </div>
      ))}
    </FieldGroup>
  );
}

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
  const [tab, setTab] = useState('day');
  const [variant, setVariant, shownVariant] = useDesktopOnlyState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  const [orientation, setOrientation, shownOrientation] = useDesktopOnlyState<(typeof ORIENTATION_OPTIONS)[number]>('horizontal');
  const [placement, setPlacement] = useState<(typeof PLACEMENT_OPTIONS)[number]>('top');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  // The phone opens on the default, the large control (owner 10.11: «почему не дефолтный большой размер?»)
  const [phoneSize, setPhoneSize] = useState<(typeof PHONE_SIZE_OPTIONS)[number]>('md');
  const phone = usePhoneRows();
  const [pill, setPill, shownPill] = useDesktopOnlyState(true);
  const [flush, setFlush, shownFlush] = useDesktopOnlyState(false);
  const [block, setBlock, shownBlock] = useDesktopOnlyState(false);
  const [disabled, setDisabled] = useState(false);
  const [monthDisabled, setMonthDisabled] = useState(false);
  // The docs open on glass, the default of the large control (owner 10.11: «Нужно стекло», «Как и для кнопок»)
  const [material, setMaterial] = useState<(typeof MATERIAL_OPTIONS)[number]>('glass');

  const control = (
    <SegmentedControl
      value={tab}
      onChange={setTab}
      variant={shownVariant}
      orientation={shownOrientation}
      size={phone ? phoneSize : size}
      pill={shownPill}
      flush={shownFlush}
      block={shownBlock}
      disabled={disabled}
      mobileMaterial={material}
      aria-label="Calendar view"
    >
      <SegmentedControl.Option value="day">Day</SegmentedControl.Option>
      <SegmentedControl.Option value="week">Week</SegmentedControl.Option>
      <SegmentedControl.Option value="month" disabled={monthDisabled}>Month</SegmentedControl.Option>
      <SegmentedControl.Option value="year">Year</SegmentedControl.Option>
    </SegmentedControl>
  );

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
        <DemoControlRow name="placement" phoneOnly>
          <SegmentedControl value={placement} onChange={setPlacement} size="xs" aria-label="placement">
            {PLACEMENT_OPTIONS.map((p) => (
              <SegmentedControl.Option key={p} value={p}>{p}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="orientation" desktopOnly>
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
        <DemoControlRow name="phoneSize" label="size" phoneOnly>
          <SegmentedControl value={phoneSize} onChange={setPhoneSize} size="xs" aria-label="size">
            {PHONE_SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>{s}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" desktopOnly value={pill} onChange={setPill} />
        <DemoControlBoolean name="flush" desktopOnly value={flush} onChange={setFlush} />
        <DemoControlBoolean name="block" desktopOnly value={block} onChange={setBlock} />
        <DemoControlRow name="mobileMaterial" phoneOnly>
          <SegmentedControl value={material} onChange={setMaterial} size="xs" aria-label="mobileMaterial">
            {MATERIAL_OPTIONS.map((m) => (
              <SegmentedControl.Option key={m} value={m}>{m}</SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="monthDisabled" value={monthDisabled} onChange={setMonthDisabled} />
      </div>
      {phone ? (
        <div data-demo-stage className={pageStyles.Stage}>
          <div className={pageStyles.Frame}>
            <Page surface="grouped">
              {placement === 'top' && (
                <Toolbar>
                  <Toolbar.Leading>
                    <NavigationButton action="close" />
                  </Toolbar.Leading>
                  <Toolbar.Content>{control}</Toolbar.Content>
                  <Toolbar.Trailing>
                    <NavigationButton action="confirm" />
                  </Toolbar.Trailing>
                </Toolbar>
              )}
              <Page.Content>
                <div className="flex flex-col gap-6">
                  {placement === 'content' && control}
                  <Agenda />
                </div>
              </Page.Content>
              {placement === 'bottom' && (
                <Toolbar placement="bottom">
                  <Toolbar.Content>{control}</Toolbar.Content>
                </Toolbar>
              )}
            </Page>
          </div>
        </div>
      ) : (
        <TabsStage>{control}</TabsStage>
      )}
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
  const [tab, setTab] = useState('list');
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
          aria-label="View"
        >
          <SegmentedControl.Option value="list" icon={<List />}>List</SegmentedControl.Option>
          <SegmentedControl.Option value="grid" icon={<Grid />}>Grid</SegmentedControl.Option>
        </SegmentedControl>
      </TabsStage>
    </>
  );
}

// ─── Icon only ───
export function TabsIconOnlyDemo() {
  const [tab, setTab] = useState('start');
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
          aria-label="Alignment"
        >
          <SegmentedControl.Option value="start" icon={<TextAlignStart />} aria-label="Align left" />
          <SegmentedControl.Option value="center" icon={<TextAlignCenter />} aria-label="Center" />
          <SegmentedControl.Option value="end" icon={<TextAlignEnd />} aria-label="Align right" />
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

