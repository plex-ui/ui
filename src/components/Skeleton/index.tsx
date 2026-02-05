import clsx from "clsx"
import { type ComponentProps } from "react"
import s from "./Skeleton.module.css"

export type SkeletonProps = ComponentProps<"div"> & {
  /**
   * Makes the skeleton circular (border-radius: 50%)
   * @default false
   */
  circle?: boolean
}

/**
 * Skeleton component for displaying loading placeholders.
 * Use to show a placeholder while content is loading.
 */
export const Skeleton = ({ className, circle, style, ...props }: SkeletonProps) => (
  <div
    className={clsx(s.Skeleton, className)}
    data-circle={circle ? "" : undefined}
    style={style}
    {...props}
  />
)
