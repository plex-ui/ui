"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

// Constants
const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_WIDTH = "320px"
const SIDEBAR_WIDTH_MOBILE = "288px"
const SIDEBAR_WIDTH_ICON = "48px"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const MOBILE_BREAKPOINT = 768

// Types
export type SidebarState = "expanded" | "collapsed"
export type SidebarCollapsible = "offcanvas" | "icon" | "none"
export type SidebarSide = "left" | "right"
export type SidebarVariant = "sidebar" | "floating" | "inset" | "dual-tier" | "docs"

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

// Hook for mobile detection via matchMedia
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === "undefined") return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const handleChange = () => setIsMobile(mql.matches)
    handleChange() // Initial check

    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [])

  return isMobile
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
   * Collapsible mode
   * @default "offcanvas"
   */
  collapsible?: SidebarCollapsible
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
  collapsible = "offcanvas",
  style,
  className,
}: SidebarProviderProps) => {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = useState(false)

  // Controlled vs uncontrolled state for desktop
  const [_open, _setOpen] = useState(defaultOpen)
  const open = openProp ?? _open

  const setOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value

      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // Persist state in cookie for SSR
      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      }
    },
    [setOpenProp, open],
  )

  // Toggle function that handles both mobile and desktop
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen((prev) => !prev)
    }
  }, [isMobile, setOpen])

  // Keyboard shortcut: Cmd/Ctrl + B
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if collapsible is "none"
      if (collapsible === "none") return

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

  // Close mobile menu on escape key
  useEffect(() => {
    if (!openMobile) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMobile(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openMobile])

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
    [state, open, setOpen, openMobile, isMobile, collapsible, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        className={className}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
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
  WIDTH_MOBILE: SIDEBAR_WIDTH_MOBILE,
  WIDTH_ICON: SIDEBAR_WIDTH_ICON,
  KEYBOARD_SHORTCUT: SIDEBAR_KEYBOARD_SHORTCUT,
  MOBILE_BREAKPOINT,
  COOKIE_NAME: SIDEBAR_COOKIE_NAME,
  COOKIE_MAX_AGE: SIDEBAR_COOKIE_MAX_AGE,
} as const
