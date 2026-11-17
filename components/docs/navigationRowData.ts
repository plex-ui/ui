/** The drill-in rows of the NavigationRow demos and the choices each one opens */
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
    { id: 'language', label: 'Language', choices: ['English', 'Deutsch', 'Español', 'Français', '日本語'] },
    { id: 'region', label: 'Region', choices: ['Germany', 'Spain', 'United Kingdom', 'United States'] },
    { id: 'calendar', label: 'Calendar', choices: ['Gregorian', 'Buddhist', 'Japanese'] },
  ],
  [
    { id: 'fetch', label: 'Fetch New Data', description: 'How new mail arrives', choices: ['Push', 'Every 15 Minutes', 'Hourly', 'Manually'] },
    { id: 'temperature', label: 'Temperature', choices: ['°C', '°F'], disabled: true },
    {
      id: 'alerts',
      label: 'Default Alerts',
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
