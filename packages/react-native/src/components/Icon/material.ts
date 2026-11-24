import { createIcon } from "./createIcon"

/**
 * The few Material glyphs the Android look draws where Plex's own icons would read as iOS or at the wrong size
 * (Material Symbols Outlined at weight 400, or the strokes Compose material3 draws itself). Not exported from the
 * package: they belong to the components' Android look, not to the icon sets.
 */

/** `arrow_drop_down`: a sharp 10x5 triangle in a 24dp box (Compose `ExposedDropdownMenuDefaults.TrailingIcon`). */
export const MaterialArrowDropDown = createIcon("MaterialArrowDropDown", "0 0 24 24", [["path", { d: "M7 10l5 5 5-5z", fill: 0 }]])

/** `cancel`: a ring with an X, the clear button of a text field's trailing slot. */
export const MaterialCancel = createIcon("MaterialCancel", "0 -960 960 960", [
  [
    "path",
    {
      d: "m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56Zm144 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z",
      fill: 0,
    },
  ],
])

/** `close`: a 14dp X of 2dp strokes in a 24dp box (`Icons.Filled.Close`, the snackbar's dismiss action, an app bar's close). */
export const MaterialClose = createIcon("MaterialClose", "0 -960 960 960", [["path", { d: "m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z", fill: 0 }]])

/**
 * The checkbox's mark as Compose draws it in an 18dp box (`drawCheck` with the checkbox styling fix, which sizes the
 * box by CheckboxTokens.ContainerSize): from (.25, .5) through (.4, .65) to (.75, .3), a 2dp stroke with square caps.
 */
export const MaterialCheck = createIcon("MaterialCheck", "0 0 18 18", [["path", { d: "M4.5 9L7.2 11.7L13.5 5.4", fill: "none", stroke: 0, strokeWidth: 2, strokeLinecap: "square" }]])

/** The indeterminate mark: the check's ends gravitated to the middle line. */
export const MaterialDash = createIcon("MaterialDash", "0 0 18 18", [["path", { d: "M4.5 9H13.5", fill: "none", stroke: 0, strokeWidth: 2, strokeLinecap: "square" }]])

/** `check`: the Material Symbol a switch's thumb shows on (SettingsLib's `settingslib_expressive_switch_thumb_icon`). */
export const MaterialCheckSymbol = createIcon("MaterialCheckSymbol", "0 -960 960 960", [["path", { d: "M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z", fill: 0 }]])

/**
 * `arrow_back`: the up arrow of an app bar (`Icons.AutoMirrored.Filled.ArrowBack`, AppCompat's
 * `abc_ic_ab_back_material` that Settings' toolbar shows); it is mirrored right to left.
 */
export const MaterialArrowBack = createIcon("MaterialArrowBack", "0 0 24 24", [["path", { d: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z", fill: 0 }]])

/** Material Symbols' chevron_left and chevron_right (24, the outlined weight 400): a month's arrows in the date picker. */
export const MaterialChevronLeft = createIcon("MaterialChevronLeft", "0 -960 960 960", [["path", { d: "M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z", fill: 0 }]])
export const MaterialChevronRight = createIcon("MaterialChevronRight", "0 -960 960 960", [["path", { d: "M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z", fill: 0 }]])

/** Material Symbols' calendar_today and schedule (24, outlined weight 400): the trailing icons of a date and a time field. */
export const MaterialCalendarToday = createIcon("MaterialCalendarToday", "0 -960 960 960", [
  ["path", { d: "M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z", fill: 0 }],
])
export const MaterialSchedule = createIcon("MaterialSchedule", "0 -960 960 960", [
  [
    "path",
    {
      d: "m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z",
      fill: 0,
    },
  ],
])
