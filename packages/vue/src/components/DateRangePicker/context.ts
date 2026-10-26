import type { DateTime } from "luxon"
import { inject, type InjectionKey } from "vue"
import type { ControlSize } from "@plexui/styles/types"
import type { DropdownIconType } from "../SelectControl/index.js"
import type { DateRange, DateRangeShortcut } from "./types.js"

// Vue port of packages/ui/src/components/DateRangePicker/context.tsx. The
// values are getters over DateRangePicker's props (read them in render,
// computed or watch to track them); React's `onChangeRef` is a plain
// function here, as Vue props and emits are always current.

export type DateRangeContextValue = {
  readonly value: DateRange | null
  readonly min?: DateTime
  readonly max?: DateTime
  readonly maxRangeDays?: number
  readonly triggerStepperUnit?: "month"
  readonly triggerClassName?: string
  readonly triggerShowIcon?: boolean
  readonly triggerDateFormat: string
  readonly disabled: boolean
  readonly variant?: "soft" | "outline" | "ghost"
  readonly pill: boolean
  readonly block: boolean
  readonly size?: ControlSize
  readonly dropdownIconType?: DropdownIconType
  readonly clearable: boolean
  readonly placeholder: string
  readonly shortcuts?: DateRangeShortcut[]
  onChange: (nextValue: DateRange | null, shortcut?: DateRangeShortcut) => void
}

export const DateRangeContextKey: InjectionKey<DateRangeContextValue> = Symbol("PlexUIDateRangePicker")

export const useDateRangeContext = () => {
  const context = inject(DateRangeContextKey, null)

  if (!context) {
    throw new Error("DateRange components must be wrapped in <DateRangePicker />")
  }

  return context
}
