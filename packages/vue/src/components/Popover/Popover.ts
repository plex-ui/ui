import {
  computed,
  createCommentVNode,
  defineComponent,
  h,
  markRaw,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  watchPostEffect,
  type ExtractPropTypes,
  type PropType,
} from "vue"
import {
  PopoverAnchor as RekaPopoverAnchor,
  PopoverContent as RekaPopoverContent,
  PopoverPortal as RekaPopoverPortal,
  PopoverRoot as RekaPopoverRoot,
  injectPopoverRootContext,
  useForwardExpose,
  useId,
} from "reka-ui"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { focusableElements, preventDefaultHandler, toCssVariables } from "../../lib/helpers.js"
import { TransitionGroup } from "../Transition/index.js"
import { withRadixVariableNames } from "../Tooltip/Tooltip.js"
import { composeEventHandlers, firstElementChild, mergeSlotProps } from "../Tooltip/slot.js"
import { useDeferredPointerDownOutside } from "./deferredPointerDownOutside.js"
import { createPointerIntentArea, isPointInPolygon, type Polygon } from "./pointerIntent.js"
import { PopoverContextKey, usePopoverContext, type PopoverContextValue } from "./usePopoverContext.js"
import { usePopoverController } from "./usePopoverController.js"
import s from "@plexui/styles/components/Popover/Popover.module.css"

// Vue port of packages/ui/src/components/Popover/Popover.tsx on Reka UI.
// Exports are flat (`PopoverTrigger`, `PopoverContent`) because
// runtime-compiled templates cannot resolve `Popover.Trigger`; the static
// properties are kept for render functions and SFCs.
//
// Reka keeps positioning, the dismissable layer, the focus scope and focus
// return. As in Tooltip, the port follows Radix where they differ:
// - The trigger is Radix's: it runs after the child's handlers and toggles
//   only when none called preventDefault(), carries no `id`, and has
//   `aria-controls` only while open.
// - The content element is rendered here (Reka's `as`): Radix's custom
//   property names (the shared CSS reads `--radix-popover-content-*`), no
//   `dir`, no `aria-labelledby`.
// - A press outside closes it on the click that follows, as Radix's
//   deferred outside press does (./deferredPointerDownOutside.ts).
// - The portal renders once mounted, as Radix's does, so a closed popover
//   server-renders nothing.

export type PopoverSide = "top" | "right" | "bottom" | "left"
export type PopoverAlign = "start" | "center" | "end"

const PopoverComponent = defineComponent({
  name: "Popover",
  props: {
    /** Controlled visibility (`v-model:open`); uncontrolled when omitted */
    open: { type: Boolean, default: undefined },
    /** Opens on hover and focus instead of click. @default false */
    showOnHover: { type: Boolean, default: false },
    /** Delay before a hover popover opens, in milliseconds. @default 150 */
    hoverOpenDelay: { type: Number, default: 150 },
  },
  emits: {
    "update:open": (_nextState: boolean) => true,
  },
  setup(props, { slots, emit }) {
    const open = ref(false)
    const shake = ref(false)
    const triggerRef = shallowRef<HTMLElement | null>(null)
    const contentRef = shallowRef<HTMLElement | null>(null)
    let openTimer: ReturnType<typeof setTimeout> | undefined
    const hoverOpenFocusedWithTab = { current: false }
    const isPointerInTransitRef = { current: false }
    const isOpen = computed(() => props.open ?? open.value)

    const temporarilyPreventClickToClose = ref(false)
    watch(temporarilyPreventClickToClose, (prevent, _, onCleanup) => {
      if (!prevent) return
      const id = setTimeout(() => {
        temporarilyPreventClickToClose.value = false
      }, 500)
      onCleanup(() => clearTimeout(id))
    })

    const handleOpenChange = (nextState: boolean) => {
      clearTimeout(openTimer)

      // No-op if the state is not changing
      if (isOpen.value === nextState) {
        return
      }

      if (!nextState) {
        // clear any running shake animation on close
        shake.value = false

        // Check for specific hover conditions where focus should be
        // immediately restored to the trigger before closing
        if (props.showOnHover && hoverOpenFocusedWithTab.current) {
          triggerRef.value?.focus()
        }

        // Always cleanup this state
        hoverOpenFocusedWithTab.current = false
      }

      emit("update:open", nextState)
      open.value = nextState

      if (props.showOnHover) {
        temporarilyPreventClickToClose.value = nextState
      }
    }

    const handleTriggerEnter = () => {
      openTimer = setTimeout(() => handleOpenChange(true), props.hoverOpenDelay)
    }

    const handleTriggerLeave = () => {
      clearTimeout(openTimer)
    }

    onBeforeUnmount(() => {
      clearTimeout(openTimer)
    })

    const store: PopoverContextValue = {
      open: isOpen,
      setOpen: handleOpenChange,
      shake,
      setShake: (next) => {
        shake.value = next
      },
      showOnHover: computed(() => props.showOnHover),
      temporarilyPreventClickToClose,
      onTriggerEnter: handleTriggerEnter,
      onTriggerLeave: handleTriggerLeave,
      isPointerInTransitRef,
      triggerRef,
      contentRef,
      hoverOpenFocusedWithTab,
    }
    provide(PopoverContextKey, store)

    return () =>
      h(
        RekaPopoverRoot,
        { "open": isOpen.value, "onUpdate:open": handleOpenChange, "modal": false },
        { default: () => slots.default?.() },
      )
  },
})

/**
 * Renders its child (a button, link, ...) as the popover trigger. Like
 * `Popover.Trigger` in React it takes no other props: attributes on it are
 * not passed on.
 */
export const PopoverTrigger = defineComponent({
  name: "PopoverTrigger",
  inheritAttrs: false,
  emits: {
    pointerdown: (_event: PointerEvent) => true,
    click: (_event: MouseEvent) => true,
  },
  setup(_props, { slots, emit }) {
    const {
      open,
      setOpen,
      showOnHover,
      temporarilyPreventClickToClose,
      onTriggerEnter,
      onTriggerLeave,
      isPointerInTransitRef,
      triggerRef,
      contentRef,
    } = usePopoverContext()
    const rootContext = injectPopoverRootContext()
    rootContext.contentId ||= useId(undefined, "reka-popover-content")
    const { forwardRef, currentElement } = useForwardExpose()
    let hasPointerMoveOpened = false

    // Focus returns here on close, and pointer-downs on it are not "outside".
    // Follows a replaced child element, as Radix's composed ref does
    watchPostEffect(() => {
      triggerRef.value = currentElement.value ?? null
      rootContext.triggerElement.value = currentElement.value
    })

    const maybePreventClickClose = (evt: Event) => {
      // Don't prevent temporary close if the trigger is an anchor tag itself
      const isLink = (evt.currentTarget as Element).nodeName.toLocaleLowerCase() === "a"

      if (!isLink && temporarilyPreventClickToClose.value) {
        // Prevents tooltip listeners from closing
        evt.preventDefault()
        evt.stopPropagation()
      }
    }

    const handlePointerMove = (evt: PointerEvent) => {
      if (evt.pointerType === "touch") {
        return
      }

      if (!hasPointerMoveOpened && !isPointerInTransitRef.current) {
        onTriggerEnter()
        hasPointerMoveOpened = true
      }
    }

    const handlePointerLeave = () => {
      if (!hasPointerMoveOpened) {
        return
      }

      onTriggerLeave()
      hasPointerMoveOpened = false
    }

    const handleBlur = () => {
      setTimeout(() => {
        // Ignore this handler if focus has moved into the popover
        if (contentRef.value?.contains(document.activeElement)) {
          return
        }

        setOpen(false)
      }, 50)
    }

    const onPointerdown = (evt: PointerEvent) => {
      maybePreventClickClose(evt)
      emit("pointerdown", evt)
    }

    const onClick = composeEventHandlers(
      (evt: MouseEvent) => {
        maybePreventClickClose(evt)
        emit("click", evt)
      },
      () => rootContext.onOpenToggle(),
    )

    return () => {
      const child = firstElementChild(slots.default?.())
      if (!child) return null

      const isOpen = open.value
      const hover = showOnHover.value
      // Radix's PopoverTrigger props, then Plex's handlers
      const triggerProps = {
        "type": "button",
        "aria-haspopup": "dialog",
        "aria-expanded": isOpen,
        "aria-controls": isOpen ? rootContext.contentId : undefined,
        "data-state": isOpen ? "open" : "closed",
        onPointerdown,
        onClick,
        "onPointermove": hover ? handlePointerMove : undefined,
        "onPointerleave": hover ? handlePointerLeave : undefined,
        "onFocus": hover ? () => setOpen(true) : undefined,
        "onBlur": hover ? handleBlur : undefined,
      }

      return h(RekaPopoverAnchor, { asChild: true, ref: forwardRef }, { default: () => mergeSlotProps(child, triggerProps) })
    }
  },
})

const contentProps = {
  /** Avoids collisions with the viewport and scroll containers. @default true */
  avoidCollisions: { type: Boolean, default: undefined },
  /** `width` of the popover; numbers are pixels. @default "auto" */
  width: [Number, String] as PropType<number | "auto">,
  /** `min-width` of the popover; numbers are pixels. @default 300 */
  minWidth: [Number, String] as PropType<number | "auto">,
  /** `max-width` of the popover, in pixels */
  maxWidth: Number,
  /** Preferred side of the trigger. @default "bottom" */
  side: String as PropType<PopoverSide>,
  /** Distance from the trigger, in pixels. @default 8 */
  sideOffset: { type: Number, default: 8 },
  /** Preferred alignment against the trigger. @default "center" */
  align: String as PropType<PopoverAlign>,
  /** Offset from the "start" or "end" alignment, in pixels. @default 0 */
  alignOffset: Number,
  /** Translucent popover surface. @default false */
  translucent: { type: Boolean, default: undefined },
  /** Moves focus into the popover when it opens. @default true */
  autoFocus: { type: Boolean, default: true },
}

type ContentProps = ExtractPropTypes<typeof contentProps>

// The element Reka's content renders (`as`). Raw: Reka passes `as` through
// reactive props, and Vue warns about a component made reactive.
const PopoverContentElement = markRaw(defineComponent({
  name: "PopoverContentElement",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const { contentRef } = usePopoverContext()
    const setContentRef = (el: unknown) => {
      contentRef.value = (el as HTMLElement | null) ?? null
    }

    return () => {
      const { "dir": _dir, "aria-labelledby": _labelledBy, style, ...rest } = attrs
      return h(
        "div",
        { ...rest, style: withRadixVariableNames(style, "popover"), ref: setContentRef },
        slots.default?.(),
      )
    }
  },
}))

const PopoverContentImpl = defineComponent({
  name: "PopoverContentImpl",
  inheritAttrs: false,
  props: contentProps,
  setup(props, { slots, attrs }) {
    const { showOnHover, shake, contentRef, setOpen, triggerRef } = usePopoverContext()
    const controller = usePopoverController()

    // Radix's non-modal content: a press on the trigger is left to the
    // trigger, and focus does not return to it after a press outside
    let pressedOutside = false
    const outsidePress = useDeferredPointerDownOutside((originalEvent) => {
      if (triggerRef.value?.contains(originalEvent.target as Node)) return
      pressedOutside = true
      setOpen(false)
    })
    const handleCloseAutoFocus = (event: Event) => {
      if (showOnHover.value || pressedOutside) event.preventDefault()
    }

    const handleKeyDown = (evt: KeyboardEvent) => {
      const contentElement = contentRef.value

      if (
        // When the current target is our container
        contentElement &&
        evt.target === contentElement &&
        // We know that shift key tabs will lead to closing the popover (because we don't use `modal`)
        evt.key === "Tab" &&
        evt.shiftKey
      ) {
        // Prevent that from happening
        evt.preventDefault()
        evt.stopPropagation()

        // Move focus to the last focusable element, placing the user in the focus loop
        const focusable = focusableElements(contentElement)
        const lastFocusable = focusable[focusable.length - 1]
        lastFocusable?.focus()
      }
    }

    // Important that we send initial focus into the popover, placing it onto the container.
    // This allows focus looping to begin, as well as capturing scoped key presses.
    // We prevent Reka's default behavior of focusing an element, because this can have adverse side-effects.
    onMounted(() => {
      watch(
        [showOnHover, () => props.autoFocus],
        () => {
          const contentElement = contentRef.value

          if (!contentElement || !props.autoFocus) {
            return
          }

          // If we're already focused within the content area, no-op.
          // This would be true if some inner component declares autoFocus
          if (contentElement.contains(document.activeElement)) {
            return
          }

          // Our focus isn't in the content area - move it there.
          // NOTE: Don't automatically shift focus on hover popovers
          if (!showOnHover.value) {
            contentElement.focus({ preventScroll: true })
          }
        },
        { immediate: true },
      )
    })

    return () =>
      h(
        RekaPopoverContent,
        {
          "as": PopoverContentElement,
          "class": [s.Popover, attrs.class],
          "style": toCssVariables({
            "popover-width": props.width,
            "popover-min-width": props.minWidth,
            "popover-max-width": props.maxWidth,
          }),
          "onCloseAutoFocus": handleCloseAutoFocus,
          "onPointerDownOutside": outsidePress.onPointerDownOutside,
          "onFocusOutside": outsidePress.onFocusOutside,
          "data-animate": shake.value ? "shake" : undefined,
          "data-translucent": props.translucent ? "true" : undefined,
          "side": props.side,
          "sideOffset": props.sideOffset,
          "align": props.align,
          "alignOffset": props.alignOffset ?? (props.align === "center" ? 0 : -5),
          "avoidCollisions": props.avoidCollisions ?? true,
          "hideWhenDetached": true,
          "collisionPadding": 20,
          "onOpenAutoFocus": preventDefaultHandler,
          // Escape is handled by the Escape stack in PopoverContent
          "onEscapeKeyDown": preventDefaultHandler,
          "onKeydown": handleKeyDown,
        },
        { default: () => slots.default?.(controller) },
      )
  },
})

const PopoverContentHoverable = defineComponent({
  name: "PopoverContentHoverable",
  inheritAttrs: false,
  props: contentProps,
  setup(props, { slots, attrs }) {
    const { setOpen, triggerRef, contentRef, isPointerInTransitRef, hoverOpenFocusedWithTab } = usePopoverContext()
    const pointerGraceArea = shallowRef<Polygon | null>(null)

    const handleRemoveGraceArea = () => {
      pointerGraceArea.value = null
      isPointerInTransitRef.current = false
    }

    const handleCreateGraceArea = (event: PointerEvent, hoverTarget: HTMLElement) => {
      const graceArea = createPointerIntentArea(event, hoverTarget)
      pointerGraceArea.value = graceArea
      isPointerInTransitRef.current = true
    }

    onBeforeUnmount(handleRemoveGraceArea)

    let removeLeaveListeners = () => {}
    onMounted(() => {
      const trigger = triggerRef.value
      const content = contentRef.value

      if (!trigger || !content) {
        return
      }

      const handleTriggerLeave = (event: PointerEvent) => handleCreateGraceArea(event, content)
      const handleContentLeave = (event: PointerEvent) => handleCreateGraceArea(event, trigger)

      trigger.addEventListener("pointerleave", handleTriggerLeave)
      content.addEventListener("pointerleave", handleContentLeave)
      removeLeaveListeners = () => {
        trigger.removeEventListener("pointerleave", handleTriggerLeave)
        content.removeEventListener("pointerleave", handleContentLeave)
      }
    })
    onBeforeUnmount(() => removeLeaveListeners())

    watch(pointerGraceArea, (graceArea, _, onCleanup) => {
      if (!graceArea) {
        return
      }

      const handleTrackPointerGrace = (event: PointerEvent) => {
        const trigger = triggerRef.value
        const content = contentRef.value
        const target = event.target as HTMLElement
        const pointerPosition = { x: event.clientX, y: event.clientY }
        const hasEnteredTarget = trigger?.contains(target) || content?.contains(target)
        const isPointerOutsideGraceArea = !isPointInPolygon(pointerPosition, graceArea)
        // Stop considering grace areas when the pointer runs into other control triggers
        const targetHasPopup = target.hasAttribute("aria-haspopup")

        if (hasEnteredTarget) {
          handleRemoveGraceArea()
        } else if (isPointerOutsideGraceArea || targetHasPopup) {
          handleRemoveGraceArea()
          setOpen(false)
        }
      }
      document.addEventListener("pointermove", handleTrackPointerGrace)
      onCleanup(() => document.removeEventListener("pointermove", handleTrackPointerGrace))
    })

    // Hoverable doesn't place focus in the popover by default.
    // If it is open and Tab is pressed, focus the first focusable element and
    // remember to restore focus to the trigger on close.
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (!contentRef.value) {
        return
      }

      // Only assume forward tab is attempting to move into the popup
      if (evt.key === "Tab" && !evt.shiftKey) {
        const [firstFocusable] = focusableElements(contentRef.value)
        if (firstFocusable) {
          evt.preventDefault()
          firstFocusable.focus()
          hoverOpenFocusedWithTab.current = true
          document.removeEventListener("keydown", handleKeyDown)
        }
      }
    }
    onMounted(() => document.addEventListener("keydown", handleKeyDown))
    onBeforeUnmount(() => document.removeEventListener("keydown", handleKeyDown))

    return () => h(PopoverContentImpl, { ...props, class: attrs.class }, slots)
  },
})

/**
 * The floating panel. `class` lands on the panel. The default slot receives
 * `{ close, shake }`, the same functions `usePopoverController()` returns.
 */
export const PopoverContent = defineComponent({
  name: "PopoverContent",
  inheritAttrs: false,
  props: contentProps,
  setup(props, { slots, attrs }) {
    const { open, showOnHover, setOpen } = usePopoverContext()

    useEscCloseStack(open, () => {
      setOpen(false)
    })

    return () =>
      h(RekaPopoverPortal, null, {
        default: () => [
          h(
            TransitionGroup,
            { class: s.Transition, enterDuration: 600, exitDuration: 300, disableAnimations: true },
            {
              default: () => [
                open.value
                  ? h(
                      showOnHover.value ? PopoverContentHoverable : PopoverContentImpl,
                      { key: showOnHover.value ? "popover-hover" : "popover", ...(props as ContentProps), class: attrs.class },
                      slots,
                    )
                  : createCommentVNode(),
              ],
            },
          ),
        ],
      })
  },
})

/** Popover root. Uncontrolled by default; bind `v-model:open` to control it. */
// Typed explicitly so the published declaration refers to the parts instead of
// expanding them (an expanded component type fails consumers' type checks)
export const Popover: typeof PopoverComponent & {
  Trigger: typeof PopoverTrigger
  Content: typeof PopoverContent
} = Object.assign(PopoverComponent, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
})

export type PopoverProps = InstanceType<typeof PopoverComponent>["$props"]
export type PopoverContentProps = InstanceType<typeof PopoverContent>["$props"]
