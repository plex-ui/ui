import { defineComponent, h, onBeforeUnmount, ref, type PropType } from "vue"
import { copyToClipboard, type ClipboardContent } from "../../lib/copyToClipboard.js"
import Check from "../Icon/svg/CheckMd.js"
import Copy from "../Icon/svg/Copy.js"
import { Animate } from "../Transition/index.js"
import { Button, type ButtonProps } from "./Button.js"

const CopyButtonComponent = defineComponent({
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
    /** The clipboard write settled; `copied` says whether it succeeded (React's `onCopy`). */
    copy: (_copied: boolean) => true,
  },
  setup(props, { slots, emit, attrs }) {
    const copied = ref(false)
    let copiedTimeout: number | null = null
    let pending = false
    let mounted = true

    const handleClick = async (event: MouseEvent) => {
      // No-op while copied, or while a write is still in flight
      if (copied.value || pending) {
        return
      }

      emit("click", event)

      // The copied state follows the clipboard: a failed write shows no check
      pending = true
      const succeeded = await copyToClipboard(typeof props.copyValue === "function" ? props.copyValue() : props.copyValue)
      pending = false
      if (!mounted) return
      emit("copy", succeeded)
      if (!succeeded) return

      copied.value = true
      copiedTimeout = window.setTimeout(() => {
        copied.value = false
      }, 1300)
    }

    onBeforeUnmount(() => {
      mounted = false
      if (copiedTimeout) clearTimeout(copiedTimeout)
    })

    return () => {
      // Icon-only copy buttons have no text content, so they need a name of their own
      const ariaLabel =
        (attrs["aria-label"] as string | undefined) ?? (slots.default ? undefined : copied.value ? "Copied" : "Copy")

      return h(Button, { "aria-label": ariaLabel, "onClick": handleClick }, {
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
    }
  },
})

type CopyButtonOwnProps = InstanceType<typeof CopyButtonComponent>["$props"]

/** CopyButton props plus every Button prop, which pass through to the Button. */
export type CopyButtonProps = CopyButtonOwnProps & Omit<ButtonProps, keyof CopyButtonOwnProps>

/**
 * Port of packages/ui/src/components/Button/CopyButton.tsx. Every Button
 * prop passes through; the default slot receives `{ copied }`, like the
 * React render-function child.
 */
export const CopyButton = CopyButtonComponent as typeof CopyButtonComponent & { new (): { $props: CopyButtonProps } }
