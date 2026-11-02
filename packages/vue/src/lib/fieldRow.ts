import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue"

// Vue port of packages/ui/src/lib/fieldRow.ts.

/**
 * True in a `Field row` whose control ends the row. It stands there beside
 * buttons and tags, so it takes their shape; a field with its label above stays
 * rounded.
 */
const FieldRowKey: InjectionKey<ComputedRef<boolean>> = Symbol("PlexUIFieldRow")

export const provideFieldRow = (inRow: () => boolean) => provide(FieldRowKey, computed(inRow))

/** The control's own `pill`, or else the shape of its row. */
export const useFieldRowPill = (pill: () => boolean | undefined) => {
  const inRow = inject(FieldRowKey, null)
  return computed(() => pill() ?? inRow?.value ?? false)
}
