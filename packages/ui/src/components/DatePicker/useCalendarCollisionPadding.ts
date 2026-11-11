import { useEffect, useMemo, useState } from "react"

export type CalendarCollisionPadding = { top: number; right: number; bottom: number; left: number }

// The calendar's collision padding on a phone. Seven 44px days leave the rest of the width to two outer and two
// inner gutters (Calendar.module.css uses the same gutter for its width), and the calendar keeps that gutter above
// and below. Where the 328px calendar fits with room to spare, its sides keep up to 32px from the screen's edges, as
// iOS 27.2 keeps the compact date picker's calendar 32pt from the edge it would cross (UIKit and Calendar on an
// iPhone 17).
export const calendarCollisionPadding = (width: number): CalendarCollisionPadding => {
  const gutter = Math.max(3, Math.min(16, (width - 308) / 4))
  const side = Math.max(gutter, Math.min(32, (width - 328) / 2))
  return { top: gutter, right: side, bottom: gutter, left: side }
}

// The root's client width leaves out a classic scrollbar, as the popover's own viewport does; a document with no
// layout (0) falls back to the window's width.
const viewportWidth = () => document.documentElement.clientWidth || window.innerWidth

export const useCalendarCollisionPadding = (): CalendarCollisionPadding => {
  const [width, setWidth] = useState<number>()

  useEffect(() => {
    const update = () => setWidth(viewportWidth())
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return useMemo(() => (width === undefined ? { top: 16, right: 16, bottom: 16, left: 16 } : calendarCollisionPadding(width)), [width])
}
