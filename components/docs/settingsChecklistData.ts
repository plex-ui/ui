export type SettingId = 'delivery' | 'activity' | 'previews' | 'digest';
export type SettingOption = { value: string; label: string };
export type ChecklistSetting = {
  id: SettingId;
  label: string;
  options: SettingOption[];
  /** One choice: its page checks a row, and the checkmark moves on a tap, as Settings › Camera › Record Sound does. */
  single?: boolean;
  disabled?: boolean;
};

export const checklistSettings: ChecklistSetting[] = [
  {
    id: 'delivery', label: 'Delivery',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'push', label: 'Push notifications' },
      { value: 'inbox', label: 'In-app inbox' },
    ],
  },
  {
    id: 'activity', label: 'Security alerts',
    options: [
      { value: 'sign-in', label: 'New sign-ins' },
      { value: 'password', label: 'Password changes' },
      { value: 'recovery', label: 'Recovery requests' },
      { value: 'devices', label: 'New devices' },
    ],
  },
  {
    id: 'previews', label: 'Show previews', single: true,
    options: [
      { value: 'always', label: 'Always' },
      { value: 'unlocked', label: 'When Unlocked' },
      { value: 'never', label: 'Never' },
    ],
  },
  { id: 'digest', label: 'Weekly digest', options: [], disabled: true },
];

export const initialChecklistSelection = (): Record<SettingId, string[]> => ({
  delivery: ['email'],
  activity: ['sign-in', 'password', 'recovery'],
  previews: ['always'],
  digest: [],
});

// Several values read as a sentence's list, as Settings writes them under a row: "Play Sound and Braille", "Speak,
// Change Pitch, and Braille" (iOS 26 Settings › Accessibility › VoiceOver › Verbosity)
const valueList = new Intl.ListFormat('en', { type: 'conjunction' });

export const checklistSummary = (setting: ChecklistSetting, values: string[]): string =>
  setting.disabled ? 'Unavailable' : valueList.format(setting.options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label)) || 'None';
