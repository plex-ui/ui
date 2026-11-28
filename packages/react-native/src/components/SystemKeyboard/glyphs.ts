import { createIcon, type IconComponent, type IconNode } from "../Icon/createIcon"

/**
 * iOS 26's keyboard glyphs are light, a stroke of about 1.4pt at their drawn size: the kit's Tabler icons drawn from
 * their stroked outlines (@tabler/icons, outline) with a stroke that gives that weight at the size each key draws them
 * (`width` is in the 24 grid, so it is the stroke in points times 24 over the size). The kit's filled outlines keep a 2
 * stroke at 24 and came out about twice as heavy.
 */
function stroked(name: string, width: number, paths: string[], extra: IconNode[] = []): IconComponent {
  return createIcon(name, "0 0 24 24", [
    ...paths.map((d): IconNode => ["path", { d, fill: "none", stroke: 0, strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round" }]),
    ...extra,
  ])
}

/** The stroke at a drawn size for a weight in points */
const at = (points: number, size: number) => +((points * 24) / size).toFixed(3)

export const IOS_GLYPH_SIZE = {
  shift: 21,
  delete: 27,
  deletePad: 31,
  emoji: 25,
  return: 28,
  chevron: 24,
  arrow: 24,
  done: 26,
  globe: 32,
  mic: 33,
} as const

const S = IOS_GLYPH_SIZE
const ARROW_BIG_UP = "M9 20v-8h-3.586a1 1 0 0 1 -.707 -1.707l6.586 -6.586a1 1 0 0 1 1.414 0l6.586 6.586a1 1 0 0 1 -.707 1.707h-3.586v8a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1"
const BACKSPACE = ["M20 6a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-11l-5 -5a1.5 1.5 0 0 1 0 -2l5 -5l11 0", "M12 10l4 4m0 -4l-4 4"]

export const IosShift = stroked("KeyboardShift", at(1.5, S.shift), [ARROW_BIG_UP])
export const IosDelete = stroked("KeyboardDelete", at(1.5, S.delete), BACKSPACE)
export const IosDeletePad = stroked("KeyboardDeletePad", at(1.5, S.deletePad), BACKSPACE)
export const IosEmoji = stroked(
  "KeyboardEmoji",
  at(1.6, S.emoji),
  ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M9.5 15a3.5 3.5 0 0 0 5 0"],
  [
    ["circle", { cx: 9, cy: 9.75, r: 1.1, fill: 0 }],
    ["circle", { cx: 15, cy: 9.75, r: 1.1, fill: 0 }],
  ],
)
export const IosReturn = stroked("KeyboardReturn", at(1.5, S.return), ["M18 6v6a3 3 0 0 1 -3 3h-10l4 -4m0 8l-4 -4"])
export const IosNext = stroked("KeyboardNext", at(1.7, S.chevron), ["M9 6l6 6l-6 6"])
export const IosGo = stroked("KeyboardGo", at(1.7, S.arrow), ["M5 12l14 0", "M13 18l6 -6", "M13 6l6 6"])
export const IosSearch = stroked("KeyboardSearch", at(1.7, S.arrow), ["M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "M21 21l-6 -6"])
export const IosSend = stroked("KeyboardSend", at(1.7, S.arrow), ["M12 5l0 14", "M18 11l-6 -6", "M6 11l6 -6"])
export const IosDone = stroked("KeyboardDone", at(1.7, S.done), ["M5 12l5 5l10 -10"])
export const IosGlobe = stroked("KeyboardGlobe", at(1.4, S.globe), [
  "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0",
  "M3.6 9h16.8",
  "M3.6 15h16.8",
  "M11.5 3a17 17 0 0 0 0 18",
  "M12.5 3a17 17 0 0 1 0 18",
])
export const IosMic = stroked("KeyboardMic", at(1.5, S.mic), [
  "M9 5a3 3 0 0 1 3 -3a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3a3 3 0 0 1 -3 -3l0 -5",
  "M5 10a7 7 0 0 0 14 0",
  "M8 21l8 0",
  "M12 17l0 4",
])
