"use client"

import { DropdownMenu, Slot } from "radix-ui"
import React, {
  type ComponentProps,
  type ComponentType,
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import clsx from "clsx"
import { useFloatingBoundary } from "../../hooks/useFloatingBoundary"
import { useStableCallback } from "../../hooks/useStableCallback"
import { usePhoneSubmenu } from "../../hooks/usePhoneSubmenu"
import { focusPhoneSubmenuEntry } from "../../lib/menuSubmenuPlacement"
import { captureInitialPhoneSubmenuFocus, completeInitialPhoneSubmenuFocus, delegateInitialPhoneSubmenuFocus } from "../../lib/menuInitialFocus"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { useLatestValue } from "../../hooks/useLatestValue"
import { keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers"
import { ignoreReleaseOverTrigger, markCoveredMenuTrigger, observeMenuTriggerCover, type MenuTriggerCover } from "../../lib/menuTriggerCover"
import { Button } from "../Button"
import { Check, ChevronDown, ChevronRight } from "../Icon"
import { PhoneLayoutContext } from "../PhoneLayout/PhoneLayout"
import { useLinkComponent } from "../PlexUIProvider/internal"
import { TransitionGroup } from "../Transition"
import { createExitGuard, overlayTiming, overlayTimingQuick } from "../Transition/shared"
import { isHoverPointer } from "../../lib/inputMode"
import s from "@plexui/styles/components/Menu/Menu.module.css"

// Inside a PhoneLayout a menu opens in its box, laid out as on a phone and kept within it; in a Dialog laid out as on a
// phone outside one it opens over the window, in a phone scope of its own (plan 176)
const COLLISION_PADDING = { bottom: 30, top: 30, left: 12, right: 12 }
export const useMenuPhoneLayout = (open: boolean) => {
  const floatingBoundary = useFloatingBoundary(open, COLLISION_PADDING)
  const phoneLayout = useContext(PhoneLayoutContext)
  const container = phoneLayout?.container ?? null
  // The footer of a Page or Dialog in the box keeps the menu clear of it; one around the box does not hold it, and the
  // box clips what passes its edges
  const footerInBox = !!container && !!floatingBoundary.collisionBoundary && container.contains(floatingBoundary.collisionBoundary)
  const boundary = container && !footerInBox ? { collisionBoundary: container, collisionPadding: COLLISION_PADDING } : floatingBoundary
  return { container: container ?? undefined, scoped: phoneLayout !== null && !container, boundary }
}

const PhoneScope = ({ enabled, children }: { enabled: boolean; children: ReactNode }) =>
  enabled ? <div className={s.PhoneScope} data-plex-layout="phone">{children}</div> : children

// A delayed programmatic restore may inherit focus-visible from the menu.
// Keep the focus, but suppress the Button ring only for this pointer restore.
const markPointerFocusRestore = (trigger: HTMLElement) => {
  const doc = trigger.ownerDocument
  let active = true
  let restoring = true
  const clear = () => {
    active = false
    trigger.removeAttribute("data-menu-pointer-focus")
    trigger.removeEventListener("blur", clear)
    trigger.removeEventListener("focus", onFocus)
    doc.removeEventListener("keydown", clear, true)
  }
  const onFocus = () => {
    if (!restoring) clear()
  }
  trigger.setAttribute("data-menu-pointer-focus", "")
  trigger.addEventListener("blur", clear)
  trigger.addEventListener("focus", onFocus)
  doc.addEventListener("keydown", clear, true)
  queueMicrotask(() => {
    if (!active) return
    restoring = false
    // Radix can skip its restore after an outside interaction.
    if (doc.activeElement !== trigger) clear()
  })
  return clear
}

type MenuContextValue = {
  open: boolean
  setOpen: (next: boolean) => void
  prepareFocusRestore: (trigger: HTMLElement) => void
  isUsingKeyboard: React.RefObject<boolean>
  /** The element of `Menu.Trigger`, which a phone menu covers */
  triggerElement: HTMLElement | null
  setTriggerElement: (element: HTMLElement | null) => void
  /** Whether the menu is modal, which decides whether an outside interaction skips the focus return */
  modal: boolean
}

const MenuContext = createContext<MenuContextValue | null>(null)

/** @internal The open state of the enclosing Menu, for ContextMenu. Not exported from the package. */
export const useMenuContext = () => {
  const context = useContext(MenuContext)

  if (!context) {
    throw new Error("Menu components must be wrapped in <Menu />")
  }

  return context
}

export type MenuProps = {
  children: React.ReactNode
  /** Force the menu to remain open or closed */
  forceOpen?: boolean
  /** Callback triggered when the modal is opened */
  onOpen?: () => void
  /** Callback triggered when the modal is closed */
  onClose?: () => void
  /**
   * When set to `true`, interaction with outside elements will be disabled and only menu content will be visible to screen readers.
   * @default false
   */
  modal?: boolean
}

export const Menu = ({ children, forceOpen, onOpen, onClose, modal = false }: MenuProps) => {
  const [open, setOpen] = useState<boolean>(false)
  const isOpen = forceOpen ?? open
  const isUsingKeyboard = useRef(false)
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null)
  const clearPointerFocus = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    const onKeyDown = () => {
      isUsingKeyboard.current = true
    }
    const onPointer = () => {
      isUsingKeyboard.current = false
    }
    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("pointerdown", onPointer, true)
    document.addEventListener("pointermove", onPointer, true)
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("pointerdown", onPointer, true)
      document.removeEventListener("pointermove", onPointer, true)
      clearPointerFocus.current?.()
    }
  }, [])

  const prepareFocusRestore = useCallback((trigger: HTMLElement) => {
    clearPointerFocus.current?.()
    clearPointerFocus.current = undefined
    if (!isUsingKeyboard.current && trigger.isConnected) {
      clearPointerFocus.current = markPointerFocusRestore(trigger)
    }
  }, [])

  const latestOnOpen = useLatestValue(onOpen)
  const latestOnClose = useLatestValue(onClose)

  const handleOpenChange = useCallback(
    (nextState: boolean) => {
      setOpen(nextState)
      if (nextState) {
        latestOnOpen.current?.()
      } else {
        latestOnClose.current?.()
      }
    },
    [latestOnOpen, latestOnClose],
  )

  useEscCloseStack(open, () => {
    handleOpenChange(false)
  })

  const store = useMemo<MenuContextValue>(
    () => ({
      open: isOpen,
      setOpen: handleOpenChange,
      prepareFocusRestore,
      isUsingKeyboard,
      triggerElement,
      setTriggerElement,
      modal,
    }),
    [isOpen, handleOpenChange, prepareFocusRestore, triggerElement, modal],
  )

  return (
    <MenuContext.Provider value={store}>
      <DropdownMenu.Root open={isOpen} onOpenChange={handleOpenChange} modal={modal}>
        {children}
      </DropdownMenu.Root>
    </MenuContext.Provider>
  )
}

export type MenuItemProps = {
  className?: string
  children: React.ReactNode
  /**
   * Second line under the item's label: what this action does, or which
   * value it carries. The label goes semibold on its own, the same way a
   * Select option with a description does — same pattern, same anatomy.
   */
  description?: ReactNode
  /** Callback triggered when the item is pressed */
  onSelect?: DropdownMenu.DropdownMenuItemProps["onSelect"]
  /** Callback triggered when the item is clicked */
  onClick?: DropdownMenu.DropdownMenuItemProps["onClick"]
  /** Disables the menu item */
  disabled?: boolean
  /** Marks a destructive action (delete, remove, leave): the item is drawn in the danger color */
  danger?: boolean
}

// An icon is a component, an svg or an img; text and text elements (strong, kbd) belong to the label.
const isLeadingIcon = (part: ReactNode) =>
  React.isValidElement(part) && (typeof part.type !== "string" || part.type === "svg" || part.type === "img")

/**
 * A described row: the label over its description. Icons that lead the label stay beside the two lines, centred on
 * both, as iOS draws Sort By with its order under it (Reminders); a row of icons alone stacks whole.
 */
// A row's own children, fragments opened up as Vue's slots are, keyed again by place
const flattenRow = (children: ReactNode): ReactNode[] =>
  React.Children.toArray(children).flatMap((part) =>
    React.isValidElement<{ children?: ReactNode }>(part) && part.type === React.Fragment ? flattenRow(part.props.children) : [part])

const describedRow = (children: ReactNode, description: ReactNode) => {
  const parts = flattenRow(children).map((part, index) => (React.isValidElement(part) ? React.cloneElement(part, { key: index }) : part))
  const label = parts.findIndex((part) => !isLeadingIcon(part))
  const lead = label > 0 ? parts.slice(0, label) : []
  return (
    <>
      {lead}
      <div className={s.ItemLeading}>
        <div>{lead.length > 0 ? parts.slice(label) : children}</div>
        {/* Not part of the label a phone submenu heads itself with */}
        <div className={s.ItemDescription} data-menu-description="">{description}</div>
      </div>
    </>
  )
}

const Item = ({ className, children, description, disabled, danger, onSelect, onClick }: MenuItemProps) => {
  const { open } = useMenuContext()

  // This handler patches over focus races with core Radix primitives
  // https://github.com/radix-ui/primitives/blob/main/packages/react/menu/src/Menu.tsx#L712-L734
  const handlePreventAfterClose = (evt: React.PointerEvent<HTMLDivElement>) => {
    // Prevent default behavior when we're always known to be closing
    if (!open || !isHoverPointer(evt)) {
      evt.preventDefault()
    }
  }

  // A described item stacks its two lines; without a description the item
  // keeps the plain flex row that icons and ItemActions rely on.
  const content = rendersContent(description) ? describedRow(children, description) : children

  // Custom click handlers: either callback makes the item interactive
  if (onSelect || onClick) {
    return (
      <DropdownMenu.Item
        className={clsx(s.MenuItem, className)}
        onSelect={onSelect}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        data-danger={danger ? "" : undefined}
        onPointerMove={handlePreventAfterClose}
        onPointerLeave={handlePreventAfterClose}
      >
        <div className={s.PressableInner}>{content}</div>
      </DropdownMenu.Item>
    )
  }

  // Read-only content - will not appear interactive.
  return <div className={clsx(s.MenuItemContent, className)}>{content}</div>
}

const ItemActions = ({ className, children }: { className?: string; children: ReactNode }) => {
  return <div className={clsx(s.ItemActions, className)}>{children}</div>
}

const ItemAction = ({
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode
  onClick: (evt: MouseEvent) => void
  /** Accessible name; the action is an icon-only button */
  "aria-label"?: string
}) => {
  const { setOpen } = useMenuContext()

  return (
    <Button
      className="rounded-sm"
      color="secondary"
      size="xs"
      uniform
      iconSize="sm"
      variant="ghost"
      aria-label={ariaLabel}
      onClick={(evt) => {
        evt.stopPropagation()
        setOpen(false)
        onClick(evt)
      }}
    >
      {children}
    </Button>
  )
}

type MenuLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> & {
  /** Content rendered inside the Link */
  children: React.ReactNode
  /** Disables the menu item */
  disabled?: boolean
  /** Marks a destructive destination: the item is drawn in the danger color */
  danger?: boolean
}

type MenuLink = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ComponentType<any> | "a" = PlexUI.LinkComponent,
>(
  props: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
    MenuLinkProps & {
      /**
       * Override the default component used for the link. This is useful for
       * using a routing library, or SSR rendering.
       * purposes.
       *
       * @default 'a'
       */
      as?: T
    } & ComponentProps<T>,
) => ReactNode

const Link = ((
  props: MenuLinkProps & { href?: string; to?: string; as?: PlexUI.LinkComponent },
) => {
  const { className, children, href, to, disabled, danger, as: OverrideComponent, ...restProps } = props
  const { open } = useMenuContext()

  const propPath = href || to
  // When a path is not provided, default to an anchor
  const isExternal = propPath ? /^https?:\/\//.test(propPath) : true
  const DefaultComponent = useLinkComponent()
  const Component = OverrideComponent || (isExternal ? "a" : DefaultComponent)

  // This handler patches over focus races with core Radix primitives
  // https://github.com/radix-ui/primitives/blob/main/packages/react/menu/src/Menu.tsx#L712-L734
  const handlePreventAfterClose = (evt: React.PointerEvent<HTMLDivElement>) => {
    // Prevent default behavior when we're always known to be closing
    if (!open || !isHoverPointer(evt)) {
      evt.preventDefault()
    }
  }

  const linkProps = isExternal
    ? { target: "_blank", rel: "noopener noreferrer", href: href ?? to }
    : { href, to }

  return (
    <DropdownMenu.Item
      asChild
      className={clsx(s.MenuItem, className)}
      disabled={disabled}
      data-danger={danger ? "" : undefined}
      onPointerMove={handlePreventAfterClose}
      onPointerLeave={handlePreventAfterClose}
    >
      <Component
        {...linkProps}
        {...restProps}
        onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
          restProps.onClick?.(event)
          // Radix skips selecting a disabled item, not the link's navigation
          if (disabled) event.preventDefault()
        }}
      >
        <span className={s.PressableInner}>{children}</span>
      </Component>
    </DropdownMenu.Item>
  )
}) as MenuLink

const Separator = ({ className }: { className?: string }) => {
  return <DropdownMenu.Separator className={clsx(s.Separator, className)} role="separator" />
}


const Label = ({ className, children }: { className?: string; children: ReactNode }) => {
  return (
    <DropdownMenu.Label className={clsx(s.MenuLabel, className)}>
      {children}
    </DropdownMenu.Label>
  )
}

const Group = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => {
  return <DropdownMenu.Group className={className}>{children}</DropdownMenu.Group>
}

export type MenuContentProps = {
  children: React.ReactNode
  /**
   * The preferred side of the trigger to render against when open. Will be reversed when collisions occur. Without it
   * a menu on a phone opens toward the larger part of the screen: upward from a trigger in the lower half.
   * @default bottom
   */
  side?: DropdownMenu.DropdownMenuContentProps["side"]
  /**
   * The distance in pixels from the trigger. Without it a menu on a phone covers its trigger, as iOS menus grow out
   * of the control that opens them.
   * @default 5
   */
  sideOffset?: DropdownMenu.DropdownMenuContentProps["sideOffset"]
  /**
   * The preferred alignment against the trigger. May change when collisions occur.
   * @default center
   */
  align?: DropdownMenu.DropdownMenuContentProps["align"]
  /**
   * An offset in pixels from the "start" or "end" alignment options. Without it a menu on a phone that covers its
   * trigger keeps the trigger's edge.
   * @default -5 with "start" or "end", 0 with "center"
   */
  alignOffset?: DropdownMenu.DropdownMenuContentProps["alignOffset"]
  /**
   * Defines the `width` property of the content. Without it the menu fits its content, or with `touch.css` on a phone
   * is the 250px panel of an iOS menu; `"auto"` fits its content there too.
   */
  width?: number | "auto"
  /**
   * Defines the `min-width` property of the content, in pixels.
   * @default 300
   */
  minWidth?: number | "auto"
  /**
   * Defines the `max-width` property of the content, in pixels.
   */
  maxHeight?: number
  /**
   * Rounder list with fully rounded rows, for menus that sit beside pill controls.
   * @default false
   */
  pill?: boolean
  /**
   * Layout direction of menu items.
   * Use `"horizontal"` for icon-based toolbars (iOS-style).
   * @default "vertical"
   */
  layout?: "vertical" | "horizontal"
  /**
   * Size of horizontal menu items. Controls icon size and padding.
   * Only applies when `layout="horizontal"`.
   * @default "md"
   */
  size?: "sm" | "md" | "lg"
  /**
   * Event handler called when auto-focus tries to return to the trigger
   * after the menu closes. Call `event.preventDefault()` to prevent the
   * trigger from regaining focus (and its focus-visible ring).
   */
  onCloseAutoFocus?: DropdownMenu.DropdownMenuContentProps["onCloseAutoFocus"]
  /**
   * Event handler called when focus moves into the menu as it opens. Call
   * `event.preventDefault()` to leave focus where it is, as for a menu that
   * stands open when its screen appears.
   */
  onOpenAutoFocus?: (event: Event) => void
}

/**
 * Radix forwards `onOpenAutoFocus` from DropdownMenu.Content to its internal
 * MenuContentImpl at runtime, but the public DropdownMenu types omit that
 * private prop. Phone submenu initial focus needs it to replace the
 * content-level mount focus, so the extra prop is declared here explicitly.
 */
const RootMenuContent = DropdownMenu.Content as React.ForwardRefExoticComponent<
  DropdownMenu.DropdownMenuContentProps & {
    onOpenAutoFocus?: (event: Event) => void
  } & React.RefAttributes<HTMLDivElement>
>

const Content = ({
  children,
  side,
  sideOffset,
  align,
  alignOffset,
  width,
  minWidth,
  maxHeight,
  pill = false,
  layout = "vertical",
  size,
  onCloseAutoFocus,
  onOpenAutoFocus,
}: MenuContentProps) => {
  const { open, prepareFocusRestore, triggerElement, modal } = useMenuContext()
  const contentRef = useRef<HTMLDivElement>(null)
  // The panel's node as state too: it mounts after the trigger's cover is known, and again when the phone layout moves
  // the portal, so the effect that hides the covered trigger reruns with the node that is on screen
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null)
  const setContent = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node
    setContentElement(node)
  }, [])
  const interactedOutside = useRef(false)
  const phoneLayout = useMenuPhoneLayout(open)
  const floatingBoundary = phoneLayout.boundary
  // On a phone a menu without its own offset grows out of its trigger, covers it and opens toward the larger part of
  // the screen (menuTriggerCover.ts); one that opens to a side keeps its gap
  const coversTrigger = open && sideOffset === undefined && side !== "left" && side !== "right"
  const [triggerCover, setTriggerCover] = useState<MenuTriggerCover | null>(null)
  useLayoutEffect(() => {
    if (!coversTrigger || !triggerElement) return
    return observeMenuTriggerCover(triggerElement, setTriggerCover)
  }, [coversTrigger, triggerElement])
  const cover = coversTrigger ? triggerCover : null
  // A trigger the panel covers whole is hidden while it is open, as iOS turns a bar button into its menu
  useLayoutEffect(() => {
    if (!cover || !triggerElement || !contentElement) return
    return markCoveredMenuTrigger(triggerElement, contentElement)
  }, [cover, triggerElement, contentElement])
  const [exitGuard] = useState(createExitGuard)
  const isHorizontal = layout === "horizontal"
  // The content of a closing menu is frozen for its exit, so this reads the owner's latest handler.
  const handleCloseAutoFocus = useStableCallback((event: Event) => {
    onCloseAutoFocus?.(event)
    keepMovedFocus(event)
    const skipFocus = interactedOutside.current
    interactedOutside.current = false
    if (event.defaultPrevented) return
    // A focus scope that unmounts while the menu stays open (React StrictMode replays the effects of a menu that mounts
    // open) is no close: focus stays, and the menu is not dismissed by focus moving out to its trigger
    if (open) {
      event.preventDefault()
      return
    }
    const content = event.target
    if (!(content instanceof HTMLElement)) return
    const trigger = content.ownerDocument.getElementById(content.getAttribute("aria-labelledby") ?? "")
    if (!trigger) return
    prepareFocusRestore(trigger)
    // Focus returns to the trigger as Radix returns it, but without scrolling: a plain focus() scrolls every scrolling
    // ancestor to the trigger, the page around a frame that holds the menu too
    event.preventDefault()
    if (!skipFocus) trigger.focus({ preventScroll: true })
  })
  // Radix's own record of an outside interaction, which its focus return (replaced above) reads: any one when the menu
  // is not modal, a right click when it is
  const handleInteractOutside = (event: Parameters<NonNullable<DropdownMenu.DropdownMenuContentProps["onInteractOutside"]>>[0]) => {
    exitGuard.onInteractOutside(event)
    // A cancelled one leaves the menu open and Radix does not record it (Vue returns early the same way)
    if (event.defaultPrevented) return
    const original = event.detail.originalEvent as PointerEvent
    const isRightClick = original.button === 2 || (original.button === 0 && original.ctrlKey === true)
    if (!modal || isRightClick) interactedOutside.current = true
  }

  return (
    <DropdownMenu.Portal forceMount container={phoneLayout.container}>
      <PhoneScope enabled={phoneLayout.scoped}>
      <TransitionGroup className={s.Menu} {...overlayTiming} {...exitGuard.transition} overlay>
        {open && (
          <RootMenuContent
            key="dropdown"
            ref={setContent}
            onOpenAutoFocus={(event) => {
              onOpenAutoFocus?.(event)
              delegateInitialPhoneSubmenuFocus(event, contentRef.current)
            }}
            forceMount
            className={s.MenuList}
            data-pill={pill ? "" : undefined}
            side={side ?? cover?.side}
            sideOffset={cover ? cover.sideOffset : sideOffset ?? 5}
            align={align}
            alignOffset={alignOffset ?? (cover || align === "center" ? 0 : -5)}
            avoidCollisions
            {...floatingBoundary}
            onEscapeKeyDown={preventDefaultHandler}
            onInteractOutside={handleInteractOutside}
            onCloseAutoFocus={handleCloseAutoFocus}
            data-layout={isHorizontal ? "horizontal" : undefined}
            data-size={isHorizontal && size ? size : undefined}
            style={toCssVariables({
              "menu-width": width,
              "menu-min-width": isHorizontal ? "auto" : minWidth,
              "menu-max-height": maxHeight,
            })}
          >
            {/* The items of a vertical menu lie in the panel itself; a phone menu scrolls them and fades them at its edges */}
            {isHorizontal ? children : <div className={s.Items}>{children}</div>}
          </RootMenuContent>
        )}
      </TransitionGroup>
      </PhoneScope>
    </DropdownMenu.Portal>
  )
}

type TriggerActivation = Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "onPointerDown" | "onPointerCancel" | "onClick" | "onKeyDown">

// Keep Radix's public trigger registration, attributes and ref while owning
// activation. Its pointerdown-only behavior cannot commit touch/AT clicks.
const TriggerElement = ({ activation, ...props }: ComponentProps<typeof Slot.Root> & { activation: TriggerActivation }) => {
  delete props.onPointerDown
  delete props.onPointerCancel
  delete props.onClick
  delete props.onKeyDown
  return <Slot.Root {...props} {...activation} />
}

const Trigger = ({
  children,
  disabled,
  onPointerDown,
  onPointerCancel,
  onClick,
  onKeyDown,
  ...restProps
}: DropdownMenu.DropdownMenuTriggerProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  const { open, setOpen, setTriggerElement } = useMenuContext()
  const handledClick = useRef(false)
  const activation: TriggerActivation = {
    onPointerDown: (event) => {
      handledClick.current = false
      onPointerDown?.(event)
      if (event.defaultPrevented) {
        handledClick.current = true
        return
      }
      if (disabled || event.button !== 0 || event.ctrlKey) return
      if (event.pointerType === "pen" || !isHoverPointer(event)) return
      handledClick.current = true
      setOpen(!open)
      if (open) return
      event.preventDefault()
      ignoreReleaseOverTrigger(event.currentTarget as HTMLElement, event.pointerId)
    },
    onPointerCancel: (event) => {
      handledClick.current = false
      onPointerCancel?.(event)
    },
    onClick: (event) => {
      const handled = handledClick.current
      handledClick.current = false
      onClick?.(event)
      if (event.defaultPrevented || disabled || event.button !== 0 || event.ctrlKey) return
      if (handled && event.detail !== 0) return
      setOpen(!open)
    },
    onKeyDown: (event) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || disabled || event.nativeEvent.isComposing || event.keyCode === 229) return
      if (["Enter", " "].includes(event.key)) setOpen(!open)
      if (event.key === "ArrowDown") setOpen(true)
      if (["Enter", " ", "ArrowDown"].includes(event.key)) event.preventDefault()
    },
  }
  return (
    <DropdownMenu.Trigger {...restProps} asChild disabled={disabled}>
      <TriggerElement ref={setTriggerElement} activation={activation}>{children}</TriggerElement>
    </DropdownMenu.Trigger>
  )
}

type SubmenuContextValue = {
  open: boolean
  setOpen: (next: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
  triggerDisabledRef: React.RefObject<boolean>
}

const SubmenuContext = createContext<SubmenuContextValue | null>(null)

const useSubmenuContext = () => {
  const context = useContext(SubmenuContext)

  if (!context) {
    throw new Error("Submenu components must be wrapped in <Sub />")
  }

  return context
}

export type SubmenuProps = {
  children: React.ReactNode
  /** Force the menu to remain open or closed */
  forceOpen?: boolean
  /** Callback triggered when the modal is opened */
  onOpen?: () => void
  /** Callback triggered when the modal is closed */
  onClose?: () => void
}

const Sub = ({ children, forceOpen, onOpen, onClose }: SubmenuProps) => {
  const [open, setOpen] = useState<boolean>(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const triggerDisabledRef = useRef(false)
  const isOpen = forceOpen ?? open

  const latestOnOpen = useLatestValue(onOpen)
  const latestOnClose = useLatestValue(onClose)

  const handleOpenChange = useCallback(
    (nextState: boolean) => {
      if (nextState && triggerDisabledRef.current) return
      setOpen(nextState)
      if (nextState) {
        latestOnOpen.current?.()
      } else {
        latestOnClose.current?.()
      }
    },
    [latestOnOpen, latestOnClose],
  )

  useEscCloseStack(open, () => {
    handleOpenChange(false)
    // Ensure trigger is focused
    triggerRef.current?.focus()
  })

  const store = useMemo<SubmenuContextValue>(
    () => ({
      open: isOpen,
      setOpen: handleOpenChange,
      triggerRef,
      triggerDisabledRef,
    }),
    [isOpen, handleOpenChange],
  )

  return (
    <SubmenuContext.Provider value={store}>
      <DropdownMenu.Sub open={isOpen} onOpenChange={handleOpenChange}>
        {children}
      </DropdownMenu.Sub>
    </SubmenuContext.Provider>
  )
}

const SubTrigger = ({
  className,
  children,
  description,
  disabled,
}: {
  className?: string
  children: ReactNode
  /**
   * Second line under the label: what the submenu has chosen, as Reminders shows "Manual" under Sort By. It stacks
   * as an Item's description does; icons before the label stay beside both lines.
   */
  description?: ReactNode
  disabled?: boolean
}) => {
  const { open } = useMenuContext()
  const { triggerRef, triggerDisabledRef } = useSubmenuContext()
  useLayoutEffect(() => {
    triggerDisabledRef.current = !!disabled
    return () => { triggerDisabledRef.current = false }
  }, [disabled, triggerDisabledRef])

  // This handler patches over focus races with core Radix primitives
  // https://github.com/radix-ui/primitives/blob/main/packages/react/menu/src/Menu.tsx#L712-L734
  const handlePreventAfterClose = (evt: React.PointerEvent<HTMLDivElement>) => {
    // Prevent default behavior when we know the outer menu is closing
    if (!open || !isHoverPointer(evt)) {
      evt.preventDefault()
    }
  }

  return (
    <DropdownMenu.SubTrigger
      ref={triggerRef}
      className={clsx(s.MenuItem, s.SubMenuItem, className)}
      disabled={disabled}
      onPointerMove={handlePreventAfterClose}
      onPointerLeave={handlePreventAfterClose}
    >
      <div className={s.PressableInner}>
        {rendersContent(description) ? describedRow(children, description) : children}
        <ChevronRight width="16" height="16" className={s.SubTriggerIcon} />
      </div>
    </DropdownMenu.SubTrigger>
  )
}

type SubContentProps = {
  children: ReactNode
  sideOffset?: DropdownMenu.DropdownMenuSubContentProps["sideOffset"]
  alignOffset?: DropdownMenu.DropdownMenuSubContentProps["alignOffset"]
  /**
   * The width of the submenu. Without it the submenu fits its content, or with `touch.css` on a phone is the 250px of a
   * menu; `"auto"` fits its content there too.
   */
  width?: number | "auto"
  minWidth?: number | "auto"
  maxHeight?: number
  pill?: boolean
}

const SubContent = ({
  children,
  sideOffset = 4,
  alignOffset = -6,
  width,
  minWidth,
  maxHeight,
  pill = false,
}: SubContentProps) => {
  const { open, setOpen, triggerRef } = useSubmenuContext()
  const { isUsingKeyboard } = useMenuContext()
  const latestOpen = useLatestValue(open)
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  const stopInitialFocusCapture = useRef<(() => void) | undefined>(undefined)
  const setContentRef = useCallback((element: HTMLDivElement | null) => {
    stopInitialFocusCapture.current?.()
    stopInitialFocusCapture.current = element ? captureInitialPhoneSubmenuFocus(element, () => isUsingKeyboard.current) : undefined
    setContent(element)
  }, [isUsingKeyboard])
  const [exitGuard] = useState(createExitGuard)
  const phoneLayout = useMenuPhoneLayout(open)
  const floatingBoundary = phoneLayout.boundary
  const requestCollapse = () => {
    if (!latestOpen.current) return
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }
  // A press on the parent it stands over collapses a phone submenu
  const phone = usePhoneSubmenu(open, triggerRef, content, floatingBoundary, requestCollapse)
  // Resize recovery is not a new keyboard entry after returning to the trigger.
  const phoneWasUnavailable = useRef(false)
  useLayoutEffect(() => {
    if (!open) { phoneWasUnavailable.current = false; return }
    if (phone.mobile && phone.unavailable) phoneWasUnavailable.current = true
    if (content && triggerRef.current && completeInitialPhoneSubmenuFocus(triggerRef.current, content)) return
    if (phone.mobile && phone.ready && !phoneWasUnavailable.current && content && isUsingKeyboard.current && content.ownerDocument.activeElement === triggerRef.current) {
      focusPhoneSubmenuEntry(content)
    }
  }, [open, phone, content, isUsingKeyboard, triggerRef])
  const collapse = (event: Event) => {
    event.preventDefault()
    requestCollapse()
  }

  return (
    <DropdownMenu.Portal forceMount container={phoneLayout.container}>
      <PhoneScope enabled={phoneLayout.scoped}>
      <TransitionGroup className={s.Menu} {...overlayTimingQuick} {...exitGuard.transition} overlay>
        {open && (
          <DropdownMenu.SubContent
            key="submenu"
            ref={setContentRef}
            className={s.MenuList}
            data-submenu=""
            data-pill={pill ? "" : undefined}
            sideOffset={phone.mobile ? phone.sideOffset : sideOffset}
            alignOffset={phone.mobile ? phone.alignOffset : alignOffset}
            avoidCollisions={!phone.mobile}
            {...floatingBoundary}
            onEscapeKeyDown={(event) => {
              event.preventDefault()
              // The primitive identifies the topmost submenu even when a
              // controlled-open child mounts in the same commit as its root.
              if (phone.mobile && latestOpen.current) {
                event.stopPropagation()
                collapse(event)
              }
            }}
            onInteractOutside={exitGuard.onInteractOutside}
            onFocusOutside={exitGuard.onInteractOutside}
            onFocus={(event) => {
              if (phone.mobile && event.target === event.currentTarget && isUsingKeyboard.current) {
                event.preventDefault()
                focusPhoneSubmenuEntry(event.currentTarget)
              }
            }}
            style={toCssVariables({
              "menu-width": width,
              "menu-min-width": minWidth ?? "auto",
              "menu-max-height": maxHeight,
              // A submenu of "auto" width fits its content on a phone too; without one it takes the menu's 250px (touch.css)
              "menu-phone-width": phone.mobile ? (width === "auto" ? "max-content" : width) : undefined,
              "menu-phone-min-width": phone.mobile ? (minWidth === "auto" ? 0 : minWidth) : undefined,
            })}
          >
            {phone.mobile && (
              <DropdownMenu.Item className={clsx(s.MenuItem, s.SubMenuItem)} data-submenu-collapse="" onSelect={collapse} onPointerMove={preventTouchHover} onPointerLeave={preventTouchHover}>
                <div className={s.PressableInner}>
                  {phone.label}
                  <ChevronDown width="16" height="16" className={s.SubTriggerIcon} />
                </div>
              </DropdownMenu.Item>
            )}
            {/* A separator under the row that heads it, as iOS 26 submenus (iOS-menu IMG_5677, IMG_5682) */}
            {phone.mobile && <DropdownMenu.Separator className={s.Separator} role="separator" />}
            {/* The items, which scroll under that heading on a phone; on a desktop they lie in the panel itself */}
            <div className={s.SubmenuItems}>{children}</div>
          </DropdownMenu.SubContent>
        )}
      </TransitionGroup>
      </PhoneScope>
    </DropdownMenu.Portal>
  )
}

export type MenuRadioGroupProps<T extends string> = {
  /** Controlled value */
  value: T
  /** Fired when selection changes */
  onChange: (value: T) => void
  children: ReactNode
  /**
   * The orientation of the indicator within the radio item.
   * @default end
   */
  indicatorPosition?: "start" | "end"
  /**
   * `horizontal` sets the options side by side, each an icon over its label and the chosen one on a fill: a mode at the
   * top of an iOS menu, above its list, as Photos orders by Added or by Captured. No radio indicator is drawn; choosing
   * one closes the menu, as any item does.
   * @default "vertical"
   */
  layout?: "vertical" | "horizontal"
}

const RadioGroup = <T extends string>({
  children,
  value,
  onChange,
  indicatorPosition = "end",
  layout = "vertical",
  ...props
}: MenuRadioGroupProps<T>) => {
  const horizontal = layout === "horizontal"
  return (
    <DropdownMenu.RadioGroup
      {...props}
      className={s.RadioGroup}
      value={value}
      onValueChange={(v: string) => onChange(v as T)}
      data-layout={horizontal ? "horizontal" : undefined}
      data-indicator-position={horizontal ? undefined : indicatorPosition}
    >
      {children}
    </DropdownMenu.RadioGroup>
  )
}

export type MenuRadioItemProps<T extends string> = {
  value: T
  /** Class applied to the radio item */
  className?: string
  children: ReactNode
  /**
   * Second line under the label, as iOS shows the order of the chosen sort (Files: "Newest to Oldest" under Date). It
   * stacks as an Item's description does.
   */
  description?: ReactNode
  /** Callback triggered when the radio item is pressed */
  onSelect?: DropdownMenu.DropdownMenuItemProps["onSelect"]
  /** Disables the radio item */
  disabled?: boolean
}

const preventTouchHover = (event: React.PointerEvent) => {
  if (!isHoverPointer(event)) event.preventDefault()
}

const RadioItem = <T extends string>({ className, children, description, ...props }: MenuRadioItemProps<T>) => (
  <DropdownMenu.RadioItem
    className={clsx(s.MenuItem, s.RadioItem, className)}
    {...props}
    onPointerMove={preventTouchHover}
    onPointerLeave={preventTouchHover}
  >
    <div className={s.PressableInner}>
      <div className={s.RadioIndicator}>
        <DropdownMenu.ItemIndicator className={s.RadioIndicatorActive}>
          <Check className={s.SelectionCheck} />
        </DropdownMenu.ItemIndicator>
      </div>
      {rendersContent(description) ? describedRow(children, description) : children}
    </div>
  </DropdownMenu.RadioItem>
)

export type MenuCheckboxItemProps = {
  /** Controlled checked state of the checkbox item */
  checked?: DropdownMenu.DropdownMenuCheckboxItemProps["checked"]
  /** Event handler called when the checked state changes */
  onCheckedChange?: DropdownMenu.DropdownMenuCheckboxItemProps["onCheckedChange"]
  /** Class applied to the checkbox item */
  className?: string
  children: ReactNode
  /** Callback triggered when the checkbox item is pressed */
  onSelect?: DropdownMenu.DropdownMenuItemProps["onSelect"]
  /** Disables the checkbox item */
  disabled?: boolean
  /**
   * The orientation of the indicator within the checkbox item.
   * @default end
   */
  indicatorPosition?: "start" | "end"
  /**
   * Visual treatment for the checkbox indicator.
   * @default solid
   */
  indicatorVariant?: "solid" | "ghost"
}
const CheckboxItem = ({
  className,
  children,
  indicatorPosition = "end",
  indicatorVariant = "solid",
  ...props
}: MenuCheckboxItemProps) => (
  <DropdownMenu.CheckboxItem
    className={clsx(s.MenuItem, s.CheckboxItem, className)}
    {...props}
    data-indicator-position={indicatorPosition}
    data-indicator-variant={indicatorVariant}
    onPointerMove={preventTouchHover}
    onPointerLeave={preventTouchHover}
  >
    <div className={s.PressableInner}>
      <div className={s.CheckboxIndicator}>
        <DropdownMenu.ItemIndicator>
          {indicatorVariant === "ghost" ? (
            <Check className={s.SelectionCheck} />
          ) : (
            <div className={s.CheckboxCircle}>
              <Check className={s.SelectionCheck} />
            </div>
          )}
        </DropdownMenu.ItemIndicator>
      </div>
      {children}
    </div>
  </DropdownMenu.CheckboxItem>
)

export type MenuHeaderProps = {
  className?: string
  /** The title: the name of what the menu acts on, such as a file or a board */
  children: ReactNode
  /** A line under the title: what it is, such as its kind and size ("Folder · 382 KB") */
  description?: ReactNode
  /**
   * A picture before the title: a thumbnail image, an icon or an Avatar, in a square of 32px (40px on a phone). An
   * image or icon fills the square; an image gets small rounded corners.
   */
  media?: ReactNode
  /** A round action at the end of the header: a `Menu.HeaderAction` */
  action?: ReactNode
}

/**
 * Names what the menu acts on, above its items: the picture, name and kind of a file in the iOS Files menu, with a
 * round action at its end. Not an item itself; its action is.
 */
// A node that renders nothing leaves no box, as an empty slot does in Vue
const rendersContent = (node: ReactNode) => node != null && node !== false && node !== ""

const Header = ({ className, children, description, media, action }: MenuHeaderProps) => (
  <div className={clsx(s.MenuHeader, className)} data-menu-header="">
    {rendersContent(media) && <div className={s.MenuHeaderMedia}>{media}</div>}
    <div className={s.MenuHeaderText}>
      <div className={s.MenuHeaderTitle}>{children}</div>
      {rendersContent(description) && <div className={s.MenuHeaderDescription}>{description}</div>}
    </div>
    {action}
  </div>
)

export type MenuHeaderActionProps = {
  /** The action's icon */
  children: ReactNode
  /** Accessible name; the action is an icon-only button */
  "aria-label": string
  /** Called when the action is pressed; the menu then closes. Call `event.preventDefault()` to keep it open. */
  onSelect?: (event: Event) => void
  /** Disables the action */
  disabled?: boolean
}

/** The round action at the end of a `Menu.Header`, such as Share: a menu item, reached with the arrow keys too. */
const HeaderAction = ({ children, "aria-label": ariaLabel, onSelect, disabled }: MenuHeaderActionProps) => (
  <DropdownMenu.Item
    asChild
    onSelect={onSelect}
    disabled={disabled}
    onPointerMove={preventTouchHover}
    onPointerLeave={preventTouchHover}
  >
    <Button
      className={s.MenuHeaderAction}
      color="secondary"
      variant="soft"
      size="md"
      uniform
      pill
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </Button>
  </DropdownMenu.Item>
)

Menu.Content = Content
Menu.Item = Item
Menu.ItemActions = ItemActions
Menu.ItemAction = ItemAction
Menu.Link = Link
Menu.Separator = Separator
Menu.Trigger = Trigger
Menu.Sub = Sub
Menu.SubTrigger = SubTrigger
Menu.SubContent = SubContent
Menu.CheckboxItem = CheckboxItem
Menu.RadioGroup = RadioGroup
Menu.RadioItem = RadioItem
Menu.Label = Label
Menu.Group = Group
Menu.Header = Header
Menu.HeaderAction = HeaderAction
