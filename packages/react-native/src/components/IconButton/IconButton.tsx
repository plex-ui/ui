import type { ReactElement } from "react"
import { Button, type ButtonProps } from "../Button/Button"
import type { IconProps } from "../Icon/createIcon"

export type IconButtonProps = Omit<ButtonProps, "children" | "uniform" | "block" | "accessibilityLabel"> & {
  /** The icon, an element of `@plexui/react-native/icons` (or another set): it takes the button's color and size. */
  icon: ReactElement<IconProps>
  /** What the button does, for assistive technologies: an icon alone says nothing to them. */
  accessibilityLabel: string
}

/**
 * A button with an icon alone, as wide as it is tall: a circle on iOS (in glass with `mobileMaterial="glass"`, as
 * the bar buttons of iOS 26), a Material 3 icon button on Android (standard for ghost, filled for solid, tonal for
 * soft, outlined), with the 48dp touch target Material asks for.
 * @default variant "ghost"
 */
export function IconButton({ icon, variant = "ghost", ...rest }: IconButtonProps) {
  return (
    <Button uniform variant={variant} {...rest}>
      {icon}
    </Button>
  )
}
