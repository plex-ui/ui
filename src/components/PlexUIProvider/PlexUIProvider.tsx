"use client"

import { type ComponentType, type ForwardRefExoticComponent, type ReactNode } from "react"
import { PlexUIContext } from "./PlexUIContext"

/// <reference path="../../global.d.ts" />

interface DefaultConfig {
  LinkComponent: "a"
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface PlexUIConfig {}
}

// Utility type to merge defaults with overrides. The override keys take precedence.
type MergeOverrides<Defaults, Overrides> = Omit<Defaults, keyof Overrides> & Overrides

export type Config = MergeOverrides<DefaultConfig, PlexUIConfig>

export type LinkComponent = Config["LinkComponent"]

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
