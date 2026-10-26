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

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Direction of the joined buttons.
   * @default "horizontal"
   */
  orientation?: ButtonGroupOrientation
  className?: string
  ref?: Ref<HTMLDivElement>
}

const ButtonGroupRoot = ({
  orientation = "horizontal",
  className,
  ref,
  ...restProps
}: ButtonGroupProps) => (
  <div
    ref={ref}
    role="group"
    data-slot="button-group"
    data-orientation={orientation}
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
   * When omitted, flips to match the surrounding ButtonGroup axis.
   * Pass explicitly to override (rare).
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
