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
import { ToolbarHostContext, type ToolbarHost, type ToolbarPlacement } from "../Toolbar/Toolbar"
import s from "@plexui/styles/components/Page/Page.module.css"

export type PageBarBackground = "glass" | "solid"

export type PageWidth = "full" | "wide" | "column"

// A trackpad's small settle at the top must not flash the line.
const SCROLLED_AFTER = 4

type PageContextValue = {
  scrolled: boolean
  setScrolled: (scrolled: boolean) => void
  setFooterHeight: (height: number) => void
  setHeaderHeight: (height: number | undefined) => void
  /** Writes the content's scroll offset to the page as `--page-scroll-y`, which a large Toolbar title follows. */
  setScrollY: (scrollY: number) => void
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
  const root = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback((node: HTMLDivElement | null) => {
    root.current = node
    setRoot(node)
    if (typeof ref === "function") {
      const cleanup = ref(node)
      if (typeof cleanup === "function") return () => { root.current = null; setRoot(null); cleanup() }
      return
    }
    if (ref) ref.current = node
  }, [ref, setRoot])
  const [scrolled, setScrolled] = useState(false)
  const [footerHeight, setFooterHeight] = useState(0)
  const [headerHeight, setHeaderHeight] = useState<number>()
  // Written straight to the element: a scroll frame must not render the page again.
  const setScrollY = useCallback((scrollY: number) => root.current?.style.setProperty("--page-scroll-y", String(Math.max(0, scrollY))), [])
  const context = useMemo(() => ({ scrolled, setScrolled, setFooterHeight, setHeaderHeight, setScrollY }), [scrolled, setScrollY])
  // A phone Toolbar replaces the header and footer bars; it reports its own heights.
  const [toolbarTop, setToolbarTop] = useState<number>()
  const [toolbarBottom, setToolbarBottom] = useState<number>()
  const setToolbarHeight = useCallback((placement: ToolbarPlacement, height: number | undefined) => (placement === "top" ? setToolbarTop : setToolbarBottom)(height), [])
  const toolbarHost = useMemo<ToolbarHost>(() => ({ kind: "page", setHeight: setToolbarHeight, scrolled }), [setToolbarHeight, scrolled])
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
   * Shows a divider once the content has scrolled under the header.
   * Turn it off when the content already draws a line of its own at that place.
   * @default true
   */
  divider?: boolean
  /** Mobile bar surface. Glass blurs content beneath the bar. */
  background?: PageBarBackground
  ref?: Ref<HTMLDivElement>
}

function PageHeader({ divider = true, background = "glass", className, children, ref, ...restProps }: PageHeaderProps) {
  const { scrolled, setHeaderHeight } = usePageContext("Header")
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

function PageContent({ fill = false, className, children, onScroll, ...restProps }: PageContentProps) {
  const { setScrolled, setScrollY } = usePageContext("Content")

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrolled(event.currentTarget.scrollTop > SCROLLED_AFTER)
    setScrollY(event.currentTarget.scrollTop)
    onScroll?.(event)
  }

  return (
    <div
      className={clsx(s.Content, className)}
      data-fill={fill ? "" : undefined}
      onScroll={handleScroll}
      {...restProps}
    >
      <div className={s.Column}>{children}</div>
    </div>
  )
}
PageContent.displayName = "Page.Content"

export type PageFooterProps = PageSlotProps & { background?: PageBarBackground }

/** Actions that remain below the scrolling content, inside the page's safe area. */
function PageFooter({ className, children, background = "glass", ref, ...restProps }: PageFooterProps) {
  const element = useRef<HTMLDivElement | null>(null)
  const { setFooterHeight } = usePageContext("Footer")
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
    <div ref={setRef} className={clsx(s.Footer, className)} data-background={background} {...restProps}>
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
