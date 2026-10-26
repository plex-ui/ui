import {
  Comment,
  cloneVNode,
  computed,
  createCommentVNode,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  withCtx,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type ShallowRef,
  type VNode,
} from "vue"
import {
  DropdownMenuContent as RekaDropdownMenuContent,
  DropdownMenuPortal as RekaDropdownMenuPortal,
  DropdownMenuRoot as RekaDropdownMenuRoot,
  Presence,
  injectDropdownMenuRootContext,
  useDirection,
  useId,
} from "reka-ui"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { preventDefaultHandler, toCssVariables } from "../../lib/helpers.js"
import { Button } from "../Button/index.js"
import { Check, ChevronRight } from "../Icon/index.js"
import { useLinkComponent } from "../PlexUIProvider/internal.js"
import type { LinkComponent } from "../PlexUIProvider/index.js"
import { TransitionGroup } from "../Transition/index.js"
import {
  MenuLevelKey,
  MenuRootInternalsKey,
  MenuSubInternalsKey,
  SUB_CLOSE_KEYS,
  SUB_OPEN_KEYS,
  box,
  compose,
  getCheckedState,
  getOpenState,
  isIndeterminate,
  provideMenuContentContext,
  selectableItemListeners,
  splitListeners,
  trackKeyboardUse,
  useMenuItemImpl,
  useMenuItemSelect,
  useMenuLevel,
  useMenuRootInternals,
  useMenuSubInternals,
  whenMouse,
  type CheckedState,
  type GraceIntent,
  type ItemImplHandlers,
  type MenuLevel,
  type MenuSubInternals,
} from "./internal.js"
import s from "@plexui/styles/components/Menu/Menu.module.css"

// Vue port of packages/ui/src/components/Menu/Menu.tsx. Exports are flat
// (`Menu`, `MenuTrigger`, `MenuContent`, ...) because runtime-compiled
// templates cannot resolve `Menu.Trigger` from the `components` option.
//
// Reka UI provides the root state, positioning, the dismissable layer, the
// focus scope and the portal. Where Reka's menu differs from Radix's, this
// port follows Radix so the DOM and behaviour match React:
// - The trigger opens on pointerdown (Reka: click) and runs after the child's
//   own handlers, skipped when one called preventDefault().
// - Items, their roving focus (tabindex 0 on the current item,
//   data-orientation, data-highlighted on focus), typeahead, selection and
//   the submenu pointer grace area are Radix's (see ./internal.ts). Labels
//   get no generated id and groups no aria-labelledby.
// - Tab is held in the menu whether or not it is modal; focus returns to the
//   trigger synchronously on close; Escape closes one level at a time
//   (Reka's submenu closes the whole menu).
// - Submenus are a nested Reka root, so the submenu's Escape and outside
//   interactions follow Radix's submenu rules.
// - Open changes are reported only when the state changes, like Radix's
//   controlled state.
// - The content keeps the custom property names the shared CSS reads
//   (`--radix-dropdown-menu-content-*`), pointing at Reka's
//   `--reka-popper-*` values.

// ---------------------------------------------------------------------------
// Plex contexts (React's MenuContext and SubmenuContext)

type MenuContextValue = {
  open: ComputedRef<boolean>
  setOpen: (next: boolean) => void
}

const MenuContextKey: InjectionKey<MenuContextValue> = Symbol("PlexUIMenu")

const useMenuContext = () => {
  const context = inject(MenuContextKey, null)
  if (!context) throw new Error("Menu components must be wrapped in <Menu />")
  return context
}

type SubmenuContextValue = {
  open: ComputedRef<boolean>
  setOpen: (next: boolean) => void
  triggerRef: ShallowRef<HTMLElement | null>
}

const SubmenuContextKey: InjectionKey<SubmenuContextValue> = Symbol("PlexUISubmenu")

const useSubmenuContext = () => {
  const context = inject(SubmenuContextKey, null)
  if (!context) throw new Error("Submenu components must be wrapped in <Sub />")
  return context
}

// React's blur events from a submenu bubble through the React tree to the
// parent menus, which clear their typeahead buffer
type ParentContent = { resetSearch: () => void }
const ParentContentKey: InjectionKey<ParentContent> = Symbol("PlexUIMenuParentContent")

type ItemIndicatorContextValue = { checked: () => CheckedState }
const ItemIndicatorKey: InjectionKey<ItemIndicatorContextValue> = Symbol("PlexUIMenuItemIndicator")

type RadioGroupContextValue = { value: () => string | undefined; onValueChange: (value: string) => void }
const RadioGroupKey: InjectionKey<RadioGroupContextValue> = Symbol("PlexUIMenuRadioGroup")

const resolveElement = (el: unknown): HTMLElement | null => {
  const node = el && typeof el === "object" && "$el" in el ? (el as { $el: unknown }).$el : el
  // A multi-root component's $el is the text node opening its fragment; the
  // element follows it (as in Reka)
  const element = node instanceof Text ? node.nextElementSibling : node
  return element instanceof HTMLElement ? element : null
}

// ---------------------------------------------------------------------------
// Menu

/** Dropdown menu root. Open state is internal; `forceOpen` overrides it. */
export const Menu = defineComponent({
  name: "Menu",
  // Like React, only the declared props are used
  inheritAttrs: false,
  props: {
    /** Force the menu to remain open or closed */
    forceOpen: { type: Boolean, default: undefined },
    /**
     * When set to `true`, interaction with outside elements will be disabled and only menu content will be visible to screen readers.
     * @default false
     */
    modal: { type: Boolean, default: false },
  },
  emits: {
    /** The menu opened */
    open: () => true,
    /** The menu closed */
    close: () => true,
  },
  setup(props, { slots, emit }) {
    const open = ref(false)
    const isOpen = computed(() => props.forceOpen ?? open.value)

    const handleOpenChange = (nextState: boolean) => {
      open.value = nextState
      if (nextState) emit("open")
      else emit("close")
    }

    useEscCloseStack(
      () => open.value,
      () => handleOpenChange(false),
    )

    provide(MenuContextKey, { open: isOpen, setOpen: handleOpenChange })

    // Radix's controlled root reports a change only when it differs from the
    // rendered state (two changes before the next render both report)
    let renderedOpen = isOpen.value
    const setOpen = (nextState: boolean) => {
      if (nextState !== renderedOpen) handleOpenChange(nextState)
    }

    const isUsingKeyboard = box(false)
    let stopTracking: (() => void) | undefined
    onMounted(() => {
      stopTracking = trackKeyboardUse(isUsingKeyboard)
    })
    onBeforeUnmount(() => stopTracking?.())

    const level: MenuLevel = { open: () => isOpen.value, onOpenChange: setOpen, content: shallowRef(null) }
    provide(MenuLevelKey, level)
    provide(MenuRootInternalsKey, {
      onClose: () => setOpen(false),
      isUsingKeyboard,
      dir: useDirection(),
      modal: () => props.modal,
      trigger: shallowRef(null),
    })

    return () => {
      renderedOpen = isOpen.value
      return h(
        RekaDropdownMenuRoot,
        { "open": renderedOpen, "modal": props.modal, "onUpdate:open": setOpen },
        { default: () => slots.default?.() },
      )
    }
  },
})

// ---------------------------------------------------------------------------
// Trigger

const firstChild = (nodes: VNode[] | undefined) => nodes?.find((node) => node.type !== Comment)

/** Merges props into the slot's child; attributes the child sets itself win (Radix's Slot). */
const withChildProps = (child: VNode | undefined, props: Record<string, unknown>) => {
  if (!child) return null
  const own = child.props ?? {}
  const extra = Object.fromEntries(
    Object.entries(props).filter(([key]) => key === "ref" || /^on[A-Z]/.test(key) || !(key in own)),
  )
  return cloneVNode(child, extra, true)
}

/** Renders its child as the menu's trigger (Radix's `asChild`). */
export const MenuTrigger = defineComponent({
  name: "MenuTrigger",
  inheritAttrs: false,
  props: {
    /** Prevents the menu from opening */
    disabled: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const rootContext = injectDropdownMenuRootContext()
    const internals = useMenuRootInternals()
    const level = useMenuLevel()
    rootContext.triggerId ||= useId(undefined, "reka-dropdown-menu-trigger")
    // Set here so the trigger's aria-controls is ready when the content opens
    rootContext.contentId ||= useId(undefined, "reka-dropdown-menu-content")

    const setRef = (el: unknown) => {
      const element = resolveElement(el)
      internals.trigger.value = element
      // Reka leaves pointer-downs on its trigger to the trigger
      rootContext.triggerElement.value = element ?? undefined
    }

    // After the child's own handlers, skipped when one called preventDefault()
    const onPointerdown = (event: PointerEvent) => {
      if (event.defaultPrevented) return
      // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
      // but not when the control key is pressed (avoiding MacOS right click)
      if (!props.disabled && event.button === 0 && event.ctrlKey === false) {
        const wasOpen = level.open()
        level.onOpenChange(!wasOpen)
        // prevent trigger focusing when opening
        // this allows the content to be given focus without competition
        if (!wasOpen) event.preventDefault()
      }
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (props.disabled) return
      if (["Enter", " "].includes(event.key)) level.onOpenChange(!level.open())
      if (event.key === "ArrowDown") level.onOpenChange(true)
      // prevent keydown from scrolling window / first focused item to execute
      // that keydown (inadvertently closing the menu)
      if (["Enter", " ", "ArrowDown"].includes(event.key)) event.preventDefault()
    }

    return () => {
      const open = level.open()
      return withChildProps(firstChild(slots.default?.()), {
        "type": "button",
        "id": rootContext.triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? rootContext.contentId : undefined,
        "data-state": getOpenState(open),
        "data-disabled": props.disabled ? "" : undefined,
        "disabled": props.disabled,
        "ref": setRef,
        onPointerdown,
        onKeydown,
      })
    }
  },
})

// ---------------------------------------------------------------------------
// Content

const COLLISION_PADDING = { bottom: 30, top: 30, left: 12, right: 12 }
const AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount"

// Radix's names for the content custom properties (read by the shared CSS),
// in place of Reka's
const contentVariables = {
  "--radix-dropdown-menu-content-transform-origin": "var(--reka-popper-transform-origin)",
  "--radix-dropdown-menu-content-available-width": "var(--reka-popper-available-width)",
  "--radix-dropdown-menu-content-available-height": "var(--reka-popper-available-height)",
  "--radix-dropdown-menu-trigger-width": "var(--reka-popper-anchor-width)",
  "--radix-dropdown-menu-trigger-height": "var(--reka-popper-anchor-height)",
  "--reka-dropdown-menu-content-transform-origin": null,
  "--reka-dropdown-menu-content-available-width": null,
  "--reka-dropdown-menu-content-available-height": null,
  "--reka-dropdown-menu-trigger-width": null,
  "--reka-dropdown-menu-trigger-height": null,
}

type InteractOutsideEvent = CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>
type MenuSide = "top" | "right" | "bottom" | "left"
type MenuAlign = "start" | "center" | "end"
type SizeValue = number | "auto"

const sizeProp = [Number, String] as PropType<SizeValue>

/** Content of the root menu, mounted while it is open (Radix's DropdownMenuContent). */
const MenuRootContentImpl = defineComponent({
  name: "MenuRootContentImpl",
  props: {
    side: String as PropType<MenuSide>,
    sideOffset: { type: Number, required: true },
    align: String as PropType<MenuAlign>,
    alignOffset: Number,
    width: sizeProp,
    minWidth: sizeProp,
    maxHeight: Number,
    layout: { type: String as PropType<"vertical" | "horizontal">, required: true },
    size: String as PropType<"sm" | "md" | "lg">,
    onCloseAutoFocus: { type: Function as PropType<(event: Event) => void>, required: true },
  },
  setup(props, { slots }) {
    const rootContext = injectDropdownMenuRootContext()
    const internals = useMenuRootInternals()
    const level = useMenuLevel()
    rootContext.contentId ||= useId(undefined, "reka-dropdown-menu-content")

    const { contentHandlers, resetSearch } = provideMenuContentContext(() => level.content.value)
    provide(ParentContentKey, { resetSearch })
    onMounted(() => {
      level.content.value = document.getElementById(rootContext.contentId)
    })
    onBeforeUnmount(() => {
      level.content.value = null
    })

    let hasInteractedOutside = false
    // Radix's focus scope announces the unmount a task later, on the detached
    // content; Reka's does it at once and refocuses a task later, so that is
    // cancelled and Radix's event dispatched instead
    const onCloseAutoFocus = (rekaEvent: Event) => {
      rekaEvent.preventDefault()
      const container = (rekaEvent.target as HTMLElement | null) ?? level.content.value
      setTimeout(() => {
        const event = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, { bubbles: false, cancelable: true })
        const handleCloseAutoFocus = (closeEvent: Event) => {
          props.onCloseAutoFocus(closeEvent)
          if (closeEvent.defaultPrevented) return
          if (!hasInteractedOutside) internals.trigger.value?.focus()
          hasInteractedOutside = false
          // Always prevent auto focus because we either focus manually or want user agent focus
          closeEvent.preventDefault()
        }
        if (!container) return handleCloseAutoFocus(event)
        container.addEventListener(AUTOFOCUS_ON_UNMOUNT, handleCloseAutoFocus)
        container.dispatchEvent(event)
        container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, handleCloseAutoFocus)
      }, 0)
    }
    const onInteractOutside = (event: InteractOutsideEvent) => {
      if (event.defaultPrevented) return
      const originalEvent = event.detail.originalEvent as PointerEvent
      const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true
      const isRightClick = originalEvent.button === 2 || ctrlLeftClick
      if (!internals.modal() || isRightClick) hasInteractedOutside = true
      // Reka keeps the menu open when the interaction is on its trigger;
      // Radix dismisses it like any other outside interaction
      const target = event.target as Node | null
      if (target && internals.trigger.value?.contains(target)) level.onOpenChange(false)
    }

    const handlers = contentHandlers(internals.isUsingKeyboard)

    return () => {
      const isHorizontal = props.layout === "horizontal"
      return h(
        RekaDropdownMenuContent,
        {
          "side": props.side,
          "sideOffset": props.sideOffset,
          "align": props.align,
          "alignOffset": props.alignOffset ?? (props.align === "center" ? 0 : -5),
          "avoidCollisions": true,
          "collisionPadding": COLLISION_PADDING,
          "reference": internals.trigger.value ?? undefined,
          "class": s.MenuList,
          "data-layout": isHorizontal ? "horizontal" : undefined,
          "data-size": isHorizontal && props.size ? props.size : undefined,
          "style": {
            ...toCssVariables({
              "menu-width": props.width,
              "menu-min-width": isHorizontal ? "auto" : props.minWidth,
              "menu-max-height": props.maxHeight,
            }),
            ...contentVariables,
          },
          "onEscapeKeyDown": preventDefaultHandler,
          onCloseAutoFocus,
          onInteractOutside,
          ...handlers,
        },
        { default: () => slots.default?.() },
      )
    }
  },
})

/** The menu panel. Positioned against the trigger and portalled to `<body>`. */
export const MenuContent = defineComponent({
  name: "MenuContent",
  inheritAttrs: false,
  props: {
    /**
     * The preferred side of the trigger to render against when open. Will be reversed when collisions occur.
     * @default bottom
     */
    side: String as PropType<MenuSide>,
    /**
     * The distance in pixels from the trigger.
     * @default 5
     */
    sideOffset: { type: Number, default: 5 },
    /**
     * The preferred alignment against the trigger. May change when collisions occur.
     * @default center
     */
    align: String as PropType<MenuAlign>,
    /** An offset in pixels from the "start" or "end" alignment options. */
    alignOffset: Number,
    /**
     * Defines the `width` property of the content
     * @default auto
     */
    width: sizeProp,
    /**
     * Defines the `min-width` property of the content, in pixels.
     * @default 300
     */
    minWidth: sizeProp,
    /** Defines the `max-height` property of the content, in pixels. */
    maxHeight: Number,
    /**
     * Layout direction of menu items. Use `"horizontal"` for icon-based toolbars (iOS-style).
     * @default "vertical"
     */
    layout: { type: String as PropType<"vertical" | "horizontal">, default: "vertical" },
    /**
     * Size of horizontal menu items. Controls icon size and padding. Only applies when `layout="horizontal"`.
     * @default "md"
     */
    size: String as PropType<"sm" | "md" | "lg">,
  },
  emits: {
    /**
     * Focus is about to return to the trigger after the menu closes. Call
     * `event.preventDefault()` to keep the trigger from regaining focus (and
     * its focus-visible ring).
     */
    closeAutoFocus: (_event: Event) => true,
  },
  setup(props, { slots, emit }) {
    const { open } = useMenuContext()
    const onCloseAutoFocus = (event: Event) => emit("closeAutoFocus", event)

    return () =>
      h(
        RekaDropdownMenuPortal,
        null,
        {
          default: () => [
            h(
              TransitionGroup,
              { class: s.Menu, enterDuration: 350, exitDuration: 200, disableAnimations: true },
              {
                default: () => [
                  open.value
                    ? h(
                        MenuRootContentImpl,
                        { key: "dropdown", ...props, onCloseAutoFocus },
                        { default: () => slots.default?.() },
                      )
                    : createCommentVNode(),
                ],
              },
            ),
          ],
        },
      )
  },
})

// ---------------------------------------------------------------------------
// Items

/** The focusable branch of `MenuItem`: a Radix menu item. */
const MenuItemInteractive = defineComponent({
  name: "MenuItemInteractive",
  props: {
    className: [String, Array, Object] as PropType<unknown>,
    disabled: Boolean,
    onSelect: { type: Function as PropType<(event: Event) => void>, required: true },
    onItemClick: { type: Function as PropType<(event: MouseEvent) => void>, required: true },
  },
  setup(props, { slots }) {
    const { open } = useMenuContext()
    const impl = useMenuItemImpl(() => props.disabled)
    const select = useMenuItemSelect(impl, () => props.disabled, () => props.onSelect)

    // This handler patches over focus races with core Radix primitives
    // https://github.com/radix-ui/primitives/blob/main/packages/react/menu/src/Menu.tsx#L712-L734
    const handlePreventAfterClose = (evt: PointerEvent) => {
      // Prevent default behavior when we're always known to be closing
      if (!open.value) evt.preventDefault()
    }

    const listeners = selectableItemListeners(
      impl,
      select,
      { onClick: (event: MouseEvent) => props.onItemClick(event) },
      { onPointermove: handlePreventAfterClose, onPointerleave: handlePreventAfterClose },
    )

    return () =>
      h(
        "div",
        { ...impl.attrs(), "class": [s.MenuItem, props.className], "ref": impl.setElement, ...listeners },
        [h("div", { class: s.PressableInner }, slots.default?.())],
      )
  },
})

/**
 * A menu item. Interactive (focusable, selectable) when it has a `@select`
 * handler; read-only content otherwise.
 */
export const MenuItem = defineComponent({
  name: "MenuItem",
  inheritAttrs: false,
  props: {
    /**
     * Second line under the item's label: what this action does, or which
     * value it carries. The label goes semibold on its own, the same way a
     * Select option with a description does. Also a `description` slot.
     */
    description: String,
    /** Disables the menu item */
    disabled: { type: Boolean, default: false },
    /**
     * Called when the item is selected (`@select`). Without it the item is
     * read-only content. Call `event.preventDefault()` to keep the menu open.
     */
    onSelect: Function as PropType<(event: Event) => void>,
  },
  emits: {
    /** The item was clicked */
    click: (_event: MouseEvent) => true,
  },
  setup(props, { slots, attrs, emit }) {
    const onItemClick = (event: MouseEvent) => emit("click", event)

    return () => {
      const description = slots.description ? slots.description() : props.description
      // A described item stacks its two lines; without a description the item
      // keeps the plain flex row that icons and ItemActions rely on.
      const content =
        description === undefined
          ? slots.default?.()
          : [
              h("div", { class: s.ItemLeading }, [
                h("div", null, slots.default?.()),
                h("div", { class: s.ItemDescription }, description),
              ]),
            ]

      // Custom click handlers
      if (props.onSelect) {
        return h(
          MenuItemInteractive,
          { className: attrs.class, disabled: props.disabled, onSelect: props.onSelect, onItemClick },
          { default: () => content },
        )
      }

      // Read-only content - will not appear interactive.
      return h("div", { class: [s.MenuItemContent, attrs.class] }, content)
    }
  },
})

/** Hover actions at the end of an item. */
export const MenuItemActions = defineComponent({
  name: "MenuItemActions",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h("div", { class: [s.ItemActions, attrs.class] }, slots.default?.())
  },
})

/** A small ghost button inside `MenuItemActions`. Closes the menu and emits `click`. */
export const MenuItemAction = defineComponent({
  name: "MenuItemAction",
  inheritAttrs: false,
  emits: {
    click: (_event: MouseEvent) => true,
  },
  setup(_props, { slots, emit }) {
    const { setOpen } = useMenuContext()

    return () =>
      h(
        Button,
        {
          class: "rounded-sm",
          color: "secondary",
          size: "xs",
          uniform: true,
          iconSize: "sm",
          variant: "ghost",
          onClick: (evt: MouseEvent) => {
            evt.stopPropagation()
            setOpen(false)
            emit("click", evt)
          },
        },
        { default: () => slots.default?.() },
      )
  },
})

type RouteTarget = string | Record<string, unknown>

// Drops undefined entries so a router link's own `href` is not overridden
const defined = (props: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))

/**
 * A menu item that navigates. Internal paths render the provider's link
 * component; absolute URLs open in a new tab.
 */
export const MenuLink = defineComponent({
  name: "MenuLink",
  inheritAttrs: false,
  props: {
    href: String,
    /** Router link destination (internal) */
    to: [String, Object] as PropType<RouteTarget>,
    /** Disables the menu item */
    disabled: { type: Boolean, default: false },
    /**
     * Override the default component used for the link. This is useful for
     * using a routing library, or SSR rendering.
     * @default 'a'
     */
    as: [String, Object, Function] as PropType<LinkComponent>,
  },
  setup(props, { slots, attrs }) {
    const { open } = useMenuContext()
    const DefaultComponent = useLinkComponent()
    const impl = useMenuItemImpl(() => props.disabled)
    const select = useMenuItemSelect(impl, () => props.disabled, () => undefined)

    // This handler patches over focus races with core Radix primitives
    // https://github.com/radix-ui/primitives/blob/main/packages/react/menu/src/Menu.tsx#L712-L734
    const handlePreventAfterClose = (evt: PointerEvent) => {
      // Prevent default behavior when we're always known to be closing
      if (!open.value) evt.preventDefault()
    }

    return () => {
      const { href, to } = props
      const propPath = href || to
      // When a path is not provided, default to an anchor
      const isExternal = propPath ? /^https?:\/\//.test(propPath as string) : true
      const Component = props.as || (isExternal ? "a" : DefaultComponent.value)

      // The link's own attributes and listeners come first, as the slot
      // child's do in React
      const { listeners, rest } = splitListeners(attrs)
      const { class: className, ...restProps } = rest
      const linkProps = isExternal ? { target: "_blank", rel: "noopener noreferrer", href: href ?? to } : { href, to }

      const itemProps = defined({
        ...impl.attrs(),
        ...linkProps,
        ...restProps,
        class: [s.MenuItem, className],
        ref: impl.setElement,
        ...selectableItemListeners(
          impl,
          select,
          listeners,
          isExternal ? {} : { onPointermove: handlePreventAfterClose, onPointerleave: handlePreventAfterClose },
        ),
      })
      const inner = () => [h("span", { class: s.PressableInner }, slots.default?.())]

      return typeof Component === "string" ? h(Component, itemProps, inner()) : h(Component, itemProps, { default: inner })
    }
  },
})

/** A divider between items. */
export const MenuSeparator = defineComponent({
  name: "MenuSeparator",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => h("div", { "role": "separator", "aria-orientation": "horizontal", "class": [s.Separator, attrs.class] })
  },
})

/** A non-interactive label for a group of items. */
export const MenuLabel = defineComponent({
  name: "MenuLabel",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h("div", { class: [s.MenuLabel, attrs.class] }, slots.default?.())
  },
})

/** Groups related items. */
export const MenuGroup = defineComponent({
  name: "MenuGroup",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h("div", { role: "group", class: attrs.class }, slots.default?.())
  },
})

// ---------------------------------------------------------------------------
// Submenus

/** A nested menu: `MenuSubTrigger` plus `MenuSubContent`. */
export const MenuSub = defineComponent({
  name: "MenuSub",
  inheritAttrs: false,
  props: {
    /** Force the menu to remain open or closed */
    forceOpen: { type: Boolean, default: undefined },
  },
  emits: {
    /** The submenu opened */
    open: () => true,
    /** The submenu closed */
    close: () => true,
  },
  setup(props, { slots, emit }) {
    const parentLevel = useMenuLevel()
    const open = ref(false)
    const triggerRef = shallowRef<HTMLElement | null>(null)
    const isOpen = computed(() => props.forceOpen ?? open.value)

    const handleOpenChange = (nextState: boolean) => {
      open.value = nextState
      if (nextState) emit("open")
      else emit("close")
    }

    useEscCloseStack(
      () => open.value,
      () => {
        handleOpenChange(false)
        // Ensure trigger is focused
        triggerRef.value?.focus()
      },
    )

    provide(SubmenuContextKey, { open: isOpen, setOpen: handleOpenChange, triggerRef })

    // Radix's controlled submenu reports a change only when it differs from
    // the rendered state
    let renderedOpen = isOpen.value
    const setOpen = (nextState: boolean) => {
      if (nextState !== renderedOpen) handleOpenChange(nextState)
    }

    // Radix's MenuSub closes with its parent menu, and when it unmounts
    watch(
      () => parentLevel.open(),
      (parentOpen) => {
        if (parentOpen === false) setOpen(false)
      },
      { immediate: true },
    )
    onBeforeUnmount(() => setOpen(false))

    const subInternals: MenuSubInternals = {
      triggerId: useId(undefined, "reka-menu-sub-trigger"),
      contentId: useId(undefined, "reka-menu-sub-content"),
      trigger: shallowRef(null),
    }
    provide(MenuSubInternalsKey, subInternals)
    provide(MenuLevelKey, { open: () => isOpen.value, onOpenChange: setOpen, content: shallowRef(null) })

    return () => {
      renderedOpen = isOpen.value
      return h(
        RekaDropdownMenuRoot,
        { "open": renderedOpen, "modal": false, "onUpdate:open": setOpen },
        { default: () => slots.default?.() },
      )
    }
  },
})

/** The item that opens a submenu, on hover, click, Enter, Space or ArrowRight. */
export const MenuSubTrigger = defineComponent({
  name: "MenuSubTrigger",
  inheritAttrs: false,
  props: {
    /** Disables the trigger */
    disabled: { type: Boolean, default: false },
  },
  setup(props, { slots, attrs }) {
    const { open: menuOpen } = useMenuContext()
    const { triggerRef } = useSubmenuContext()
    const subLevel = useMenuLevel()
    const subInternals = useMenuSubInternals()
    const impl = useMenuItemImpl(() => props.disabled)
    const { contentContext, rootInternals } = impl

    let openTimer: number | null = null
    const clearOpenTimer = () => {
      if (openTimer) window.clearTimeout(openTimer)
      openTimer = null
    }
    onBeforeUnmount(() => {
      clearOpenTimer()
      window.clearTimeout(contentContext.pointerGraceTimer.current)
      contentContext.onPointerGraceIntentChange(null)
    })

    // This handler patches over focus races with core Radix primitives
    // https://github.com/radix-ui/primitives/blob/main/packages/react/menu/src/Menu.tsx#L712-L734
    const handlePreventAfterClose = (evt: PointerEvent) => {
      // Prevent default behavior when we know the outer menu is closing
      if (!menuOpen.value) evt.preventDefault()
    }

    const setRef = (el: unknown) => {
      impl.setElement(el)
      const element = resolveElement(el)
      subInternals.trigger.value = element
      triggerRef.value = element
    }

    const subTriggerHandlers: ItemImplHandlers = {
      onClick: (event) => {
        if (props.disabled || event.defaultPrevented) return
        /**
         * We manually focus because iOS Safari doesn't always focus on click (e.g. buttons)
         * and we rely heavily on `onFocusOutside` for submenus to close when switching
         * between separate submenus.
         */
        ;(event.currentTarget as HTMLElement).focus()
        if (!subLevel.open()) subLevel.onOpenChange(true)
      },
      onPointermove: compose(
        handlePreventAfterClose,
        whenMouse((event: PointerEvent) => {
          contentContext.onItemEnter(event)
          if (event.defaultPrevented) return
          if (!props.disabled && !subLevel.open() && !openTimer) {
            contentContext.onPointerGraceIntentChange(null)
            openTimer = window.setTimeout(() => {
              subLevel.onOpenChange(true)
              clearOpenTimer()
            }, 100)
          }
        }),
      ),
      onPointerleave: compose(
        handlePreventAfterClose,
        whenMouse((event: PointerEvent) => {
          clearOpenTimer()

          const content = subLevel.content.value
          const contentRect = content?.getBoundingClientRect()
          if (content && contentRect) {
            // TODO: make sure to update this when we change positioning logic
            const side = content.dataset.side as GraceIntent["side"]
            const rightSide = side === "right"
            const bleed = rightSide ? -5 : 5
            const contentNearEdge = contentRect[rightSide ? "left" : "right"]
            const contentFarEdge = contentRect[rightSide ? "right" : "left"]

            contentContext.onPointerGraceIntentChange({
              area: [
                // Apply a bleed on clientX to ensure that our exit point is
                // consistently within polygon bounds
                { x: event.clientX + bleed, y: event.clientY },
                { x: contentNearEdge, y: contentRect.top },
                { x: contentFarEdge, y: contentRect.top },
                { x: contentFarEdge, y: contentRect.bottom },
                { x: contentNearEdge, y: contentRect.bottom },
              ],
              side,
            })

            window.clearTimeout(contentContext.pointerGraceTimer.current)
            contentContext.pointerGraceTimer.current = window.setTimeout(
              () => contentContext.onPointerGraceIntentChange(null),
              300,
            )
          } else {
            contentContext.onTriggerLeave(event)
            if (event.defaultPrevented) return

            // There's 100ms where the user may leave an item before the submenu was opened.
            contentContext.onPointerGraceIntentChange(null)
          }
        }),
      ),
      onKeydown: (event) => {
        const isTypingAhead = contentContext.searchRef.current !== ""
        if (props.disabled || (isTypingAhead && event.key === " ")) return
        if (SUB_OPEN_KEYS[rootInternals.dir.value].includes(event.key)) {
          subLevel.onOpenChange(true)
          // The trigger may hold focus if opened via pointer interaction
          // so we ensure content is given focus again when switching to keyboard.
          subLevel.content.value?.focus()
          // prevent window from scrolling
          event.preventDefault()
        }
      },
    }

    return () => {
      const open = subLevel.open()
      return h(
        "div",
        {
          ...impl.attrs(),
          "id": subInternals.triggerId,
          "aria-haspopup": "menu",
          "aria-expanded": open,
          "aria-controls": subInternals.contentId,
          "data-state": getOpenState(open),
          "class": [s.MenuItem, s.SubMenuItem, attrs.class],
          "ref": setRef,
          ...impl.handlers(subTriggerHandlers),
        },
        [
          h("div", { class: s.PressableInner }, [
            slots.default?.(),
            h(ChevronRight, { width: "16", height: "16", class: s.SubTriggerIcon }),
          ]),
        ],
      )
    }
  },
})

/** Content of a submenu, mounted while it is open (Radix's DropdownMenuSubContent). */
const MenuSubContentImpl = defineComponent({
  name: "MenuSubContentImpl",
  props: {
    sideOffset: { type: Number, required: true },
    alignOffset: { type: Number, required: true },
    width: { type: sizeProp, required: true },
    minWidth: { type: sizeProp, required: true },
    maxHeight: Number,
  },
  setup(props, { slots }) {
    // The submenu's own Reka root: its content takes the submenu's ids
    const subRoot = injectDropdownMenuRootContext()
    const subInternals = useMenuSubInternals()
    const subLevel = useMenuLevel()
    const internals = useMenuRootInternals()
    const parentContent = inject(ParentContentKey, null)
    subRoot.triggerId = subInternals.triggerId
    subRoot.contentId = subInternals.contentId

    const { contentHandlers, resetSearch } = provideMenuContentContext(() => subLevel.content.value)
    provide(ParentContentKey, {
      resetSearch: () => {
        resetSearch()
        parentContent?.resetSearch()
      },
    })
    onMounted(() => {
      subLevel.content.value = document.getElementById(subInternals.contentId)
    })
    onBeforeUnmount(() => {
      subLevel.content.value = null
    })

    const handlers = contentHandlers(internals.isUsingKeyboard)

    const onKeydown = (event: KeyboardEvent) => {
      const currentTarget = event.currentTarget as HTMLElement
      const isKeyDownInside = currentTarget.contains(event.target as Node)
      const isCloseKey = SUB_CLOSE_KEYS[internals.dir.value].includes(event.key)
      if (isKeyDownInside && isCloseKey) {
        subLevel.onOpenChange(false)
        // We focus manually because we prevented it in `onCloseAutoFocus`
        subInternals.trigger.value?.focus()
        // prevent window from scrolling
        event.preventDefault()
      }
      handlers.onKeydown(event)
    }

    return () =>
      h(
        RekaDropdownMenuContent,
        {
          "side": internals.dir.value === "rtl" ? "left" : "right",
          "align": "start",
          "sideOffset": props.sideOffset,
          "alignOffset": props.alignOffset,
          "avoidCollisions": true,
          "collisionPadding": COLLISION_PADDING,
          "reference": subInternals.trigger.value ?? undefined,
          "class": s.MenuList,
          "style": {
            ...toCssVariables({
              "menu-width": props.width,
              "menu-min-width": props.minWidth,
              "menu-max-height": props.maxHeight,
            }),
            ...contentVariables,
          },
          "onOpenAutoFocus": (event: Event) => {
            // when opening a submenu, focus content for keyboard users only
            if (internals.isUsingKeyboard.current) subLevel.content.value?.focus()
            event.preventDefault()
          },
          // The menu might close because of focusing another menu item in the parent menu. We
          // don't want it to refocus the trigger in that case so we handle trigger focus ourselves.
          "onCloseAutoFocus": preventDefaultHandler,
          // Radix submenus close on focus outside (except to their trigger) and
          // never on an outside pointer-down
          "onPointerDownOutside": preventDefaultHandler,
          "onFocusOutside": (event: Event) => {
            // We prevent closing when the trigger is focused to avoid triggering a re-open animation
            // on pointer interaction.
            if (event.target !== subInternals.trigger.value) subLevel.onOpenChange(false)
            event.preventDefault()
          },
          "onEscapeKeyDown": preventDefaultHandler,
          ...handlers,
          onKeydown,
          // A blur inside a submenu reaches its parent menus in React's tree
          "onFocusout": () => {
            handlers.onFocusout()
            parentContent?.resetSearch()
          },
        },
        { default: () => slots.default?.() },
      )
  },
})

/** The submenu panel, positioned to the side of its trigger. */
export const MenuSubContent = defineComponent({
  name: "MenuSubContent",
  inheritAttrs: false,
  props: {
    /** The distance in pixels from the trigger. @default 4 */
    sideOffset: { type: Number, default: 4 },
    /** An offset in pixels along the trigger. @default -6 */
    alignOffset: { type: Number, default: -6 },
    /** Defines the `width` property of the content. @default "auto" */
    width: { type: sizeProp, default: "auto" },
    /** Defines the `min-width` property of the content. @default "auto" */
    minWidth: { type: sizeProp, default: "auto" },
    /** Defines the `max-height` property of the content, in pixels. */
    maxHeight: Number,
  },
  setup(props, { slots }) {
    const { open } = useSubmenuContext()

    return () =>
      h(
        RekaDropdownMenuPortal,
        null,
        {
          default: () => [
            h(
              TransitionGroup,
              { class: s.Menu, enterDuration: 350, exitDuration: 200, disableAnimations: true },
              {
                default: () => [
                  open.value
                    ? h(MenuSubContentImpl, { key: "submenu", ...props }, { default: () => slots.default?.() })
                    : createCommentVNode(),
                ],
              },
            ),
          ],
        },
      )
  },
})

// ---------------------------------------------------------------------------
// Checkbox and radio items

/** Radix's ItemIndicator: rendered while its item is checked. */
const MenuItemIndicator = defineComponent({
  name: "MenuItemIndicator",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const indicator = inject(ItemIndicatorKey, { checked: () => false })

    return () => {
      const checked = indicator.checked()
      // Rendered here: Presence calls its slot during its setup too
      const children = slots.default?.()
      return h(
        Presence,
        { present: isIndeterminate(checked) || checked === true },
        {
          // withCtx marks it as a render slot so Vue does not warn about that call
          default: withCtx(() => [h("span", { ...attrs, "data-state": getCheckedState(checked) }, children)]),
        },
      )
    }
  },
})

/** Single selection: `v-model:value` on the group, `MenuRadioItem` children. */
export const MenuRadioGroup = defineComponent({
  name: "MenuRadioGroup",
  props: {
    /** The selected value (`v-model:value`) */
    value: String,
    /**
     * The orientation of the indicator within the radio item.
     * @default end
     */
    indicatorPosition: { type: String as PropType<"start" | "end">, default: "end" },
  },
  emits: {
    "update:value": (_value: string) => true,
    /** Fired when selection changes */
    "change": (_value: string) => true,
  },
  setup(props, { slots, emit }) {
    provide(RadioGroupKey, {
      value: () => props.value,
      onValueChange: (value) => {
        emit("update:value", value)
        emit("change", value)
      },
    })

    return () =>
      h("div", { "role": "group", "data-indicator-position": props.indicatorPosition }, slots.default?.())
  },
})

/** One option of a `MenuRadioGroup`. */
export const MenuRadioItem = defineComponent({
  name: "MenuRadioItem",
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    /** Disables the radio item */
    disabled: { type: Boolean, default: false },
  },
  emits: {
    /** The radio item was pressed; `event.preventDefault()` keeps the menu open */
    select: (_event: Event) => true,
  },
  setup(props, { slots, attrs, emit }) {
    const group = inject(RadioGroupKey, { value: () => undefined, onValueChange: () => {} })
    const checked = () => props.value === group.value()
    provide(ItemIndicatorKey, { checked })

    const impl = useMenuItemImpl(() => props.disabled)
    const select = useMenuItemSelect(
      impl,
      () => props.disabled,
      () => (event: Event) => {
        emit("select", event)
        group.onValueChange(props.value)
      },
    )

    return () => {
      const { listeners, rest } = splitListeners(attrs)
      const { class: className, ...restProps } = rest
      return h(
        "div",
        {
          ...impl.attrs(),
          "role": "menuitemradio",
          "aria-checked": checked(),
          "class": [s.MenuItem, s.RadioItem, className],
          ...restProps,
          "data-state": getCheckedState(checked()),
          "ref": impl.setElement,
          ...selectableItemListeners(impl, select, listeners),
        },
        [
          h("div", { class: s.PressableInner }, [
            h("div", { class: s.RadioIndicator }, [h(MenuItemIndicator, { class: s.RadioIndicatorActive })]),
            slots.default?.(),
          ]),
        ],
      )
    }
  },
})

/** A toggle item: bind `v-model:checked`. */
export const MenuCheckboxItem = defineComponent({
  name: "MenuCheckboxItem",
  inheritAttrs: false,
  props: {
    /** Checked state of the checkbox item (`v-model:checked`) */
    checked: { type: [Boolean, String] as PropType<CheckedState>, default: false },
    /** Disables the checkbox item */
    disabled: { type: Boolean, default: false },
    /**
     * The orientation of the indicator within the checkbox item.
     * @default end
     */
    indicatorPosition: { type: String as PropType<"start" | "end">, default: "end" },
    /**
     * Visual treatment for the checkbox indicator.
     * @default solid
     */
    indicatorVariant: { type: String as PropType<"solid" | "ghost">, default: "solid" },
  },
  emits: {
    "update:checked": (_checked: boolean) => true,
    /** Event handler called when the checked state changes */
    "checkedChange": (_checked: boolean) => true,
    /** The checkbox item was pressed; `event.preventDefault()` keeps the menu open */
    "select": (_event: Event) => true,
  },
  setup(props, { slots, attrs, emit }) {
    provide(ItemIndicatorKey, { checked: () => props.checked })

    const impl = useMenuItemImpl(() => props.disabled)
    const select = useMenuItemSelect(
      impl,
      () => props.disabled,
      () => (event: Event) => {
        emit("select", event)
        const next = isIndeterminate(props.checked) ? true : !props.checked
        emit("update:checked", next)
        emit("checkedChange", next)
      },
    )

    return () => {
      const { listeners, rest } = splitListeners(attrs)
      const { class: className, ...restProps } = rest
      const { checked } = props
      return h(
        "div",
        {
          ...impl.attrs(),
          "role": "menuitemcheckbox",
          "aria-checked": isIndeterminate(checked) ? "mixed" : checked,
          "class": [s.MenuItem, s.CheckboxItem, className],
          ...restProps,
          "data-state": getCheckedState(checked),
          "data-indicator-position": props.indicatorPosition,
          "data-indicator-variant": props.indicatorVariant,
          "ref": impl.setElement,
          ...selectableItemListeners(impl, select, listeners),
        },
        [
          h("div", { class: s.PressableInner }, [
            h("div", { class: s.CheckboxIndicator }, [
              h(MenuItemIndicator, null, {
                default: () =>
                  props.indicatorVariant === "ghost"
                    ? [h(Check, { class: "size-4" })]
                    : [h("div", { class: s.CheckboxCircle }, [h(Check, { class: "size-4" })])],
              }),
            ]),
            slots.default?.(),
          ]),
        ],
      )
    }
  },
})

export type MenuProps = InstanceType<typeof Menu>["$props"]
export type MenuContentProps = InstanceType<typeof MenuContent>["$props"]
export type MenuItemProps = InstanceType<typeof MenuItem>["$props"]
export type SubmenuProps = InstanceType<typeof MenuSub>["$props"]
export type MenuRadioGroupProps = InstanceType<typeof MenuRadioGroup>["$props"]
export type MenuRadioItemProps = InstanceType<typeof MenuRadioItem>["$props"]
export type MenuCheckboxItemProps = InstanceType<typeof MenuCheckboxItem>["$props"]
