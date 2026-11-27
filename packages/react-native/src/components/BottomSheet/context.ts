import { createContext } from "react"

/**
 * True inside a BottomSheet: an iOS sheet's own search field draws its magnifier and its hint in one gray, darker than
 * a bar's hint (IMG_5491), where a bar's magnifier is the text color (IMG_5737).
 */
export const InSheetContext = createContext(false)
