import { InputField, type InputProps } from "../Input/Input"

export type TextareaProps = Omit<InputProps, "multiline" | "onClear" | "startAdornment" | "endAdornment" | "pill" | "selectTextOnFocus"> & {
  /** The lines it shows. @default 3 */
  rows?: number
  /** It grows with what is typed, from `rows` lines up to `maxRows`. @default false */
  autoResize?: boolean
  /** The most lines it grows to with `autoResize`, then it scrolls. @default Math.max(rows, 10) */
  maxRows?: number
  /** Selects all its text when it takes focus (TextInput's `selectTextOnFocus`). @default false */
  autoSelect?: boolean
}

/**
 * A text field of several lines: Plex UI's Textarea. It is the Input's field with `multiline` (the same variants, sizes
 * and states, the same frames on both platforms), `rows` lines tall, its text from the top. In a List row (a `Field
 * row`) it is the row's bare value: under its label, or alone, from the row's text start, as the web's on a phone.
 * iOS: the field's 17/22 lines, 11 above and below them in a frame; Android: the outlined field's 17/20 lines, a
 * label floating in its frame inside a Field.
 */
export function Textarea({ rows = 3, autoResize = false, maxRows, autoSelect = false, ...rest }: TextareaProps) {
  return <InputField {...rest} multiline rows={rows} autoResize={autoResize} maxRows={maxRows} selectTextOnFocus={autoSelect} />
}
