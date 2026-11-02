import clsx from "clsx"
import { type MouseEventHandler, type ReactNode } from "react"
import { wrapTextNodeSiblings } from "../../lib/renderHelpers"
import { type SemanticColors, type Sizes, type Variants } from "../../types"
import { X } from "../Icon"
import s from "@plexui/styles/components/Badge/Badge.module.css"

export type BadgeProps = {
  /** Content rendered inside the badge */
  children: ReactNode
  /** Class applied to the badge */
  className?: string
  /**
   * Visual style of the badge
   * @default soft
   */
  variant?: Variants<"solid" | "soft" | "outline">
  /**
   * Size scale of the badge
   *
   * | sm      | md      | lg      | xl      |
   * | ------- | ------- | ------- | ------- |
   * | `20px`  | `22px`  | `24px`  | `32px`  |
   * @default sm
   */
  size?: Sizes<"sm" | "md" | "lg" | "xl">
  /**
   * Determines if the badge should be a fully rounded pill shape
   * @default false
   */
  pill?: boolean
  /**
   * Color of the badge, related to its meaning or intent
   * @default secondary
   */
  color?: SemanticColors<
    "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
  >
  /** Adds a cross at the end of the badge that calls this when pressed */
  onRemove?: MouseEventHandler<HTMLButtonElement>
  /**
   * Accessible name of the cross
   * @default Remove
   */
  removeLabel?: string
  /**
   * Shows the cross as a mark, for a badge inside a control that takes the press
   * @default false
   */
  removable?: boolean
}

export const Badge = ({
  children,
  className,
  variant = "soft",
  color = "secondary",
  size = "sm",
  pill,
  onRemove,
  removeLabel = "Remove",
  removable = false,
  ...restMaybeAsChildProps
}: BadgeProps) => {
  let remove: ReactNode = null

  if (onRemove) {
    remove = (
      <button type="button" className={s.Remove} aria-label={removeLabel} onClick={onRemove}>
        <X />
      </button>
    )
  } else if (removable) {
    remove = (
      <span className={s.Remove} aria-hidden="true">
        <X />
      </span>
    )
  }

  return (
    <div
      className={clsx(s.Badge, className)}
      data-color={color}
      data-size={size}
      data-pill={pill ? "" : undefined}
      data-variant={variant}
      {...restMaybeAsChildProps}
    >
      {wrapTextNodeSiblings(remove ? [children, remove] : children)}
    </div>
  )
}
