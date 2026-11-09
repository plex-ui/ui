"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import clsx from "clsx"
import s from "@plexui/styles/components/Sidebar/Sidebar.module.css"

// Constants
const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_WIDTH = "240px"
const SIDEBAR_WIDTH_APP = "260px"
const SIDEBAR_WIDTH_MOBILE = "288px"
const SIDEBAR_WIDTH_ICON = "64px"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const MOBILE_BREAKPOINT = 768

// Types
export type SidebarState = "expanded" | "collapsed"
export type SidebarCollapsible = "offcanvas" | "icon" | "none"
export type SidebarSide = "left" | "right"
export type SidebarVariant = "sidebar" | "docs"
export type SidebarProviderVariant = "sidebar" | "app"

export type SidebarContextValue = {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  collapsible: SidebarCollapsible
  toggleSidebar: () => void
}

// Context
const SidebarContext = createContext<SidebarContextValue | null>(null)

// Hook to access sidebar context
export const useSidebar = (): SidebarContextValue => {
  const context = useContext(SidebarContext)

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }

  return context
}

// Hook for mobile detection via matchMedia. Read during render, so a phone
// gets the mobile layout on its first paint instead of one frame of the
// desktop sidebar; the server (and hydration) renders the desktop layout.
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

const subscribeToMobile = (onChange: () => void) => {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getMobileSnapshot = () => window.matchMedia(MOBILE_QUERY).matches
const getServerMobileSnapshot = () => false

function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeToMobile, getMobileSnapshot, getServerMobileSnapshot)
}

// Provider props
export type SidebarProviderProps = {
  children: ReactNode
  /**
   * Default open state (uncontrolled)
   * @default true
   */
  defaultOpen?: boolean
  /**
   * Controlled open state
   */
  open?: boolean
  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Controlled open state of the phone drawer (`SidebarMobile`)
   */
  openMobile?: boolean
  /**
   * Initial open state of the phone drawer (uncontrolled)
   * @default false
   */
  defaultOpenMobile?: boolean
  /**
   * Called when the phone drawer opens or closes: its menu button, its backdrop, Escape or a swipe
   */
  onOpenMobileChange?: (open: boolean) => void
  /**
   * Collapsible mode
   * @default "offcanvas"
   */
  collapsible?: SidebarCollapsible
  /**
   * "app" is the shell of a product: a quiet rail, pill rows and on a phone a drawer under the page.
   * @default "sidebar"
   */
  variant?: SidebarProviderVariant
  /**
   * Custom CSS properties for the sidebar
   */
  style?: React.CSSProperties
  /**
   * Additional class name
   */
  className?: string
}

// Provider component
export const SidebarProvider = ({
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  openMobile: openMobileProp,
  defaultOpenMobile = false,
  onOpenMobileChange,
  collapsible = "offcanvas",
  variant = "sidebar",
  style,
  className,
}: SidebarProviderProps) => {
  const isMobile = useIsMobile()
  // Controlled vs uncontrolled state for the phone drawer
  const [_openMobile, _setOpenMobile] = useState(defaultOpenMobile)
  const openMobile = openMobileProp ?? _openMobile

  const setOpenMobile = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(openMobile) : value
      if (next === openMobile) return
      if (openMobileProp === undefined) _setOpenMobile(next)
      onOpenMobileChange?.(next)
    },
    [openMobile, openMobileProp, onOpenMobileChange],
  )

  // Controlled vs uncontrolled state for desktop
  const [_open, _setOpen] = useState(defaultOpen)
  const open = openProp ?? _open

  const setOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value

      // Controlled only when `open` is passed; onOpenChange alone is a notification
      if (openProp === undefined) {
        _setOpen(openState)
      }
      setOpenProp?.(openState)

      // Persist state in cookie for SSR
      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      }
    },
    [setOpenProp, openProp, open],
  )

  // Toggle function that handles both mobile and desktop
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen((prev) => !prev)
    }
  }, [isMobile, setOpen, setOpenMobile])

  // Keyboard shortcut: Cmd/Ctrl + B
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if collapsible is "none"
      if (collapsible === "none") return

      // Don't trigger when focus is in an editable element (input, textarea, contenteditable)
      const target = event.target as HTMLElement | null
      if (target?.closest?.("input, textarea") || target?.isContentEditable) return

      // Check for Cmd (Mac) or Ctrl (Windows/Linux) + B
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar, collapsible])

  // Escape closes the drawer from inside it (SidebarMobile), so a layer over it takes its own Escape first

  // Derive state from open boolean
  const state: SidebarState = open ? "expanded" : "collapsed"

  // Context value
  const contextValue = useMemo<SidebarContextValue>(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      collapsible,
      toggleSidebar,
    }),
    [state, open, setOpen, openMobile, setOpenMobile, isMobile, collapsible, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        className={clsx(variant === "app" && s.App, className)}
        style={
          {
            "--sidebar-width": variant === "app" ? SIDEBAR_WIDTH_APP : SIDEBAR_WIDTH,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        data-sidebar={state}
        data-mobile-menu={openMobile ? "visible" : "hidden"}
        data-collapsible={collapsible}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

// Re-export constants for external use
export const SIDEBAR_CONSTANTS = {
  WIDTH: SIDEBAR_WIDTH,
  WIDTH_APP: SIDEBAR_WIDTH_APP,
  WIDTH_MOBILE: SIDEBAR_WIDTH_MOBILE,
  WIDTH_ICON: SIDEBAR_WIDTH_ICON,
  KEYBOARD_SHORTCUT: SIDEBAR_KEYBOARD_SHORTCUT,
  MOBILE_BREAKPOINT,
  COOKIE_NAME: SIDEBAR_COOKIE_NAME,
  COOKIE_MAX_AGE: SIDEBAR_COOKIE_MAX_AGE,
} as const
