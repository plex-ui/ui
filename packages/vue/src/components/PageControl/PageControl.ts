import { computed, defineComponent, h, ref, type PropType } from "vue"
import s from "@plexui/styles/components/PageControl/PageControl.module.css"

// Vue port of packages/ui/src/components/PageControl/PageControl.tsx: the same DOM (a slider with one dot for
// each page), the same window of full and shrinking dots, taps, scrubbing and keys. React's `value` + `onChange`
// become `value` + `update:value` (`v-model:value`) and `change`, which also receives the details.

/** How an indicator shows: full size, one of the two shrinking sizes past the window, or hidden. */
export type PageControlDotSize = "full" | "small" | "smaller" | "hidden"

export type PageControlChangeDetails = {
  /** The change came from scrubbing: show the page without the scrolling animation, as the HIG asks. */
  scrubbing: boolean
}

/**
 * The size of each indicator, after the variants of the iOS 26 kit Page control (507:24679). Up to six pages
 * show full size. Seven show six, and the one past them at 6px. From eight a window of full dots holds the current
 * page: six at either end, otherwise five with the current one in the middle, and the two dots past each side of
 * the window shrink to 6px and 4px; the rest hide.
 */
export const pageControlDots = (count: number, current: number): PageControlDotSize[] => {
  const sizes: PageControlDotSize[] = Array.from({ length: Math.max(0, count) }, () => "hidden")
  const show = (from: number, to: number, size: PageControlDotSize) => {
    for (let i = Math.max(0, from); i <= Math.min(sizes.length - 1, to); i++) sizes[i] = size
  }
  if (count <= 6) {
    show(0, count - 1, "full")
    return sizes
  }
  if (count === 7) {
    const start = current >= 6 ? 1 : 0
    show(0, 6, "small")
    show(start, start + 5, "full")
    return sizes
  }
  const [from, to] = current <= 3 ? [0, 5] : current >= count - 4 ? [count - 6, count - 1] : [current - 2, current + 2]
  show(from - 2, from - 2, "smaller")
  show(from - 1, from - 1, "small")
  show(to + 1, to + 1, "small")
  show(to + 2, to + 2, "smaller")
  show(from, to, "full")
  return sizes
}

const clampIndex = (index: number, count: number) => Math.min(Math.max(index, 0), Math.max(0, count - 1))
const defaultValueText = (index: number, count: number) => `Page ${index + 1} of ${count}`
/** A drag shorter than this is a tap. */
const SCRUB_THRESHOLD = 8

type Press = { pointerId: number; pointerType: string; startX: number; startIndex: number; scrubbing: boolean }

const isRtl = (element: HTMLElement) => element.closest("[dir]")?.getAttribute("dir") === "rtl"

/** Distance between the centers of two full dots: the dot size plus the gap. */
const pitchOf = (element: HTMLElement) => {
  const styles = getComputedStyle(element)
  const pitch = parseFloat(styles.getPropertyValue("--page-control-dot-size")) + parseFloat(styles.columnGap)
  return Number.isFinite(pitch) && pitch > 0 ? pitch : 16
}

const PageControlComponent = defineComponent({
  name: "PageControl",
  inheritAttrs: false,
  props: {
    /** The `id` of the page control. */
    id: String,
    /** The number of pages. */
    count: { type: Number, required: true },
    /** The controlled index of the current page, from 0. Bind with `v-model:value`. */
    value: { type: Number, default: undefined },
    /** The index of the page when it is initially rendered. Use when you do not need to control the page. @default 0 */
    defaultValue: { type: Number, default: 0 },
    /**
     * The rounded background behind the indicators: `automatic` shows it while a pointer presses or scrubs,
     * `prominent` always, `minimal` never and turns off scrubbing, as in iOS. @default "automatic"
     */
    background: { type: String as PropType<"automatic" | "prominent" | "minimal">, default: "automatic" },
    /** The text assistive technology reads for the current page. @default (index, count) => `Page ${index + 1} of ${count}` */
    valueText: { type: Function as PropType<(index: number, count: number) => string>, default: defaultValueText },
    /** Accessible name of the page control, when no visible label names it. @default "Pages" */
    ariaLabel: String,
    /** The `id` of the visible label of the page control. */
    ariaLabelledby: String,
    /** The `id` of the element that shows the pages. */
    ariaControls: String,
  },
  emits: {
    /** The page changed */
    "update:value": (index: number) => typeof index === "number",
    /** The page changed (React `onChange`) */
    change: (index: number, details: PageControlChangeDetails) => typeof index === "number" && typeof details === "object",
    /** The page control gained focus */
    focus: (event: FocusEvent) => event.type === "focus",
    /** The page control lost focus */
    blur: (event: FocusEvent) => event.type === "blur",
  },
  setup(props, { attrs, emit }) {
    const internalValue = ref(props.defaultValue)
    const current = computed(() => clampIndex(props.value ?? internalValue.value, props.count))
    const interacting = ref(false)
    let press: Press | null = null

    const commit = (next: number, scrubbing: boolean) => {
      const index = clampIndex(next, props.count)
      if (index === current.value) return
      if (props.value === undefined) internalValue.value = index
      emit("update:value", index)
      emit("change", index, { scrubbing })
    }

    const end = () => {
      press = null
      interacting.value = false
    }

    const handlePointerDown = (event: PointerEvent) => {
      const element = event.currentTarget
      if (event.button !== 0 || props.count < 1 || !(element instanceof HTMLElement)) return
      element.setPointerCapture?.(event.pointerId)
      press = { pointerId: event.pointerId, pointerType: event.pointerType, startX: event.clientX, startIndex: current.value, scrubbing: false }
      interacting.value = true
    }

    const handlePointerMove = (event: PointerEvent) => {
      const state = press
      const element = event.currentTarget
      if (!state || state.pointerId !== event.pointerId || props.background === "minimal" || !(element instanceof HTMLElement)) return
      const direction = isRtl(element) ? -1 : 1
      const dx = (event.clientX - state.startX) * direction
      if (!state.scrubbing && Math.abs(dx) < SCRUB_THRESHOLD) return
      state.scrubbing = true
      const rect = element.getBoundingClientRect()
      const before = direction === 1 ? event.clientX < rect.left : event.clientX > rect.right
      const after = direction === 1 ? event.clientX > rect.right : event.clientX < rect.left
      if (before) return commit(0, true)
      if (after) return commit(props.count - 1, true)
      commit(state.startIndex + Math.round(dx / pitchOf(element)), true)
    }

    const handlePointerUp = (event: PointerEvent) => {
      const state = press
      const element = event.currentTarget
      if (!state || state.pointerId !== event.pointerId || !(element instanceof HTMLElement)) return
      end()
      if (state.scrubbing) return
      const dots = [...element.querySelectorAll<HTMLElement>("[data-index]")].filter((dot) => dot.dataset.size !== "hidden")
      const centerOf = (dot: HTMLElement) => {
        const rect = dot.getBoundingClientRect()
        return rect.left + rect.width / 2
      }
      if (state.pointerType === "mouse" || state.pointerType === "pen") {
        const nearest = dots.reduce<HTMLElement | undefined>((best, dot) =>
          !best || Math.abs(centerOf(dot) - event.clientX) < Math.abs(centerOf(best) - event.clientX) ? dot : best, undefined)
        if (nearest) commit(Number(nearest.dataset.index), false)
        return
      }
      const currentDot = dots.find((dot) => Number(dot.dataset.index) === current.value)
      if (!currentDot) return
      const later = isRtl(element) ? event.clientX < centerOf(currentDot) : event.clientX > centerOf(currentDot)
      commit(current.value + (later ? 1 : -1), false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const element = event.currentTarget
      if (event.altKey || event.ctrlKey || event.metaKey || !(element instanceof HTMLElement)) return
      const forward = isRtl(element) ? -1 : 1
      const keys: Record<string, number> = {
        ArrowRight: current.value + forward,
        ArrowLeft: current.value - forward,
        ArrowUp: current.value + 1,
        ArrowDown: current.value - 1,
        Home: 0,
        End: props.count - 1,
      }
      const next = keys[event.key]
      if (next === undefined) return
      event.preventDefault()
      commit(next, false)
    }

    return () => h("div", {
      ...attrs,
      "id": props.id,
      "role": "slider",
      "tabindex": 0,
      "aria-orientation": "horizontal",
      "aria-valuemin": 1,
      "aria-valuemax": Math.max(1, props.count),
      "aria-valuenow": current.value + 1,
      "aria-valuetext": props.valueText(current.value, props.count),
      "aria-label": props.ariaLabel ?? (props.ariaLabelledby ? undefined : "Pages"),
      "aria-labelledby": props.ariaLabelledby,
      "aria-controls": props.ariaControls,
      "class": [s.PageControl, attrs.class],
      "data-background": props.background,
      "data-interacting": interacting.value ? "" : undefined,
      "onPointerdown": handlePointerDown,
      "onPointermove": handlePointerMove,
      "onPointerup": handlePointerUp,
      "onPointercancel": end,
      "onLostpointercapture": end,
      "onKeydown": handleKeyDown,
      "onFocus": (event: FocusEvent) => emit("focus", event),
      "onBlur": (event: FocusEvent) => emit("blur", event),
    }, pageControlDots(props.count, current.value).map((size, index) => h("span", {
      "key": index,
      "class": s.Dot,
      "aria-hidden": "true",
      "data-index": index,
      "data-size": size,
      "data-current": index === current.value ? "" : undefined,
    })))
  },
})

type PageControlOwnProps = InstanceType<typeof PageControlComponent>["$props"]

/** PageControl props. */
export type PageControlProps = PageControlOwnProps

/**
 * A row of dots, one for each page, the current one solid, as the iOS 26 page control. Tapping the leading or
 * trailing side of the current dot shows the previous or next page; a mouse or pen picks a dot. Dragging across
 * scrubs page by page, and past either end goes to the first or last page. It is a slider for assistive
 * technology: Left and Right (or Up and Down) move one page, Home and End go to the first and last.
 */
export const PageControl = PageControlComponent
