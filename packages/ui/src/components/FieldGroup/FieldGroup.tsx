"use client"

import clsx from "clsx"
import { useId } from "react"

import s from "@plexui/styles/components/FieldGroup/FieldGroup.module.css"

import { FieldColumnsContext } from "../../lib/fieldRow"

export type FieldGroupProps = {
  /**
   * Heading over the block. It names the group.
   */
  title?: React.ReactNode
  /**
   * How much the title stands out. "standard" is a quiet heading over the rows (on a
   * phone the kit's Nested list header: 17 Semibold, secondary). "increased" leads its
   * content, as a section of a page does (the kit's Prominent header: 20 Semibold,
   * primary).
   * @default "standard"
   */
  headerProminence?: "standard" | "increased"
  /**
   * Line under the title.
   */
  description?: React.ReactNode
  /**
   * Content at the end of the header, such as a button. On a phone a ghost text button
   * reads as the list header's action: tinted text on the title's last line.
   */
  action?: React.ReactNode
  /**
   * Content under the block, such as a note.
   */
  footer?: React.ReactNode
  /**
   * Every value starts at one column, `--field-row-column-width` into the row, on the
   * web and on a phone. Off, values end at the row's edge.
   * @default false
   */
  columns?: boolean
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
  headerProminence = "standard",
  description,
  action,
  footer,
  columns = false,
  bodyClassName,
  className,
  children,
  ...rest
}: FieldGroupProps) {
  const titleId = `field-group-${useId()}`
  const descriptionId = `${titleId}-description`

  return (
    <section
      role="group"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      data-field-columns={columns ? "" : undefined}
      data-header-prominence={headerProminence === "increased" ? "increased" : undefined}
      {...rest}
      className={clsx(s.FieldGroup, className)}
    >
      {(title || description || action) && (
        <div className={s.Header}>
          <div className={s.HeaderText}>
            {title && (
              <h2 className={s.Title} id={titleId}>
                {title}
              </h2>
            )}
            {description && <p className={s.Description} id={descriptionId}>{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={clsx(s.Body, bodyClassName)}>
        <FieldColumnsContext.Provider value={columns}>{children}</FieldColumnsContext.Provider>
      </div>
      {footer != null && typeof footer !== "boolean" && footer !== "" && (
        <div className={s.Footer}>{footer}</div>
      )}
    </section>
  )
}
