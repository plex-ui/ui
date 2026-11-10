import clsx from "clsx"
import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue"
import s from "@plexui/styles/components/PhoneLayout/PhoneLayout.module.css"
import { PHONE_MEDIA } from "../../lib/phoneLayout.js"

export type PhoneLayoutValue = {
  /** Where dialogs inside the layout portal to: the PhoneLayout box, or null for the document body. */
  container: Ref<HTMLElement | null>
  /** Whether what is inside is laid out as on a phone: always inside a PhoneLayout, as its `layout` says in a Dialog. */
  phone: Readonly<Ref<boolean>>
}

/** Provided inside a PhoneLayout and a Dialog. */
export const PHONE_LAYOUT: InjectionKey<PhoneLayoutValue> = Symbol("PhoneLayout")

/**
 * Lays out what it holds as on a phone at any window width, such as a phone frame on a desktop page: components take
 * their phone presentation inside it, and a Dialog opened inside it covers the box instead of the window.
 */
export const PhoneLayout = defineComponent({
  name: "PhoneLayout",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const container = shallowRef<HTMLElement | null>(null)
    provide(PHONE_LAYOUT, { container, phone: ref(true) })
    return () =>
      h(
        "div",
        { ...attrs, ref: container, class: clsx(s.PhoneLayout, attrs.class as string | undefined), "data-plex-layout": "phone" },
        slots.default?.(),
      )
  },
})

/**
 * Whether components here are laid out as on a phone: inside a PhoneLayout (or a Dialog with `layout="phone"`), or
 * in a window 767px wide or narrower. The server answers false outside a PhoneLayout.
 */
export const usePhoneLayout = (): ComputedRef<boolean> => {
  const scope = inject(PHONE_LAYOUT, null)
  const narrow = usePhoneWindow()
  return computed(() => !!scope?.phone.value || narrow.value)
}

/**
 * Whether the window is 767px wide or narrower, whatever PhoneLayout is around: for a part portaled out of one, which
 * its phone rules do not reach (a Select's list). The server answers false.
 */
export const usePhoneWindow = (): Ref<boolean> => {
  const narrow = ref(false)
  let query: MediaQueryList | null = null
  const update = () => { narrow.value = query?.matches ?? false }
  onMounted(() => {
    if (typeof window.matchMedia !== "function") return
    query = window.matchMedia(PHONE_MEDIA)
    update()
    // Safari before 14 has only the older listener methods
    if (typeof query.addEventListener === "function") query.addEventListener("change", update)
    else query.addListener(update)
  })
  onBeforeUnmount(() => {
    if (!query) return
    if (typeof query.removeEventListener === "function") query.removeEventListener("change", update)
    else query.removeListener(update)
  })
  return narrow
}
