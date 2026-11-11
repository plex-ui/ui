"use client"

import clsx from "clsx"
import { Portal, Slot } from "radix-ui"
import * as Popper from "@radix-ui/react-popper"
import { DismissableLayer } from "@radix-ui/react-dismissable-layer"
import { FocusScope, useFocusScopeBranch } from "@radix-ui/react-focus-scope"
import { useFocusGuards } from "@radix-ui/react-focus-guards"
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react"
import { mergeRefs } from "react-merge-refs"
import { FieldColumnsContext, FieldRowContext } from "../../lib/fieldRow"
import { useTimeout } from "usehooks-ts"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { useLatestValue } from "../../hooks/useLatestValue"
import { dataAttributes, focusableElements, keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers"
import { TransitionGroup } from "../Transition"
import { overlayTiming } from "../Transition/shared"
import { createPointerIntentArea, isPointInPolygon, type Polygon } from "./pointerIntent"
import { isHoverPointer } from "../../lib/inputMode"
import { useDeferredOutsidePress } from "./deferredOutsidePress"
import s from "@plexui/styles/components/Popover/Popover.module.css"
import { PopoverContext, usePopoverContext, type PopoverContextValue } from "./usePopoverContext"

export type PopoverProps = {
  /** Sets controlled visibility state */
  open?: boolean
  /** Callback invoked when visibility state changes */
  onOpenChange?: (nextState: boolean) => void
  showOnHover?: boolean
  hoverOpenDelay?: number
  children: React.ReactNode
}

export const Popover = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showOnHover = false,
  hoverOpenDelay = 150,
  children,
}: PopoverProps) => {
  const [open, setOpen] = useState<boolean>(false)
  const [shake, setShake] = useState<boolean>(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hoverOpenFocusedWithTab = useRef<boolean>(false)
  const isPointerInTransitRef = useRef<boolean>(false)
  const isOpen = controlledOpen ?? open
  const contentId = useId()

  const [temporarilyPreventClickToClose, setTemporarilyPreventClickToClose] =
    useState<boolean>(false)
  useTimeout(
    () => setTemporarilyPreventClickToClose(false),
    temporarilyPreventClickToClose ? 500 : null,
  )

  const latestOpenChange = useLatestValue(controlledOnOpenChange)

  const handleOpenChangeImpl = useLatestValue((nextState: boolean) => {
    clearTimeout(openTimerRef.current)

    // No-op if the state is not changing
    if (isOpen === nextState) {
      return
    }

    if (!nextState) {
      // clear any running shake animation on close
      setShake(false)

      // Check for specific hover conditions where focus should be
      // immediately restored to the trigger before closing
      if (showOnHover && hoverOpenFocusedWithTab.current) {
        triggerRef.current?.focus()
      }

      // Always cleanup this state
      hoverOpenFocusedWithTab.current = false
    }

    latestOpenChange.current?.(nextState)
    setOpen(nextState)

    if (showOnHover) {
      setTemporarilyPreventClickToClose(nextState)
    }
  })

  const handleOpenChange = useCallback(
    (nextState: boolean) => {
      handleOpenChangeImpl.current(nextState)
    },
    [handleOpenChangeImpl],
  )

  const handleTriggerEnter = useCallback(() => {
    openTimerRef.current = setTimeout(() => handleOpenChange(true), hoverOpenDelay)
  }, [handleOpenChange, hoverOpenDelay])

  const handleTriggerLeave = useCallback(() => {
    clearTimeout(openTimerRef.current)
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(openTimerRef.current)
    }
  }, [])

  const store = useMemo<PopoverContextValue>(
    () => ({
      open: isOpen,
      contentId,
      setOpen: handleOpenChange,
      shake,
      setShake,
      showOnHover,
      temporarilyPreventClickToClose,
      onTriggerEnter: handleTriggerEnter,
      onTriggerLeave: handleTriggerLeave,
      isPointerInTransitRef,
      triggerRef,
      contentRef,
      hoverOpenFocusedWithTab,
    }),
    [
      isOpen,
      contentId,
      handleOpenChange,
      shake,
      setShake,
      showOnHover,
      temporarilyPreventClickToClose,
      hoverOpenFocusedWithTab,
      isPointerInTransitRef,
      handleTriggerEnter,
      handleTriggerLeave,
    ],
  )

  return (
    <PopoverContext value={store}>
      <Popper.Root>
        {children}
      </Popper.Root>
    </PopoverContext>
  )
}

const Trigger = ({
  children,
  onPointerDown,
  onClick,
}: {
  children: React.ReactNode
  onPointerDown?: PointerEventHandler
  onClick?: MouseEventHandler
}) => {
  const {
    open,
    contentId,
    setOpen,
    showOnHover,
    temporarilyPreventClickToClose,
    onTriggerEnter,
    onTriggerLeave,
    isPointerInTransitRef,
    triggerRef,
    contentRef,
  } = usePopoverContext()
  const hasPointerMoveOpenedRef = useRef<boolean>(false)

  const maybePreventClickClose = (evt: React.MouseEvent) => {
    // Don't prevent temporary close if the trigger is an anchor tag itself
    const isLink = evt.currentTarget.nodeName.toLocaleLowerCase() === "a"

    if (!isLink && temporarilyPreventClickToClose) {
      // Prevents tooltip listeners from closing
      evt.preventDefault()
      evt.stopPropagation()
    }
  }

  const handlePointerMove = (evt: React.PointerEvent) => {
    if (!isHoverPointer(evt)) {
      return
    }

    if (!hasPointerMoveOpenedRef.current && !isPointerInTransitRef.current) {
      onTriggerEnter()
      hasPointerMoveOpenedRef.current = true
    }
  }

  const handlePointerLeave = () => {
    if (!hasPointerMoveOpenedRef.current) {
      return
    }

    onTriggerLeave()
    hasPointerMoveOpenedRef.current = false
  }

  return (
    <Popper.Anchor asChild>
      <Slot.Root
        {...{ type: "button" }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        data-state={open ? "open" : "closed"}
        ref={triggerRef}
        onPointerDown={(evt) => {
          maybePreventClickClose(evt)
          onPointerDown?.(evt)
        }}
        onClick={(evt) => {
          maybePreventClickClose(evt)
          onClick?.(evt)
          if (!evt.defaultPrevented) setOpen(!open)
        }}
        onPointerMove={showOnHover ? handlePointerMove : undefined}
        onPointerLeave={showOnHover ? handlePointerLeave : undefined}
        onFocus={showOnHover ? () => setOpen(true) : undefined}
        onBlur={
          showOnHover
            ? () => {
                setTimeout(() => {
                  // Ignore this handler if focus has moved into the popover
                  if (contentRef.current?.contains(document.activeElement)) {
                    return
                  }

                  setOpen(false)
                }, 50)
              }
            : undefined
        }
      >
        {children}
      </Slot.Root>
    </Popper.Anchor>
  )
}

export type PopoverContentProps = {
  children: ReactNode
  /**
   * Whether to avoid collisions with the viewport and scroll containers.
   * @default true
   */
  avoidCollisions?: boolean
  /**
   * Distance in pixels to keep from viewport and scroll container boundaries; an object sets it per side, and a side it leaves out gets 0.
   * @default 20
   */
  collisionPadding?: Popper.PopperContentProps["collisionPadding"]
  /**
   * Set the `width` of the popover, in pixels.
   * @default auto
   */
  width?: number | "auto"
  /**
   * Set the `min-width` of the popover, in pixels.
   * @default 300
   */
  minWidth?: number | "auto"
  /**
   * Set the `max-width` of the popover, in pixels.
   */
  maxWidth?: number
  /**
   * Background style for the popover
   * @default default
   */
  /**
   * The preferred side of the trigger to render against when open. Will be reversed when collisions occur.
   * @default bottom
   */
  side?: Popper.PopperContentProps["side"]
  /**
   * The distance in pixels from the trigger.
   * @default 8
   */
  sideOffset?: Popper.PopperContentProps["sideOffset"]
  /**
   * The preferred alignment against the trigger. May change when collisions occur.
   * @default center
   */
  align?: Popper.PopperContentProps["align"]
  /**
   * An offset in pixels from the "start" or "end" alignment options.
   * @default 0
   */
  alignOffset?: Popper.PopperContentProps["alignOffset"]
  /**
   * Whether the popover surface should be translucent.
   * @default false
   */
  translucent?: boolean
  /** Additional class name to apply to the popover content, you usually don't want to set this, but ag-grid needs it to render a custom editor properly */
  className?: string
  /**
   * Auto focus the popover content when it is opened.
   * @default true
   */
  autoFocus?: boolean
  /** `data-*` attributes land on the popover */
  [dataAttribute: `data-${string}`]: unknown
}

const ContentImpl = ({
  children,
  avoidCollisions,
  collisionPadding = 20,
  width,
  minWidth,
  maxWidth,
  side,
  sideOffset = 8,
  align,
  alignOffset,
  translucent,
  className,
  autoFocus = true,
  ...restProps
}: PopoverContentProps) => {
  const { showOnHover, shake, contentRef, contentId, triggerRef, setOpen, open } = usePopoverContext()
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null)
  const contentMergedRef = useMemo(() => mergeRefs([contentRef, setContentNode]), [contentRef])
  const interactedOutside = useRef(false)
  useFocusScopeBranch(contentNode)
  useFocusGuards()
  const outsidePress = useDeferredOutsidePress(() => {
    interactedOutside.current = true
    setOpen(false)
  }, triggerRef)
  const { reset: resetOutsidePress } = outsidePress
  useEffect(() => { if (!open) resetOutsidePress() }, [open, resetOutsidePress])
  const handleCloseAutoFocus = (event: Event) => {
    if (showOnHover) event.preventDefault()
    else keepMovedFocus(event)
    if (!event.defaultPrevented) {
      if (!interactedOutside.current) triggerRef.current?.focus({ preventScroll: true })
      event.preventDefault()
    }
  }

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (evt) => {
    const contentElement = contentRef.current

    if (
      // When the current target is our container
      contentElement &&
      evt.target === contentElement &&
      // We know that shift key tabs will lead to closing the popover (because we don't use `modal`)
      evt.key === "Tab" &&
      evt.shiftKey
    ) {
      // Prevent that from happening
      evt.preventDefault()
      evt.stopPropagation()

      // Move focus to the last focusable element, placing the user in the focus loop
      const focusable = focusableElements(contentElement)
      const lastFocusable = focusable[focusable.length - 1]
      lastFocusable?.focus()
    }
  }

  // Important that we send initial focus into the popover, placing it onto the container.
  // This allows focus looping to begin, as well as capturing scoped key presses.
  // We prevent Radix's default behavior of focusing an element, because this can have adverse side-effects.
  useEffect(() => {
    const contentElement = contentRef.current

    if (!contentElement || !autoFocus) {
      return
    }

    // If we're already focused within the content area, no-op.
    // This would be true if some inner component declares autoFocus
    if (contentElement?.contains(document.activeElement)) {
      return
    }

    // Our focus isn't in the content area - move it there.
    // NOTE: Don't automatically shift focus on hover popovers
    if (!showOnHover) {
      // In a microtask: until Radix's focus scope here has registered, a Dialog
      // around this content sends the focus straight back, and the content
      // takes that for focus moving outside and closes.
      queueMicrotask(() => contentElement.focus({ preventScroll: true }))
    }
  }, [contentRef, showOnHover, autoFocus])

  return (
    <FocusScope asChild loop onMountAutoFocus={preventDefaultHandler} onUnmountAutoFocus={handleCloseAutoFocus}>
      <DismissableLayer asChild
        onPointerDownOutside={outsidePress.onPointerDownOutside}
        onFocusOutside={outsidePress.onFocusOutside}
        onDismiss={() => { interactedOutside.current = true; setOpen(false) }}
        onEscapeKeyDown={preventDefaultHandler}
      >
        <Popper.Content
          id={contentId}
          role="dialog"
          data-state={open ? "open" : "closed"}
          {...dataAttributes(restProps)}
          ref={contentMergedRef}
          className={clsx(s.Popover, className)}
          style={toCssVariables({
            "popover-width": width,
            "popover-min-width": minWidth,
            "popover-max-width": maxWidth,
            "radix-popover-content-transform-origin": "var(--radix-popper-transform-origin)",
            "radix-popover-content-available-width": "var(--radix-popper-available-width)",
            "radix-popover-content-available-height": "var(--radix-popper-available-height)",
            "radix-popover-trigger-width": "var(--radix-popper-anchor-width)",
            "radix-popover-trigger-height": "var(--radix-popper-anchor-height)",
          })}
          // data-surface={surface}
          data-animate={shake ? "shake" : undefined}
          data-translucent={translucent ? "true" : undefined}
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset ?? (align === "center" ? 0 : -5)}
          avoidCollisions={avoidCollisions ?? true}
          hideWhenDetached
          collisionPadding={collisionPadding}
          onKeyDown={handleKeyDown}
        >
          {/* A popup opened from a Field row is not that row: its own controls keep their usual shape and menus */}
          <FieldRowContext.Provider value={false}>
            <FieldColumnsContext.Provider value={false}>{children}</FieldColumnsContext.Provider>
          </FieldRowContext.Provider>
        </Popper.Content>
      </DismissableLayer>
    </FocusScope>
  )
}

const ContentHoverable = (props: PopoverContentProps) => {
  const { open, setOpen, triggerRef, contentRef, isPointerInTransitRef, hoverOpenFocusedWithTab } =
    usePopoverContext()
  const [pointerGraceArea, setPointerGraceArea] = useState<Polygon | null>(null)

  const handleRemoveGraceArea = useCallback(() => {
    setPointerGraceArea(null)
    isPointerInTransitRef.current = false
  }, [isPointerInTransitRef])

  const handleCreateGraceArea = useCallback(
    (event: PointerEvent, hoverTarget: HTMLElement) => {
      if (!isHoverPointer(event)) return
      const graceArea = createPointerIntentArea(event, hoverTarget)
      setPointerGraceArea(graceArea)
      isPointerInTransitRef.current = true
    },
    [isPointerInTransitRef],
  )

  useEffect(() => {
    return () => handleRemoveGraceArea()
  }, [handleRemoveGraceArea])

  useEffect(() => {
    const trigger = triggerRef.current
    const content = contentRef.current

    if (!trigger || !content) {
      return
    }

    const handleTriggerLeave = (event: PointerEvent) => handleCreateGraceArea(event, content)
    const handleContentLeave = (event: PointerEvent) => handleCreateGraceArea(event, trigger)

    trigger.addEventListener("pointerleave", handleTriggerLeave)
    content.addEventListener("pointerleave", handleContentLeave)
    return () => {
      trigger.removeEventListener("pointerleave", handleTriggerLeave)
      content.removeEventListener("pointerleave", handleContentLeave)
    }
  }, [contentRef, triggerRef, handleCreateGraceArea, handleRemoveGraceArea])

  useEffect(() => {
    if (!pointerGraceArea) {
      return
    }

    const handleTrackPointerGrace = (event: PointerEvent) => {
      if (!isHoverPointer(event)) return
      const trigger = triggerRef.current
      const content = contentRef.current
      const target = event.target as HTMLElement
      const pointerPosition = { x: event.clientX, y: event.clientY }
      const hasEnteredTarget = trigger?.contains(target) || content?.contains(target)
      const isPointerOutsideGraceArea = !isPointInPolygon(pointerPosition, pointerGraceArea)
      // Stop considering grace areas when the pointer runs into other control triggers
      const targetHasPopup = target.hasAttribute("aria-haspopup")

      if (hasEnteredTarget) {
        handleRemoveGraceArea()
      } else if (isPointerOutsideGraceArea || targetHasPopup) {
        handleRemoveGraceArea()
        setOpen(false)
      }
    }
    document.addEventListener("pointermove", handleTrackPointerGrace)
    return () => document.removeEventListener("pointermove", handleTrackPointerGrace)
  }, [pointerGraceArea, setOpen, handleRemoveGraceArea, triggerRef, contentRef])

  // Hoverable doesn't place focus in the popover by default
  // If this is open, and tab is pressed, and focusableElements() has an element, prevent default behavior and focus it
  // Then set a flag (probably in context) that tells us to restore focus to the trigger on close (e.g., not execute the onCloseAutoFocus handler)

  useEffect(() => {
    // Closed and still leaving: Tab belongs to the page again
    if (!open) {
      return
    }

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (!contentRef.current) {
        return
      }

      // Only assume forward tab is attempting to move into the popup
      if (evt.key === "Tab" && !evt.shiftKey) {
        const [firstFocusable] = focusableElements(contentRef.current)
        if (firstFocusable) {
          evt.preventDefault()
          firstFocusable.focus()
          hoverOpenFocusedWithTab.current = true
          document.removeEventListener("keydown", handleKeyDown)
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, contentRef, hoverOpenFocusedWithTab])

  return <ContentImpl {...props} />
}

const Content = (props: PopoverContentProps) => {
  const { open, showOnHover, setOpen } = usePopoverContext()

  useEscCloseStack(open, () => {
    setOpen(false)
  })

  return (
    <Portal.Root asChild>
      <TransitionGroup {...overlayTiming} className={s.Transition} overlay>
        {open &&
          (showOnHover ? (
            <ContentHoverable key="popover-hover" {...props} />
          ) : (
            <ContentImpl key="popover" {...props} />
          ))}
      </TransitionGroup>
    </Portal.Root>
  )
}

Popover.Trigger = Trigger
Popover.Content = Content
