"use client"

import clsx from "clsx"
import { ToggleGroup } from "radix-ui"
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import { useResizeObserver } from "usehooks-ts"
import { handlePressableMouseEnter, waitForAnimationFrame } from "../../lib/helpers"
import { type ControlSize, type SemanticColors, type Sizes, type Variants } from "../../types"
import { ChevronDownMd } from "../Icon"
import { LoadingIndicator } from "../Indicator"
import { Menu } from "../Menu"
import { fitCount, visibleTabCount } from "./overflow"
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
  "className"?: string
  "children": React.ReactNode
}

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
  className,
  onClick,
  ...restProps
}: Omit<TabsProps<T>, "overflow" | "overflowLabel">) => {
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

// =============================================
// overflow="menu"
// =============================================

/** Value of the menu button; no real tab has it */
const MORE_VALUE = "__plexui_tabs_more__"

type TabElement = ReactElement<TabProps>

const tabElements = (children: ReactNode): TabElement[] =>
  Children.toArray(children).filter((child): child is TabElement => isValidElement<TabProps>(child))

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
  items.map((item) => [item.props.value, plainText(item.props.children), badgeText(item.props.badge)].join("\u0000")).join("\u0001")

/**
 * `Menu.Trigger` sets `data-state` (open or closed) on its child, while a tab
 * keeps `on` or `off` in the same attribute and the thumb finds the active tab
 * by it. The menu's value does not reach the tab; its handlers and
 * `aria-haspopup` / `aria-expanded` do.
 */
const MoreTab = ({ "data-state": _menuState, ...restProps }: TabProps & { "data-state"?: string }) => (
  <Tab {...restProps} />
)

const OverflowTabs = <T extends string>({
  children,
  value,
  onChange,
  overflowLabel,
  ...restProps
}: Omit<TabsProps<T>, "overflow"> & { overflowLabel: string }) => {
  const items = tabElements(children)
  const signature = tabsSignature(items)
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
      setVisibleCount(items.length)
      return
    }

    // The button with the active tab's name: that tab's width plus the chevron
    const chevron = moreButton?.querySelector("svg")
    const chevronWidth = chevron?.getBoundingClientRect().width ?? 0
    const labelGap = chevron?.parentElement ? Number.parseFloat(getComputedStyle(chevron.parentElement).columnGap) || 0 : 0
    const activeWidth = activeIndex < 0 ? 0 : (widths[activeIndex] ?? 0) + chevronWidth + labelGap

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
          {shown}
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
                <Menu.RadioItem<string> key={item.props.value} value={item.props.value} disabled={item.props.disabled}>
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
