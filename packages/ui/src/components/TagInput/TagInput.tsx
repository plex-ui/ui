"use client"

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useOnClickOutside } from "usehooks-ts"
import { useLatestValue } from "../../hooks/useLatestValue"
import { toCssVariables } from "../../lib/helpers"
import type { Sizes, Variants } from "../../types"
import { X } from "../Icon"
import s from "@plexui/styles/components/TagInput/TagInput.module.css"

export type Tag = {
  value: string
  valid: boolean
}

export type TagInputProps = {
  /**
   * The state of the tag input when it is initially rendered, used when uncontrolled
   */
  defaultValue?: Tag[]
  /**
   * The value of the tag input, used to control the tag input
   */
  value?: Tag[]
  /**
   * Allows the tag input to be targeted with htmlFor
   */
  id?: string
  /**
   * Corresponds with Input height when rows=1
   * @default xl
   */
  size?: Sizes<"sm" | "md" | "lg" | "xl" | "2xl" | "3xl">
  /**
   * Visual style. `ghost` has no frame, for a field that its container already frames
   * @default outline
   */
  variant?: Variants<"outline" | "ghost">
  /**
   * Callback function invoked when the tag list changes
   */
  onChange?: (tags: Tag[]) => void
  /**
   * Placeholder text for the input
   */
  placeholder?: string
  /**
   * A function that returns whether a given value is a valid tag.
   * Invalid tags are highlighted in red.
   * Tags are evaluated for validity only on creation; changing the validator function later has no effect
   */
  validator?: (value: string) => boolean
  /**
   * The maximum number of tags allowed before the input is disabled; displays a counter below the input
   */
  maxTags?: number
  /**
   * Whether to focus this input on mount
   * @default false
   */
  autoFocus?: boolean
  /**
   * The minimum number of rows for the tag input
   * @default 1
   */
  rows?: number
  /**
   * Controls what characters will count towards creating a new tag
   * @default [",", " "]
   */
  delimiters?: string[]
  /**
   * Disables the tag input visually and from interactions
   */
  disabled?: boolean
  /**
   * Renders the container (and inner chips) with a fully-rounded radius,
   * matching `<Input pill />` and `<SelectControl pill />` for horizontal
   * filter rows that mix all three controls.
   * @default false
   */
  pill?: boolean
}

const SHAKE_ANIMATION_DURATION_MS = 500

export const TagInput = (props: TagInputProps) => {
  const {
    defaultValue: defaultValueProp = [],
    value: controlledValue,
    size = "xl",
    variant = "outline",
    onChange,
    validator,
    maxTags,
    placeholder = "",
    autoFocus = false,
    rows = 1,
    delimiters = [",", " "],
    disabled,
    pill = false,
    id,
  } = props

  const [internalTags, setInternalTags] = useState(defaultValueProp)

  const value = controlledValue ?? internalTags
  const isControlled = controlledValue !== undefined

  const tags = useMemo(() => new Map(value.map((tag) => [tag.value, tag])), [value])

  const [currentInput, setCurrentInput] = useState("")
  const [focused, setFocused] = useState(autoFocus)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [duplicateTags, setDuplicateTags] = useState<Set<string>>(new Set())
  const validatorLatest = useLatestValue(validator)
  const onChangeLatest = useLatestValue(onChange)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingRemovalFocus = useRef<{ tag: string; source: HTMLElement } | null>(null)

  const showInput = !maxTags || tags.size < maxTags

  // Handle focusing the correct part of the tag input
  useEffect(() => {
    if (!focused || !containerRef.current) {
      return
    }
    const defaultFocusEl = inputRef.current ?? containerRef.current
    if (selectedTag === null) {
      defaultFocusEl.focus()
    } else {
      const selectedTagElement = containerRef.current.querySelector(
        `[data-tag="${CSS.escape(selectedTag)}"]`,
      ) as HTMLElement | null
      if (selectedTagElement) {
        selectedTagElement.focus()
      } else {
        defaultFocusEl.focus()
      }
    }
  }, [focused, selectedTag, showInput]) // Include showInput so we focus the container when we hide the input

  // Wait for the controlled/uncontrolled list to actually remove the chip. A
  // rejected removal leaves focus alone; another focused control is never stolen.
  useLayoutEffect(() => {
    const pending = pendingRemovalFocus.current
    if (!pending || tags.has(pending.tag)) return
    pendingRemovalFocus.current = null
    const doc = pending.source.ownerDocument
    if (doc.activeElement !== doc.body && !pending.source.contains(doc.activeElement)) return
    ;(inputRef.current ?? containerRef.current)?.focus({ preventScroll: true })
  }, [tags])

  // A touch drag can move outside without focusin or compatibility mousedown.
  // Cancel only the restoration request; leave normal blur/commit behavior alone.
  useEffect(() => {
    const doc = containerRef.current?.ownerDocument
    if (!doc) return
    const cancelAfterPointer = (event: Event) => {
      const pending = pendingRemovalFocus.current
      if (pending && event.target instanceof Node && !pending.source.contains(event.target)) {
        pendingRemovalFocus.current = null
      }
    }
    doc.addEventListener("pointerdown", cancelAfterPointer, true)
    return () => doc.removeEventListener("pointerdown", cancelAfterPointer, true)
  }, [])

  // A ghost has no frame: the hint stays after the first tag to show where to type.
  const placeholderText = tags.size === 0 || variant === "ghost" ? placeholder : undefined

  // The field takes the width of its text (or hint) plus a cursor gutter, from the hidden copy of that text
  // beside it (see .InputMeasure): CSS wraps it under the tags when it does not fit after the last one and
  // stretches it over the rest of the row, so the server draws the same rows as the browser (plan 175.3).

  // ============================================
  // Tag lifecycle functions
  // ============================================

  // Adds every value in one update: a paste of "a,b" must not compute
  // each addition from the same stale `tags` snapshot.
  const addTags = (tagValues: string[]) => {
    const newSet = new Map(tags)
    let changed = false
    for (const tagValue of tagValues) {
      if (maxTags && newSet.size >= maxTags) {
        break
      }
      const trimmed = tagValue.trim()
      if (!trimmed) {
        continue
      }
      if (newSet.has(trimmed)) {
        setDuplicateTags((prevTags) => new Set(prevTags).add(trimmed))
        setTimeout(
          () =>
            setDuplicateTags((prevTags) => {
              const newTags = new Set(prevTags)
              newTags.delete(trimmed)
              return newTags
            }),
          SHAKE_ANIMATION_DURATION_MS,
        )
        continue
      }
      const validTag = validatorLatest.current?.(trimmed) ?? true
      newSet.set(trimmed, { value: trimmed, valid: validTag })
      changed = true
    }
    if (!changed) {
      return
    }
    const newTags = Array.from(newSet.values())
    onChangeLatest.current?.(newTags)

    if (!isControlled) {
      setInternalTags(newTags)
    }
  }

  const addTag = (tagValue: string) => addTags([tagValue])

  const removeTag = (tag: string) => {
    if (disabled) {
      return
    }
    const source = containerRef.current?.querySelector<HTMLElement>(`[data-tag="${CSS.escape(tag)}"]`)
    if (source?.contains(source.ownerDocument.activeElement)) pendingRemovalFocus.current = { tag, source }
    const newSet = new Map(tags)
    newSet.delete(tag)
    const newTags = Array.from(newSet.values())
    onChangeLatest.current?.(newTags)
    if (!isControlled) {
      setInternalTags(newTags)
    }
  }

  const selectPreviousTag = () => {
    if (tags.size === 0) {
      return
    }
    const tagList = Array.from(tags.keys())
    if (selectedTag === null) {
      setSelectedTag(tagList[tagList.length - 1])
    } else {
      const prevIndex = tagList.indexOf(selectedTag)
      const index = Math.max(0, prevIndex - 1)
      setSelectedTag(tagList[index])
    }
  }

  const selectNextTag = () => {
    if (selectedTag === null) {
      return
    }
    const tagList = Array.from(tags.keys())
    const prevIndex = tagList.indexOf(selectedTag)
    const index = prevIndex + 1
    if (index < tagList.length) {
      setSelectedTag(tagList[index])
    } else {
      setSelectedTag(null)
    }
  }

  // ============================================
  // Helper functions
  // ============================================

  const isEmptyStartingSelection = () => {
    const input = inputRef.current
    if (!input) {
      return true
    }
    return input.selectionStart === 0 && input.selectionEnd === 0
  }

  const handleContainerBlur = () => {
    pendingRemovalFocus.current = null
    setFocused(false)
    setSelectedTag(null)
    // A disabled tag input keeps the pending text instead of committing it
    if (currentInput && !disabled) {
      addTag(currentInput)
      setCurrentInput("")
    }
  }

  // ============================================
  // Event handlers
  // ============================================

  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME candidate navigation belongs to the input, including Safari's 229 key.
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return
    // A tag can keep focus while the input turns disabled: no selecting or removing then
    if (disabled) {
      return
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      if (isEmptyStartingSelection()) {
        e.preventDefault()
        selectPreviousTag()
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      if (selectedTag !== null) {
        e.preventDefault()
        selectNextTag()
      }
    } else if (e.key === "Backspace") {
      if (selectedTag !== null) {
        removeTag(selectedTag)
      } else if (isEmptyStartingSelection()) {
        selectPreviousTag()
      }
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Confirming an IME candidate must not commit or clear the pre-edit buffer.
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return
    if (e.key === "Enter" || delimiters.includes(e.key)) {
      e.preventDefault()
      if (currentInput) {
        addTag(currentInput)
        setCurrentInput("")
      }
    } else if (e.key === "Tab") {
      if (currentInput) {
        e.preventDefault()
        addTag(currentInput)
        setCurrentInput("")
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("Text")
    let parts = [text]

    // Split by all delimiters
    for (const delimiter of delimiters) {
      const newParts = []
      for (const segment of parts) {
        newParts.push(...segment.split(delimiter))
      }
      parts = newParts
    }

    // Remove empty parts
    parts = parts.filter(Boolean)

    if (parts.length > 1) {
      e.preventDefault()
      addTags(parts)
    }
  }

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // All clicks in the container focus the container
    setFocused(true)

    // If the click is on a tag pill, we are done. The click handler
    // for the specific tag will handle focusing it
    if (e.target && e.target instanceof Element && e.target.closest("[data-tag]")) {
      return
    }

    // Since we know we didn't click a tag, clear any selected tag
    setSelectedTag(null)

    // If this click is outside of the input, prevent it from "stealing" focus from the input
    if (
      e.target &&
      e.target instanceof Element &&
      inputRef.current &&
      !inputRef.current.contains(e.target)
    ) {
      e.preventDefault()

      const { left, right, top, bottom } = inputRef.current.getBoundingClientRect()
      const { clientX, clientY } = e

      // If this is the first click, clear the selection. Otherwise, select the input contents
      if (e.detail === 1) {
        if (clientY < top || clientX < left) {
          // "Before" the input: top/left
          inputRef.current.setSelectionRange(0, 0)
        } else if (clientY > bottom || clientX > right) {
          // "After" the input: bottom/right
          const length = inputRef.current.value.length
          inputRef.current.setSelectionRange(length, length)
        }
      } else {
        inputRef.current.select()
      }
    }
  }

  const handleFocus = (e: React.FocusEvent) => {
    // If the focus is on a tag pill, do not trigger input focus logic
    // The click handler for the specific tag will handle it instead
    if (e.target && e.target instanceof Element && e.target.closest("[data-tag]")) {
      return
    }
    setFocused(true)
    setSelectedTag(null)
  }

  const handleBlur = (e: React.FocusEvent) => {
    // If there is no related target, don't remove focus.
    // This occurs on a click inside the container but not on any element.
    // The handleClickOutside handler handles other cases
    if (!e.relatedTarget || !(e.relatedTarget instanceof Node)) {
      return
    }
    // Don't clear focus if focus is only moved elsewhere within the container
    if (containerRef.current && containerRef.current.contains(e.relatedTarget)) {
      // If we just tabbed into the input, clear the selected tag
      if (inputRef.current && inputRef.current.contains(e.relatedTarget)) {
        setSelectedTag(null)
      }
      return
    }
    handleContainerBlur()
  }

  // @ts-expect-error - Fix once usehooks-ts is updated https://github.com/juliencrn/usehooks-ts/pull/675
  useOnClickOutside(containerRef, handleContainerBlur)

  return (
    <>
      <div
        className={s.Container}
        ref={containerRef}
        onKeyDown={handleContainerKeyDown}
        onMouseDown={handleContainerMouseDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-size={size}
        data-variant={variant}
        data-focused={focused ? "" : undefined}
        data-empty={tags.size === 0 ? "" : undefined}
        data-pill={pill ? "" : undefined}
        // At maxTags the input is gone, so the container becomes the tab stop;
        // arrow keys and Backspace then select and remove tags from here
        tabIndex={showInput || disabled ? -1 : 0}
        style={toCssVariables({ "min-rows": String(rows) })}
        data-disabled={disabled ? "" : undefined}
      >
        <div className={s.TagInput}>
          {Array.from(tags.values()).map((tag) => (
            <div
              key={tag.value}
              className={s.Tag}
              tabIndex={-1}
              onClick={() => setSelectedTag(tag.value)}
              data-tag={tag.value}
              data-invalid={!tag.valid ? "" : undefined}
              data-duplicate={duplicateTags.has(tag.value) ? "" : undefined}
            >
              <span className="overflow-hidden text-ellipsis" title={tag.value}>
                <span className={s.TagValue}>{tag.value}</span>
              </span>
              <button
                type="button"
                className={s.TagRemove}
                disabled={disabled}
                onClick={(event) => { event.stopPropagation(); removeTag(tag.value) }}
                aria-label={`Remove ${tag.value}`}
              >
                <X />
              </button>
            </div>
          ))}
          {showInput && (
            <div className={s.InputContainer}>
              {/* A hidden copy of the text gives the field its width */}
              <span className={s.InputMeasure} aria-hidden>{currentInput || placeholderText || ""}</span>
              <div className={s.InputWrapper}>
                <input
                  id={id}
                  className={s.Input}
                  ref={inputRef}
                  value={currentInput}
                  onChange={(e) => {
                    setCurrentInput(e.target.value)
                  }}
                  onPaste={handlePaste}
                  onKeyDown={handleInputKeyDown}
                  placeholder={placeholderText}
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 0 means no limit, as for the input above: no counter (and no stray "0") */}
      {maxTags ? (
        <div className={s.Limit}>
          {tags.size}
          <span className="mx-px">/</span>
          {maxTags}
        </div>
      ) : null}
    </>
  )
}
