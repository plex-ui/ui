"use client"

import { type ComponentType, type ForwardRefExoticComponent, type ReactNode } from "react"
import { UIProviderContext } from "./UIProviderContext"

/// <reference path="../../global.d.ts" />

interface DefaultConfig {
  LinkComponent: "a"
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface UIProviderConfig {}
}

// Utility type to merge defaults with overrides. The override keys take precedence.
type MergeOverrides<Defaults, Overrides> = Omit<Defaults, keyof Overrides> & Overrides

export type Config = MergeOverrides<DefaultConfig, UIProviderConfig>

export type LinkComponent = Config["LinkComponent"]

/**
 * Shared context for all Storybook components - wrap your app in this
 * provider to use Storybook components.
 *
 * It's pretty thin right now, we only use it to hold onto the component you
 * use for rendering Links, but it could be expanded in the future.
 */
export function UIProvider({
  children,
  linkComponent,
}: {
  children: ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkComponent: ComponentType<any> | ForwardRefExoticComponent<any> | "a"
}) {
  return (
    <UIProviderContext.Provider value={{ linkComponent }}>{children}</UIProviderContext.Provider>
  )
}
