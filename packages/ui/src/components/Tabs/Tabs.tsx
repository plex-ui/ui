"use client"

import clsx from "clsx"
import { ToggleGroup } from "radix-ui"
import { useCallback, useLayoutEffect, useRef } from "react"
import { useResizeObserver } from "usehooks-ts"
import { handlePressableMouseEnter, waitForAnimationFrame } from "../../lib/helpers"
import { type ControlSize, type SemanticColors, type Sizes, type Variants } from "../../types"
import { LoadingIndicator } from "../Indicator"
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
  "className"?: string
  "children": React.ReactNode
}

export const Tabs = <T extends string>({
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
  className,
  onClick,
  ...restProps
}: TabsProps<T>) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const prevSizeRef = useRef(size)
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
              activeNode.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
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
              activeNode.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })
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

  const transitionProperty = isVertical
    ? "height 300ms var(--cubic-enter), transform 300ms var(--cubic-enter)"
    : "width 300ms var(--cubic-enter), transform 300ms var(--cubic-enter)"

  useLayoutEffect(() => {
    const root = rootRef.current
    const thumb = thumbRef.current

    if (!root || !thumb) {
      return
    }

    const sizeChanged = prevSizeRef.current !== size
    prevSizeRef.current = size

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
    } else {
      // Normal update (value change, etc.)
      waitForAnimationFrame(() => {
        applyThumbSizing(!!thumb.style.transition)

        // Apply transition after initial calculation is set
        if (!thumb.style.transition) {
          waitForAnimationFrame(() => {
            thumb.style.transition = transitionProperty
          })
        }
      })
    }
  }, [applyThumbSizing, value, size, gutterSize, pill, flush, transitionProperty])

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
      {...restProps}
    >
      <div className={s.TabsThumb} ref={thumbRef} />
      {children}
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

const Tab = ({ children, icon, badge, ...restProps }: TabProps) => {
  // Normalize badge prop
  const badgeProps = badge != null ? (isBadgeObject(badge) ? badge : { content: badge }) : null

  return (
    <ToggleGroup.Item
      className={s.Tab}
      {...restProps}
      onPointerEnter={handlePressableMouseEnter}
    >
      <span className={s.TabContent}>
        {icon}
        {children && <span>{children}</span>}
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
    </ToggleGroup.Item>
  )
}

// Attach sub-components
Tabs.Tab = Tab
// Backward-compat alias
Tabs.Option = Tab
