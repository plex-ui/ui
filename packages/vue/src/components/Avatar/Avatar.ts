import { defineComponent, h, ref, type Component, type HTMLAttributes, type PropType, type VNode } from "vue"
import type { SemanticColors, Variants } from "@plexui/styles/types"
import { toCssVariables } from "../../lib/helpers.js"
import s from "@plexui/styles/components/Avatar/Avatar.module.css"

// Vue port of packages/ui/src/components/Avatar/Avatar.tsx. Props, defaults
// and rendered attributes match React 1:1 (checked by the parity tests).
//
// React spreads every prop it does not use (`onClick`, `onPointerDown`, `id`,
// `style`, ...) onto the root after its own attributes. Here those arrive as
// `attrs` and are spread last the same way, so a caller's `role`, `type` or
// `style` wins. A `click` or `pointerdown` listener makes the avatar a button.

type ImageStatus = undefined | "error" | "loaded"

export type AvatarColor = SemanticColors<"primary" | "secondary" | "success" | "info" | "discovery" | "danger">

const avatarProps = {
  /** Size of the avatar's width & height, in pixels. */
  size: Number,
  /** Display a formatted count of overflow objects. */
  overflowCount: Number,
  /** Name used to display initials from */
  name: String,
  /** Color used for the avatar. @default "secondary" */
  color: { type: String as PropType<AvatarColor>, default: "secondary" },
  /** Style variant of the avatar. @default "soft" */
  variant: { type: String as PropType<Variants<"soft" | "solid">>, default: "soft" },
  /** URL of the image to display as the avatar */
  imageUrl: String,
  /** Icon component to render in the avatar circle (e.g. `Robot` from `@plexui/vue/components/Icon`) */
  Icon: [Object, Function] as PropType<Component>,
}

const validateImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) {
    return
  }

  // Avoid specific pattern of images from gravatar.com, which use a pair of initials, instead of a single initial.
  if (imageUrl.includes("gravatar.com") && imageUrl.includes("cdn.auth0.com")) {
    return
  }

  return imageUrl
}

const renderImage = (url: string, status: ImageStatus, onLoad: () => void, onError: () => void) =>
  h("span", { class: s.AvatarImageContainer }, [
    h("img", {
      "onLoad": onLoad,
      "onError": onError,
      "src": url,
      "class": s.AvatarImage,
      "data-loaded": status === "loaded" ? "" : undefined,
      "alt": "",
      "role": "presentation",
    }),
  ])

const renderInitial = (name = "") => h("span", { class: s.AvatarInitial }, name.charAt(0).toUpperCase())

const renderOverflowCount = (count: number) => {
  const formattedCount = new Intl.NumberFormat("en", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 0,
  })
    .format(count)
    .toLocaleLowerCase()

  return h("span", { "class": s.AvatarOverflowCount, "data-letter-count": formattedCount.length }, [
    h("span", { class: s.AvatarOverflowCountSymbol }, "+"),
    formattedCount,
  ])
}

const AvatarInner = defineComponent({
  name: "AvatarInner",
  inheritAttrs: false,
  props: avatarProps,
  setup(props, { attrs }) {
    const imageStatus = ref<ImageStatus>()

    return () => {
      const { class: className, ...restAttrs } = attrs
      const isInteractive = !!(attrs.onPointerdown || attrs.onClick)
      const { imageUrl, overflowCount, Icon } = props

      // Render a placeholder layer (initials / overflow / icon) behind the
      // image so slow networks never leave the avatar visually empty while
      // the image is loading. The image overlays it once loaded and hides
      // it when it fails, so the avatar is never blank.
      const placeholder = overflowCount
        ? renderOverflowCount(overflowCount)
        : Icon
          ? h(Icon, { class: s.AvatarIcon })
          : renderInitial(props.name)

      const children: VNode[] =
        imageUrl && imageStatus.value !== "error"
          ? [
              placeholder,
              renderImage(
                imageUrl,
                imageStatus.value,
                () => (imageStatus.value = "loaded"),
                () => (imageStatus.value = "error"),
              ),
            ]
          : [placeholder]

      return h(
        isInteractive ? "button" : "span",
        {
          "class": [s.Avatar, className],
          "style": toCssVariables({ "avatar-size": props.size }),
          "role": isInteractive ? undefined : "presentation",
          "data-color": props.color,
          "data-variant": props.variant,
          "type": isInteractive ? "button" : undefined,
          ...restAttrs,
        },
        children,
      )
    }
  },
})

const AvatarComponent = defineComponent({
  name: "Avatar",
  inheritAttrs: false,
  props: avatarProps,
  setup(props, { attrs }) {
    // Keying off of imageUrl remounts the avatar when it changes, which
    // resets the image status, as React's `key={validImageUrl}` does
    return () => {
      const validImageUrl = validateImageUrl(props.imageUrl)
      return h(AvatarInner, { ...attrs, ...props, imageUrl: validImageUrl, key: validImageUrl })
    }
  },
})

type AvatarOwnProps = InstanceType<typeof AvatarComponent>["$props"]

/**
 * Avatar props plus the attributes and listeners that fall through to the root,
 * as React's rest props do. `onClick` / `onPointerdown` make the avatar interactive.
 */
export type AvatarProps = AvatarOwnProps & Omit<HTMLAttributes, keyof AvatarOwnProps>

export const Avatar = AvatarComponent as typeof AvatarComponent & { new (): { $props: AvatarProps } }
