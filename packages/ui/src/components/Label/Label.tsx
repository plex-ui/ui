"use client"

import clsx from "clsx"
import { type ComponentProps } from "react"
import { Label as RadixLabel } from "radix-ui"
import s from "@plexui/styles/components/Label/Label.module.css"

export type LabelProps = ComponentProps<typeof RadixLabel.Root> & {
  className?: string
}

export const Label = ({ className, children, ...restProps }: LabelProps) => {
  return (
    <RadixLabel.Root className={clsx(s.Label, className)} {...restProps}>
      {children}
    </RadixLabel.Root>
  )
}
