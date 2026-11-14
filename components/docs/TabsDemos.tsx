'use client';

import { useState, type ReactNode } from 'react';
import { Calendar, CalendarToday, Grid, List } from '@plexui/ui/components/Icon';
import { NavigationButton } from '@plexui/ui/components/Button';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Page } from '@plexui/ui/components/Page';
import { SegmentedControl, type SegmentedControlBadgeProp } from '@plexui/ui/components/SegmentedControl';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { PhoneRowsStage, useDesktopOnlyState, usePhoneRows } from './PhoneRows';
import pageStyles from './PageDemos.module.css';
import toolbarStyles from './ToolbarDemos.module.css';

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const VARIANT_OPTIONS = ['segmented', 'underline'] as const;
const ORIENTATION_OPTIONS = ['horizontal', 'vertical'] as const;
const MATERIAL_OPTIONS = ['flat', 'glass'] as const;
const SEGMENT_WIDTH_OPTIONS = ['equal', 'content'] as const;
// `start`: an icon before the label; `only`: the icon alone, the label its accessible name
const ICON_OPTIONS = ['none', 'start', 'only'] as const;
// Vertical tabs are a list (a sidebar; on a phone an inset grouped list), and a list row always has a title, so an
// icon stands alone only in a horizontal control (owner 11.11 on icon-only vertical tabs: «зачем это на мобиле?»,
// «зачем это вообще?»)
const VERTICAL_ICON_OPTIONS = ['none', 'start'] as const;
// A phone's segment carries a symbol or a label, not both: UISegmentedControl draws an action with both as its symbol
// (owner 13.11 on icon start: «такого нет»)
const PHONE_ICON_OPTIONS = ['none', 'only'] as const;
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
// The views of a calendar, each with an icon and the events it holds as a badge
const VIEWS: { value: string; label: string; icon: ReactNode; badge?: Exclude<SegmentedControlBadgeProp, ReactNode> }[] = [
  { value: 'day', label: 'Day', icon: <CalendarToday />, badge: { content: 3, color: 'danger' } },
  { value: 'week', label: 'Week', icon: <List />, badge: { content: 12, color: 'info' } },
  { value: 'month', label: 'Month', icon: <Calendar />, badge: { content: 48 } },
  { value: 'year', label: 'Year', icon: <Grid /> },
];

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

function Segments<T extends string>({ name, label, options, format = (option) => option, value, syncValue, onChange, phoneOnly, desktopOnly }: {
  name: string;
  label?: string;
  /** The choice the page keeps when the row shows another, one this view does not offer */
  syncValue?: T;
  /** The text of an option, when it is not the value itself (a width in px) */
  format?: (option: T) => string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  phoneOnly?: boolean;
  desktopOnly?: boolean;
}) {
  return (
    <DemoControlRow name={name} label={label} phoneOnly={phoneOnly} desktopOnly={desktopOnly} syncValue={syncValue}>
      <SegmentedControl<T> value={value} onChange={onChange} size="xs" aria-label={label ?? name}>
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>{format(option)}</SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the control: what the page's examples once showed one by one (Underline,
 * Underline flush, Underline block, Vertical, Sizing, Segmented with icons, Icon only, Segmented with badge and their
 * underline and vertical forms) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми
 * настройками», for every page). A setting shows only where it acts: pill on the segmented variant, flush on
 * underline, icon only on a horizontal control, a badge on a tab with a label (a count names what it counts, Inbox 3;
 * a row of symbols carries none), badgePill with a badge, and on a phone placement on a horizontal control, size and
 * material on a horizontal control in the content. iOS segments carry no badges, so badges are a desktop setting. */
export function TabsOverviewDemo() {
  const [tab, setTab] = useState('day');
  const [variant, setVariant, shownVariant] = useDesktopOnlyState<(typeof VARIANT_OPTIONS)[number]>('segmented');
  // On a phone vertical tabs are an inset grouped list, so orientation is a setting of both
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('horizontal');
  const [placement, setPlacement] = useState<(typeof PLACEMENT_OPTIONS)[number]>('top');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  // The phone opens on the default, the large control (owner 10.11: «почему не дефолтный большой размер?»)
  const [phoneSize, setPhoneSize] = useState<(typeof PHONE_SIZE_OPTIONS)[number]>('md');
  const phone = usePhoneRows();
  const [pill, setPill, shownPill] = useDesktopOnlyState(true);
  const [flush, setFlush, shownFlush] = useDesktopOnlyState(false);
  const [block, setBlock, shownBlock] = useDesktopOnlyState(false);
  const [icon, setIcon] = useState<(typeof ICON_OPTIONS)[number]>('none');
  const [badge, setBadge, shownBadge] = useDesktopOnlyState(false);
  const [badgePill, setBadgePill] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [monthDisabled, setMonthDisabled] = useState(false);
  // The docs open on glass, the default of the large control (owner 10.11: «Нужно стекло», «Как и для кнопок»)
  const [material, setMaterial] = useState<(typeof MATERIAL_OPTIONS)[number]>('glass');
  // Equal segments or each by its label, the two widths of UISegmentedControl (owner 13.11: «компактно/не компактно? у
  // нас будут?»)
  const [segmentWidth, setSegmentWidth] = useState<(typeof SEGMENT_WIDTH_OPTIONS)[number]>('equal');
  const horizontal = orientation === 'horizontal';
  const iconOptions: readonly (typeof ICON_OPTIONS)[number][] = !horizontal
    ? VERTICAL_ICON_OPTIONS
    : phone ? PHONE_ICON_OPTIONS : ICON_OPTIONS;
  // A choice this view does not offer shows as none: icon only on a vertical control, an icon before the label on a
  // phone's segment
  const shownIcon = iconOptions.includes(icon) ? icon : 'none';
  const labelled = shownIcon !== 'only';
  // In a phone Toolbar every control is the large glass one, so its size and material are settings of a control in
  // the content only
  const inContent = horizontal && (!phone || placement === 'content');

  const control = (
    <SegmentedControl
      value={tab}
      onChange={setTab}
      variant={shownVariant}
      orientation={orientation}
      size={phone ? phoneSize : size}
      pill={shownPill}
      flush={shownFlush}
      block={shownBlock}
      disabled={disabled}
      mobileMaterial={material}
      mobileSegmentWidth={segmentWidth}
      aria-label="Calendar view"
    >
      {VIEWS.map((view) => (
        <SegmentedControl.Option
          key={view.value}
          value={view.value}
          icon={shownIcon === 'none' ? undefined : view.icon}
          aria-label={labelled ? undefined : view.label}
          badge={shownBadge && labelled && view.badge ? { ...view.badge, pill: badgePill } : undefined}
          disabled={view.value === 'month' ? monthDisabled : undefined}
        >
          {labelled ? view.label : undefined}
        </SegmentedControl.Option>
      ))}
    </SegmentedControl>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANT_OPTIONS} value={shownVariant} onChange={setVariant} desktopOnly />
        <Segments name="orientation" options={ORIENTATION_OPTIONS} value={orientation} onChange={setOrientation} />
        {horizontal && <Segments name="placement" options={PLACEMENT_OPTIONS} value={placement} onChange={setPlacement} phoneOnly />}
        <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} desktopOnly />
        {inContent && <Segments name="phoneSize" label="size" options={PHONE_SIZE_OPTIONS} value={phoneSize} onChange={setPhoneSize} phoneOnly />}
        {variant === 'segmented' && <DemoControlBoolean name="pill" desktopOnly value={shownPill} onChange={setPill} />}
        {variant === 'underline' && <DemoControlBoolean name="flush" desktopOnly value={shownFlush} onChange={setFlush} />}
        <DemoControlBoolean name="block" desktopOnly value={shownBlock} onChange={setBlock} />
        {inContent && <Segments name="mobileMaterial" options={MATERIAL_OPTIONS} value={material} onChange={setMaterial} phoneOnly />}
        {horizontal && <Segments name="mobileSegmentWidth" options={SEGMENT_WIDTH_OPTIONS} value={segmentWidth} onChange={setSegmentWidth} phoneOnly />}
        <Segments name="icon" options={iconOptions} value={shownIcon} syncValue={icon} onChange={setIcon} />
        {labelled && <DemoControlBoolean name="badge" desktopOnly value={shownBadge} onChange={setBadge} />}
        {labelled && shownBadge && <DemoControlBoolean name="badgePill" desktopOnly value={badgePill} onChange={setBadgePill} />}
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="monthDisabled" value={monthDisabled} onChange={setMonthDisabled} />
      </div>
      {phone && horizontal ? (
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
                <div className="flex flex-col gap-6 [--field-group-gap:13px]">
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

const OVERFLOW_OPTIONS = ['scroll', 'menu'] as const;
const OVERFLOW_WIDTHS = ['240', '360', '560'] as const;

/** Overflow: a row of tabs longer than its container, which scrolls (Scrollable, no prop) or moves the tabs that do
 * not fit into a menu (Overflow menu). Its own example: it needs more tabs than the Overview's four and a narrow
 * container, other content than the Overview's, not another setting of it (owner 11.11). */
export function TabsOverflowDemo() {
  const [tab, setTab] = useState('code');
  const [overflow, setOverflow] = useState<(typeof OVERFLOW_OPTIONS)[number]>('menu');
  const [variant, setVariant, shownVariant] = useDesktopOnlyState<(typeof VARIANT_OPTIONS)[number]>('underline');
  // A narrow column is a desktop's: on a phone the control fills the screen's row, as iOS lays it out (owner 13.11 on
  // the container width there: «зачем?»)
  const [width, setWidth] = useState<(typeof OVERFLOW_WIDTHS)[number]>('360');
  const phone = usePhoneRows();

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="overflow" options={OVERFLOW_OPTIONS} value={overflow} onChange={setOverflow} />
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} desktopOnly />
        {/* A phone gives the code no width, as its preview has none */}
        <Segments<(typeof OVERFLOW_WIDTHS)[number] | ''> name="width" label="container width" options={OVERFLOW_WIDTHS} format={(w) => `${w}px`} value={phone ? '' : width} onChange={(w) => w && setWidth(w)} desktopOnly />
      </div>
      <TabsStage>
        <div className="flex min-w-0 max-w-full" style={phone ? undefined : { width: Number(width) }}>
          <SegmentedControl
            value={tab}
            onChange={setTab}
            variant={shownVariant}
            overflow={overflow === 'menu' ? 'menu' : undefined}
            aria-label="Repository"
          >
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
