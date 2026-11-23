"use client"

import { type ComponentType, type ForwardRefExoticComponent, type ReactNode, useEffect, useLayoutEffect } from "react"
import { PlexUIContext } from "./PlexUIContext"

// The link component's type comes from PlexUIConfig in global.d.ts, which is
// what ButtonLink, TextLink and Menu.Link read.

/**
 * The phone look of the components (with `@plexui/styles/styles/touch.css`): `"ios"` draws iOS 26, `"android"` the
 * Plex Android look, `"auto"` the Android look on an Android browser and iOS elsewhere.
 */
export type PlexUIPlatform = "auto" | "ios" | "android"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/** `"android"` on an Android browser, else null (the default iOS look) */
function detectPlatform(): "android" | null {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) ? "android" : null
}

/**
 * Sets `data-platform` on the document's root, which the phone styles read. `"auto"` leaves the root alone except
 * on Android, so a page (or a docs frame) that sets the attribute itself keeps it.
 */
function usePlatformAttribute(platform: PlexUIPlatform) {
  useIsomorphicLayoutEffect(() => {
    const resolved = platform === "auto" ? detectPlatform() : platform
    if (!resolved) return
    const root = document.documentElement
    const previous = root.getAttribute("data-platform")
    root.setAttribute("data-platform", resolved)
    return () => {
      if (previous === null) root.removeAttribute("data-platform")
      else root.setAttribute("data-platform", previous)
    }
  }, [platform])
}

/**
 * Shared context for all Plex UI components - wrap your app in this
 * provider to use Plex UI components.
 *
 * It holds the component you use for rendering Links and picks the phone
 * look (`platform`).
 */
export function PlexUIProvider({
  children,
  linkComponent,
  platform = "auto",
}: {
  children: ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkComponent: ComponentType<any> | ForwardRefExoticComponent<any> | "a"
  /** The phone look: iOS 26, the Plex Android look, or `"auto"` (Android on an Android browser) */
  platform?: PlexUIPlatform
}) {
  usePlatformAttribute(platform)
  return <PlexUIContext.Provider value={{ linkComponent }}>{children}</PlexUIContext.Provider>
}
