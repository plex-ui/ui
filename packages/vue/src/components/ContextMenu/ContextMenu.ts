import {
  cloneVNode,
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  Teleport,
  watch,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type ShallowRef,
  type VNode,
} from "vue"
import s from "@plexui/styles/components/ContextMenu/ContextMenu.module.css"
import { CONTEXT_MENU_TRIGGER, SORTABLE_HANDLE, SORTABLE_SOURCE, sendContextMenuHold } from "../../lib/contextMenuHold.js"
import { readMenuBoundaryRect } from "../../lib/menuSubmenuPlacement.js"
import { isPhoneLayout } from "../../lib/phoneLayout.js"
import { firstElementChild, mergeSlotProps } from "../Tooltip/slot.js"
import { Menu, MenuContent, MenuTrigger, useMenuBoundary, useMenuContext, useMenuPhoneLayout } from "../Menu/Menu.js"
import { useMenuRootInternals } from "../Menu/internal.js"
import { TransitionGroup } from "../Transition/index.js"
import { overlayTiming } from "../Transition/shared.js"
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
  contextMenuPreviewLayout,
  liftContextMenuPreview,
  type ContextMenuFrame,
  type ContextMenuPresentation,
} from "./shared.js"

// Vue port of packages/ui/src/components/ContextMenu/ContextMenu.tsx. Exports are flat (`ContextMenuTrigger` for
// `ContextMenu.Trigger`); the items are the Menu ones (`MenuItem`, `MenuSeparator`, ...).

type ContextMenuContext = {
  presentation: ShallowRef<ContextMenuPresentation | null>
  frame: ShallowRef<ContextMenuFrame | null>
  name: ShallowRef<string>
  region: ShallowRef<HTMLElement | null>
  container: ComputedRef<HTMLElement | null>
  forced: ComputedRef<boolean>
  /**
   * Shows the menu for the element as `measure` places it, once a raised preview is back in its place. A menu held
   * open is placed again as the page moves, and its preview moves up without gliding.
   */
  present: (element: HTMLElement, measure: () => ContextMenuPresentation, held?: boolean) => void
  /** Moves the preview up by `shift`, so that the menu stands whole below it */
  lift: (shift: number, side?: "top" | "bottom") => void
  /** Puts a raised preview back in its place, gliding or at once */
  drop: (glide: boolean) => void
  /** Puts a raised preview back at once and forgets its move, for content that goes away while the element stays */
  release: () => void
}

const CONTEXT_MENU: InjectionKey<ContextMenuContext> = Symbol("ContextMenu")

const useContextMenuContext = (part: string) => {
  const context = inject(CONTEXT_MENU, null)
  if (!context) throw new Error(`${part} must be used within ContextMenu`)
  return context
}

const ContextMenuComponent = defineComponent({
  name: "ContextMenu",
  inheritAttrs: false,
  props: {
    /**
     * Holds the menu open (`true`) or closed (`false`). Held open without a press, it stands at the element: as the
     * touch-and-hold preview on a phone, under the element elsewhere, and it follows the element as the page scrolls.
     */
    forceOpen: { type: Boolean, default: undefined },
  },
  emits: {
    /** The menu opened */
    open: () => true,
    /** The menu closed */
    close: () => true,
  },
  setup(props, { emit, slots }) {
    const presentation = shallowRef<ContextMenuPresentation | null>(null)
    const frame = shallowRef<ContextMenuFrame | null>(null)
    const name = shallowRef("")
    const region = shallowRef<HTMLElement | null>(null)
    // Inside a PhoneLayout the anchor and the dimming lie in its box, as the menu does
    const { container } = useMenuPhoneLayout()
    let restore: ((glide: boolean) => void) | null = null
    let held = false

    // Puts the element back; after a glide back the restore stays, so that a press or a close that follows stops it
    const drop = (glide: boolean) => {
      const current = restore
      current?.(glide)
      restore = glide ? current : null
    }
    // The content going away while the element stays: the element back in place, and measured anew when it returns
    const release = () => {
      drop(false)
      const preview = presentation.value
      if (preview?.kind !== "preview" || preview.shift === undefined) return
      presentation.value = { ...preview, rect: { ...preview.rect, y: preview.rect.y + preview.shift }, side: undefined, shift: undefined }
    }
    const present = (element: HTMLElement, measure: () => ContextMenuPresentation, still = false) => {
      drop(false)
      held = still
      region.value = element
      presentation.value = measure()
      frame.value = contextMenuFrame(container.value)
      name.value = contextMenuName(element)
    }
    const lift = (shift: number, side: "top" | "bottom" = "bottom") => {
      const element = region.value
      drop(false)
      if (element && shift > 0) restore = liftContextMenuPreview(element, shift, !held)
      const preview = presentation.value
      if (preview?.kind !== "preview") return
      presentation.value = { ...preview, rect: { ...preview.rect, y: preview.rect.y - shift }, side, shift }
    }
    onBeforeUnmount(() => drop(false))

    provide(CONTEXT_MENU, {
      presentation,
      frame,
      name,
      region,
      container,
      forced: computed(() => props.forceOpen === true),
      present,
      lift,
      drop,
      release,
    })
    return () => h(Menu, { forceOpen: props.forceOpen, onOpen: () => emit("open"), onClose: () => emit("close") }, { default: () => slots.default?.() })
  },
})

/** Props of `ContextMenu`. */
export type ContextMenuProps = InstanceType<typeof ContextMenuComponent>["$props"]

/**
 * A menu of actions for an element, after the iOS 26 kit Context Menu (507:25994): a secondary click opens it at
 * the pointer, a touch and hold opens it beside the element, which stays clear above a dimmed, blurred page, as
 * iOS lifts the preview. The items are the ones of `Menu`.
 */
export const ContextMenu = ContextMenuComponent

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
  return contextMenuPreview(element)
}

type Press = { id: number; x: number; y: number; timer: number; opened: boolean }

const ContextMenuTriggerComponent = defineComponent({
  name: "ContextMenuTrigger",
  inheritAttrs: false,
  props: {
    /** When `true`, the element keeps the browser's own context menu. */
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const menu = useMenuContext()
    const internals = useMenuRootInternals()
    const { present, drop, forced } = useContextMenuContext("ContextMenuTrigger")
    const element = shallowRef<HTMLElement | null>(null)
    let press: Press | null = null

    const cancel = () => {
      if (press) window.clearTimeout(press.timer)
      press = null
    }
    onBeforeUnmount(cancel)

    // A menu held open stands at the element, and follows it as the page around it scrolls or the window changes
    watch([forced, element], ([held, node], _, onCleanup) => {
      if (!held || !node) return
      const doc = node.ownerDocument
      const view = doc.defaultView
      const place = () => present(node, () => forcedPresentation(node), true)
      place()
      let frame = 0
      const follow = (event: Event) => {
        if (event.target instanceof Node && event.target !== doc && !event.target.contains(node)) return
        view?.cancelAnimationFrame(frame)
        frame = view?.requestAnimationFrame(place) ?? 0
      }
      view?.addEventListener("resize", follow)
      doc.addEventListener("scroll", follow, { capture: true, passive: true })
      onCleanup(() => {
        view?.cancelAnimationFrame(frame)
        view?.removeEventListener("resize", follow)
        doc.removeEventListener("scroll", follow, { capture: true })
      })
    }, { immediate: true, flush: "post" })

    const open = (node: HTMLElement, measure: () => ContextMenuPresentation) => {
      present(node, measure)
      menu.setOpen(true)
    }
    const openPreview = (node: HTMLElement) => open(node, () => contextMenuPreview(node))
    // A touch and hold opens the preview once, by the timer or by the browser's own context menu (Android)
    const openHeld = (node: HTMLElement, current: Press) => {
      // A Sortable list around the element already turned this hold into a drag
      if (node.ownerDocument.querySelector(SORTABLE_SOURCE)) return cancel()
      window.clearTimeout(current.timer)
      current.opened = true
      openPreview(node)
      // The same hold drags the element where it is a Sortable item: moving on, the finger closes the menu
      sendContextMenuHold(node, {
        pointerId: current.id,
        close: () => {
          drop(false)
          menu.setOpen(false)
        },
      })
    }

    const handlers = {
      onPointerdown: (event: PointerEvent) => {
        if (event.defaultPrevented || props.disabled || event.pointerType !== "touch" || !event.isPrimary) return
        // The grip of a Sortable item drags at once
        if (event.target instanceof Element && event.target.closest(SORTABLE_HANDLE)) return
        cancel()
        const node = event.currentTarget as HTMLElement
        const x = event.clientX
        const timer = window.setTimeout(() => {
          if (press && press.timer === timer) openHeld(node, press)
        }, CONTEXT_MENU_LONG_PRESS)
        press = { id: event.pointerId, x, y: event.clientY, timer, opened: false }
      },
      onPointermove: (event: PointerEvent) => {
        if (!press || press.id !== event.pointerId || press.opened) return
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > CONTEXT_MENU_LONG_PRESS_SLOP) cancel()
      },
      onPointerup: (event: PointerEvent) => {
        if (!press || press.id !== event.pointerId) return
        if (press.opened) suppressNextClick((event.currentTarget as HTMLElement).ownerDocument)
        cancel()
      },
      onPointercancel: (event: PointerEvent) => {
        if (press?.id === event.pointerId) cancel()
      },
      onContextmenu: (event: MouseEvent) => {
        if (event.defaultPrevented || props.disabled) return
        event.preventDefault()
        const node = event.currentTarget as HTMLElement
        // A touch and hold that the browser reports as a context menu (Android) opens the preview once.
        if (press) {
          if (!press.opened) openHeld(node, press)
          return
        }
        if (internals.isUsingKeyboard.current) return open(node, () => ({ kind: "keyboard", rect: node.getBoundingClientRect() }))
        const { clientX, clientY } = event
        open(node, () => ({ kind: "pointer", rect: { x: clientX, y: clientY, width: 0, height: 0 } }))
      },
    }
    // The element itself, also when the child is a component
    const setElement = (node: unknown) => {
      const found = node instanceof Element ? node : (node as { $el?: unknown } | null)?.$el
      element.value = found instanceof HTMLElement ? found : null
    }

    return () => {
      const child = firstElementChild(slots.default?.())
      if (!child) return null
      const own = { [CONTEXT_MENU_TRIGGER]: props.disabled ? undefined : "" }
      // A component that changes its own root renders again without this trigger: its vnode hook follows the new root
      return cloneVNode(
        mergeSlotProps(child, { ...attrs, ...own, class: [s.Trigger, attrs.class], ...handlers }),
        { ref: setElement, onVnodeUpdated: (vnode: VNode) => setElement(vnode.el) },
        true,
      )
    }
  },
})

/** Props of `ContextMenuTrigger`. */
export type ContextMenuTriggerProps = InstanceType<typeof ContextMenuTriggerComponent>["$props"]

/** The element the menu is for (React `ContextMenu.Trigger`): it renders its child, which keeps its own role and focus. */
export const ContextMenuTrigger = ContextMenuTriggerComponent

/**
 * Reaches the body, or the PhoneLayout box, once mounted, as Reka's own Teleport does for the menu. Each one is its own
 * component, so the anchor, the dimming and the menu of a context menu land in that order, as React's portals, also
 * when a page has several context menus.
 */
const BodyTeleport = defineComponent({
  name: "ContextMenuTeleport",
  props: {
    to: { type: Object as PropType<HTMLElement | null>, default: null },
  },
  setup(props, { slots }) {
    const mounted = shallowRef(false)
    onMounted(() => {
      mounted.value = true
    })
    return () => (mounted.value ? h(Teleport, { to: props.to ?? "body" }, slots.default?.() ?? []) : null)
  },
})

const ContextMenuContentComponent = defineComponent({
  name: "ContextMenuContent",
  inheritAttrs: false,
  props: {
    /** Defines the `width` property of the content */
    width: [Number, String],
    /** Defines the `min-width` property of the content, in pixels. */
    minWidth: [Number, String],
    /** Defines the `max-height` property of the content, in pixels. */
    maxHeight: Number,
    /** Rounder list with fully rounded rows. */
    pill: { type: Boolean, default: false },
    /** Names the menu for assistive technology. Without it the menu takes the name of its element. */
    ariaLabel: String,
  },
  setup(props, { slots }) {
    const { open } = useMenuContext()
    const { presentation, frame, name, region, container, lift, drop, release } = useContextMenuContext("ContextMenuContent")
    const boundary = useMenuBoundary(() => open.value)
    let anchor: HTMLElement | null = null
    const setAnchor = (node: unknown) => {
      anchor = node instanceof HTMLElement ? node : null
    }
    // Focus goes back to the element only when the keyboard opened the menu; a pointer leaves it where it was.
    const onCloseAutoFocus = (event: Event) => {
      event.preventDefault()
      if (presentation.value?.kind === "keyboard") region.value?.focus({ preventScroll: true })
    }

    // The preview moves up so that the menu stands whole below it, measured as the menu first lays out, before it shows
    const pending = computed(() => {
      const current = presentation.value
      return open.value && current?.kind === "preview" && current.shift === undefined
    })
    let frameId = 0
    const measure = () => {
      const current = presentation.value
      const element = region.value
      if (!open.value || current?.kind !== "preview" || current.shift !== undefined || !element) return
      const content = anchor?.ownerDocument.getElementById(anchor.getAttribute("aria-controls") ?? "")
      // The menu of a PhoneLayout mounts a frame later, with the box it portals into, and content mounted again while
      // the menu is open finds its anchor (in a portal) a frame later too
      if (!content) {
        frameId = requestAnimationFrame(measure)
        return
      }
      const bounds = readMenuBoundaryRect(element.ownerDocument, boundary.value)
      // On the screen, as the room is: a PhoneLayout drawn smaller draws the menu smaller too
      const height = Math.min(contextMenuNaturalHeight(content), props.maxHeight ?? Infinity) * (frame.value?.scaleY ?? 1)
      // A room not known yet (no layout) moves nothing
      const known = bounds && bounds.bottom > bounds.top
      const layout = known ? contextMenuPreviewLayout(current.rect, height, bounds, contextMenuClipTop(element), frame.value?.scaleY ?? 1) : null
      lift(layout?.shift ?? 0, layout?.side)
    }
    watch(pending, (now) => {
      cancelAnimationFrame(frameId)
      if (now) measure()
    }, { flush: "post" })
    // Content mounted while a preview waits for its move (mounted again, the menu held open) measures it at once
    onMounted(() => {
      if (pending.value) measure()
    })
    watch(open, (now) => {
      if (!now) drop(true)
    }, { flush: "post" })
    onBeforeUnmount(() => {
      cancelAnimationFrame(frameId)
      // The content going away while the element stays puts the element back
      release()
    })

    return () => {
      const current = presentation.value
      const box = frame.value
      const rect = current?.rect
      const preview = current?.kind === "preview" ? current : null
      const dimmed = open.value && preview !== null
      const local = (value: NonNullable<typeof rect>) => contextMenuInFrame(value, box)
      const place = rect ? local(rect) : undefined
      const hole = preview && { ...preview, rect: local(preview.rect), radius: preview.radius / (box?.scaleX ?? 1) }
      const viewport = box ? { width: box.width, height: box.height } : undefined
      const label = props.ariaLabel ?? name.value
      const { ariaLabel: _label, ...menuProps } = props
      const contentProps = Object.fromEntries(Object.entries(menuProps).filter(([, value]) => value !== undefined))
      return [
        // The menu is placed against this invisible box: the pointer, or the element. It names the menu.
        h(BodyTeleport, { to: container.value }, () => [
          h(MenuTrigger, null, () => h("span", {
            "ref": setAnchor,
            "aria-hidden": "true",
            "aria-label": label || undefined,
            "tabindex": -1,
            "class": s.Anchor,
            "style": place ? { left: `${place.x}px`, top: `${place.y}px`, width: `${place.width}px`, height: `${place.height}px` } : undefined,
          })),
        ]),
        h(BodyTeleport, { to: container.value }, () => [
          h(TransitionGroup, { class: s.Dimming, ...overlayTiming }, {
            default: () => [
              dimmed && hole
                ? h("div", { "key": "dimming", "data-context-menu-dimming": "", "class": s.Overlay, "style": contextMenuHoleMask(hole, viewport) }, [
                    h("div", {
                      class: s.Preview,
                      style: { left: `${hole.rect.x}px`, top: `${hole.rect.y}px`, width: `${hole.rect.width}px`, height: `${hole.rect.height}px`, borderRadius: `${hole.radius}px` },
                    }),
                  ])
                : null,
            ],
          }),
        ]),
        h(MenuContent, { ...contentProps, ...contextMenuPlacement(current), onCloseAutoFocus }, { default: () => slots.default?.() }),
      ]
    }
  },
})

/** Props of `ContextMenuContent`. */
export type ContextMenuContentProps = InstanceType<typeof ContextMenuContentComponent>["$props"]

/** The menu (React `ContextMenu.Content`); its items are `MenuItem`, `MenuSeparator` and the other Menu items. */
export const ContextMenuContent = ContextMenuContentComponent
