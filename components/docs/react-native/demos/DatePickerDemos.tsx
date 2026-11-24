import { useState } from 'react';
import { DatePicker, List, ListItem, Switch, Toolbar } from '@plexui/react-native';
import { ScrollView, View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const MODES = ['date', 'time', 'datetime'] as const;
const DISPLAYS = ['compact', 'inline', 'wheels'] as const;
type DatePickerMode = (typeof MODES)[number];
type DatePickerDisplay = (typeof DISPLAYS)[number];

const at = (days: number, hours: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
};

/**
 * A new event, as Calendar's: Starts and Ends rows with the date and the time at their end. On iOS each opens its
 * calendar or its wheels in a popover; on Android Material's dialog. `display` draws the start's picker in place
 * (the calendar, or the wheels); `min` keeps the start from today on and the end after the start.
 */
export const Overview = docsDemo(function Overview() {
  const [mode, setMode] = useState<DatePickerMode>('datetime');
  const [display, setDisplay] = useState<DatePickerDisplay>('compact');
  const [limit, setLimit] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [starts, setStarts] = useState(() => at(1, 9));
  const [ends, setEnds] = useState(() => at(1, 10));
  const shown: DatePickerMode = allDay && mode !== 'time' ? 'date' : mode;
  const changeStart = (next: Date) => {
    // The end moves with the start, keeping the event's length
    setEnds((end) => new Date(next.getTime() + (end.getTime() - starts.getTime())));
    setStarts(next);
  };
  const start = (
    <DatePicker
      value={starts}
      onChange={changeStart}
      mode={shown}
      display={display}
      min={limit ? new Date() : undefined}
      disabled={disabled}
      aria-label="Starts"
      testID="starts"
    />
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="mode" options={MODES} value={mode} onChange={setMode} />
        <Segments name="display" options={DISPLAYS} value={display} onChange={setDisplay} />
        <DemoControlBoolean name="min" value={limit} onChange={setLimit} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen screen grouped minHeight={640}>
        <View style={{ flex: 1 }}>
          <Toolbar>
            <Toolbar.Title>New Event</Toolbar.Title>
          </Toolbar>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 24 }}>
            <List>
              {display === 'compact' ? <ListItem label="Starts" trailing={start} /> : null}
              <ListItem
                label="Ends"
                trailing={<DatePicker value={ends} onChange={setEnds} mode={shown} min={limit ? starts : undefined} disabled={disabled} aria-label="Ends" testID="ends" />}
              />
              {mode !== 'time' ? <ListItem label="All-day" trailing={<Switch checked={allDay} onCheckedChange={setAllDay} accessibilityLabel="All-day" />} /> : null}
            </List>
            {display !== 'compact' ? (
              <List header="Starts">
                {start}
              </List>
            ) : null}
          </ScrollView>
        </View>
      </RNScreen>
    </>
  );
});
