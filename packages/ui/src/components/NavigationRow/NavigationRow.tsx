"use client"

import clsx from "clsx"
import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ComponentType, type ReactNode, type Ref, useLayoutEffect, useRef, useState } from "react"
import s from "@plexui/styles/components/NavigationRow/NavigationRow.module.css"
import { Button, ButtonLink } from "../Button"
import { Disclosure } from "../Icon"
import { useFieldColumns } from "../../lib/fieldRow"

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
  /** A line under the label; the row grows from 52 to hold it. A `<br />` starts a second line. */
  description?: ReactNode
  /**
   * What leads the row, such as an `Avatar` or a symbol, in a column before the label (`--navigation-row-leading-size`,
   * its own size), on the label's first line: a shorter text is centred beside it, a longer one starts level with it.
   * The line above the row starts after it, where the text starts (iOS Find My's People list).
   */
  leading?: ReactNode
  /**
   * The chevron at the end. `false` drops it, for a row that opens a record rather than a page of choices (as the
   * Contacts list of iOS); the row is still one press. @default true
   */
  disclosure?: boolean
  /** Where the row goes. With it the row is a link (through `PlexUIProvider`'s `linkComponent`, or `as`). */
  href?: string
  /** Force external-link behavior for `href` */
  external?: boolean
  /** Link component for `href`, e.g. a router's link. @default PlexUIProvider linkComponent */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  as?: ComponentType<any> | "a"
  /** The row can't be pressed. A disabled link renders as a disabled button, so it never navigates. */
  disabled?: boolean
  /**
   * Where the value stands: at the `end` of the row, `below` the label at the full width, or `auto`: at the end while
   * it fits beside the label on one line, otherwise below (as Calendar sets a long value). @default "end"
   */
  valuePlacement?: "end" | "below" | "auto"
  /** Ref for the row's pressable (a `button`, or the link's element) */
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement | null>
}

const shown = (value: ReactNode) => value !== null && value !== undefined && value !== false && value !== ""

/** Whether the label and the value of a row fit beside each other on one line: measured in the end layout, unwrapped */
const valueFitsBeside = (row: HTMLElement) => {
  const content = row.querySelector<HTMLElement>("[data-navigation-row-content]")
  if (!content) return true
  const below = row.hasAttribute("data-value-below")
  row.removeAttribute("data-value-below")
  row.setAttribute("data-measuring", "")
  const fits = [content, ...content.querySelectorAll<HTMLElement>("[data-navigation-row-part]")].every(
    (element) => element.scrollWidth <= element.clientWidth + 0.5,
  )
  row.removeAttribute("data-measuring")
  if (below) row.setAttribute("data-value-below", "")
  return fits
}

/**
 * A FieldGroup row that opens what it holds, as an iOS Settings drill-in: label, current value, chevron, one press.
 * Every other prop (id, events, ARIA, data attributes, className) goes to the pressable, so a caller states what
 * the row opens (`aria-haspopup`, `aria-expanded`) itself.
 */
export function NavigationRow(props: NavigationRowProps) {
  const { label, value, description, leading, disclosure = true, href, external, as, disabled, valuePlacement = "end", className, ref, target, rel, download, hrefLang, ping, referrerPolicy, ...rest } = props
  // Only the link attributes given: an undefined `target` would override the new tab of an external link
  const linkAttributes = Object.fromEntries(
    Object.entries({ target, rel, download, hrefLang, ping, referrerPolicy }).filter(([, attribute]) => attribute !== undefined),
  )
  const hasValue = shown(value)
  const hasDescription = shown(description)
  const hasLeading = shown(leading)
  const rowRef = useRef<HTMLDivElement>(null)
  // FieldGroup columns give the label a column of its own: a change of them measures again
  const columns = useFieldColumns()
  const [fits, setFits] = useState(true)
  const auto = valuePlacement === "auto" && hasValue

  // "auto": measure on mount, when the label or value changes, and when the row's width changes
  useLayoutEffect(() => {
    const row = rowRef.current
    if (!auto || !row) return
    let live = true
    const check = () => {
      if (live) setFits(valueFitsBeside(row))
    }
    check()
    // A web font that arrives late (font-display: swap) changes the words' widths, not the row's
    const fonts = typeof document !== "undefined" ? document.fonts : undefined
    fonts?.ready.then(check)
    fonts?.addEventListener?.("loadingdone", check)
    const stop = () => {
      live = false
      fonts?.removeEventListener?.("loadingdone", check)
    }
    if (typeof ResizeObserver === "undefined") return stop
    let width = row.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const next = row.getBoundingClientRect().width
      if (next === width) return
      width = next
      check()
    })
    observer.observe(row)
    return () => {
      stop()
      observer.disconnect()
    }
  }, [auto, label, value, description, leading, disclosure, columns])

  const below = hasValue && (valuePlacement === "below" || (auto && !fits))

  const content = (
    <span className={s.Content} data-navigation-row-content="">
      {hasLeading && <span className={s.Leading}>{leading}</span>}
      <span className={s.Text}>
        <span className={s.Label} data-navigation-row-part="">{label}</span>
        {hasDescription && <span className={s.Description}>{description}</span>}
      </span>
      {hasValue && <span className={s.Value} data-navigation-row-part="">{value}</span>}
      {disclosure && <Disclosure className={s.Disclosure} aria-hidden="true" data-no-autosize="" />}
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
      ref={rowRef}
      className={s.NavigationRow}
      data-row=""
      data-value-below={below ? "" : undefined}
      data-value={hasValue ? "" : undefined}
      data-description={hasDescription ? "" : undefined}
      data-leading={hasLeading ? "" : undefined}
      data-disclosure={disclosure ? undefined : "none"}
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
