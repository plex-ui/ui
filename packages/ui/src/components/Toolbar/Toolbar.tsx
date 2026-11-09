"use client"

import clsx from "clsx"
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react"
import s from "@plexui/styles/components/Toolbar/Toolbar.module.css"

export type ToolbarPlacement = "top" | "bottom"
/** Title layouts of the phone top bar. */
export type ToolbarTitleStyle = "inline" | "large" | "compact-large" | "compact-medium"
export type ToolbarTitleAlign = "center" | "start"
/**
 * How a bar meets the content scrolled under it, after the scroll edge effect of iOS 26:
 * - `"soft"` (the default of a bottom bar): at the top, the canvas color covers the content under the bar's controls and fades out past them, over a
 *   light blur; at the bottom of a page the content stays clear under and around the controls, as on native iOS 26,
 *   and a Sheet's bottom bar fades its content into the panel
 * - `"hard"`: an opaque bar of the canvas color with a line once content is under it
 * - `"glass"` (the default of a top bar): a translucent, blurred bar with a hairline, shown once content is under it
 * - `"solid"`: an opaque bar of the canvas color without a line
 */
export type BarBackground = "soft" | "hard" | "glass" | "solid"
/** `"edge"` is the earlier name of `"soft"`. */
export type ToolbarBackground = BarBackground | "edge"

/**
 * A surface that places phone toolbars: `Page` puts the top bar over its content
 * and reserves the space; `Dialog` puts it under the Sheet's grabber.
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
}

export const ToolbarHostContext = createContext<ToolbarHost | null>(null)

// The title style of the top bar, which a large title on a page needs to show itself inline once scrolled.
const ToolbarTitleStyleContext = createContext<ToolbarTitleStyle | undefined>(undefined)

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
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  const setHeight = host?.setHeight
  useLayoutEffect(() => {
    const bar = element.current
    if (!bar || !setHeight) return
    // A desktop layout hides the bar; its height then leaves the host's own header in charge.
    const update = () => {
      setHeight(placement, bar.offsetHeight || undefined)
      measureLargeTitle(bar)
    }
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
      data-background={background === "edge" ? "soft" : background}
      data-host={host?.kind}
      data-scrolled={placement === "top" && host?.scrolled ? "" : undefined}
      data-content-below={placement === "bottom" && host?.contentBelow ? "" : undefined}
      {...restProps}
    >
      <ToolbarTitleStyleContext.Provider value={placement === "top" ? titleStyle : undefined}>{children}</ToolbarTitleStyleContext.Provider>
    </div>
  )
}
ToolbarRoot.displayName = "Toolbar"

/**
 * A large title on a page scrolls up with the content under the row of controls; the row shows the
 * title inline once it has gone. The distance it travels (the gap above it and its height) goes to
 * `--toolbar-large-title-travel`, in pixels as a number, as the page's `--page-scroll-y` is.
 */
function measureLargeTitle(bar: HTMLElement) {
  if (bar.dataset.titleStyle !== "large") return
  const heading = Array.from(bar.children).find((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains(s.Heading))
  if (!heading) return
  const gap = Number.parseFloat(getComputedStyle(bar).rowGap) || 0
  bar.style.setProperty("--toolbar-large-title-travel", String(heading.offsetHeight + gap))
}

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
  const decorative = host?.kind === "dialog"
  const Tag = as ?? "h1"
  const hasSubtitle = subtitle != null && subtitle !== false && subtitle !== ""
  const heading = (
    <div className={s.Heading} aria-hidden={decorative || undefined}>
      <Tag ref={ref} className={clsx(s.Title, className)} {...restProps}>{children}</Tag>
      {hasSubtitle && <p className={s.Subtitle}>{subtitle}</p>}
    </div>
  )
  if (titleStyle !== "large" || host?.kind !== "page") return heading
  // The inline copy the row of controls shows once the large title has scrolled under it. A subtitle stays
  // as a second line, as in the inline title (iOS 26 kit Toolbar - Top - iPhone, Title 2 Line).
  return (
    <>
      {heading}
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
