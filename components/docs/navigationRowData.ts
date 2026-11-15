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
