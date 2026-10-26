import { defineComponent, h, onBeforeUnmount, onMounted, ref, type Component, type PropType } from "vue"
import { Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps } from "vue-sonner"
// sonner (React) injects its stylesheet on import; vue-sonner 2 ships it as a file
import "vue-sonner/style.css"
import { CheckCircle, InfoCircle, Warning, XCircle } from "../Icon/index.js"
import s from "@plexui/styles/components/Toast/Toast.module.css"

// Vue port of packages/ui/src/components/Toast/Toaster.tsx on vue-sonner, the
// Vue port of sonner. vue-sonner names a few options differently from sonner:
// `class` (sonner `className`), `classes` (`classNames`), `descriptionClass`
// (`descriptionClassName`), and `toast.custom` takes a component. The type
// icons are slots in vue-sonner (`icons` only feeds the close icon), so the
// Plex icons and a caller's `icons` go in as slots.

/**
 * Spread into any `toast(...)` options to get a shrink-to-fit, centered
 * layout: `toast("Saved", compact)`, `toast.success("Done", { ...compact, description })`.
 */
export const compact = { class: s.Compact } as const

type PlexTheme = "light" | "dark"

type ToastIcons = NonNullable<SonnerToasterProps["icons"]>

const readTheme = (): PlexTheme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"

/* Maps PlexUI semantic tokens onto sonner's CSS-variable hooks. Sonner's own
   stylesheet reads these for every toast, so the base look stays aligned with
   <Popover> / <Menu> without overriding each slot. */
const toasterStyle = {
  "--normal-bg": "var(--color-surface-elevated)",
  "--normal-text": "var(--color-text)",
  "--normal-border": "transparent",
  "--border-radius": "var(--radius-xl)",
  "--width": "400px",
}

const toastOptions = {
  classes: {
    toast: s.Toast,
    title: s.Title,
    description: s.Description,
    content: s.Content,
    icon: s.Icon,
    actionButton: s.ActionButton,
    cancelButton: s.CancelButton,
    success: s.Success,
    error: s.Error,
    warning: s.Warning,
    info: s.Info,
  },
}

const PLEX_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: Warning,
  info: InfoCircle,
} as const

// sonner's close icon. vue-sonner's own misspells `stroke-width` (`stoke-width`),
// so its X draws at the default 1px instead of 1.5px.
const CloseIcon = () =>
  h(
    "svg",
    {
      "xmlns": "http://www.w3.org/2000/svg",
      "width": "12",
      "height": "12",
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    [h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })],
  )

/**
 * Toast viewport. Every other vue-sonner `Toaster` prop (`expand`,
 * `visible-toasts`, `hotkey`, `dir`, `swipe-directions`, ...) is forwarded,
 * last, as React spreads `restProps`. Icon slots (`success-icon`, ...,
 * `close-icon`) replace the default icons.
 */
export const Toaster = defineComponent({
  name: "Toaster",
  inheritAttrs: false,
  props: {
    /** Where toasts anchor on the viewport. @default "top-center" */
    position: { type: String as PropType<SonnerToasterProps["position"]>, default: "top-center" },
    /** Default auto-dismiss duration in ms. @default 3000 */
    duration: { type: Number, default: 3000 },
    /** Distance from the viewport edge */
    offset: [String, Number, Object] as PropType<SonnerToasterProps["offset"]>,
    /** Gap between stacked toasts in px */
    gap: Number,
  },
  setup(props, { attrs, slots }) {
    const theme = ref<PlexTheme>("light")
    let observer: MutationObserver | null = null

    onMounted(() => {
      theme.value = readTheme()

      observer = new MutationObserver(() => {
        theme.value = readTheme()
      })

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      })
    })

    onBeforeUnmount(() => observer?.disconnect())

    // React passes `icons={{ success: <CheckCircle aria-hidden="true" />, ... }}`,
    // which a caller's `icons` replaces as a whole (sonner's own icons then)
    const iconSlot = (type: keyof typeof PLEX_ICONS) => {
      const own = slots[`${type}-icon`]
      if (own) return own
      const userIcons = attrs.icons as ToastIcons | undefined
      if (userIcons) {
        const icon = userIcons[type]
        return icon ? () => h(icon as Component) : undefined
      }
      return () => h(PLEX_ICONS[type], { "aria-hidden": "true" })
    }

    return () => {
      const iconSlots: Record<string, () => unknown> = {}
      for (const type of Object.keys(PLEX_ICONS) as Array<keyof typeof PLEX_ICONS>) {
        const slot = iconSlot(type)
        if (slot) iconSlots[`${type}-icon`] = slot
      }
      // sonner wraps a custom `icons.loading` in its loader box (vue-sonner
      // ignores it); the slot renders only while the toast is loading
      const loadingIcon = (attrs.icons as ToastIcons | undefined)?.loading
      if (slots["loading-icon"]) iconSlots["loading-icon"] = slots["loading-icon"]
      else if (loadingIcon) {
        iconSlots["loading-icon"] = () => h("div", { "class": "sonner-loader", "data-visible": "true" }, [h(loadingIcon)])
      }
      // vue-sonner prefers `icons.close` over this slot, as sonner does over its own icon
      iconSlots["close-icon"] = slots["close-icon"] ?? CloseIcon

      // vue-sonner's prop types reject `undefined`, which it treats as "use the default"
      return h(
        SonnerToaster as Component,
        {
          "theme": theme.value,
          "position": props.position,
          "duration": props.duration,
          "offset": props.offset,
          "gap": props.gap,
          "class": s.Toaster,
          "style": toasterStyle,
          "toastOptions": toastOptions,
          // sonner leaves these unset, so React renders no `data-invert` /
          // `data-rich-colors`. vue-sonner defaults them to `false` and prints
          // "false"; `null` keeps the attributes off, as `undefined` does in React.
          "invert": null,
          "richColors": null,
          // vue-sonner binds `$attrs` last on its <ol>: React's sonner renders
          // `data-sonner-toaster="true"` there and no `data-theme` (which would
          // also re-scope Plex's `:where([data-theme])` tokens at the toaster)
          "data-sonner-toaster": "true",
          "data-theme": undefined,
          ...attrs,
        },
        iconSlots,
      )
    }
  },
})

type ToasterOwnProps = InstanceType<typeof Toaster>["$props"]

/** Toaster props plus the vue-sonner `Toaster` props it forwards. */
export type ToasterProps = ToasterOwnProps &
  Omit<
    SonnerToasterProps,
    "position" | "duration" | "closeButton" | "offset" | "gap" | "theme" | "richColors" | "toastOptions" | "style"
  >
