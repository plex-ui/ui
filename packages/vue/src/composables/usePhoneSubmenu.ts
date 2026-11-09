import { onUpdated, shallowRef, watch, type ComputedRef, type ShallowRef } from "vue"
import { observePhoneSubmenu, samePhoneSubmenuState, type MenuFloatingBoundary, type PhoneSubmenuState } from "../lib/menuSubmenuPlacement.js"

/** `onParentPress` collapses the submenu when a press lands on the parent it stands over. */
export function usePhoneSubmenu(active: () => boolean, trigger: ShallowRef<HTMLElement | null>, content: ShallowRef<HTMLElement | null>, boundary: ComputedRef<MenuFloatingBoundary>, onParentPress?: () => void) {
  const state = shallowRef<PhoneSubmenuState>({ mobile: false })
  let observer: ReturnType<typeof observePhoneSubmenu> | undefined
  watch([active, trigger, content, boundary], ([open, triggerElement, contentElement, options], _previous, onCleanup) => {
    if (!open || !triggerElement || !contentElement) return
    const current = observePhoneSubmenu(triggerElement, contentElement, options, (next) => {
      if (!samePhoneSubmenuState(state.value, next)) state.value = next
    }, onParentPress)
    observer = current
    onCleanup(() => { current.dispose(); observer = undefined })
  }, { immediate: true, flush: "post" })
  onUpdated(() => observer?.refresh())
  return state
}
