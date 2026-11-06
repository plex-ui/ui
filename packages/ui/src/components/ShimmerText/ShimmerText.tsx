"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"

import clsx from "clsx"
import { prefersReducedMotion } from "../../lib/helpers"
import s from "@plexui/styles/components/ShimmerText/ShimmerText.module.css"

const subscribeReducedMotion = (onChange: () => void) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {}
  const query = window.matchMedia("(prefers-reduced-motion: reduce)")
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
const serverReducedMotion = () => false

// If text will always shimmer, use the simpler interface
export const ShimmerText = ({
  as: Tag = "div",
  children,
  className,
}: {
  as?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div"
  children: ReactNode
  className?: string
}) => {
  return <Tag className={clsx(s.Shimmer, className)}>{children}</Tag>
}

// If text may end shimmering after playing for a time, or resume, use shimmerable text
export const ShimmerableText = ({
  as: Tag = "div",
  children,
  className,
  shimmer = false,
  ...restProps
}: {
  as?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div"
  children: ReactNode
  className?: string
  shimmer?: boolean
}) => {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, serverReducedMotion)
  const [paused, setPaused] = useState(!shimmer)

  // CSS stops motion immediately. A pending stop must also settle without an
  // animationiteration event, so removing the preference cannot restart it.
  if (shimmer && paused) setPaused(false)
  else if (!shimmer && reducedMotion && !paused) setPaused(true)

  // Pauses the animation at the start of (what would be) the next iteration.
  const handleAnimationIteration = () => {
    setPaused(true)
  }

  return (
    <Tag
      {...restProps}
      className={clsx(s.Shimmer, className)}
      onAnimationIteration={shimmer ? undefined : handleAnimationIteration}
      data-idle={paused ? "" : undefined}
    >
      {children}
    </Tag>
  )
}
