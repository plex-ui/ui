import { createContext, useContext } from "react"

/**
 * True inside a BottomSheet: an iOS sheet's own search field draws its magnifier and its hint in one gray, darker than
 * a bar's hint (IMG_5491), where a bar's magnifier is the text color (IMG_5737).
 */
export const InSheetContext = createContext(false)

/**
 * How far a floating sheet stands over the screen's bottom (8 on iOS): a bottom Toolbar in it takes the safe area under
 * it less these, so its items keep their place over the home indicator. An overlay opened from the sheet sets it back to 0.
 */
export const SheetFloatInsetContext = createContext(0)

/**
 * How far the sheet around the caller floats over the screen's bottom: 8 in a floating iOS sheet, 0 in a sheet at the
 * edges (a large one, one whose content reached the top, or Android's) and outside a sheet. Chrome of an app's own
 * that sits on the safe area (a footer over the home indicator, a bottom search field) takes the safe area less this.
 */
export function useSheetFloatInset() {
  return useContext(SheetFloatInsetContext)
}
