import { computed, ref, watch, type CSSProperties, type Ref } from "vue"

// Internal: the hidden native checkbox ("BubbleInput") that Radix renders next
// to its Checkbox and Switch button while it sits in a form, so form
// submission, `onChange` on the form and reset work like a native input.
// Reka only renders a visually hidden input when a `name` is set, with
// different attributes and styling, so Checkbox and Switch render Radix's.

/** Radix's `isFormControl`: true until the button mounts (SSR), then whether it is in a form. */
export const useIsFormControl = (control: Ref<HTMLElement | null>, form: () => unknown) =>
  computed(() => (control.value ? Boolean(form()) || Boolean(control.value.closest("form")) : true))

/** Radix's `useSize`: the element's border-box size, kept current with a ResizeObserver. */
export const useSize = (element: () => HTMLElement | null) => {
  const size = ref<{ width: number; height: number }>()

  watch(
    element,
    (el, _, onCleanup) => {
      if (!el) {
        size.value = undefined
        return
      }
      size.value = { width: el.offsetWidth, height: el.offsetHeight }
      if (typeof ResizeObserver === "undefined") return

      const observer = new ResizeObserver((entries) => {
        if (!Array.isArray(entries) || !entries.length) return
        const entry = entries[0]
        if ("borderBoxSize" in entry) {
          const borderSizeEntry = entry.borderBoxSize
          const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry
          size.value = { width: borderSize.inlineSize, height: borderSize.blockSize }
        } else {
          size.value = { width: el.offsetWidth, height: el.offsetHeight }
        }
      })
      observer.observe(el, { box: "border-box" })
      onCleanup(() => observer.unobserve(el))
    },
    { immediate: true, flush: "post" },
  )

  return size
}

/** The input's inline style: on top of the button, invisible, out of the pointer's way. */
export const bubbleInputStyle = (
  size: { width: number; height: number } | undefined,
  style?: CSSProperties,
): CSSProperties => ({
  ...style,
  ...(size ? { width: `${size.width}px`, height: `${size.height}px` } : {}),
  position: "absolute",
  pointerEvents: "none",
  opacity: 0,
  margin: 0,
})

/**
 * Sets the input's `checked` (and `indeterminate`) through the native setter
 * and dispatches a `click` so form listeners see the change, as Radix does.
 */
export const dispatchBubbleClick = (
  input: HTMLInputElement,
  checked: boolean | "indeterminate",
  bubbles: boolean,
  withIndeterminate: boolean,
) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")
  const setChecked = descriptor?.set
  if (!setChecked) return
  if (withIndeterminate) input.indeterminate = checked === "indeterminate"
  setChecked.call(input, checked === "indeterminate" ? false : checked)
  input.dispatchEvent(new Event("click", { bubbles }))
}
