"use client"

import clsx from "clsx"
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ComponentProps } from "react"
import { mergeRefs } from "react-merge-refs"
import { PHONE_MEDIA } from "../../lib/phoneLayout"
import s from "@plexui/styles/components/PhoneLayout/PhoneLayout.module.css"

export type PhoneLayoutValue = {
  /** Where dialogs inside the layout portal to: the PhoneLayout box, or null for the document body. */
  container: HTMLElement | null
}

/** Non-null inside a PhoneLayout or a Dialog with `layout="phone"`. */
export const PhoneLayoutContext = createContext<PhoneLayoutValue | null>(null)

export type PhoneLayoutProps = ComponentProps<"div">

/**
 * Lays out what it holds as on a phone at any window width, such as a phone frame on a desktop page: components take
 * their phone presentation inside it, and a Dialog opened inside it covers the box instead of the window.
 */
export const PhoneLayout = ({ className, children, ref, ...rest }: PhoneLayoutProps) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const value = useMemo(() => ({ container }), [container])
  return (
    <PhoneLayoutContext value={value}>
      <div {...rest} ref={mergeRefs([setContainer, ref])} className={clsx(s.PhoneLayout, className)} data-plex-layout="phone">
        {children}
      </div>
    </PhoneLayoutContext>
  )
}

const phoneWindow = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(PHONE_MEDIA) : null)
const subscribePhoneWindow = (onChange: () => void) => {
  const query = phoneWindow()
  if (!query) return () => {}
  // Safari before 14 has only the older listener methods
  if (typeof query.addEventListener !== "function") {
    query.addListener(onChange)
    return () => query.removeListener(onChange)
  }
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/**
 * Whether components here are laid out as on a phone: inside a PhoneLayout (or a Dialog with `layout="phone"`), or
 * in a window 767px wide or narrower. The server answers false outside a PhoneLayout.
 */
export const usePhoneLayout = (): boolean => {
  const scoped = useContext(PhoneLayoutContext) !== null
  const narrow = useSyncExternalStore(subscribePhoneWindow, () => phoneWindow()?.matches ?? false, () => false)
  return scoped || narrow
}
