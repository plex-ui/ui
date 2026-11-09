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
}

export type SwipeActionsSide = "leading" | "trailing"

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

const SwipeActionsComponent = defineComponent({
  name: "SwipeActions",
  inheritAttrs: false,
  props: {
    /** Actions revealed by a swipe toward the trailing edge, the first one at the leading edge */
    leading: { type: Array as PropType<SwipeAction[]>, default: () => [] },
    /** Actions revealed by a swipe toward the leading edge, the first one at the trailing edge */
    trailing: { type: Array as PropType<SwipeAction[]>, default: () => [] },
    /** Where the actions show their labels: `"hidden"` (symbols only), `"inside"` the capsule, or `"below"` it (for rows of 68px and taller). @default "hidden" */
    labelPlacement: { type: String as PropType<"hidden" | "inside" | "below">, default: "hidden" },
    /** A swipe past the middle between the open actions and the far edge runs the first action of that side. @default true */
    fullSwipe: { type: Boolean, default: true },
  },
  setup(props, { attrs, slots }) {
    const offset = ref(0)
    const full = ref(false)
    const swiping = ref(false)
    const rtl = ref(false)
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

    const close = () => {
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
      close()
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
      rtl.value = isRtl()
      move(side === "leading" ? width : -width)
    }

    /** An open row follows its actions: more of them, other labels or another width move it to their new width. */
    const sync = () => {
      const side = sideOf(offset.value)
      if (!side || gesture?.swiping || full.value) return
      const width = widthOf(side)
      if (!(width > 0)) return close()
      const target = side === "leading" ? width : -width
      if (target !== offset.value) move(target)
    }

    // After each render, and whenever the actions change size, an open row takes their width.
    const observeSides = () => {
      for (const element of [sides.leading, sides.trailing]) if (element) observer?.observe(element, BORDER_BOX)
    }
    onMounted(() => {
      if (typeof ResizeObserver !== "undefined") observer = new ResizeObserver(sync)
      observeSides()
    })
    onUpdated(() => {
      sync()
      observeSides()
    })

    // A press anywhere outside the open row closes it.
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && root.value?.contains(event.target)) return
      close()
    }
    watch([revealed, swiping], ([side, moving]) => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true)
      if (side && !moving) document.addEventListener("pointerdown", handleOutsidePointerDown, true)
    })

    // The open row lets go of the list, and of the finger, when it goes away.
    onBeforeUnmount(() => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true)
      observer?.disconnect()
      observer = null
      release()
      if (closeOpenRow === closer) closeOpenRow = null
    })

    const settle = (state: Gesture) => {
      const side = sideOf(offset.value)
      if (!side) return close()
      if (full.value) {
        (side === "leading" ? props.leading : props.trailing)[0]?.onSelect?.()
        return close()
      }
      // The widths from the start of the swipe: a full swipe may have stretched the actions since.
      if (Math.abs(offset.value) >= state.widths[side] / 2) open(side, state.widths[side])
      else close()
    }

    /** The finger lifted (anywhere): a swipe settles, a press on an open row closes it. */
    const finish = () => {
      const state = release()
      if (!state) return
      if (state.swiping) {
        suppressClick = true
        swiping.value = false
        settle(state)
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
      if (event.button !== 0 || gesture) return
      // A new press of the primary pointer starts clean: a swipe that another row ended and that was then cancelled leaves
      // no click to swallow. Another finger's press keeps it, as only the primary pointer clicks.
      if (event.isPrimary) suppressClick = false
      if (props.leading.length < 1 && props.trailing.length < 1) return
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
      if (gesture?.swiping) return
      const target = event.target
      const side = (["leading", "trailing"] as const).find((name) => target instanceof Node && !!sides[name]?.contains(target))
      if (side) {
        if (sideOf(offset.value) !== side) open(side)
      } else if (offset.value !== 0) {
        close()
      }
    }

    const handleFocusOut = (event: FocusEvent) => {
      if (gesture?.swiping) return
      if (event.relatedTarget instanceof Node && root.value?.contains(event.relatedTarget)) return
      if (offset.value !== 0) close()
    }

    const select = (action: SwipeAction, event: MouseEvent) => {
      action.onSelect?.()
      // A press closes the row, as iOS does. From the keys the action keeps the focus, so its side stays open until
      // the focus leaves the row.
      if (event.detail === 0) return
      const target = event.currentTarget
      if (target instanceof HTMLElement) target.blur()
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
        const labelInside = props.labelPlacement === "inside" || !action.Icon
        const labelBelow = props.labelPlacement === "below" && !!action.Icon
        return h("button", {
          "key": action.id,
          "type": "button",
          "class": s.Action,
          "data-color": color,
          "data-first": action === actions[0] ? "" : undefined,
          "aria-label": labelInside || labelBelow ? undefined : action.label,
          "onClick": (event: MouseEvent) => select(action, event),
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
      "data-revealed": revealed.value,
      "data-swiping": swiping.value ? "" : undefined,
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
