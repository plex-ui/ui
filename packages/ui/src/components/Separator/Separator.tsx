"use client"

import clsx from "clsx"
import { type ComponentProps } from "react"
import { Separator as RadixSeparator } from "radix-ui"
import s from "@plexui/styles/components/Separator/Separator.module.css"

export type SeparatorProps = Omit<
  ComponentProps<typeof RadixSeparator.Root>,
  "children"
> & {
  /**
   * Direction of the separator.
   * @default horizontal
   */
  orientation?: "horizontal" | "vertical"
  /**
   * When `true`, the separator is ignored by assistive technologies.
   * Leave `true` for purely visual dividers; set `false` when the separator
   * conveys meaningful grouping (it will render with `role="separator"`).
   * @default true
   */
  decorative?: boolean
  className?: string
}

export const Separator = ({
  orientation = "horizontal",
  decorative = true,
  className,
  ...restProps
}: SeparatorProps) => {
  return (
    <RadixSeparator.Root
      orientation={orientation}
      decorative={decorative}
      className={clsx(s.Separator, className)}
      {...restProps}
    />
  )
}
