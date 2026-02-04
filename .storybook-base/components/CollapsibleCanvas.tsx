"use client"

import { Canvas, Source } from "@storybook/blocks"
import { type ComponentProps, useState } from "react"
import s from "./CollapsibleCanvas.module.css"

type CanvasProps = ComponentProps<typeof Canvas>
type SourceProps = ComponentProps<typeof Source>

export type CollapsibleCanvasProps = CanvasProps

/**
 * Canvas wrapper - just renders the Canvas without source.
 * Use CollapsibleSource separately to show collapsible code.
 */
export function CollapsibleCanvas({ of, ...canvasProps }: CollapsibleCanvasProps) {
  return <Canvas of={of} sourceState="none" {...canvasProps} />
}

export type CollapsibleSourceProps = {
  /** Story reference to get source from */
  of?: SourceProps["of"]
  /** Custom source code to display */
  code?: string
  /** Height of the collapsed container in pixels */
  collapsedHeight?: number
  /** Whether to start expanded */
  defaultExpanded?: boolean
}

/**
 * Collapsible source code block with "View Code" button.
 */
export function CollapsibleSource({
  of,
  code,
  collapsedHeight = 140,
  defaultExpanded = false,
}: CollapsibleSourceProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const containerStyle = !isExpanded ? { maxHeight: collapsedHeight } : undefined

  return (
    <div
      className={s.SourceContainer}
      data-collapsible-source
      data-collapsed={!isExpanded ? "" : undefined}
      style={containerStyle}
    >
      {code ? <Source code={code} language="tsx" dark /> : <Source of={of} dark />}

      {!isExpanded && (
        <>
          <div className={s.GradientOverlay} />
          <div className={s.ViewCodeButtonContainer}>
            <button type="button" className={s.ViewCodeButton} onClick={() => setIsExpanded(true)}>
              View Code
            </button>
          </div>
        </>
      )}
    </div>
  )
}
