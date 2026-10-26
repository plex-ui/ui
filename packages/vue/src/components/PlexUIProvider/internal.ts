import { inject } from "vue"
import { PlexUIContextKey, type LinkComponent } from "./PlexUIProvider.js"

export function useLinkComponent(): LinkComponent {
  return inject(PlexUIContextKey, null)?.linkComponent ?? "a"
}
