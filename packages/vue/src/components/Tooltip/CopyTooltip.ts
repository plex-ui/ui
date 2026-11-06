import { defineComponent, h, onBeforeUnmount, ref, type PropType } from "vue"
import { copyText } from "../../lib/copyToClipboard.js"
import { Check, Copy } from "../Icon/index.js"
import { TooltipContent, TooltipRoot, TooltipTrigger, type TooltipAlign, type TooltipSide } from "./Tooltip.js"

// Vue port of packages/ui/src/components/Tooltip/CopyTooltip.tsx.

/** Wraps a trigger (the default slot) and copies `copyValue` when it is pressed. */
export const CopyTooltip = defineComponent({
  name: "CopyTooltip",
  props: {
    /** Value to copy to the clipboard */
    copyValue: { type: String, required: true },
    /** Delay before the tooltip opens from the first interaction, in milliseconds. @default 150 */
    openDelay: { type: Number, default: 150 },
    /** Preferred alignment against the trigger. @default "center" */
    align: { type: String as PropType<TooltipAlign>, default: "center" },
    /** Offset from the "start" or "end" alignment, in pixels. @default 0 */
    alignOffset: { type: Number, default: 0 },
    /** Preferred side of the trigger. @default "top" */
    side: { type: String as PropType<TooltipSide>, default: "top" },
    /** Distance from the trigger, in pixels. @default 5 */
    sideOffset: { type: Number, default: 5 },
  },
  emits: {
    /** The clipboard write settled; `copied` says whether it succeeded (React's `onCopy`). */
    copy: (copied: boolean) => typeof copied === "boolean",
  },
  setup(props, { slots, emit }) {
    const open = ref(false)
    const copied = ref(false)
    let copiedTimer: ReturnType<typeof setTimeout> | undefined
    let mounted = true
    let copyGeneration = 0
    let stopPendingDismissListeners: (() => void) | undefined

    const cancelFeedback = () => {
      copyGeneration += 1
      stopPendingDismissListeners?.()
      stopPendingDismissListeners = undefined
      clearTimeout(copiedTimer)
    }

    const copy = async () => {
      cancelFeedback()
      // Success belongs to the completed attempt, not a new pending write.
      copied.value = false
      const generation = copyGeneration
      // A touch copy can start while closed, before TooltipContent installs its
      // dismissal listeners. Scrolling or Escape still cancels pending feedback.
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") cancelFeedback()
      }
      document.addEventListener("scroll", cancelFeedback, true)
      document.addEventListener("keydown", onKeyDown, true)
      stopPendingDismissListeners = () => {
        document.removeEventListener("scroll", cancelFeedback, true)
        document.removeEventListener("keydown", onKeyDown, true)
      }
      // "Copied!" follows the latest successful clipboard write
      const succeeded = await copyText(props.copyValue)
      if (!mounted) return
      emit("copy", succeeded)
      if (generation !== copyGeneration) return
      stopPendingDismissListeners?.()
      stopPendingDismissListeners = undefined
      if (!succeeded) return

      copied.value = true
      open.value = true

      // Persist the copied state for a second, then close
      clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => {
        open.value = false
      }, 1000)
    }

    onBeforeUnmount(() => {
      mounted = false
      stopPendingDismissListeners?.()
      clearTimeout(copiedTimer)
    })

    const handleOpenChange = (nextState: boolean) => {
      if (!nextState) cancelFeedback()
      // When opening, ensure timer and copied state are cleared
      if (nextState) {
        clearTimeout(copiedTimer)
        copied.value = false
      }

      open.value = nextState
    }

    return () =>
      h(
        TooltipRoot,
        {
          "open": open.value,
          "onUpdate:open": handleOpenChange,
          "delayDuration": props.openDelay,
          "disableHoverableContent": copied.value,
        },
        {
          default: () => [
            h(
              TooltipTrigger,
              {
                onClick: (evt: MouseEvent) => {
                  // Activate after a completed tap, not when a scrolling gesture starts.
                  // Keep the tooltip's click listener from closing the copy feedback.
                  evt.preventDefault()
                  evt.stopPropagation()
                  copy()
                },
                // Keyboard users copy with Enter or Space, like a click
                onKeydown: (evt: KeyboardEvent) => {
                  if (evt.key === "Enter" || evt.key === " ") {
                    evt.preventDefault()
                    copy()
                  }
                },
              },
              { default: () => slots.default?.() },
            ),
            // React also passes an Escape handler here, which Tooltip.Content
            // overrides with its own; Escape closes through TooltipRoot.
            h(
              TooltipContent,
              {
                compact: true,
                clickable: !copied.value,
                align: props.align,
                alignOffset: props.alignOffset,
                side: props.side,
                sideOffset: props.sideOffset,
                collisionPadding: 15,
                onClick: copy,
              },
              {
                default: () =>
                  copied.value
                    ? // The <Check /> SVG canvas whitespace is larger than copy, so we use a smaller flexbox gap
                      h("div", { class: "flex items-center gap-0.5" }, [h(Check), " Copied!"])
                    : h("div", { class: "flex items-center gap-1" }, [h(Copy), " Copy"]),
              },
            ),
          ],
        },
      )
  },
})

export type CopyTooltipProps = InstanceType<typeof CopyTooltip>["$props"]
