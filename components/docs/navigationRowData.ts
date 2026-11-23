/** The drill-in rows of the NavigationRow demos, a Calendar app's settings, and the choices each one opens */
export type NavigationRowChoice = {
  id: string;
  label: string;
  description?: string;
  choices: string[];
  disabled?: boolean;
  valuePlacement?: 'end' | 'below' | 'auto';
};

export const NAVIGATION_ROW_GROUPS: NavigationRowChoice[][] = [
  [
    { id: 'timeZone', label: 'Time zone', choices: ['Automatic', 'London', 'New York', 'Tokyo'] },
    { id: 'weekStart', label: 'Start week on', choices: ['Monday', 'Sunday', 'Saturday'] },
    { id: 'dayStart', label: 'Day starts at', choices: ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM'] },
  ],
  [
    { id: 'sync', label: 'Sync', description: 'How far back events are kept', choices: ['1 month back', '3 months back', '6 months back', 'All events'] },
    { id: 'calendar', label: 'Default calendar', description: 'Managed by your organization', choices: ['Work', 'Home', 'Family'], disabled: true },
    {
      id: 'alerts',
      label: 'Default alerts',
      choices: ['At time of event, 15 minutes before, 1 day before', '15 minutes before', 'None'],
      valuePlacement: 'auto',
    },
  ],
];

export const navigationRowValues = () =>
  Object.fromEntries(NAVIGATION_ROW_GROUPS.flat().map((row) => [row.id, row.choices[0]])) as Record<string, string>;

/** People a list leads with their avatars, as iOS Find My's People list: where each is, since when, and how far. */
export const NAVIGATION_ROW_PEOPLE = [
  { id: 'anna', name: 'Anna Keller', place: 'Home', time: 'Now', distance: '2 km' },
  { id: 'marco', name: 'Marco Rossi', place: 'Office', time: '5 min ago', distance: '7 km' },
  { id: 'lena', name: 'Lena Novak', place: 'Airport, Terminal 2', time: '12 min ago', distance: '24 km' },
];
