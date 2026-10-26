"use client"

import clsx from "clsx"
import { type ReactNode, type Ref } from "react"
import { Badge } from "../Badge"
import { InfoCircle } from "../Icon"
import { Tooltip } from "../Tooltip"
import s from "@plexui/styles/components/StatCard/StatCard.module.css"

export type StatCardProps = {
  /** Label describing the metric */
  label: string
  /** The primary metric value (e.g. "1,234" or "$50K") */
  value: ReactNode
  /** Optional description or subtitle below the value */
  description?: string
  /** Trend indicator with percentage change */
  trend?: {
    /** The percentage change value (e.g. 12.5 for +12.5%) */
    value: number
    /** Optional label for the trend (e.g. "vs last month") */
    label?: string
  }
  /** When true, a positive trend is bad (red) and negative is good (green). Use for metrics like "Error Rate" or "Avg Completion Time". */
  invertTrend?: boolean
  /** Icon displayed on the left side with a soft background */
  icon?: ReactNode
  /** Optional ReactNode for a sparkline/chart rendered at the bottom */
  sparkline?: ReactNode
  /** Progress value from 0 to 100. Shows a progress bar at the bottom. */
  progress?: number
  /** Label displayed next to the progress bar */
  progressLabel?: string
  /** Tooltip text — renders an (i) icon next to the label with a tooltip on hover */
  tooltip?: string
  /**
   * Where the trend indicator is positioned
   * - `"value"` — next to the value (default)
   * - `"header"` — right-aligned in the header row
   * @default "value"
   */
  trendPosition?: "value" | "header"
  /**
   * Visual style of the trend indicator
   * - `"text"` — plain colored text (default)
   * - `"badge"` — wrapped in a Badge component
   * @default "text"
   */
  trendVariant?: "text" | "badge"
  /**
   * Size of the card
   * - `"default"` — standard dashboard card
   * - `"sm"` — compact card for dense layouts
   * @default "default"
   */
  size?: "default" | "sm"
  /**
   * Visual variant of the card
   * @default "default"
   */
  variant?: "default" | "accent"
  /**
   * Accent border color for the "accent" variant
   * @default "primary"
   */
  accentColor?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "discovery" | "caution"
  /** Class applied to the card container */
  className?: string
  /** Ref applied to the card container */
  ref?: Ref<HTMLDivElement>
}

export const StatCard = ({
  label,
  value,
  description,
  trend,
  invertTrend,
  icon,
  sparkline,
  progress,
  progressLabel,
  tooltip,
  trendPosition = "value",
  trendVariant = "text",
  size = "default",
  variant = "default",
  accentColor = "primary",
  className,
  ref,
  ...restProps
}: StatCardProps) => {
  const trendValue = trend?.value ?? 0
  const trendClassName =
    trendValue === 0
      ? s.TrendNeutral
      : trendValue > 0
        ? invertTrend
          ? s.TrendNegative
          : s.TrendPositive
        : invertTrend
          ? s.TrendPositive
          : s.TrendNegative

  const trendText = `${trendValue > 0 ? "+" : ""}${trendValue}%`
  const progressValue =
    progress === undefined ? undefined : Math.min(100, Math.max(0, progress))

  const trendBadgeColor =
    trendValue === 0
      ? "secondary"
      : trendValue > 0
        ? invertTrend
          ? "danger"
          : "success"
        : invertTrend
          ? "success"
          : "danger"

  const trendEl = trend != null && (
    trendVariant === "badge" ? (
      <Badge size="sm" color={trendBadgeColor as "secondary" | "success" | "danger"}>
        {trendText}
      </Badge>
    ) : (
      <div className={clsx(s.Trend, trendClassName)}>
        {trendText}
      </div>
    )
  )

  const headerEl = (
    <div className={s.Header}>
      <div className={s.LabelRow}>
        <div className={s.Label}>{label}</div>
        {tooltip && (
          <Tooltip content={tooltip}>
            <span className={s.InfoIcon}>
              <InfoCircle />
            </span>
          </Tooltip>
        )}
      </div>
      {trendPosition === "header" && trendEl && (
        <div className={s.HeaderEnd}>{trendEl}</div>
      )}
    </div>
  )

  const valueRowEl = (
    <div className={s.ValueRow}>
      <div className={s.Value}>{value}</div>
      {trendPosition === "value" && trendEl}
      {description && <div className={s.Description}>{description}</div>}
    </div>
  )

  const footerEl = trend?.label ? (
    <div className={s.Footer}>
      <div className={s.TrendLabel}>{trend.label}</div>
    </div>
  ) : null

  const progressEl = (progressValue !== undefined || progressLabel) ? (
    <div className={s.Progress}>
      <div className={s.ProgressTrack}>
        <div
          className={s.ProgressBar}
          style={{ width: `${progressValue ?? 0}%` }}
          aria-hidden
        />
      </div>
      {progressLabel && <div className={s.ProgressLabel}>{progressLabel}</div>}
    </div>
  ) : null

  const sparklineEl = sparkline ? <div className={s.Sparkline}>{sparkline}</div> : null

  return (
    <div
      ref={ref}
      className={clsx(s.StatCard, className)}
      data-variant={variant}
      data-size={size}
      data-accent-color={accentColor}
      {...restProps}
    >
      {icon ? (
        <div className={s.Body}>
          <div className={s.IconWrapper}>{icon}</div>
          <div className={s.Content}>
            {headerEl}
            {valueRowEl}
            {footerEl}
            {progressEl}
            {sparklineEl}
          </div>
        </div>
      ) : (
        <>
          {headerEl}
          {valueRowEl}
          {footerEl}
          {progressEl}
          {sparklineEl}
        </>
      )}
    </div>
  )
}
