"use client"

import clsx from "clsx"
import {
  type AnchorHTMLAttributes,
  type ComponentProps,
  type ComponentType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react"
import { useLinkComponent } from "../PlexUIProvider/internal"
import s from "@plexui/styles/components/Card/Card.module.css"

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type CardVariant = "outline" | "solid" | "ghost"
export type CardSize = "sm" | "md" | "lg"

type CardCommonProps = {
  /**
   * Visual variant of the card.
   * - `"outline"` — 1px border, transparent background (default)
   * - `"solid"` — muted background, no border
   * - `"ghost"` — no border, no background (hover-only surface)
   * @default "outline"
   */
  variant?: CardVariant
  /**
   * Padding scale.
   * @default "md"
   */
  size?: CardSize
  /**
   * When true, adds hover/focus affordances. Automatic when `href` is provided.
   * @default false
   */
  interactive?: boolean
  /** Class applied to the card container */
  className?: string
}

export type CardDivProps = CardCommonProps &
  Omit<HTMLAttributes<HTMLDivElement>, "className"> & {
    ref?: Ref<HTMLDivElement>
  }

export type CardLinkProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ComponentType<any> | "a" = "a",
> = CardCommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> & {
    /** When provided, the Card renders as a link. */
    href: string
    /** Explicitly flag as external — otherwise detected from `href`. */
    external?: boolean
    /** Override the rendered link component (e.g. next/link). */
    as?: T
    ref?: Ref<HTMLAnchorElement>
  } & ComponentProps<T>

export type CardProps = CardDivProps | CardLinkProps

const hasHref = (props: CardProps): props is CardLinkProps =>
  typeof (props as CardLinkProps).href === "string"

const CardRoot = (props: CardProps): ReactNode => {
  const {
    variant = "outline",
    size = "md",
    interactive,
    className,
  } = props as CardCommonProps
  // Called unconditionally: hooks may not sit inside the href branch below
  const DefaultLink = useLinkComponent()

  const sharedProps = {
    "className": clsx(s.Card, className),
    "data-variant": variant,
    "data-size": size,
    "data-interactive":
      (interactive || hasHref(props)) ? "" : undefined,
  }

  if (hasHref(props)) {
    const {
      variant: _v,
      size: _s,
      interactive: _i,
      className: _c,
      href,
      external,
      as: OverrideComponent,
      ref,
      ...restProps
    } = props
    const isExternal = external ?? /^https?:\/\//.test(href)
    const LinkComponent = OverrideComponent || (isExternal ? "a" : DefaultLink)
    const linkAttrs = isExternal
      ? { target: "_blank", rel: "noopener noreferrer", href }
      : { href }

    return (
      <LinkComponent ref={ref} {...sharedProps} {...linkAttrs} {...restProps} />
    )
  }

  const {
    variant: _v,
    size: _s,
    interactive: _i,
    className: _c,
    ref,
    ...restProps
  } = props as CardDivProps

  return <div ref={ref} {...sharedProps} {...restProps} />
}

/* ------------------------------------------------------------------ */
/*  Compound parts                                                     */
/* ------------------------------------------------------------------ */

export type CardSlotProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }

const CardHeader = ({ className, ref, ...restProps }: CardSlotProps) => (
  <div ref={ref} className={clsx(s.Header, className)} {...restProps} />
)

const CardTitle = ({
  className,
  ref,
  ...restProps
}: HTMLAttributes<HTMLHeadingElement> & { ref?: Ref<HTMLHeadingElement> }) => (
  <h3 ref={ref} className={clsx(s.Title, className)} {...restProps} />
)

const CardDescription = ({
  className,
  ref,
  ...restProps
}: HTMLAttributes<HTMLParagraphElement> & { ref?: Ref<HTMLParagraphElement> }) => (
  <p ref={ref} className={clsx(s.Description, className)} {...restProps} />
)

const CardContent = ({ className, ref, ...restProps }: CardSlotProps) => (
  <div ref={ref} className={clsx(s.Content, className)} {...restProps} />
)

const CardFooter = ({ className, ref, ...restProps }: CardSlotProps) => (
  <div ref={ref} className={clsx(s.Footer, className)} {...restProps} />
)

const CardAction = ({ className, ref, ...restProps }: CardSlotProps) => (
  <div ref={ref} className={clsx(s.Action, className)} {...restProps} />
)

/* ------------------------------------------------------------------ */
/*  Export — compound API                                              */
/* ------------------------------------------------------------------ */

type CardComponent = typeof CardRoot & {
  Header: typeof CardHeader
  Title: typeof CardTitle
  Description: typeof CardDescription
  Content: typeof CardContent
  Footer: typeof CardFooter
  Action: typeof CardAction
}

export const Card = CardRoot as CardComponent
Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter
Card.Action = CardAction
