"use client"

import clsx from "clsx"
import { Dialog as RadixDialog } from "radix-ui"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { preventDefaultHandler, toCssVariables } from "../../lib/helpers"
import { TransitionGroup } from "../Transition"
import s from "@plexui/styles/components/Dialog/Dialog.module.css"

type DialogContextValue = {
  open: boolean
  setOpen: (nextState: boolean) => void
}

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
  className?: string
  /**
   * Where the panel sits: centered, near the top (search, command lists),
   * a sheet along the bottom, a full-height panel on the start or end side,
   * or the whole screen.
   * @default center
   */
  placement?: DialogPlacement
  /** Placement at 640px and below, such as a bottom sheet on phones. @default placement */
  mobilePlacement?: Extract<DialogPlacement, "center" | "bottom" | "fullscreen">
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
  className,
  placement = "center",
  mobilePlacement,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: DialogContentProps) => {
  const { open, setOpen } = useDialogContext()

  useEscCloseStack(open, () => {
    setOpen(false)
  })

  return (
    <RadixDialog.Portal forceMount>
      <TransitionGroup
        enterDuration={250}
        exitDuration={150}
        className={s.Transition}
        disableAnimations
      >
        {open && (
          <div key="dialog">
            <RadixDialog.Overlay className={s.Overlay} />
            <RadixDialog.Content
              forceMount
              className={s.Content}
              style={toCssVariables({ "dialog-width": width })}
              data-placement={placement === "center" ? undefined : placement}
              data-mobile-placement={mobilePlacement}
              onEscapeKeyDown={preventDefaultHandler}
              onOpenAutoFocus={onOpenAutoFocus}
              onCloseAutoFocus={onCloseAutoFocus}
            >
              <div className={clsx(s.Panel, className)}>
                {showClose && (
                  <RadixDialog.Close asChild>
                    <button type="button" className={s.CloseButton} aria-label="Close dialog">
                      <svg
                        className={s.CloseIcon}
                        viewBox="0 0 20 20"
                        width="20"
                        height="20"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06"
                        />
                      </svg>
                    </button>
                  </RadixDialog.Close>
                )}
                {children}
              </div>
            </RadixDialog.Content>
          </div>
        )}
      </TransitionGroup>
    </RadixDialog.Portal>
  )
}

type DialogSlotProps = {
  children: ReactNode
  className?: string
}

const Header = ({ children, className }: DialogSlotProps) => {
  return <div className={clsx(s.Header, className)}>{children}</div>
}

/** The scrolling part between Header and Footer: with it, only the body scrolls */
const Body = ({ children, className }: DialogSlotProps) => {
  return <div className={clsx(s.Body, className)}>{children}</div>
}

const Footer = ({ children, className }: DialogSlotProps) => {
  return <div className={clsx(s.Footer, className)}>{children}</div>
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
Dialog.Body = Body
Dialog.Footer = Footer
Dialog.Title = Title
Dialog.Description = Description
Dialog.Close = Close
