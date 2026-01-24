"use client"

import { type ComponentType, createContext, type ForwardRefExoticComponent } from "react"

type PlexUIContextValue = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkComponent: ComponentType<any> | ForwardRefExoticComponent<any> | "a"
}

export const PlexUIContext = createContext<PlexUIContextValue | null>(null)
