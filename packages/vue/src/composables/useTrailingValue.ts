import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue"

/**
 * Returns a version of `value` that updates to the latest `value` after `delay`
 * milliseconds. Useful for holding on to a previous value for a short time
 * after it changes (e.g. for coordinating animations).
 */
export function useTrailingValue<T>(value: MaybeRefOrGetter<T>, delay: MaybeRefOrGetter<number>): Ref<T> {
  const trailing = ref(toValue(value)) as Ref<T>
  let timeouts: ReturnType<typeof setTimeout>[] = []

  const schedule = (next: T) => {
    const timer = setTimeout(() => {
      trailing.value = next
      timeouts = timeouts.filter((t) => t !== timer)
    }, toValue(delay))
    timeouts.push(timer)
  }

  // React schedules on mount as well, which re-applies the initial value.
  // Timers start on mount only, so server rendering leaves none behind
  onMounted(() => {
    watch(() => toValue(value), schedule, { immediate: true })
  })

  // clear up any unsettled timeouts on unmount
  onBeforeUnmount(() => {
    timeouts.forEach(clearTimeout)
    timeouts = []
  })

  return trailing
}
