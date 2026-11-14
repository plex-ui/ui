export type QuickSetting = { id: string; label: string; on: boolean };

/** Accessibility › VoiceOver › Quick Settings (IMG_5946): the settings shown, in the order they appear */
export const initialQuickSettings: QuickSetting[] = [
  { id: 'activities', label: 'Activities', on: true },
  { id: 'audio-ducking', label: 'Audio Ducking', on: true },
  { id: 'braille-input', label: 'Braille Input', on: true },
  { id: 'caption-panel', label: 'Caption Panel', on: false },
  { id: 'cursor-visibility', label: 'Cursor Visibility', on: true },
  { id: 'direct-touch', label: 'Direct Touch', on: false },
  { id: 'hints', label: 'Hints', on: true },
];

export type Language = { id: string; label: string; english: string };

export const allLanguages: Language[] = [
  { id: 'en-US', label: 'English (US)', english: 'English' },
  { id: 'ru', label: 'Русский', english: 'Russian' },
  { id: 'es', label: 'Español', english: 'Spanish' },
  { id: 'de', label: 'Deutsch', english: 'German' },
  { id: 'fr', label: 'Français', english: 'French' },
  { id: 'ja', label: '日本語', english: 'Japanese' },
];

export const initialLanguages = ['en-US', 'ru'];

/** The first language is the one the app speaks: its row says so, as iOS writes "iPhone Language: English" */
export const languageDetail = (language: Language, first: boolean) =>
  first ? `App Language: ${language.english}` : language.english;
