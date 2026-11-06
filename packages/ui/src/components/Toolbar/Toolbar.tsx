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
/** `"edge"` fades the canvas over content scrolled under the bar; `"solid"` fills the bar. */
export type ToolbarBackground = "edge" | "solid"

/**
 * A surface that places phone toolbars: `Page` puts the top bar over its content
 * and reserves the space; `Dialog` puts it under the Sheet's grabber.
 */
export type ToolbarHost = {
  kind: "page" | "dialog"
  setHeight?: (placement: ToolbarPlacement, height: number | undefined) => void
  /** Content has scrolled under the top bar, so its glass casts a shadow. */
  scrolled?: boolean
}

export const ToolbarHostContext = createContext<ToolbarHost | null>(null)

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
  /** @default "edge" */
  background?: ToolbarBackground
  ref?: Ref<HTMLDivElement>
}

function ToolbarRoot({
  placement = "top",
  titleStyle = "inline",
  titleAlign = "center",
  background = "edge",
  className,
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
      data-background={background}
      data-host={host?.kind}
      data-scrolled={placement === "top" && host?.scrolled ? "" : undefined}
      {...restProps}
    />
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
  const decorative = host?.kind === "dialog"
  const Tag = as ?? "h1"
  return (
    <div className={s.Heading} aria-hidden={decorative || undefined}>
      <Tag ref={ref} className={clsx(s.Title, className)} {...restProps}>{children}</Tag>
      {subtitle != null && subtitle !== false && <p className={s.Subtitle}>{subtitle}</p>}
    </div>
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
