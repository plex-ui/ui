"use client"

import clsx from "clsx"
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentType, ReactNode, Ref } from "react"
import s from "@plexui/styles/components/NavigationRow/NavigationRow.module.css"
import { Button, ButtonLink } from "../Button"
import { Disclosure } from "../Icon"

type LinkAttributes = Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "target" | "rel" | "download" | "hrefLang" | "ping" | "referrerPolicy"
>

// Events come from a button or, with `href`, a link (a disabled link is a button again), so handlers see either
export type NavigationRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement>, "children" | "value" | "type"> &
  LinkAttributes & {
  /** The row's name, where a row's label starts */
  label: ReactNode
  /** The current value, at the end of the row in the secondary label. `0` shows; `null`, `undefined` and `""` do not. */
  value?: ReactNode
  /** A line under the label; the row grows from 52 to hold it */
  description?: ReactNode
  /** Where the row goes. With it the row is a link (through `PlexUIProvider`'s `linkComponent`, or `as`). */
  href?: string
  /** Force external-link behavior for `href` */
  external?: boolean
  /** Link component for `href`, e.g. a router's link. @default PlexUIProvider linkComponent */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  as?: ComponentType<any> | "a"
  /** The row can't be pressed. A disabled link renders as a disabled button, so it never navigates. */
  disabled?: boolean
  /** Ref for the row's pressable (a `button`, or the link's element) */
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement | null>
}

const shown = (value: ReactNode) => value !== null && value !== undefined && value !== false && value !== ""

/**
 * A FieldGroup row that opens what it holds, as an iOS Settings drill-in: label, current value, chevron, one press.
 * Every other prop (id, events, ARIA, data attributes, className) goes to the pressable, so a caller states what
 * the row opens (`aria-haspopup`, `aria-expanded`) itself.
 */
export function NavigationRow(props: NavigationRowProps) {
  const { label, value, description, href, external, as, disabled, className, ref, target, rel, download, hrefLang, ping, referrerPolicy, ...rest } = props
  // Only the link attributes given: an undefined `target` would override the new tab of an external link
  const linkAttributes = Object.fromEntries(
    Object.entries({ target, rel, download, hrefLang, ping, referrerPolicy }).filter(([, attribute]) => attribute !== undefined),
  )
  const hasValue = shown(value)
  const hasDescription = shown(description)

  const content = (
    <span className={s.Content}>
      <span className={s.Text}>
        <span className={s.Label}>{label}</span>
        {hasDescription && <span className={s.Description}>{description}</span>}
      </span>
      {hasValue && <span className={s.Value}>{value}</span>}
      <Disclosure className={s.Disclosure} aria-hidden="true" data-no-autosize="" />
    </span>
  )

  const shared = {
    className: clsx(s.Pressable, className),
    block: true,
    color: "secondary",
    variant: "ghost",
    "data-navigation-row": "",
  } as const

  return (
    <div
      className={s.NavigationRow}
      data-row=""
      data-value={hasValue ? "" : undefined}
      data-description={hasDescription ? "" : undefined}
    >
      {href !== undefined && !disabled ? (
        <ButtonLink
          {...(rest as Record<string, unknown>)}
          {...shared}
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          external={external}
          as={as as PlexUI.LinkComponent}
          {...linkAttributes}
        >
          {content}
        </ButtonLink>
      ) : (
        <Button {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} {...shared} ref={ref as Ref<HTMLButtonElement>} disabled={disabled}>
          {content}
        </Button>
      )}
    </div>
  )
}
