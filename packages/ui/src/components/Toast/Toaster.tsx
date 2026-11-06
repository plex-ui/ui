"use client"

import { type CSSProperties, useSyncExternalStore } from "react"
import { type ToasterProps as SonnerToasterProps } from "sonner"
import { ToastRenderer as SonnerToaster } from "./ToastRenderer"
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
  /** Mobile gutter outside the safe area; explicit edges override the safe defaults. */
  mobileOffset?: SonnerToasterProps["mobileOffset"]
  gap?: SonnerToasterProps["gap"]
} & Omit<
  SonnerToasterProps,
  | "position"
  | "duration"
  | "closeButton"
  | "offset"
  | "mobileOffset"
  | "gap"
  | "theme"
  | "richColors"
  | "toastOptions"
  | "style"
>

const readTheme = (): PlexTheme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"

const subscribeTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  })
  return () => observer.disconnect()
}

// Keep a gutter outside the safe area; explicit offsets override each supplied
// edge, while omitted edges retain the safe default. Sonner applies these only
// at its mobile breakpoint, so desktop positioning is unchanged.
const safeMobileOffset = {
  top: "calc(16px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
  right: "calc(16px + var(--safe-area-inset-right, env(safe-area-inset-right, 0px)))",
  bottom: "calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
  left: "calc(16px + var(--safe-area-inset-left, env(safe-area-inset-left, 0px)))",
}

const resolveMobileOffset = (offset: SonnerToasterProps["mobileOffset"]) =>
  typeof offset === "number" || typeof offset === "string"
    ? offset
    : {
        top: offset?.top ?? safeMobileOffset.top,
        right: offset?.right ?? safeMobileOffset.right,
        bottom: offset?.bottom ?? safeMobileOffset.bottom,
        left: offset?.left ?? safeMobileOffset.left,
      }

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
  mobileOffset,
  gap,
  ...restProps
}: ToasterProps) => {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, (): PlexTheme => "light")

  return (
    <SonnerToaster
      theme={theme}
      position={position}
      duration={duration}
      offset={offset}
      mobileOffset={resolveMobileOffset(mobileOffset)}
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
