"use client"

import { Portal, Slot } from "radix-ui"
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import s from "@plexui/styles/components/ContextMenu/ContextMenu.module.css"
import { Menu, useMenuContext, type MenuContentProps } from "../Menu/Menu"
import { TransitionGroup } from "../Transition"
import { overlayTiming } from "../Transition/shared"
import {
  CONTEXT_MENU_LONG_PRESS,
  CONTEXT_MENU_LONG_PRESS_SLOP,
  contextMenuHoleMask,
  contextMenuPlacement,
  contextMenuPreview,
  type ContextMenuPresentation,
} from "./shared"

type ContextMenuContextValue = {
  presentation: ContextMenuPresentation | null
  setPresentation: (presentation: ContextMenuPresentation) => void
  regionRef: RefObject<HTMLElement | null>
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

function useContextMenuContext(part: string) {
  const context = useContext(ContextMenuContext)
  if (!context) throw new Error(`${part} must be used within ContextMenu`)
  return context
}

export type ContextMenuProps = {
  /** `ContextMenu.Trigger` and `ContextMenu.Content`. */
  children: ReactNode
  /** Called when the menu opens. */
  onOpen?: () => void
  /** Called when the menu closes. */
  onClose?: () => void
}

/**
 * A menu of actions for an element, after the iOS 26 kit Context Menu (507:25994): a secondary click opens it at
 * the pointer, a touch and hold opens it beside the element, which stays clear above a dimmed, blurred page, as
 * iOS lifts the preview. The items are the ones of `Menu`.
 */
function ContextMenuRoot({ children, onOpen, onClose }: ContextMenuProps) {
  const [presentation, setPresentation] = useState<ContextMenuPresentation | null>(null)
  const regionRef = useRef<HTMLElement | null>(null)
  const value = useMemo(() => ({ presentation, setPresentation, regionRef }), [presentation])
  return (
    <ContextMenuContext.Provider value={value}>
      <Menu onOpen={onOpen} onClose={onClose}>{children}</Menu>
    </ContextMenuContext.Provider>
  )
}
ContextMenuRoot.displayName = "ContextMenu"

export type ContextMenuTriggerProps = {
  /** The element the menu is for; it receives the handlers, so it keeps its own role and focus. */
  children: ReactElement
  /** When `true`, the element keeps the browser's own context menu. */
  disabled?: boolean
}

type Press = { id: number; x: number; y: number; timer: number; opened: boolean }

/**
 * Swallows the mouse events a browser sends after the touch and hold that opened the menu: the compatibility mousedown
 * would focus the element under the finger, and focus leaving the menu closes it (inside a Dialog or a Sheet, whose
 * content takes the press), and the click would activate the element.
 */
const suppressNextClick = (doc: Document) => {
  const hold = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }
  const swallow = (event: Event) => {
    hold(event)
    stop()
  }
  const stop = () => {
    doc.removeEventListener("mousedown", hold, true)
    doc.removeEventListener("click", swallow, true)
    doc.removeEventListener("pointerdown", stop, true)
    window.clearTimeout(timer)
  }
  // A browser that sends no click after the hold must not swallow the next tap: a new press ends the wait too.
  const timer = window.setTimeout(stop, 600)
  doc.addEventListener("mousedown", hold, true)
  doc.addEventListener("click", swallow, true)
  doc.addEventListener("pointerdown", stop, true)
}

function ContextMenuTrigger({ children, disabled = false }: ContextMenuTriggerProps) {
  const menu = useMenuContext()
  const { setPresentation, regionRef } = useContextMenuContext("ContextMenu.Trigger")
  const press = useRef<Press | null>(null)

  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }
  useEffect(() => () => {
    if (press.current) window.clearTimeout(press.current.timer)
  }, [])

  const open = (presentation: ContextMenuPresentation) => {
    setPresentation(presentation)
    menu.setOpen(true)
  }
  const openPreview = (element: HTMLElement, x: number) => {
    regionRef.current = element
    open(contextMenuPreview(element, x))
  }

  const handlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.defaultPrevented || disabled || event.pointerType !== "touch" || !event.isPrimary) return
      cancel()
      const element = event.currentTarget
      const x = event.clientX
      const timer = window.setTimeout(() => {
        const current = press.current
        if (!current || current.timer !== timer) return
        current.opened = true
        openPreview(element, x)
      }, CONTEXT_MENU_LONG_PRESS)
      press.current = { id: event.pointerId, x, y: event.clientY, timer, opened: false }
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const current = press.current
      if (!current || current.id !== event.pointerId || current.opened) return
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > CONTEXT_MENU_LONG_PRESS_SLOP) cancel()
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      const current = press.current
      if (!current || current.id !== event.pointerId) return
      if (current.opened) suppressNextClick(event.currentTarget.ownerDocument)
      cancel()
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      if (press.current?.id === event.pointerId) cancel()
    },
    onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
      if (event.defaultPrevented || disabled) return
      event.preventDefault()
      const element = event.currentTarget
      regionRef.current = element
      // A touch and hold that the browser reports as a context menu (Android) opens the preview once.
      const current = press.current
      if (current) {
        if (current.opened) return
        window.clearTimeout(current.timer)
        current.opened = true
        return openPreview(element, current.x)
      }
      if (menu.isUsingKeyboard.current) return open({ kind: "keyboard", rect: element.getBoundingClientRect() })
      open({ kind: "pointer", rect: { x: event.clientX, y: event.clientY, width: 0, height: 0 } })
    },
  }

  return <Slot.Root className={s.Trigger} {...handlers}>{children}</Slot.Root>
}
ContextMenuTrigger.displayName = "ContextMenu.Trigger"

/** The props of `Menu.Content` but its placement, which follows how the menu opened. */
export type ContextMenuContentProps = Omit<MenuContentProps, "side" | "sideOffset" | "align" | "alignOffset" | "onCloseAutoFocus" | "layout" | "size">

function ContextMenuContent(props: ContextMenuContentProps) {
  const { open } = useMenuContext()
  const { presentation, regionRef } = useContextMenuContext("ContextMenu.Content")
  const rect = presentation?.rect
  const placement = contextMenuPlacement(presentation)
  const preview = presentation?.kind === "preview" ? presentation : null
  const dimmed = open && preview !== null

  return (
    <>
      {/* The menu is placed against this invisible box: the pointer, or the element. */}
      <Portal.Root asChild>
        <Menu.Trigger>
          <span
            aria-hidden="true"
            tabIndex={-1}
            className={s.Anchor}
            style={rect ? { left: rect.x, top: rect.y, width: rect.width, height: rect.height } : undefined}
          />
        </Menu.Trigger>
      </Portal.Root>
      <Portal.Root asChild>
        <TransitionGroup className={s.Dimming} {...overlayTiming}>
          {dimmed && (
            <div key="dimming" data-context-menu-dimming="" className={s.Overlay} style={contextMenuHoleMask(preview) as CSSProperties}>
              <div
                className={s.Preview}
                style={{ left: preview.rect.x, top: preview.rect.y, width: preview.rect.width, height: preview.rect.height, borderRadius: preview.radius }}
              />
            </div>
          )}
        </TransitionGroup>
      </Portal.Root>
      <Menu.Content
        {...props}
        {...placement}
        onCloseAutoFocus={(event) => {
          // Focus goes back to the element only when the keyboard opened the menu; a pointer leaves it where it was.
          event.preventDefault()
          if (presentation?.kind === "keyboard") regionRef.current?.focus({ preventScroll: true })
        }}
      />
    </>
  )
}
ContextMenuContent.displayName = "ContextMenu.Content"

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Item: Menu.Item,
  Link: Menu.Link,
  Separator: Menu.Separator,
  Label: Menu.Label,
  Group: Menu.Group,
  Sub: Menu.Sub,
  SubTrigger: Menu.SubTrigger,
  SubContent: Menu.SubContent,
  CheckboxItem: Menu.CheckboxItem,
  RadioGroup: Menu.RadioGroup,
  RadioItem: Menu.RadioItem,
})
