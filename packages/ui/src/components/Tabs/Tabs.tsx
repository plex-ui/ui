"use client"

import clsx from "clsx"
import { ToggleGroup } from "radix-ui"
import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import { useResizeObserver } from "usehooks-ts"
import { handlePressableMouseEnter, prefersReducedMotion, waitForAnimationFrame } from "../../lib/helpers"
import { type ControlSize, type SemanticColors, type Sizes, type Variants } from "../../types"
import { CheckMd, ChevronDownMd } from "../Icon"
import { LoadingIndicator } from "../Indicator"
import { Menu } from "../Menu"
import { visibleTabCount } from "./overflow"
import { equalizeSegments, watchSegments } from "./segments"
import s from "@plexui/styles/components/Tabs/Tabs.module.css"

export type SizeVariant = "2xs" | "xs" | "sm" | "md" | "lg" | "xl"

export type TabsVariant = "segmented" | "underline"
export type TabsOrientation = "horizontal" | "vertical"

export type TabsProps<T extends string> = {
  /**
   * Controlled value for the group
   */
  "value": T
  /** Callback for when a new value is selected */
  "onChange"?: (nextValue: T) => void
  /** Callback any time the control is clicked (even if a new value was not selected) */
  "onClick"?: () => void
  /**
   * Text read aloud to screen readers when the control is focused
   */
  "aria-label": string
  /**
   * Visual variant of the tab group
   * - `"segmented"` — background container with sliding highlight (default)
   * - `"underline"` — no background, animated line indicator under active tab
   * @default "segmented"
   */
  "variant"?: TabsVariant
  /**
   * Orientation of the tab layout
   * @default "horizontal"
   */
  "orientation"?: TabsOrientation
  /**
   * Controls the size of the tabs
   *
   * | 3xs     | 2xs     | xs      | sm      | md      | lg      | xl      | 2xl     | 3xl     |
   * | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
   * | `22px`  | `24px`  | `26px`  | `28px`  | `32px`  | `36px`  | `40px`  | `44px`  | `48px`  |
   *
   * On a phone horizontal tabs take the two sizes of the iOS 27 segmented control: `sm` and smaller the small 32px
   * one, `md` and larger the large 48px one (49px with `mobileMaterial="flat"`).
   *
   * @default md
   */
  "size"?: ControlSize
  /**
   * Controls gutter on the edges of the button, defaults to value from `size`.
   *
   * | 2xs    | xs     | sm     | md     | lg     | xl     |
   * | ------ | ------ | ------ | ------ | ------ | ------ |
   * | `6px`  | `8px`  | `10px` | `12px` | `14px` | `16px` |
   */
  "gutterSize"?: Sizes<"2xs" | "xs" | "sm" | "md" | "lg" | "xl">
  /** Disable the entire group */
  "disabled"?: boolean
  /**
   * Display the control as a block element with equal width segments
   * @default false
   */
  "block"?: boolean
  /**
   * Determines if the tabs should be a fully rounded pill shape.
   * Only applies to the `"segmented"` variant.
   * @default true
   */
  "pill"?: boolean
  /**
   * Flush underline style — removes tab padding so the indicator
   * matches the text width exactly, uses gap for spacing, and
   * removes the bottom border.
   * Only applies to the `"underline"` variant.
   * @default false
   */
  "flush"?: boolean
  /**
   * What happens to tabs that do not fit in one row: the strip scrolls
   * sideways (`scroll`), or the tabs that do not fit move into a menu at the
   * end of the strip (`menu`). The menu button shows the active tab's name
   * when it is one of the hidden ones. Horizontal tabs without `block` only.
   * @default "scroll"
   */
  "overflow"?: "scroll" | "menu"
  /**
   * Text of the menu button with `overflow="menu"`
   * @default "More"
   */
  "overflowLabel"?: string
  /**
   * Phone surface of horizontal tabs. On a phone the large control (`md` and larger) is the glass capsule of iOS 27
   * apps and the small one (`sm` and smaller) the plain capsule of SwiftUI's segmented Picker; `flat` gives the large
   * one the plain look of SwiftUI's `.controlSize(.large)`, and `glass` gives the small one `.glassEffect()`, as the
   * Button prop of the same name does for a button. Inside a phone Toolbar the control is the large glass one
   * anyway. Desktop keeps the chosen variant.
   * @default "glass" at md and larger, "flat" at sm and smaller
   */
  "mobileMaterial"?: "glass" | "flat"
  /**
   * Widths of the segments of horizontal tabs on a phone, as UISegmentedControl sets them. `equal` gives every
   * segment the widest one's width, its default; `content` gives each its label and the same air around it, as
   * `apportionsSegmentWidthsByContent` does, for a compact control. Equal segments that do not fit take their labels'
   * widths anyway; where those still do not fit, the air beside each label narrows, to 4px, and what still does not
   * fit scrolls. A `block` control fills its row either way. Desktop tabs always take their labels' widths.
   * @default "equal"
   */
  "mobileSegmentWidth"?: "equal" | "content"
  "className"?: string
  "children": React.ReactNode
}

/** Vertical tabs are a list on a phone, where the selected row shows a checkmark */
const TabsVerticalContext = createContext(false)

export const Tabs = <T extends string>({ overflow = "scroll", overflowLabel = "More", ...props }: TabsProps<T>) => {
  if (overflow === "menu" && !props.block && props.orientation !== "vertical") {
    return <OverflowTabs {...props} overflowLabel={overflowLabel} />
  }
  return <TabsRoot {...props} />
}

const TabsRoot = <T extends string>({
  value,
  onChange,
  children,
  variant = "segmented",
  orientation = "horizontal",
  block,
  pill = true,
  flush,
  size = "md",
  gutterSize,
  mobileMaterial,
  mobileSegmentWidth,
  className,
  onClick,
  ...restProps
}: Omit<TabsProps<T>, "overflow" | "overflowLabel">) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const prevSizeRef = useRef(size)
  const prevValueRef = useRef(value)
  const isVertical = orientation === "vertical"

  const applyThumbSizing = useCallback(
    (attemptScroll: boolean) => {
      const root = rootRef.current
      const thumb = thumbRef.current

      if (!root || !thumb) {
        return
      }

      // Get selected node
      const activeNode = root?.querySelector<HTMLDivElement>('[data-state="on"]')

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
    },
    [isVertical],
  )

  useResizeObserver({
    // @ts-expect-error(2322) -- bug in types: https://github.com/juliencrn/usehooks-ts/issues/663
    ref: rootRef,
    onResize: () => {
      const thumb = thumbRef.current

      if (!thumb) {
        return
      }

      // Perform the size update instantly
      const currentTransition = thumb.style.transition
      thumb.style.transition = ""
      applyThumbSizing(false)
      thumb.style.transition = currentTransition
    },
  })

  // Tabs added, removed, reordered or relabelled move the active tab without
  // resizing the group: measure again, instantly, like a resize
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof MutationObserver === "undefined") return
    const observer = new MutationObserver(() => {
      const thumb = thumbRef.current
      if (!thumb) return
      const currentTransition = thumb.style.transition
      thumb.style.transition = ""
      applyThumbSizing(false)
      thumb.style.transition = currentTransition
    })
    observer.observe(root, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }, [applyThumbSizing])

  // A phone's segmented control at its own width gives every segment the widest one's width, as UISegmentedControl
  // does in iOS 27.2; where that does not fit, each segment takes its label and the same air around it, as
  // apportionsSegmentWidthsByContent does (ref-app segmented-hug, 13.11). A grid that hugs its content cannot take the
  // widest track for each by itself, so this measures it. Runs before the thumb measures (declared first).
  useLayoutEffect(() => {
    equalizeSegments(rootRef.current, thumbRef.current)
  })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    // The room, the breakpoint or the font changes. The segments can change without the control changing size, so the
    // thumb follows them here, instantly, like a resize.
    return watchSegments(root, () => thumbRef.current, () => {
      const thumb = thumbRef.current
      if (!thumb) return
      const currentTransition = thumb.style.transition
      thumb.style.transition = ""
      applyThumbSizing(false)
      thumb.style.transition = currentTransition
    })
  }, [applyThumbSizing])

  const transitionProperty = isVertical
    ? "height var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter)), transform var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter))"
    : "width var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter)), transform var(--tabs-thumb-transition-duration, 200ms) var(--tabs-thumb-transition-easing, var(--cubic-enter))"

  useLayoutEffect(() => {
    const root = rootRef.current
    const thumb = thumbRef.current

    if (!root || !thumb) {
      return
    }

    const sizeChanged = prevSizeRef.current !== size
    prevSizeRef.current = size
    const valueChanged = prevValueRef.current !== value
    prevValueRef.current = value

    if (sizeChanged) {
      // Size changed - disable transition, wait for CSS, then apply sizing
      const currentTransition = thumb.style.transition
      thumb.style.transition = ""

      waitForAnimationFrame(() => {
        applyThumbSizing(false)
        waitForAnimationFrame(() => {
          thumb.style.transition = currentTransition
        })
      })
    } else if (thumb.style.transition) {
      // Normal update (value change, etc.): the thumb leaves with the label's colour
      const from = valueChanged ? thumbBox(thumb) : null
      applyThumbSizing(true)
      if (valueChanged) playThumbLens(thumb, from)
    } else {
      // First measure: apply transition after initial calculation is set
      waitForAnimationFrame(() => {
        applyThumbSizing(false)
        waitForAnimationFrame(() => {
          thumb.style.transition = transitionProperty
        })
      })
    }
    // mobileSegmentWidth moves the segments with nothing else changing: the thumb follows them
  }, [applyThumbSizing, value, size, gutterSize, pill, flush, mobileSegmentWidth, transitionProperty])

  const handleValueChange = (nextValue: T) => {
    // Only trigger onChange when a value exists
    // Disallow toggling off enabled items
    if (nextValue && onChange) onChange(nextValue)
  }

  // Only apply pill for segmented variant
  const isPill = variant === "segmented" && pill
  // Only apply flush for underline variant
  const isFlush = variant === "underline" && flush

  return (
    <ToggleGroup.Root
      ref={rootRef}
      className={clsx(s.Tabs, className)}
      type="single"
      value={value}
      loop={false}
      onValueChange={handleValueChange}
      onClick={onClick}
      data-variant={variant}
      data-orientation={orientation}
      data-block={block ? "" : undefined}
      data-pill={isPill ? "" : undefined}
      data-flush={isFlush ? "" : undefined}
      data-size={size}
      data-gutter-size={gutterSize}
      data-mobile-material={mobileMaterial}
      data-mobile-segment-width={mobileSegmentWidth}
      data-disabled={restProps.disabled ? "" : undefined}
      {...restProps}
    >
      <div className={s.TabsThumb} ref={thumbRef} />
      <TabsVerticalContext.Provider value={isVertical}>{children}</TabsVerticalContext.Provider>
    </ToggleGroup.Root>
  )
}

/**
 * Badge configuration for Tabs.Tab
 */
export type TabsBadgeProp =
  | React.ReactNode
  | {
      content: React.ReactNode
      color?: SemanticColors<
        "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
      >
      variant?: Variants<"soft" | "solid">
      pill?: boolean
      loading?: boolean
    }

export type TabProps = {
  /**
   * Tab value
   */
  "value": string
  /**
   * Text read aloud to screen readers when the tab is focused
   */
  "aria-label"?: string
  /**
   * Text content to render in the tab
   */
  "children"?: React.ReactNode
  /**
   * Icon to render before the text content
   */
  "icon"?: React.ReactNode
  /**
   * Badge to render after the text content.
   * Can be a simple value or an object with content, color, variant, and loading options.
   * @example badge={5}
   * @example badge={{ content: 5, color: "danger" }}
   */
  "badge"?: TabsBadgeProp
  /**
   * Disable the individual tab
   */
  "disabled"?: boolean
}

// Type guard for badge object form
const isBadgeObject = (
  badge: TabsBadgeProp,
): badge is Exclude<TabsBadgeProp, React.ReactNode> & { content: React.ReactNode } => {
  return badge != null && typeof badge === "object" && "content" in badge
}

/** True when an icon draws text of its own: a string, a number, or a fragment or array holding one */

/** A text icon ("☀") stands in an element, as an icon component does, so a phone can hide it beside a label: each
 * text in a fragment or array gets its own span and the elements beside it stay in place. An empty one draws
 * nothing. */
// Arrays and fragments always go through Children.map, with or without text, so their children keep the same keys
// when a text child comes or goes; a fragment keeps its element and key, so a new key still remounts its icons.
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

const renderTabIcon = (icon: React.ReactNode): React.ReactNode => {
  if (icon === "") return null
  if (typeof icon === "string" || typeof icon === "number") return <span>{icon}</span>
  if (Array.isArray(icon)) return Children.map(icon, renderTabIcon)
  if (isValidElement<{ children?: React.ReactNode }>(icon) && icon.type === Fragment) {
    return cloneElement(icon, undefined, Children.map(icon.props.children, renderTabIcon))
  }
  return icon
}

const Tab = ({ children, icon, badge, ...restProps }: TabProps) => {
  // Normalize badge prop
  const badgeProps = badge != null ? (isBadgeObject(badge) ? badge : { content: badge }) : null
  const vertical = useContext(TabsVerticalContext)

  return (
    <ToggleGroup.Item
      className={s.Tab}
      {...restProps}
      onPointerEnter={handlePressableMouseEnter}
    >
      <span className={s.TabContent}>
        {renderTabIcon(icon)}
        {children && <span className={s.TabLabel}>{children}</span>}
        {badgeProps && (
          <span
            className={s.TabBadge}
            data-color={badgeProps.color ?? "secondary"}
            data-variant={badgeProps.variant ?? "soft"}
            data-pill={badgeProps.pill ? "" : undefined}
          >
            {badgeProps.loading ? <LoadingIndicator /> : badgeProps.content}
          </span>
        )}
      </span>
      {vertical && <CheckMd className={s.TabCheckmark} aria-hidden="true" />}
    </ToggleGroup.Item>
  )
}

// =============================================
// overflow="menu"
// =============================================

/** Value of the menu button; no real tab has it */
const MORE_VALUE = "__plexui_tabs_more__"

type TabElement = ReactElement<TabProps>

/** The tabs among the children, through fragments */
const tabElements = (children: ReactNode): TabElement[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return []
    return child.type === Fragment ? tabElements(child.props.children) : [child as TabElement]
  })

const plainText = (node: unknown): string => {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(plainText).join("")
  if (isValidElement<{ children?: ReactNode }>(node)) return plainText(node.props.children)
  return ""
}

const badgeText = (badge: TabsBadgeProp | undefined) =>
  badge != null && isBadgeObject(badge) ? plainText(badge.content) : plainText(badge)

/** A tab's name: its text, else its accessible name, else its value */
const tabLabel = (item: TabElement) => plainText(item.props.children) || item.props["aria-label"] || item.props.value

/** What a tab's width depends on: the strip measures again when it changes */
const tabsSignature = (items: TabElement[]) =>
  items
    .map((item) =>
      [item.props.value, plainText(item.props.children), badgeText(item.props.badge), item.props.icon != null].join("\u0000"),
    )
    .join("\u0001")

/**
 * `Menu.Trigger` sets `data-state` (open or closed) on its child, while a tab
 * keeps `on` or `off` in the same attribute and the thumb finds the active tab
 * by it. The menu's value does not reach the tab; its handlers and
 * `aria-haspopup` / `aria-expanded` do.
 */
const MoreTab = (props: TabProps & { "data-state"?: string }) => {
  const restProps = { ...props }
  delete restProps["data-state"]
  return <Tab {...restProps} />
}

const OverflowTabs = <T extends string>({
  children,
  value,
  onChange,
  overflowLabel,
  ...restProps
}: Omit<TabsProps<T>, "overflow"> & { overflowLabel: string }) => {
  const items = tabElements(children)
  // The strip's own props size the tabs and the menu button too
  const { size, variant, gutterSize, pill, flush, mobileMaterial, mobileSegmentWidth } = restProps
  const signature = [overflowLabel, size, variant, gutterSize, pill, flush, mobileMaterial, mobileSegmentWidth, tabsSignature(items)].join("\u0002")
  const activeIndex = items.findIndex((item) => item.props.value === value)

  // null while the measuring pass renders every tab and the menu button
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const [known, setKnown] = useState({ signature, activeIndex })
  const hostRef = useRef<HTMLDivElement>(null)
  const measuringRef = useRef(true)
  const boxWidthRef = useRef(-1)

  // New tabs measure again. A new active tab measures again when it moves
  // under the menu button or back out: the button carries the hidden one's name
  if (known.signature !== signature || known.activeIndex !== activeIndex) {
    const crossed =
      visibleCount !== null && (known.activeIndex >= visibleCount || activeIndex >= visibleCount)
    setKnown({ signature, activeIndex })
    if (visibleCount !== null && (known.signature !== signature || crossed)) setVisibleCount(null)
  }

  useLayoutEffect(() => {
    measuringRef.current = visibleCount === null
  }, [visibleCount])

  useLayoutEffect(() => {
    if (visibleCount !== null) return
    const root = hostRef.current?.firstElementChild
    if (!(root instanceof HTMLElement)) return

    // The measuring pass renders every tab, then the menu button
    const buttons = Array.from(root.querySelectorAll<HTMLElement>(":scope > button"))
    if (buttons.length !== items.length + 1) return

    const widths = buttons.map((button) => button.getBoundingClientRect().width)
    const moreButton = buttons[buttons.length - 1]
    const moreWidth = widths.pop() ?? 0
    const style = getComputedStyle(root)
    const available =
      root.getBoundingClientRect().width -
      (Number.parseFloat(style.paddingLeft) || 0) -
      (Number.parseFloat(style.paddingRight) || 0)
    const gap = Number.parseFloat(style.columnGap) || 0
    boxWidthRef.current = hostRef.current?.parentElement?.clientWidth ?? -1

    // A hidden strip has no width to decide by: show every tab, and measure
    // when it appears (the observer sees the width change)
    if (available <= 0) {
      // Resolve the zero-width measuring pass before paint; the resize observer
      // restarts measurement when this hidden strip becomes visible.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleCount(items.length)
      return
    }

    // The button with the active tab's name: that tab's width plus the chevron
    const chevron = moreButton?.querySelector("svg")
    const chevronWidth = chevron?.getBoundingClientRect().width ?? 0
    const labelGap = chevron?.parentElement ? Number.parseFloat(getComputedStyle(chevron.parentElement).columnGap) || 0 : 0
    const activeWidth = activeIndex < 0 ? 0 : (widths[activeIndex] ?? 0) + chevronWidth + labelGap

    // This result depends on committed DOM widths. Apply it before first paint
    // so the temporary full strip never flashes before overflowing tabs move.
    setVisibleCount(visibleTabCount(widths, moreWidth, activeWidth, activeIndex, gap, available))
  }, [visibleCount, items.length, activeIndex])

  // The width to fit is the container's, not the strip's: the strip shrinks
  // to its content. Reports during a measuring pass are skipped, since the
  // full strip may be pushing its container wider
  useEffect(() => {
    const box = hostRef.current?.parentElement
    if (!box || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => {
      if (measuringRef.current) return
      const width = box.clientWidth
      if (width === boxWidthRef.current) return
      boxWidthRef.current = width
      setVisibleCount(null)
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  const measuring = visibleCount === null
  const shown = measuring ? items : items.slice(0, visibleCount)
  const hidden = measuring ? [] : items.slice(visibleCount)
  const hiddenActive = hidden.find((item) => item.props.value === value) ?? null

  return (
    <div ref={hostRef} className={s.OverflowHost}>
      <Menu>
        <TabsRoot<string>
          {...restProps}
          data-overflow="menu"
          value={hiddenActive ? MORE_VALUE : value}
          onChange={(next) => {
            // Pressing the menu button opens the menu; it is not a tab
            if (next !== MORE_VALUE) onChange?.(next as T)
          }}
        >
          {/* Keyed by value: tabs from different fragments may share a key */}
          {shown.map((item) => cloneElement(item, { key: item.props.value }))}
          {(measuring || hidden.length > 0) && (
            <Menu.Trigger>
              <MoreTab value={MORE_VALUE}>
                <span className={s.OverflowLabel}>
                  {hiddenActive ? tabLabel(hiddenActive) : overflowLabel}
                  <ChevronDownMd />
                </span>
              </MoreTab>
            </Menu.Trigger>
          )}
        </TabsRoot>
        <Menu.Content align="end" minWidth="auto">
          <Menu.RadioGroup<string> value={value} onChange={(next) => onChange?.(next as T)}>
            {hidden.map((item) => {
              const count = badgeText(item.props.badge)
              return (
                <Menu.RadioItem<string>
                  key={item.props.value}
                  value={item.props.value}
                  disabled={restProps.disabled || item.props.disabled}
                >
                  {item.props.icon}
                  {item.props.children ?? item.props["aria-label"] ?? item.props.value}
                  {/* A tab's count moves into the menu with it */}
                  {count !== "" && <span className={s.OverflowBadge}>{count}</span>}
                </Menu.RadioItem>
              )
            })}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu>
    </div>
  )
}

// Attach sub-components
Tabs.Tab = Tab
// Backward-compat alias
Tabs.Option = Tab
