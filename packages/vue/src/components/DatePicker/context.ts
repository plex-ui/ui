import type { DateTime } from "luxon"
import { inject, type InjectionKey } from "vue"

// Vue port of packages/ui/src/components/DatePicker/context.tsx. The values
// are getters over DatePicker's props (read them in render, computed or
// watch to track them); React's `onChangeRef` is a plain function here, as
// Vue props and emits are always current.

export type DateContextValue = {
  readonly value: DateTime | null
  readonly min?: DateTime
  readonly max?: DateTime
  readonly captionLayout: "buttons" | "dropdown"
  readonly showTime: boolean
  readonly yearRange?: [number, number]
  onChange: (nextValue: DateTime | null) => void
}

export const DateContextKey: InjectionKey<DateContextValue> = Symbol("PlexUIDatePicker")

export const useDateContext = () => {
  const context = inject(DateContextKey, null)

  if (!context) {
    throw new Error("Date components must be wrapped in <DatePicker />")
  }

  return context
}
