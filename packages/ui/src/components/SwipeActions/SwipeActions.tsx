"use client"

import clsx from "clsx"
import {
  type ComponentType,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from "react"
import s from "@plexui/styles/components/SwipeActions/SwipeActions.module.css"
import { useLatestValue } from "../../hooks/useLatestValue"

export type SwipeActionColor =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "info"
  | "discovery"
  | "caution"
  | "warning"

export type SwipeAction = {
  /** Unique ID of the action within its side */
  id: string
  /** Name of the action: shown with `labelPlacement` `"inside"` or `"below"` (and on an action without an icon), and its accessible name always */
  label: string
  /** Icon of the action */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>
  /** Solid color of the action. @default "secondary" */
  color?: SwipeActionColor
  /** Called when the action is pressed, or by a full swipe when it is the first action of its side */
  onSelect?: () => void
}

export type SwipeActionsSide = "leading" | "trailing"

export type SwipeActionsProps = {
  /** Actions revealed by a swipe toward the trailing edge, the first one at the leading edge */
  leading?: SwipeAction[]
  /** Actions revealed by a swipe toward the leading edge, the first one at the trailing edge */
  trailing?: SwipeAction[]
  /** Where the actions show their labels: `"hidden"` (symbols only), `"inside"` the capsule, or `"below"` it (for rows of 60px and taller, as iOS sets them). @default "hidden" */
  labelPlacement?: "hidden" | "inside" | "below"
  /** A swipe past the middle between the open actions and the far edge runs the first action of that side. @default true */
  fullSwipe?: boolean
  /** CSS classes applied to the row */
  className?: string
  /** The content of the row */
  children?: ReactNode
}

/** A finger has to travel this far, and farther across than down, before the row follows it. */
const SLOP = 10

/** The width an open row moves by is the border box of its actions, edge and content gaps included. */
const BORDER_BOX: ResizeObserverOptions = { box: "border-box" }

/** Controls that take a horizontal drag themselves. */
const OWN_DRAG = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]'

type Gesture = {
  pointerId: number
  x: number
  y: number
  start: number
  /** Undecided while within the slop, then a swipe (true) or a scroll (false). */
  swiping: boolean | undefined
  rtl: boolean
  widths: Record<SwipeActionsSide, number>
  rowWidth: number
  /** Removes the listeners for the end of the gesture. */
  detach: () => void
}

/** The open row: opening another one closes it, as a list keeps one row open. */
let closeOpenRow: (() => void) | null = null

/** The row keeps the finger past its edges; a pointer that is no longer active (it lifted between events) cannot be held. */
const capture = (element: Element, pointerId: number) => {
  try {
    element.setPointerCapture?.(pointerId)
  } catch {
    // The swipe goes on with the events the row still gets.
  }
}

const sideOf = (offset: number): SwipeActionsSide | undefined =>
  offset > 0 ? "leading" : offset < 0 ? "trailing" : undefined

/**
 * Where the content goes for a swipe of `raw` px toward the trailing edge (negative: toward the leading edge), and
 * whether that is a full swipe. A side without actions stays shut. Past its actions the content follows the finger
 * where a full swipe is allowed, and a third as fast where it is not; past the middle between the open actions and
 * the far edge of the row the swipe is full.
 */
export const swipeActionsOffset = (
  raw: number,
  widths: Record<SwipeActionsSide, number>,
  rowWidth: number,
  fullSwipe: boolean,
): { offset: number; full: boolean } => {
  const side = sideOf(raw)
  const width = side ? widths[side] : 0
  if (!side || !(width > 0)) return { offset: 0, full: false }
  const sign = Math.sign(raw)
  const distance = Math.abs(raw)
  if (distance <= width) return { offset: raw, full: false }
  if (!fullSwipe) return { offset: sign * (width + (distance - width) / 3), full: false }
  const travel = Math.min(distance, Math.max(width, rowWidth))
  return { offset: sign * travel, full: travel >= (width + rowWidth) / 2 }
}

/**
 * Actions behind a row of a list, as the swipe actions of an iOS list: a swipe toward the leading edge reveals the
 * trailing actions, a swipe toward the trailing edge the leading ones, and a full swipe runs the first action of
 * that side. The row is a `data-row` of a FieldGroup. Each action is also a button in the order of the screen, and
 * the focus on one shows its side.
 */
export function SwipeActions({
  leading = [],
  trailing = [],
  labelPlacement = "hidden",
  fullSwipe = true,
  className,
  children,
}: SwipeActionsProps) {
  const [offset, setOffset] = useState(0)
  const [full, setFull] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const [rtl, setRtl] = useState(false)
  const [round, setRound] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const sides = useRef<Record<SwipeActionsSide, HTMLDivElement | null>>({ leading: null, trailing: null })
  const gesture = useRef<Gesture | null>(null)
  const current = useRef({ offset: 0, full: false })
  const suppressClick = useRef(false)
  const observer = useRef<ResizeObserver | null>(null)
  const actionsRef = useLatestValue({ leading, trailing })
  const revealed = sideOf(offset)

  const widthOf = (side: SwipeActionsSide) => sides.current[side]?.getBoundingClientRect().width ?? 0

  const isRtl = () => !!root.current && getComputedStyle(root.current).direction === "rtl"

  const move = (next: number, nextFull = false) => {
    current.current = { offset: next, full: nextFull }
    setOffset(next)
    setFull(nextFull)
  }

  /** Lets go of the gesture: the listeners for its end go, and the row no longer follows the finger. */
  const release = () => {
    const state = gesture.current
    gesture.current = null
    state?.detach()
    return state
  }

  /** The handlers of the latest render, for listeners and observers set up once. */
  const latest = useRef({ close: () => {}, release, finish: () => {}, cancel: () => {}, sync: () => {}, fit: () => {} })

  /** One function for the life of the row, so the list knows which row is open; another row that opens ends this one's gesture too. */
  const closer = useRef(() => {
    const state = latest.current.release()
    if (state) {
      setSwiping(false)
      // The finger of the ended swipe still lifts over this row: its click is not a click on the content.
      if (state.swiping) suppressClick.current = true
    }
    latest.current.close()
  }).current

  const close = () => {
    if (closeOpenRow === closer) closeOpenRow = null
    move(0)
  }

  /** This row takes the place of the open one. */
  const claim = () => {
    if (closeOpenRow && closeOpenRow !== closer) closeOpenRow()
    closeOpenRow = closer
  }

  /** Shows a side as wide as its actions (`width` when known), or closes the row when that side has none (any more). */
  const open = (side: SwipeActionsSide, width = widthOf(side)) => {
    if (!(width > 0)) return close()
    claim()
    setRtl(isRtl())
    move(side === "leading" ? width : -width)
  }

  /** An open row follows its actions: more of them, other labels or another width move it to their new width. */
  const sync = () => {
    const side = sideOf(current.current.offset)
    if (!side || gesture.current?.swiping || current.current.full) return
    const width = widthOf(side)
    if (!(width > 0)) return close()
    const target = side === "leading" ? width : -width
    if (target !== current.current.offset) move(target)
  }

  /**
   * A symbol that has grown as tall as its circle (its max-height) is one, as iOS draws a circle from there. The
   * measure is a capsule that is laid out: a full swipe hides all but the first action of its side, and while none
   * is laid out the shape stays.
   */
  const fit = () => {
    const capsules = [...(root.current?.querySelectorAll<HTMLElement>('[data-shape="symbol"] > :first-child') ?? [])]
    if (capsules.length < 1) return setRound(false)
    const capsule = capsules.find((element) => element.getBoundingClientRect().height > 0)
    if (!capsule) return
    const max = parseFloat(getComputedStyle(capsule).maxHeight)
    setRound(max > 0 && capsule.getBoundingClientRect().height >= max - 0.5)
  }

  const settle = (state: Gesture) => {
    const { offset: last, full: wasFull } = current.current
    const side = sideOf(last)
    if (!side) return close()
    if (wasFull) {
      actionsRef.current[side][0]?.onSelect?.()
      return close()
    }
    // The widths from the start of the swipe: a full swipe may have stretched the actions since.
    if (Math.abs(last) >= state.widths[side] / 2) open(side, state.widths[side])
    else close()
  }

  /** The finger lifted (anywhere): a swipe settles, a press on an open row closes it. */
  const finish = () => {
    const state = release()
    if (!state) return
    if (state.swiping) {
      suppressClick.current = true
      setSwiping(false)
      settle(state)
    } else if (state.start !== 0) {
      if (state.swiping === undefined) suppressClick.current = true
      close()
    }
  }

  /** The browser took the gesture (a scroll) or the row lost the finger: the row goes back to where it was. */
  const cancel = () => {
    const state = release()
    if (!state) return
    setSwiping(false)
    const side = sideOf(state.start)
    if (state.swiping && side) open(side, state.widths[side])
    else close()
  }

  latest.current = { close, release, finish, cancel, sync, fit }

  // After each render, and whenever the actions change size, an open row takes their width and a symbol its shape.
  useEffect(() => {
    latest.current.fit()
    latest.current.sync()
    for (const element of [sides.current.leading, sides.current.trailing]) if (element) observer.current?.observe(element, BORDER_BOX)
  })

  useEffect(() => {
    if (typeof ResizeObserver !== "undefined") observer.current = new ResizeObserver(() => {
      latest.current.fit()
      latest.current.sync()
    })
    for (const element of [sides.current.leading, sides.current.trailing]) if (element) observer.current?.observe(element, BORDER_BOX)
    // The open row lets go of the list, and of the finger, when it goes away.
    return () => {
      observer.current?.disconnect()
      observer.current = null
      latest.current.release()
      if (closeOpenRow === closer) closeOpenRow = null
    }
  }, [closer, latest])

  // A press anywhere outside the open row closes it.
  useEffect(() => {
    if (!revealed || swiping) return
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return
      latest.current.close()
    }
    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => document.removeEventListener("pointerdown", handlePointerDown, true)
  }, [revealed, swiping, latest])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || gesture.current) return
    // A new press of the primary pointer starts clean: a swipe that another row ended and that was then cancelled leaves
    // no click to swallow. Another finger's press keeps it, as only the primary pointer clicks.
    if (event.isPrimary) suppressClick.current = false
    if (leading.length < 1 && trailing.length < 1) return
    // A drag in a text field or along a slider belongs to that control.
    if (event.target instanceof Element && event.target.closest(OWN_DRAG)) return
    const pointerId = event.pointerId
    // The end of the gesture is heard wherever the finger lifts, inside the row or not.
    const handleUp = (end: globalThis.PointerEvent) => {
      if (end.pointerId === pointerId) latest.current.finish()
    }
    const handleCancel = (end: globalThis.PointerEvent) => {
      if (end.pointerId === pointerId) latest.current.cancel()
    }
    window.addEventListener("pointerup", handleUp, true)
    window.addEventListener("pointercancel", handleCancel, true)
    gesture.current = {
      pointerId,
      x: event.clientX,
      y: event.clientY,
      start: current.current.offset,
      swiping: undefined,
      rtl: isRtl(),
      widths: { leading: widthOf("leading"), trailing: widthOf("trailing") },
      rowWidth: root.current?.clientWidth ?? 0,
      detach: () => {
        window.removeEventListener("pointerup", handleUp, true)
        window.removeEventListener("pointercancel", handleCancel, true)
      },
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = gesture.current
    if (!state || state.pointerId !== event.pointerId || state.swiping === false) return
    const across = (event.clientX - state.x) * (state.rtl ? -1 : 1)
    const down = event.clientY - state.y
    if (state.swiping === undefined) {
      if (Math.abs(across) < SLOP && Math.abs(down) < SLOP) return
      if (Math.abs(across) <= Math.abs(down)) {
        state.swiping = false
        return
      }
      state.swiping = true
      capture(event.currentTarget, event.pointerId)
      window.getSelection?.()?.removeAllRanges()
      claim()
      setRtl(state.rtl)
      setSwiping(true)
    }
    const next = swipeActionsOffset(state.start + across, state.widths, state.rowWidth, fullSwipe)
    move(next.offset, next.full)
  }

  /** The content lost the finger it held. A child that loses the finger to the content (as a touch moves its implicit capture) ends nothing. */
  const handleLostPointerCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && gesture.current?.pointerId === event.pointerId) cancel()
  }

  /** A swipe or a press that closed the row is not a click on the content; a click from the keys still is. */
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current || event.detail === 0) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  /** The focus on an action shows its side; on the content it closes the row. */
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (gesture.current?.swiping) return
    const side = (["leading", "trailing"] as const).find((name) => sides.current[name]?.contains(event.target))
    if (side) {
      if (sideOf(current.current.offset) !== side) open(side)
    } else if (current.current.offset !== 0) {
      close()
    }
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (gesture.current?.swiping) return
    if (event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget)) return
    if (current.current.offset !== 0) close()
  }

  const select = (action: SwipeAction, event: MouseEvent<HTMLButtonElement>) => {
    action.onSelect?.()
    // A press closes the row, as iOS does. From the keys the action keeps the focus, so its side stays open until
    // the focus leaves the row.
    if (event.detail === 0) return
    event.currentTarget.blur()
    close()
  }

  const renderSide = (side: SwipeActionsSide, actions: SwipeAction[]) => {
    if (actions.length < 1) return null
    const shown = side === "leading" ? actions : [...actions].reverse()
    const isFull = full && revealed === side
    return (
      <div
        ref={(element) => {
          sides.current[side] = element
        }}
        className={s.Actions}
        data-side={side}
        data-full={isFull ? "" : undefined}
        style={isFull ? { width: Math.abs(offset) } : undefined}
      >
        {shown.map((action) => {
          const color = action.color ?? "secondary"
          // A label alone (text), a symbol with its label inside (label), or a symbol with its label hidden or below.
          const shape = !action.Icon ? "text" : labelPlacement === "inside" ? "label" : "symbol"
          const labelInside = shape !== "symbol"
          const labelBelow = shape === "symbol" && labelPlacement === "below"
          return (
            <button
              key={action.id}
              type="button"
              className={s.Action}
              data-color={color}
              data-shape={shape}
              data-first={action === actions[0] ? "" : undefined}
              aria-label={labelInside || labelBelow ? undefined : action.label}
              onClick={(event) => select(action, event)}
            >
              <span className={s.Capsule}>
                {action.Icon && <action.Icon className={s.Icon} aria-hidden="true" />}
                {labelInside && <span className={s.Label}>{action.label}</span>}
              </span>
              {labelBelow && <span className={s.Caption}>{action.label}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      ref={root}
      className={clsx(s.SwipeActions, className)}
      data-row=""
      data-swipe-actions=""
      data-label-placement={labelPlacement}
      data-round={round ? "" : undefined}
      data-revealed={revealed}
      data-swiping={swiping ? "" : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {renderSide("leading", leading)}
      <div
        className={s.Content}
        data-swipe-content=""
        style={offset !== 0 ? { "--swipe-actions-offset": `${rtl ? -offset : offset}px` } as CSSProperties : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onLostPointerCapture={handleLostPointerCapture}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
      {renderSide("trailing", trailing)}
    </div>
  )
}
