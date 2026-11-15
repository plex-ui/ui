import { computed, defineComponent, h, onBeforeUnmount, onMounted, onUpdated, ref, watch, type Component, type PropType } from "vue"
import s from "@plexui/styles/components/SwipeActions/SwipeActions.module.css"

// Vue port of packages/ui/src/components/SwipeActions/SwipeActions.tsx: the same row, sides, gesture, full swipe,
// keys and focus. The content of the row is the default slot; an action's `Icon` is a component, as in Select.

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
  Icon?: Component
  /** Solid color of the action. @default "secondary" */
  color?: SwipeActionColor
  /** Called when the action is pressed, or by a full swipe when it is the first action of its side */
  onSelect?: () => void
  /** `"destructive"`: the action removes the row, so the row slides out and its height collapses, as iOS deletes a row, and `onSelect` comes at the end of that for the list to drop it. A row the list keeps comes back. */
  role?: "destructive"
}

export type SwipeActionsSide = "leading" | "trailing"

/** A finger has to travel this far, and farther across than down, before the row follows it. */
const SLOP = 10

/** The width an open row moves by is the border box of its actions, edge and content gaps included. */
const BORDER_BOX: ResizeObserverOptions = { box: "border-box" }

/** A finger lifting faster than this (px/ms) opens the side it moves toward, or closes the row when it moves back, however short the swipe. */
const FLICK = 0.3

/** A finger that stopped this long (ms) before it lifted flicks nothing. */
const FLICK_WINDOW = 100

/** A trackpad swipe (horizontal wheel) ends when no wheel event has come for this long (ms). */
const WHEEL_IDLE = 120

/** Controls that take a horizontal drag themselves. */
const OWN_DRAG = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]'

/** Whether a wheel over `target` belongs to a control or a box inside the row that scrolls across itself. */
const scrollsAcross = (target: EventTarget | null, row: Element | null): boolean => {
  for (let element = target instanceof Element ? target : null; element && element !== row; element = element.parentElement) {
    if (element.matches(OWN_DRAG)) return true
    const overflow = getComputedStyle(element).overflowX
    if ((overflow === "auto" || overflow === "scroll") && element.scrollWidth > element.clientWidth) return true
  }
  return false
}

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
  /** Where the finger last was across (px) and when (ms), and how fast it moved there (px/ms). */
  across: number
  time: number
  velocity: number
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
 * Where a swipe that ended at `offset` settles: a flick (`velocity` px/ms, toward the trailing edge when positive)
 * opens the side it moves toward and closes the row when it moves back; a slow one opens a side moved past half its
 * `width`.
 */
export const swipeActionsSettle = (offset: number, velocity: number, width: number): boolean => {
  if (Math.abs(velocity) >= FLICK) return Math.sign(velocity) === Math.sign(offset)
  return Math.abs(offset) >= width / 2
}

/** The duration (ms) the row moves in, none when the motion is reduced. */
const durationOf = (element: Element) => {
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return 0
  const value = getComputedStyle(element).getPropertyValue("--swipe-actions-duration").trim()
  const time = parseFloat(value)
  if (!Number.isFinite(time)) return 0
  return value.endsWith("ms") ? time : time * 1000
}

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

const SwipeActionsComponent = defineComponent({
  name: "SwipeActions",
  inheritAttrs: false,
  props: {
    /** Actions revealed by a swipe toward the trailing edge, the first one at the leading edge */
    leading: { type: Array as PropType<SwipeAction[]>, default: () => [] },
    /** Actions revealed by a swipe toward the leading edge, the first one at the trailing edge */
    trailing: { type: Array as PropType<SwipeAction[]>, default: () => [] },
    /** Where the actions show their labels: `"hidden"` (symbols only), `"inside"` the capsule, or `"below"` it (for rows of 60px and taller, as iOS sets them). @default "hidden" */
    labelPlacement: { type: String as PropType<"hidden" | "inside" | "below">, default: "hidden" },
    /** A swipe past the middle between the open actions and the far edge runs the first action of that side. @default true */
    fullSwipe: { type: Boolean, default: true },
  },
  setup(props, { attrs, slots }) {
    const offset = ref(0)
    const full = ref(false)
    const swiping = ref(false)
    const rtl = ref(false)
    const round = ref(false)
    const removing = ref(false)
    const height = ref<number | undefined>(undefined)
    /** The timers of a removal and of a trackpad swipe, cleared when the row goes. */
    const timeouts: number[] = []
    let wheelTimer = 0
    /** A trackpad swipe: where it started, how far it went, the widths at its start. `locked` drops the momentum after it. */
    let wheel: { start: number; across: number; widths: Record<SwipeActionsSide, number>; rowWidth: number } | "locked" | null = null
    const root = ref<HTMLElement | null>(null)
    const sides: Record<SwipeActionsSide, HTMLElement | null> = { leading: null, trailing: null }
    let gesture: Gesture | null = null
    let suppressClick = false
    let observer: ResizeObserver | null = null
    const revealed = computed(() => sideOf(offset.value))

    const widthOf = (side: SwipeActionsSide) => sides[side]?.getBoundingClientRect().width ?? 0

    const isRtl = () => !!root.value && getComputedStyle(root.value).direction === "rtl"

    const move = (next: number, nextFull = false) => {
      offset.value = next
      full.value = nextFull
    }

    /** Lets go of the gesture: the listeners for its end go, and the row no longer follows the finger. */
    const release = () => {
      const state = gesture
      gesture = null
      state?.detach()
      return state
    }

    /** No action of the row keeps the focus. */
    const blurActions = () => {
      const focused = document.activeElement
      if (focused instanceof HTMLElement && (sides.leading?.contains(focused) || sides.trailing?.contains(focused))) focused.blur()
    }

    const close = () => {
      if (removing.value) return
      // Whatever closes or opens the row (a press, the focus, another row) ends a trackpad swipe and its momentum.
      lockWheel()
      // A closed row hides its actions, so none keeps the focus (Enter would run a hidden action).
      blurActions()
      if (closeOpenRow === closer) closeOpenRow = null
      move(0)
    }

    /** One function for the life of the row, so the list knows which row is open; another row that opens ends this one's gesture too. */
    const closer = () => {
      const state = release()
      if (state) {
        swiping.value = false
        // The finger of the ended swipe still lifts over this row: its click is not a click on the content.
        if (state.swiping) suppressClick = true
      }
      lockWheel()
      close()
    }

    /** This row takes the place of the open one. */
    const claim = () => {
      if (closeOpenRow && closeOpenRow !== closer) closeOpenRow()
      closeOpenRow = closer
    }

    /** Shows a side as wide as its actions (`width` when known), or closes the row when that side has none (any more). */
    const open = (side: SwipeActionsSide, width = widthOf(side)) => {
      if (removing.value) return
      if (!(width > 0)) return close()
      lockWheel()
      claim()
      rtl.value = isRtl()
      move(side === "leading" ? width : -width)
    }

    /** An open row follows its actions: more of them, other labels or another width move it to their new width. */
    const sync = () => {
      const side = sideOf(offset.value)
      if (!side || removing.value || gesture?.swiping || (wheel && wheel !== "locked") || full.value) return
      const width = widthOf(side)
      if (!(width > 0)) return close()
      const target = side === "leading" ? width : -width
      if (target !== offset.value) move(target)
    }

    /**
     * A symbol that has grown as tall as its circle (its max-height) is one, as iOS draws a circle from there. The
     * measure is a capsule that is laid out: a full swipe hides all but the first action of its side, and while none
     * is laid out the shape stays.
     */
    const fit = () => {
      const capsules = [...(root.value?.querySelectorAll<HTMLElement>('[data-shape="symbol"] > :first-child') ?? [])]
      if (capsules.length < 1) {
        round.value = false
        return
      }
      const capsule = capsules.find((element) => element.getBoundingClientRect().height > 0)
      if (!capsule) return
      const max = parseFloat(getComputedStyle(capsule).maxHeight)
      round.value = max > 0 && capsule.getBoundingClientRect().height >= max - 0.5
    }

    // After each render, and whenever the actions change size, an open row takes their width and a symbol its shape.
    const observeSides = () => {
      for (const element of [sides.leading, sides.trailing]) if (element) observer?.observe(element, BORDER_BOX)
    }
    onMounted(() => {
      if (typeof ResizeObserver !== "undefined") observer = new ResizeObserver(() => {
        fit()
        sync()
      })
      fit()
      observeSides()
      // A trackpad swipe has to stop the page's own scroll and back gesture, which a passive listener cannot.
      root.value?.addEventListener("wheel", handleWheel, { passive: false })
    })
    onUpdated(() => {
      fit()
      sync()
      observeSides()
    })

    // A press anywhere outside the open row closes it, while a trackpad moves it too; a finger's own swipe keeps it.
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && root.value?.contains(event.target)) return
      if (gesture?.swiping) return
      close()
    }
    watch(revealed, (side) => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true)
      if (side) document.addEventListener("pointerdown", handleOutsidePointerDown, true)
    })

    // The open row lets go of the list, and of the finger, when it goes away.
    onBeforeUnmount(() => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true)
      root.value?.removeEventListener("wheel", handleWheel)
      for (const id of timeouts) window.clearTimeout(id)
      window.clearTimeout(wheelTimer)
      observer?.disconnect()
      observer = null
      release()
      if (closeOpenRow === closer) closeOpenRow = null
    })

    /**
     * A destructive action: the content slides out to the side it was swiped to (the trailing one when pressed from
     * the keys) and the row collapses, then the action runs; a row the list keeps comes back closed.
     */
    const remove = (action: SwipeAction, side: SwipeActionsSide) => {
      const element = root.value
      if (!element || removing.value) return
      const duration = durationOf(element)
      const width = element.clientWidth
      claim()
      height.value = element.getBoundingClientRect().height
      rtl.value = isRtl()
      move(side === "leading" ? width : -width, full.value)
      removing.value = true
      lockWheel()
      timeouts.push(window.setTimeout(() => {
        action.onSelect?.()
        // A row the list dropped is gone by now; one it keeps comes back.
        timeouts.push(window.setTimeout(() => {
          removing.value = false
          height.value = undefined
          // An action that keeps the focus (chosen from the keys) keeps its side open, so the focus is never on a hidden action.
          const focused = document.activeElement
          const side = (["leading", "trailing"] as const).find((name) => !!focused && !!sides[name]?.contains(focused))
          if (side) open(side)
          else close()
        }))
      }, duration))
    }

    /** Runs an action from its side: a destructive one removes the row first. */
    const run = (action: SwipeAction | undefined, side: SwipeActionsSide) => {
      if (!action) return close()
      if (action.role === "destructive") return remove(action, side)
      action.onSelect?.()
      close()
    }

    const settle = (state: Gesture, velocity = 0) => {
      const side = sideOf(offset.value)
      if (!side) return close()
      if (full.value) return run((side === "leading" ? props.leading : props.trailing)[0], side)
      // The widths from the start of the swipe: a full swipe may have stretched the actions since.
      if (swipeActionsSettle(offset.value, velocity, state.widths[side])) open(side, state.widths[side])
      else close()
    }

    /** A trackpad swipe that has not settled yet settles no more, where it stands (a press or a removal takes over). */
    function stopWheel() {
      window.clearTimeout(wheelTimer)
      if (wheel && wheel !== "locked") swiping.value = false
      wheel = null
    }

    /** Another row took over: this row's trackpad swipe ends here, and the momentum after it moves nothing. */
    function lockWheel() {
      if (!wheel || wheel === "locked") return
      stopWheel()
      wheel = "locked"
      wheelTimer = window.setTimeout(() => {
        wheel = null
      }, WHEEL_IDLE)
    }

    /**
     * A two-finger swipe on a trackpad moves the row as a finger does, without a full swipe (the momentum after the
     * fingers lift would run an action), and settles when the wheel stops. A swipe down scrolls the page.
     */
    function handleWheel(event: WheelEvent) {
      if (event.ctrlKey) return
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      let state = wheel
      // The momentum after a swipe keeps the lock until it stops, a removal or not.
      if (state === "locked") {
        window.clearTimeout(wheelTimer)
        if (horizontal) event.preventDefault()
        wheelTimer = window.setTimeout(() => {
          wheel = null
        }, WHEEL_IDLE)
        return
      }
      if (removing.value || gesture || (props.leading.length < 1 && props.trailing.length < 1)) return
      if (!state && (!horizontal || scrollsAcross(event.target, root.value))) return
      window.clearTimeout(wheelTimer)
      event.preventDefault()
      if (!state) {
        // The row moves under the focus: an action that has it lets it go, as a closed row does.
        const start = offset.value
        blurActions()
        state = { start, across: 0, widths: { leading: widthOf("leading"), trailing: widthOf("trailing") }, rowWidth: root.value?.clientWidth ?? 0 }
        wheel = state
        claim()
        rtl.value = isRtl()
        swiping.value = true
      }
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? state.rowWidth : 1
      // The page scrolls the other way the fingers move: fingers moving left give a positive deltaX.
      state.across -= event.deltaX * scale * (isRtl() ? -1 : 1)
      const next = swipeActionsOffset(state.start + state.across, state.widths, state.rowWidth, false)
      move(next.offset)
      const widths = state.widths
      wheelTimer = window.setTimeout(() => {
        wheel = "locked"
        swiping.value = false
        const side = sideOf(offset.value)
        if (side && swipeActionsSettle(offset.value, 0, widths[side])) open(side, widths[side])
        else close()
        wheelTimer = window.setTimeout(() => {
          wheel = null
        }, WHEEL_IDLE)
      }, WHEEL_IDLE)
    }

    /** The finger lifted (anywhere): a swipe settles, a press on an open row closes it. */
    const finish = () => {
      const state = release()
      if (!state) return
      if (state.swiping) {
        suppressClick = true
        swiping.value = false
        settle(state, performance.now() - state.time <= FLICK_WINDOW ? state.velocity : 0)
      } else if (state.start !== 0) {
        if (state.swiping === undefined) suppressClick = true
        close()
      }
    }

    /** The browser took the gesture (a scroll) or the row lost the finger: the row goes back to where it was. */
    const cancel = () => {
      const state = release()
      if (!state) return
      swiping.value = false
      const side = sideOf(state.start)
      if (state.swiping && side) open(side, state.widths[side])
      else close()
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || gesture || removing.value) return
      // A new press of the primary pointer starts clean: a swipe that another row ended and that was then cancelled leaves
      // no click to swallow. Another finger's press keeps it, as only the primary pointer clicks.
      if (event.isPrimary) suppressClick = false
      if (props.leading.length < 1 && props.trailing.length < 1) return
      // Any press ends a trackpad swipe still moving the row, and its momentum.
      lockWheel()
      // A drag in a text field or along a slider belongs to that control.
      if (event.target instanceof Element && event.target.closest(OWN_DRAG)) return
      const pointerId = event.pointerId
      // The end of the gesture is heard wherever the finger lifts, inside the row or not.
      const handleUp = (end: PointerEvent) => {
        if (end.pointerId === pointerId) finish()
      }
      const handleCancel = (end: PointerEvent) => {
        if (end.pointerId === pointerId) cancel()
      }
      window.addEventListener("pointerup", handleUp, true)
      window.addEventListener("pointercancel", handleCancel, true)
      gesture = {
        pointerId,
        x: event.clientX,
        y: event.clientY,
        start: offset.value,
        swiping: undefined,
        rtl: isRtl(),
        widths: { leading: widthOf("leading"), trailing: widthOf("trailing") },
        rowWidth: root.value?.clientWidth ?? 0,
        across: 0,
        time: performance.now(),
        velocity: 0,
        detach: () => {
          window.removeEventListener("pointerup", handleUp, true)
          window.removeEventListener("pointercancel", handleCancel, true)
        },
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const state = gesture
      if (!state || state.pointerId !== event.pointerId || state.swiping === false) return
      const across = (event.clientX - state.x) * (state.rtl ? -1 : 1)
      const down = event.clientY - state.y
      // The speed is the finger's latest, from every move, the ones within the slop too.
      const now = performance.now()
      if (now > state.time) state.velocity = (across - state.across) / (now - state.time)
      state.across = across
      state.time = now
      if (state.swiping === undefined) {
        if (Math.abs(across) < SLOP && Math.abs(down) < SLOP) return
        if (Math.abs(across) <= Math.abs(down)) {
          state.swiping = false
          return
        }
        state.swiping = true
        const target = event.currentTarget
        if (target instanceof Element) capture(target, event.pointerId)
        window.getSelection?.()?.removeAllRanges()
        claim()
        rtl.value = state.rtl
        swiping.value = true
      }
      const next = swipeActionsOffset(state.start + across, state.widths, state.rowWidth, props.fullSwipe)
      move(next.offset, next.full)
    }

    /** The content lost the finger it held. A child that loses the finger to the content (as a touch moves its implicit capture) ends nothing. */
    const handleLostPointerCapture = (event: PointerEvent) => {
      if (event.target === event.currentTarget && gesture?.pointerId === event.pointerId) cancel()
    }

    /** A swipe or a press that closed the row is not a click on the content; a click from the keys still is. */
    const handleClickCapture = (event: MouseEvent) => {
      if (!suppressClick || event.detail === 0) return
      suppressClick = false
      event.preventDefault()
      event.stopPropagation()
    }

    /** The focus on an action shows its side; on the content it closes the row. */
    const handleFocusIn = (event: FocusEvent) => {
      if (gesture?.swiping || removing.value) return
      const target = event.target
      const side = (["leading", "trailing"] as const).find((name) => target instanceof Node && !!sides[name]?.contains(target))
      if (side) {
        // A trackpad swipe still moving the row ends with the side fully open.
        const wheeling = !!wheel && wheel !== "locked"
        if (wheeling || sideOf(offset.value) !== side) open(side)
      } else if (offset.value !== 0) {
        close()
      }
    }

    const handleFocusOut = (event: FocusEvent) => {
      if (gesture?.swiping || removing.value) return
      if (event.relatedTarget instanceof Node && root.value?.contains(event.relatedTarget)) return
      if (offset.value !== 0) close()
    }

    const select = (action: SwipeAction, side: SwipeActionsSide, event: MouseEvent) => {
      // A row being removed runs nothing more, from the keys either.
      if (removing.value) return
      // A press ends a trackpad swipe still moving the row.
      lockWheel()
      // A pointer leaves no focus on the action, so a row the list keeps closes.
      const target = event.currentTarget
      if (event.detail !== 0 && target instanceof HTMLElement) target.blur()
      if (action.role === "destructive") return remove(action, side)
      action.onSelect?.()
      // A press closes the row, as iOS does. From the keys the action keeps the focus, so its side stays open until
      // the focus leaves the row.
      if (event.detail === 0) return
      close()
    }

    const renderSide = (side: SwipeActionsSide, actions: SwipeAction[]) => {
      if (actions.length < 1) return null
      const shown = side === "leading" ? actions : [...actions].reverse()
      const isFull = full.value && revealed.value === side
      return h("div", {
        "ref": (element: unknown) => {
          sides[side] = element instanceof HTMLElement ? element : null
        },
        "class": s.Actions,
        "data-side": side,
        "data-full": isFull ? "" : undefined,
        "style": isFull ? { width: `${Math.abs(offset.value)}px` } : undefined,
      }, shown.map((action) => {
        const color = action.color ?? "secondary"
        // A label alone (text), a symbol with its label inside (label), or a symbol with its label hidden or below.
        const shape = !action.Icon ? "text" : props.labelPlacement === "inside" ? "label" : "symbol"
        const labelInside = shape !== "symbol"
        const labelBelow = shape === "symbol" && props.labelPlacement === "below"
        return h("button", {
          "key": action.id,
          "type": "button",
          "class": s.Action,
          "data-color": color,
          "data-shape": shape,
          "data-first": action === actions[0] ? "" : undefined,
          "aria-label": labelInside || labelBelow ? undefined : action.label,
          "onClick": (event: MouseEvent) => select(action, side, event),
        }, [
          h("span", { class: s.Capsule }, [
            action.Icon ? h(action.Icon, { "class": s.Icon, "aria-hidden": "true" }) : null,
            labelInside ? h("span", { class: s.Label }, action.label) : null,
          ]),
          labelBelow ? h("span", { class: s.Caption }, action.label) : null,
        ])
      }))
    }

    return () => h("div", {
      ...attrs,
      "ref": root,
      "class": [s.SwipeActions, attrs.class],
      "data-row": "",
      "data-swipe-actions": "",
      "data-label-placement": props.labelPlacement,
      "data-round": round.value ? "" : undefined,
      "data-revealed": revealed.value,
      "data-swiping": swiping.value ? "" : undefined,
      "data-removing": removing.value ? "" : undefined,
      // The row collapses from its height (keyframes in the CSS), so no frame has to pass first.
      "style": height.value !== undefined ? [attrs.style, { "--swipe-actions-row-height": `${height.value}px` }] : attrs.style,
      "onFocusin": handleFocusIn,
      "onFocusout": handleFocusOut,
    }, [
      renderSide("leading", props.leading),
      h("div", {
        "class": s.Content,
        "data-swipe-content": "",
        "style": offset.value !== 0 ? { "--swipe-actions-offset": `${rtl.value ? -offset.value : offset.value}px` } : undefined,
        "onPointerdown": handlePointerDown,
        "onPointermove": handlePointerMove,
        "onLostpointercapture": handleLostPointerCapture,
        "onClickCapture": handleClickCapture,
      }, slots.default?.()),
      renderSide("trailing", props.trailing),
    ])
  },
})

type SwipeActionsOwnProps = InstanceType<typeof SwipeActionsComponent>["$props"]

/** SwipeActions props. */
export type SwipeActionsProps = SwipeActionsOwnProps

/**
 * Actions behind a row of a list, as the swipe actions of an iOS list: a swipe toward the leading edge reveals the
 * trailing actions, a swipe toward the trailing edge the leading ones, and a full swipe runs the first action of
 * that side. The row is a `data-row` of a FieldGroup. Each action is also a button in the order of the screen, and
 * the focus on one shows its side.
 */
export const SwipeActions = SwipeActionsComponent
