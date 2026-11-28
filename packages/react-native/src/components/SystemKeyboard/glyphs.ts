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
  deletePad: 30.6,
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
/**
 * Held for a capital: the same arrow filled, a little higher in its box (the fill rounds its corners wider) and 0.75pt
 * left of the key's middle, as iOS sets it
 */
const SHIFT_FILLED = "M11.22 4.2L2.12 13.3H7.22V20.1H15.22V13.3H20.32Z"
/** Caps Lock: the arrow shorter, over a bar, where the held arrow stands */
const SHIFT_LOCK = "M11.22 3.6L2.82 12H7.22V16.2H15.22V12H19.62Z"
/**
 * A tag pointing left, its point and its far corners rounded, a cross in it as far from its far side as from its top
 * and its bottom (iOS's: the cross stands left of the body's middle)
 */
const DELETE = ["M9.97 5.02H19.5A1.8 1.8 0 0 1 21.3 6.82V18.14A1.8 1.8 0 0 1 19.5 19.94H9.97L3.58 13.34A1.22 1.22 0 0 1 3.58 11.62Z", "M10.82 9.34L17.1 15.62M17.1 9.34L10.82 15.62"]

export const IosShift = stroked("KeyboardShift", 1.47, [SHIFT])
export const IosShiftOn = filled("KeyboardShiftOn", 1.8, [SHIFT_FILLED])
export const IosShiftLock = filled("KeyboardShiftLock", 1.5, [SHIFT_LOCK], [["rect", { x: 7.22, y: 18.6, width: 8, height: 2.4, rx: 0.8, fill: 0 }]])
export const IosDelete = stroked("KeyboardDelete", 1.374, DELETE)
/** The number pad's: the same tag, larger, in the middle of its key (the letters' is set a little low) */
const DELETE_PAD = ["M9.71 4.28H19.24A1.8 1.8 0 0 1 21.04 6.08V17.4A1.8 1.8 0 0 1 19.24 19.2H9.71L3.32 12.6A1.22 1.22 0 0 1 3.32 10.88Z", "M10.56 8.6L16.84 14.88M16.84 8.6L10.56 14.88"]
export const IosDeletePad = stroked("KeyboardDeletePad", 1.105, DELETE_PAD)
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
/** Next: a tall chevron, set high in the return key (2pt over its middle) */
export const IosNext = stroked("KeyboardNext", 1.55, ["M9.61 2.94L14.39 10L9.61 17.06"])
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

/** The phone pad's corner, +*#: a plus, a six-armed asterisk and a hash, each 11pt, drawn in a 12pt box */
function pad(name: string, width: number, paths: string[]): IconComponent {
  return createIcon(name, "0 0 12 12", paths.map((d): IconNode => ["path", { d, fill: "none", stroke: 0, strokeWidth: width }]))
}
export const IosPadPlus = pad("KeyboardPadPlus", 1.67, ["M0.6 6H11.4M6 0.33V11.67"])
export const IosPadStar = pad("KeyboardPadStar", 1.5, ["M6 1V11", "M1.67 3.5L10.33 8.5", "M1.67 8.5L10.33 3.5"])
export const IosPadHash = pad("KeyboardPadHash", 1.38, ["M3.77 1V11M8.23 1V11", "M0.78 3.67H11.22M0.78 8.33H11.22"])

/**
 * The saved passwords' key over a password's keyboard: an upright key, filled, its round head pierced, two teeth on
 * the right of its shaft, a point at its end (the kit's own shape)
 */
export const IosPasswordKey = createIcon("KeyboardPasswordKey", "0 0 24 24", [
  [
    "path",
    {
      d: "M10.45 13.4Q10.45 11.2 8.4 10.15A5.6 5.6 0 1 1 15.6 10.15Q13.55 11.2 13.55 13.4V15.95H14.93V17.55H13.55V20.3H14.55V21.85H13.55V22.3L12 23.75L10.45 22.3Z M12 3.35A1.95 1.95 0 1 0 12 7.25A1.95 1.95 0 1 0 12 3.35Z",
      fill: 0,
    },
  ],
])

// ---------------------------------------------------------------------------------------------------------------------
// Gboard

/**
 * Gboard's glyphs, drawn to the Android 15 emulator's Gboard key by key (Pixel 9, 2.625px a dp): each in a box as large
 * as it draws (28dp on the keys, 34 for the tools over them, 24 for the emoji and the pad's space), its lines where
 * Gboard's stand in its key, so the box's middle is the key's. Lines of about 2dp, as Gboard's.
 */
function gboard(name: string, box: number, width: number, paths: string[], extra: IconNode[] = []): IconComponent {
  return createIcon(name, `0 0 ${box} ${box}`, [
    ...paths.map((d): IconNode => ["path", { d, fill: "none", stroke: 0, strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round" }]),
    ...extra,
  ])
}

/** A shape filled, rounded by a line of its own color */
const solid = (d: string, width: number): IconNode => ["path", { d, fill: 0, stroke: 0, strokeWidth: width, strokeLinejoin: "round" }]

/** The drawn size of each glyph: its box */
export const GBOARD_GLYPH_SIZE = { key: 28, tool: 34, small: 24 } as const

/** The shift: an arrow as wide as its head, its corners rounded, on a wide stem */
const G_SHIFT = "M14.4 3.75L4.4 13.75Q3.85 15.5 5.65 15.5H8.98V22.85H19.82V15.5H23.15Q24.95 15.5 24.4 13.75Z"
export const GboardShift = gboard("GboardShift", 28, 2, [G_SHIFT])
/** Held for a capital: the same arrow filled */
export const GboardShiftOn = createIcon("GboardShiftOn", "0 0 28 28", [solid(G_SHIFT, 2)])
/** Caps Lock: the arrow on a shorter stem, over a bar */
export const GboardShiftLock = createIcon("GboardShiftLock", "0 0 28 28", [
  solid("M14.4 3.75L4.4 13.75Q3.85 15.5 5.65 15.5H8.98V19.5H19.82V15.5H23.15Q24.95 15.5 24.4 13.75Z", 2),
  ["rect", { x: 8.23, y: 21.5, width: 12.34, height: 2.1, rx: 0.6, fill: 0 }],
])
/** Delete: a tag pointing left, its far corners rounded, a cross right of its middle */
export const GboardDelete = gboard("GboardDelete", 28, 2.2, [
  "M8.74 4.8H23.38A1.4 1.4 0 0 1 24.78 6.2V21.4A1.4 1.4 0 0 1 23.38 22.8H8.74L1.71 13.8Z",
  "M12.4 10.5L19 17.1M19 10.5L12.4 17.1",
])
/** Return in a field of several lines: an arrow left, its line turned up at the far end */
export const GboardReturn = gboard("GboardReturn", 28, 2.08, ["M4.82 14H21.82A2 2 0 0 0 23.82 12V8.15", "M10.6 8.2L4.82 14L10.6 19.8"])
/** Go: a long arrow with a small head */
export const GboardGo = gboard("GboardGo", 28, 2, ["M5.48 14.21H22.52", "M17.62 9.31L22.52 14.21L17.62 19.11"])
/** Next: an arrow to a bar */
export const GboardNext = gboard("GboardNext", 28, 2, ["M2.83 14.21H21.01", "M15.31 8.51L21.01 14.21L15.31 19.91", "M25.59 7.78V20.64"])
/** Done: a wide check */
export const GboardDone = gboard("GboardDone", 28, 2, ["M5.49 14.39L11.02 19.87L22.93 8.17"])
/** Search: a lens, its handle long */
export const GboardSearch = gboard("GboardSearch", 28, 2, ["M3.97 10.97a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "M15.92 15.92L23.69 23.69"])
/** Send: a dart, filled, notched at its back */
export const GboardSend = createIcon("GboardSend", "0 0 28 28", [solid("M3.83 5.71L23.83 14.21L3.83 22.71V15.91L12.33 14.21L3.83 12.51Z", 0.9)])
/** The pad's space: a bracket opening up */
export const GboardSpace = gboard("GboardSpace", 24, 1.95, ["M5.24 9.94V12.56A1.5 1.5 0 0 0 6.74 14.06H17.26A1.5 1.5 0 0 0 18.76 12.56V9.94"])
/** The pad's dash */
export const GboardDash = createIcon("GboardDash", "0 0 24 24", [["path", { d: "M5.33 15.17H18.67", fill: "none", stroke: 0, strokeWidth: 2.2 }]])
/** The emoji: a grinning face, its eyes filled, its mouth an open half moon */
export const GboardEmoji = gboard(
  "GboardEmoji",
  24,
  2,
  ["M2.92 12a8.9 8.9 0 1 0 17.8 0a8.9 8.9 0 1 0 -17.8 0"],
  [
    ["ellipse", { cx: 8.32, cy: 9.47, rx: 1.2, ry: 1.42, fill: 0 }],
    ["ellipse", { cx: 15.32, cy: 9.47, rx: 1.2, ry: 1.42, fill: 0 }],
    ["path", { d: "M8.02 14.2H15.62A3.8 3.15 0 0 1 8.02 14.2Z", fill: 0 }],
  ],
)

// The tools over the keys, in their 34dp cells
/** Apps: four squares, filled */
export const GboardApps = createIcon("GboardApps", "0 0 34 34", [
  ["rect", { x: 7.18, y: 7.56, width: 8.2, height: 8.2, rx: 2.3, fill: 0 }],
  ["rect", { x: 17.75, y: 7.56, width: 8.2, height: 8.2, rx: 2.3, fill: 0 }],
  ["rect", { x: 7.18, y: 18.14, width: 8.2, height: 8.2, rx: 2.3, fill: 0 }],
  ["rect", { x: 17.75, y: 18.14, width: 8.2, height: 8.2, rx: 2.3, fill: 0 }],
])
/** Stickers: a square sticker, its corner peeling, a winking face on it */
export const GboardSticker = gboard(
  "GboardSticker",
  34,
  1.8,
  ["M10.28 9.14H23.8A1.3 1.3 0 0 1 25.1 10.44V21.4L21.2 25.35H10.28A1.3 1.3 0 0 1 8.98 24.05V10.44A1.3 1.3 0 0 1 10.28 9.14Z", "M18.3 13.7Q19.4 12.7 20.7 13.2"],
  [
    solid("M21.2 25.35V22.9Q21.2 21.4 22.7 21.4H25.1Z", 1),
    ["ellipse", { cx: 13.5, cy: 15.2, rx: 1.35, ry: 1, fill: 0 }],
    ["path", { d: "M13.2 18.9Q17.4 18.9 20.9 16.7Q20.2 20.5 16.6 20.5Q14.2 20.5 13.2 18.9Z", fill: 0 }],
  ],
)
/** The clipboard: a board, its clip a ring on its top, three lines of text on it */
export const GboardClipboard = gboard(
  "GboardClipboard",
  34,
  2.1,
  ["M10.15 9.27H23.37A1.2 1.2 0 0 1 24.57 10.47V23.68A1.2 1.2 0 0 1 23.37 24.88H10.15A1.2 1.2 0 0 1 8.95 23.68V10.47A1.2 1.2 0 0 1 10.15 9.27Z", "M13.7 13.14H19.8M13.7 17.14H19.8M13.7 21.14H17.2"],
  [["path", { d: "M14.73 8.42a1.97 1.97 0 1 0 3.94 0a1.97 1.97 0 1 0 -3.94 0Z M16.05 8.42a0.65 0.65 0 1 0 1.3 0a0.65 0.65 0 1 0 -1.3 0Z", fill: 0, fillRule: "evenodd" }]],
)
/** Settings: a cog of six teeth, filled, pierced */
export const GboardSettings = createIcon("GboardSettings", "0 0 34 34", [
  [
    "path",
    {
      d: "M14.51 8.31C15.05 7.41 16.02 6.85 17.07 6.85H17.83C18.88 6.85 19.85 7.41 20.38 8.31L21.13 9.58C21.31 9.88 21.63 10.07 21.97 10.07L23.44 10.08C24.49 10.09 25.45 10.65 25.98 11.56L26.37 12.24C26.89 13.15 26.89 14.26 26.38 15.17L25.65 16.47C25.48 16.77 25.48 17.13 25.65 17.43L26.38 18.73C26.89 19.64 26.89 20.75 26.37 21.66L25.98 22.34C25.45 23.24 24.49 23.81 23.44 23.82L21.97 23.83C21.63 23.83 21.31 24.02 21.13 24.32L20.38 25.59C19.85 26.49 18.88 27.05 17.83 27.05H17.07C16.02 27.05 15.05 26.49 14.51 25.59L13.77 24.32C13.59 24.02 13.27 23.83 12.93 23.83L11.46 23.82C10.41 23.81 9.45 23.24 8.92 22.34L8.53 21.66C8.01 20.75 8.01 19.64 8.52 18.73L9.25 17.43C9.42 17.13 9.42 16.77 9.25 16.47L8.52 15.17C8.01 14.26 8.01 13.15 8.53 12.24L8.92 11.56C9.45 10.65 10.41 10.09 11.46 10.08L12.93 10.07C13.27 10.07 13.59 9.88 13.77 9.58L14.51 8.31Z M13.71 16.95a3.74 3.74 0 1 0 7.48 0a3.74 3.74 0 1 0-7.48 0Z",
      fill: 0,
      fillRule: "evenodd",
    },
  ],
])
/** Themes: a palette, filled, four paints cut out of it */
export const GboardPalette = createIcon("GboardPalette", "0 0 34 34", [
  [
    "path",
    {
      d: "M17.5 6.9C11.93 6.9 7.4 11.43 7.4 17C7.4 22.53 11.88 27.02 17.39 27.08L17.53 27.07C18.53 27.1 19.39 26.52 19.74 25.73C20.11 24.9 19.97 23.79 19.19 23.08L19 22.93C18.47 22.64 18.4 22.22 18.51 21.79C18.63 21.36 18.9 21.03 19.5 21.04H22.04C23.49 21.04 24.88 20.54 25.93 19.6C26.98 18.67 27.6 17.36 27.6 15.99C27.6 10.91 23 6.9 17.5 6.9Z M10.5 16.56a1.45 1.45 0 1 0 2.9 0a1.45 1.45 0 1 0-2.9 0Z M13.49 12.36a1.45 1.45 0 1 0 2.9 0a1.45 1.45 0 1 0-2.9 0Z M18.58 12.36a1.45 1.45 0 1 0 2.9 0a1.45 1.45 0 1 0-2.9 0Z M21.57 16.56a1.45 1.45 0 1 0 2.9 0a1.45 1.45 0 1 0-2.9 0Z",
      fill: 0,
      fillRule: "evenodd",
    },
  ],
])
/** The phone pad's plus, beside its 0: two lines 9.5dp long */
export const GboardPadPlus = createIcon("GboardPadPlus", "0 0 9.52 9.52", [["path", { d: "M0 4.76H9.52M4.76 0V9.52", fill: "none", stroke: 0, strokeWidth: 1.3 }]])
/** Voice typing: a microphone, its head filled, on a cupped stand and a short stem (no foot) */
export const GboardMic = createIcon("GboardMic", "0 0 34 34", [
  ["rect", { x: 14.46, y: 6.83, width: 5.8, height: 11.7, rx: 2.9, fill: 0 }],
  ["path", { d: "M11.36 15.7V16.1A6 6 0 0 0 23.36 16.1V15.7M17.36 22.1V24.9", fill: "none", stroke: 0, strokeWidth: 2, strokeLinecap: "round" }],
])
