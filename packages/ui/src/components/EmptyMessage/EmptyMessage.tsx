import clsx from "clsx"
import { type ReactNode } from "react"
import { type SemanticColors, type Sizes } from "../../types"
import s from "@plexui/styles/components/EmptyMessage/EmptyMessage.module.css"

export type EmptyMessageProps = {
  children: ReactNode
  className?: string
  /**
   * Determines how the container fills available space
   * @default static
   */
  fill?: "static" | "absolute" | "none"
  /**
   * `sm` is the compact message for a panel, a card section or a list with
   * nothing in it: smaller title, tighter spacing, no minimum width.
   * @default md
   */
  size?: Sizes<"sm" | "md">
  /**
   * `start` left-aligns the message, for an empty state that sits under a
   * section heading instead of filling a surface.
   * @default center
   */
  align?: "center" | "start"
}

export const EmptyMessage = ({ children, className, fill = "static", size = "md", align = "center" }: EmptyMessageProps) => {
  return (
    <div
      className={clsx(s.EmptyMessage, className)}
      data-fill={fill}
      data-size={size === "sm" ? size : undefined}
      data-align={align === "start" ? align : undefined}
    >
      {children}
    </div>
  )
}

export type EmptyMessageIconProps = {
  /**
   * @default md
   */
  size?: Sizes<"sm" | "md">
  /**
   * @default secondary
   */
  color?: SemanticColors<"secondary" | "danger" | "warning">
  children: ReactNode
  className?: string
}

const Icon = ({ size = "md", color = "secondary", children, className }: EmptyMessageIconProps) => {
  return (
    <div className={clsx(s.IconBadge, className)} data-size={size} data-color={color}>
      {children}
    </div>
  )
}

export type EmptyMessageTitleProps = {
  children: ReactNode
  className?: string
  /**
   * @default secondary
   */
  color?: SemanticColors<"secondary" | "danger" | "warning">
}

const Title = ({ children, className, color = "secondary" }: EmptyMessageTitleProps) => {
  return (
    <div className={clsx(s.Title, className)} data-color={color}>
      {children}
    </div>
  )
}

const Description = ({ children, className }: { children: ReactNode; className?: string }) => {
  return <div className={clsx(s.Description, className)}>{children}</div>
}

const ActionRow = ({ children, className }: { children: ReactNode; className?: string }) => {
  return <div className={clsx(s.ActionRow, className)}>{children}</div>
}

EmptyMessage.Icon = Icon
EmptyMessage.Title = Title
EmptyMessage.Description = Description
EmptyMessage.ActionRow = ActionRow
