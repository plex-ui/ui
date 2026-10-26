"use client"

import clsx from "clsx"
import { type ComponentProps } from "react"
import { Progress as RadixProgress } from "radix-ui"
import s from "@plexui/styles/components/Progress/Progress.module.css"

export type ProgressProps = Omit<
  ComponentProps<typeof RadixProgress.Root>,
  "children"
> & {
  /**
   * Current progress value, between `0` and `max`.
   * Omit (or pass `null`) for an indeterminate state.
   */
  value?: number | null
  /**
   * Maximum value.
   * @default 100
   */
  max?: number
  className?: string
}

export const Progress = ({
  value = null,
  max = 100,
  className,
  ...restProps
}: ProgressProps) => {
  const resolved = value == null ? null : Math.max(0, Math.min(max, value))
  const percentage = resolved == null ? null : (resolved / max) * 100

  return (
    <RadixProgress.Root
      value={resolved}
      max={max}
      className={clsx(s.Root, className)}
      {...restProps}
    >
      <RadixProgress.Indicator
        className={s.Indicator}
        style={{
          transform:
            percentage == null ? undefined : `translateX(-${100 - percentage}%)`,
        }}
        data-indeterminate={percentage == null ? "" : undefined}
      />
    </RadixProgress.Root>
  )
}
