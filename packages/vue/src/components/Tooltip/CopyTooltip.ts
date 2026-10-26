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
    copy: (_copied: boolean) => true,
  },
  setup(props, { slots, emit }) {
    const open = ref(false)
    const copied = ref(false)
    let copiedTimer: ReturnType<typeof setTimeout> | undefined
    let mounted = true

    const copy = async () => {
      // "Copied!" follows the clipboard: a failed write keeps the tooltip as it was
      const succeeded = await copyText(props.copyValue)
      if (!mounted) return
      emit("copy", succeeded)
      if (!succeeded) return

      copied.value = true

      // Persist the copied state for a second, then close
      clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => {
        open.value = false
      }, 1000)
    }

    onBeforeUnmount(() => {
      mounted = false
      clearTimeout(copiedTimer)
    })

    const handleOpenChange = (nextState: boolean) => {
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
          "disableHoverableContent": false,
        },
        {
          default: () => [
            h(
              TooltipTrigger,
              {
                onPointerdown: (evt: PointerEvent) => {
                  // Prevent tooltip listeners from closing
                  evt.preventDefault()
                  evt.stopPropagation()

                  // Copy the value
                  copy()
                },
                // Prevent default behavior of closing on click from this handler
                onClick: (evt: MouseEvent) => {
                  evt.preventDefault()
                  evt.stopPropagation()
                },
                // Keyboard users copy with Enter or Space, like a click
                onKeydown: (evt: KeyboardEvent) => {
                  if (evt.key === "Enter" || evt.key === " ") {
                    evt.preventDefault()
                    open.value = true
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
                onPointerdown: copy,
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
