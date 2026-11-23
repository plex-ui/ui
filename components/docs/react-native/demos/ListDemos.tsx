import { useState, type ReactNode } from 'react';
import { List, ListItem, NavigationButton, Switch, Toolbar, useTheme } from '@plexui/react-native';
import { Calendar, CheckMd, Clock, Globe } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';
import { PhonePage } from './ToolbarDemos';

type Row = { id: string; label: string; choices: string[]; description?: string; disabled?: boolean; placement?: 'end' | 'below' | 'auto' };

/** The drill-in rows of the React NavigationRow Overview, a Calendar app's settings, and the choices each one opens */
const GENERAL_ROWS: Row[] = [
  { id: 'timeZone', label: 'Time zone', choices: ['Automatic', 'London', 'New York', 'Tokyo'] },
  { id: 'weekStart', label: 'Start week on', choices: ['Monday', 'Sunday', 'Saturday'] },
  { id: 'dayStart', label: 'Day starts at', choices: ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM'] },
];
const EVENT_ROWS: Row[] = [
  { id: 'sync', label: 'Sync', description: 'How far back events are kept', choices: ['1 month back', '3 months back', '6 months back', 'All events'] },
  { id: 'calendar', label: 'Default calendar', description: 'Managed by your organization', choices: ['Work', 'Home', 'Family'], disabled: true },
  { id: 'alerts', label: 'Default alerts', choices: ['At time of event, 15 minutes before, 1 day before', '15 minutes before', 'None'], placement: 'auto' },
];
const ROWS = [...GENERAL_ROWS, ...EVENT_ROWS];
const FIRST_CHOICES = Object.fromEntries(ROWS.map((row) => [row.id, row.choices[0]])) as Record<string, string>;

const SURFACES = ['grouped', 'plain'] as const;

/**
 * The space between two sections on iOS, as the React FieldGroup stacks its groups on a phone (FieldGroup.module.css,
 * iOS 26 Settings): 35 from rows to rows, less what a footer before or a header of the section already takes. List
 * leaves the space between sections to the screen; on Android the cards stand 12 apart, and a footer's own 17 under
 * it parts it from the next card.
 */
function sectionGap(android: boolean, { afterFooter = false, header = false }: { afterFooter?: boolean; header?: boolean }) {
  if (android) return afterFooter ? 0 : 12;
  return 35 - (afterFooter ? 17.33 : 0) - (header ? (afterFooter ? 11.33 : 18.67) : 0);
}

/**
 * The Overview, every setting of a List and its rows on one screen of a Calendar app's settings, after the React
 * NavigationRow Overview (Time zone, Start week on and Day starts at; Sync with its description, Default calendar
 * disabled with its reason and Default alerts with a long value): each row opens the page of its choices. A switch ends
 * a row of the second section, and Sign out stands red in a section of its own.
 */
export const Overview = docsDemo(function Overview() {
  const theme = useTheme();
  const android = useNativePlatform() === 'android';
  const [surface, setSurface] = useState<(typeof SURFACES)[number]>('grouped');
  const [header, setHeader] = useState(false);
  const [footer, setFooter] = useState(false);
  const [leading, setLeading] = useState(false);
  const [description, setDescription] = useState(true);
  const [disclosure, setDisclosure] = useState(true);
  const [disabled, setDisabled] = useState(true);
  const [values, setValues] = useState(FIRST_CHOICES);
  const [weekNumbers, setWeekNumbers] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const row = ROWS.find((item) => item.id === open);
  // The symbols of the first section, each on a tile of its own color as in iOS Settings
  const symbols: Record<string, { icon: ReactNode; color: string }> = {
    timeZone: { icon: <Globe />, color: theme.color('--color-background-info-solid') },
    weekStart: { icon: <Calendar />, color: theme.color('--color-background-danger-solid') },
    dayStart: { icon: <Clock />, color: theme.color('--color-background-success-solid') },
  };
  const item = ({ id, label, description: note, disabled: off, placement }: Row) => (
    <ListItem
      key={id}
      label={label}
      value={values[id]}
      valuePlacement={placement}
      description={description ? note : undefined}
      leading={leading ? symbols[id]?.icon : undefined}
      leadingColor={leading ? symbols[id]?.color : undefined}
      disclosure={disclosure}
      disabled={disabled && off}
      onPress={() => setOpen(id)}
    />
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="surface" options={SURFACES} value={surface} onChange={setSurface} />
        <DemoControlBoolean name="header" value={header} onChange={setHeader} />
        <DemoControlBoolean name="footer" value={footer} onChange={setFooter} />
        <DemoControlBoolean name="leading" value={leading} onChange={setLeading} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        {/* Android rows have no chevron */}
        {!android && <DemoControlBoolean name="disclosure" value={disclosure} onChange={setDisclosure} />}
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen screen grouped={surface === 'grouped'} minHeight={640}>
        {row ? (
          // The page a row opens: its choices, the current one checked, and Back to the list
          <PhonePage
            top={(scrolled, canvas) => (
              <Toolbar scrolled={scrolled} canvasColor={canvas}>
                <Toolbar.Leading>
                  <NavigationButton action="back" onPress={() => setOpen(null)} />
                </Toolbar.Leading>
                <Toolbar.Title>{row.label}</Toolbar.Title>
              </Toolbar>
            )}
          >
            <List surface={surface}>
              {row.choices.map((choice) => (
                <ListItem
                  key={choice}
                  label={choice}
                  trailing={values[row.id] === choice ? <CheckMd color={theme.colors.accent} /> : undefined}
                  disclosure={false}
                  onPress={() => {
                    setValues((current) => ({ ...current, [row.id]: choice }));
                    setOpen(null);
                  }}
                />
              ))}
            </List>
          </PhonePage>
        ) : (
          <PhonePage
            top={(scrolled, canvas) => (
              <Toolbar scrolled={scrolled} canvasColor={canvas}>
                <Toolbar.Title>Calendar</Toolbar.Title>
              </Toolbar>
            )}
          >
            <List surface={surface} header={header ? 'General' : undefined}>
              {GENERAL_ROWS.map(item)}
            </List>
            <View style={{ height: sectionGap(android, { header }) }} />
            <List
              surface={surface}
              header={header ? 'Events' : undefined}
              footer={footer ? 'Syncing fewer months saves space on this device.' : undefined}
            >
              {EVENT_ROWS.map(item)}
              <ListItem
                label="Week numbers"
                trailing={<Switch checked={weekNumbers} onCheckedChange={setWeekNumbers} accessibilityLabel="Week numbers" />}
              />
            </List>
            <View style={{ height: sectionGap(android, { afterFooter: footer }) }} />
            <List surface={surface}>
              <ListItem label="Sign out" destructive onPress={() => {}} />
            </List>
          </PhonePage>
        )}
      </RNScreen>
    </>
  );
});
