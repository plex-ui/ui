import { onBeforeUnmount, ref, watch, type Ref } from "vue"

/** Tracks whether `target` overflows and whether it is scrolled to its start or end. */
export const useScrollable = (target: Ref<HTMLElement | null | undefined>) => {
  const isScrollable = ref(false)
  const isAtStart = ref(true)
  const isAtEnd = ref(false)
  let cleanup: (() => void) | undefined

  watch(
    target,
    (container) => {
      cleanup?.()
      cleanup = undefined
      if (!container) return

      const checkScroll = () => {
        const { scrollHeight, clientHeight, scrollTop } = container
        isScrollable.value = scrollHeight > clientHeight
        isAtStart.value = scrollTop === 0
        isAtEnd.value = scrollTop + clientHeight >= scrollHeight
      }

      checkScroll()

      container.addEventListener("scroll", checkScroll, { passive: true })
      const resizeObserver = new ResizeObserver(checkScroll)
      resizeObserver.observe(container)

      cleanup = () => {
        container.removeEventListener("scroll", checkScroll)
        resizeObserver.disconnect()
      }
    },
    { immediate: true, flush: "post" },
  )

  onBeforeUnmount(() => cleanup?.())

  return { isScrollable, isAtStart, isAtEnd }
}
