import { createContext } from "react"

/** The end of a List row, as its control sees it. */
export type RowEnd = {
  /**
   * A control that fills the row's end calls it (a field): the end takes the room after the label, the label its own
   * width, as the web's row lays out a field (`[data-row]`: the label's column, then the control's).
   */
  fill: (on: boolean) => void
  /**
   * A control that opens from its row hands the row its press, or `null` to take it back (a select on Android, as
   * an Android value row opens its choice from anywhere on the row). Rows that do not offer it leave it out.
   */
  press?: (open: (() => void) | null) => void
}

/**
 * Inside the end of a List row. On iOS a control there takes the row's look, as the web's controls in a `[data-row]` do.
 * A pop-up shows its value in the row's type with the menu picker's chevrons and no field of its own; a field is the
 * row's value (no frame, its text at the end, the placeholder in the tertiary label); a checkbox's target reaches past
 * its circle, which keeps the row's edge. On Android a field still fills the room after the label.
 */
export const RowEndContext = createContext<RowEnd | null>(null)

/**
 * A pressable List row's hold, for the control at its end: the control takes its own touches (a switch's drag, a
 * checkbox's toggle) and tells the row while a finger is on it, so the row shows its press. iOS lights a held choice
 * row (a check or a radio), not a switch row; Android's list selector shows for a touch anywhere on the row.
 */
export const RowHoldContext = createContext<((held: boolean) => void) | null>(null)

/** A control's press handlers that hold its row while a finger is on it (none outside a pressable row). */
export function rowHold(hold: ((held: boolean) => void) | null) {
  return hold ? { onPressIn: () => hold(true), onPressOut: () => hold(false) } : null
}
