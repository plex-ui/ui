import {
  Comment,
  Fragment,
  Text,
  computed,
  defineComponent,
  h,
  inject,
  isVNode,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  ref,
  shallowRef,
  watch,
  type Component,
  type ComputedRef,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import { RovingFocusGroup, RovingFocusItem } from "reka-ui"
import type { ControlSize, SemanticColors, Sizes, Variants } from "@plexui/styles/types"
import { handlePressableMouseEnter, waitForAnimationFrame } from "../../lib/helpers.js"
import ChevronDownMd from "../Icon/svg/ChevronDownMd.js"
import { LoadingIndicator } from "../Indicator/index.js"
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../Menu/index.js"
import { fitCount, visibleTabCount } from "./overflow.js"
import s from "@plexui/styles/components/Tabs/Tabs.module.css"

// Vue port of packages/ui/src/components/Tabs/Tabs.tsx. Props, defaults,
// rendered DOM and behaviour match React (checked by the parity tests).
//
// React builds on Radix ToggleGroup (type="single"). Reka's ToggleGroupItem
// renders Toggle semantics (`aria-pressed`, `data-active`, no `role="radio"`)
// and runs its click toggle before handlers the caller passes, so the
// single-select part of Radix ToggleGroup/Toggle (about twenty lines) is
// inlined here, and keyboard focus comes from Reka's RovingFocusGroup and
// RovingFocusItem, the same roving tabindex Radix ToggleGroup uses.

export type SizeVariant = "2xs" | "xs" | "sm" | "md" | "lg" | "xl"
export type TabsVariant = "segmented" | "underline"
export type TabsOrientation = "horizontal" | "vertical"

/** Content React accepts as a ReactNode, in Vue terms */
type TabsContent = string | number | VNode | VNodeArrayChildren

/** Badge configuration for TabsTab: a plain value, or an object with content and styling */
export type TabsBadgeProp =
  | string
  | number
  | VNode
  | {
      content: TabsContent
      color?: SemanticColors<"secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution">
      variant?: Variants<"soft" | "solid">
      pill?: boolean
      loading?: boolean
    }

/** Icon for TabsTab: a component (e.g. an icon from @plexui/vue), a vnode, or text */
export type TabsIconProp = string | VNode | Component

type TabsContextValue = {
  value: ComputedRef<string>
  disabled: ComputedRef<boolean>
  setValue: (nextValue: string) => void
}

const TabsContextKey: InjectionKey<TabsContextValue> = Symbol("PlexUITabs")

type ExposedRovingFocusGroup = { getItems: () => { ref: HTMLElement }[] }

type ResizeEntryBox = "contentBoxSize" | "borderBoxSize" | "devicePixelContentBoxSize"

// Same reading as usehooks-ts' useResizeObserver (content-box)
const extractSize = (entry: ResizeObserverEntry, box: ResizeEntryBox, sizeType: "inlineSize" | "blockSize") => {
  const boxSize = entry[box] as ResizeObserverSize[] | ResizeObserverSize | undefined
  if (!boxSize) {
    if (box === "contentBoxSize") {
      return entry.contentRect[sizeType === "inlineSize" ? "width" : "height"]
    }
    return undefined
  }
  return Array.isArray(boxSize) ? boxSize[0][sizeType] : boxSize[sizeType]
}

// Radix RovingFocusGroup's focusFirst
const focusFirst = (candidates: HTMLElement[]) => {
  const previouslyFocused = document.activeElement
  for (const candidate of candidates) {
    if (candidate === previouslyFocused) return
    candidate.focus({ preventScroll: false })
    if (document.activeElement !== previouslyFocused) return
  }
}

const callHandlers = (handlers: unknown, event: Event) => {
  for (const handler of Array.isArray(handlers) ? handlers : [handlers]) {
    if (typeof handler === "function") handler(event)
  }
}

// Events a caller's handler called preventDefault() on. React's synthetic
// event reports that call in `defaultPrevented` even when the native event is
// not cancelable (focus), for every later handler of the same event.
const preventedEvents = new WeakSet<Event>()

const isPrevented = (event: Event) => event.defaultPrevented || preventedEvents.has(event)

const callCallerHandlers = (handlers: unknown, event: Event) => {
  if (!handlers) return
  const preventDefault = event.preventDefault
  event.preventDefault = () => {
    preventedEvents.add(event)
    preventDefault.call(event)
  }
  try {
    callHandlers(handlers, event)
  } finally {
    Reflect.deleteProperty(event, "preventDefault")
  }
}

// Internal: the element Tabs and TabsTab render through Reka's
// RovingFocusGroup and RovingFocusItem with `asChild`. Reka merges its
// handlers into these attrs and would run them before the caller's. Radix
// composes them the other way (composeEventHandlers): the caller's handler
// runs first, and Radix skips its own once the event is default-prevented.
// So the caller's listeners for the `composed` events arrive separately in
// `listeners` and are composed that way here.
const RovingElement = defineComponent({
  name: "TabsRovingElement",
  inheritAttrs: false,
  props: {
    as: { type: String, required: true },
    elementRef: Object as PropType<Ref<HTMLElement | null>>,
    /** Events whose Reka handler Radix composes after the caller's */
    composed: { type: Array as PropType<string[]>, required: true },
    /** The caller's listeners for the `composed` events */
    listeners: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const handlers: Record<string, (event: Event) => void> = {}
      for (const key of props.composed) {
        const caller = props.listeners[key]
        const internal = attrs[key]
        handlers[key] = (event: Event) => {
          callCallerHandlers(caller, event)
          if (!isPrevented(event)) callHandlers(internal, event)
        }
      }
      return h(props.as, { ...attrs, ...handlers, ref: props.elementRef }, slots.default?.())
    }
  },
})

/** Splits the caller's listeners for `keys` from the other attributes. */
const splitListeners = (attrs: Record<string, unknown>, keys: string[]) => {
  const listeners: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (keys.includes(key)) listeners[key] = value
    else rest[key] = value
  }
  return { listeners, rest }
}

// Radix RovingFocusGroup composes mousedown, focus and blur; its items
// mousedown and focus (keydown too, which Reka already leaves to the caller)
const GROUP_COMPOSED = ["onMousedown", "onFocus", "onBlur"]
const ITEM_COMPOSED = ["onMousedown", "onFocus"]

const tabsProps = {
  /** Controlled value for the group. Bind with `v-model:value`; leave unset for an uncontrolled group. */
  value: String,
  /**
   * Visual variant of the tab group
   * - `"segmented"`: background container with sliding highlight (default)
   * - `"underline"`: no background, animated line indicator under active tab
   * @default "segmented"
   */
  variant: { type: String as PropType<TabsVariant>, default: "segmented" },
  /** Orientation of the tab layout. @default "horizontal" */
  orientation: { type: String as PropType<TabsOrientation>, default: "horizontal" },
  /** Controls the size of the tabs, `3xs` (22px) to `3xl` (48px). @default "md" */
  size: { type: String as PropType<ControlSize>, default: "md" },
  /** Controls gutter on the edges of the tabs, defaults to value from `size`. */
  gutterSize: String as PropType<Sizes<"2xs" | "xs" | "sm" | "md" | "lg" | "xl">>,
  /** Disable the entire group. @default false */
  disabled: { type: Boolean, default: false },
  /** Display the control as a block element with equal width segments. @default false */
  block: { type: Boolean, default: false },
  /** Fully rounded pill shape. Only applies to the `"segmented"` variant. @default true */
  pill: { type: Boolean, default: true },
  /**
   * Flush underline style: no tab padding, so the indicator matches the text
   * width, gap spacing and no bottom border. Only applies to the `"underline"` variant.
   * @default false
   */
  flush: { type: Boolean, default: false },
}

const tabsEmits = {
  /** A new value was selected (`v-model:value`) */
  "update:value": (_value: string) => true,
  /** Same payload as `update:value`, named after React's `onChange` */
  "change": (_value: string) => true,
  /** Any click on the control, even if a new value was not selected */
  "click": (_event: MouseEvent) => true,
}

// The group itself. `Tabs` renders it as it is, or measures and splits it
// for `overflow="menu"`
const TabsComponent = defineComponent({
  name: "TabsRoot",
  inheritAttrs: false,
  props: tabsProps,
  emits: tabsEmits,
  setup(props, { slots, attrs, emit }) {
    const rootRef = ref<HTMLDivElement | null>(null)
    const thumbRef = ref<HTMLDivElement | null>(null)
    const groupRef = ref<ExposedRovingFocusGroup | null>(null)
    let prevSize = props.size

    // Radix useControllableState: `value` undefined means uncontrolled, starting empty
    const uncontrolledValue = ref("")
    const currentValue = computed(() => (props.value !== undefined ? props.value : uncontrolledValue.value))

    const handleValueChange = (nextValue: string) => {
      // Only trigger onChange when a value exists
      // Disallow toggling off enabled items
      if (nextValue) {
        emit("update:value", nextValue)
        emit("change", nextValue)
      }
    }

    const setValue = (nextValue: string) => {
      if (props.value !== undefined) {
        if (nextValue !== props.value) handleValueChange(nextValue)
      } else {
        uncontrolledValue.value = nextValue
      }
    }

    // Radix reports uncontrolled changes from an effect, after the click has
    // finished bubbling (so the group's `click` comes first)
    watch(uncontrolledValue, handleValueChange, { flush: "post" })

    provide(TabsContextKey, {
      value: currentValue,
      disabled: computed(() => props.disabled),
      setValue,
    })

    const applyThumbSizing = (isVertical: boolean, attemptScroll: boolean) => {
      const root = rootRef.value
      const thumb = thumbRef.value

      if (!root || !thumb) {
        return
      }

      // Get selected node
      const activeNode = root.querySelector<HTMLDivElement>('[data-state="on"]')

      // Impossible
      if (!activeNode) {
        return
      }

      if (isVertical) {
        const rootHeight = root.clientHeight
        let targetHeight = Math.floor(activeNode.clientHeight)
        const targetOffset = activeNode.offsetTop

        // Detect subpixel edge case
        if (rootHeight - (targetHeight + targetOffset) < 2) {
          targetHeight = targetHeight - 1
        }

        thumb.style.height = `${Math.floor(targetHeight)}px`
        thumb.style.width = ""
        thumb.style.transform = `translateY(${targetOffset}px)`

        // Scroll into view if needed
        if (root.scrollHeight > rootHeight) {
          const buffer = rootHeight * 0.15
          const scrollTop = root.scrollTop
          const top = activeNode.offsetTop
          const bottom = top + targetHeight
          if (top < scrollTop + buffer || bottom > scrollTop + rootHeight - buffer) {
            if (attemptScroll) {
              activeNode.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
            }
          }
        }
      } else {
        const rootWidth = root.clientWidth
        let targetWidth = Math.floor(activeNode.clientWidth)
        const targetOffset = activeNode.offsetLeft

        // Detect if the thumb is moving too far to the edge of the container.
        // This would most commonly be due to subpixel widths adding up to excessive distance.
        if (rootWidth - (targetWidth + targetOffset) < 2) {
          targetWidth = targetWidth - 1
        }

        thumb.style.width = `${Math.floor(targetWidth)}px`
        thumb.style.height = ""
        thumb.style.transform = `translateX(${targetOffset}px)`

        // If the control is scrollable, ensure the active option is visible
        if (root.scrollWidth > rootWidth) {
          // Only scroll items near the edge, but not the inner 2/3.
          const buffer = rootWidth * 0.15
          const scrollLeft = root.scrollLeft
          const left = activeNode.offsetLeft
          const right = left + targetWidth
          if (left < scrollLeft + buffer || right > scrollLeft + rootWidth - buffer) {
            // Cheap trick to avoid unintentional scroll on mount - transition is set after mounting
            if (attemptScroll) {
              activeNode.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })
            }
          }
        }
      }
    }

    // React's useLayoutEffect on [value, size, gutterSize, pill, flush, isVertical].
    // `value` is the prop, so an uncontrolled selection does not move the thumb
    // until the next resize, exactly as in React.
    const syncThumb = () => {
      const root = rootRef.value
      const thumb = thumbRef.value

      if (!root || !thumb) {
        return
      }

      const isVertical = props.orientation === "vertical"
      const transitionProperty = isVertical
        ? "height 300ms var(--cubic-enter), transform 300ms var(--cubic-enter)"
        : "width 300ms var(--cubic-enter), transform 300ms var(--cubic-enter)"

      const sizeChanged = prevSize !== props.size
      prevSize = props.size

      if (sizeChanged) {
        // Size changed - disable transition, wait for CSS, then apply sizing
        const currentTransition = thumb.style.transition
        thumb.style.transition = ""

        waitForAnimationFrame(() => {
          applyThumbSizing(isVertical, false)
          waitForAnimationFrame(() => {
            thumb.style.transition = currentTransition
          })
        })
      } else {
        // Normal update (value change, etc.)
        waitForAnimationFrame(() => {
          applyThumbSizing(isVertical, !!thumb.style.transition)

          // Apply transition after initial calculation is set
          if (!thumb.style.transition) {
            waitForAnimationFrame(() => {
              thumb.style.transition = transitionProperty
            })
          }
        })
      }
    }

    watch(
      [
        () => props.value,
        () => props.size,
        () => props.gutterSize,
        () => props.pill,
        () => props.flush,
        () => props.orientation === "vertical",
      ],
      syncThumb,
      { flush: "post" },
    )

    let observer: ResizeObserver | undefined

    onMounted(() => {
      syncThumb()

      // usehooks-ts useResizeObserver: only fires when the content box changed
      const root = rootRef.value
      if (!root || typeof window === "undefined" || !("ResizeObserver" in window)) {
        return
      }
      const previousSize: { width?: number; height?: number } = { width: undefined, height: undefined }
      observer = new ResizeObserver(([entry]) => {
        const width = extractSize(entry, "contentBoxSize", "inlineSize")
        const height = extractSize(entry, "contentBoxSize", "blockSize")
        if (previousSize.width === width && previousSize.height === height) {
          return
        }
        previousSize.width = width
        previousSize.height = height

        const thumb = thumbRef.value
        if (!thumb) {
          return
        }

        // Perform the size update instantly
        const currentTransition = thumb.style.transition
        thumb.style.transition = ""
        applyThumbSizing(props.orientation === "vertical", false)
        thumb.style.transition = currentTransition
      })
      observer.observe(root, { box: "content-box" })
    })

    // Tabs added, removed, reordered or relabelled move the active tab without
    // resizing the group: measure again, instantly, like a resize
    let mutationObserver: MutationObserver | undefined
    onMounted(() => {
      const root = rootRef.value
      if (!root || typeof MutationObserver === "undefined") return
      mutationObserver = new MutationObserver(() => {
        const thumb = thumbRef.value
        if (!thumb) return
        const currentTransition = thumb.style.transition
        thumb.style.transition = ""
        applyThumbSizing(props.orientation === "vertical", false)
        thumb.style.transition = currentTransition
      })
      mutationObserver.observe(root, { childList: true, characterData: true, subtree: true })
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
      mutationObserver?.disconnect()
    })

    // Radix moves focus into the group onto the selected tab, then the last
    // focused one, then the first. Reka looks for a `data-active` attribute
    // that Radix does not render, so its entry focus is replaced here.
    const handleEntryFocus = (event: Event) => {
      event.preventDefault()
      const items = (groupRef.value?.getItems() ?? []).map((item) => item.ref)
      const activeItem = items.find((item) => item.getAttribute("data-state") === "on")
      const currentItem = items.find((item) => item.getAttribute("tabindex") === "0")
      focusFirst([activeItem, currentItem, ...items].filter((item): item is HTMLElement => !!item))
    }

    return () => {
      const { class: className, dir, ...otherAttrs } = attrs
      const { listeners, rest: restAttrs } = splitListeners(otherAttrs, GROUP_COMPOSED)
      // Only apply pill for segmented variant
      const isPill = props.variant === "segmented" && props.pill
      // Only apply flush for underline variant
      const isFlush = props.variant === "underline" && props.flush

      return h(
        RovingFocusGroup,
        {
          ref: groupRef,
          asChild: true,
          loop: false,
          dir: dir as "ltr" | "rtl" | undefined,
          onEntryFocus: handleEntryFocus,
        },
        {
          default: () =>
            h(
              RovingElement,
              {
                "as": "div",
                "elementRef": rootRef,
                "composed": GROUP_COMPOSED,
                "listeners": listeners,
                "class": [s.Tabs, className],
                // `dir` comes from RovingFocusGroup ("ltr" unless set), like Radix
                // Radix ToggleGroup type="single" (radix-ui 1.8) is a radiogroup
                "role": "radiogroup",
                "onClick": (event: MouseEvent) => emit("click", event),
                "data-variant": props.variant,
                "data-orientation": props.orientation,
                "data-block": props.block ? "" : undefined,
                "data-pill": isPill ? "" : undefined,
                "data-flush": isFlush ? "" : undefined,
                "data-size": props.size,
                "data-gutter-size": props.gutterSize,
                ...restAttrs,
              },
              { default: () => [h("div", { class: s.TabsThumb, ref: thumbRef }), slots.default?.()] },
            ),
        },
      )
    }
  },
})


const useTabsContext = () => {
  const context = inject(TabsContextKey, null)

  if (!context) {
    throw new Error("`TabsTab` must be used within `Tabs`")
  }

  return context
}

const hasContent = (nodes: VNode[] | undefined): nodes is VNode[] =>
  !!nodes?.some((node) => {
    if (!isVNode(node)) return node != null && typeof node !== "boolean" && String(node) !== ""
    if (node.type === Comment) return false
    if (node.type === Text) return String(node.children ?? "") !== ""
    if (Array.isArray(node.children) && typeof node.type === "symbol") return hasContent(node.children as VNode[])
    return true
  })

const isBadgeObject = (badge: TabsBadgeProp | undefined): badge is Extract<TabsBadgeProp, { content: unknown }> =>
  badge != null && typeof badge === "object" && "content" in badge

const renderIcon = (icon: TabsIconProp | undefined) => {
  if (icon == null || typeof icon === "string" || isVNode(icon)) return icon
  return h(icon)
}

const TabComponent = defineComponent({
  name: "TabsTab",
  inheritAttrs: false,
  props: {
    /** Tab value */
    value: { type: String, required: true },
    /** Icon before the text content: a component, a vnode or text. The `icon` slot takes precedence. */
    icon: [String, Object, Function] as PropType<TabsIconProp>,
    /**
     * Badge after the text content: a plain value, or an object with
     * `content`, `color`, `variant`, `pill` and `loading`. The `badge` slot
     * replaces the content and keeps the object's styling.
     */
    badge: { type: [String, Number, Object] as PropType<TabsBadgeProp>, default: undefined },
    /** Disable the individual tab */
    disabled: { type: Boolean, default: undefined },
  },
  setup(props, { slots, attrs }) {
    const context = useTabsContext()

    return () => {
      const disabled = context.disabled.value || !!props.disabled
      const selected = context.value.value
      const pressed = !!selected && selected === props.value
      const { onClick, ...otherAttrs } = attrs
      const { listeners, rest: restAttrs } = splitListeners(otherAttrs, ITEM_COMPOSED)

      // Normalize badge prop; the slot replaces its content
      const badgeSlot = slots.badge?.()
      const badgeObject = isBadgeObject(props.badge) ? props.badge : undefined
      const badgeProps = hasContent(badgeSlot)
        ? { ...badgeObject, content: badgeSlot }
        : props.badge != null
          ? (badgeObject ?? { content: props.badge as TabsContent })
          : null

      const children = slots.default?.()
      const iconSlot = slots.icon?.()

      // Radix Toggle: the caller's click handler runs first and can cancel the toggle
      const handleClick = (event: MouseEvent) => {
        // React does not dispatch mouse handlers on a disabled button
        if (disabled) return
        callHandlers(onClick, event)
        if (event.defaultPrevented) return
        context.setValue(pressed ? "" : props.value)
      }

      return h(
        RovingFocusItem,
        { asChild: true, focusable: !disabled, active: pressed },
        {
          default: () =>
            h(
              RovingElement,
              {
                "as": "button",
                "composed": ITEM_COMPOSED,
                "listeners": listeners,
                // Radix Toggle defaults, then the single-select radio semantics
                "type": "button",
                "data-state": pressed ? "on" : "off",
                "data-disabled": disabled ? "" : undefined,
                "role": "radio",
                "aria-checked": pressed,
                // Reka's RovingFocusItem marks the active item; Radix does not
                "data-active": undefined,
                // Caller attributes win, as React spreads them after `className`
                "class": s.Tab,
                ...restAttrs,
                "disabled": disabled,
                "onPointerenter": handlePressableMouseEnter,
                "onClick": handleClick,
              },
              {
                default: () => [
                  h("span", { class: s.TabContent }, [
                    hasContent(iconSlot) ? iconSlot : renderIcon(props.icon),
                    hasContent(children) ? h("span", null, children) : null,
                    badgeProps
                      ? h(
                          "span",
                          {
                            "class": s.TabBadge,
                            "data-color": badgeProps.color ?? "secondary",
                            "data-variant": badgeProps.variant ?? "soft",
                            "data-pill": badgeProps.pill ? "" : undefined,
                          },
                          badgeProps.loading ? [h(LoadingIndicator)] : [badgeProps.content as VNodeArrayChildren[number]],
                        )
                      : null,
                  ]),
                ],
              },
            ),
        },
      )
    }
  },
})

type TabOwnProps = InstanceType<typeof TabComponent>["$props"]

/** TabsTab props; other attributes (`aria-label`, ...) fall through to the button. */
export type TabProps = TabOwnProps & { "aria-label"?: string }

export const TabsTab = TabComponent as typeof TabComponent & { new (): { $props: TabProps } }

/** Backward-compat alias of `TabsTab`, like React's `Tabs.Option` */
export const TabsOption: typeof TabsTab = TabsTab

// ---------------------------------------------------------------------------
// overflow="menu" (React's OverflowTabs)

/** Value of the menu button; no real tab has it */
const MORE_VALUE = "__plexui_tabs_more__"

type Slots = Record<string, ((...args: unknown[]) => VNodeArrayChildren) | undefined>

/** The TabsTab vnodes of a default slot, through fragments (`v-for`, `<template>`) */
const tabVNodes = (nodes: VNodeArrayChildren | undefined): VNode[] =>
  (nodes ?? []).flatMap((node) => {
    if (!isVNode(node)) return []
    if (node.type === Fragment && Array.isArray(node.children)) return tabVNodes(node.children as VNodeArrayChildren)
    return node.type === TabComponent ? [node] : []
  })

const slotsOf = (node: VNode) => (node.children && typeof node.children === "object" && !Array.isArray(node.children) ? (node.children as Slots) : {})

/** A tab's slot content; a vnode's raw slot may return a string or nothing */
const slotContent = (node: VNode, name: string): VNodeArrayChildren => {
  const content = slotsOf(node)[name]?.() as VNodeArrayChildren | VNodeArrayChildren[number] | undefined
  if (content == null) return []
  return Array.isArray(content) ? content : [content]
}

const labelContent = (node: VNode) => slotContent(node, "default")

const plainText = (node: unknown): string => {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(plainText).join("")
  if (isVNode(node)) {
    if (node.type === Comment) return ""
    if (typeof node.children === "string") return node.children
    if (Array.isArray(node.children)) return plainText(node.children)
    return plainText(labelContent(node))
  }
  return ""
}

const tabProps = (node: VNode) => (node.props ?? {}) as Record<string, unknown>

/** Slot content that renders something: text, or a vnode other than a comment */
const filled = (nodes: VNodeArrayChildren) =>
  plainText(nodes) !== "" || nodes.some((node) => isVNode(node) && node.type !== Comment)

const badgeText = (badge: unknown) => (isBadgeObject(badge as TabsBadgeProp) ? plainText((badge as { content: unknown }).content) : plainText(badge))

/** A tab's icon: the `icon` slot, else the prop */
const tabIcon = (node: VNode) => {
  const iconSlot = slotContent(node, "icon")
  return filled(iconSlot) ? iconSlot : renderIcon(tabProps(node).icon as TabsIconProp | undefined)
}

/** A tab's count as text: the `badge` slot, else the prop */
const tabCount = (node: VNode) => plainText(slotContent(node, "badge")) || badgeText(tabProps(node).badge)

/** A raw vnode prop holds a boolean attribute as written: `<TabsTab disabled>` is "" */
const tabDisabled = (node: VNode) => {
  const disabled = tabProps(node).disabled
  return disabled != null && disabled !== false
}

/** A tab's name: its text, else its accessible name, else its value */
const tabLabel = (node: VNode) =>
  plainText(labelContent(node)) || (tabProps(node)["aria-label"] as string | undefined) || String(tabProps(node).value)

/** What a tab's width depends on: the strip measures again when it changes */
const tabsSignature = (nodes: VNode[]) =>
  nodes
    .map((node) =>
      [
        tabProps(node).value,
        plainText(labelContent(node)),
        tabCount(node),
        tabProps(node).icon != null || slotsOf(node).icon != null,
      ].join("\u0000"),
    )
    .join("\u0001")

/**
 * MenuTrigger sets `data-state` (open or closed) on its child, while a tab
 * keeps `on` or `off` in the same attribute and the thumb finds the active tab
 * by it. The menu's value does not reach the tab; its handlers and
 * `aria-haspopup` / `aria-expanded` do.
 */
const MoreTab = defineComponent({
  name: "TabsMoreTab",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      const { "data-state": _menuState, ...rest } = attrs
      return h(TabComponent, rest as TabProps, slots)
    }
  },
})

const TabsPublic = defineComponent({
  name: "Tabs",
  inheritAttrs: false,
  props: {
    ...tabsProps,
    /**
     * What happens to tabs that do not fit in one row: the strip scrolls
     * sideways (`scroll`), or they move into a menu at its end (`menu`). The
     * menu button shows the active tab's name when it is a hidden one.
     * Horizontal tabs without `block` only.
     * @default "scroll"
     */
    overflow: { type: String as PropType<"scroll" | "menu">, default: "scroll" },
    /** Text of the menu button with `overflow="menu"`. @default "More" */
    overflowLabel: { type: String, default: "More" },
  },
  emits: tabsEmits,
  setup(props, { slots, attrs, emit }) {
    const hostRef = ref<HTMLDivElement | null>(null)
    // Uncontrolled like the group: `value` unset starts empty
    const uncontrolledValue = ref("")
    const current = computed(() => (props.value !== undefined ? props.value : uncontrolledValue.value))
    const select = (next: string) => {
      if (props.value === undefined) uncontrolledValue.value = next
      emit("update:value", next)
      emit("change", next)
    }

    // { count: null } while the measuring pass renders every tab and the
    // menu button; a new object each time, so an unchanged count still renders
    const measured = shallowRef<{ count: number | null }>({ count: null })
    let measuredSignature = ""
    let measuredActive = -1
    let lastRender = { measuring: true, signature: "", activeIndex: -1, length: 0 }
    let boxWidth = -1

    const measure = () => {
      if (!lastRender.measuring) return
      const root = hostRef.value?.firstElementChild
      if (!(root instanceof HTMLElement)) return

      const buttons = Array.from(root.querySelectorAll<HTMLElement>(":scope > button"))
      if (buttons.length !== lastRender.length + 1) return

      const widths = buttons.map((button) => button.getBoundingClientRect().width)
      const moreButton = buttons[buttons.length - 1]
      const moreWidth = widths.pop() ?? 0
      const style = getComputedStyle(root)
      const available =
        root.getBoundingClientRect().width -
        (Number.parseFloat(style.paddingLeft) || 0) -
        (Number.parseFloat(style.paddingRight) || 0)
      const gap = Number.parseFloat(style.columnGap) || 0
      boxWidth = hostRef.value?.parentElement?.clientWidth ?? -1
      measuredSignature = lastRender.signature
      measuredActive = lastRender.activeIndex

      if (available <= 0) {
        measured.value = { count: lastRender.length }
        return
      }

      const { activeIndex } = lastRender
      const chevron = moreButton?.querySelector("svg")
      const chevronWidth = chevron?.getBoundingClientRect().width ?? 0
      const labelGap = chevron?.parentElement ? Number.parseFloat(getComputedStyle(chevron.parentElement).columnGap) || 0 : 0
      const activeWidth = activeIndex < 0 ? 0 : (widths[activeIndex] ?? 0) + chevronWidth + labelGap
      measured.value = { count: visibleTabCount(widths, moreWidth, activeWidth, activeIndex, gap, available) }
    }

    // The width to fit is the container's; reports during a measuring pass
    // are skipped. The menu strip may appear or go after mount, with `overflow`
    let observer: ResizeObserver | undefined
    let observed: HTMLElement | null = null
    const observeBox = () => {
      const box = hostRef.value?.parentElement ?? null
      if (box === observed) return
      observer?.disconnect()
      observer = undefined
      observed = box
      if (!box || typeof ResizeObserver === "undefined") return
      observer = new ResizeObserver(() => {
        if (lastRender.measuring) return
        const width = box.clientWidth
        if (width === boxWidth) return
        boxWidth = width
        measured.value = { count: null }
      })
      observer.observe(box)
    }
    onMounted(() => {
      measure()
      observeBox()
    })
    onUpdated(() => {
      measure()
      observeBox()
    })
    onBeforeUnmount(() => observer?.disconnect())

    const forward = {
      "onUpdate:value": (value: string) => emit("update:value", value),
      "onChange": (value: string) => emit("change", value),
      "onClick": (event: MouseEvent) => emit("click", event),
    }

    return () => {
      const { overflow, overflowLabel, ...rootProps } = props
      if (overflow !== "menu" || props.block || props.orientation === "vertical") {
        return h(TabsComponent, { ...rootProps, ...attrs, ...forward }, slots)
      }

      const items = tabVNodes(slots.default?.() as VNodeArrayChildren | undefined)
      // The strip's own props size the tabs and the menu button too
      const signature = [overflowLabel, props.size, props.variant, props.gutterSize, props.pill, props.flush, tabsSignature(items)].join(
        "\u0002",
      )
      const activeIndex = items.findIndex((item) => tabProps(item).value === current.value)
      const { count } = measured.value
      // New tabs measure again; so does an active tab that moves under the
      // menu button or back out, since the button carries the hidden one's name
      const stale =
        count !== null &&
        (signature !== measuredSignature ||
          (activeIndex !== measuredActive && (measuredActive >= count || activeIndex >= count)))
      const measuring = count === null || stale
      lastRender = { measuring, signature, activeIndex, length: items.length }

      const shown = measuring ? items : items.slice(0, count)
      const hidden = measuring ? [] : items.slice(count)
      const hiddenActive = hidden.find((item) => tabProps(item).value === current.value) ?? null

      const strip = h(
        TabsComponent,
        {
          ...rootProps,
          ...attrs,
          "data-overflow": "menu",
          "value": hiddenActive ? MORE_VALUE : current.value,
          // Pressing the menu button opens the menu; it is not a tab
          "onUpdate:value": (next: string) => {
            if (next !== MORE_VALUE) select(next)
          },
          "onClick": forward.onClick,
        },
        {
          default: () => [
            ...shown,
            measuring || hidden.length > 0
              ? h(MenuTrigger, null, {
                  default: () =>
                    h(MoreTab, { value: MORE_VALUE }, {
                      default: () => [
                        h("span", { class: s.OverflowLabel }, [hiddenActive ? tabLabel(hiddenActive) : overflowLabel, h(ChevronDownMd)]),
                      ],
                    }),
                })
              : null,
          ],
        },
      )

      return h("div", { ref: hostRef, class: s.OverflowHost }, [
        h(Menu, null, {
          default: () => [
            strip,
            h(MenuContent, { align: "end", minWidth: "auto" }, {
              default: () =>
                h(MenuRadioGroup, { "value": current.value, "onUpdate:value": select }, {
                  default: () =>
                    hidden.map((item) => {
                      const itemProps = tabProps(item)
                      const count = tabCount(item)
                      const label = labelContent(item)
                      return h(
                        MenuRadioItem,
                        {
                          key: String(itemProps.value),
                          value: String(itemProps.value),
                          disabled: props.disabled || tabDisabled(item),
                        },
                        {
                          default: () => [
                            tabIcon(item),
                            filled(label)
                              ? label
                              : ((itemProps["aria-label"] as string | undefined) ?? String(itemProps.value)),
                            // A tab's count moves into the menu with it
                            count !== "" ? h("span", { class: s.OverflowBadge }, count) : null,
                          ],
                        },
                      )
                    }),
                }),
            }),
          ],
        }),
      ])
    }
  },
})

type TabsOwnProps = InstanceType<typeof TabsPublic>["$props"]

/** Tabs props plus the attributes that fall through to the group element, as in React. */
export type TabsProps = TabsOwnProps & Omit<HTMLAttributes, keyof TabsOwnProps> & { "aria-label"?: string }

export const Tabs = TabsPublic as typeof TabsPublic & { new (): { $props: TabsProps } }
