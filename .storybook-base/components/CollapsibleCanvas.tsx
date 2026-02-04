"use client"

import { Canvas, Source } from "@storybook/blocks"
import { type ComponentProps, useEffect, useRef, useState } from "react"
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
 * If the code fits within the collapsed height, it will be shown fully without the button.
 */
export function CollapsibleSource({
  of,
  code,
  collapsedHeight = 140,
  defaultExpanded = false,
}: CollapsibleSourceProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [needsCollapse, setNeedsCollapse] = useState<boolean | null>(null) // null = not measured yet

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    // Use ResizeObserver to detect when content is rendered
    const observer = new ResizeObserver(() => {
      const contentHeight = el.scrollHeight
      // Add some buffer (8px) to avoid edge cases
      setNeedsCollapse(contentHeight > collapsedHeight + 8)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [collapsedHeight, code, of])

  // Don't constrain height until we've measured
  const shouldCollapse = needsCollapse === true && !isExpanded

  const containerStyle = shouldCollapse ? { maxHeight: collapsedHeight } : undefined

  return (
    <div
      ref={contentRef}
      className={s.SourceContainer}
      data-collapsible-source
      data-collapsed={shouldCollapse ? "" : undefined}
      style={containerStyle}
    >
      {code ? <Source code={code} language="tsx" dark /> : <Source of={of} dark />}

      {shouldCollapse && (
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
