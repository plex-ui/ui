import { createContext, useContext } from "react"

/**
 * True in a `Field row` whose control ends the row. It stands there beside
 * buttons and tags, so it takes their shape; a field with its label above stays
 * rounded.
 */
export const FieldRowContext = createContext(false)

/** True when the control ends a `Field row`. */
export const useFieldRow = () => useContext(FieldRowContext)

/** True in a `FieldGroup columns`, where every value starts at one column. */
export const FieldColumnsContext = createContext(false)

/** True when the control's value starts at the column of a `FieldGroup columns`. */
export const useFieldColumns = () => useContext(FieldColumnsContext)

/** The control's own `pill`, or else the shape of its row. */
export const useFieldRowPill = (pill: boolean | undefined) => {
  const inRow = useFieldRow()
  return pill ?? inRow
}
