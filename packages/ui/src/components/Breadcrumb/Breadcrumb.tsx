"use client"

import clsx from "clsx"
import { createContext, useContext, type ComponentProps, type ComponentType, type ReactNode } from "react"
import { ChevronRightSm } from "../Icon"
import { TextLink } from "../TextLink"
import s from "@plexui/styles/components/Breadcrumb/Breadcrumb.module.css"

const SeparatorContext = createContext<ReactNode>(null)

// TextLink types `to` only for link components that take it; an item passes
// whichever destination it got through to it
const ItemLink = TextLink as unknown as ComponentType<Record<string, unknown>>

export type BreadcrumbProps = Omit<ComponentProps<"nav">, "children"> & {
  children: ReactNode
  /**
   * Text size: `sm` for a trail above a compact header, `md` above a page title
   * @default md
   */
  size?: "sm" | "md"
  /**
   * What stands between two items
   * @default a small chevron
   */
  separator?: ReactNode
}

/**
 * The trail of pages that leads to the current one. Each `Breadcrumb.Item`
 * is a link, a button (`onClick`) or the current page (`current`).
 */
export const Breadcrumb = ({
  children,
  size = "md",
  separator,
  className,
  "aria-label": ariaLabel = "Breadcrumb",
  ...restProps
}: BreadcrumbProps) => {
  return (
    <nav aria-label={ariaLabel} className={clsx(s.Breadcrumb, className)} data-size={size} {...restProps}>
      <SeparatorContext.Provider value={separator ?? <ChevronRightSm />}>
        <ol className={s.List}>{children}</ol>
      </SeparatorContext.Provider>
    </nav>
  )
}

export type BreadcrumbItemProps = {
  children: ReactNode
  /** Link destination. Internal paths use the `linkComponent` of `PlexUIProvider` */
  href?: string
  /** Router link destination, for link components that take `to` */
  to?: string
  /** The current page: not a link, marked `aria-current="page"` */
  current?: boolean
  /** Makes an item without a destination act as a button */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
  className?: string
}

const Item = ({ children, href, to, current = false, onClick, className }: BreadcrumbItemProps) => {
  const separator = useContext(SeparatorContext)

  let content: ReactNode
  if (current) {
    content = (
      <span className={s.Current} aria-current="page">
        {children}
      </span>
    )
  } else if (href || to || onClick) {
    content = (
      <ItemLink className={s.Link} href={href} to={to} onClick={onClick} underline={false}>
        {children}
      </ItemLink>
    )
  } else {
    content = <span>{children}</span>
  }

  return (
    <li className={clsx(s.Item, className)}>
      <span className={s.Separator} aria-hidden="true">
        {separator}
      </span>
      {content}
    </li>
  )
}

Breadcrumb.Item = Item
