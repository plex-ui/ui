"use client"

import clsx from "clsx"
import React, { createContext, use, useMemo, useRef, type ReactNode } from "react"
import { isDev } from "../../lib/environment"
import type { Sizes } from "../../types"
import { CheckMd } from "../Icon"
import s from "./ProgressSteps.module.css"

type Orientation = "horizontal" | "vertical"
type StepState = "completed" | "active" | "inactive"
type ConnectorStyle = "solid" | "dashed"
type Variant = "default" | "minimal"
type Color = "default" | "success"

type ProgressStepsContextValue = {
  current: number
  orientation: Orientation
  size: Sizes<"sm" | "md" | "lg">
  connectorStyle: ConnectorStyle
  variant: Variant
  color: Color
  totalSteps: number
}

const ProgressStepsContext = createContext<ProgressStepsContextValue | null>(null)

const useProgressStepsContext = () => {
  const context = use(ProgressStepsContext)
  if (!context) {
    throw new Error("ProgressSteps components must be wrapped in <ProgressSteps />")
  }
  return context
}

export type ProgressStepsProps = {
  /** Current active step (1-indexed, starts from 1) */
  current: number
  /**
   * Total number of steps (required for minimal variant)
   */
  total?: number
  /**
   * Visual variant
   * @default default
   */
  variant?: Variant
  /**
   * Color scheme
   * @default default
   */
  color?: Color
  /**
   * Layout orientation
   * @default horizontal
   */
  orientation?: Orientation
  /**
   * Size of step indicators
   * @default md
   */
  size?: Sizes<"sm" | "md" | "lg">
  /**
   * Connector line style
   * @default solid
   */
  connectorStyle?: ConnectorStyle
  /** Class applied to the container */
  className?: string
  children?: ReactNode
}

export const ProgressSteps = ({
  current,
  total,
  variant = "default",
  color = "default",
  orientation = "horizontal",
  size = "md",
  connectorStyle = "solid",
  children,
  className,
}: ProgressStepsProps) => {
  const totalSteps = variant === "minimal" ? total ?? 0 : React.Children.count(children)

  const warnedRef = useRef(false)
  if (isDev && variant === "minimal" && (total == null || total <= 0) && !warnedRef.current) {
    warnedRef.current = true
    // eslint-disable-next-line no-console
    console.warn(
      '[ProgressSteps] variant="minimal" requires a positive `total` prop. Received:',
      total,
    )
  }

  const store = useMemo<ProgressStepsContextValue>(
    () => ({ current, orientation, size, connectorStyle, variant, color, totalSteps }),
    [current, orientation, size, connectorStyle, variant, color, totalSteps],
  )

  // Minimal variant: render horizontal bar segments
  if (variant === "minimal") {
    return (
      <nav
        aria-label="Progress"
        className={clsx(s.ProgressSteps, s.Minimal, className)}
        data-size={size}
        data-color={color}
        data-variant="minimal"
      >
        <div className={s.MinimalList}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={s.MinimalSegment}
              data-state={i < current ? "completed" : "upcoming"}
            />
          ))}
        </div>
      </nav>
    )
  }

  return (
    <ProgressStepsContext value={store}>
      <nav
        aria-label="Progress"
        className={clsx(s.ProgressSteps, className)}
        data-size={size}
        data-color={color}
        data-variant={variant}
      >
        <ol
          className={s.List}
          data-orientation={orientation}
          data-connector={connectorStyle}
          data-variant={variant}
        >
          {React.Children.map(children, (child, index) =>
            React.isValidElement(child)
              ? React.cloneElement(child, { _index: index } as Record<string, unknown>)
              : child,
          )}
        </ol>
      </nav>
    </ProgressStepsContext>
  )
}

export type StepProps = {
  /** Custom icon (replaces step number) */
  icon?: ReactNode
  /** Disable the step */
  disabled?: boolean
  children: ReactNode
  /** @internal - injected by parent */
  _index?: number
}

const Step = ({ children, icon, disabled, _index = 0 }: StepProps) => {
  const { current, totalSteps } = useProgressStepsContext()

  const state: StepState =
    _index < current - 1 ? "completed" : _index === current - 1 ? "active" : "inactive"

  const isLast = _index === totalSteps - 1

  return (
    <li className={s.Step} data-state={state} data-disabled={disabled ? "" : undefined}>
      <div className={s.StepIndicator}>
        {state === "completed" ? <CheckMd data-no-autosize /> : icon ?? _index + 1}
      </div>
      {!isLast && <div className={s.StepConnector} />}
      <div className={s.StepContent}>{children}</div>
    </li>
  )
}

const Title = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx(s.StepTitle, className)}>{children}</div>
)

const Description = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx(s.StepDescription, className)}>{children}</div>
)

ProgressSteps.Step = Step
ProgressSteps.Title = Title
ProgressSteps.Description = Description
