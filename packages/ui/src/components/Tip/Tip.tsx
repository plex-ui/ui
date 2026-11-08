"use client"

import clsx from "clsx"
import { Popover as RadixPopover } from "radix-ui"
import { type KeyboardEvent, type ReactElement, type ReactNode, type Ref, useEffect, useId, useRef, useState } from "react"
import s from "@plexui/styles/components/Tip/Tip.module.css"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { preventDefaultHandler } from "../../lib/helpers"
import { Button } from "../Button"
import { X } from "../Icon"
import { TransitionGroup } from "../Transition"
import { overlayTiming } from "../Transition/shared"

/** The edge of an inline tip that points at what it explains. */
export type TipArrowEdge = "top" | "bottom" | "left" | "right"

type TipContentProps = {
  /** The tip's title: what the feature is. */
  title: ReactNode
  /** One or two sentences on how to use it. */
  description?: ReactNode
  /** A symbol or image that leads the message, as a TipKit tip's image. */
  icon?: ReactNode
  /** Buttons for the tip's actions, side by side below the message. */
  actions?: ReactNode
}

export type TipProps = TipContentProps & {
  /** Shows the Close button; called when it is clicked. */
  onClose?: () => void
  /** Draws an arrow at this edge, pointing at what the tip explains (TipKit's annotation). */
  arrowEdge?: TipArrowEdge
  /** Class applied to the tip */
  className?: string
  /** Ref applied to the tip */
  ref?: Ref<HTMLDivElement>
}

type TipBodyProps = TipContentProps & {
  onClose?: () => void
  arrowEdge?: TipArrowEdge
  className?: string
  ref?: Ref<HTMLDivElement>
  titleId: string
  descriptionId: string
  role?: string
}

const TipBody = ({ title, description, icon, actions, onClose, arrowEdge, className, ref, titleId, descriptionId, role }: TipBodyProps) => (
  <div
    ref={ref}
    className={clsx(s.Tip, className)}
    role={role}
    aria-labelledby={role ? titleId : undefined}
    data-arrow-edge={arrowEdge}
  >
    {icon && <div className={s.Icon}>{icon}</div>}
    <div className={s.Message}>
      <div className={s.Title} id={titleId}>{title}</div>
      {description && <div className={s.Description} id={descriptionId}>{description}</div>}
    </div>
    {actions && <div className={s.Actions}>{actions}</div>}
    {onClose && (
      <Button type="button" onClick={onClose} color="secondary" variant="soft" uniform pill aria-label="Close tip" className={s.Close}>
        <X />
      </Button>
    )}
  </div>
)

/** A tip inside the page, after TipKit: a title, a description, an optional symbol, actions and Close. */
export const Tip = ({ ref, ...props }: TipProps) => {
  const id = useId()
  return <TipBody {...props} ref={ref} titleId={`${id}-title`} descriptionId={`${id}-description`} role="note" />
}

export type TipPopoverProps = TipContentProps & {
  /** Shows the tip (controlled). */
  open?: boolean
  /** Shows the tip at first (uncontrolled). @default false */
  defaultOpen?: boolean
  /** Called when the tip opens or closes: Close, Escape or a press outside closes it. */
  onOpenChange?: (open: boolean) => void
  /** The control the tip explains. It stays usable while the tip shows. */
  children: ReactElement
  /** The side of the control the tip shows on. Turned when it does not fit. @default bottom */
  side?: "top" | "right" | "bottom" | "left"
  /** The alignment against the control. @default center */
  align?: "start" | "center" | "end"
  /** The distance from the control to the arrow's point, in pixels. @default 4 */
  sideOffset?: number
  /** Shows the Close button. @default true */
  closeButton?: boolean
  /** Class applied to the popover around the tip and its arrow */
  className?: string
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

// What Tab can reach: no focus guards, nothing hidden (checkVisibility where the browser has it)
const tabbables = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.closest("[hidden], [inert], [data-radix-focus-guard], [data-reka-focus-guard]") &&
      (typeof element.checkVisibility !== "function" || element.checkVisibility({ visibilityProperty: true })),
  )

// The first element Tab reaches after the control, outside the tip
const nextAfter = (control: HTMLElement, tip: HTMLElement) =>
  tabbables(control.ownerDocument).find(
    (element) =>
      !tip.contains(element) &&
      !control.contains(element) &&
      !!(control.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
  )

// Takes the Tab only when the focus moved
const focusInstead = (event: globalThis.KeyboardEvent, element: HTMLElement | undefined) => {
  if (!element) return
  element.focus()
  if (element.ownerDocument.activeElement === element) event.preventDefault()
}

// A popover tip renders at the end of the page, but Tab reaches it as if it sat right after its control: from the
// control (or its last control) Tab moves into the tip, and Shift+Tab from what follows the control moves to the
// tip's last control. Listened for on the document, after the control's own handlers.
const tabIntoTip = (event: globalThis.KeyboardEvent, control: HTMLElement, tip: HTMLElement) => {
  if (event.key !== "Tab" || event.defaultPrevented || !(event.target instanceof Node) || tip.contains(event.target)) return
  const items = tabbables(tip)
  if (event.shiftKey) {
    if (event.target === nextAfter(control, tip)) focusInstead(event, items.at(-1))
  } else if (event.target === (tabbables(control).at(-1) ?? control)) {
    focusInstead(event, items[0])
  }
}

// Shift+Tab from the tip's first control returns to the control; Tab from its last moves on to what follows it
const tabOutOfTip = (event: globalThis.KeyboardEvent, control: HTMLElement, tip: HTMLElement) => {
  if (event.key !== "Tab" || event.defaultPrevented) return
  const items = tabbables(tip)
  if (event.shiftKey) {
    if (event.target === items[0]) focusInstead(event, tabbables(control).at(-1) ?? (control.tabIndex >= 0 ? control : undefined))
  } else if (event.target === items.at(-1)) {
    focusInstead(event, nextAfter(control, tip))
  }
}

/** A tip anchored to a control, after TipKit's popover tip. It does not take the focus. */
const TipPopover = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  closeButton = true,
  className,
  ...content
}: TipPopoverProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const anchorRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  useEscCloseStack(open, () => setOpen(false))
  // Radix waits for the click that completes a press outside before it closes the tip; a press on the control
  // does not close it. The tip never takes the focus, so focus moving elsewhere does not close it either.
  const isOnControl = (target: EventTarget | null) => target instanceof Node && !!anchorRef.current?.contains(target)
  // Tab reaches the tip as if it sat right after the control
  useEffect(() => {
    if (!open) return
    const doc = anchorRef.current?.ownerDocument ?? document
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (anchorRef.current && contentRef.current) tabIntoTip(event, anchorRef.current, contentRef.current)
    }
    doc.addEventListener("keydown", onKeyDown)
    return () => doc.removeEventListener("keydown", onKeyDown)
  }, [open])
  const onTipKeyDown = (event: KeyboardEvent) => {
    if (anchorRef.current && contentRef.current) tabOutOfTip(event.nativeEvent, anchorRef.current, contentRef.current)
  }

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen} modal={false}>
      <RadixPopover.Anchor asChild ref={anchorRef}>{children}</RadixPopover.Anchor>
      <RadixPopover.Portal forceMount>
        <TransitionGroup className={s.Transition} {...overlayTiming} overlay>
          {open && (
            <RadixPopover.Content
              key="tip"
              ref={contentRef}
              forceMount
              className={clsx(s.Popover, className)}
              side={side}
              align={align}
              sideOffset={sideOffset}
              // The arrow stays clear of the tip's corners
              arrowPadding={26}
              collisionPadding={16}
              hideWhenDetached
              aria-labelledby={titleId}
              aria-describedby={content.description ? descriptionId : undefined}
              onOpenAutoFocus={preventDefaultHandler}
              onCloseAutoFocus={preventDefaultHandler}
              onEscapeKeyDown={preventDefaultHandler}
              onPointerDownOutside={(event) => {
                if (isOnControl(event.detail.originalEvent.target)) event.preventDefault()
              }}
              onFocusOutside={preventDefaultHandler}
              onKeyDown={onTipKeyDown}
            >
              <TipBody {...content} onClose={closeButton ? () => setOpen(false) : undefined} titleId={titleId} descriptionId={descriptionId} />
              <RadixPopover.Arrow asChild width={47} height={13}>
                <span className={s.Arrow} />
              </RadixPopover.Arrow>
            </RadixPopover.Content>
          )}
        </TransitionGroup>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

Tip.Popover = TipPopover
