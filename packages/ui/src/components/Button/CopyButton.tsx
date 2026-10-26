"use client"

import { useEffect, useRef, useState, type MouseEvent } from "react"
import { copyToClipboard, type ClipboardContent } from "../../lib/copyToClipboard"
import { Check, Copy } from "../Icon"
import { Animate } from "../Transition"
import { Button, type ButtonProps } from "./Button"

export type CopyButtonProps = {
  copyValue: string | ClipboardContent | (() => string) | (() => ClipboardContent)
  children?: React.ReactNode | ((props: { copied: boolean }) => React.ReactNode)
  /**
   * Called once the clipboard write settles, with whether it succeeded. The
   * button shows the copied state only after a successful write.
   */
  onCopy?: (copied: boolean) => void
} & Omit<ButtonProps, "children" | "onCopy">

export const CopyButton = ({ children, copyValue, onClick, onCopy, ...restProps }: CopyButtonProps) => {
  const [copied, setCopied] = useState<boolean>(false)
  const copiedTimeout = useRef<number | null>(null)
  const pending = useRef(false)
  const mounted = useRef(true)

  const handleClick = async (evt: MouseEvent<HTMLButtonElement>) => {
    // No-op while copied, or while a write is still in flight
    if (copied || pending.current) {
      return
    }

    onClick?.(evt)

    // The copied state follows the clipboard: a failed write shows no check
    pending.current = true
    const succeeded = await copyToClipboard(typeof copyValue === "function" ? copyValue() : copyValue)
    pending.current = false
    if (!mounted.current) return
    onCopy?.(succeeded)
    if (!succeeded) return

    setCopied(true)
    copiedTimeout.current = window.setTimeout(() => {
      setCopied(false)
    }, 1300)
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copiedTimeout.current) clearTimeout(copiedTimeout.current)
    }
  }, [])

  // Icon-only copy buttons have no text content, so they need a name of their own
  const ariaLabel = restProps["aria-label"] ?? (children == null ? (copied ? "Copied" : "Copy") : undefined)

  return (
    <Button {...restProps} aria-label={ariaLabel} onClick={handleClick}>
      <Animate
        className="w-[var(--button-icon-size)] h-[var(--button-icon-size)]"
        initial={{ scale: 0.6 }}
        enter={{ scale: 1, delay: 150, duration: 300 }}
        exit={{ scale: 0.6, duration: 150 }}
        forceCompositeLayer
      >
        {copied ? <Check key="copied-icon" /> : <Copy key="copy-icon" />}
      </Animate>
      {typeof children === "function" ? children({ copied }) : children}
    </Button>
  )
}
