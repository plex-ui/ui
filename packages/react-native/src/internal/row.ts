import { createContext } from "react"
import { Platform, type GestureResponderEvent } from "react-native"

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
  /**
   * Where a field's text stands: at the row's `end` (a row's value), or at the `start` of its own column (a List with
   * `columns`, the web's `[data-field-columns]`). @default "end"
   */
  align?: "start" | "end"
  /**
   * The field is a line of its own under the row's label, or alone in the row (the web's `Field row` with
   * `orientation="vertical"` or `hideLabel`): no frame on either platform, the text from the row's text start, as
   * tall as its lines.
   */
  stacked?: boolean
  /** The row's value color, which a select at its end takes for its value. @default the platform's */
  valueColor?: "secondary" | "accent"
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
export const RowHoldContext = createContext<((held: boolean, event?: GestureResponderEvent) => void) | null>(null)

/**
 * Inside the start of a List row: a RadioGroup option given as the row's `leading` (a list of choices with the mark
 * first, as a language list). The option draws its mark alone, taking no more room than the mark.
 */
export const RowStartContext = createContext(false)

/**
 * A List row as a menu opened from inside it sees the row: Android dims the screen around the row, which stays lit, and
 * sets the popup under it.
 */
export type RowFrame = {
  /** The row's view, measured as the menu opens. */
  node: { current: unknown }
  /** The radius of the row's top and of its bottom corners: the card's, where the row meets the card's edge. */
  radius: { top: number; bottom: number }
}

export const RowFrameContext = createContext<RowFrame | null>(null)

/** A control's press handlers that hold its row while a finger is on it (none outside a pressable row). */
export function rowHold(hold: ((held: boolean, event?: GestureResponderEvent) => void) | null) {
  // The touch goes with the hold: Android's row ripples from it
  return hold ? { onPressIn: (event: GestureResponderEvent) => hold(true, event), onPressOut: () => hold(false) } : null
}

/** A List row's touch and hold, for the control at its end, which takes the row's touches and its screen reader focus. */
/** A row's touch and hold (`run`, named by `label`) and its press's hint, for the control that takes the row's focus. */
export type RowAction = { run?: () => void; label?: string; hint?: string; hintId?: string }

/**
 * Set by a row with `onLongPress`: a control at its end that takes its own touches (a checkbox, a switch, a choice)
 * holds for the row, and a screen reader, which reaches the control and never the row, finds the action there.
 */
export const RowActionContext = createContext<RowAction | null>(null)

type AccessibilityActionEvent = { nativeEvent: { actionName: string } }

/**
 * A control's touch and hold: its own `onLongPress`, or its row's. Half a second, as UIKit's and a ContextMenu's;
 * a screen reader's `longpress` action named by `label` (VoiceOver reads it, "Show meaning", not the bare name).
 * Merges the control's own actions (`actions`, handled by `onAction`).
 */
export function holdProps(
  own: { run?: () => void; label?: string },
  row: RowAction | null,
  actions: { name: string; label?: string }[] = [],
  onAction?: (event: AccessibilityActionEvent) => void,
) {
  const run = own.run ?? row?.run
  if (run == null) return actions.length > 0 ? { accessibilityActions: actions, onAccessibilityAction: onAction } : {}
  const label = own.run != null ? own.label : row?.label
  return {
    onLongPress: run,
    delayLongPress: 500,
    accessibilityActions: [...actions, { name: "longpress", ...(label != null ? { label } : null) }],
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "longpress") run()
      else onAction?.(event)
    },
  }
}

/**
 * The row's hint on the control that takes the row's focus, kept with the control's own description: a phone reads
 * both as one hint; on the web the control is described by its description and the row's unseen hint text.
 */
export function rowHint(row: RowAction | null, described: { id?: string; props: { accessibilityHint?: string } }) {
  if (row?.hint == null) return null
  if (Platform.OS === "web") return row.hintId != null ? { "aria-describedby": [described.id, row.hintId].filter(Boolean).join(" ") } : null
  const own = described.props.accessibilityHint
  return { accessibilityHint: own ? `${own}. ${row.hint}` : row.hint }
}
