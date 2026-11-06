import clsx from "clsx"
import type { ComponentProps } from "react"
import { toCssVariables } from "../../lib/helpers"
import s from "@plexui/styles/components/Indicator/LoadingIndicator.module.css"

export type LoadingIndicatorProps = {
  /** Classname applied to the indicator */
  className?: string
  /** Size of the indicator, in pixels. The optional touch stylesheet defaults to 30px.
   * @default 1em
   */
  size?: number | string
  /** Stroke width of the indicator, in pixels
   * @default 2
   */
  strokeWidth?: number
} & Omit<ComponentProps<"span">, "children">

export const LoadingIndicator = ({
  className,
  size,
  strokeWidth,
  style,
  ...restProps
}: LoadingIndicatorProps) => {
  return (
    <span
      {...restProps}
      className={clsx(s.LoadingIndicator, className)}
      style={
        style ||
        toCssVariables({
          "indicator-size": size,
          "indicator-stroke": strokeWidth,
        })
      }
    >
      {Array.from({ length: 8 }, (_, index) => <span key={index} className={s.Spoke} aria-hidden="true" />)}
    </span>
  )
}
