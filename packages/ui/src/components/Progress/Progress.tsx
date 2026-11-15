"use client"

import clsx from "clsx"
import { type ComponentProps } from "react"
import { Progress as RadixProgress } from "radix-ui"
import s from "@plexui/styles/components/Progress/Progress.module.css"

export type ProgressColor = "primary" | "secondary" | "success" | "warning" | "caution" | "danger" | "info" | "discovery"

/** A part of a segmented bar: its share of `max`, its color, and the name it is read with. */
export type ProgressSegment = {
  value: number
  /** @default "primary" */
  color?: ProgressColor
  /** Read out with its share, such as "Paid 60%" */
  label?: string
}

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
  /**
   * Parts of one bar, side by side in their colors, such as paid, pending and due. The value is their sum; they
   * take `value`'s place. A part's share is clamped so the bar never passes `max`.
   */
  segments?: ProgressSegment[]
  className?: string
}

/** The parts of a segmented bar, each clamped so their sum stays within `max`, and their sum. */
export const progressSegments = (segments: ProgressSegment[], max: number) => {
  let total = 0
  const parts = segments.map((segment) => {
    const value = Math.max(0, Math.min(max - total, segment.value || 0))
    total += value
    return { ...segment, value }
  })
  return { parts, total }
}

const segmentsLabel = (parts: ProgressSegment[], max: number) =>
  parts.map((part) => `${part.label ? `${part.label} ` : ""}${Math.round((part.value / max) * 100)}%`).join(", ")

export const Progress = ({
  value = null,
  max = 100,
  segments,
  className,
  ...restProps
}: ProgressProps) => {
  if (segments) {
    // Radix falls back to 100 for a max that is not a positive number; the parts are measured against the same
    const rootMax = typeof max === "number" && max > 0 && !Number.isNaN(max) ? max : 100
    const { parts, total } = progressSegments(segments, rootMax)
    return (
      <RadixProgress.Root
        value={total}
        max={rootMax}
        getValueLabel={() => segmentsLabel(parts, rootMax)}
        className={clsx(s.Root, className)}
        data-segmented=""
        {...restProps}
      >
        {parts.map((part, index) =>
          part.value > 0 ? (
            <div key={index} className={s.Segment} data-color={part.color ?? "primary"} style={{ width: `${(part.value / rootMax) * 100}%` }} />
          ) : null,
        )}
      </RadixProgress.Root>
    )
  }

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
