"use client"

import clsx from "clsx"
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type CSSProperties,
  type Ref,
  type UIEvent,
} from "react"
import { FloatingBoundaryProvider, useFloatingBoundaryRegistration, useFloatingBoundaryScope } from "../../hooks/useFloatingBoundary"
import { ToolbarHostContext, type BarBackground, type ToolbarHost, type ToolbarPlacement } from "../Toolbar/Toolbar"
import { NO_SCROLL_EDGES, observeScrollEdges, sameScrollEdges, type ScrollEdges } from "../../lib/scrollEdges"
import s from "@plexui/styles/components/Page/Page.module.css"

/** How a phone bar of the page meets the content scrolled under it; see `BarBackground`. */
export type PageBarBackground = BarBackground

export type PageWidth = "full" | "wide" | "column"

type PageContextValue = {
  /** Content under the header (scrolled) and under the footer (content below). */
  edges: ScrollEdges
  setEdges: (edges: ScrollEdges) => void
  setFooterHeight: (height: number) => void
  setHeaderHeight: (height: number | undefined) => void
  /** Tells the bars that follow the scroll, such as a minimizing TabBar or a large title, the content's scroll offset. */
  notifyScroll: (scrollY: number) => void
  /** A large Toolbar title asks for a place at the top of the content, where it scrolls with the content. */
  largeTitle: boolean
  setLargeTitleSlot: (slot: HTMLDivElement | null) => void
}

const PageContext = createContext<PageContextValue | null>(null)

function usePageContext(part: string): PageContextValue {
  const context = useContext(PageContext)
  if (!context) {
    throw new Error(`Page.${part} must be used within Page`)
  }
  return context
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type PageProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Width of the column that header and content share.
   * - `"full"` — edge to edge, for tables (default)
   * - `"wide"` — 1280px, centred, for overviews
   * - `"column"` — 768px, centred, for settings and forms
   *
   * Set `--page-width` on the page for any other width.
   * @default "full"
   */
  width?: PageWidth
  /** Mobile canvas and grouped-field palette. @default "plain" */
  surface?: "plain" | "grouped"
  ref?: Ref<HTMLDivElement>
}

function PageRoot({ width = "full", surface = "plain", className, children, style, ref, ...restProps }: PageProps) {
  const boundary = useFloatingBoundaryScope()
  const setRoot = boundary.setRoot
  const setRef = useCallback((node: HTMLDivElement | null) => {
    setRoot(node)
    if (typeof ref === "function") {
      const cleanup = ref(node)
      if (typeof cleanup === "function") return () => { setRoot(null); cleanup() }
      return
    }
    if (ref) ref.current = node
  }, [ref, setRoot])
  const [edges, setEdgesState] = useState(NO_SCROLL_EDGES)
  const setEdges = useCallback((next: ScrollEdges) => setEdgesState((current) => sameScrollEdges(current, next) ? current : next), [])
  const [footerHeight, setFooterHeight] = useState(0)
  const [headerHeight, setHeaderHeight] = useState<number>()
  const scrollListeners = useRef(new Set<(scrollTop: number) => void>())
  const notifyScroll = useCallback((scrollY: number) => scrollListeners.current.forEach((listener) => listener(scrollY)), [])
  const subscribeScroll = useCallback((listener: (scrollTop: number) => void) => {
    const listeners = scrollListeners.current
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])
  // A large Toolbar title lives in the content, where the browser scrolls it with the content and its overscroll;
  // Page.Content keeps a place for it at its top while a title asks for one.
  const [largeTitleRequests, setLargeTitleRequests] = useState(0)
  const [largeTitleSlot, setLargeTitleSlot] = useState<HTMLDivElement | null>(null)
  const requestLargeTitleSlot = useCallback(() => {
    setLargeTitleRequests((count) => count + 1)
    return () => setLargeTitleRequests((count) => count - 1)
  }, [])
  const largeTitle = largeTitleRequests > 0
  const context = useMemo(() => ({ edges, setEdges, setFooterHeight, setHeaderHeight, notifyScroll, largeTitle, setLargeTitleSlot }), [edges, setEdges, notifyScroll, largeTitle])
  // A phone Toolbar replaces the header and footer bars; it reports its own heights.
  const [toolbarTop, setToolbarTop] = useState<number>()
  const [toolbarBottom, setToolbarBottom] = useState<number>()
  const setToolbarHeight = useCallback((placement: ToolbarPlacement, height: number | undefined) => (placement === "top" ? setToolbarTop : setToolbarBottom)(height), [])
  const toolbarHost = useMemo<ToolbarHost>(() => ({
    kind: "page",
    setHeight: setToolbarHeight,
    scrolled: edges.scrolled,
    contentBelow: edges.contentBelow,
    subscribeScroll,
    requestLargeTitleSlot,
    largeTitleSlot: largeTitle ? largeTitleSlot : null,
  }), [setToolbarHeight, edges, subscribeScroll, requestLargeTitleSlot, largeTitle, largeTitleSlot])
  const pageStyle = {
    "--page-footer-height": `${footerHeight}px`,
    ...(headerHeight !== undefined ? { "--page-header-height": `${headerHeight}px` } : {}),
    ...(toolbarTop !== undefined ? { "--page-toolbar-height": `${toolbarTop}px` } : {}),
    ...(toolbarBottom !== undefined ? { "--page-toolbar-bottom-height": `${toolbarBottom}px` } : {}),
    ...style,
  } as CSSProperties

  return (
    <FloatingBoundaryProvider value={boundary}>
    <PageContext.Provider value={context}>
    <ToolbarHostContext.Provider value={toolbarHost}>
      <div ref={setRef} className={clsx(s.Page, className)} data-width={width} data-surface={surface} style={pageStyle} {...restProps}>
        {children}
      </div>
    </ToolbarHostContext.Provider>
    </PageContext.Provider>
    </FloatingBoundaryProvider>
  )
}
PageRoot.displayName = "Page"

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

export type PageHeaderProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Shows a divider once the content has scrolled under the header: on a desktop layout, and on a phone
   * with a `"hard"` or `"glass"` background.
   * Turn it off when the content already draws a line of its own at that place.
   * @default true
   */
  divider?: boolean
  /** How the bar meets the content scrolled under it on a phone. @default "glass" */
  background?: PageBarBackground
  ref?: Ref<HTMLDivElement>
}

function PageHeader({ divider = true, background = "glass", className, children, ref, ...restProps }: PageHeaderProps) {
  const { edges: { scrolled }, setHeaderHeight } = usePageContext("Header")
  const element = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  useLayoutEffect(() => {
    const header = element.current
    if (!header) return
    const update = () => setHeaderHeight(header.offsetHeight)
    update()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    observer?.observe(header, { box: "border-box" })
    return () => { observer?.disconnect(); setHeaderHeight(undefined) }
  }, [setHeaderHeight])

  return (
    <div
      ref={setRef}
      className={clsx(s.Header, className)}
      data-background={background}
      data-scrolled={scrolled ? "" : undefined}
      data-divider={divider ? "" : undefined}
      {...restProps}
    >
      <div className={s.Head}>{children}</div>
    </div>
  )
}
PageHeader.displayName = "Page.Header"

/* ------------------------------------------------------------------ */
/*  Slots                                                              */
/* ------------------------------------------------------------------ */

export type PageSlotProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }

function PageBar({ className, ref, ...restProps }: PageSlotProps) {
  const element = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  useLayoutEffect(() => {
    const bar = element.current
    if (!bar) return
    const sides = () => bar.querySelectorAll<HTMLElement>(`:scope > .${s.Leading}, :scope > .${s.Actions}`)
    const update = () => {
      const width = Math.max(44, ...Array.from(sides(), (side) => side.offsetWidth))
      bar.style.setProperty("--page-bar-side-width", `${width}px`)
    }
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    const observeSides = () => { observer?.disconnect(); sides().forEach((side) => observer?.observe(side, { box: "border-box" })); update() }
    observeSides()
    const children = new MutationObserver(observeSides)
    children.observe(bar, { childList: true })
    return () => { observer?.disconnect(); children.disconnect() }
  }, [])
  return <div ref={setRef} className={clsx(s.Bar, className)} {...restProps} />
}
PageBar.displayName = "Page.Bar"

function PageLeading({ className, ...restProps }: PageSlotProps) {
  return <div className={clsx(s.Leading, className)} {...restProps} />
}
PageLeading.displayName = "Page.Leading"

function PageHeading({ className, ...restProps }: PageSlotProps) {
  return <div className={clsx(s.Heading, className)} {...restProps} />
}
PageHeading.displayName = "Page.Heading"

function PageTitle({
  className,
  ...restProps
}: HTMLAttributes<HTMLHeadingElement> & { ref?: Ref<HTMLHeadingElement> }) {
  return <h1 className={clsx(s.Title, className)} {...restProps} />
}
PageTitle.displayName = "Page.Title"

function PageSubtitle({ className, ...restProps }: PageSlotProps) {
  return <div className={clsx(s.Subtitle, className)} {...restProps} />
}
PageSubtitle.displayName = "Page.Subtitle"

function PageActions({ className, ...restProps }: PageSlotProps) {
  return <div className={clsx(s.Actions, className)} {...restProps} />
}
PageActions.displayName = "Page.Actions"

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

export type PageContentProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * The content fills the page and scrolls inside itself, as a table does: the page stops
   * scrolling from 768px up.
   * @default false
   */
  fill?: boolean
  ref?: Ref<HTMLDivElement>
}

function PageContent({ fill = false, className, children, onScroll, ref, ...restProps }: PageContentProps) {
  const { setEdges, notifyScroll, largeTitle, setLargeTitleSlot } = usePageContext("Content")
  const element = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    if (typeof ref === "function") return ref(node)
    if (ref) ref.current = node
  }, [ref])
  useLayoutEffect(() => {
    const content = element.current
    if (!content) return
    const stop = observeScrollEdges(content, setEdges)
    return () => { stop(); setEdges(NO_SCROLL_EDGES) }
  }, [setEdges])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    notifyScroll(event.currentTarget.scrollTop)
    onScroll?.(event)
  }

  return (
    <div
      ref={setRef}
      className={clsx(s.Content, className)}
      data-fill={fill ? "" : undefined}
      onScroll={handleScroll}
      {...restProps}
    >
      <div className={s.Column}>
        {largeTitle && <div ref={setLargeTitleSlot} className={s.LargeTitle} />}
        {children}
      </div>
    </div>
  )
}
PageContent.displayName = "Page.Content"

export type PageFooterProps = PageSlotProps & {
  /** How the bar meets the content scrolled under it on a phone. @default "soft" */
  background?: PageBarBackground
}

/** Actions that remain below the scrolling content, inside the page's safe area. */
function PageFooter({ className, children, background = "soft", ref, ...restProps }: PageFooterProps) {
  const element = useRef<HTMLDivElement | null>(null)
  const { edges: { contentBelow }, setFooterHeight } = usePageContext("Footer")
  const setFloatingFooter = useFloatingBoundaryRegistration()?.setFooter
  const setRef = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    setFloatingFooter?.(node)
    if (typeof ref === "function") {
      const cleanup = ref(node)
      if (typeof cleanup === "function") return () => { element.current = null; setFloatingFooter?.(null); cleanup() }
      return
    }
    if (ref) ref.current = node
  }, [ref, setFloatingFooter])
  useLayoutEffect(() => {
    const footer = element.current
    if (!footer) return
    const update = () => setFooterHeight(footer.offsetHeight)
    update()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    observer?.observe(footer, { box: "border-box" })
    return () => { observer?.disconnect(); setFooterHeight(0) }
  }, [setFooterHeight])
  return (
    <div
      ref={setRef}
      className={clsx(s.Footer, className)}
      data-background={background}
      data-content-below={contentBelow ? "" : undefined}
      {...restProps}
    >
      <div className={s.FooterContent}>{children}</div>
    </div>
  )
}
PageFooter.displayName = "Page.Footer"

/* ------------------------------------------------------------------ */
/*  Compound                                                           */
/* ------------------------------------------------------------------ */

export const Page = PageRoot as typeof PageRoot & {
  Header: typeof PageHeader
  Bar: typeof PageBar
  Leading: typeof PageLeading
  Heading: typeof PageHeading
  Title: typeof PageTitle
  Subtitle: typeof PageSubtitle
  Actions: typeof PageActions
  Content: typeof PageContent
  Footer: typeof PageFooter
}
Page.Header = PageHeader
Page.Bar = PageBar
Page.Leading = PageLeading
Page.Heading = PageHeading
Page.Title = PageTitle
Page.Subtitle = PageSubtitle
Page.Actions = PageActions
Page.Content = PageContent
Page.Footer = PageFooter
