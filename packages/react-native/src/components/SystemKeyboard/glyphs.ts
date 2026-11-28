import { createIcon, type IconComponent, type IconNode } from "../Icon/createIcon"

/**
 * iOS 26's keyboard glyphs, drawn to the iOS 26.2 simulator's keyboard key by key (Messages, iPhone 17 Pro, @3x): each
 * glyph's box within about half a point and its ink (the darkness it lays on its key) within 2 to 4%. The shapes are the kit's own simple
 * outlines (a wide arrow, a tag, a return with its hook, a grinning face, a globe with its meridians, a microphone) in
 * the iOS proportions; the strokes come out at about 1.5pt on the keys and 1.5 to 1.7pt for the globe and the microphone on
 * the panel. `width` is the stroke in the 24 grid, at the size each key draws the glyph.
 */
function stroked(name: string, width: number, paths: string[], extra: IconNode[] = []): IconComponent {
  return createIcon(name, "0 0 24 24", [
    ...paths.map((d): IconNode => ["path", { d, fill: "none", stroke: 0, strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round" }]),
    ...extra,
  ])
}

/** A shape filled, its corners rounded by a stroke of its own color */
function filled(name: string, width: number, paths: string[], extra: IconNode[] = []): IconComponent {
  return createIcon(name, "0 0 24 24", [
    ...paths.map((d): IconNode => ["path", { d, fill: 0, stroke: 0, strokeWidth: width, strokeLinejoin: "round" }]),
    ...extra,
  ])
}

export const IOS_GLYPH_SIZE = {
  shift: 24.2,
  shiftOn: 23.5,
  delete: 25.2,
  deletePad: 28.9,
  emoji: 23.2,
  return: 24.4,
  chevron: 24,
  arrow: 24,
  done: 26,
  globe: 33.8,
  mic: 32.2,
} as const

/** The shift: a wide arrow, its head as wide as the glyph, on a short stem */
const SHIFT = "M12 4.9L2.9 14H8V20.8H16V14H21.1Z"
/** Held for a capital: the same arrow filled, a little higher in its box (the fill rounds its corners wider) */
const SHIFT_FILLED = "M12 4.2L2.9 13.3H8V20.1H16V13.3H21.1Z"
/** Caps Lock: the arrow shorter, over a bar */
const SHIFT_LOCK = "M12 3.6L3.6 12H8V16.2H16V12H20.4Z"
/** A tag pointing left, a cross in it */
const DELETE = ["M20 5.3a1.2 1.2 0 0 1 1.2 1.2v12.4a1.2 1.2 0 0 1 -1.2 1.2H10.4L3.4 13.3a0.9 0.9 0 0 1 0 -1.2L10.4 5.3Z", "M12.4 9.3l6.8 6.8M19.2 9.3l-6.8 6.8"]

export const IosShift = stroked("KeyboardShift", 1.47, [SHIFT])
export const IosShiftOn = filled("KeyboardShiftOn", 1.8, [SHIFT_FILLED])
export const IosShiftLock = filled("KeyboardShiftLock", 1.5, [SHIFT_LOCK], [["rect", { x: 8, y: 18.6, width: 8, height: 2.4, rx: 0.8, fill: 0 }]])
export const IosDelete = stroked("KeyboardDelete", 1.374, DELETE)
// The number pad's larger delete keeps the letters' 1.27pt stroke
export const IosDeletePad = stroked("KeyboardDeletePad", 1.199, DELETE)
export const IosEmoji = stroked(
  "KeyboardEmoji",
  1.553,
  ["M3 11.2a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M6.7 12.3h10.6a5.3 4.8 0 0 1 -10.6 0z"],
  [
    ["ellipse", { cx: 8.9, cy: 8.6, rx: 1.05, ry: 1.35, fill: 0 }],
    ["ellipse", { cx: 15.1, cy: 8.6, rx: 1.05, ry: 1.35, fill: 0 }],
  ],
)
/** At night: the face filled, its eyes and mouth cut out of it (an even-odd fill) */
export const IosEmojiFilled = createIcon("KeyboardEmojiFilled", "0 0 24 24", [
  [
    "path",
    {
      d: "M2.2 11.2a9.8 9.8 0 1 0 19.6 0a9.8 9.8 0 1 0 -19.6 0Z M7.85 8.6a1.05 1.35 0 1 0 2.1 0a1.05 1.35 0 1 0 -2.1 0Z M14.05 8.6a1.05 1.35 0 1 0 2.1 0a1.05 1.35 0 1 0 -2.1 0Z M6.7 12.3h10.6a5.3 4.8 0 0 1 -10.6 0Z",
      fill: 0,
      fillRule: "evenodd",
    },
  ],
])
export const IosReturn = stroked("KeyboardReturn", 1.514, ["M13.1 4.4H20a1 1 0 0 1 1 1v7.35a1 1 0 0 1 -1 1H3", "M8.9 7.9L3 13.75L8.9 19.6"])
/** The stroke at a drawn size for a weight in points, for the return key's actions */
const at = (points: number, size: number) => +((points * 24) / size).toFixed(3)
const S = IOS_GLYPH_SIZE
export const IosNext = stroked("KeyboardNext", at(1.7, S.chevron), ["M9 6l6 6l-6 6"])
export const IosGo = stroked("KeyboardGo", at(1.7, S.arrow), ["M5 12l14 0", "M13 18l6 -6", "M13 6l6 6"])
export const IosSearch = stroked("KeyboardSearch", at(1.7, S.arrow), ["M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "M21 21l-6 -6"])
export const IosSend = stroked("KeyboardSend", at(1.7, S.arrow), ["M12 5l0 14", "M18 11l-6 -6", "M6 11l6 -6"])
export const IosDone = stroked("KeyboardDone", at(1.7, S.done), ["M5 12l5 5l10 -10"])
export const IosGlobe = stroked("KeyboardGlobe", 1.063, [
  "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  "M12 3v18",
  "M3 12h18",
  "M12 3a4.6 9 0 0 0 0 18a4.6 9 0 0 0 0 -18",
  "M4.9 6.9c4.4 2.3 9.8 2.3 14.2 0",
  "M4.9 17.1c4.4 -2.3 9.8 -2.3 14.2 0",
])
export const IosMic = stroked("KeyboardMic", 1.253, ["M9.5 4.5a2.5 2.5 0 0 1 5 0v7.2a2.5 2.5 0 0 1 -5 0z", "M5.7 8.5v1.5a6.3 6.3 0 0 0 12.6 0v-1.5", "M12 16.3v4.6", "M7.6 20.9h8.8"])
