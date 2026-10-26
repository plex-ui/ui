"use client"

import { type CSSProperties, useEffect, useState } from "react"
import { Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps } from "sonner"
import { CheckCircle, InfoCircle, Warning, XCircle } from "../Icon"
import s from "@plexui/styles/components/Toast/Toast.module.css"

/**
 * Spread into any `toast(...)` options to get a shrink-to-fit, centered
 * layout: `toast("Saved", compact)`, `toast.success("Done", { ...compact, description })`.
 */
export const compact = { className: s.Compact } as const

type PlexTheme = "light" | "dark"

export type ToasterProps = {
  position?: SonnerToasterProps["position"]
  duration?: SonnerToasterProps["duration"]
  offset?: SonnerToasterProps["offset"]
  gap?: SonnerToasterProps["gap"]
} & Omit<
  SonnerToasterProps,
  | "position"
  | "duration"
  | "closeButton"
  | "offset"
  | "gap"
  | "theme"
  | "richColors"
  | "toastOptions"
  | "style"
>

const readTheme = (): PlexTheme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"

/* Maps PlexUI semantic tokens onto sonner's CSS-variable hooks. Sonner's own
   stylesheet reads these for every toast, so the base look stays aligned with
   <Popover> / <Menu> without overriding each slot. */
const toasterStyle: CSSProperties = {
  "--normal-bg": "var(--color-surface-elevated)",
  "--normal-text": "var(--color-text)",
  "--normal-border": "transparent",
  "--border-radius": "var(--radius-xl)",
  "--width": "400px",
} as CSSProperties

export const Toaster = ({
  position = "top-center",
  duration = 3000,
  offset,
  gap,
  ...restProps
}: ToasterProps) => {
  const [theme, setTheme] = useState<PlexTheme>("light")

  useEffect(() => {
    setTheme(readTheme())

    const observer = new MutationObserver(() => {
      setTheme(readTheme())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <SonnerToaster
      theme={theme}
      position={position}
      duration={duration}
      offset={offset}
      gap={gap}
      className={s.Toaster}
      style={toasterStyle}
      icons={{
        success: <CheckCircle aria-hidden="true" />,
        error: <XCircle aria-hidden="true" />,
        warning: <Warning aria-hidden="true" />,
        info: <InfoCircle aria-hidden="true" />,
      }}
      toastOptions={{
        classNames: {
          toast: s.Toast,
          title: s.Title,
          description: s.Description,
          content: s.Content,
          icon: s.Icon,
          actionButton: s.ActionButton,
          cancelButton: s.CancelButton,
          success: s.Success,
          error: s.Error,
          warning: s.Warning,
          info: s.Info,
        },
      }}
      {...restProps}
    />
  )
}
