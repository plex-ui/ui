"use client"

import clsx from "clsx"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react"
import s from "@plexui/styles/components/TabBar/TabBar.module.css"
import { useLatestValue } from "../../hooks/useLatestValue"
import { Search as SearchIcon } from "../Icon"
import { barBackground, ToolbarHostContext, type BarBackground, type BarBackgroundAlias } from "../Toolbar/Toolbar"

/** A scroll of at least this many pixels in one direction minimizes or expands the bar. */
const MINIMIZE_AFTER = 8

type TabBarContextValue = {
  value: string | undefined
  minimized: boolean
  select: (value: string) => void
  expand: () => void
}

const TabBarContext = createContext<TabBarContextValue | null>(null)

function useTabBarContext(part: string) {
  const context = useContext(TabBarContext)
  if (!context) throw new Error(`${part} must be used within TabBar`)
  return context
}

export type TabBarSearch = {
  /** The value of the search tab. */
  value: string
  /** Accessible name of the search tab. @default "Search" */
  label?: string
}

export type TabBarProminent = {
  /** The value of the prominent tab. */
  value: string
  /** Accessible name of the prominent tab: its circle shows the symbol only. */
  label: string
  /** The symbol, a PlexUI icon. */
  icon: ReactNode
}

export type TabBarProps = {
  /** The controlled value of the selected tab. Use with `onValueChange`. */
  value?: string
  /** The selected tab when it is initially rendered. */
  defaultValue?: string
  /** Called with the value of the tab a person selects. */
  onValueChange?: (value: string) => void
  /** A search tab in a glass circle of its own at the trailing end, as the iOS 26 separate search tab. */
  search?: TabBarSearch
  /**
   * The one destination the app lifts out of the capsule, a cart or a library, in a glass circle of its own at
   * the trailing end, as the iOS 27 prominent tab role. It takes the circle of the search tab: with both, search
   * is the last tab of the capsule, as iOS gives search that place only when no other tab is prominent.
   */
  prominent?: TabBarProminent
  /**
   * `onScrollDown` minimizes the bar to the selected tab while the content of the `Page` scrolls down and
   * expands it when the content scrolls back up; a tap on the minimized tab expands it too. @default "never"
   */
  minimizeBehavior?: "never" | "onScrollDown"
  /** Controlled minimized state. Use with `onMinimizedChange`. */
  minimized?: boolean
  /** The minimized state when it is initially rendered. @default false */
  defaultMinimized?: boolean
  /** Called when the bar minimizes or expands. */
  onMinimizedChange?: (minimized: boolean) => void
  /** How the bar meets the content scrolled under it; see `BarBackground` (`"solid"` is the earlier name of `"hard"`). @default "soft" */
  background?: BarBackground | BarBackgroundAlias
  /**
   * Content in a glass capsule above the tabs, a now playing row or a status, as the iOS 27 bottom accessory;
   * minimized, it stands between the two circles. The bar grows by its height.
   */
  accessory?: ReactNode
  /** Accessible name of the navigation. @default "Tabs" */
  "aria-label"?: string
  /** `TabBar.Item` elements. */
  children?: ReactNode
  /** CSS classes applied to the bar */
  className?: string
  ref?: Ref<HTMLElement>
}

/**
 * The tab bar of a phone screen after the iOS 26 kit Tab Bar - iPhone (507:24689): two to five tabs, each a
 * symbol over a label, in a floating glass capsule at the bottom, the selected tab on a pill, and an optional
 * search or prominent tab in a circle of its own. It minimizes to the selected tab while the content scrolls
 * down. A desktop layout navigates with a Sidebar or Tabs, so the bar never renders from 768px up.
 */
function TabBarRoot({
  value: valueProp,
  defaultValue,
  onValueChange,
  search,
  prominent,
  minimizeBehavior = "never",
  minimized: minimizedProp,
  defaultMinimized = false,
  onMinimizedChange,
  background = "soft",
  accessory,
  "aria-label": ariaLabel = "Tabs",
  children,
  className,
  ref,
}: TabBarProps) {
  const host = useContext(ToolbarHostContext)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = valueProp ?? internalValue
  const [internalMinimized, setInternalMinimized] = useState(defaultMinimized)
  const minimized = minimizedProp ?? internalMinimized
  const onValueChangeRef = useLatestValue(onValueChange)
  const onMinimizedChangeRef = useLatestValue(onMinimizedChange)
  const minimizedRef = useLatestValue(minimized)
  const controlledMinimized = minimizedProp !== undefined

  const select = useCallback((next: string) => {
    if (valueProp === undefined) setInternalValue(next)
    onValueChangeRef.current?.(next)
  }, [valueProp, onValueChangeRef])

  const setMinimized = useCallback((next: boolean) => {
    if (next === minimizedRef.current) return
    // A controlled state changes only when the owner passes it back.
    if (!controlledMinimized) {
      minimizedRef.current = next
      setInternalMinimized(next)
    }
    onMinimizedChangeRef.current?.(next)
  }, [controlledMinimized, minimizedRef, onMinimizedChangeRef])

  const expand = useCallback(() => setMinimized(false), [setMinimized])

  // The bar follows the Page content: down by MINIMIZE_AFTER minimizes it, up by as much (or the top) expands it.
  const subscribeScroll = host?.subscribeScroll
  useEffect(() => {
    if (minimizeBehavior !== "onScrollDown" || !subscribeScroll) return
    let anchor = 0
    return subscribeScroll((scrollTop) => {
      if (scrollTop <= 0) {
        anchor = 0
        return setMinimized(false)
      }
      const delta = scrollTop - anchor
      if (minimizedRef.current ? delta < 0 : delta > 0) {
        if (Math.abs(delta) >= MINIMIZE_AFTER) {
          anchor = scrollTop
          setMinimized(!minimizedRef.current)
        }
        return
      }
      anchor = scrollTop
    })
  }, [minimizeBehavior, subscribeScroll, setMinimized, minimizedRef])

  const element = useRef<HTMLElement | null>(null)
  const setRef = useCallback((node: HTMLElement | null) => {
    element.current = node
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])

  // Like a bottom Toolbar, the bar reserves its height on the Page; a desktop layout hides it.
  const setHeight = host?.setHeight
  useLayoutEffect(() => {
    const bar = element.current
    if (!bar || !setHeight) return
    const update = () => setHeight("bottom", bar.offsetHeight || undefined)
    update()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    observer?.observe(bar, { box: "border-box" })
    return () => { observer?.disconnect(); setHeight("bottom", undefined) }
  }, [setHeight])

  const context = { value, minimized, select, expand }
  // `accessory={playing && <NowPlaying />}` leaves no empty capsule when nothing plays.
  const hasAccessory = accessory != null && typeof accessory !== "boolean" && accessory !== ""
  const accessoryCapsule = hasAccessory && <div key="accessory" className={s.Accessory}>{accessory}</div>
  const tabs = (
    <div key="tabs" className={s.Tabs}>
      {children}
      {search && prominent && <TabBarItem value={search.value} label={search.label ?? "Search"} icon={<SearchIcon />} />}
    </div>
  )
  const circle = prominent ? (
    <TabBarItem key="prominent" className={s.Prominent} value={prominent.value} label={prominent.label} icon={prominent.icon} hideLabel />
  ) : search && (
    <TabBarItem key="search" className={s.Search} value={search.value} label={search.label ?? "Search"} icon={<SearchIcon />} hideLabel />
  )

  return (
    <nav
      ref={setRef}
      aria-label={ariaLabel}
      className={clsx(s.TabBar, className)}
      data-host={host?.kind}
      data-background={barBackground(background)}
      data-content-below={host?.contentBelow ? "" : undefined}
      data-minimized={minimized ? "" : undefined}
      data-search={search && !prominent ? "" : undefined}
      data-prominent={prominent ? "" : undefined}
      data-accessory={hasAccessory ? "" : undefined}
    >
      <TabBarContext.Provider value={context}>
        {/* The accessory is read where it stands: above the tabs, and minimized between the two circles. The keys
            move it there without remounting its content. */}
        {minimized ? [tabs, accessoryCapsule, circle] : [accessoryCapsule, tabs, circle]}
      </TabBarContext.Provider>
    </nav>
  )
}
TabBarRoot.displayName = "TabBar"

export type TabBarItemProps = {
  /** The value of the tab. */
  value: string
  /** The label under the symbol, and the accessible name of the tab. */
  label: string
  /** The symbol, a PlexUI icon. */
  icon: ReactNode
  /**
   * A count or a short word in a red capsule over the symbol, as an iOS tab badge; it is read after the label.
   * A count of 0 shows none, as on iOS.
   */
  badge?: ReactNode
  /** Makes the tab a link to this URL. */
  href?: string
  /** When `true`, the tab cannot be selected. */
  disabled?: boolean
  /** Called when the tab is pressed, before it is selected. */
  onClick?: (event: MouseEvent<HTMLElement>) => void
  /** CSS classes applied to the tab */
  className?: string
  /** @internal The search and the prominent tab show their symbol only. */
  hideLabel?: boolean
}

/** A badge shows unless it is empty: nothing, false, an empty text or a count of 0 (iOS hides `.badge(0)`). */
const hasBadge = (badge: ReactNode) => badge != null && badge !== false && badge !== "" && badge !== 0

function TabBarItem({ value, label, icon, badge, href, disabled = false, onClick, className, hideLabel = false }: TabBarItemProps) {
  const context = useTabBarContext("TabBar.Item")
  const selected = context.value === value
  // A minimized bar shows the selected tab only; pressing it brings the other tabs back.
  const collapsed = context.minimized && selected && !hideLabel
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || disabled) return
    if (collapsed) {
      event.preventDefault()
      return context.expand()
    }
    context.select(value)
  }
  const content = (
    <>
      <span className={s.Icon} aria-hidden="true">{icon}</span>
      {!hideLabel && <span className={s.Label}>{label}</span>}
      {/* The space keeps the accessible name "Inbox 3", not "Inbox3". */}
      {hasBadge(badge) && <>{" "}<span className={s.Badge}>{badge}</span></>}
    </>
  )
  const props = {
    "className": clsx(s.Item, className),
    "aria-current": selected ? ("page" as const) : undefined,
    "aria-label": hideLabel ? label : undefined,
    "aria-expanded": collapsed ? false : undefined,
    "data-selected": selected ? "" : undefined,
    "data-disabled": disabled ? "" : undefined,
    "data-value": value,
    "onClick": handleClick,
  }
  if (href !== undefined && !disabled) return <a href={href} {...props}>{content}</a>
  return <button type="button" disabled={disabled} {...props}>{content}</button>
}
TabBarItem.displayName = "TabBar.Item"

export const TabBar = Object.assign(TabBarRoot, { Item: TabBarItem })
