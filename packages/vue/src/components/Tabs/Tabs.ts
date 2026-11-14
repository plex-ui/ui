import {
  Comment,
  Fragment,
  Text,
  computed,
  defineComponent,
  h,
  inject,
  isVNode,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  ref,
  shallowRef,
  watch,
  type Component,
  type ComputedRef,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import { RovingFocusGroup, RovingFocusItem } from "reka-ui"
import type { ControlSize, SemanticColors, Sizes, Variants } from "@plexui/styles/types"
import { handlePressableMouseEnter, prefersReducedMotion, waitForAnimationFrame } from "../../lib/helpers.js"
import {
  GROUP_COMPOSED,
  ITEM_COMPOSED,
  RovingElement,
  focusFirst,
  splitListeners,
} from "../../lib/rovingFocus.js"
import CheckMd from "../Icon/svg/CheckMd.js"
import ChevronDownMd from "../Icon/svg/ChevronDownMd.js"
import { LoadingIndicator } from "../Indicator/index.js"
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../Menu/index.js"
import { visibleTabCount } from "./overflow.js"
import { equalizeSegments, watchSegments } from "./segments.js"
import s from "@plexui/styles/components/Tabs/Tabs.module.css"

// Vue port of packages/ui/src/components/Tabs/Tabs.tsx. Props, defaults,
// rendered DOM and behaviour match React (checked by the parity tests).
//
// React builds on Radix ToggleGroup (type="single"). Reka's ToggleGroupItem
// renders Toggle semantics (`aria-pressed`, `data-active`, no `role="radio"`)
// and runs its click toggle before handlers the caller passes, so the
// single-select part of Radix ToggleGroup/Toggle (about twenty lines) is
// inlined here, and keyboard focus comes from Reka's RovingFocusGroup and
// RovingFocusItem, the same roving tabindex Radix ToggleGroup uses.

export type SizeVariant = "2xs" | "xs" | "sm" | "md" | "lg" | "xl"
export type TabsVariant = "segmented" | "underline"
export type TabsOrientation = "horizontal" | "vertical"

/** Content React accepts as a ReactNode, in Vue terms */
type TabsContent = string | number | VNode | VNodeArrayChildren

/** Badge configuration for TabsTab: a plain value, or an object with content and styling */
export type TabsBadgeProp =
  | string
  | number
  | VNode
  | {
      content: TabsContent
      color?: SemanticColors<"secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution">
      variant?: Variants<"soft" | "solid">
      pill?: boolean
      loading?: boolean
    }

/** Icon for TabsTab: a component (e.g. an icon from @plexui/vue), a vnode, or text */
export type TabsIconProp = string | VNode | Component

type TabsContextValue = {
  value: ComputedRef<string>
  disabled: ComputedRef<boolean>
  /** Vertical tabs are a list on a phone, where the selected row shows a checkmark */
  vertical: ComputedRef<boolean>
  setValue: (nextValue: string) => void
}

const TabsContextKey: InjectionKey<TabsContextValue> = Symbol("PlexUITabs")

type ExposedRovingFocusGroup = { getItems: () => { ref: HTMLElement }[] }

type ResizeEntryBox = "contentBoxSize" | "borderBoxSize" | "devicePixelContentBoxSize"

// Same reading as usehooks-ts' useResizeObserver (content-box)
const extractSize = (entry: ResizeObserverEntry, box: ResizeEntryBox, sizeType: "inlineSize" | "blockSize") => {
  const boxSize = entry[box] as ResizeObserverSize[] | ResizeObserverSize | undefined
  if (!boxSize) {
    if (box === "contentBoxSize") {
      return entry.contentRect[sizeType === "inlineSize" ? "width" : "height"]
    }
    return undefined
  }
  return Array.isArray(boxSize) ? boxSize[0][sizeType] : boxSize[sizeType]
}


const tabsProps = {
  /** Controlled value for the group. Bind with `v-model:value`; leave unset for an uncontrolled group. */
  value: String,
  /**
   * Visual variant of the tab group
   * - `"segmented"`: background container with sliding highlight (default)
   * - `"underline"`: no background, animated line indicator under active tab
   * @default "segmented"
   */
  variant: { type: String as PropType<TabsVariant>, default: "segmented" },
  /** Orientation of the tab layout. @default "horizontal" */
  orientation: { type: String as PropType<TabsOrientation>, default: "horizontal" },
  /**
   * Controls the size of the tabs, `3xs` (22px) to `3xl` (48px). On a phone horizontal tabs take the two sizes of
   * the iOS 27 segmented control: `sm` and smaller the small 32px one, `md` and larger the large 48px one (49px with
   * `mobileMaterial="flat"`). @default "md"
   */
  size: { type: String as PropType<ControlSize>, default: "md" },
  /** Controls gutter on the edges of the tabs, defaults to value from `size`. */
  gutterSize: String as PropType<Sizes<"2xs" | "xs" | "sm" | "md" | "lg" | "xl">>,
  /** Disable the entire group. @default false */
  disabled: { type: Boolean, default: false },
  /** Display the control as a block element with equal width segments. @default false */
  block: { type: Boolean, default: false },
  /** Fully rounded pill shape. Only applies to the `"segmented"` variant. @default true */
  pill: { type: Boolean, default: true },
  /**
   * Flush underline style: no tab padding, so the indicator matches the text
   * width, gap spacing and no bottom border. Only applies to the `"underline"` variant.
   * @default false
   */
  flush: { type: Boolean, default: false },
  /**
   * Phone surface of horizontal tabs. On a phone the large control (`md` and larger) is the glass capsule of iOS 27
   * apps and the small one (`sm` and smaller) the plain capsule of SwiftUI's segmented Picker; `flat` gives the large
   * one the plain look of SwiftUI's `.controlSize(.large)`, and `glass` gives the small one `.glassEffect()`, like the
   * Button prop of the same name. Inside a phone Toolbar the control is the large glass one anyway. Desktop keeps the
   * chosen variant. @default "glass" at md and larger, "flat" at sm and smaller
   */
  mobileMaterial: { type: String as PropType<"glass" | "flat">, default: undefined },
  /**
   * Widths of the segments of horizontal tabs on a phone, as UISegmentedControl sets them. `equal` gives every
   * segment the widest one's width, its default; `content` gives each its label and the same air around it, as
   * `apportionsSegmentWidthsByContent` does, for a compact control. Equal segments that do not fit take their labels'
   * widths anyway; where those still do not fit, the air beside each label narrows, to 4px, and what still does not
   * fit scrolls. A `block` control fills its row either way. Desktop tabs always take their labels' widths. @default "equal"
   */
  mobileSegmentWidth: { type: String as PropType<"equal" | "content">, default: undefined },
}

const tabsEmits = {
  /** A new value was selected (`v-model:value`) */
  "update:value": (value: string) => typeof value === "string",
  /** Same payload as `update:value`, named after React's `onChange` */
  "change": (value: string) => typeof value === "string",
  /** Any click on the control, even if a new value was not selected */
  "click": (event: MouseEvent) => event.type === "click",
}

// The group itself. `Tabs` renders it as it is, or measures and splits it
// for `overflow="menu"`
/** On a phone the large control's selection travels as a lens of glass, as iOS 27.2 draws it. Recorded frame by frame
 * 11.11 (ref-app segmented-bar-text4, a toolbar Picker of Day, Week, Month and Year switched Day to Year and back,
 * after the owner's «анимация не правильная и стиль» and «day<->year пробуй переключать»; segmented-bar-symbols, a
 * segment away, before it): the gray selection clears into a lens within 45ms, taller than the capsule (11pt) and
 * wider the faster it goes (36pt at 200ms), and carries across; it lands as the gray selection again by 300ms,
 * pressed against its segment's far side (7pt narrower, 6pt taller and its centre 2.5% of the way past at 430ms), and
 * springs back by 750ms while the label under it dims to 76% and comes back. The centre's path is a share of the
 * distance and the growth is in points, as both recordings show: as much growth a segment away as three. touch.css
 * names the lens's growth on the large control only, so everywhere else the selection just slides with its
 * transition. CSS has no refraction, so the lens is its rim, its tint and the capsule's edge seen through it. */
let lensRun = 0
const LENS_ID = "segmented-control-lens"
const LENS_DURATION = 750
// At each measured frame: [ms, the centre's share of the distance, share of the growth's width, share of its height]
const LENS_PATH = [
  [0, 0, 0, 0],
  [10, 0.014, 0.036, 0.065],
  [32, 0.077, 0.13, 0.19],
  [47, 0.169, 0.22, 0.44],
  [70, 0.378, 0.44, 0.87],
  [92, 0.478, 0.52, 1],
  [125, 0.647, 0.7, 0.93],
  [150, 0.773, 0.85, 0.87],
  [182, 0.856, 0.96, 0.93],
  [205, 0.9, 1, 1],
  [227, 0.932, 0.96, 0.93],
  [245, 0.951, 0.8, 0.44],
  [262, 0.964, 0.67, 0.31],
  [295, 0.989, 0.37, 0.31],
  [330, 1.005, 0.13, 0.31],
  [363, 1.016, -0.02, 0.37],
  [395, 1.023, -0.13, 0.5],
  [430, 1.025, -0.19, 0.56],
  [497, 1.022, -0.19, 0.56],
  [545, 1.018, -0.17, 0.37],
  [597, 1.014, -0.11, 0.25],
  [647, 1.007, -0.075, 0.12],
  [697, 1.004, -0.036, 0],
  [750, 1, 0, 0],
] as const
// The selected label's opacity as the lens lands: [ms, opacity]
const LENS_LABEL = [
  [0, 1],
  [380, 1],
  [428, 0.77],
  [460, 0.76],
  [515, 0.85],
  [580, 0.93],
  [650, 0.98],
  [713, 1],
  [750, 1],
] as const
type ThumbBox = { x: number; width: number }
type LensRun = { from: ThumbBox; to: ThumbBox; move: Animation; label?: Animation }
const lensRuns = new WeakMap<HTMLElement, LensRun>()
const round = (value: number) => Math.round(value * 100) / 100
// The box the lens draws at a time of its run
const lensBox = ({ from, to }: LensRun, ms: number, growth: number): ThumbBox => {
  const next = LENS_PATH.findIndex(([time]) => time >= ms)
  const at = next < 0 ? LENS_PATH.length - 1 : Math.max(1, next)
  const [t0, share0, wide0] = LENS_PATH[at - 1]
  const [t1, share1, wide1] = LENS_PATH[Math.min(at, LENS_PATH.length - 1)]
  const k = t1 > t0 ? Math.min(1, Math.max(0, (ms - t0) / (t1 - t0))) : 1
  const share = share0 + (share1 - share0) * k
  const width = from.width + (to.width - from.width) * Math.min(share, 1) + growth * (wide0 + (wide1 - wide0) * k)
  return { x: from.x + from.width / 2 + (to.x + to.width / 2 - from.x - from.width / 2) * share - width / 2, width }
}
/** Where a horizontal thumb is drawn, from its control's left edge: where the script set it, or where a lens still
 * on its way has it, so a switch mid-flight sets off from there */
const thumbBox = (thumb: HTMLElement): ThumbBox | null => {
  const offset = /^translateX\((-?[\d.]+)px\)$/.exec(thumb.style.transform)
  const width = parseFloat(thumb.style.width)
  if (!offset || !(width > 0)) return null
  const run = lensRuns.get(thumb)
  const ms = Number(run?.move.currentTime)
  if (run && (run.move.playState === "running" || run.move.playState === "paused") && ms >= 0) {
    const growth = lensGrowth(getComputedStyle(thumb))
    if (growth) return lensBox(run, ms, growth[0])
  }
  return { x: parseFloat(offset[1]), width }
}
// The lens's growth at its widest and tallest, which touch.css names on the large control only
const lensGrowth = (style: CSSStyleDeclaration) => {
  const [wide = Number.NaN, tall = wide] = style.getPropertyValue("--segmented-control-thumb-lens-outset").trim().split(/\s+/).map(parseFloat)
  return wide >= 0 && tall >= 0 ? ([wide, tall] as const) : null
}
const playThumbLens = (thumb: HTMLElement, from: ThumbBox | null) => {
  if (typeof thumb.animate !== "function") return
  // A lens still on its way ends first, so the thumb's own fill and edge are read below (and none outlives a switch
  // to reduced motion)
  thumb.getAnimations().forEach((animation) => {
    if (animation.id === LENS_ID) animation.cancel()
  })
  lensRuns.get(thumb)?.label?.cancel()
  lensRuns.delete(thumb)
  if (!from || prefersReducedMotion()) return
  const style = getComputedStyle(thumb)
  const growth = lensGrowth(style)
  const to = thumbBox(thumb)
  const top = parseFloat(style.top)
  const bottom = parseFloat(style.bottom)
  if (!growth || !to || !Number.isFinite(top) || !Number.isFinite(bottom)) return
  const [wide, tall] = growth
  const timing = { id: LENS_ID, duration: LENS_DURATION }
  const run: LensRun = { from, to, move: undefined as unknown as Animation }
  // The thumb's box at each frame replaces its own while the lens runs (its transition is overridden); the height
  // grows about the middle
  run.move = thumb.animate(
    LENS_PATH.map(([ms, , , high]) => {
      const box = lensBox(run, ms, wide)
      const grown = (tall * high) / 2
      return {
        offset: ms / LENS_DURATION,
        transform: `translateX(${round(box.x)}px)`,
        width: `${round(Math.max(1, box.width))}px`,
        top: `${round(top - grown)}px`,
        bottom: `${round(bottom - grown)}px`,
      }
    }),
    timing,
  )
  const lens = {
    backgroundColor: style.getPropertyValue("--segmented-control-thumb-lens-background").trim(),
    boxShadow: style.getPropertyValue("--segmented-control-thumb-lens-shadow").trim(),
  }
  const rest = { backgroundColor: style.backgroundColor, boxShadow: style.boxShadow }
  // The gray clears as the lens lifts (45ms) and comes back as it lands (250 to 300ms)
  const fill = thumb.animate(
    [
      { offset: 0, ...rest },
      { offset: 45 / LENS_DURATION, ...lens },
      { offset: 250 / LENS_DURATION, ...lens },
      { offset: 300 / LENS_DURATION, ...rest },
      { offset: 1, ...rest },
    ],
    timing,
  )
  const root = thumb.parentElement
  const selected = root?.querySelector<HTMLElement>('[data-state="on"]')
  if (selected && typeof selected.animate === "function") {
    run.label = selected.animate(
      LENS_LABEL.map(([ms, opacity]) => ({ offset: ms / LENS_DURATION, opacity })),
      timing,
    )
  }
  lensRuns.set(thumb, run)
  // The frame a switch is drawn in also lays out whatever the switch changes around the control, which can take a
  // few frames' time; the lens holds its first frame until then and sets off from the next, so none of its way is
  // skipped (a tap's first 45ms were, recorded in Safari 11.11)
  if (typeof requestAnimationFrame === "function") {
    const held = [run.move, fill, run.label].filter((animation): animation is Animation => typeof animation?.pause === "function")
    held.forEach((animation) => animation.pause())
    requestAnimationFrame(() => {
      held.forEach((animation) => {
        if (animation.playState === "paused") animation.play()
      })
    })
  }
  // The lens reaches past the capsule, which clips what scrolls in it: a control whose segments all fit lets it out
  // for the switch
  if (!root || root.scrollWidth > root.clientWidth + 1) return
  const id = String(++lensRun)
  root.setAttribute("data-lens", id)
  const done = () => {
    if (root.getAttribute("data-lens") === id) root.removeAttribute("data-lens")
  }
  if (run.move?.finished) run.move.finished.then(done, done)
  else done()
}

const TabsComponent = defineComponent({
  name: "TabsRoot",
  inheritAttrs: false,
  props: tabsProps,
  emits: tabsEmits,
  setup(props, { slots, attrs, emit }) {
    const rootRef = ref<HTMLDivElement | null>(null)
    const thumbRef = ref<HTMLDivElement | null>(null)
    const groupRef = ref<ExposedRovingFocusGroup | null>(null)
    let prevSize = props.size
    let prevValue = props.value

    // Radix useControllableState: `value` undefined means uncontrolled, starting empty
    const uncontrolledValue = ref("")
    const currentValue = computed(() => (props.value !== undefined ? props.value : uncontrolledValue.value))

    const handleValueChange = (nextValue: string) => {
      // Only trigger onChange when a value exists
      // Disallow toggling off enabled items
      if (nextValue) {
        emit("update:value", nextValue)
        emit("change", nextValue)
      }
    }

    const setValue = (nextValue: string) => {
      if (props.value !== undefined) {
        if (nextValue !== props.value) handleValueChange(nextValue)
      } else {
        uncontrolledValue.value = nextValue
      }
    }

    // Radix reports uncontrolled changes from an effect, after the click has
    // finished bubbling (so the group's `click` comes first)
    watch(uncontrolledValue, handleValueChange, { flush: "post" })

    provide(TabsContextKey, {
      value: currentValue,
      disabled: computed(() => props.disabled),
      vertical: computed(() => props.orientation === "vertical"),
      setValue,
    })

    const applyThumbSizing = (isVertical: boolean, attemptScroll: boolean) => {
      const root = rootRef.value
      const thumb = thumbRef.value

      if (!root || !thumb) {
        return
      }

      // Get selected node
      const activeNode = root.querySelector<HTMLDivElement>('[data-state="on"]')

      // Impossible
      if (!activeNode) {
        return
      }

      if (isVertical) {
        const rootHeight = root.clientHeight
        let targetHeight = Math.floor(activeNode.clientHeight)
        const targetOffset = activeNode.offsetTop

        // Detect subpixel edge case
        if (rootHeight - (targetHeight + targetOffset) < 2) {
          targetHeight = targetHeight - 1
        }

        thumb.style.height = `${Math.floor(targetHeight)}px`
        thumb.style.width = ""
        thumb.style.transform = `translateY(${targetOffset}px)`

        // Scroll into view if needed
        if (root.scrollHeight > rootHeight) {
          const buffer = rootHeight * 0.15
          const scrollTop = root.scrollTop
          const top = activeNode.offsetTop
          const bottom = top + targetHeight
          if (top < scrollTop + buffer || bottom > scrollTop + rootHeight - buffer) {
            if (attemptScroll) {
              // Scroll the control only: scrollIntoView also scrolls the page to it (a switch to Phone
              // re-rendered a control far down the page and slid the page to it, owner 08.11)
              root.scrollTo({ top: top - (rootHeight - targetHeight) / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" })
            }
          }
        }
      } else {
        const rootWidth = root.clientWidth
        let targetWidth = Math.floor(activeNode.clientWidth)
        const targetOffset = activeNode.offsetLeft

        // Detect if the thumb is moving too far to the edge of the container.
        // This would most commonly be due to subpixel widths adding up to excessive distance.
        if (rootWidth - (targetWidth + targetOffset) < 2) {
          targetWidth = targetWidth - 1
        }

        thumb.style.width = `${Math.floor(targetWidth)}px`
        thumb.style.height = ""
        thumb.style.transform = `translateX(${targetOffset}px)`

        // If the control is scrollable, ensure the active option is visible
        if (root.scrollWidth > rootWidth) {
          // Only scroll items near the edge, but not the inner 2/3.
          const buffer = rootWidth * 0.15
          const scrollLeft = root.scrollLeft
          const left = activeNode.offsetLeft
          const right = left + targetWidth
          if (left < scrollLeft + buffer || right > scrollLeft + rootWidth - buffer) {
            // Cheap trick to avoid unintentional scroll on mount - transition is set after mounting
            if (attemptScroll) {
              // Scroll the control only: scrollIntoView also scrolls the page to it (a switch to Phone
              // re-rendered a control far down the page and slid the page to it, owner 08.11)
              root.scrollTo({ left: left - (rootWidth - targetWidth) / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" })
            }
          }
        }
      }
    }

    // React's useLayoutEffect on [value, size, gutterSize, pill, flush, isVertical, mobileSegmentWidth].
    // `value` is the prop, so an uncontrolled selection does not move the thumb
    // until the next resize, exactly as in React.
    const syncThumb = () => {
      const root = rootRef.value
      const thumb = thumbRef.value

      if (!root || !thumb) {
        return
      }

      // The segments take their width before the thumb measures (React's layout effect declared first)
      equalizeSegments(root, thumb)

      const isVertical = props.orientation === "vertical"
      const transitionProperty = isVertical
        ? "height var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter)), transform var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter))"
        : "width var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter)), transform var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter))"

      const sizeChanged = prevSize !== props.size
      prevSize = props.size
      const valueChanged = prevValue !== props.value
      prevValue = props.value

      if (sizeChanged) {
        // Size changed - disable transition, wait for CSS, then apply sizing
        const currentTransition = thumb.style.transition
        thumb.style.transition = ""

        waitForAnimationFrame(() => {
          applyThumbSizing(isVertical, false)
          waitForAnimationFrame(() => {
            thumb.style.transition = currentTransition
          })
        })
      } else if (thumb.style.transition) {
        // Normal update (value change, etc.): the thumb leaves with the label's colour
        const from = valueChanged ? thumbBox(thumb) : null
        applyThumbSizing(isVertical, true)
        if (valueChanged) playThumbLens(thumb, from)
      } else {
        // First measure: apply transition after initial calculation is set
        waitForAnimationFrame(() => {
          applyThumbSizing(isVertical, false)
          waitForAnimationFrame(() => {
            thumb.style.transition = transitionProperty
          })
        })
      }
    }

    watch(
      [
        () => props.value,
        () => props.size,
        () => props.gutterSize,
        () => props.pill,
        () => props.flush,
        () => props.orientation === "vertical",
        // mobileSegmentWidth moves the segments with nothing else changing: the thumb follows them
        () => props.mobileSegmentWidth,
      ],
      syncThumb,
      { flush: "post" },
    )

    let observer: ResizeObserver | undefined

    onMounted(() => {
      syncThumb()

      // usehooks-ts useResizeObserver: only fires when the content box changed
      const root = rootRef.value
      if (!root || typeof window === "undefined" || !("ResizeObserver" in window)) {
        return
      }
      const previousSize: { width?: number; height?: number } = { width: undefined, height: undefined }
      observer = new ResizeObserver(([entry]) => {
        const width = extractSize(entry, "contentBoxSize", "inlineSize")
        const height = extractSize(entry, "contentBoxSize", "blockSize")
        if (previousSize.width === width && previousSize.height === height) {
          return
        }
        previousSize.width = width
        previousSize.height = height

        const thumb = thumbRef.value
        if (!thumb) {
          return
        }

        // Perform the size update instantly
        const currentTransition = thumb.style.transition
        thumb.style.transition = ""
        applyThumbSizing(props.orientation === "vertical", false)
        thumb.style.transition = currentTransition
      })
      observer.observe(root, { box: "content-box" })
    })

    // A phone's segmented control at its own width gives every segment the widest one's width, as UISegmentedControl
    // does in iOS 27.2; where that does not fit, each segment takes its label and the same air around it, as
    // apportionsSegmentWidthsByContent does (segments.ts). Measured after every render, when the room changes (the
    // segments may fit one width now) and when the font loads and the labels widen.
    onUpdated(() => equalizeSegments(rootRef.value, thumbRef.value))
    let stopWatchingSegments: (() => void) | undefined
    onMounted(() => {
      const root = rootRef.value
      if (!root) return
      // The room, the breakpoint or the font changes. The segments can change without the control changing size, so
      // the thumb follows them here, instantly
      stopWatchingSegments = watchSegments(root, () => thumbRef.value, () => {
        const thumb = thumbRef.value
        if (!thumb) return
        const currentTransition = thumb.style.transition
        thumb.style.transition = ""
        applyThumbSizing(props.orientation === "vertical", false)
        thumb.style.transition = currentTransition
      })
    })
    onBeforeUnmount(() => stopWatchingSegments?.())

    // Tabs added, removed, reordered or relabelled move the active tab without
    // resizing the group: measure again, instantly, like a resize
    let mutationObserver: MutationObserver | undefined
    onMounted(() => {
      const root = rootRef.value
      if (!root || typeof MutationObserver === "undefined") return
      mutationObserver = new MutationObserver(() => {
        const thumb = thumbRef.value
        if (!thumb) return
        const currentTransition = thumb.style.transition
        thumb.style.transition = ""
        applyThumbSizing(props.orientation === "vertical", false)
        thumb.style.transition = currentTransition
      })
      mutationObserver.observe(root, { childList: true, characterData: true, subtree: true })
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
      mutationObserver?.disconnect()
    })

    // Radix moves focus into the group onto the selected tab, then the last
    // focused one, then the first. Reka looks for a `data-active` attribute
    // that Radix does not render, so its entry focus is replaced here.
    const handleEntryFocus = (event: Event) => {
      event.preventDefault()
      const items = (groupRef.value?.getItems() ?? []).map((item) => item.ref)
      const activeItem = items.find((item) => item.getAttribute("data-state") === "on")
      const currentItem = items.find((item) => item.getAttribute("tabindex") === "0")
      focusFirst([activeItem, currentItem, ...items].filter((item): item is HTMLElement => !!item))
    }

    return () => {
      const { class: className, dir, ...otherAttrs } = attrs
      const { listeners, rest: restAttrs } = splitListeners(otherAttrs, GROUP_COMPOSED)
      // Only apply pill for segmented variant
      const isPill = props.variant === "segmented" && props.pill
      // Only apply flush for underline variant
      const isFlush = props.variant === "underline" && props.flush

      return h(
        RovingFocusGroup,
        {
          ref: groupRef,
          asChild: true,
          loop: false,
          dir: dir as "ltr" | "rtl" | undefined,
          onEntryFocus: handleEntryFocus,
        },
        {
          default: () =>
            h(
              RovingElement,
              {
                "as": "div",
                "elementRef": rootRef,
                "composed": GROUP_COMPOSED,
                "listeners": listeners,
                "class": [s.Tabs, className],
                // `dir` comes from RovingFocusGroup ("ltr" unless set), like Radix
                // Radix ToggleGroup type="single" (radix-ui 1.8) is a radiogroup
                "role": "radiogroup",
                "onClick": (event: MouseEvent) => emit("click", event),
                "data-variant": props.variant,
                "data-orientation": props.orientation,
                "data-block": props.block ? "" : undefined,
                "data-pill": isPill ? "" : undefined,
                "data-flush": isFlush ? "" : undefined,
                "data-size": props.size,
                "data-gutter-size": props.gutterSize,
                "data-mobile-material": props.mobileMaterial,
                "data-mobile-segment-width": props.mobileSegmentWidth,
                "data-disabled": props.disabled ? "" : undefined,
                ...restAttrs,
              },
              { default: () => [h("div", { class: s.TabsThumb, ref: thumbRef }), slots.default?.()] },
            ),
        },
      )
    }
  },
})


const useTabsContext = () => {
  const context = inject(TabsContextKey, null)

  if (!context) {
    throw new Error("`TabsTab` must be used within `Tabs`")
  }

  return context
}

const hasContent = (nodes: VNode[] | undefined): nodes is VNode[] =>
  !!nodes?.some((node) => {
    if (!isVNode(node)) return node != null && typeof node !== "boolean" && String(node) !== ""
    if (node.type === Comment) return false
    if (node.type === Text) return String(node.children ?? "") !== ""
    if (Array.isArray(node.children) && typeof node.type === "symbol") return hasContent(node.children as VNode[])
    return true
  })

const isBadgeObject = (badge: TabsBadgeProp | undefined): badge is Extract<TabsBadgeProp, { content: unknown }> =>
  badge != null && typeof badge === "object" && "content" in badge

// A text icon ("☀") stands in an element, as an icon component does, so a phone can hide it beside a label
const renderIcon = (icon: TabsIconProp | undefined) => {
  if (icon == null) return icon
  if (isVNode(icon)) return wrapTextIcon([icon])
  if (typeof icon === "string") return icon === "" ? null : h("span", icon)
  return h(icon)
}

/** True when the slot draws text of its own, also inside a fragment (`<template v-if>`) */
const hasTextIcon = (nodes: VNodeArrayChildren): boolean =>
  nodes.some((node) => {
    if (typeof node === "string") return node.trim() !== ""
    if (typeof node === "number") return true
    if (Array.isArray(node)) return hasTextIcon(node)
    if (!isVNode(node)) return false
    if (node.type === Text) return String(node.children).trim() !== ""
    return node.type === Fragment && Array.isArray(node.children) && hasTextIcon(node.children)
  })

/** The slot's text stands in a span, as the React icon's does; a fragment holding text keeps its key, and every
 * other node, a fragment of icons too, stays as it is. */
const wrapTextIcon = (nodes: VNodeArrayChildren): VNodeArrayChildren =>
  nodes.map((node) => {
    if (typeof node === "string" || typeof node === "number") return hasTextIcon([node]) ? h("span", String(node)) : node
    if (Array.isArray(node)) return hasTextIcon(node) ? wrapTextIcon(node) : node
    if (!isVNode(node)) return node
    if (node.type === Text) return hasTextIcon([node]) ? h("span", String(node.children)) : node
    if (node.type === Fragment && Array.isArray(node.children) && hasTextIcon(node.children)) {
      return h(Fragment, { key: node.key ?? undefined }, wrapTextIcon(node.children))
    }
    return node
  })

const TabComponent = defineComponent({
  name: "TabsTab",
  inheritAttrs: false,
  props: {
    /** Tab value */
    value: { type: String, required: true },
    /** Icon before the text content: a component, a vnode or text. The `icon` slot takes precedence. */
    icon: [String, Object, Function] as PropType<TabsIconProp>,
    /**
     * Badge after the text content: a plain value, or an object with
     * `content`, `color`, `variant`, `pill` and `loading`. The `badge` slot
     * replaces the content and keeps the object's styling.
     */
    badge: { type: [String, Number, Object] as PropType<TabsBadgeProp>, default: undefined },
    /** Disable the individual tab */
    disabled: { type: Boolean, default: undefined },
  },
  emits: {
    /** A click, before the tab is selected; `event.preventDefault()` keeps the selection */
    click: (event: MouseEvent) => {
      void event
      return true
    },
  },
  setup(props, { slots, attrs, emit }) {
    const context = useTabsContext()

    return () => {
      const disabled = context.disabled.value || !!props.disabled
      const selected = context.value.value
      const pressed = !!selected && selected === props.value
      const { listeners, rest: restAttrs } = splitListeners(attrs, ITEM_COMPOSED)

      // Normalize badge prop; the slot replaces its content
      const badgeSlot = slots.badge?.()
      const badgeObject = isBadgeObject(props.badge) ? props.badge : undefined
      const badgeProps = hasContent(badgeSlot)
        ? { ...badgeObject, content: badgeSlot }
        : props.badge != null
          ? (badgeObject ?? { content: props.badge as TabsContent })
          : null

      const children = slots.default?.()
      const iconSlot = slots.icon?.()

      // Radix Toggle: the caller's click handler runs first and can cancel the toggle
      const handleClick = (event: MouseEvent) => {
        // React does not dispatch mouse handlers on a disabled button
        if (disabled) return
        // An emitted event, so a `.once` listener runs before the selection too
        emit("click", event)
        if (event.defaultPrevented) return
        context.setValue(pressed ? "" : props.value)
      }

      return h(
        RovingFocusItem,
        { asChild: true, focusable: !disabled, active: pressed },
        {
          default: () =>
            h(
              RovingElement,
              {
                "as": "button",
                "composed": ITEM_COMPOSED,
                "listeners": listeners,
                // Radix Toggle defaults, then the single-select radio semantics
                "type": "button",
                "data-state": pressed ? "on" : "off",
                "data-disabled": disabled ? "" : undefined,
                "role": "radio",
                "aria-checked": pressed,
                // Reka's RovingFocusItem marks the active item; Radix does not
                "data-active": undefined,
                // Caller attributes win, as React spreads them after `className`
                "class": s.Tab,
                ...restAttrs,
                "disabled": disabled,
                "onPointerenter": handlePressableMouseEnter,
                "onClick": handleClick,
              },
              {
                default: () => [
                  h("span", { class: s.TabContent }, [
                    hasContent(iconSlot) ? wrapTextIcon(iconSlot) : renderIcon(props.icon),
                    hasContent(children) ? h("span", { class: s.TabLabel }, children) : null,
                    badgeProps
                      ? h(
                          "span",
                          {
                            "class": s.TabBadge,
                            "data-slot": "tab-badge",
                            "data-color": badgeProps.color ?? "secondary",
                            "data-variant": badgeProps.variant ?? "soft",
                            "data-pill": badgeProps.pill ? "" : undefined,
                          },
                          badgeProps.loading ? [h(LoadingIndicator)] : [badgeProps.content as VNodeArrayChildren[number]],
                        )
                      : null,
                  ]),
                  context.vertical.value ? h(CheckMd, { "class": s.TabCheckmark, "aria-hidden": "true" }) : null,
                ],
              },
            ),
        },
      )
    }
  },
})

type TabOwnProps = InstanceType<typeof TabComponent>["$props"]

/** TabsTab props; other attributes (`aria-label`, ...) fall through to the button. */
export type TabProps = TabOwnProps & { "aria-label"?: string }

export const TabsTab = TabComponent as typeof TabComponent & { new (): { $props: TabProps } }

/** Backward-compat alias of `TabsTab`, like React's `Tabs.Option` */
export const TabsOption: typeof TabsTab = TabsTab

// ---------------------------------------------------------------------------
// overflow="menu" (React's OverflowTabs)

/** Value of the menu button; no real tab has it */
const MORE_VALUE = "__plexui_tabs_more__"

type Slots = Record<string, ((...args: unknown[]) => VNodeArrayChildren) | undefined>

/** The TabsTab vnodes of a default slot, through fragments (`v-for`, `<template>`) */
const tabVNodes = (nodes: VNodeArrayChildren | undefined): VNode[] =>
  (nodes ?? []).flatMap((node) => {
    if (!isVNode(node)) return []
    if (node.type === Fragment && Array.isArray(node.children)) return tabVNodes(node.children as VNodeArrayChildren)
    return node.type === TabComponent ? [node] : []
  })

const slotsOf = (node: VNode) => (node.children && typeof node.children === "object" && !Array.isArray(node.children) ? (node.children as Slots) : {})

/** A tab's slot content; a vnode's raw slot may return a string or nothing */
const slotContent = (node: VNode, name: string): VNodeArrayChildren => {
  const content = slotsOf(node)[name]?.() as VNodeArrayChildren | VNodeArrayChildren[number] | undefined
  if (content == null) return []
  return Array.isArray(content) ? content : [content]
}

const labelContent = (node: VNode) => slotContent(node, "default")

const plainText = (node: unknown): string => {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(plainText).join("")
  if (isVNode(node)) {
    if (node.type === Comment) return ""
    if (typeof node.children === "string") return node.children
    if (Array.isArray(node.children)) return plainText(node.children)
    return plainText(labelContent(node))
  }
  return ""
}

const tabProps = (node: VNode) => (node.props ?? {}) as Record<string, unknown>

/** Slot content that renders something: text, or a vnode other than a comment */
const filled = (nodes: VNodeArrayChildren) =>
  plainText(nodes) !== "" || nodes.some((node) => isVNode(node) && node.type !== Comment)

const badgeText = (badge: unknown) => (isBadgeObject(badge as TabsBadgeProp) ? plainText((badge as { content: unknown }).content) : plainText(badge))

/** A tab's icon: the `icon` slot, else the prop */
const tabIcon = (node: VNode) => {
  const iconSlot = slotContent(node, "icon")
  return filled(iconSlot) ? iconSlot : renderIcon(tabProps(node).icon as TabsIconProp | undefined)
}

/** A tab's count as text: the `badge` slot, else the prop */
const tabCount = (node: VNode) => plainText(slotContent(node, "badge")) || badgeText(tabProps(node).badge)

/** A raw vnode prop holds a boolean attribute as written: `<TabsTab disabled>` is "" */
const tabDisabled = (node: VNode) => {
  const disabled = tabProps(node).disabled
  return disabled != null && disabled !== false
}

/** A tab's name: its text, else its accessible name, else its value */
const tabLabel = (node: VNode) =>
  plainText(labelContent(node)) || (tabProps(node)["aria-label"] as string | undefined) || String(tabProps(node).value)

/** What a tab's width depends on: the strip measures again when it changes */
const tabsSignature = (nodes: VNode[]) =>
  nodes
    .map((node) =>
      [
        tabProps(node).value,
        plainText(labelContent(node)),
        tabCount(node),
        tabProps(node).icon != null || slotsOf(node).icon != null,
      ].join("\u0000"),
    )
    .join("\u0001")

/**
 * MenuTrigger sets `data-state` (open or closed) on its child, while a tab
 * keeps `on` or `off` in the same attribute and the thumb finds the active tab
 * by it. The menu's value does not reach the tab; its handlers and
 * `aria-haspopup` / `aria-expanded` do.
 */
const MoreTab = defineComponent({
  name: "TabsMoreTab",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      const rest = { ...attrs }
      delete rest["data-state"]
      return h(TabComponent, rest as TabProps, slots)
    }
  },
})

const TabsPublic = defineComponent({
  name: "Tabs",
  inheritAttrs: false,
  props: {
    ...tabsProps,
    /**
     * What happens to tabs that do not fit in one row: the strip scrolls
     * sideways (`scroll`), or they move into a menu at its end (`menu`). The
     * menu button shows the active tab's name when it is a hidden one.
     * Horizontal tabs without `block` only.
     * @default "scroll"
     */
    overflow: { type: String as PropType<"scroll" | "menu">, default: "scroll" },
    /** Text of the menu button with `overflow="menu"`. @default "More" */
    overflowLabel: { type: String, default: "More" },
  },
  emits: tabsEmits,
  setup(props, { slots, attrs, emit }) {
    const hostRef = ref<HTMLDivElement | null>(null)
    // Uncontrolled like the group: `value` unset starts empty
    const uncontrolledValue = ref("")
    const current = computed(() => (props.value !== undefined ? props.value : uncontrolledValue.value))
    const select = (next: string) => {
      if (props.value === undefined) uncontrolledValue.value = next
      emit("update:value", next)
      emit("change", next)
    }

    // { count: null } while the measuring pass renders every tab and the
    // menu button; a new object each time, so an unchanged count still renders
    const measured = shallowRef<{ count: number | null }>({ count: null })
    let measuredSignature = ""
    let measuredActive = -1
    let lastRender = { measuring: true, signature: "", activeIndex: -1, length: 0 }
    let boxWidth = -1

    const measure = () => {
      if (!lastRender.measuring) return
      const root = hostRef.value?.firstElementChild
      if (!(root instanceof HTMLElement)) return

      const buttons = Array.from(root.querySelectorAll<HTMLElement>(":scope > button"))
      if (buttons.length !== lastRender.length + 1) return

      const widths = buttons.map((button) => button.getBoundingClientRect().width)
      const moreButton = buttons[buttons.length - 1]
      const moreWidth = widths.pop() ?? 0
      const style = getComputedStyle(root)
      const available =
        root.getBoundingClientRect().width -
        (Number.parseFloat(style.paddingLeft) || 0) -
        (Number.parseFloat(style.paddingRight) || 0)
      const gap = Number.parseFloat(style.columnGap) || 0
      boxWidth = hostRef.value?.parentElement?.clientWidth ?? -1
      measuredSignature = lastRender.signature
      measuredActive = lastRender.activeIndex

      if (available <= 0) {
        measured.value = { count: lastRender.length }
        return
      }

      const { activeIndex } = lastRender
      const chevron = moreButton?.querySelector("svg")
      const chevronWidth = chevron?.getBoundingClientRect().width ?? 0
      const labelGap = chevron?.parentElement ? Number.parseFloat(getComputedStyle(chevron.parentElement).columnGap) || 0 : 0
      const activeWidth = activeIndex < 0 ? 0 : (widths[activeIndex] ?? 0) + chevronWidth + labelGap
      measured.value = { count: visibleTabCount(widths, moreWidth, activeWidth, activeIndex, gap, available) }
    }

    // The width to fit is the container's; reports during a measuring pass
    // are skipped. The menu strip may appear or go after mount, with `overflow`
    let observer: ResizeObserver | undefined
    let observed: HTMLElement | null = null
    const observeBox = () => {
      const box = hostRef.value?.parentElement ?? null
      if (box === observed) return
      observer?.disconnect()
      observer = undefined
      observed = box
      if (!box || typeof ResizeObserver === "undefined") return
      observer = new ResizeObserver(() => {
        if (lastRender.measuring) return
        const width = box.clientWidth
        if (width === boxWidth) return
        boxWidth = width
        measured.value = { count: null }
      })
      observer.observe(box)
    }
    onMounted(() => {
      measure()
      observeBox()
    })
    onUpdated(() => {
      measure()
      observeBox()
    })
    onBeforeUnmount(() => observer?.disconnect())

    const forward = {
      "onUpdate:value": (value: string) => emit("update:value", value),
      "onChange": (value: string) => emit("change", value),
      "onClick": (event: MouseEvent) => emit("click", event),
    }

    return () => {
      const { overflow, overflowLabel, ...rootProps } = props
      if (overflow !== "menu" || props.block || props.orientation === "vertical") {
        return h(TabsComponent, { ...rootProps, ...attrs, ...forward }, slots)
      }

      const items = tabVNodes(slots.default?.() as VNodeArrayChildren | undefined)
      // The strip's own props size the tabs and the menu button too
      const signature = [overflowLabel, props.size, props.variant, props.gutterSize, props.pill, props.flush, props.mobileMaterial, props.mobileSegmentWidth, tabsSignature(items)].join(
        "\u0002",
      )
      const activeIndex = items.findIndex((item) => tabProps(item).value === current.value)
      const { count } = measured.value
      // New tabs measure again; so does an active tab that moves under the
      // menu button or back out, since the button carries the hidden one's name
      const stale =
        count !== null &&
        (signature !== measuredSignature ||
          (activeIndex !== measuredActive && (measuredActive >= count || activeIndex >= count)))
      const measuring = count === null || stale
      lastRender = { measuring, signature, activeIndex, length: items.length }

      const shown = measuring ? items : items.slice(0, count)
      const hidden = measuring ? [] : items.slice(count)
      const hiddenActive = hidden.find((item) => tabProps(item).value === current.value) ?? null

      const strip = h(
        TabsComponent,
        {
          ...rootProps,
          ...attrs,
          "data-overflow": "menu",
          "value": hiddenActive ? MORE_VALUE : current.value,
          // Pressing the menu button opens the menu; it is not a tab
          "onUpdate:value": (next: string) => {
            if (next !== MORE_VALUE) select(next)
          },
          "onClick": forward.onClick,
        },
        {
          default: () => [
            ...shown,
            measuring || hidden.length > 0
              ? h(MenuTrigger, null, {
                  default: () =>
                    h(MoreTab, { value: MORE_VALUE }, {
                      default: () => [
                        h("span", { class: s.OverflowLabel }, [hiddenActive ? tabLabel(hiddenActive) : overflowLabel, h(ChevronDownMd)]),
                      ],
                    }),
                })
              : null,
          ],
        },
      )

      return h("div", { ref: hostRef, class: s.OverflowHost }, [
        h(Menu, null, {
          default: () => [
            strip,
            h(MenuContent, { align: "end", minWidth: "auto" }, {
              default: () =>
                h(MenuRadioGroup, { "value": current.value, "onUpdate:value": select }, {
                  default: () =>
                    hidden.map((item) => {
                      const itemProps = tabProps(item)
                      const count = tabCount(item)
                      const label = labelContent(item)
                      return h(
                        MenuRadioItem,
                        {
                          key: String(itemProps.value),
                          value: String(itemProps.value),
                          disabled: props.disabled || tabDisabled(item),
                        },
                        {
                          default: () => [
                            tabIcon(item),
                            filled(label)
                              ? label
                              : ((itemProps["aria-label"] as string | undefined) ?? String(itemProps.value)),
                            // A tab's count moves into the menu with it
                            count !== "" ? h("span", { class: s.OverflowBadge }, count) : null,
                          ],
                        },
                      )
                    }),
                }),
            }),
          ],
        }),
      ])
    }
  },
})

type TabsOwnProps = InstanceType<typeof TabsPublic>["$props"]

/** Tabs props plus the attributes that fall through to the group element, as in React. */
export type TabsProps = TabsOwnProps & Omit<HTMLAttributes, keyof TabsOwnProps> & { "aria-label"?: string }

export const Tabs = TabsPublic as typeof TabsPublic & { new (): { $props: TabsProps } }
