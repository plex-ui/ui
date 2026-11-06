import {
  cloneVNode,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  provide,
  shallowRef,
  Teleport,
  type InjectionKey,
  type ShallowRef,
} from "vue"
import s from "@plexui/styles/components/ContextMenu/ContextMenu.module.css"
import { firstElementChild, mergeSlotProps } from "../Tooltip/slot.js"
import { Menu, MenuContent, MenuTrigger, useMenuContext } from "../Menu/Menu.js"
import { useMenuRootInternals } from "../Menu/internal.js"
import { TransitionGroup } from "../Transition/index.js"
import { overlayTiming } from "../Transition/shared.js"
import {
  CONTEXT_MENU_LONG_PRESS,
  CONTEXT_MENU_LONG_PRESS_SLOP,
  contextMenuHoleMask,
  contextMenuPlacement,
  contextMenuPreview,
  type ContextMenuPresentation,
} from "./shared.js"

// Vue port of packages/ui/src/components/ContextMenu/ContextMenu.tsx. Exports are flat (`ContextMenuTrigger` for
// `ContextMenu.Trigger`); the items are the Menu ones (`MenuItem`, `MenuSeparator`, ...).

type ContextMenuContext = {
  presentation: ShallowRef<ContextMenuPresentation | null>
  region: ShallowRef<HTMLElement | null>
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
  emits: {
    /** The menu opened */
    open: () => true,
    /** The menu closed */
    close: () => true,
  },
  setup(_, { emit, slots }) {
    provide(CONTEXT_MENU, { presentation: shallowRef(null), region: shallowRef(null) })
    return () => h(Menu, { onOpen: () => emit("open"), onClose: () => emit("close") }, { default: () => slots.default?.() })
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

/** Swallows the click that ends a touch and hold, so the element under the finger does not activate. */
const suppressNextClick = (doc: Document) => {
  const swallow = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    stop()
  }
  const stop = () => {
    doc.removeEventListener("click", swallow, true)
    doc.removeEventListener("pointerdown", stop, true)
    window.clearTimeout(timer)
  }
  // A browser that sends no click after the hold must not swallow the next tap: a new press ends the wait too.
  const timer = window.setTimeout(stop, 600)
  doc.addEventListener("click", swallow, true)
  doc.addEventListener("pointerdown", stop, true)
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
    const { presentation, region } = useContextMenuContext("ContextMenuTrigger")
    let press: Press | null = null

    const cancel = () => {
      if (press) window.clearTimeout(press.timer)
      press = null
    }
    onBeforeUnmount(cancel)

    const open = (next: ContextMenuPresentation) => {
      presentation.value = next
      menu.setOpen(true)
    }
    const openPreview = (element: HTMLElement, x: number) => {
      region.value = element
      open(contextMenuPreview(element, x))
    }

    const handlers = {
      onPointerdown: (event: PointerEvent) => {
        if (event.defaultPrevented || props.disabled || event.pointerType !== "touch" || !event.isPrimary) return
        cancel()
        const element = event.currentTarget as HTMLElement
        const x = event.clientX
        const timer = window.setTimeout(() => {
          if (!press || press.timer !== timer) return
          press.opened = true
          openPreview(element, x)
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
        const element = event.currentTarget as HTMLElement
        region.value = element
        // A touch and hold that the browser reports as a context menu (Android) opens the preview once.
        if (press) {
          if (press.opened) return
          window.clearTimeout(press.timer)
          press.opened = true
          return openPreview(element, press.x)
        }
        if (internals.isUsingKeyboard.current) return open({ kind: "keyboard", rect: element.getBoundingClientRect() })
        open({ kind: "pointer", rect: { x: event.clientX, y: event.clientY, width: 0, height: 0 } })
      },
    }

    return () => {
      const child = firstElementChild(slots.default?.())
      if (!child) return null
      return cloneVNode(mergeSlotProps(child, { ...attrs, class: [s.Trigger, attrs.class], ...handlers }), undefined, true)
    }
  },
})

/** Props of `ContextMenuTrigger`. */
export type ContextMenuTriggerProps = InstanceType<typeof ContextMenuTriggerComponent>["$props"]

/** The element the menu is for (React `ContextMenu.Trigger`): it renders its child, which keeps its own role and focus. */
export const ContextMenuTrigger = ContextMenuTriggerComponent

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
  },
  setup(props, { slots }) {
    const { open } = useMenuContext()
    const { presentation, region } = useContextMenuContext("ContextMenuContent")
    // Focus goes back to the element only when the keyboard opened the menu; a pointer leaves it where it was.
    const onCloseAutoFocus = (event: Event) => {
      event.preventDefault()
      if (presentation.value?.kind === "keyboard") region.value?.focus()
    }

    return () => {
      const current = presentation.value
      const rect = current?.rect
      const preview = current?.kind === "preview" ? current : null
      const dimmed = open.value && preview !== null
      const contentProps = Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))
      return [
        // The menu is placed against this invisible box: the pointer, or the element.
        h(Teleport, { to: "body" }, [
          h(MenuTrigger, null, () => h("span", {
            "aria-hidden": "true",
            "tabindex": -1,
            "class": s.Anchor,
            "style": rect ? { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` } : undefined,
          })),
        ]),
        h(Teleport, { to: "body" }, [
          h(TransitionGroup, { class: s.Dimming, ...overlayTiming }, {
            default: () => [
              dimmed
                ? h("div", { "key": "dimming", "data-context-menu-dimming": "", "class": s.Overlay, "style": contextMenuHoleMask(preview) }, [
                    h("div", {
                      class: s.Preview,
                      style: { left: `${preview.rect.x}px`, top: `${preview.rect.y}px`, width: `${preview.rect.width}px`, height: `${preview.rect.height}px`, borderRadius: `${preview.radius}px` },
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
