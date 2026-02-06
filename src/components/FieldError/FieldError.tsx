import clsx from "clsx"

import { ExclamationMarkCircle } from "../Icon"

import s from "./FieldError.module.css"

export type FieldErrorProps = {
  children: React.ReactNode
  className?: string
  id?: string
}

export function FieldError({ children, className, id }: FieldErrorProps) {
  return (
    <div className={clsx(s.FieldError, className)} id={id} role="alert">
      <ExclamationMarkCircle className={s.Icon} />
      <span>{children}</span>
    </div>
  )
}
