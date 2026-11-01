"use client"

import clsx from "clsx"
import { useId } from "react"

import s from "@plexui/styles/components/FieldGroup/FieldGroup.module.css"

export type FieldGroupProps = {
  /**
   * Heading over the block. It names the group.
   */
  title?: React.ReactNode
  /**
   * Line under the title.
   */
  description?: React.ReactNode
  /**
   * Content at the end of the header, such as a button.
   */
  action?: React.ReactNode
  /**
   * Content under the block, such as a note.
   */
  footer?: React.ReactNode
  /**
   * CSS class for the block that holds the rows.
   */
  bodyClassName?: string
  /**
   * The rows: `Field row`, or rows of your own.
   */
  children?: React.ReactNode
} & Omit<React.ComponentProps<"section">, "title" | "children">

/** A titled block of rows: `Field row` lines with hairlines between them. */
export function FieldGroup({
  title,
  description,
  action,
  footer,
  bodyClassName,
  className,
  children,
  ...rest
}: FieldGroupProps) {
  const titleId = `field-group-${useId()}`

  return (
    <section role="group" aria-labelledby={title ? titleId : undefined} {...rest} className={clsx(s.FieldGroup, className)}>
      {(title || description || action) && (
        <div className={s.Header}>
          <div className={s.HeaderText}>
            {title && (
              <h2 className={s.Title} id={titleId}>
                {title}
              </h2>
            )}
            {description && <p className={s.Description}>{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={clsx(s.Body, bodyClassName)}>{children}</div>
      {footer}
    </section>
  )
}
