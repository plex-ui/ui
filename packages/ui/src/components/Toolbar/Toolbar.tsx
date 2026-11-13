"use client"

import clsx from "clsx"
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react"
import { createPortal } from "react-dom"
import s from "@plexui/styles/components/Toolbar/Toolbar.module.css"

export type ToolbarPlacement = "top" | "bottom"
/** Title layouts of the phone top bar. */
export type ToolbarTitleStyle = "inline" | "large" | "compact-large" | "compact-medium"
export type ToolbarTitleAlign = "center" | "start"
/**
 * How a bar meets the content scrolled under it, after the scroll edge effect of iOS 26:
 * - `"soft"` (the default of a bottom bar): at the top, once content is under the bar, a blur that grows toward the top under a
 *   thin veil of the canvas color, with no line, which lets go past the bar; at the bottom of a page the content stays clear
 *   under and around the controls, as on native iOS 26, and a Sheet's bottom bar fades its content into the panel
 * - `"hard"`: an opaque bar of the canvas color with a hairline once content is under it
 * - `"glass"` (the default of a top bar): a translucent, blurred bar with a hairline, shown once content is under it
 * - `"blur"`: no fill and no line, once content is under the bar: the content blurred a little over the bar and past it,
 *   and heavily toward the screen's edge
 *
 * iOS 27.2 has two scroll edges, soft and hard; glass is the bar of earlier iOS and blur an app's own.
 */
export type BarBackground = "soft" | "hard" | "glass" | "blur"
/**
 * `"solid"` is the earlier name of `"hard"`: iOS has no opaque bar without a line, and it draws the line of a hard edge
 * only once content is under the bar, so at rest the two look the same.
 */
export type BarBackgroundAlias = "solid"
/** `"edge"` is the earlier name of `"soft"`, `"solid"` of `"hard"`. */
export type ToolbarBackground = BarBackground | BarBackgroundAlias | "edge"

/** The background a bar draws, from its current name or an earlier one. */
export const barBackground = (background: ToolbarBackground | undefined): BarBackground | undefined =>
  background === "edge" ? "soft" : background === "solid" ? "hard" : background

/**
 * A surface that places phone toolbars: `Page` puts the top bar over its content
 * and reserves the space; `Dialog` puts it 16px under the Sheet's top edge.
 */
export type ToolbarHost = {
  kind: "page" | "dialog"
  setHeight?: (placement: ToolbarPlacement, height: number | undefined) => void
  /** Content has scrolled under the top bar, so its glass casts a shadow and a hard or glass bar shows its line. */
  scrolled?: boolean
  /** Content continues under the bottom bar, so a hard or glass bar shows its line. */
  contentBelow?: boolean
  /** Calls the listener with the content's scroll offset on every scroll; returns the unsubscribe. A TabBar minimizes with it. */
  subscribeScroll?: (listener: (scrollTop: number) => void) => () => void
  /** A large title asks for a place in the content; returns the release. */
  requestLargeTitleSlot?: () => () => void
  /** The place at the top of the content where a large title scrolls with it, once the content has made one. */
  largeTitleSlot?: HTMLElement | null
}

export const ToolbarHostContext = createContext<ToolbarHost | null>(null)

// The title style of the top bar, which a large title on a page needs to show itself inline once scrolled.
const ToolbarTitleStyleContext = createContext<ToolbarTitleStyle | undefined>(undefined)
// The bar itself, which a large title in the content marks once it has gone under the bar. It is state, so a title
// that mounts before its bar (a bar replaced under a page that keeps its content) follows the bar once it is there.
const ToolbarElementContext = createContext<HTMLDivElement | null>(null)

// The tokens of a large title a bar can set for itself, which the title in the content no longer inherits from it.
const LARGE_TITLE_TOKENS = [
  "--toolbar-padding-bottom",
  "--toolbar-large-title-gap",
  "--toolbar-large-title-font-size",
  "--toolbar-large-title-line-height",
  "--toolbar-large-title-descent",
  "--toolbar-large-subtitle-font-size",
  "--toolbar-large-subtitle-line-height",
  "--toolbar-large-subtitle-descent",
]

/**
 * Follows a large title in the content: it takes the large title tokens the bar sets for itself, and once its last line
 * is at the bar's bottom the bar shows it inline. Scrolling moves it; a change of layout (a wide window turning into a
 * phone's, which shows the bar and the title) or of a class or style on the bar, the content or around them measures it
 * again. A token the bar shares with the content stays inherited, so it follows the page's changes. A hidden title has
 * not gone under anything.
 */
function followLargeTitle(bar: HTMLElement, heading: HTMLElement, subscribeScroll: (listener: () => void) => () => void) {
  const collapse = () => {
    const box = heading.getBoundingClientRect()
    bar.toggleAttribute("data-title-collapsed", box.height > 0 && box.bottom <= bar.getBoundingClientRect().bottom)
  }
  const layout = () => {
    const own = getComputedStyle(bar)
    const place = heading.parentElement ? getComputedStyle(heading.parentElement) : undefined
    for (const token of LARGE_TITLE_TOKENS) {
      const value = own.getPropertyValue(token).trim()
      if (value && value !== place?.getPropertyValue(token).trim()) heading.style.setProperty(token, value)
      else heading.style.removeProperty(token)
    }
    collapse()
  }
  layout()
  const unsubscribe = subscribeScroll(collapse)
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layout) : undefined
  observer?.observe(bar)
  observer?.observe(heading)
  const mutations = typeof MutationObserver !== "undefined" ? new MutationObserver(layout) : undefined
  // A token reaches the bar or the content from the class or style of either or of anything around them.
  for (const start of [bar, heading.parentElement]) {
    for (let node = start; node; node = node.parentElement) mutations?.observe(node, { attributes: true, attributeFilter: ["class", "style"] })
  }
  return () => {
    unsubscribe()
    observer?.disconnect()
    mutations?.disconnect()
    bar.removeAttribute("data-title-collapsed")
    for (const token of LARGE_TITLE_TOKENS) heading.style.removeProperty(token)
  }
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  /** @default "top" */
  placement?: ToolbarPlacement
  /** Layout of `Toolbar.Title` in a top bar. @default "inline" */
  titleStyle?: ToolbarTitleStyle
  /** Alignment of an inline title. Compact and large titles always start at the leading edge. @default "center" */
  titleAlign?: ToolbarTitleAlign
  /** How the bar meets the content scrolled under it on a phone. @default "glass" at the top, "soft" at the bottom */
  background?: ToolbarBackground
  ref?: Ref<HTMLDivElement>
}

function ToolbarRoot({
  placement = "top",
  titleStyle = "inline",
  titleAlign = "center",
  background = placement === "bottom" ? "soft" : "glass",
  className,
  children,
  ref,
  ...restProps
}: ToolbarProps) {
  const host = useContext(ToolbarHostContext)
  const element = useRef<HTMLDivElement | null>(null)
  const [barElement, setBarElement] = useState<HTMLDivElement | null>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    setBarElement(node)
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  const setHeight = host?.setHeight
  useLayoutEffect(() => {
    const bar = element.current
    if (!bar || !setHeight) return
    // A desktop layout hides the bar; its height then leaves the host's own header in charge.
    const update = () => setHeight(placement, bar.offsetHeight || undefined)
    update()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    observer?.observe(bar, { box: "border-box" })
    return () => { observer?.disconnect(); setHeight(placement, undefined) }
  }, [placement, setHeight])

  return (
    <div
      ref={setRef}
      className={clsx(s.Toolbar, className)}
      data-toolbar=""
      data-placement={placement}
      data-title-style={placement === "top" ? titleStyle : undefined}
      data-title-align={placement === "top" ? titleAlign : undefined}
      data-background={barBackground(background)}
      data-host={host?.kind}
      data-scrolled={placement === "top" && host?.scrolled ? "" : undefined}
      data-content-below={placement === "bottom" && host?.contentBelow ? "" : undefined}
      {...restProps}
    >
      <ToolbarElementContext.Provider value={barElement}>
        <ToolbarTitleStyleContext.Provider value={placement === "top" ? titleStyle : undefined}>{children}</ToolbarTitleStyleContext.Provider>
      </ToolbarElementContext.Provider>
    </div>
  )
}
ToolbarRoot.displayName = "Toolbar"

/* ------------------------------------------------------------------ */
/*  Parts                                                              */
/* ------------------------------------------------------------------ */

export type ToolbarSlotProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }

function ToolbarLeading({ className, ...restProps }: ToolbarSlotProps) {
  return <div className={clsx(s.Leading, className)} {...restProps} />
}
ToolbarLeading.displayName = "Toolbar.Leading"

function ToolbarTrailing({ className, ...restProps }: ToolbarSlotProps) {
  return <div className={clsx(s.Trailing, className)} {...restProps} />
}
ToolbarTrailing.displayName = "Toolbar.Trailing"

export type ToolbarContentProps = ToolbarSlotProps & {
  /** Stretch between the leading and trailing items, as a search field does. */
  fill?: boolean
}

/** Custom middle content: a search field, a segmented control or a single centered action. */
function ToolbarContent({ fill = false, className, ...restProps }: ToolbarContentProps) {
  return <div className={clsx(s.Content, className)} data-fill={fill ? "" : undefined} {...restProps} />
}
ToolbarContent.displayName = "Toolbar.Content"

/** Buttons that share one capsule. */
function ToolbarGroup({ className, ...restProps }: ToolbarSlotProps) {
  return <div role="group" className={clsx(s.Group, className)} {...restProps} />
}
ToolbarGroup.displayName = "Toolbar.Group"

export type ToolbarTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, "children"> & {
  children: ReactNode
  /** A second, smaller line below the title. */
  subtitle?: ReactNode
  /**
   * Heading level. In a Dialog the dialog's own title names the Sheet, so the bar title is hidden from
   * assistive technology there. @default "h1"
   */
  as?: "h1" | "h2" | "h3"
  ref?: Ref<HTMLHeadingElement>
}

function ToolbarTitle({ children, subtitle, as, className, ref, ...restProps }: ToolbarTitleProps) {
  const host = useContext(ToolbarHostContext)
  const titleStyle = useContext(ToolbarTitleStyleContext)
  const bar = useContext(ToolbarElementContext)
  const headingRef = useRef<HTMLDivElement | null>(null)
  const large = titleStyle === "large" && host?.kind === "page"
  const requestSlot = large ? host?.requestLargeTitleSlot : undefined
  const slot = large ? host?.largeTitleSlot ?? null : null
  const subscribeScroll = host?.subscribeScroll
  useLayoutEffect(() => requestSlot?.(), [requestSlot])
  // In the content the title scrolls with it, on the compositor and through the overscroll, as on iOS 26. Once it has
  // gone under the bar (its last line at the bar's bottom), the bar shows it inline and a hard or glass bar its line.
  useLayoutEffect(() => {
    const heading = headingRef.current
    if (!slot || !bar || !heading || !subscribeScroll) return
    return followLargeTitle(bar, heading, subscribeScroll)
  }, [bar, slot, subscribeScroll])
  const decorative = host?.kind === "dialog"
  const Tag = as ?? "h1"
  const hasSubtitle = subtitle != null && subtitle !== false && subtitle !== ""
  const heading = (
    <div ref={headingRef} className={s.Heading} aria-hidden={decorative || undefined} data-in-content={slot ? "" : undefined}>
      <Tag ref={ref} className={clsx(s.Title, className)} {...restProps}>{children}</Tag>
      {hasSubtitle && <p className={s.Subtitle}>{subtitle}</p>}
    </div>
  )
  if (!large) return heading
  // Until the content has made its place (a server-rendered page before it hydrates), the title stands in the bar
  // where it will stand in the content. The inline copy the row of controls shows once the large title has gone
  // under it keeps a subtitle as a second line, as in the inline title (iOS 26 kit Toolbar - Top - iPhone, Title 2 Line).
  return (
    <>
      {slot ? createPortal(heading, slot) : heading}
      <span className={s.CollapsedTitle} aria-hidden="true">
        {hasSubtitle ? <><span className={s.CollapsedLine}>{children}</span><span className={s.CollapsedSubtitle}>{subtitle}</span></> : children}
      </span>
    </>
  )
}
ToolbarTitle.displayName = "Toolbar.Title"

/* ------------------------------------------------------------------ */
/*  Compound                                                           */
/* ------------------------------------------------------------------ */

export const Toolbar = ToolbarRoot as typeof ToolbarRoot & {
  Leading: typeof ToolbarLeading
  Title: typeof ToolbarTitle
  Content: typeof ToolbarContent
  Group: typeof ToolbarGroup
  Trailing: typeof ToolbarTrailing
}

Toolbar.Leading = ToolbarLeading
Toolbar.Title = ToolbarTitle
Toolbar.Content = ToolbarContent
Toolbar.Group = ToolbarGroup
Toolbar.Trailing = ToolbarTrailing
