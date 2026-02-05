"use client"

/**
 * Sidebar Component - Composable navigation sidebar
 *
 * API SPECIFICATION:
 *
 * SidebarProvider
 *   - defaultOpen?: boolean (default: true)
 *   - open?: boolean (controlled)
 *   - onOpenChange?: (open: boolean) => void
 *   - collapsible?: "offcanvas" | "icon" | "none" (default: "offcanvas")
 *
 * Sidebar
 *   - side?: "left" | "right" (default: "left")
 *   - variant?: "sidebar" | "docs" (default: "sidebar")
 *
 * SidebarHeader / SidebarContent / SidebarFooter
 *   - Standard container props
 *
 * SidebarGroup
 *   - defaultOpen?: boolean (default: true)
 *   - open?: boolean (controlled)
 *
 * SidebarGroupLabel / SidebarGroupAction / SidebarGroupContent
 *   - Standard container props
 *
 * SidebarMenu / SidebarMenuItem
 *   - Standard container props
 *
 * SidebarMenuButton
 *   - isActive?: boolean (default: false)
 *   - size?: "sm" | "md" | "lg" (default: "md")
 *   - tooltip?: string | ReactNode
 *   - asChild?: boolean
 *
 * SidebarMenuAction / SidebarMenuBadge
 *   - Standard container props
 *
 * SidebarMenuSkeleton
 *   - showIcon?: boolean (default: true)
 *
 * SidebarMenuSub / SidebarMenuSubItem / SidebarMenuSubButton
 *   - Same as parent menu components
 *
 * SidebarSeparator
 *   - Standard separator props
 *
 * SidebarCard / SidebarCardHeader / SidebarCardContent / SidebarCardFooter
 *   - variant?: "default" | "elevated"
 *   - dismissible?: boolean
 *   - onDismiss?: () => void
 *
 * SidebarInset
 *   - Standard container for main content area
 *
 * SidebarTrigger
 *   - Uses Button component internally
 *   - Returns null when collapsible="none"
 *
 * SidebarMobileMenuButton
 *   - Hamburger → X animated icon button for mobile
 *
 * SidebarInput
 *   - shortcut?: string (keyboard shortcut display)
 */

import { Slot } from "@radix-ui/react-slot"
import clsx from "clsx"
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react"

import { Button } from "../Button"
import { ChevronRightMd, Search as SearchIcon, SidebarLeft, X } from "../Icon"
import { Input, type InputProps } from "../Input"
import { Tooltip } from "../Tooltip"
import s from "./Sidebar.module.css"
import {
  SidebarProvider,
  useSidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
} from "./useSidebarContext"

// Re-export provider and hook
export { SidebarProvider, useSidebar }
export type { SidebarCollapsible, SidebarSide, SidebarVariant }

// =============================================
// Sidebar Root
// =============================================

export type SidebarProps = ComponentProps<"aside"> & {
  /**
   * The side the sidebar is on.
   * @default "left"
   */
  side?: SidebarSide
  /**
   * The visual variant of the sidebar.
   * @default "sidebar"
   */
  variant?: SidebarVariant
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ side = "left", variant = "sidebar", className, children, ...props }, ref) => {
    const { collapsible, isMobile } = useSidebar()

    // Skip rendering sidebar on mobile for offcanvas mode
    if (isMobile && collapsible === "offcanvas") {
      return null
    }

    return (
      <aside
        ref={ref}
        data-side={side}
        data-variant={variant}
        className={clsx(s.Sidebar, className)}
        {...props}
      >
        {children}
      </aside>
    )
  },
)
Sidebar.displayName = "Sidebar"

// =============================================
// Sidebar Sections
// =============================================

export type SidebarHeaderProps = ComponentProps<"div">

export const SidebarHeader = forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.Header, className)} {...props} />
  ),
)
SidebarHeader.displayName = "SidebarHeader"

export type SidebarContentProps = ComponentProps<"div">

export const SidebarContent = forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.Content, className)} {...props} />
  ),
)
SidebarContent.displayName = "SidebarContent"

export type SidebarFooterProps = ComponentProps<"div">

export const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={clsx(s.Footer, className)} {...props}>
      <div className={s.FooterSeparator} />
      {children}
    </div>
  ),
)
SidebarFooter.displayName = "SidebarFooter"

export type SidebarRailProps = ComponentProps<"div">

export const SidebarRail = forwardRef<HTMLDivElement, SidebarRailProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.Rail, className)} {...props} />
  ),
)
SidebarRail.displayName = "SidebarRail"

// =============================================
// Groups
// =============================================

export type SidebarGroupProps = ComponentProps<"div"> & {
  /**
   * Whether the group is open by default.
   * @default true
   */
  defaultOpen?: boolean
  /**
   * Controlled open state.
   */
  open?: boolean
  /**
   * Callback called when the group open state changes.
   */
  onOpenChange?: (open: boolean) => void
}

export const SidebarGroup = forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ defaultOpen = true, open: openProp, onOpenChange, className, ...props }, ref) => {
    const [_open, _setOpen] = useState(defaultOpen)
    const open = openProp ?? _open

    const handleToggle = () => {
      const newState = !open
      if (onOpenChange) {
        onOpenChange(newState)
      } else {
        _setOpen(newState)
      }
    }

    return (
      <div
        ref={ref}
        data-state={open ? "open" : "closed"}
        data-toggle={handleToggle}
        className={clsx(s.Group, className)}
        {...props}
      />
    )
  },
)
SidebarGroup.displayName = "SidebarGroup"

export type SidebarGroupLabelProps = ComponentProps<"span"> & {
  asChild?: boolean
  /**
   * Size variant for the label.
   * - "sm": Compact style for dashboard/settings sidebars
   * - "lg": Documentation style with larger text and more spacing
   * @default "lg"
   */
  size?: "sm" | "lg"
}

export const SidebarGroupLabel = forwardRef<HTMLSpanElement, SidebarGroupLabelProps>(
  ({ asChild = false, size = "lg", className, ...props }, ref) => {
    const Comp = asChild ? Slot : "span"
    return <Comp ref={ref} data-size={size} className={clsx(s.GroupLabel, className)} {...props} />
  },
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

export type SidebarGroupActionProps = ComponentProps<"div">

export const SidebarGroupAction = forwardRef<HTMLDivElement, SidebarGroupActionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.GroupAction, className)} {...props} />
  ),
)
SidebarGroupAction.displayName = "SidebarGroupAction"

export type SidebarGroupContentProps = ComponentProps<"div">

export const SidebarGroupContent = forwardRef<HTMLDivElement, SidebarGroupContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.GroupContent, className)} {...props} />
  ),
)
SidebarGroupContent.displayName = "SidebarGroupContent"

// =============================================
// Menu
// =============================================

export type SidebarMenuProps = ComponentProps<"ul">

export const SidebarMenu = forwardRef<HTMLUListElement, SidebarMenuProps>(
  ({ className, ...props }, ref) => <ul ref={ref} className={clsx(s.Menu, className)} {...props} />,
)
SidebarMenu.displayName = "SidebarMenu"

export type SidebarMenuItemProps = ComponentProps<"li"> & {
  expanded?: boolean
}

export const SidebarMenuItem = forwardRef<HTMLLIElement, SidebarMenuItemProps>(
  ({ expanded, className, ...props }, ref) => (
    <li
      ref={ref}
      data-expanded={expanded ? "true" : undefined}
      className={clsx(s.MenuItem, className)}
      {...props}
    />
  ),
)
SidebarMenuItem.displayName = "SidebarMenuItem"

// =============================================
// Menu Button
// =============================================

export type SidebarMenuButtonProps = ComponentProps<"button"> & {
  /**
   * Whether the button is in an active/highlighted state.
   * @default false
   */
  isActive?: boolean
  /**
   * Optional tooltip to show when the sidebar is collapsed.
   */
  tooltip?: string | ReactNode
  /**
   * Whether to render the button as a custom element via Slot.
   * @default false
   */
  asChild?: boolean
}

export const SidebarMenuButton = forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ isActive = false, tooltip, asChild = false, className, children, ...props }, ref) => {
    const { state, isMobile } = useSidebar()
    const Comp = asChild ? Slot : "button"

    const button = (
      <Comp
        ref={ref}
        data-active={isActive ? "true" : "false"}
        className={clsx(s.MenuButton, className)}
        {...props}
      >
        <span className={s.MenuButtonInner}>{children}</span>
      </Comp>
    )

    // Show tooltip when collapsed (icon mode) and not mobile
    if (tooltip && state === "collapsed" && !isMobile) {
      return (
        <Tooltip content={tooltip} side="right">
          {button}
        </Tooltip>
      )
    }

    return button
  },
)
SidebarMenuButton.displayName = "SidebarMenuButton"

// =============================================
// Menu Button Parts
// =============================================

export type SidebarMenuButtonIconProps = ComponentProps<"span">

export const SidebarMenuButtonIcon = forwardRef<HTMLSpanElement, SidebarMenuButtonIconProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={clsx(s.MenuButtonIcon, className)} {...props} />
  ),
)
SidebarMenuButtonIcon.displayName = "SidebarMenuButtonIcon"

export type SidebarMenuButtonLabelProps = ComponentProps<"span"> & {
  shortLabel?: string
}

export const SidebarMenuButtonLabel = forwardRef<HTMLSpanElement, SidebarMenuButtonLabelProps>(
  ({ shortLabel, className, children, ...props }, ref) => (
    <>
      <span
        ref={ref}
        data-long-label="true"
        className={clsx(s.MenuButtonLabel, className)}
        {...props}
      >
        {children}
      </span>
      {shortLabel && (
        <span data-short-label="true" className={clsx(s.MenuButtonLabel, className)}>
          {shortLabel}
        </span>
      )}
    </>
  ),
)
SidebarMenuButtonLabel.displayName = "SidebarMenuButtonLabel"

// =============================================
// Menu Chevron (Expand/Collapse Toggle)
// =============================================

export type SidebarMenuChevronProps = ComponentProps<"span">

export const SidebarMenuChevron = forwardRef<HTMLSpanElement, SidebarMenuChevronProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={clsx(s.MenuChevron, className)} {...props}>
      <ChevronRightMd />
    </span>
  ),
)
SidebarMenuChevron.displayName = "SidebarMenuChevron"

// =============================================
// Menu Badge & Action
// =============================================

export type SidebarMenuBadgeProps = ComponentProps<"span">

export const SidebarMenuBadge = forwardRef<HTMLSpanElement, SidebarMenuBadgeProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={clsx(s.MenuBadge, className)} {...props} />
  ),
)
SidebarMenuBadge.displayName = "SidebarMenuBadge"

export type SidebarMenuActionProps = ComponentProps<"div">

export const SidebarMenuAction = forwardRef<HTMLDivElement, SidebarMenuActionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.MenuAction, className)} {...props} />
  ),
)
SidebarMenuAction.displayName = "SidebarMenuAction"

// =============================================
// Menu Skeleton
// =============================================

export type SidebarMenuSkeletonProps = ComponentProps<"div"> & {
  showIcon?: boolean
  /** Width of the label skeleton (e.g., "60%", "80%", "100px") */
  labelWidth?: string
}

export const SidebarMenuSkeleton = forwardRef<HTMLDivElement, SidebarMenuSkeletonProps>(
  ({ showIcon = true, labelWidth = "60%", className, ...props }, ref) => (
    <div ref={ref} data-skeleton className={clsx(s.MenuSkeleton, className)} {...props}>
      {showIcon && <div className={s.MenuSkeletonIcon} />}
      <div className={s.MenuSkeletonLabel} style={{ width: labelWidth }} />
    </div>
  ),
)
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

// =============================================
// Submenu
// =============================================

export type SidebarMenuSubProps = ComponentProps<"ul"> & {
  open?: boolean
  /**
   * When true, child items align with parent text that has icons.
   * This adjusts the padding so level 2 text aligns with level 1 text.
   */
  hasIcons?: boolean
}

export const SidebarMenuSub = forwardRef<HTMLUListElement, SidebarMenuSubProps>(
  ({ open = true, hasIcons = false, className, ...props }, ref) => (
    <ul
      ref={ref}
      data-state={open ? "open" : "closed"}
      data-has-icons={hasIcons ? "true" : undefined}
      className={clsx(s.MenuSub, className)}
      {...props}
    />
  ),
)
SidebarMenuSub.displayName = "SidebarMenuSub"

export type SidebarMenuSubItemProps = ComponentProps<"li">

export const SidebarMenuSubItem = forwardRef<HTMLLIElement, SidebarMenuSubItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={clsx(s.MenuSubItem, className)} {...props} />
  ),
)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

export type SidebarMenuSubButtonProps = ComponentProps<"button"> & {
  isActive?: boolean
  asChild?: boolean
  /**
   * Indent level for nested items (0-3).
   * Each level adds 12px of left margin.
   * @default 0
   */
  indent?: 0 | 1 | 2 | 3
}

export const SidebarMenuSubButton = forwardRef<HTMLButtonElement, SidebarMenuSubButtonProps>(
  ({ isActive = false, asChild = false, indent = 0, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        data-active={isActive ? "true" : "false"}
        className={clsx(s.MenuSubButton, s[`indent${indent}`], className)}
        {...props}
      />
    )
  },
)
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

// =============================================
// Separator
// =============================================

export type SidebarSeparatorProps = ComponentProps<"hr">

export const SidebarSeparator = forwardRef<HTMLHRElement, SidebarSeparatorProps>(
  ({ className, ...props }, ref) => (
    <hr ref={ref} className={clsx(s.Separator, className)} {...props} />
  ),
)
SidebarSeparator.displayName = "SidebarSeparator"

// =============================================
// Card
// =============================================

export type SidebarCardProps = ComponentProps<"div"> & {
  variant?: "default" | "elevated"
  dismissible?: boolean
  onDismiss?: () => void
}

export const SidebarCard = forwardRef<HTMLDivElement, SidebarCardProps>(
  ({ variant = "default", dismissible = false, onDismiss, className, children, ...props }, ref) => (
    <div ref={ref} data-variant={variant} className={clsx(s.Card, className)} {...props}>
      {dismissible && (
        <Button
          uniform
          size="3xs"
          variant="ghost"
          color="secondary"
          className={s.CardDismiss}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X />
        </Button>
      )}
      {children}
    </div>
  ),
)
SidebarCard.displayName = "SidebarCard"

export type SidebarCardHeaderProps = ComponentProps<"div">

export const SidebarCardHeader = forwardRef<HTMLDivElement, SidebarCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.CardHeader, className)} {...props} />
  ),
)
SidebarCardHeader.displayName = "SidebarCardHeader"

export type SidebarCardTitleProps = ComponentProps<"div">

export const SidebarCardTitle = forwardRef<HTMLDivElement, SidebarCardTitleProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.CardTitle, className)} {...props} />
  ),
)
SidebarCardTitle.displayName = "SidebarCardTitle"

export type SidebarCardTitleLinkProps = ComponentProps<"a">

export const SidebarCardTitleLink = forwardRef<HTMLAnchorElement, SidebarCardTitleLinkProps>(
  ({ className, children, ...props }, ref) => (
    <a ref={ref} className={clsx(s.CardTitleLink, className)} {...props}>
      {children}
      <ChevronRightMd className={s.CardTitleChevron} />
    </a>
  ),
)
SidebarCardTitleLink.displayName = "SidebarCardTitleLink"

export type SidebarCardContentProps = ComponentProps<"div">

export const SidebarCardContent = forwardRef<HTMLDivElement, SidebarCardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.CardContent, className)} {...props} />
  ),
)
SidebarCardContent.displayName = "SidebarCardContent"

export type SidebarCardFooterProps = ComponentProps<"div">

export const SidebarCardFooter = forwardRef<HTMLDivElement, SidebarCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.CardFooter, className)} {...props} />
  ),
)
SidebarCardFooter.displayName = "SidebarCardFooter"

// =============================================
// Inset (Main Content Area)
// =============================================

export type SidebarInsetProps = ComponentProps<"main">

export const SidebarInset = forwardRef<HTMLElement, SidebarInsetProps>(
  ({ className, ...props }, ref) => (
    <main ref={ref} className={clsx(s.Inset, className)} {...props} />
  ),
)
SidebarInset.displayName = "SidebarInset"

// =============================================
// Layout Container
// =============================================

export type SidebarLayoutProps = ComponentProps<"div">

export const SidebarLayout = forwardRef<HTMLDivElement, SidebarLayoutProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.SidebarLayout, className)} {...props} />
  ),
)
SidebarLayout.displayName = "SidebarLayout"

// =============================================
// Trigger (Collapse Button)
// =============================================

export type SidebarTriggerProps = ComponentProps<"button"> & {
  children?: ReactNode
}

export const SidebarTrigger = forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { state, collapsible, isMobile, toggleSidebar } = useSidebar()

    // Don't render if collapsible="none" (text-only sidebars)
    if (collapsible === "none") {
      return null
    }

    // Default icon (same for both states, as per reference)
    const defaultIcon = <SidebarLeft />

    return (
      <button
        ref={ref}
        type="button"
        className={clsx(s.Trigger, className)}
        onClick={toggleSidebar}
        aria-label={
          isMobile ? "Open menu" : state === "expanded" ? "Collapse sidebar" : "Expand sidebar"
        }
        {...props}
      >
        <span className={s.TriggerInner}>
          <span className={s.TriggerIcon}>{children ?? defaultIcon}</span>
        </span>
      </button>
    )
  },
)
SidebarTrigger.displayName = "SidebarTrigger"

// =============================================
// Mobile Menu Button (Hamburger → X)
// =============================================

export type SidebarMobileMenuButtonProps = ComponentProps<"button">

export const SidebarMobileMenuButton = forwardRef<HTMLButtonElement, SidebarMobileMenuButtonProps>(
  ({ className, ...props }, ref) => {
    const { openMobile, setOpenMobile } = useSidebar()

    return (
      <button
        ref={ref}
        type="button"
        data-expanded={openMobile ? "" : undefined}
        className={clsx(s.MobileMenuButton, className)}
        onClick={() => setOpenMobile(!openMobile)}
        aria-label={openMobile ? "Close menu" : "Open menu"}
        {...props}
      >
        <span className={s.MobileMenuIcon}>
          <span className={s.MobileMenuLine} data-top />
          <span className={s.MobileMenuMiddle}>
            <span className={s.MobileMenuLine} data-bottom />
          </span>
        </span>
      </button>
    )
  },
)
SidebarMobileMenuButton.displayName = "SidebarMobileMenuButton"

// =============================================
// Mobile Sidebar
// =============================================

export type SidebarMobileProps = ComponentProps<"div"> & {
  /** When true, drawer is positioned absolute instead of fixed (for contained demos) */
  contained?: boolean
}

export const SidebarMobile = forwardRef<HTMLDivElement, SidebarMobileProps>(
  ({ className, children, contained, ...props }, ref) => {
    const { setOpenMobile } = useSidebar()

    return (
      <>
        {/* Backdrop */}
        <div
          className={clsx(s.MobileBackdrop, contained && s.contained)}
          onClick={() => setOpenMobile(false)}
          aria-hidden="true"
        />

        {/* Drawer */}
        <div
          ref={ref}
          className={clsx(s.MobileSidebar, contained && s.contained, className)}
          {...props}
        >
          {children}
        </div>
      </>
    )
  },
)
SidebarMobile.displayName = "SidebarMobile"

export type SidebarMobileHeaderProps = ComponentProps<"div">

export const SidebarMobileHeader = forwardRef<HTMLDivElement, SidebarMobileHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.MobileHeader, className)} {...props} />
  ),
)
SidebarMobileHeader.displayName = "SidebarMobileHeader"

export type SidebarMobileFooterProps = ComponentProps<"div">

export const SidebarMobileFooter = forwardRef<HTMLDivElement, SidebarMobileFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.MobileFooter, className)} {...props} />
  ),
)
SidebarMobileFooter.displayName = "SidebarMobileFooter"

// =============================================
// Input (Search)
// =============================================

export type SidebarInputProps = InputProps

export const SidebarInput = forwardRef<HTMLInputElement, SidebarInputProps>(
  ({ className, ...props }, ref) => (
    <div className={s.Input}>
      <Input ref={ref} className={className} startAdornment={<SearchIcon />} {...props} />
    </div>
  ),
)
SidebarInput.displayName = "SidebarInput"

// =============================================
// Footer Links
// =============================================

export type SidebarFooterLinksProps = ComponentProps<"div">

export const SidebarFooterLinks = forwardRef<HTMLDivElement, SidebarFooterLinksProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(s.FooterLinks, className)} {...props} />
  ),
)
SidebarFooterLinks.displayName = "SidebarFooterLinks"
