import {
  Comment,
  Text,
  computed,
  defineComponent,
  h,
  inject,
  isVNode,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
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
import { LoadingIndicator } from "../Indicator/index.js"
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

const TabsComponent = defineComponent({
  name: "Tabs",
  inheritAttrs: false,
  props: {
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
  },
  emits: {
    /** A new value was selected (`v-model:value`) */
    "update:value": (_value: string) => true,
    /** Same payload as `update:value`, named after React's `onChange` */
    "change": (_value: string) => true,
    /** Any click on the control, even if a new value was not selected */
    "click": (_event: MouseEvent) => true,
  },
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

    onBeforeUnmount(() => {
      observer?.disconnect()
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

type TabsOwnProps = InstanceType<typeof TabsComponent>["$props"]

/** Tabs props plus the attributes that fall through to the group element, as in React. */
export type TabsProps = TabsOwnProps & Omit<HTMLAttributes, keyof TabsOwnProps> & { "aria-label"?: string }

export const Tabs = TabsComponent as typeof TabsComponent & { new (): { $props: TabsProps } }

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
