"use client"

import { type ComponentType, createContext, type ForwardRefExoticComponent } from "react"

type UIProviderContextValue = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkComponent: ComponentType<any> | ForwardRefExoticComponent<any> | "a"
}

export const UIProviderContext = createContext<UIProviderContextValue | null>(null)
