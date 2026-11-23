import { defineComponent, onBeforeUnmount, onMounted, provide, watch, type Component, type InjectionKey, type PropType } from "vue"
import { installAndroidRipple } from "./androidRipple.js"

/** Component used to render internal links: `"a"` or your router's link (e.g. vue-router's `RouterLink`). */
export type LinkComponent = Component | "a"

/**
 * The phone look of the components (with `@plexui/styles/styles/touch.css`): `"ios"` draws iOS 26, `"android"` the
 * Plex Android look, `"auto"` the Android look on an Android browser and iOS elsewhere.
 */
export type PlexUIPlatform = "auto" | "ios" | "android"

type PlexUIContextValue = {
  linkComponent: LinkComponent
}

export const PlexUIContextKey: InjectionKey<PlexUIContextValue> = Symbol("PlexUI")

/** `"android"` on an Android browser, else null (the default iOS look) */
function detectPlatform(): "android" | null {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) ? "android" : null
}

/**
 * Shared context for all Plex UI components - wrap your app in this
 * provider to use Plex UI components.
 *
 * It holds the component used for rendering links and picks the phone look
 * (`platform`), like the React provider.
 */
export const PlexUIProvider = defineComponent({
  name: "PlexUIProvider",
  props: {
    linkComponent: { type: [String, Object, Function] as PropType<LinkComponent>, required: true },
    /** The phone look: iOS 26, the Plex Android look, or `"auto"` (Android on an Android browser) */
    platform: { type: String as PropType<PlexUIPlatform>, default: "auto" },
  },
  setup(props, { slots }) {
    provide(PlexUIContextKey, {
      get linkComponent() {
        return props.linkComponent
      },
    })

    // Sets `data-platform` on the document's root, which the phone styles read. `"auto"` leaves the root alone
    // except on Android, so a page (or a docs frame) that sets the attribute itself keeps it.
    let restore: (() => void) | null = null
    // A press ripples in the Android look (androidRipple.ts); the iOS look has no listener.
    let stopRipple: (() => void) | null = null
    const apply = () => {
      restore?.()
      restore = null
      stopRipple?.()
      stopRipple = null
      const resolved = props.platform === "auto" ? detectPlatform() : props.platform
      if (resolved === "android") stopRipple = installAndroidRipple()
      if (!resolved) return
      const root = document.documentElement
      const previous = root.getAttribute("data-platform")
      root.setAttribute("data-platform", resolved)
      restore = () => {
        if (previous === null) root.removeAttribute("data-platform")
        else root.setAttribute("data-platform", previous)
      }
    }
    onMounted(apply)
    watch(() => props.platform, apply)
    onBeforeUnmount(() => {
      restore?.()
      restore = null
      stopRipple?.()
      stopRipple = null
    })

    return () => slots.default?.()
  },
})
