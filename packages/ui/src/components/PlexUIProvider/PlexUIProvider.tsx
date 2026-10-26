"use client"

import { type ComponentType, type ForwardRefExoticComponent, type ReactNode } from "react"
import { PlexUIContext } from "./PlexUIContext"

// The link component's type comes from PlexUIConfig in global.d.ts, which is
// what ButtonLink, TextLink and Menu.Link read.

/**
 * Shared context for all Plex UI components - wrap your app in this
 * provider to use Plex UI components.
 *
 * It's pretty thin right now, we only use it to hold onto the component you
 * use for rendering Links, but it could be expanded in the future.
 */
export function PlexUIProvider({
  children,
  linkComponent,
}: {
  children: ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkComponent: ComponentType<any> | ForwardRefExoticComponent<any> | "a"
}) {
  return <PlexUIContext.Provider value={{ linkComponent }}>{children}</PlexUIContext.Provider>
}
