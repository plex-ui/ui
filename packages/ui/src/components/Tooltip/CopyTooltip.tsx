"use client"

import { Tooltip as RadixTooltip } from "radix-ui"
import { useEffect, useRef, useState } from "react"
import { copyText } from "../../lib/copyToClipboard"
import { Check, Copy } from "../Icon"
import { Tooltip } from "./Tooltip"

export type CopyTooltipProps = {
  children: React.ReactNode
  /** Value to copy to the clipboard */
  copyValue: string
  /**
   * Delay of when the tooltip is shown from first interaction, in milliseconds.
   * @default 150
   */
  openDelay?: number
  /**
   * The preferred alignment against the trigger. May change when collisions occur.
   * @default center
   */
  align?: RadixTooltip.TooltipContentProps["align"]
  /**
   * An offset in pixels from the "start" or "end" alignment options.
   * @default 0
   */
  alignOffset?: RadixTooltip.TooltipContentProps["alignOffset"]
  /**
   * The preferred side of the trigger to render against when open. Will be reversed when collisions occur.
   * @default top
   */
  side?: RadixTooltip.TooltipContentProps["side"]
  /**
   * The distance in pixels from the trigger.
   * @default 5
   */
  sideOffset?: RadixTooltip.TooltipContentProps["sideOffset"]
  /**
   * Called once the clipboard write settles, with whether it succeeded. The
   * tooltip says "Copied!" only after a successful write.
   */
  onCopy?: (copied: boolean) => void
}

export const CopyTooltip = ({
  children,
  copyValue,
  openDelay = 150,
  align = "center",
  alignOffset = 0,
  side = "top",
  sideOffset = 5,
  onCopy,
}: CopyTooltipProps) => {
  const [open, setOpen] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mounted = useRef(true)
  const copyGeneration = useRef(0)
  const stopPendingDismissListeners = useRef<(() => void) | undefined>(undefined)

  const cancelFeedback = () => {
    copyGeneration.current += 1
    stopPendingDismissListeners.current?.()
    stopPendingDismissListeners.current = undefined
    clearTimeout(copiedTimerRef.current)
  }

  const copy = async () => {
    cancelFeedback()
    // Success belongs to the completed attempt, not a new pending write.
    setCopied(false)
    const generation = copyGeneration.current
    // A touch copy can start while closed, before Tooltip.Content installs its
    // dismissal listeners. Scrolling or Escape still cancels pending feedback.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelFeedback()
    }
    document.addEventListener("scroll", cancelFeedback, true)
    document.addEventListener("keydown", onKeyDown, true)
    stopPendingDismissListeners.current = () => {
      document.removeEventListener("scroll", cancelFeedback, true)
      document.removeEventListener("keydown", onKeyDown, true)
    }
    // "Copied!" follows the latest successful clipboard write
    const succeeded = await copyText(copyValue)
    if (!mounted.current) return
    onCopy?.(succeeded)
    if (generation !== copyGeneration.current) return
    stopPendingDismissListeners.current?.()
    stopPendingDismissListeners.current = undefined
    if (!succeeded) return

    setCopied(true)
    setOpen(true)

    // Persist the copied state for a second, then close
    clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => {
      setOpen(false)
    }, 1000)
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stopPendingDismissListeners.current?.()
      clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const handleOpenChange = (nextState: boolean) => {
    if (!nextState) cancelFeedback()
    // When opening, ensure timer and copied state are cleared
    if (nextState) {
      clearTimeout(copiedTimerRef.current)
      setCopied(false)
    }

    setOpen(nextState)
  }

  return (
    <Tooltip.Root
      open={open}
      onOpenChange={handleOpenChange}
      delayDuration={openDelay}
      disableHoverableContent={copied}
    >
      <Tooltip.Trigger
        onClick={(evt) => {
          // Activate after a completed tap, not when a scrolling gesture starts.
          // Keep the tooltip's click listener from closing the copy feedback.
          evt.preventDefault()
          evt.stopPropagation()
          copy()
        }}
        // Keyboard users copy with Enter or Space, like a click
        onKeyDown={(evt) => {
          if (evt.key === "Enter" || evt.key === " ") {
            evt.preventDefault()
            copy()
          }
        }}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content
        compact
        clickable={!copied}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={15}
        onEscapeKeyDown={() => setOpen(false)}
        onClick={copy}
      >
        {copied ? (
          // The <Check /> SVG canvas whitespace is larger than copy, so we use a smaller flexbox gap
          <div className="flex items-center gap-0.5">
            <Check /> Copied!
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Copy /> Copy
          </div>
        )}
      </Tooltip.Content>
    </Tooltip.Root>
  )
}
