"use client"

import clsx from "clsx"
import { Slot } from "radix-ui"
import { type ComponentProps, type HTMLAttributes, type Ref } from "react"
import { Separator } from "../Separator"
import s from "@plexui/styles/components/ButtonGroup/ButtonGroup.module.css"

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type ButtonGroupOrientation = "horizontal" | "vertical"

export type ButtonGroupMobileMaterial = "glass" | "flat"

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Direction of the joined buttons.
   * @default "horizontal"
   */
  orientation?: ButtonGroupOrientation
  /**
   * Phone surface (below 768px, with touch.css). `"glass"` makes the group one glass capsule, the Button Group
   * of the iOS 27 kit, for controls over the content; a group in a Toolbar is one already. `"flat"` keeps the
   * joined buttons in a Toolbar.
   */
  mobileMaterial?: ButtonGroupMobileMaterial
  className?: string
  ref?: Ref<HTMLDivElement>
}

const ButtonGroupRoot = ({
  orientation = "horizontal",
  mobileMaterial,
  className,
  ref,
  ...restProps
}: ButtonGroupProps) => (
  <div
    ref={ref}
    role="group"
    data-slot="button-group"
    data-orientation={orientation}
    data-mobile-material={mobileMaterial}
    className={clsx(s.Root, className)}
    {...restProps}
  />
)

/* ------------------------------------------------------------------ */
/*  Separator — thin divider between items                             */
/* ------------------------------------------------------------------ */

export type ButtonGroupSeparatorProps = Omit<
  ComponentProps<typeof Separator>,
  "orientation"
> & {
  /**
   * When omitted, uses `"vertical"`, the axis that looks right between
   * horizontal items. Pass explicitly inside a vertical group.
   * @default "vertical"
   */
  orientation?: ButtonGroupOrientation
}

const ButtonGroupSeparator = ({
  className,
  orientation,
  ...restProps
}: ButtonGroupSeparatorProps) => (
  <Separator
    data-slot="button-group-separator"
    orientation={orientation ?? "vertical"}
    className={clsx(s.Separator, className)}
    {...restProps}
  />
)

/* ------------------------------------------------------------------ */
/*  Text — muted label/pill sharing the group's joined geometry        */
/* ------------------------------------------------------------------ */

export type ButtonGroupTextProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Swap the rendered element for a child (label, span, etc.) while
   * keeping the group's visual treatment.
   * @default false
   */
  asChild?: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
}

const ButtonGroupText = ({
  asChild = false,
  className,
  ref,
  ...restProps
}: ButtonGroupTextProps) => {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      ref={ref}
      data-slot="button-group-text"
      className={clsx(s.Text, className)}
      {...restProps}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Export — compound API                                              */
/* ------------------------------------------------------------------ */

type ButtonGroupComponent = typeof ButtonGroupRoot & {
  Separator: typeof ButtonGroupSeparator
  Text: typeof ButtonGroupText
}

export const ButtonGroup = ButtonGroupRoot as ButtonGroupComponent
ButtonGroup.Separator = ButtonGroupSeparator
ButtonGroup.Text = ButtonGroupText
