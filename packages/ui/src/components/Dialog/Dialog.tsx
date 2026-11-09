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
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { FloatingBoundaryProvider, useFloatingBoundaryRegistration, useFloatingBoundaryScope } from "../../hooks/useFloatingBoundary"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { inToastRegion } from "../../lib/toastRegion"
import { cancelableKeyCopy, dataAttributes, keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers"
import { useStableCallback } from "../../hooks/useStableCallback"
import { NavigationButton } from "../Button/NavigationButton"
import { Toolbar, ToolbarHostContext, type BarBackground, type ToolbarHost } from "../Toolbar/Toolbar"
import { NO_SCROLL_EDGES, observeScrollEdges, sameScrollEdges, type ScrollEdges } from "../../lib/scrollEdges"
import { TransitionGroup } from "../Transition"
import { createExitGuard, overlayTiming, overlayTimingLarge } from "../Transition/shared"
import { attachSheetDrag } from "./sheetDrag"
import { watchDialogViewport } from "./dialogViewport"
import { enterStep, leaveStep, releaseStepHeight, settleStepHeight, STEP_TIMING } from "./dialogSteps"
import { PhoneLayoutContext, usePhoneLayout, type PhoneLayoutValue } from "../PhoneLayout/PhoneLayout"
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

/** A press or a focus outside the dialog; `event.detail.originalEvent` is the browser's event. */
export type DialogInteractOutsideEvent = CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>

/** Class, style and data attributes for one of the dialog's layers. */
export type DialogLayerProps = {
  className?: string
  style?: CSSProperties
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined
}

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
  /**
   * Called on Escape before the dialog closes. Call `event.preventDefault()` to keep it open, such as for a form
   * with unsaved changes.
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  /**
   * Called on a press or a focus outside the dialog before it closes. Call `event.preventDefault()` to keep it open,
   * such as for a press on a developer panel over the page.
   */
  onInteractOutside?: (event: DialogInteractOutsideEvent) => void
  /** Stack order of the overlay and the dialog. @default 50 */
  zIndex?: number
  /** Class, style and data attributes for the fixed layer that holds the panel. Data attributes of Content land here too. */
  rootProps?: DialogLayerProps
  /** Class, style and data attributes for the overlay. */
  overlayProps?: DialogLayerProps
  /**
   * `phone` lays the dialog out as on a phone at any window width. Inside a PhoneLayout it always is.
   * @default "auto"
   */
  layout?: "auto" | "phone"
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined
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
  onEscapeKeyDown,
  onInteractOutside,
  zIndex,
  rootProps,
  overlayProps,
  layout = "auto",
  ...rest
}: DialogContentProps) => {
  const { open, setOpen } = useDialogContext()
  const outerPhoneLayout = useContext(PhoneLayoutContext)
  // A dialog laid out as on a phone by its own prop, outside a PhoneLayout, keeps the window: what it holds and
  // the dialogs it opens are phone ones too.
  const phoneLayout = useMemo<PhoneLayoutValue | null>(
    () => outerPhoneLayout ?? (layout === "phone" ? { container: null } : null),
    [outerPhoneLayout, layout],
  )
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  useDialogViewport(content, outerPhoneLayout?.container ?? null)
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
  // Where a phone Sheet's description goes: the first text of the content, under the bar. Dialog.Body offers
  // its top; a Dialog.DescriptionSlot of the content's own, such as a scroller inside a form, comes first.
  const [bodySlot, setBodySlot] = useState<HTMLElement | null>(null)
  const [ownSlot, setOwnSlot] = useState<HTMLElement | null>(null)
  const descriptionSlot = ownSlot ?? bodySlot
  const sheet = useMemo<DialogSheetValue | null>(
    () => (mobileVariant === "sheet" ? { showClose, descriptionSlot, setBodySlot, setOwnSlot } : null),
    [mobileVariant, showClose, descriptionSlot],
  )
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

  useEscCloseStack(open, (event) => {
    if (onEscapeKeyDown) {
      const request = cancelableKeyCopy(event)
      onEscapeKeyDown(request)
      if (request.defaultPrevented) return
    }
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

  const layerStyle = toCssVariables({ "dialog-z-index": zIndex === undefined ? undefined : String(zIndex) })

  return (
    <FloatingBoundaryProvider value={boundary}>
    <PhoneLayoutContext value={phoneLayout}>
    <RadixDialog.Portal forceMount container={outerPhoneLayout?.container ?? undefined}>
      {/* Portaled out of any phone layout, a phone dialog carries its own scope, above its transition: the phone
          rules of the style sheet start there. */}
      <PhoneScope enabled={phoneLayout !== null && !outerPhoneLayout?.container}>
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
            <RadixDialog.Overlay
              {...overlayProps}
              ref={overlaySurfaceRef}
              className={clsx(s.Overlay, overlayProps?.className)}
              style={{ ...layerStyle, ...overlayProps?.style }}
            />
            <RadixDialog.Content
              {...dataAttributes(rest)}
              {...rootProps}
              ref={setContent}
              forceMount
              className={clsx(s.Content, rootProps?.className)}
              data-plex-dialog=""
              style={{ ...toCssVariables({ "dialog-width": width }), ...layerStyle, ...rootProps?.style }}
              data-placement={placement === "center" ? undefined : placement}
              data-mobile-placement={mobilePlacement}
              data-mobile-variant={mobileVariant}
              data-surface={surface}
              data-pill={pill ? "" : undefined}
              onEscapeKeyDown={preventDefaultHandler}
              onInteractOutside={(event) => {
                // A press or focus in a toast is not outside: the toast region is a layer above the dialog. The
                // Toaster stops these before Radix sees them; this holds when the Toaster mounted after the dialog.
                if (inToastRegion(event.detail.originalEvent.target)) return event.preventDefault()
                onInteractOutside?.(event)
                if (event.defaultPrevented) return
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
      </PhoneScope>
    </RadixDialog.Portal>
    </PhoneLayoutContext>
    </FloatingBoundaryProvider>
  )
}

type DialogScrollValue = { edges: ScrollEdges; setEdges: (edges: ScrollEdges) => void }
const DialogScrollContext = createContext<DialogScrollValue | null>(null)
// What the header of a Sheet needs from its Content to become the Sheet's bar on a phone
type DialogSheetValue = {
  showClose: boolean
  descriptionSlot: HTMLElement | null
  setBodySlot: (slot: HTMLElement | null) => void
  setOwnSlot: (slot: HTMLElement | null) => void
}
const DialogSheetContext = createContext<DialogSheetValue | null>(null)
// Inside that bar: the title, the description and the header actions take the Toolbar's parts
const DialogBarContext = createContext(false)

const PhoneScope = ({ enabled, children }: { enabled: boolean; children: ReactNode }) =>
  enabled ? <div className={s.PhoneScope} data-plex-layout="phone">{children}</div> : children

const useDialogViewport = (content: HTMLElement | null, container: HTMLElement | null) => {
  useLayoutEffect(() => (content ? watchDialogViewport(content, container) : undefined), [content, container])
}
const TOP_TOOLBAR = '[data-toolbar][data-placement="top"]'
const BOTTOM_TOOLBAR = '[data-toolbar][data-placement="bottom"]'

type DialogSlotProps = {
  children: ReactNode
  className?: string
}

/** How a Sheet's bar meets the content scrolled under it; see `BarBackground`. */
export type DialogBarBackground = BarBackground
export type DialogHeaderProps = DialogSlotProps & {
  /** How the bar meets the content scrolled under it in a phone Sheet. @default "glass" */
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
const isDescription = (part: ReactNode): part is ReactElement => isValidElement(part) && part.type === Description

const Header = ({ children, className, background = "glass" }: DialogHeaderProps) => {
  const sheet = useContext(DialogSheetContext)
  const phone = usePhoneLayout()
  const scrolled = useContext(DialogScrollContext)?.edges.scrolled
  if (sheet && phone) {
    const parts = headerParts(children)
    const descriptions = parts.filter(isDescription)
    // The description reads as the first text of the content, at the top of Dialog.Body when there is one
    const description = descriptions.length > 0 && <div className={s.SheetDescription}>{descriptions}</div>
    // On a phone the header of a Sheet is its Toolbar (iOS 27 kit Sheets 507-24684, Toolbar - Top - iPhone
    // 1-54520): Close at the leading edge, the title alone centered on the row of controls, the header actions
    // at the trailing edge, all on one 44px row under the grabber.
    return (
      <>
        <Toolbar background={background} className={className} data-dialog-bar="">
          <DialogBarContext.Provider value={true}>
            {sheet.showClose && (
              <Toolbar.Leading className={s.BarClose}>
                <RadixDialog.Close asChild>
                  <NavigationButton action="close" variant="ghost" aria-label="Close dialog" />
                </RadixDialog.Close>
              </Toolbar.Leading>
            )}
            <div className={clsx(t.Heading, s.BarHeading)}>{parts.filter((part) => !isHeaderAction(part) && !isDescription(part))}</div>
            {parts.filter(isHeaderAction)}
          </DialogBarContext.Provider>
        </Toolbar>
        {description && (sheet.descriptionSlot ? createPortal(description, sheet.descriptionSlot) : description)}
      </>
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
  const sheet = useContext(DialogSheetContext)
  const phone = usePhoneLayout()
  // A phone Sheet's description starts the body (Dialog.Header portals it here)
  const setDescriptionSlot = sheet && phone ? sheet.setBodySlot : null
  const element = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const body = element.current
    if (!body || !setEdges) return
    const stop = observeScrollEdges(body, setEdges)
    return () => { stop(); setEdges(NO_SCROLL_EDGES) }
  }, [setEdges])
  return (
    <div ref={element} className={clsx(s.Body, className)}>
      {setDescriptionSlot && <div ref={setDescriptionSlot} className={s.SheetDescriptionSlot} />}
      {children}
    </div>
  )
}

/**
 * Where a phone Sheet's description goes in content of your own, such as a scroller inside a form so that Enter
 * submits: the description starts it, as it starts Dialog.Body, and it comes before the body's place. It renders
 * nothing outside a phone Sheet.
 */
const DescriptionSlot = () => {
  const sheet = useContext(DialogSheetContext)
  const phone = usePhoneLayout()
  const setOwnSlot = sheet && phone ? sheet.setOwnSlot : null
  return setOwnSlot ? <div ref={setOwnSlot} className={s.SheetDescriptionSlot} /> : null
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
    // The header leaves its own descriptions out of the bar. One the bar still holds, inside a part of the
    // header's own, is the title's second line (Toolbar's subtitle) when the reader sees it; one that is only
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

export type DialogStepsProps = {
  /** The step on screen. A new value brings its content in. */
  step: string | number
  /**
   * `forward` brings the new step in from the trailing edge over the one before, as a push on iOS; `back` returns to
   * a step before it.
   * @default "forward"
   */
  direction?: "forward" | "back"
  children: ReactNode
  className?: string
}

/** The steps of a flow inside a dialog, such as a sign-in that asks for an email and then a code. */
const Steps = ({ step, direction = "forward", children, className }: DialogStepsProps) => (
  <div className={clsx(s.Steps, className)} data-direction={direction}>
    <TransitionGroup {...STEP_TIMING} as="div" overlay className={s.Step} onEnter={enterStep} onExit={leaveStep} onExitActive={settleStepHeight} onExitComplete={releaseStepHeight}>
      <div key={step} data-dialog-step="" tabIndex={-1}>{children}</div>
    </TransitionGroup>
  </div>
)

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
Dialog.DescriptionSlot = DescriptionSlot
Dialog.Close = Close
Dialog.Steps = Steps
