"use client"

import clsx from "clsx"
import { useState, type ComponentProps } from "react"

import { Button } from "../Button"
import { CodeBlockBase } from "./CodeBlock"
import s from "./CodeBlock.module.css"

export type CollapsibleCodeBlockProps = {
  /** The code string to display */
  children: string
  /** Syntax highlighting language */
  language?: string
  /** Whether the code block starts expanded */
  defaultExpanded?: boolean
  /** Height of the collapsed container in pixels */
  collapsedHeight?: number
  /** Maximum height when expanded (enables scroll if exceeded) */
  maxExpandedHeight?: number
  /** Whether to show the copy button when expanded */
  copyable?: boolean
  /** Additional class name for the container */
  className?: string
}

export function CollapsibleCodeBlock({
  children,
  language,
  defaultExpanded = false,
  collapsedHeight = 140,
  maxExpandedHeight,
  copyable = true,
  className,
}: CollapsibleCodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const containerStyle: ComponentProps<"div">["style"] = isExpanded
    ? maxExpandedHeight
      ? { maxHeight: maxExpandedHeight }
      : undefined
    : { maxHeight: collapsedHeight }

  return (
    <CodeBlockBase
      className={clsx(s.CollapsibleCodeBlock, className)}
      data-collapsed={!isExpanded ? "" : undefined}
      style={containerStyle}
    >
      <CodeBlockBase.Code language={language}>{children}</CodeBlockBase.Code>

      {!isExpanded && (
        <>
          <div className={s.GradientOverlay} />
          <div className={s.ViewCodeButtonContainer}>
            <Button
              color="secondary"
              variant="solid"
              size="sm"
              pill
              onClick={() => setIsExpanded(true)}
            >
              View Code
            </Button>
          </div>
        </>
      )}

      {isExpanded && copyable && <CodeBlockBase.CopyButton copyValue={children} />}
    </CodeBlockBase>
  )
}
