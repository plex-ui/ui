"use client"

import clsx from "clsx"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type HTMLAttributes,
  type Ref,
  type UIEvent,
} from "react"
import s from "@plexui/styles/components/Page/Page.module.css"

export type PageWidth = "full" | "wide" | "column"

// A trackpad's small settle at the top must not flash the line.
const SCROLLED_AFTER = 4

type PageContextValue = {
  scrolled: boolean
  setScrolled: (scrolled: boolean) => void
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
  ref?: Ref<HTMLDivElement>
}

function PageRoot({ width = "full", className, children, ...restProps }: PageProps) {
  const [scrolled, setScrolled] = useState(false)
  const context = useMemo(() => ({ scrolled, setScrolled }), [scrolled])

  return (
    <PageContext.Provider value={context}>
      <div className={clsx(s.Page, className)} data-width={width} {...restProps}>
        {children}
      </div>
    </PageContext.Provider>
  )
}
PageRoot.displayName = "Page"

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

export type PageHeaderProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Shows the line, and the glass on a phone, once the content has scrolled under the header.
   * Turn it off when the content already draws a line of its own at that place.
   * @default true
   */
  divider?: boolean
  ref?: Ref<HTMLDivElement>
}

function PageHeader({ divider = true, className, children, ...restProps }: PageHeaderProps) {
  const { scrolled } = usePageContext("Header")

  return (
    <div
      className={clsx(s.Header, className)}
      data-scrolled={divider && scrolled ? "" : undefined}
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

function PageBar({ className, ...restProps }: PageSlotProps) {
  return <div className={clsx(s.Bar, className)} {...restProps} />
}
PageBar.displayName = "Page.Bar"

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

function PageSubtitle({
  className,
  ...restProps
}: HTMLAttributes<HTMLParagraphElement> & { ref?: Ref<HTMLParagraphElement> }) {
  return <p className={clsx(s.Subtitle, className)} {...restProps} />
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
  const { setScrolled } = usePageContext("Content")

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrolled(event.currentTarget.scrollTop > SCROLLED_AFTER)
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

/** Actions that remain below the scrolling content, inside the page's safe area. */
function PageFooter({ className, children, ...restProps }: PageSlotProps) {
  return (
    <div className={clsx(s.Footer, className)} {...restProps}>
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
  Heading: typeof PageHeading
  Title: typeof PageTitle
  Subtitle: typeof PageSubtitle
  Actions: typeof PageActions
  Content: typeof PageContent
  Footer: typeof PageFooter
}
Page.Header = PageHeader
Page.Bar = PageBar
Page.Heading = PageHeading
Page.Title = PageTitle
Page.Subtitle = PageSubtitle
Page.Actions = PageActions
Page.Content = PageContent
Page.Footer = PageFooter
