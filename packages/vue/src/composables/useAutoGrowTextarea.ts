import { onBeforeUnmount, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue"

type AutoGrowTextarea = HTMLTextAreaElement & { __autoGrowHeightValue?: number }

/** Grows a textarea with its content; pass the textarea ref and its (v-model) value. */
export const useAutoGrowTextarea = (
  target: Ref<HTMLTextAreaElement | null | undefined>,
  value: MaybeRefOrGetter<string>,
) => {
  let lastScrollHeight = 0
  let lastWidth: number | null = null

  const measureAndMutate = (textarea: AutoGrowTextarea, controlledValue: string = "") => {
    textarea.style.height = "0px"
    const { scrollHeight, offsetHeight, offsetWidth, clientHeight } = textarea
    const targetHeight = scrollHeight + (offsetHeight - clientHeight)
    textarea.__autoGrowHeightValue = targetHeight
    textarea.style.height = `${targetHeight}px`

    if (lastScrollHeight < scrollHeight && textarea.selectionEnd === controlledValue.length) {
      textarea.scrollTop = scrollHeight
    }
    lastScrollHeight = textarea.scrollHeight
    lastWidth = offsetWidth
  }

  // The value is committed to the DOM before this runs, like React's layout effect
  watch(
    () => [target.value, toValue(value)] as const,
    ([textarea, current]) => {
      if (textarea) measureAndMutate(textarea, current)
    },
    { immediate: true, flush: "post" },
  )

  let observer: ResizeObserver | undefined
  watch(
    target,
    (textarea) => {
      observer?.disconnect()
      observer = undefined
      if (!textarea) return

      observer = new ResizeObserver(() => {
        const nextWidth = textarea.offsetWidth
        // Only concerned with width changes that might affect the last measured height
        if (lastWidth == null || nextWidth !== lastWidth) {
          measureAndMutate(textarea, textarea.value)
        }
      })
      observer.observe(textarea)
    },
    { immediate: true, flush: "post" },
  )
  onBeforeUnmount(() => observer?.disconnect())
}

export const unsafeForceCalculateAutoGrowHeight = (textarea: HTMLTextAreaElement) => {
  // Reset the height to baseline (min-height will apply)
  textarea.style.height = "0px"
  // scrollHeight does not account for border thickness, which we can
  // calculate by comparing offset and client height.
  const { scrollHeight, offsetHeight, clientHeight } = textarea
  const targetHeight = scrollHeight + (offsetHeight - clientHeight)
  ;(textarea as AutoGrowTextarea).__autoGrowHeightValue = targetHeight
  textarea.style.height = `${targetHeight}px`
}

export const getAutoGrowTextareaHeight = (textarea: HTMLTextAreaElement) =>
  // Avoid unnecessary paints by reading stored height
  (textarea as AutoGrowTextarea).__autoGrowHeightValue || textarea.clientHeight
