"use client"

import { useContext } from "react"
import { PlexUIContext } from "./PlexUIContext"

export function useLinkComponent() {
  const context = useContext(PlexUIContext)
  return context?.linkComponent ?? "a"
}
