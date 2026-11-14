/** The apps that fill passwords, as AutoFill & Passwords lists them (IMG_5952): an app's picture, its name, what it
 * fills, and whether it may. Made-up apps: each picture is a tile with a symbol in it. */
export type AutofillApp = { id: string; name: string; detail: string; tile: string; symbol: 'key' | 'shield' | 'fingerprint' | 'globe' | 'compass' | 'search' };

export const autofillApps: AutofillApp[] = [
  { id: 'passwords', name: 'Passwords', detail: 'Passkeys, passwords, and codes', tile: '#1c1c1e', symbol: 'key' },
  { id: 'vault', name: 'Vault', detail: 'Passkeys, passwords, and codes', tile: '#3478f6', symbol: 'shield' },
  { id: 'keeper', name: 'Keyring', detail: 'Passkeys, passwords, and codes', tile: '#5e5ce6', symbol: 'fingerprint' },
  { id: 'browser', name: 'Browser', detail: 'Passwords (filling only) and passkeys', tile: '#34c759', symbol: 'globe' },
  { id: 'explorer', name: 'Explorer', detail: 'Passwords (filling only)', tile: '#ff9f0a', symbol: 'compass' },
  { id: 'finder', name: 'Search', detail: 'Passwords (filling only)', tile: '#ff3b30', symbol: 'search' },
];

export type AutofillSettings = { autofill: boolean; apps: Record<string, boolean>; strong: boolean };

export const initialAutofill: AutofillSettings = {
  autofill: true,
  apps: { passwords: true, vault: false, keeper: false, browser: true, explorer: false, finder: true },
  strong: true,
};

/** The apps that play with haptics, as Music Haptics lists them (IMG_5963): a glyph and a name, nothing to set. A tile
 * style takes its color. */
export const hapticApps = [
  { id: 'classical', name: 'Classical', symbol: 'book', tile: '#af52de' },
  { id: 'music', name: 'Music', symbol: 'music', tile: '#ff2d55' },
] as const;
