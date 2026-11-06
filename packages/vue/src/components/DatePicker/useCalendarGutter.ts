import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef } from "vue"

// Mirrors React's useWindowSize subscription; the CSS uses the same gutter
// formula so Popover's numeric collision padding matches the rendered width.
export const useCalendarGutter = (): ComputedRef<number> => {
  const width = ref<number>()
  const update = () => { width.value = window.innerWidth }

  onMounted(() => {
    update()
    window.addEventListener("resize", update)
  })
  onBeforeUnmount(() => window.removeEventListener("resize", update))

  return computed(() => width.value === undefined ? 16 : Math.max(3, Math.min(16, (width.value - 308) / 4)))
}
