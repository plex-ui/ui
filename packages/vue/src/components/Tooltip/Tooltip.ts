import {
  Text,
  computed,
  defineComponent,
  h,
  inject,
  markRaw,
  normalizeStyle,
  onBeforeUnmount,
  provide,
  ref,
  watch,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import {
  TooltipContent as RekaTooltipContent,
  TooltipPortal as RekaTooltipPortal,
  TooltipProvider as RekaTooltipProvider,
  TooltipRoot as RekaTooltipRoot,
  TooltipTrigger as RekaTooltipTrigger,
  injectTooltipProviderContext,
  injectTooltipRootContext,
  useId,
} from "reka-ui"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { preventDefaultHandler } from "../../lib/helpers.js"
import { composeEventHandlers, concatAriaDescribedby, firstElementChild, flattenSlot, mergeSlotProps } from "./slot.js"
import s from "@plexui/styles/components/Tooltip/Tooltip.module.css"

// Vue port of packages/ui/src/components/Tooltip/Tooltip.tsx on Reka UI.
// Exports are flat (`TooltipRoot`, `TooltipTrigger`, ...) because
// runtime-compiled templates cannot resolve `Tooltip.Root`; the static
// properties are kept for render functions and SFCs.
//
// Reka keeps the open/close timers, the provider's skip delay, positioning,
// the dismissable layer and the hover grace area. Where Radix and Reka
// differ, the port follows Radix so the DOM and behaviour match React:
// - Triggers run their handlers after the child's and skip them when one
//   called preventDefault() (Radix's composeEventHandlers). Reka's trigger
//   listeners are switched off (`disabled`) and re-implemented here.
// - Radix tells the provider about open changes (skip delay, the
//   "tooltip.open" event that closes other tooltips) only when the tooltip
//   asks for one; Reka also does it for any change of the `open` prop, which
//   Plex uses to close on Escape and after a copy.
// - The state attribute is computed when `open` changes, as Radix memoizes it.
// - The content element is rendered here (Reka's `as`) the radix-ui 1.8 way:
//   it is the `role="tooltip"` element itself, without the visually hidden
//   copy of the text Reka adds; an `id` on the content becomes the id the
//   trigger points at, and only an `aria-label` gets a visually hidden
//   element. Radix's custom property names, no `dir` and no
//   `data-grace-area-trigger`.

export type TooltipSide = "top" | "right" | "bottom" | "left"
export type TooltipAlign = "start" | "center" | "end"
export type TooltipGutterSize = "sm" | "md" | "lg"
type StateAttribute = "closed" | "delayed-open" | "instant-open"

const TOOLTIP_OPEN = "tooltip.open"

// Radix's VisuallyHidden styles (Reka's add clip-path, top and left)
const VISUALLY_HIDDEN_STYLE = {
  position: "absolute",
  border: "0",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  wordWrap: "normal",
}

/** React adds `px` to unitless numbers in style objects; Vue does not. */
const toCssLength = (value: number | string | undefined) => (typeof value === "number" ? `${value}px` : value)

/**
 * The content custom properties under Radix's names (`--radix-tooltip-*`,
 * `--radix-popover-*`), which the shared CSS reads. They still point at the
 * `--reka-popper-*` values Reka sets on its positioning wrapper.
 */
export const withRadixVariableNames = (style: unknown, part: string) => {
  const from = `--reka-${part}-`
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(normalizeStyle([style]) as Record<string, unknown>)) {
    result[key.startsWith(from) ? `--radix-${part}-${key.slice(from.length)}` : key] = value
  }
  return result
}

type ProviderHooks = { onOpen: () => void; onClose: () => void }

// The content's own `id`, which Radix uses as the content id (Reka's
// `contentId` is a plain string the trigger reads once)
const ContentIdKey: InjectionKey<Ref<string | undefined>> = Symbol("PlexUITooltipContentId")

const REKA_PROVIDER_HOOKS = Symbol("rekaProviderHooks")
const REKA_STATE = Symbol("rekaStateAttribute")

// Rendered inside Reka's root: adjusts the provider and root contexts the
// Radix way (see the notes at the top).
const TooltipContextBridge = defineComponent({
  name: "TooltipContextBridge",
  props: {
    hooks: { type: Object as PropType<ProviderHooks>, required: true },
  },
  setup(props, { slots }) {
    // Reka's originals are kept on the contexts, so a second setup against
    // the same provider and root (a remount, HMR) still finds them
    const providerContext = injectTooltipProviderContext() as ReturnType<typeof injectTooltipProviderContext> & {
      [REKA_PROVIDER_HOOKS]?: ProviderHooks
    }
    const rekaHooks = (providerContext[REKA_PROVIDER_HOOKS] ??= {
      onOpen: providerContext.onOpen,
      onClose: providerContext.onClose,
    })
    props.hooks.onOpen = rekaHooks.onOpen
    props.hooks.onClose = rekaHooks.onClose
    // Reka's root skips its own provider calls when there is no `onClose`
    ;(providerContext as { onClose?: () => void }).onClose = undefined

    const rootContext = injectTooltipRootContext() as ReturnType<typeof injectTooltipRootContext> & {
      [REKA_STATE]?: Ref<StateAttribute>
    }
    const rekaState = (rootContext[REKA_STATE] ??= rootContext.stateAttribute)
    const state = ref<StateAttribute>(rekaState.value)
    watch(
      () => rootContext.open.value,
      () => {
        state.value = rekaState.value
      },
      { flush: "sync" },
    )
    rootContext.stateAttribute = computed(() => state.value) as unknown as Ref<StateAttribute>

    return () => slots.default?.()
  },
})

/** Low-level tooltip root (`Tooltip.Root` in React). Always controlled: bind `v-model:open`. */
export const TooltipRoot = defineComponent({
  name: "TooltipRoot",
  props: {
    open: { type: Boolean, required: true },
    /** Delay before the tooltip opens on hover, in milliseconds. @default 700 */
    delayDuration: Number,
    /** Closes the tooltip as soon as the pointer leaves the trigger. @default false */
    disableHoverableContent: { type: Boolean, default: undefined },
  },
  emits: {
    "update:open": (_open: boolean) => true,
  },
  setup(props, { slots, emit }) {
    const hooks: ProviderHooks = { onOpen: () => {}, onClose: () => {} }
    const onOpenChange = (nextState: boolean) => emit("update:open", nextState)
    provide(ContentIdKey, ref<string>())

    useEscCloseStack(
      () => props.open,
      () => onOpenChange(false),
    )

    // Radix's controlled state: only real changes are reported
    const handleOpenChange = (nextState: boolean) => {
      if (nextState === props.open) return
      if (nextState) {
        hooks.onOpen()
        document.dispatchEvent(new CustomEvent(TOOLTIP_OPEN))
      } else {
        hooks.onClose()
      }
      onOpenChange(nextState)
    }

    return () =>
      h(RekaTooltipProvider, null, {
        default: () =>
          h(
            RekaTooltipRoot,
            {
              "open": props.open,
              "delayDuration": props.delayDuration,
              "disableHoverableContent": props.disableHoverableContent,
              // The trigger listeners are this port's (TooltipTrigger)
              "disabled": true,
              "onUpdate:open": handleOpenChange,
            },
            { default: () => h(TooltipContextBridge, { hooks }, { default: () => slots.default?.() }) },
          ),
      })
  },
})

/**
 * Low-level trigger (`Tooltip.Trigger` in React). Renders its child with the
 * tooltip wiring merged in; `as-child="false"` renders a `<button>` instead.
 */
export const TooltipTrigger = defineComponent({
  name: "TooltipTrigger",
  inheritAttrs: false,
  props: {
    /** Merges into the child instead of rendering a `<button>`. @default true */
    asChild: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    const rootContext = injectTooltipRootContext()
    const providerContext = injectTooltipProviderContext()
    // Set before the first render, which describes the trigger by it
    rootContext.contentId ||= useId(undefined, "reka-tooltip-content")
    const contentIdProp = inject(ContentIdKey, undefined)
    let isPointerDown = false
    let hasPointerMoveOpened = false

    const handlePointerUp = () => {
      isPointerDown = false
    }
    onBeforeUnmount(() => document.removeEventListener("pointerup", handlePointerUp))

    // Radix's TooltipTrigger handlers
    const handlers: Record<string, (event: Event) => void> = {
      onPointermove: (event) => {
        if ((event as PointerEvent).pointerType === "touch") return
        if (!hasPointerMoveOpened && !providerContext.isPointerInTransitRef.value) {
          rootContext.onTriggerEnter()
          hasPointerMoveOpened = true
        }
      },
      onPointerleave: () => {
        rootContext.onTriggerLeave()
        hasPointerMoveOpened = false
      },
      onPointerdown: () => {
        if (rootContext.open.value) {
          rootContext.onClose()
        }
        isPointerDown = true
        document.addEventListener("pointerup", handlePointerUp, { once: true })
      },
      onFocus: () => {
        if (!isPointerDown) rootContext.onOpen()
      },
      onBlur: () => rootContext.onClose(),
      onClick: () => rootContext.onClose(),
    }

    return () => {
      const child = props.asChild ? firstElementChild(slots.default?.()) : h("button", null, slots.default?.())
      if (!child) return null

      const contentId = contentIdProp?.value ?? rootContext.contentId
      const triggerProps: Record<string, unknown> = {
        ...attrs,
        // Radix adds the content id to the trigger's own while open (the
        // child's own ids come first, as in Radix's Slot)
        "aria-describedby": rootContext.open.value
          ? concatAriaDescribedby(attrs["aria-describedby"], contentId)
          : attrs["aria-describedby"],
        "data-grace-area-trigger": undefined,
      }
      for (const [key, handler] of Object.entries(handlers)) {
        triggerProps[key] = composeEventHandlers(attrs[key], handler)
      }

      return h(RekaTooltipTrigger, { asChild: true }, { default: () => mergeSlotProps(child, triggerProps) })
    }
  },
})

type ContentChildren = {
  render: () => VNodeArrayChildren | undefined
  ariaLabel: () => unknown
}

const ContentChildrenKey: InjectionKey<ContentChildren> = Symbol("PlexUITooltipContent")

// The element Reka's content renders (`as`), in place of Reka's visually
// hidden copy of the text. Raw, as Reka may pass `as` through reactive props.
const TooltipContentElement = markRaw(defineComponent({
  name: "TooltipContentElement",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const rootContext = injectTooltipRootContext()
    const content = inject(ContentChildrenKey)!
    const contentIdProp = inject(ContentIdKey, undefined)

    return () => {
      const { dir: _dir, style, id: _id, ...rest } = attrs
      const ariaLabel = content.ariaLabel() as string | undefined
      const contentId = contentIdProp?.value ?? (rootContext.contentId || undefined)
      return h(
        "div",
        {
          role: ariaLabel ? undefined : "tooltip",
          id: ariaLabel ? undefined : contentId,
          ...rest,
          style: withRadixVariableNames(style, "tooltip"),
        },
        [
          content.render(),
          ariaLabel ? h("span", { id: contentId, role: "tooltip", style: VISUALLY_HIDDEN_STYLE }, ariaLabel) : null,
        ],
      )
    }
  },
}))

const sideProp = String as PropType<TooltipSide>
const alignProp = String as PropType<TooltipAlign>
const gutterSizeProp = { type: String as PropType<TooltipGutterSize>, default: "md" }
const maxWidthProp = { type: [Number, String] as PropType<number | "none">, default: 300 }

/** Low-level content (`Tooltip.Content` in React). `class` lands on the tooltip. */
export const TooltipContent = defineComponent({
  name: "TooltipContent",
  inheritAttrs: false,
  props: {
    /** `max-width` of the tooltip; `"none"` sizes it to a single line. @default 300 */
    maxWidth: maxWidthProp,
    /** Short, 1-3 word tooltips, stylized inversely from normal tooltips. @default false */
    compact: { type: Boolean, default: false },
    /** Whether the tooltip content responds to clicks */
    clickable: { type: Boolean, default: undefined },
    /** Preferred side of the trigger. @default "top" */
    side: sideProp,
    /** Distance from the trigger, in pixels. @default 5 */
    sideOffset: { type: Number, default: 5 },
    /** Preferred alignment against the trigger. @default "center" */
    align: alignProp,
    /** Offset from the "start" or "end" alignment, in pixels. @default 0 */
    alignOffset: { type: Number, default: 0 },
    /** Gutter sizing inside the tooltip. @default "md" */
    gutterSize: gutterSizeProp,
  },
  setup(props, { slots, attrs }) {
    provide(ContentChildrenKey, {
      render: () => slots.default?.(),
      ariaLabel: () => attrs["aria-label"],
    })

    // Radix's content `id` replaces the generated content id while mounted
    const contentIdProp = inject(ContentIdKey, undefined)
    if (contentIdProp) {
      watch(
        () => attrs.id as string | undefined,
        (id) => {
          contentIdProp.value = id || undefined
        },
        { immediate: true },
      )
      onBeforeUnmount(() => {
        contentIdProp.value = undefined
      })
    }

    return () => {
      const { class: className, style, "aria-label": _ariaLabel, id: _id, ...restProps } = attrs

      return h(RekaTooltipPortal, null, {
        default: () =>
          h(
            RekaTooltipContent,
            {
              ...restProps,
              "as": TooltipContentElement,
              "side": props.side,
              "align": props.align,
              "class": [s.Tooltip, className],
              "data-compact": String(props.compact),
              "data-clickable": props.clickable === undefined ? undefined : String(props.clickable),
              "data-gutter-size": props.gutterSize,
              "alignOffset": props.alignOffset,
              "sideOffset": props.sideOffset,
              "collisionPadding": 15,
              "hideWhenDetached": true,
              "style": [style, { maxWidth: toCssLength(props.maxWidth) }],
              // Escape is handled by the Escape stack in TooltipRoot
              "onEscapeKeyDown": preventDefaultHandler,
            },
            // Rendered by TooltipContentElement from the injected slot
            { default: () => [] },
          ),
      })
    }
  },
})

const isPlainText = (nodes: VNode[]) => nodes.length === 1 && nodes[0]!.type === Text

/**
 * Optional trigger wrapper (`Tooltip.TriggerDecorator` in React) for content
 * that is not accessible or visibly interactive on its own. Plain text is
 * wrapped in a focusable `<span>`; an element child gets the props merged in.
 */
export const TooltipTriggerDecorator = defineComponent({
  name: "TooltipTriggerDecorator",
  inheritAttrs: false,
  props: {
    /** Applies `tabindex="0"` to the trigger. @default true */
    focusable: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const { class: className, ...restProps } = attrs
      const slotProps = {
        ...restProps,
        class: [s.TriggerDecorator, className],
        tabindex: props.focusable ? 0 : undefined,
      }
      const children = flattenSlot(slots.default?.())

      if (isPlainText(children)) {
        return h("span", slotProps, String(children[0]!.children ?? ""))
      }

      const child = firstElementChild(children)
      return child ? mergeSlotProps(child, slotProps) : null
    }
  },
})

const TooltipComponent = defineComponent({
  name: "Tooltip",
  inheritAttrs: false,
  props: {
    /**
     * The content of the tooltip (or the `#content` slot). `null` renders no
     * tooltip.
     */
    content: { type: [String, Number, Object] as PropType<string | number | VNode | null>, default: undefined },
    /** `max-width` of the tooltip; `"none"` sizes it to a single line. @default 300 */
    maxWidth: maxWidthProp,
    /** Forces the tooltip to remain open or closed */
    forceOpen: { type: Boolean, default: undefined },
    /** Delay before the tooltip opens from the first interaction, in milliseconds. @default 150 */
    openDelay: { type: Number, default: 150 },
    /** The tooltip has interactive content and stays open while hovered. @default false */
    interactive: { type: Boolean, default: false },
    /** Short, 1-3 word tooltips, stylized inversely from normal tooltips. @default false */
    compact: { type: Boolean, default: false },
    /** Keeps the tooltip open when the trigger is clicked right after it opened. @default false */
    preventUnintentionalClickToClose: { type: Boolean, default: undefined },
    /** Preferred alignment against the trigger. @default "center" */
    align: alignProp,
    /** Offset from the "start" or "end" alignment, in pixels. @default 0 */
    alignOffset: { type: Number, default: 0 },
    /** Preferred side of the trigger. @default "top" */
    side: sideProp,
    /** Distance from the trigger, in pixels. @default 5 */
    sideOffset: { type: Number, default: 5 },
    /** Gutter sizing inside the tooltip. @default "md" */
    gutterSize: gutterSizeProp,
    /** Class applied to the tooltip content */
    contentClassName: String,
  },
  emits: {
    pointerdown: (_event: PointerEvent) => true,
    click: (_event: MouseEvent) => true,
  },
  setup(props, { slots, attrs, emit }) {
    const visible = ref(false)
    const temporarilyPreventClickToClose = ref(false)

    watch(temporarilyPreventClickToClose, (prevent, _, onCleanup) => {
      if (!prevent) return
      const id = setTimeout(() => {
        temporarilyPreventClickToClose.value = false
      }, 400)
      onCleanup(() => clearTimeout(id))
    })

    const hasContent = () => !(props.content === null && !slots.content)
    const forceOpen = () => props.forceOpen ?? (hasContent() ? undefined : false)

    const handleOpenChange = (nextState: boolean) => {
      // When forceOpen is passed, don't manage internal state
      if (typeof forceOpen() === "boolean") return

      visible.value = nextState

      if (props.preventUnintentionalClickToClose) {
        temporarilyPreventClickToClose.value = nextState
      }
    }

    const maybePreventClickClose = (evt: Event) => {
      if (props.preventUnintentionalClickToClose && temporarilyPreventClickToClose.value) {
        // Prevents tooltip listeners from closing
        evt.preventDefault()
        evt.stopPropagation()
      }
    }

    const onPointerdown = (evt: PointerEvent) => {
      maybePreventClickClose(evt)
      emit("pointerdown", evt)
    }

    const onClick = (evt: MouseEvent) => {
      maybePreventClickClose(evt)
      emit("click", evt)
    }

    return () => {
      const child = firstElementChild(slots.default?.())

      return h(
        TooltipRoot,
        {
          "open": forceOpen() ?? visible.value,
          "delayDuration": props.openDelay,
          "onUpdate:open": handleOpenChange,
          "disableHoverableContent": !props.interactive,
        },
        {
          default: () => [
            h(TooltipTrigger, null, {
              default: () => (child ? mergeSlotProps(child, { ...attrs, onPointerdown, onClick }) : null),
            }),
            h(
              TooltipContent,
              {
                maxWidth: props.maxWidth,
                compact: props.compact,
                align: props.align,
                alignOffset: props.alignOffset,
                side: props.side,
                sideOffset: props.sideOffset,
                gutterSize: props.gutterSize,
                class: props.contentClassName,
              },
              { default: () => (slots.content ? slots.content() : props.content) },
            ),
          ],
        },
      )
    }
  },
})

/**
 * Tooltip for any trigger element (the default slot). Content comes from the
 * `content` prop or the `#content` slot; `null` disables the tooltip.
 */
// Typed explicitly so the published declaration refers to the parts instead of
// expanding them (an expanded component type fails consumers' type checks)
export const Tooltip: typeof TooltipComponent & {
  Root: typeof TooltipRoot
  Content: typeof TooltipContent
  Trigger: typeof TooltipTrigger
  TriggerDecorator: typeof TooltipTriggerDecorator
} = Object.assign(TooltipComponent, {
  Root: TooltipRoot,
  Content: TooltipContent,
  Trigger: TooltipTrigger,
  TriggerDecorator: TooltipTriggerDecorator,
})

export type TooltipProps = InstanceType<typeof TooltipComponent>["$props"]
