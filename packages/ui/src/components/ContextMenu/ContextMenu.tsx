"use client"

import { Portal, Slot } from "radix-ui"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
import { CONTEXT_MENU_TRIGGER, SORTABLE_HANDLE, SORTABLE_SOURCE, sendContextMenuHold } from "../../lib/contextMenuHold"
import { readMenuBoundaryRect } from "../../lib/menuSubmenuPlacement"
import { isPhoneLayout } from "../../lib/phoneLayout"
import { Menu, useMenuContext, useMenuPhoneLayout, type MenuContentProps } from "../Menu/Menu"
import { PhoneLayoutContext } from "../PhoneLayout/PhoneLayout"
import { TransitionGroup } from "../Transition"
import { overlayTiming } from "../Transition/shared"
import {
  CONTEXT_MENU_LONG_PRESS,
  CONTEXT_MENU_LONG_PRESS_SLOP,
  contextMenuClipTop,
  contextMenuFrame,
  contextMenuHoleMask,
  contextMenuInFrame,
  contextMenuName,
  contextMenuNaturalHeight,
  contextMenuPlacement,
  contextMenuPreview,
  contextMenuPreviewShift,
  liftContextMenuPreview,
  type ContextMenuFrame,
  type ContextMenuPresentation,
} from "./shared"

type Shown = { presentation: ContextMenuPresentation | null; frame: ContextMenuFrame | null; name: string }

type ContextMenuContextValue = Shown & {
  /**
   * Shows the menu for the element as `measure` places it, once a raised preview is back in its place. A menu held
   * open is placed again as the page moves, and its preview moves up without gliding.
   */
  present: (element: HTMLElement, measure: () => ContextMenuPresentation, held?: boolean) => void
  /** Moves the preview up by `shift`, so that the menu stands whole below it */
  lift: (shift: number) => void
  /** Puts a raised preview back in its place, gliding or at once */
  drop: (glide: boolean) => void
  /** Puts a raised preview back at once and forgets its move, for content that goes away while the element stays */
  release: () => void
  regionRef: RefObject<HTMLElement | null>
  container: HTMLElement | null
  forced: boolean
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
  /**
   * Holds the menu open (`true`) or closed (`false`). Held open without a press, it stands at the element: as the
   * touch-and-hold preview on a phone, under the element elsewhere, and it follows the element as the page scrolls.
   */
  forceOpen?: boolean
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
function ContextMenuRoot({ children, forceOpen, onOpen, onClose }: ContextMenuProps) {
  const [shown, setShown] = useState<Shown>({ presentation: null, frame: null, name: "" })
  const regionRef = useRef<HTMLElement | null>(null)
  // Inside a PhoneLayout the anchor and the dimming lie in its box, as the menu does
  const container = useContext(PhoneLayoutContext)?.container ?? null
  const restore = useRef<((glide: boolean) => void) | null>(null)
  const held = useRef(false)

  // Puts the element back; after a glide back the restore stays, so that a press or a close that follows stops it
  const drop = useCallback((glide: boolean) => {
    const current = restore.current
    current?.(glide)
    restore.current = glide ? current : null
  }, [])
  // The content going away while the element stays: the element back in place, and measured anew when it returns
  const release = useCallback(() => {
    drop(false)
    setShown((current) => {
      const preview = current.presentation
      if (preview?.kind !== "preview" || preview.shift === undefined) return current
      return { ...current, presentation: { ...preview, rect: { ...preview.rect, y: preview.rect.y + preview.shift }, shift: undefined } }
    })
  }, [drop])
  const present = useCallback((element: HTMLElement, measure: () => ContextMenuPresentation, still = false) => {
    drop(false)
    held.current = still
    regionRef.current = element
    setShown({ presentation: measure(), frame: contextMenuFrame(container), name: contextMenuName(element) })
  }, [container, drop])
  const lift = useCallback((shift: number) => {
    const element = regionRef.current
    drop(false)
    if (element && shift > 0) restore.current = liftContextMenuPreview(element, shift, !held.current)
    setShown((current) => {
      const preview = current.presentation
      if (preview?.kind !== "preview") return current
      return { ...current, presentation: { ...preview, rect: { ...preview.rect, y: preview.rect.y - shift }, shift } }
    })
  }, [drop])
  useEffect(() => () => drop(false), [drop])

  const value = useMemo(
    () => ({ ...shown, present, lift, drop, release, regionRef, container, forced: forceOpen === true }),
    [shown, present, lift, drop, release, container, forceOpen],
  )
  return (
    <ContextMenuContext.Provider value={value}>
      <Menu forceOpen={forceOpen} onOpen={onOpen} onClose={onClose}>{children}</Menu>
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

/** A menu held open without a press: the touch-and-hold preview on a phone, under the element elsewhere. */
const forcedPresentation = (element: HTMLElement): ContextMenuPresentation => {
  if (!isPhoneLayout(element)) return { kind: "keyboard", rect: element.getBoundingClientRect() }
  const box = element.getBoundingClientRect()
  return contextMenuPreview(element, box.left + box.width / 2)
}

function ContextMenuTrigger({ children, disabled = false }: ContextMenuTriggerProps) {
  const menu = useMenuContext()
  const { present, drop, forced } = useContextMenuContext("ContextMenu.Trigger")
  const press = useRef<Press | null>(null)
  // The element, as state: a menu held open follows the element the trigger has now
  const [element, setElement] = useState<HTMLElement | null>(null)

  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }
  useEffect(() => () => {
    if (press.current) window.clearTimeout(press.current.timer)
  }, [])

  // A menu held open stands at the element, and follows it as the page around it scrolls or the window changes
  useLayoutEffect(() => {
    if (!forced || !element) return
    const doc = element.ownerDocument
    const view = doc.defaultView
    const place = () => present(element, () => forcedPresentation(element), true)
    place()
    let frame = 0
    const follow = (event: Event) => {
      if (event.target instanceof Node && event.target !== doc && !event.target.contains(element)) return
      view?.cancelAnimationFrame(frame)
      frame = view?.requestAnimationFrame(place) ?? 0
    }
    view?.addEventListener("resize", follow)
    doc.addEventListener("scroll", follow, { capture: true, passive: true })
    return () => {
      view?.cancelAnimationFrame(frame)
      view?.removeEventListener("resize", follow)
      doc.removeEventListener("scroll", follow, { capture: true })
    }
  }, [forced, present, element])

  const open = (element: HTMLElement, measure: () => ContextMenuPresentation) => {
    present(element, measure)
    menu.setOpen(true)
  }
  const openPreview = (element: HTMLElement, x: number) => open(element, () => contextMenuPreview(element, x))
  // A touch and hold opens the preview once, by the timer or by the browser's own context menu (Android)
  const openHeld = (element: HTMLElement, current: Press) => {
    // A Sortable list around the element already turned this hold into a drag
    if (element.ownerDocument.querySelector(SORTABLE_SOURCE)) return cancel()
    window.clearTimeout(current.timer)
    current.opened = true
    openPreview(element, current.x)
    // The same hold drags the element where it is a Sortable item: moving on, the finger closes the menu
    sendContextMenuHold(element, {
      pointerId: current.id,
      close: () => {
        drop(false)
        menu.setOpen(false)
      },
    })
  }

  const handlers = {
    [CONTEXT_MENU_TRIGGER]: disabled ? undefined : "",
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.defaultPrevented || disabled || event.pointerType !== "touch" || !event.isPrimary) return
      // The grip of a Sortable item drags at once
      if (event.target instanceof Element && event.target.closest(SORTABLE_HANDLE)) return
      cancel()
      const element = event.currentTarget
      const x = event.clientX
      const timer = window.setTimeout(() => {
        const current = press.current
        if (current && current.timer === timer) openHeld(element, current)
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
      // A touch and hold that the browser reports as a context menu (Android) opens the preview once.
      const current = press.current
      if (current) {
        if (!current.opened) openHeld(element, current)
        return
      }
      if (menu.isUsingKeyboard.current) return open(element, () => ({ kind: "keyboard", rect: element.getBoundingClientRect() }))
      const { clientX, clientY } = event
      open(element, () => ({ kind: "pointer", rect: { x: clientX, y: clientY, width: 0, height: 0 } }))
    },
  }

  return <Slot.Root ref={setElement} className={s.Trigger} {...handlers}>{children}</Slot.Root>
}
ContextMenuTrigger.displayName = "ContextMenu.Trigger"

/** The props of `Menu.Content` but its placement, which follows how the menu opened. */
export type ContextMenuContentProps = Omit<MenuContentProps, "side" | "sideOffset" | "align" | "alignOffset" | "onCloseAutoFocus" | "layout" | "size"> & {
  /** Names the menu for assistive technology. Without it the menu takes the name of its element. */
  "aria-label"?: string
}

function ContextMenuContent({ "aria-label": ariaLabel, ...props }: ContextMenuContentProps) {
  const { open } = useMenuContext()
  const { presentation, frame, name, regionRef, container, lift, drop, release } = useContextMenuContext("ContextMenu.Content")
  const anchorRef = useRef<HTMLSpanElement>(null)
  const { boundary } = useMenuPhoneLayout(open)
  const rect = presentation?.rect
  const placement = contextMenuPlacement(presentation)
  const preview = presentation?.kind === "preview" ? presentation : null
  const dimmed = open && preview !== null
  const pending = open && preview !== null && preview.shift === undefined
  const maxHeight = props.maxHeight

  // The preview moves up so that the menu stands whole below it, measured as the menu first lays out, before it shows
  const latest = useRef({ preview, boundary, maxHeight, frame })
  latest.current = { preview, boundary, maxHeight, frame }
  useLayoutEffect(() => {
    if (!pending) return
    let frame = 0
    const measure = () => {
      const { preview: current, boundary: room, maxHeight: limit, frame: box } = latest.current
      const element = regionRef.current
      const anchor = anchorRef.current
      if (!current || current.shift !== undefined || !element) return
      const content = anchor?.ownerDocument.getElementById(anchor.getAttribute("aria-controls") ?? "")
      // The menu of a PhoneLayout mounts a frame later, with the box it portals into, and content mounted again while
      // the menu is open finds its anchor (in a portal) a frame later too
      if (!content) {
        frame = requestAnimationFrame(measure)
        return
      }
      const bounds = readMenuBoundaryRect(element.ownerDocument, room)
      // On the screen, as the room is: a PhoneLayout drawn smaller draws the menu smaller too
      const height = Math.min(contextMenuNaturalHeight(content), limit ?? Infinity) * (box?.scaleY ?? 1)
      // A room not known yet (no layout) moves nothing
      const known = bounds && bounds.bottom > bounds.top
      lift(known ? contextMenuPreviewShift(current.rect, height, bounds, contextMenuClipTop(element), box?.scaleY ?? 1) : 0)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [pending, lift, regionRef])
  useLayoutEffect(() => {
    if (!open) drop(true)
  }, [open, drop])
  // The content going away while the element stays puts the element back
  useLayoutEffect(() => release, [release])

  const local = (box: NonNullable<typeof rect>) => contextMenuInFrame(box, frame)
  const anchor = rect ? local(rect) : undefined
  const hole = preview && { ...preview, rect: local(preview.rect), radius: preview.radius / (frame?.scaleX ?? 1) }
  const viewport = frame ? { width: frame.width, height: frame.height } : undefined
  const label = ariaLabel ?? name

  return (
    <>
      {/* The menu is placed against this invisible box: the pointer, or the element. It names the menu. */}
      <Portal.Root asChild container={container}>
        <Menu.Trigger>
          <span
            ref={anchorRef}
            aria-hidden="true"
            aria-label={label || undefined}
            tabIndex={-1}
            className={s.Anchor}
            style={anchor ? { left: anchor.x, top: anchor.y, width: anchor.width, height: anchor.height } : undefined}
          />
        </Menu.Trigger>
      </Portal.Root>
      <Portal.Root asChild container={container}>
        <TransitionGroup className={s.Dimming} {...overlayTiming}>
          {dimmed && hole && (
            <div key="dimming" data-context-menu-dimming="" className={s.Overlay} style={contextMenuHoleMask(hole, viewport) as CSSProperties}>
              <div
                className={s.Preview}
                style={{ left: hole.rect.x, top: hole.rect.y, width: hole.rect.width, height: hole.rect.height, borderRadius: hole.radius }}
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
