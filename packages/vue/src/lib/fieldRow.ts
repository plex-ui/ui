import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue"

// Vue port of packages/ui/src/lib/fieldRow.ts.

/**
 * True in a `Field row` whose control ends the row. It stands there beside
 * buttons and tags, so it takes their shape; a field with its label above stays
 * rounded.
 */
const FieldRowKey: InjectionKey<ComputedRef<boolean>> = Symbol("PlexUIFieldRow")

export const provideFieldRow = (inRow: () => boolean) => provide(FieldRowKey, computed(inRow))

/** True when the control ends a `Field row`. */
export const useFieldRow = () => {
  const inRow = inject(FieldRowKey, null)
  return computed(() => inRow?.value ?? false)
}

/** True in a `FieldGroup columns`, where every value starts at one column. */
const FieldColumnsKey: InjectionKey<ComputedRef<boolean>> = Symbol("PlexUIFieldColumns")

export const provideFieldColumns = (columns: () => boolean) => provide(FieldColumnsKey, computed(columns))

/** True when the control's value starts at the column of a `FieldGroup columns`. */
export const useFieldColumns = () => {
  const columns = inject(FieldColumnsKey, null)
  return computed(() => columns?.value ?? false)
}

/** The control's own `pill`, or else the shape of its row. */
export const useFieldRowPill = (pill: () => boolean | undefined) => {
  const inRow = useFieldRow()
  return computed(() => pill() ?? inRow.value)
}
