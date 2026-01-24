"use client"

import { useContext } from "react"
import { UIProviderContext } from "./UIProviderContext"

export function useLinkComponent() {
  const context = useContext(UIProviderContext)
  return context?.linkComponent ?? "a"
}
