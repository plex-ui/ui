import { onBeforeUnmount, onMounted, ref, type Ref } from "vue"

/** Vue counterpart of React's `useDocumentVisible`: false while the tab is hidden. */
export function useDocumentVisible(): Ref<boolean> {
  const visible = ref(typeof document === "undefined" || document.visibilityState !== "hidden")

  const handleVisibility = () => {
    visible.value = document.visibilityState !== "hidden"
  }

  onMounted(() => {
    if (typeof document === "undefined") return
    document.addEventListener("visibilitychange", handleVisibility)
  })
  onBeforeUnmount(() => {
    if (typeof document === "undefined") return
    document.removeEventListener("visibilitychange", handleVisibility)
  })

  return visible
}
