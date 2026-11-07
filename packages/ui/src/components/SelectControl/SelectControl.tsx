"use client"

import clsx from "clsx"
import { useRef, type ReactNode } from "react"
import { mergeRefs } from "react-merge-refs"
import { handlePressableMouseEnter } from "../../lib/helpers"
import { isHoverPointer } from "../../lib/inputMode"
import { isNestedSelectControl } from "../../lib/selectPress"
import type { ControlSize, Variants } from "../../types"
import { Button } from "../Button"
import { ChevronDown, Dropdown, X } from "../Icon"
import { LoadingIndicator } from "../Indicator"
import s from "@plexui/styles/components/SelectControl/SelectControl.module.css"

export type DropdownIconType = "chevronDown" | "dropdown" | "none"

export type SelectControlProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "onClick"> & {
  /**
   * Style variant for the Button
   * @default fill
   */
  variant?: Variants<"soft" | "outline" | "ghost">
  /**
   * Determines if the control should be a fully rounded pill shape
   * @default false
   */
  pill?: boolean
  /**
   * Extends the control to 100% of available width.
   * @default true
   */
  block?: boolean
  /**
   * Applies a negative margin using the current gutter to optically align the control
   * with surrounding content.
   */
  opticallyAlign?: "start" | "end"
  /**
   * Disables the control visually and from interactions
   * @default false
   */
  disabled?: boolean
  /**
   * Visually indicates that the control is in an invalid state
   * @default false
   */
  invalid?: boolean
  /**
   * Indicates that the control is selected. An unselected state will display placeholder styles.
   * @default false
   */
  selected?: boolean
  /**
   * Display a clear action that allows the select to be unset.
   * @default false
   */
  onClearClick?: () => void
  /**
   * Primary handler for when the control is selected with pointer or keyboard events
   */
  onInteract?: () => void
  /**
   * Enter interacts too, as on a combobox button. Off by default, as Enter
   * may be an attempt to submit a form.
   * @default false
   */
  interactOnEnter?: boolean
  /**
   * Determines size of the size and spacing of the control.
   *
   * | 3xs     | 2xs     | xs      | sm      | md      | lg      | xl      | 2xl     | 3xl     |
   * | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
   * | `22px`  | `24px`  | `26px`  | `28px`  | `32px`  | `36px`  | `40px`  | `44px`  | `48px`  |
   * @default md
   */
  size?: ControlSize
  /**
   * Displays loading indicator on top of button contents
   * @default false
   */
  loading?: boolean
  /**
   * Icon displayed in the far right of the select trigger
   * @default dropdown
   */
  dropdownIconType?: DropdownIconType
  /** Icon displayed at the start of the control */
  StartIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Custom class applied to the control element */
  className?: string
  /** Content rendered for the control */
  children: ReactNode
  ref?: React.Ref<HTMLSpanElement | null>
}

export const SelectControl = ({
  ref,
  onPointerDown,
  onPointerCancel,
  onKeyDown,
  onPointerEnter,
  onInteract,
  interactOnEnter = false,
  invalid,
  disabled,
  children,
  className,
  variant = "outline",
  size = "md",
  block,
  opticallyAlign,
  pill = false,
  loading,
  onClearClick,
  selected = false,
  StartIcon,
  dropdownIconType = "dropdown",
  ...restProps
}: SelectControlProps) => {
  const controlRef = useRef<HTMLSpanElement>(null)
  const mouseClickHandled = useRef(false)
  // Popover/Menu clone their private click handler into the trigger.
  const triggerProps: React.HTMLAttributes<HTMLSpanElement> = restProps
  const clearable = !!onClearClick
  const showClearAction = clearable && selected && !loading && !disabled
  const hasDropdownIcon = dropdownIconType && dropdownIconType !== "none" && !loading
  const hasAnyTertiaryIndicator = showClearAction || loading || hasDropdownIcon
  const isInteractive = !loading && !disabled

  // Act like a <button> and fire the click handler on keyboard actions
  const handleKeyDown = (evt: React.KeyboardEvent<HTMLSpanElement>) => {
    // Enter and Space on a nested control (the clear button) activate that
    // control: neither this handler nor a wrapping trigger's may take them
    if (evt.target !== evt.currentTarget && (evt.key === " " || evt.key === "Enter")) {
      return
    }
    onKeyDown?.(evt)
    if (evt.defaultPrevented || evt.nativeEvent.isComposing || evt.keyCode === 229) return
    switch (evt.key) {
      case "Enter":
      case "ArrowDown":
      case "ArrowUp":
      case " ":
        // NOTE: "Enter" may be an attempt to submit a form
        if (evt.key === "Enter" && !interactOnEnter) {
          break
        }

        evt.stopPropagation()
        evt.preventDefault()

        controlRef.current?.click()
        break
      default:
        break
    }
  }

  const handlePointerDown = (evt: React.PointerEvent<HTMLSpanElement>) => {
    mouseClickHandled.current = false
    if (isNestedSelectControl(evt)) return
    onPointerDown?.(evt)
    if (evt.defaultPrevented) {
      mouseClickHandled.current = true
      return
    }
    if (evt.button !== 0) return
    // A touch may become a scroll. Wait for its click, which the browser cancels
    // when scrolling; desktop mouse keeps press-drag-select.
    if (evt.pointerType === "pen" || !isHoverPointer(evt)) return
    evt.stopPropagation()
    mouseClickHandled.current = true
    if (onInteract) {
      evt.preventDefault()
      onInteract()
    } else {
      triggerProps.onClick?.(evt)
    }
  }

  const handleClick = (evt: React.MouseEvent<HTMLSpanElement>) => {
    const handled = mouseClickHandled.current
    mouseClickHandled.current = false
    if (!isInteractive || evt.defaultPrevented || evt.button !== 0 || isNestedSelectControl(evt)) return
    if (handled && evt.detail !== 0) return
    evt.stopPropagation()
    if (onInteract) onInteract()
    else triggerProps.onClick?.(evt)
  }

  return (
    // Intentionally not using <button> and rebuilding the semantics
    <span
      ref={mergeRefs([controlRef, ref])}
      className={clsx(s.SelectControl, className)}
      // Recreate <button> semantics
      role="button"
      data-slot="select-control"
      tabIndex={disabled ? -1 : 0}
      onPointerEnter={(evt: React.PointerEvent<HTMLAnchorElement>) => {
        handlePressableMouseEnter(evt)
        onPointerEnter?.(evt)
      }}
      onPointerDown={isInteractive ? handlePointerDown : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      data-variant={variant}
      data-block={block ? "" : undefined}
      data-pill={pill ? "" : undefined}
      data-size={size}
      data-optically-align={opticallyAlign}
      aria-busy={loading ? "true" : undefined}
      data-selected={selected}
      data-loading={loading ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled}
      {...restProps}
      onClick={handleClick}
      onPointerCancel={(evt) => {
        mouseClickHandled.current = false
        onPointerCancel?.(evt)
      }}
    >
      {StartIcon && <StartIcon className={s.StartIcon} />}
      <span className={s.TriggerText}>{children}</span>
      {hasAnyTertiaryIndicator && (
        <div className={s.IndicatorWrapper}>
          {showClearAction && (
            <Button
              aria-label="Clear current value"
              className={s.Clear}
              onPointerDown={(evt: React.PointerEvent<HTMLButtonElement>) => {
                // Prevent pointerDown on trigger from being captured
                evt.stopPropagation()
              }}
              onClick={(evt) => {
                evt.stopPropagation()
                evt.preventDefault()
                if (disabled || loading) return
                // The clear button disappears when the value becomes empty.
                controlRef.current?.focus({ preventScroll: true })
                onClearClick()
              }}
              color="secondary"
              variant={hasDropdownIcon ? "ghost" : "solid"}
              // Mostly custom sizing through variables
              size="3xs"
              uniform
              pill={pill}
              data-only-child={!hasDropdownIcon ? "" : undefined}
            >
              <X />
            </Button>
          )}
          {loading && <LoadingIndicator className={s.LoadingIndicator} />}
          {/* Using raw SVG canvases (opposed to fixed icon canvases) led to less pixelation. */}
          {hasDropdownIcon && <DropdownIcon iconType={dropdownIconType} />}
        </div>
      )}
    </span>
  )
}

type DropdownIconProps = {
  iconType: Exclude<DropdownIconType, "none">
}

export const DropdownIcon = ({ iconType }: DropdownIconProps) => {
  return iconType === "chevronDown" ? (
    <ChevronDown data-no-autosize="" className={clsx(s.DropdownIcon, s.DropdownIconChevron)} />
  ) : (
    <span className={s.DropdownIcon} aria-hidden="true">
      <Dropdown data-no-autosize="" className={s.DropdownGlyph} />
      <svg data-no-autosize="" className={s.MobileDropdownGlyph} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M9.41074 2.74408C9.73618 2.41864 10.2638 2.41864 10.5893 2.74408L14.7559 6.91074C15.0814 7.23618 15.0814 7.76382 14.7559 8.08926C14.4305 8.41469 13.9028 8.41469 13.5774 8.08926L10 4.51184L6.42259 8.08926C6.09715 8.41469 5.56951 8.41469 5.24408 8.08926C4.91864 7.76382 4.91864 7.23618 5.24408 6.91074L9.41074 2.74408ZM5.24408 11.9107C5.56951 11.5853 6.09715 11.5853 6.42259 11.9107L10 15.4882L13.5774 11.9107C13.9028 11.5853 14.4305 11.5853 14.7559 11.9107C15.0814 12.2362 15.0814 12.7638 14.7559 13.0893L10.5893 17.2559C10.2638 17.5814 9.73618 17.5814 9.41074 17.2559L5.24408 13.0893C4.91864 12.7638 4.91864 12.2362 5.24408 11.9107Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </span>
  )
}
