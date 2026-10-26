import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue"

// Vue port of packages/ui/src/components/Popover/usePopoverContext.tsx.
// React's mutable refs become `{ current }` boxes (not reactive, like refs)
// and the element refs become Vue refs.

export type PopoverContextValue = {
  open: ComputedRef<boolean>
  setOpen: (next: boolean) => void
  shake: Ref<boolean>
  setShake: (next: boolean) => void
  showOnHover: ComputedRef<boolean>
  temporarilyPreventClickToClose: Ref<boolean>
  onTriggerEnter: () => void
  onTriggerLeave: () => void
  hoverOpenFocusedWithTab: { current: boolean }
  isPointerInTransitRef: { current: boolean }
  triggerRef: Ref<HTMLElement | null>
  contentRef: Ref<HTMLElement | null>
}

export const PopoverContextKey: InjectionKey<PopoverContextValue> = Symbol("PlexUIPopover")

export const usePopoverContext = () => {
  const context = inject(PopoverContextKey, null)

  if (!context) {
    throw new Error("Popover components must be wrapped in <Popover />")
  }

  return context
}
