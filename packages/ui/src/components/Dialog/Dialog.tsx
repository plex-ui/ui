"use client"

import clsx from "clsx"
import { Dialog as RadixDialog } from "radix-ui"
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
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react"
import { FloatingBoundaryProvider, useFloatingBoundaryRegistration, useFloatingBoundaryScope } from "../../hooks/useFloatingBoundary"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers"
import { useStableCallback } from "../../hooks/useStableCallback"
import { NavigationButton } from "../Button/NavigationButton"
import { Toolbar, ToolbarHostContext, type BarBackground, type ToolbarHost } from "../Toolbar/Toolbar"
import { NO_SCROLL_EDGES, observeScrollEdges, sameScrollEdges, type ScrollEdges } from "../../lib/scrollEdges"
import { TransitionGroup } from "../Transition"
import { createExitGuard, overlayTiming, overlayTimingLarge } from "../Transition/shared"
import { attachSheetDrag } from "./sheetDrag"
import { usePopoverDismissableSurface } from "../Popover/deferredOutsidePress"
import s from "@plexui/styles/components/Dialog/Dialog.module.css"
import t from "@plexui/styles/components/Toolbar/Toolbar.module.css"

type DialogContextValue = {
  open: boolean
  setOpen: (nextState: boolean) => void
}

const DOUBLE_CLICK = 300

const DialogContext = createContext<DialogContextValue | null>(null)

const useDialogContext = () => {
  const context = useContext(DialogContext)

  if (!context) {
    throw new Error("Dialog compound components must be used inside <Dialog>")
  }

  return context
}

export type DialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export const Dialog = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: DialogProps) => {
  const [open, setOpen] = useState<boolean>(false)
  const isOpen = controlledOpen ?? open

  const handleOpenChange = useCallback(
    (nextState: boolean) => {
      controlledOnOpenChange?.(nextState)
      setOpen(nextState)
    },
    [controlledOnOpenChange],
  )

  const store = useMemo<DialogContextValue>(
    () => ({
      open: isOpen,
      setOpen: handleOpenChange,
    }),
    [isOpen, handleOpenChange],
  )

  return (
    <DialogContext value={store}>
      <RadixDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        {children}
      </RadixDialog.Root>
    </DialogContext>
  )
}

const Trigger = ({ children }: { children: ReactNode }) => {
  return <RadixDialog.Trigger asChild>{children}</RadixDialog.Trigger>
}

export type DialogPlacement = "center" | "top" | "bottom" | "start" | "end" | "fullscreen"

export type DialogContentProps = {
  children: ReactNode
  width?: number | string
  showClose?: boolean
  /**
   * Rounder panel and a round close button, for dialogs that sit beside pill controls.
   * @default false
   */
  pill?: boolean
  className?: string
  /**
   * Where the panel sits: centered, near the top (search, command lists),
   * a sheet along the bottom, a full-height panel on the start or end side,
   * or the whole screen.
   * @default center
   */
  placement?: DialogPlacement
  /** Placement at 767px and below, such as a bottom sheet on phones. @default placement */
  mobilePlacement?: Extract<DialogPlacement, "center" | "bottom" | "fullscreen">
  /** Mobile presentation at 767px and below. Sheets default to bottom placement. */
  mobileVariant?: "alert" | "sheet"
  /** Mobile panel palette; dark mode uses elevated surfaces. @default "plain" */
  surface?: "plain" | "grouped"
  /**
   * Called when focus moves into the dialog on open. Call
   * `event.preventDefault()` to focus something else yourself.
   */
  onOpenAutoFocus?: (event: Event) => void
  /** Called when focus returns on close. Call `event.preventDefault()` to keep it elsewhere. */
  onCloseAutoFocus?: (event: Event) => void
}

const Content = ({
  children,
  width = 480,
  showClose = true,
  pill = false,
  className,
  placement = "center",
  mobilePlacement: requestedMobilePlacement,
  mobileVariant,
  surface = "plain",
  onOpenAutoFocus,
  onCloseAutoFocus,
}: DialogContentProps) => {
  const { open, setOpen } = useDialogContext()
  const overlaySurfaceRef = usePopoverDismissableSurface()
  const mobilePlacement =
    mobileVariant === "alert"
      ? "center"
      : requestedMobilePlacement ?? (mobileVariant === "sheet" ? "bottom" : undefined)
  const [exitGuard] = useState(createExitGuard)
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)
  // Dialog.Body reports where content lies under the bars: they show their lines with it.
  const [edges, setEdgesState] = useState(NO_SCROLL_EDGES)
  const setEdges = useCallback((next: ScrollEdges) => setEdgesState((current) => sameScrollEdges(current, next) ? current : next), [])
  const scroll = useMemo(() => ({ edges, setEdges }), [edges, setEdges])
  const toolbarHost = useMemo<ToolbarHost>(() => ({ kind: "dialog", scrolled: edges.scrolled, contentBelow: edges.contentBelow }), [edges])
  const sheet = useMemo<DialogSheetValue | null>(() => (mobileVariant === "sheet" ? { showClose } : null), [mobileVariant, showClose])
  const boundary = useFloatingBoundaryScope()
  const setRoot = boundary.setRoot
  const setPanelRef = useCallback((node: HTMLDivElement | null) => { setPanel(node); setRoot(node) }, [setRoot])
  const openedAt = useRef(0)
  const crossesScreen =
    placement === "bottom" || placement === "start" || placement === "end" || placement === "fullscreen" || mobilePlacement === "bottom" || mobilePlacement === "fullscreen"

  // The content of a closing dialog is frozen for its exit, so this reads the owner's latest
  // handler: state that changes together with the close decides where focus returns.
  const handleCloseAutoFocus = useStableCallback((event: Event) => {
    onCloseAutoFocus?.(event)
    keepMovedFocus(event)
  })

  useEscCloseStack(open, () => {
    setOpen(false)
  })

  useEffect(() => {
    if (open) openedAt.current = performance.now()
  }, [open])

  useEffect(() => {
    if (!panel || mobilePlacement !== "bottom") return undefined
    return attachSheetDrag(panel, () => setOpen(false))
  }, [panel, mobilePlacement, setOpen])

  useLayoutEffect(() => {
    if (!panel) return
    const update = () => {
      // A phone Toolbar takes the place of the header or footer bar on its side: one the dialog places itself
      // before the bar its header becomes.
      const header = panel.querySelector<HTMLElement>(`:scope > ${TOP_TOOLBAR}:not([data-dialog-bar])`)
        ?? panel.querySelector<HTMLElement>(`:scope > ${TOP_TOOLBAR}`)
        ?? panel.querySelector<HTMLElement>(`:scope > .${s.Header}`)
      const footer = panel.querySelector<HTMLElement>(`:scope > ${BOTTOM_TOOLBAR}`) ?? panel.querySelector<HTMLElement>(`:scope > .${s.Footer}`)
      panel.style.setProperty("--dialog-header-height", `${header?.offsetHeight ?? 0}px`)
      panel.style.setProperty("--dialog-footer-height", `${footer?.offsetHeight ?? 0}px`)
    }
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
    const observeBars = () => {
      observer?.disconnect()
      panel.querySelectorAll<HTMLElement>(`:scope > .${s.Header}, :scope > .${s.Footer}, :scope > [data-toolbar]`)
        .forEach((bar) => observer?.observe(bar, { box: "border-box" }))
      update()
    }
    observeBars()
    // A form can add or remove its action bar while the dialog stays open.
    const children = new MutationObserver(observeBars)
    children.observe(panel, { childList: true })
    return () => { observer?.disconnect(); children.disconnect() }
  }, [panel])

  return (
    <FloatingBoundaryProvider value={boundary}>
    <RadixDialog.Portal forceMount>
      {/* A dialog mounted open enters too, as `open` set with the mount does */}
      <TransitionGroup
        {...(crossesScreen ? overlayTimingLarge : overlayTiming)}
        {...exitGuard.transition}
        className={s.Transition}
        overlay
        preventInitialTransition={false}
      >
        {open && (
          <div key="dialog">
            <RadixDialog.Overlay ref={overlaySurfaceRef} className={s.Overlay} />
            <RadixDialog.Content
              forceMount
              className={s.Content}
              data-plex-dialog=""
              style={toCssVariables({ "dialog-width": width })}
              data-placement={placement === "center" ? undefined : placement}
              data-mobile-placement={mobilePlacement}
              data-mobile-variant={mobileVariant}
              data-surface={surface}
              data-pill={pill ? "" : undefined}
              onEscapeKeyDown={preventDefaultHandler}
              onInteractOutside={(event) => {
                // The second click of a double click lands on the overlay: it must not undo the first
                if (performance.now() - openedAt.current < DOUBLE_CLICK) event.preventDefault()
                else exitGuard.onInteractOutside(event)
              }}
              onOpenAutoFocus={onOpenAutoFocus}
              onCloseAutoFocus={handleCloseAutoFocus}
            >
              <div ref={setPanelRef} className={clsx(s.Panel, className)}>
                {showClose && (
                  <RadixDialog.Close asChild>
                    <NavigationButton action="close" variant="ghost" className={s.CloseButton} aria-label="Close dialog" />
                  </RadixDialog.Close>
                )}
                <DialogScrollContext.Provider value={scroll}>
                  <DialogSheetContext.Provider value={sheet}>
                    {/* A dialog opened from a header action is not inside that header's bar */}
                    <DialogBarContext.Provider value={false}>
                      <ToolbarHostContext.Provider value={toolbarHost}>{children}</ToolbarHostContext.Provider>
                    </DialogBarContext.Provider>
                  </DialogSheetContext.Provider>
                </DialogScrollContext.Provider>
              </div>
            </RadixDialog.Content>
          </div>
        )}
      </TransitionGroup>
    </RadixDialog.Portal>
    </FloatingBoundaryProvider>
  )
}

type DialogScrollValue = { edges: ScrollEdges; setEdges: (edges: ScrollEdges) => void }
const DialogScrollContext = createContext<DialogScrollValue | null>(null)
// What the header of a Sheet needs from its Content to become the Sheet's bar on a phone
type DialogSheetValue = { showClose: boolean }
const DialogSheetContext = createContext<DialogSheetValue | null>(null)
// Inside that bar: the title, the description and the header actions take the Toolbar's parts
const DialogBarContext = createContext(false)

// The phone layout of the Dialog style sheet (its rules for the Sheet's bar use the same query). A dialog's content
// mounts on the client only (its portal waits for the document), so its first render already knows the layout, with
// nothing to swap after it.
const PHONE_LAYOUT = "(width <= 767px)"
const phoneLayout = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(PHONE_LAYOUT) : null)
const subscribePhoneLayout = (onChange: () => void) => {
  const query = phoneLayout()
  if (!query) return () => {}
  // Safari before 14 has only the older listener methods
  if (typeof query.addEventListener !== "function") {
    query.addListener(onChange)
    return () => query.removeListener(onChange)
  }
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
const usePhoneLayout = () => useSyncExternalStore(subscribePhoneLayout, () => phoneLayout()?.matches ?? false, () => false)
const TOP_TOOLBAR = '[data-toolbar][data-placement="top"]'
const BOTTOM_TOOLBAR = '[data-toolbar][data-placement="bottom"]'

type DialogSlotProps = {
  children: ReactNode
  className?: string
}

/** How a Sheet's bar meets the content scrolled under it; see `BarBackground`. */
export type DialogBarBackground = BarBackground
export type DialogHeaderProps = DialogSlotProps & {
  /** How the bar meets the content scrolled under it in a phone Sheet. @default "soft" */
  background?: DialogBarBackground
}

// The header's own parts, fragments opened up, so its actions can stand at the end of the bar. A part from a
// fragment keeps the fragment's key before its own, so two parts never share a key.
const headerParts = (children: ReactNode, prefix = ""): ReactNode[] =>
  Children.toArray(children).flatMap((part) => {
    if (!isValidElement<{ children?: ReactNode }>(part)) return [part]
    if (part.type === Fragment) return headerParts(part.props.children, `${prefix}${String(part.key)}/`)
    return [prefix ? cloneElement(part, { key: `${prefix}${String(part.key)}` }) : part]
  })
const isHeaderAction = (part: ReactNode): part is ReactElement => isValidElement(part) && part.type === HeaderAction

const Header = ({ children, className, background = "soft" }: DialogHeaderProps) => {
  const sheet = useContext(DialogSheetContext)
  const phone = usePhoneLayout()
  const scrolled = useContext(DialogScrollContext)?.edges.scrolled
  if (sheet && phone) {
    const parts = headerParts(children)
    // On a phone the header of a Sheet is its Toolbar (iOS 27 kit Sheets 507-24684, Toolbar - Top - iPhone
    // 1-54520): Close at the leading edge, the title centered on the row of controls, the header actions at the
    // trailing edge, all on one 44px row under the grabber.
    return (
      <Toolbar background={background} className={className} data-dialog-bar="">
        <DialogBarContext.Provider value={true}>
          {sheet.showClose && (
            <Toolbar.Leading className={s.BarClose}>
              <RadixDialog.Close asChild>
                <NavigationButton action="close" variant="ghost" aria-label="Close dialog" />
              </RadixDialog.Close>
            </Toolbar.Leading>
          )}
          <div className={clsx(t.Heading, s.BarHeading)}>{parts.filter((part) => !isHeaderAction(part))}</div>
          {parts.filter(isHeaderAction)}
        </DialogBarContext.Provider>
      </Toolbar>
    )
  }
  return <div className={clsx(s.Header, className)} data-background={background} data-scrolled={scrolled ? "" : undefined}>{children}</div>
}

const HeaderAction = ({ children, className }: DialogSlotProps) => {
  const bar = useContext(DialogBarContext)
  if (bar) return <Toolbar.Trailing className={className}>{children}</Toolbar.Trailing>
  return <div className={clsx(s.HeaderAction, className)}>{children}</div>
}

/** The scrolling part between Header and Footer: with it, only the body scrolls */
const Body = ({ children, className }: DialogSlotProps) => {
  const setEdges = useContext(DialogScrollContext)?.setEdges
  const element = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const body = element.current
    if (!body || !setEdges) return
    const stop = observeScrollEdges(body, setEdges)
    return () => { stop(); setEdges(NO_SCROLL_EDGES) }
  }, [setEdges])
  return <div ref={element} className={clsx(s.Body, className)}>{children}</div>
}

export type DialogFooterProps = DialogSlotProps & {
  /** How the bar meets the content scrolled under it in a phone Sheet. @default "soft" */
  background?: DialogBarBackground
  /** Override the mobile action layout. Alerts default to inline; sheets to stacked. */
  mobileLayout?: "inline" | "stacked"
}

const Footer = ({ children, className, mobileLayout, background = "soft" }: DialogFooterProps) => {
  const setFooter = useFloatingBoundaryRegistration()?.setFooter
  const contentBelow = useContext(DialogScrollContext)?.edges.contentBelow
  return (
    <div
      ref={setFooter}
      className={clsx(s.Footer, className)}
      data-mobile-layout={mobileLayout}
      data-background={background}
      data-content-below={contentBelow ? "" : undefined}
    >
      {children}
    </div>
  )
}

const Title = ({ children, className }: DialogSlotProps) => {
  const bar = useContext(DialogBarContext)
  return <RadixDialog.Title className={clsx(bar ? t.Title : s.Title, className)}>{children}</RadixDialog.Title>
}

const Description = ({ children, className }: DialogSlotProps) => {
  const bar = useContext(DialogBarContext)
  const element = useRef<HTMLParagraphElement | null>(null)
  const [shown, setShown] = useState(false)
  useLayoutEffect(() => {
    // In the bar a description the reader sees is the title's second line (Toolbar's subtitle); one that is only
    // read out, visually hidden, leaves the title on its one line.
    const node = element.current
    // A measurement of the laid-out description, which only an effect after layout can read
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(bar && !!node && node.offsetHeight > 1 && node.offsetWidth > 1)
  }, [bar, children, className])
  return (
    <RadixDialog.Description ref={element} className={clsx(bar && shown ? t.Subtitle : s.Description, className)}>
      {children}
    </RadixDialog.Description>
  )
}

const Close = ({ children }: { children: ReactNode }) => {
  return <RadixDialog.Close asChild>{children}</RadixDialog.Close>
}

Dialog.Trigger = Trigger
Dialog.Content = Content
Dialog.Header = Header
Dialog.HeaderAction = HeaderAction
Dialog.Body = Body
Dialog.Footer = Footer
Dialog.Title = Title
Dialog.Description = Description
Dialog.Close = Close
