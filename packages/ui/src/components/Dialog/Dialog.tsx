"use client"

import clsx from "clsx"
import { Dialog as RadixDialog } from "radix-ui"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { FloatingBoundaryProvider, useFloatingBoundaryRegistration, useFloatingBoundaryScope } from "../../hooks/useFloatingBoundary"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers"
import { useStableCallback } from "../../hooks/useStableCallback"
import { NavigationButton } from "../Button/NavigationButton"
import { ToolbarHostContext, type ToolbarHost } from "../Toolbar/Toolbar"
import { TransitionGroup } from "../Transition"
import { createExitGuard, overlayTiming, overlayTimingLarge } from "../Transition/shared"
import { attachSheetDrag } from "./sheetDrag"
import { usePopoverDismissableSurface } from "../Popover/deferredOutsidePress"
import s from "@plexui/styles/components/Dialog/Dialog.module.css"

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
      // A phone Toolbar takes the place of the header or footer bar on its side.
      const header = panel.querySelector<HTMLElement>(`:scope > ${TOP_TOOLBAR}`) ?? panel.querySelector<HTMLElement>(`:scope > .${s.Header}`)
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
                <ToolbarHostContext.Provider value={DIALOG_TOOLBAR_HOST}>{children}</ToolbarHostContext.Provider>
              </div>
            </RadixDialog.Content>
          </div>
        )}
      </TransitionGroup>
    </RadixDialog.Portal>
    </FloatingBoundaryProvider>
  )
}

const DIALOG_TOOLBAR_HOST: ToolbarHost = { kind: "dialog" }
const TOP_TOOLBAR = '[data-toolbar][data-placement="top"]'
const BOTTOM_TOOLBAR = '[data-toolbar][data-placement="bottom"]'

type DialogSlotProps = {
  children: ReactNode
  className?: string
}

export type DialogBarBackground = "glass" | "solid"
export type DialogHeaderProps = DialogSlotProps & { background?: DialogBarBackground }

const Header = ({ children, className, background = "glass" }: DialogHeaderProps) => {
  return <div className={clsx(s.Header, className)} data-background={background}>{children}</div>
}

const HeaderAction = ({ children, className }: DialogSlotProps) => {
  return <div className={clsx(s.HeaderAction, className)}>{children}</div>
}

/** The scrolling part between Header and Footer: with it, only the body scrolls */
const Body = ({ children, className }: DialogSlotProps) => {
  return <div className={clsx(s.Body, className)}>{children}</div>
}

export type DialogFooterProps = DialogSlotProps & {
  background?: DialogBarBackground
  /** Override the mobile action layout. Alerts default to inline; sheets to stacked. */
  mobileLayout?: "inline" | "stacked"
}

const Footer = ({ children, className, mobileLayout, background = "glass" }: DialogFooterProps) => {
  const setFooter = useFloatingBoundaryRegistration()?.setFooter
  return <div ref={setFooter} className={clsx(s.Footer, className)} data-mobile-layout={mobileLayout} data-background={background}>{children}</div>
}

const Title = ({ children, className }: DialogSlotProps) => {
  return <RadixDialog.Title className={clsx(s.Title, className)}>{children}</RadixDialog.Title>
}

const Description = ({ children, className }: DialogSlotProps) => {
  return (
    <RadixDialog.Description className={clsx(s.Description, className)}>
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
