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
import { usePhoneSubmenu } from "../../hooks/usePhoneSubmenu"
import { focusPhoneSubmenuEntry } from "../../lib/menuSubmenuPlacement"
import { captureInitialPhoneSubmenuFocus, completeInitialPhoneSubmenuFocus, delegateInitialPhoneSubmenuFocus } from "../../lib/menuInitialFocus"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { useLatestValue } from "../../hooks/useLatestValue"
import { keepMovedFocus, preventDefaultHandler, toCssVariables } from "../../lib/helpers"
import { Button } from "../Button"
import { Check, ChevronDown, ChevronRight } from "../Icon"
import { useLinkComponent } from "../PlexUIProvider/internal"
import { TransitionGroup } from "../Transition"
import { createExitGuard, overlayTiming, overlayTimingQuick } from "../Transition/shared"
import { isHoverPointer } from "../../lib/inputMode"
import s from "@plexui/styles/components/Menu/Menu.module.css"

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
}

const MenuContext = createContext<MenuContextValue | null>(null)

const useMenuContext = () => {
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
    }),
    [isOpen, handleOpenChange, prepareFocusRestore],
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
  const content =
    description === undefined ? (
      children
    ) : (
      <div className={s.ItemLeading}>
        <div>{children}</div>
        <div className={s.ItemDescription}>{description}</div>
      </div>
    )

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
   * The preferred side of the trigger to render against when open. Will be reversed when collisions occur.
   * @default bottom
   */
  side?: DropdownMenu.DropdownMenuContentProps["side"]
  /**
   * The distance in pixels from the trigger.
   * @default 5
   */
  sideOffset?: DropdownMenu.DropdownMenuContentProps["sideOffset"]
  /**
   * The preferred alignment against the trigger. May change when collisions occur.
   * @default center
   */
  align?: DropdownMenu.DropdownMenuContentProps["align"]
  /**
   * An offset in pixels from the "start" or "end" alignment options.
   * @default 0
   */
  alignOffset?: DropdownMenu.DropdownMenuContentProps["alignOffset"]
  /**
   * Defines the `width` property of the content
   * @default auto
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
  sideOffset = 5,
  align,
  alignOffset,
  width,
  minWidth,
  maxHeight,
  pill = false,
  layout = "vertical",
  size,
  onCloseAutoFocus,
}: MenuContentProps) => {
  const { open, prepareFocusRestore } = useMenuContext()
  const contentRef = useRef<HTMLDivElement>(null)
  const floatingBoundary = useFloatingBoundary(open, { bottom: 30, top: 30, left: 12, right: 12 })
  const [exitGuard] = useState(createExitGuard)
  const isHorizontal = layout === "horizontal"

  return (
    <DropdownMenu.Portal forceMount>
      <TransitionGroup className={s.Menu} {...overlayTiming} {...exitGuard.transition} overlay>
        {open && (
          <RootMenuContent
            key="dropdown"
            ref={contentRef}
            onOpenAutoFocus={(event) => delegateInitialPhoneSubmenuFocus(event, contentRef.current)}
            forceMount
            className={s.MenuList}
            data-pill={pill ? "" : undefined}
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset ?? (align === "center" ? 0 : -5)}
            avoidCollisions
            {...floatingBoundary}
            onEscapeKeyDown={preventDefaultHandler}
            onInteractOutside={exitGuard.onInteractOutside}
            onCloseAutoFocus={(event) => {
              onCloseAutoFocus?.(event)
              keepMovedFocus(event)
              if (event.defaultPrevented) return
              const content = event.target
              if (!(content instanceof HTMLElement)) return
              const trigger = content.ownerDocument.getElementById(content.getAttribute("aria-labelledby") ?? "")
              if (trigger) prepareFocusRestore(trigger)
            }}
            data-layout={isHorizontal ? "horizontal" : undefined}
            data-size={isHorizontal && size ? size : undefined}
            style={toCssVariables({
              "menu-width": width,
              "menu-min-width": isHorizontal ? "auto" : minWidth,
              "menu-max-height": maxHeight,
            })}
          >
            {children}
          </RootMenuContent>
        )}
      </TransitionGroup>
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
  const { open, setOpen } = useMenuContext()
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
      if (!open) event.preventDefault()
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
      <TriggerElement activation={activation}>{children}</TriggerElement>
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
  disabled,
}: {
  className?: string
  children: ReactNode
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
        {children}
        <ChevronRight width="16" height="16" className={s.SubTriggerIcon} />
      </div>
    </DropdownMenu.SubTrigger>
  )
}

type SubContentProps = {
  children: ReactNode
  sideOffset?: DropdownMenu.DropdownMenuSubContentProps["sideOffset"]
  alignOffset?: DropdownMenu.DropdownMenuSubContentProps["alignOffset"]
  width?: number | "auto"
  minWidth?: number | "auto"
  maxHeight?: number
  pill?: boolean
}

const SubContent = ({
  children,
  sideOffset = 4,
  alignOffset = -6,
  width = "auto",
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
  const floatingBoundary = useFloatingBoundary(open, { bottom: 30, top: 30, left: 12, right: 12 })
  const phone = usePhoneSubmenu(open, triggerRef, content, floatingBoundary)
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
    if (!latestOpen.current) return
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  return (
    <DropdownMenu.Portal forceMount>
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
              "menu-phone-width": phone.mobile && typeof width === "number" ? width : undefined,
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
            {children}
          </DropdownMenu.SubContent>
        )}
      </TransitionGroup>
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
}

const RadioGroup = <T extends string>({
  children,
  value,
  onChange,
  indicatorPosition = "end",
  ...props
}: MenuRadioGroupProps<T>) => (
  <DropdownMenu.RadioGroup
    {...props}
    value={value}
    onValueChange={(v: string) => onChange(v as T)}
    data-indicator-position={indicatorPosition}
  >
    {children}
  </DropdownMenu.RadioGroup>
)

export type MenuRadioItemProps<T extends string> = {
  value: T
  /** Class applied to the radio item */
  className?: string
  children: ReactNode
  /** Callback triggered when the radio item is pressed */
  onSelect?: DropdownMenu.DropdownMenuItemProps["onSelect"]
  /** Disables the radio item */
  disabled?: boolean
}

const preventTouchHover = (event: React.PointerEvent) => {
  if (!isHoverPointer(event)) event.preventDefault()
}

const RadioItem = <T extends string>({ className, children, ...props }: MenuRadioItemProps<T>) => (
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
      {children}
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
