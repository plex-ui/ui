import { createContext, useContext } from "react"

/**
 * True in a `Field row` whose control ends the row. It stands there beside
 * buttons and tags, so it takes their shape; a field with its label above stays
 * rounded.
 */
export const FieldRowContext = createContext(false)

/** The control's own `pill`, or else the shape of its row. */
export const useFieldRowPill = (pill: boolean | undefined) => {
  const inRow = useContext(FieldRowContext)
  return pill ?? inRow
}
