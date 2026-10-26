import clsx from "clsx"

import { ExclamationMarkCircle } from "../Icon"

import s from "@plexui/styles/components/FieldError/FieldError.module.css"

export type FieldErrorProps = {
  children: React.ReactNode
  className?: string
  id?: string
  /**
   * Shows the error icon before the message. Turn it off where the message
   * stands alone, such as under a centered code input.
   * @default true
   */
  icon?: boolean
}

export function FieldError({ children, className, id, icon = true }: FieldErrorProps) {
  return (
    <div className={clsx(s.FieldError, className)} id={id} role="alert">
      {icon && <ExclamationMarkCircle className={s.Icon} />}
      <span>{children}</span>
    </div>
  )
}
