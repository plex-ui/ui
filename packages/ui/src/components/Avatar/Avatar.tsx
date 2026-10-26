"use client"

import clsx from "clsx"
import { useMemo, useState } from "react"
import { toCssVariables } from "../../lib/helpers"
import { type SemanticColors, type Variants } from "../../types"
import s from "@plexui/styles/components/Avatar/Avatar.module.css"

type ImageStatus = undefined | "error" | "loaded"

export type AvatarProps = {
  /** Class name applied to the avatar */
  className?: string
  /** Size of the avatar's width & height, in pixels. */
  size?: number
  /** Display a formatted count of overflow objects. */
  overflowCount?: number
  /** Name used to display initials from */
  name?: string
  /**
   * Color used for the avatar
   * @default secondary
   */
  color?: SemanticColors<"primary" | "secondary" | "success" | "info" | "discovery" | "danger">
  /**
   * Style variant of the avatar
   * @default soft
   */
  variant?: Variants<"soft" | "solid">
  /** URL of the image to display as the avatar */
  imageUrl?: string
  /** Icon to render in the avatar circle */
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Optional click handler, which also enables semantic interactions */
  onClick?: () => void
  /** Optional pointer handler, which also enables semantic interactions */
  onPointerDown?: () => void
}

export const Avatar = (props: AvatarProps) => {
  // Validate the image url before sending to the component
  const validImageUrl = validateImageUrl(props.imageUrl)

  // Keying off of imageUrl allows us to refresh imageStatus automatically through React rendering
  return <AvatarInner {...props} imageUrl={validImageUrl} key={validImageUrl} />
}

export const AvatarInner = (props: AvatarProps) => {
  const {
    className,
    size,
    overflowCount,
    name,
    color = "secondary",
    variant = "soft",
    imageUrl,
    Icon,
    // asChild support
    ...restProps
  } = props
  const [imageStatus, setImageStatus] = useState<ImageStatus>()
  const isInteractive = !!(restProps.onPointerDown || restProps.onClick)
  const TagName = isInteractive ? "button" : "span"

  return (
    <TagName
      className={clsx(s.Avatar, className)}
      style={toCssVariables({
        "avatar-size": size,
      })}
      role={isInteractive ? undefined : "presentation"}
      // An interactive avatar is a button; name it by the full name, not the initial
      aria-label={isInteractive ? name : undefined}
      data-color={color}
      data-variant={variant}
      type={isInteractive ? "button" : undefined}
      {...restProps}
    >
      {(() => {
        // Render a placeholder layer (initials / overflow / icon) behind the
        // image so slow networks never leave the avatar visually empty while
        // the image is loading. The image overlays it once loaded and hides
        // it when it fails — either way the avatar is never blank.
        const placeholder = overflowCount ? (
          <AvatarOverflowCount count={overflowCount} />
        ) : Icon ? (
          <Icon className={s.AvatarIcon} />
        ) : (
          <AvatarInitial name={name} />
        )

        if (imageUrl && imageStatus !== "error") {
          return (
            <>
              {placeholder}
              <AvatarImage
                status={imageStatus}
                url={imageUrl}
                onError={() => setImageStatus("error")}
                onLoad={() => setImageStatus("loaded")}
              />
            </>
          )
        }
        return placeholder
      })()}
    </TagName>
  )
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

const AvatarImage = ({
  url,
  status,
  onLoad,
  onError,
}: {
  url: string
  status: ImageStatus
  onLoad: () => void
  onError: () => void
}) => {
  return (
    <span className={s.AvatarImageContainer}>
      <img
        // An image that loaded before hydration fired its load event before
        // React listened for it, and React does not replay it: read the
        // element instead
        ref={(img) => {
          if (img && status !== "loaded" && img.complete && img.naturalWidth > 0) onLoad()
        }}
        src={url}
        className={s.AvatarImage}
        data-loaded={status === "loaded" ? "" : undefined}
        onLoad={onLoad}
        onError={onError}
        alt=""
        role="presentation"
      />
    </span>
  )
}

const AvatarInitial = ({ name = "" }: { name?: string }) => {
  const firstInitial = useMemo(() => name.charAt(0).toUpperCase(), [name])

  return <span className={s.AvatarInitial}>{firstInitial}</span>
}

const AvatarOverflowCount = ({ count }: { count: number }) => {
  const formattedCount = useMemo<string>(() => {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 0,
    })
      .format(count)
      .toLocaleLowerCase()
  }, [count])

  return (
    <span className={s.AvatarOverflowCount} data-letter-count={formattedCount.length}>
      <span className={s.AvatarOverflowCountSymbol}>+</span>
      {formattedCount}
    </span>
  )
}
