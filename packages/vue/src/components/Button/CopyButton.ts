import { defineComponent, h, onBeforeUnmount, ref, type PropType } from "vue"
import { copyToClipboard, type ClipboardContent } from "../../lib/copyToClipboard.js"
import Check from "../Icon/svg/CheckMd.js"
import Copy from "../Icon/svg/Copy.js"
import { Animate } from "../Transition/index.js"
import { Button } from "./Button.js"

/**
 * Port of packages/ui/src/components/Button/CopyButton.tsx. Every Button
 * prop passes through; the default slot receives `{ copied }`, like the
 * React render-function child.
 */
export const CopyButton = defineComponent({
  name: "CopyButton",
  props: {
    copyValue: {
      type: [String, Object, Function] as PropType<
        string | ClipboardContent | (() => string) | (() => ClipboardContent)
      >,
      required: true,
    },
  },
  emits: {
    click: (_event: MouseEvent) => true,
  },
  setup(props, { slots, emit }) {
    const copied = ref(false)
    let copiedTimeout: number | null = null

    const handleClick = (event: MouseEvent) => {
      // No-op when copied is true
      if (copied.value) {
        return
      }

      copied.value = true
      emit("click", event)

      // Copy content to clipboard
      // NOTE: Failures are a silent no-op
      copyToClipboard(typeof props.copyValue === "function" ? props.copyValue() : props.copyValue)

      copiedTimeout = window.setTimeout(() => {
        copied.value = false
      }, 1300)
    }

    onBeforeUnmount(() => {
      if (copiedTimeout) clearTimeout(copiedTimeout)
    })

    return () =>
      h(Button, { onClick: handleClick }, {
        default: () => [
          h(
            Animate,
            {
              class: "w-[var(--button-icon-size)] h-[var(--button-icon-size)]",
              initial: { scale: 0.6 },
              enter: { scale: 1, delay: 150, duration: 300 },
              exit: { scale: 0.6, duration: 150 },
              forceCompositeLayer: true,
            },
            { default: () => [copied.value ? h(Check, { key: "copied-icon" }) : h(Copy, { key: "copy-icon" })] },
          ),
          slots.default?.({ copied: copied.value }),
        ],
      })
  },
})
