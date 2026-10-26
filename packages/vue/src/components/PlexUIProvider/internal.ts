import { computed, inject, type ComputedRef } from "vue"
import { PlexUIContextKey, type LinkComponent } from "./PlexUIProvider.js"

/** The provider's link component, kept current when the provider's prop changes. */
export function useLinkComponent(): ComputedRef<LinkComponent> {
  const context = inject(PlexUIContextKey, null)
  return computed(() => context?.linkComponent ?? "a")
}
