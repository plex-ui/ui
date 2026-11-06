export type ViewOptions = {
  sort: 'name' | 'date' | 'size';
  grouping: 'none' | 'date' | 'kind';
  iconSize: 'small' | 'default' | 'large';
  showExtensions: boolean;
};

type ViewOption<Value extends string> = { value: Value; label: string };

export const sortOptions: ViewOption<ViewOptions['sort']>[] = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'size', label: 'Size' },
];

export const groupingOptions: ViewOption<ViewOptions['grouping']>[] = [
  { value: 'none', label: 'None' },
  { value: 'date', label: 'Date' },
  { value: 'kind', label: 'Kind' },
];

export const iconSizeOptions: ViewOption<ViewOptions['iconSize']>[] = [
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
];

export const initialViewOptions = (): ViewOptions => ({
  sort: 'name', grouping: 'date', iconSize: 'default', showExtensions: true,
});

/** Vue Select emits a string or string[]; accept only one of this field's options. */
export const viewOptionValue = <Value extends string>(options: ViewOption<Value>[], candidate: unknown): Value | undefined =>
  options.find((option) => option.value === candidate)?.value;

export const viewOptionLabel = <Value extends string>(options: ViewOption<Value>[], value: Value): string =>
  options.find((option) => option.value === value)?.label ?? value;

export const extensionNote = 'If you change a filename extension, you may no longer be able to open the file with the app that was used to create it.';
