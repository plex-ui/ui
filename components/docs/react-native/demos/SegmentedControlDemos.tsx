import { useContext, useState, type ReactNode } from 'react';
import { List, ListItem, SegmentedControl, Toolbar } from '@plexui/react-native';
import { Calendar, CalendarToday, Clock, Grid } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { NativeScreenTitleContext, useNativePlatform } from '../platform';
import { PhonePage } from './ToolbarDemos';

// Where the control stands: in a top bar of its own, in a bottom bar, or above the content (Safari's bookmarks). A day
// of a calendar scrolls under it
const PLACEMENTS = ['top', 'bottom', 'content'] as const;
// iOS has two controls: sm and smaller the small 32pt one, md and larger the large 48pt one. Android's capsule
// steps 32, 36 and 40dp
const SIZES = ['sm', 'md'] as const;
const ANDROID_SIZES = ['sm', 'md', 'lg'] as const;
const MATERIALS = ['flat', 'glass'] as const;
const SEGMENT_WIDTHS = ['equal', 'content'] as const;
// A phone's segment carries a symbol or a label, not both
const ICONS = ['none', 'only'] as const;
// A busy day of a calendar: its events at their times, more than a phone shows, so the day scrolls under the bars
const AGENDA_ROWS = [
  { time: '07:00', title: 'Gym' },
  { time: '08:30', title: 'School drop-off' },
  { time: '09:30', title: 'Standup' },
  { time: '10:00', title: 'Design review' },
  { time: '11:00', title: '1:1 with Maya' },
  { time: '11:30', title: 'Interview' },
  { time: '12:30', title: 'Lunch with Ben' },
  { time: '13:30', title: 'Customer call' },
  { time: '14:00', title: 'Focus time' },
  { time: '15:00', title: 'Dentist' },
  { time: '16:00', title: 'Sprint planning' },
  { time: '17:00', title: 'Code review' },
  { time: '18:00', title: 'Pick up groceries' },
  { time: '19:30', title: 'Dinner with Sofia' },
  { time: '21:00', title: 'Call Mom' },
];
// The views of a calendar, each with its symbol: the day's hours, a week and a month of the calendar, the year's grid
const VIEWS: { value: string; label: string; icon: ReactNode }[] = [
  { value: 'day', label: 'Day', icon: <Clock /> },
  { value: 'week', label: 'Week', icon: <CalendarToday /> },
  { value: 'month', label: 'Month', icon: <Calendar /> },
  { value: 'year', label: 'Year', icon: <Grid /> },
];

/** A day of a calendar, for the page to scroll under the bars */
function Agenda() {
  return (
    <List>
      {AGENDA_ROWS.map(({ time, title }) => (
        <ListItem key={time} label={title} value={time} />
      ))}
    </List>
  );
}

/**
 * The Overview, as the React page's Phone view: a calendar's views in a top bar of their own, in a bottom bar, or
 * above a day that scrolls under the bars; `placement` picks one. In a Toolbar every control is the large
 * glass one, so `size` and `mobileMaterial` are settings of a control in the content; Android's capsule has
 * no glass, so it offers `size` alone. A phone's segment shows a label
 * or a symbol alone. Vertical tabs, the underline variant, flush, block, pill and badges are not drawn on a phone.
 */
export const Overview = docsDemo(function Overview() {
  const [tab, setTab] = useState('day');
  const [placement, setPlacement] = useState<(typeof PLACEMENTS)[number]>('top');
  const [size, setSize] = useState<(typeof ANDROID_SIZES)[number]>('md');
  const android = useNativePlatform() === 'android';
  // Unset, the control's own default: the large one glass, the small one flat
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]>();
  const [segmentWidth, setSegmentWidth] = useState<(typeof SEGMENT_WIDTHS)[number]>('equal');
  const [icon, setIcon] = useState<(typeof ICONS)[number]>('none');
  const [disabled, setDisabled] = useState(false);
  const [monthDisabled, setMonthDisabled] = useState(false);
  const inContent = placement === 'content';
  // Without a bar of its own at the top, the screen keeps the app's top bar, titled as a phone page's (the calendar's
  // own name where the page gives none)
  const title = useContext(NativeScreenTitleContext).title || 'Calendar';
  const control = (
    <SegmentedControl
      aria-label="Calendar view"
      value={tab}
      onChange={setTab}
      size={android || size !== 'lg' ? size : 'md'}
      mobileMaterial={material}
      mobileSegmentWidth={segmentWidth}
      disabled={disabled}
    >
      {VIEWS.map((view) => (
        <SegmentedControl.Tab
          key={view.value}
          value={view.value}
          icon={icon === 'only' ? view.icon : undefined}
          aria-label={icon === 'only' ? view.label : undefined}
          disabled={view.value === 'month' ? monthDisabled : undefined}
        >
          {icon === 'only' ? undefined : view.label}
        </SegmentedControl.Tab>
      ))}
    </SegmentedControl>
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="placement" options={PLACEMENTS} value={placement} onChange={setPlacement} />
        {inContent && <Segments name="size" options={android ? ANDROID_SIZES : SIZES} value={android || size !== 'lg' ? size : 'md'} onChange={setSize} />}
        {inContent && !android && <Segments name="mobileMaterial" options={MATERIALS} value={material ?? (size === 'sm' ? 'flat' : 'glass')} onChange={setMaterial} />}
        <Segments name="mobileSegmentWidth" options={SEGMENT_WIDTHS} value={segmentWidth} onChange={setSegmentWidth} />
        <Segments name="icon" options={ICONS} value={icon} onChange={setIcon} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="monthDisabled" value={monthDisabled} onChange={setMonthDisabled} />
      </div>
      <RNScreen screen grouped minHeight={320}>
        {/* The day scrolls under the bars, which show its edge once content is under them */}
        <PhonePage
          top={(scrolled, canvas) =>
            placement === 'top' ? (
              // The views hold the top bar alone
              <Toolbar scrolled={scrolled} canvasColor={canvas}>
                <Toolbar.Content>{control}</Toolbar.Content>
              </Toolbar>
            ) : (
              <Toolbar scrolled={scrolled} canvasColor={canvas}>
                <Toolbar.Title>{title}</Toolbar.Title>
              </Toolbar>
            )
          }
          bottom={
            placement === 'bottom'
              ? (scrolled, canvas) => (
                  <Toolbar placement="bottom" scrolled={scrolled} canvasColor={canvas}>
                    <Toolbar.Content>{control}</Toolbar.Content>
                  </Toolbar>
                )
              : undefined
          }
        >
          <View style={{ gap: 24 }}>
            {inContent && control}
            <Agenda />
          </View>
        </PhonePage>
      </RNScreen>
    </>
  );
});
