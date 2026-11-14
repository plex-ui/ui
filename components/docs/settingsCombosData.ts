/** Neutral samples for the combination screens of Forms: Settings. Each screen lays one kind of row out in every
 * combination iOS 27.2 Settings uses, with plain words in place of a real app's (Row, Header, Footer), as a gap
 * check on the simulator does. */

export const offOnOptions = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

/** Rows with a control at their end */
export type RowsValue = { switch: boolean; menu: string; status: boolean; described: boolean; color: string | null; second: string | null };
export const initialRows: RowsValue = { switch: true, menu: 'off', status: false, described: false, color: null, second: null };

/** Sliders and steppers */
export type SlidersValue = { enabled: boolean; slider: number; ends: number; balance: number; stepper: number; number: number };
export const defaultSliders: SlidersValue = { enabled: true, slider: 50, ends: 50, balance: 0, stepper: 3, number: 50 };
/** A balance between two ends, -1 to 1, written with two decimals: 0.00 in the middle */
export const balanceText = (value: number) => value.toFixed(2);

/** One choice */
export const choiceOptions = [
  { value: 'one', label: 'Option 1' },
  { value: 'two', label: 'Option 2' },
  { value: 'three', label: 'Option 3' },
];
export type ChoiceValue = { plain: string; detailed: string };
export const initialChoice: ChoiceValue = { plain: 'one', detailed: 'two' };

/** Pick and order */
export type CheckedRow = { id: string; label: string; on: boolean };
export const initialChecked: CheckedRow[] = [
  { id: 'a', label: 'Row 1', on: true },
  { id: 'b', label: 'Row 2', on: true },
  { id: 'c', label: 'Row 3', on: false },
  { id: 'd', label: 'Row 4', on: false },
];
export const orderedPool = ['Row A', 'Row B', 'Row C', 'Row D', 'Row E'];
export type OrderValue = { checked: CheckedRow[]; ordered: string[] };
export const initialOrder: OrderValue = { checked: initialChecked, ordered: ['Row A', 'Row B'] };

/** Rows with pictures: a tile color for each, so a tile style never draws a white symbol on nothing */
export type PictureRow = { id: string; label: string; symbol: 'key' | 'shield' | 'globe' | 'compass' | 'book' | 'music'; tile: string };
export const switchPictures: PictureRow[] = [
  { id: 'one', label: 'Row 1', symbol: 'key', tile: '#3478f6' },
  { id: 'two', label: 'Row 2', symbol: 'shield', tile: '#34c759' },
];
export const describedPictures: PictureRow[] = [
  { id: 'three', label: 'Row 3', symbol: 'globe', tile: '#ff9f0a' },
  { id: 'four', label: 'Row 4', symbol: 'compass', tile: '#5e5ce6' },
];
export const plainPictures: PictureRow[] = [
  { id: 'five', label: 'Row 5', symbol: 'book', tile: '#af52de' },
  { id: 'six', label: 'Row 6', symbol: 'music', tile: '#ff2d55' },
];
export const initialPictures: Record<string, boolean> = { one: true, two: false, three: true, four: false };
