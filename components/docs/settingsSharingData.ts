/** Nearby sharing settings, as AirDrop lays them out (IMG_5955): who may send, two switches and a known-contacts page. */
export type SharingSettings = { receiving: string; together: boolean; cellular: boolean };

export const receivingOptions = [
  { value: 'off', label: 'Receiving Off' },
  { value: 'contacts', label: 'Contacts Only' },
  { value: 'everyone', label: 'Everyone for 10 Minutes' },
];

export const initialSharing: SharingSettings = { receiving: 'contacts', together: true, cellular: true };
