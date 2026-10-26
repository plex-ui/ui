import { defineComponent, provide, type Component, type InjectionKey, type PropType } from "vue"

/** Component used to render internal links: `"a"` or your router's link (e.g. vue-router's `RouterLink`). */
export type LinkComponent = Component | "a"

type PlexUIContextValue = {
  linkComponent: LinkComponent
}

export const PlexUIContextKey: InjectionKey<PlexUIContextValue> = Symbol("PlexUI")

/**
 * Shared context for all Plex UI components - wrap your app in this
 * provider to use Plex UI components.
 *
 * It only holds the component used for rendering links, like the React
 * provider.
 */
export const PlexUIProvider = defineComponent({
  name: "PlexUIProvider",
  props: {
    linkComponent: { type: [String, Object, Function] as PropType<LinkComponent>, required: true },
  },
  setup(props, { slots }) {
    provide(PlexUIContextKey, {
      get linkComponent() {
        return props.linkComponent
      },
    })
    return () => slots.default?.()
  },
})
