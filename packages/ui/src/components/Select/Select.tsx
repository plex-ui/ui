"use client"

import clsx from "clsx"
import { Popover } from "radix-ui"
import React, {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useFloatingBoundary } from "../../hooks/useFloatingBoundary"
import { useEscCloseStack } from "../../hooks/useEscCloseStack"
import { useLatestValue } from "../../hooks/useLatestValue"
import { useFieldColumns, useFieldRow, useFieldRowPill } from "../../lib/fieldRow"
import { keepMovedFocus, preventDefaultHandler, toCssVariables, waitForAnimationFrame } from "../../lib/helpers"
import { Check, Info, Search } from "../Icon"
import type { ControlSize } from "../../types"
import { Input } from "../Input"
import { SelectControl, type SelectControlProps } from "../SelectControl"
import { Tooltip } from "../Tooltip"
import { TransitionGroup } from "../Transition"
import { overlayTiming } from "../Transition/shared"
import { isHoverPointer } from "../../lib/inputMode"
import { createSelectPress } from "../../lib/selectPress"
import { createFocusRestore } from "../../lib/focusRestore"
import { ignoreReleaseOverTrigger, markCoveredMenuTrigger, observeMenuTriggerCover, type MenuTriggerCover } from "../../lib/menuTriggerCover"
import { usePhoneWindow } from "../PhoneLayout/PhoneLayout"
import s from "@plexui/styles/components/Select/Select.module.css"

export type Option<T extends string = string> = {
  value: T
  label: string
  /** Disable the option */
  disabled?: boolean
  /** Displayed as secondary text below the option `label` */
  description?: React.ReactNode
  tooltip?: {
    content: React.ReactNode
    maxWidth?: number
  }
}

export type OptionGroup<T extends Option> = {
  label: string
  options: T[]
  optionsLimit?: {
    label: string
    limit: number
  }
}

export type Options<T extends Option> = T[] | OptionGroup<T>[]

type CallbackWithOption<T extends Option> = (option: T) => void
type CallbackWithOptions<T extends Option> = (options: T[]) => void
type CallbackWithActionId = (actionId: string) => void
type SearchPredicate<T extends Option> = (option: T, searchTerm: string) => boolean

type Action = {
  /** Unique ID to identify the action with */
  id: string
  /** Label display for the action */
  label: string
  /** Icon displayed to the left of the action */
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Custom class applied to the action container */
  className?: string
  /** Callback invoked when the action is pressed */
  onSelect: CallbackWithActionId
}

type Actions = Action[]

export type PopoverSide = "top" | "bottom"
export type PopoverAlign = "start" | "center" | "end"

type SingleSelectProps<T extends Option> = {
  /**
   * Determines if the select should support multiple selection
   * @default false
   */
  multiple?: false
  value: string
  onChange: CallbackWithOption<T>
  /**
   * Customize the rendered output of the trigger
   * NOTE: Must be passed as a stable reference, not created inline.
   */
  TriggerView?: React.FC<T>
}

type MultiSelectTriggerViewProps<T extends Option> = {
  values: T[]
  selectedAll: boolean
}

type MultiSelectProps<T extends Option> = {
  /**
   * Determines if the select should support multiple selection
   * @default false
   */
  multiple: true
  value: string[]
  onChange: CallbackWithOptions<T>
  /**
   * Customize the rendered output of the trigger
   * NOTE: Must be passed as a stable reference, not created line.
   */
  TriggerView?: React.FC<MultiSelectTriggerViewProps<T>>
}

type SelectAccessibilityProps = Pick<SelectControlProps, "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid">

export type SelectProps<T extends Option> = (SingleSelectProps<T> | MultiSelectProps<T>) & SelectAccessibilityProps & {
  options: Options<T> // Should be passed as a stable reference
  /**
   * Disables the select visually and from interactions
   * @default false
   */
  disabled?: boolean
  /**
   * Allows the select to be targeted with htmlFor
   */
  id?: string
  /**
   * Marks the select as a required field when using native form submission
   */
  required?: boolean
  /**
   * Creates the ability to query the value with `[name="${name}"]`
   */
  name?: string
  /**
   * Placeholder text for the select
   * @default Select...
   */
  placeholder?: string
  /**
   * Placeholder text for the select while loading. Behaves exactly like `placeholder`, and `value` will be shown if provided.
   * @default Loading...
   */
  loadingPlaceholder?: string
  /**
   * Displays loading indicator on top of button contents
   * @default false
   */
  loading?: boolean
  /**
   * Style variant for the select trigger
   * @default outline
   */
  variant?: SelectControlProps["variant"]
  /**
   * Determines if the select trigger should be a fully rounded pill shape
   * @default false, or true at the end of a `Field row`
   */
  pill?: boolean
  /**
   * Text of a `multiple` trigger when every option is selected
   * @default All selected
   */
  allSelectedLabel?: string
  /**
   * Controls size of the select trigger, and several other aspects of trigger styling.
   *
   * | 3xs     | 2xs     | xs      | sm      | md      | lg      | xl      | 2xl     | 3xl     |
   * | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
   * | `22px`  | `24px`  | `26px`  | `28px`  | `32px`  | `36px`  | `40px`  | `44px`  | `48px`  |
   * @default md
   */
  size?: SelectControlProps["size"]
  /**
   * Icon displayed in the far right of the select trigger
   * @default dropdown
   */
  dropdownIconType?: SelectControlProps["dropdownIconType"]
  /**
   * Actions to display below the options list.
   */
  actions?: Actions // Memoized by length, don't assume dynamic changes are supported
  /** Custom class applied to option containers */
  optionClassName?: string
  /**
   * Customize the rendered output of individual options
   * NOTE: Must be passed as a stable reference, not created line.
   */
  OptionView?: React.FC<T>
  /** Icon displayed at the start of the select trigger */
  TriggerStartIcon?: SelectControlProps["StartIcon"]
  /**
   * Custom class applied to the select trigger
   */
  triggerClassName?: string // If consumers need deep customization of the trigger
  /**
   * Applies a negative margin using the current gutter to optically align the trigger
   * with surrounding content.
   */
  opticallyAlign?: "start" | "end"
  /**
   * Display a clear action that allows the select to be unset.
   * @default false
   */
  clearable?: boolean
  /**
   * Extends select to 100% of available width.
   * @default true
   */
  block?: boolean
  /**
   * The preferred side of the trigger to render against when open. Will be reversed when collisions occur.
   * Without one the list opens below its trigger, and on a phone over it, toward the larger part of the screen.
   * @default bottom
   */
  side?: PopoverSide
  /**
   * The preferred alignment against the trigger. May change when collisions occur.
   * @default "end" at the end of a `Field row` ("start" in a `FieldGroup columns`), "center" when block, otherwise "start"
   */
  align?: PopoverAlign
  /**
   * An offset in pixels from the "start" or "end" alignment options.
   * @default 0
   */
  alignOffset?: number
  /**
   * Prevents collision detection in the custom menu. Use with caution.
   * @default true
   */
  avoidCollisions?: boolean
  /**
   * Set the width of the custom select menu
   * @default the width of the trigger (fits the options when not block or at the end of a `Field row`)
   */
  listWidth?: number | "auto"
  /**
   * Defines the `min-width` property of the custom select menu, in pixels.
   * @default the width of the trigger
   */
  listMinWidth?: number | "auto"
  /**
   * Defines the `max-width` property of the custom select menu, in pixels.
   * @default auto (300 when it fits the options)
   */
  listMaxWidth?: number | "auto"
  /** Predicate used to filter searches */
  searchPredicate?: SearchPredicate<T>
  /** Placeholder of the search input */
  searchPlaceholder?: string
  /** Accessible name of the search input, independent of the trigger label. */
  searchAriaLabel?: string
  /**
   * Size of the search input in the menu. A phone list has no search: it is
   * an iOS menu, and a long one scrolls.
   * @default md
   */
  searchSize?: ControlSize
  /**
   * Message displayed when search results are empty. Can be a simple string, or custom JSX.
   */
  searchEmptyMessage?: ReactNode
  /**
   * Render a custom trigger element instead of the default `SelectControl`.
   * Receives open state and a toggle callback. The returned element is wrapped
   * in a Radix `Popover.Trigger`.
   *
   * NOTE: Must be passed as a stable reference, not created inline.
   */
  /**
   * Position of the check indicator in the option list. `none` removes the
   * indicator column altogether — for a list that never carries a selection
   * (one-shot actions) or whose option view states the selection itself, an
   * empty 16px column is dead space in every row.
   * @default start
   */
  checkPosition?: 'start' | 'end' | 'none'
  trigger?: (props: { open: boolean; onToggle: () => void }) => ReactNode
}

type SingleSelectContextValue<T extends Option> = {
  multiple: false
  value: string
  TriggerView: React.FC<T>
}

type MultiSelectContextValue<T extends Option> = {
  multiple: true
  value: string[]
  TriggerView: React.FC<MultiSelectTriggerViewProps<T>>
}

type SelectContextValue<T extends Option> = (
  | SingleSelectContextValue<T>
  | MultiSelectContextValue<T>
) & SelectAccessibilityProps & {
  triggerId: string
  // Props
  name?: string
  id?: string
  required?: boolean
  options: Options<T>
  disabled: boolean
  variant: SelectControlProps["variant"]
  pill: boolean
  size: SelectControlProps["size"]
  dropdownIconType: SelectControlProps["dropdownIconType"]
  loading: boolean
  clearable: boolean
  placeholder: string
  loadingPlaceholder: string
  allSelectedLabel: string
  searchEmptyMessage: ReactNode
  searchPlaceholder: string
  searchAriaLabel: string
  searchSize?: ControlSize
  TriggerStartIcon?: SelectControlProps["StartIcon"]
  triggerClassName?: string
  opticallyAlign?: "start" | "end"
  optionClassName?: string
  OptionView: React.FC<T>
  actions: Actions
  onActionSelect: CallbackWithActionId
  block: boolean
  /** The side asked for; without one a list opens below, or on a phone toward the larger part of the screen. */
  side: PopoverSide | undefined
  align: PopoverAlign
  alignOffset: number
  avoidCollisions: boolean
  listWidth?: number | "auto" // Default when not passed is to match the width of the trigger
  listMinWidth?: number | "auto" // Default when not passed is the width of the trigger
  listMaxWidth?: number | "auto"
  // References
  onSelectRef: React.MutableRefObject<(option: T, removeOption?: boolean) => void>
  searchPredicateRef: React.MutableRefObject<SearchPredicate<T>>
  // Derived
  searchable: boolean
  checkPosition: 'start' | 'end' | 'none'
  // Custom trigger
  trigger?: (props: { open: boolean; onToggle: () => void }) => ReactNode
}

const SelectContext = createContext<SelectContextValue<Option> | null>(null)

const useSelectContext = () => {
  const context = use(SelectContext)

  if (!context) {
    throw new Error("Select components must be wrapped in <Select />")
  }

  return context
}

const DefaultOptionView = ({ label }: { label: string }) => <>{label}</>
const DefaultSingleTriggerView = ({ label }: { label: string }) => <>{label}</>
const DefaultMultiTriggerView = <T extends Option>({
  values,
  selectedAll,
}: MultiSelectTriggerViewProps<T>) => {
  const { allSelectedLabel } = useSelectContext()
  const displayValue = selectedAll
    ? allSelectedLabel
    : values.length === 0
      ? // NOTE: Zero length is impossible - an empty option with `placeholder` is always returned
        "Select..."
      : values.length === 1
        ? values[0].label
        : `${values.length} selected`

  return <>{displayValue}</>
}

export const Select = <T extends Option>(props: SelectProps<T>) => {
  const {
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    required,
    value,
    name,
    multiple,
    variant = "outline",
    size = "md",
    dropdownIconType = "dropdown",
    loading = false,
    clearable = false,
    disabled = false,
    placeholder = "Select...",
    loadingPlaceholder = "Loading...",
    allSelectedLabel = "All selected",
    pill: pillProp,
    listMinWidth,
    options,
    actions: propActions = [],
    side,
    avoidCollisions = true,
    onChange,
    optionClassName,
    OptionView = DefaultOptionView,
    TriggerStartIcon,
    triggerClassName,
    opticallyAlign,
    TriggerView: TriggerViewFromProps,
    searchPlaceholder = "",
    searchAriaLabel = "Search options",
    searchSize,
    searchPredicate = defaultSearchPredicate,
    searchEmptyMessage = "No results found.",
    trigger,
    checkPosition = 'start',
  } = props
  const pill = useFieldRowPill(pillProp)
  // At the end of a Field row the menu opens from the row's end and fits its options: on a phone
  // the trigger there is only as wide as its value, so a menu of the trigger's width breaks every word.
  // In a `FieldGroup columns` the value starts at the column, and so does its menu.
  const inRow = useFieldRow()
  const inColumns = useFieldColumns()
  // Block default is dynamic, based on `variant`
  const block = props.block ?? variant !== "ghost"
  // Align default is dynamic, based on the row and `block`
  const align = props.align ?? (inRow ? (inColumns ? "start" : "end") : block ? "center" : "start")
  // Flush with the trigger's edge, as the prop documents. The old -5 nudge for
  // "start"/"end" tried to line the option labels up with the trigger's text and
  // instead left the menu hanging past the field it belongs to.
  const alignOffset = props.alignOffset ?? 0

  // Create stable, mutable references to avoid memoization requirements from consumers
  const onSelectRef = useLatestValue((selectedOption: T, removeOption?: boolean) => {
    if (disabled || loading || getOptionByValue(options, selectedOption.value)?.disabled) return
    if (multiple) {
      // When clearing values, the value is an
      if (!selectedOption.value) {
        onChange([])
        return
      }

      if (removeOption) {
        const nextValues = value.filter((v) => v !== selectedOption.value)
        const currentSelectedOptions = getOptionsByValues(options, nextValues)
        onChange(currentSelectedOptions)
      } else {
        const currentSelectedOptions = getOptionsByValues(options, value)
        onChange(currentSelectedOptions.concat(selectedOption))
      }
    } else {
      onChange(selectedOption)
    }
  })

  const searchPredicateRef = useRef<SearchPredicate<T>>(searchPredicate)
  searchPredicateRef.current = searchPredicate

  // It should be exceedingly uncommon to change actions dynamically, and they are unlikely to be a stable array reference from consumers
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally limiting when this stable value changes to length of actions
  const actions = useMemo<Actions>(() => propActions, [propActions.length])
  // We need to ensure that when action callbacks are called, we have fresh function references, even if the other action details did not change.
  const propActionsRef = useRef<Actions>(propActions)
  propActionsRef.current = propActions
  const onActionSelect = useCallback<CallbackWithActionId>((actionId: string) => {
    if (disabled || loading) return
    propActionsRef.current.find((a) => a.id === actionId)?.onSelect(actionId)
  }, [disabled, loading])

  // Determine when custom selects should be used
  const optionsCount = useMemo(
    () =>
      isOptionGroupArray(options)
        ? options.reduce((acc: number, group) => {
            return acc + group.options.length
          }, 0)
        : options.length,
    [options],
  )

  // Using ID for DOM selection instead of passing around and merging a ref. Pick your poison.
  const internalTriggerId = useId()
  const triggerId = `select-trigger-${internalTriggerId}`

  // Locking down searchable count to a single value. Could make this customizable in the future, but would want guardrails.
  // A phone's list is an iOS menu, and a menu has no search: a long list scrolls (iOS-menu IMG_5490, Add Payment's
  // Province, 52 options; the owner 10.11 on a search row in the list), so it opens with no keyboard either. The window
  // decides, as for the list's place: the list is portaled out of any PhoneLayout.
  const phone = usePhoneWindow()
  const searchable = optionsCount > 15 && !phone

  // A block menu matches its field. An inline one, or one at the end of a Field row, fits its
  // options: no narrower than its trigger (the CSS fallback reads the trigger width), no wider than 300px.
  const fitsOptions = (!block || inRow) && props.listWidth === undefined
  const listWidth = props.listWidth ?? (fitsOptions ? "auto" : undefined)
  const listMaxWidth = props.listMaxWidth ?? (fitsOptions ? 300 : "auto")

  // Narrow known values for context
  const dynamicContextProps = useMemo<
    SingleSelectContextValue<T> | MultiSelectContextValue<T>
  >(() => {
    if (multiple) {
      return {
        multiple: true,
        value: value as string[],
        TriggerView: TriggerViewFromProps ?? DefaultMultiTriggerView,
      }
    }

    return {
      multiple: false,
      value: value as string,
      TriggerView: TriggerViewFromProps ?? DefaultSingleTriggerView,
    }
  }, [multiple, value, TriggerViewFromProps])

  const store = useMemo<SelectContextValue<T>>(
    () => ({
      ...dynamicContextProps,
      triggerId,
      id,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      // Forward props
      name,
      required,
      options,
      placeholder,
      loadingPlaceholder,
      allSelectedLabel,
      loading,
      clearable,
      variant,
      pill,
      size,
      dropdownIconType,
      block,
      align,
      alignOffset,
      side,
      avoidCollisions,
      listWidth,
      listMinWidth,
      listMaxWidth,
      searchPlaceholder,
      searchAriaLabel,
      searchSize,
      searchEmptyMessage,
      TriggerStartIcon,
      triggerClassName,
      opticallyAlign,
      optionClassName,
      OptionView,
      actions,
      onActionSelect,
      onSelectRef,
      searchPredicateRef,
      // Derived state
      searchable,
      disabled,
      trigger,
      checkPosition,
    }),
    [
      dynamicContextProps,
      triggerId,
      id,
      ariaLabel,
      ariaLabelledBy,
      ariaDescribedBy,
      ariaInvalid,
      required,
      name,
      options,
      placeholder,
      loadingPlaceholder,
      allSelectedLabel,
      loading,
      clearable,
      variant,
      pill,
      size,
      dropdownIconType,
      block,
      align,
      alignOffset,
      side,
      avoidCollisions,
      listWidth,
      listMinWidth,
      listMaxWidth,
      searchPlaceholder,
      searchAriaLabel,
      searchSize,
      searchEmptyMessage,
      TriggerStartIcon,
      triggerClassName,
      opticallyAlign,
      optionClassName,
      OptionView,
      actions,
      onActionSelect,
      onSelectRef,
      searchable,
      disabled,
      trigger,
      checkPosition,
    ],
  )

  return (
    // NOTE: Cannot peacefully coerce SelectContextValue into a generic, so casting to any here.
    // This is safe because `store` is strongly typed above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <SelectContext.Provider value={store as any}>
      <CustomSelect />
    </SelectContext.Provider>
  )
}

// ============================================================
// Trigger
// ============================================================
type SelectTriggerProps = {
  onOpenChange?: (maybeNextState?: boolean) => void
  tabIndex?: number
  ["aria-hidden"]?: "false" | "true"
  ref?: React.Ref<HTMLButtonElement | null>
}

export const SelectTrigger = (props: SelectTriggerProps) => {
  const {
    triggerId,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    id,
    required,
    value,
    multiple,
    options,
    loading,
    disabled,
    clearable,
    name,
    variant,
    pill,
    size,
    dropdownIconType,
    placeholder,
    loadingPlaceholder,
    block,
    opticallyAlign,
    triggerClassName,
    TriggerStartIcon,
    TriggerView,
    onSelectRef,
  } = useSelectContext()
  const {
    onOpenChange,
    // pass along props from Radix
    ...restProps
  } = props
  const firstValue = multiple ? value[0] : value
  const placeholderValue = loading ? loadingPlaceholder : placeholder

  const selectedItem = useMemo<Option>(
    () =>
      getOptionByValue(options, firstValue) || {
        value: "",
        label: placeholderValue,
      },
    [firstValue, options, placeholderValue],
  )
  const hasSelectedValue = multiple ? value.length > 0 : !!value
  const isPlaceholder = loading || !hasSelectedValue

  const typeahead = useMemo(() => createTypeahead(), [])

  const multipleTriggerViewProps = useMemo<MultiSelectTriggerViewProps<Option>>(() => {
    if (!multiple) {
      return { values: [], selectedAll: false }
    }

    const currentSelectedOptions = getOptionsByValues(options, value)
    const flatOptions = options.flatMap((o) => ("options" in o ? o.options : o))

    return {
      values: currentSelectedOptions.length
        ? currentSelectedOptions
        : [
            {
              value: "",
              label: placeholderValue,
            },
          ],
      selectedAll: flatOptions.length <= value.length,
    }
  }, [multiple, options, value, placeholderValue])

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLButtonElement>) => {
    if (evt.defaultPrevented || evt.nativeEvent.isComposing || evt.keyCode === 229) return
    const key = evt.key

    // If not a command, check for typeahead
    // NOTE: Typeahead not supported in multi-select
    if (!multiple && isTypeaheadKey(evt)) {
      const currentTypeaheadValue = typeahead(key)
      // Stop other listeners from reacting
      evt.stopPropagation()

      // Attempt to filter options based on the value
      // NOTE: We don't look at current highlighted value as a means to start the search
      const firstMatchingOption = getTypeaheadOption(options, currentTypeaheadValue, firstValue)

      if (firstMatchingOption) {
        onSelectRef.current(firstMatchingOption)
      }
    }
  }

  const handleClearClick = () => {
    onSelectRef.current({ value: "", label: "" })
    // Ensure open state is closed
    onOpenChange?.(false)
  }

  return (
    <SelectControl
      id={triggerId}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ? `${ariaLabelledBy} ${triggerId}-value` : undefined}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      className={triggerClassName}
      selected={!isPlaceholder}
      variant={variant}
      pill={pill}
      block={block}
      size={size}
      disabled={disabled}
      loading={loading}
      StartIcon={TriggerStartIcon}
      opticallyAlign={opticallyAlign}
      dropdownIconType={dropdownIconType}
      onClearClick={clearable ? handleClearClick : undefined}
      onInteract={onOpenChange}
      interactOnEnter
      onKeyDown={handleKeyDown}
      {...restProps}
    >
      {ariaLabelledBy ? (
        <span id={`${triggerId}-value`}>
          {multiple ? <TriggerView {...multipleTriggerViewProps} /> : <TriggerView {...selectedItem} />}
        </span>
      ) : multiple ? <TriggerView {...multipleTriggerViewProps} /> : <TriggerView {...selectedItem} />}
      {(name || id) &&
        // One input per selected value, so a form submits every value of a
        // multi-select; an empty one keeps `id` and `required` working
        (multiple && value.length ? value : [firstValue ?? ""]).map((formValue, index) => (
          <input
            key={index}
            id={index === 0 ? id : undefined}
            name={name}
            value={formValue}
            // A disabled select is neither validated nor submitted
            disabled={disabled}
            tabIndex={-1}
            onFocus={() => {
              document.getElementById(triggerId)?.focus()
            }}
            // A label's `for` lands here, and its click opens the list like a press on the trigger
            onClick={() => {
              if (!loading) {
                onOpenChange?.(true)
              }
            }}
            // keep react from complaining - don't make this readOnly because that
            // prevents the value from being required
            onChange={() => {}}
            required={required}
            className={s.FormInput}
            aria-hidden="true"
          />
        ))}
    </SelectControl>
  )
}

// ============================================================
// Custom Select
// ============================================================
const CustomSelect = () => {
  const {
    loading,
    disabled,
    side,
    align,
    alignOffset,
    avoidCollisions,
    listWidth,
    listMinWidth,
    listMaxWidth,
    trigger,
    pill,
  } = useSelectContext()
  const [open, setOpen] = useState<boolean>(false)
  const floatingBoundary = useFloatingBoundary(open && avoidCollisions, { bottom: 30, top: 30 })
  const selectContentRef = useRef<HTMLDivElement>(null)
  // The trigger element, the default one or a custom `trigger` (which has no `triggerId`)
  const popoverTriggerRef = useRef<HTMLButtonElement>(null)
  // Both as state too, for the effects below: the list mounts after the trigger's cover is known
  const [triggerElement, setTriggerElement] = useState<HTMLButtonElement | null>(null)
  const setTrigger = useCallback((node: HTMLButtonElement | null) => {
    popoverTriggerRef.current = node
    setTriggerElement(node)
  }, [])
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null)
  const setContent = useCallback((node: HTMLDivElement | null) => {
    selectContentRef.current = node
    setContentElement(node)
  }, [])
  // On a phone the list opens over its trigger, as the pop-up menu of an iOS picker does (ref-app pickers, block 8:
  // the 250pt menu stands over the row's value, its end at the chevron's end, the value hidden under it), and toward
  // the larger part of the screen, as Menu does (menuTriggerCover.ts)
  // Only in a phone-wide window, where the list is laid out as on a phone (Select.module.css)
  const [cover, setCover] = useState<MenuTriggerCover | null>(null)
  useLayoutEffect(() => {
    if (!open || !triggerElement) return
    return observeMenuTriggerCover(triggerElement, setCover, { windowOnly: true })
  }, [open, triggerElement])
  // The covered trigger is hidden while the list is open, and shown again as it closes, before focus returns to it
  useLayoutEffect(() => {
    if (!open || !cover || !triggerElement || !contentElement) return
    return markCoveredMenuTrigger(triggerElement, contentElement)
  }, [open, cover, triggerElement, contentElement])
  // A mouse opens the list as its button goes down, so on a phone the list is under it when the button comes up: that
  // release chooses nothing while it is over the trigger, as in Menu
  useEffect(() => {
    if (!triggerElement) return
    const press = (event: PointerEvent) => {
      if (event.button === 0 && isHoverPointer(event)) ignoreReleaseOverTrigger(triggerElement, event.pointerId)
    }
    triggerElement.addEventListener("pointerdown", press)
    return () => triggerElement.removeEventListener("pointerdown", press)
  }, [triggerElement])
  const focusRestoreRef = useRef<ReturnType<typeof createFocusRestore> | null>(null)
  const focusRestoreTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const focusRestore = createFocusRestore(popoverTriggerRef.current?.ownerDocument ?? document)
    focusRestoreRef.current = focusRestore
    return () => {
      clearTimeout(focusRestoreTimer.current)
      focusRestore.dispose()
      focusRestoreRef.current = null
    }
  }, [])

  const handleOpenChange = useCallback((maybeNextState?: boolean) => {
    clearTimeout(focusRestoreTimer.current)
    // Toggle the current state when called without a specific state
    const nextState = maybeNextState === undefined ? !open : maybeNextState
    if (nextState && (disabled || loading)) return
    setOpen(nextState)

    // When we're closing, manage focus back to trigger manually
    if (!nextState) {
      // Read this now: with animations disabled the menu unmounts before the
      // timeout below runs, so selectContentRef is already null by then
      const focusWasInMenu = !!selectContentRef.current?.contains(document.activeElement)

      // Wait until the next tick to determine if another element has become focused
      focusRestoreTimer.current = setTimeout(() => {
        const activeElement = document.activeElement
        const menu = selectContentRef.current
        const focusInMenu = !!menu && !!activeElement && menu.contains(activeElement)
        // Focus dropped with the closing menu lands on <body>: it was lost, not moved
        const focusLost = !activeElement || activeElement === document.body

        // Focus that moved to another element outside the menu stays there
        if (focusInMenu || (focusWasInMenu && focusLost)) {
          const trigger = popoverTriggerRef.current
          if (trigger) focusRestoreRef.current?.restore(trigger)
        }
      })
    }
  }, [disabled, loading, open])

  // Forget the open request when availability changes, so re-enabling does not
  // reopen an old menu. Radix's exit autofocus below handles this close.
  if (open && (disabled || loading)) setOpen(false)

  useEscCloseStack(open, () => {
    handleOpenChange(false)
  })

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextState) => {
        // Prevent opening while loading
        if (loading && nextState) {
          return
        }

        handleOpenChange(nextState)
      }}
      modal={false}
    >
      <Popover.Trigger asChild ref={setTrigger}>
        {trigger ? trigger({ open, onToggle: () => { if (!disabled && !loading) setOpen((current) => !current) } }) : <SelectTrigger onOpenChange={handleOpenChange} />}
      </Popover.Trigger>
      <Popover.Portal forceMount>
        <TransitionGroup className={s.Menu} {...overlayTiming} overlay>
          {open && (
            <Popover.Content
              key="dropdown"
              ref={setContent}
              forceMount
              className={s.MenuList}
              data-pill={pill ? "" : undefined}
              // A list that fits its options is the 250pt of an iOS menu on a phone (Select.module.css)
              data-list-width={listWidth === "auto" ? "auto" : undefined}
              // A list given its own width keeps it on a phone too, below the 250pt
              data-list-sized={typeof listWidth === "number" ? "" : undefined}
              side={side ?? cover?.side ?? "bottom"}
              sideOffset={cover ? cover.sideOffset : 5}
              align={align}
              alignOffset={alignOffset}
              avoidCollisions={avoidCollisions}
              {...floatingBoundary}
              // Prevent Radix auto focus so we can handle our own from within <CustomSelectMenu />
              onOpenAutoFocus={preventDefaultHandler}
              // Radix waits until the animation completes before directing focus, which is janky.
              onCloseAutoFocus={(event) => {
                if (disabled || loading) {
                  keepMovedFocus(event)
                  const trigger = popoverTriggerRef.current
                  if (!event.defaultPrevented && trigger) focusRestoreRef.current?.restore(trigger)
                }
                event.preventDefault()
              }}
              onEscapeKeyDown={preventDefaultHandler}
              style={toCssVariables({
                "select-list-width": listWidth,
                "select-list-min-width": listMinWidth,
                // "auto" is no maximum: the variable is left out, so a phone's 250pt floor can read the cap
                "select-list-max-width": listMaxWidth === "auto" ? undefined : listMaxWidth,
              })}
            >
              <CustomSelectMenu onOpenChange={handleOpenChange} />
            </Popover.Content>
          )}
        </TransitionGroup>
      </Popover.Portal>
    </Popover.Root>
  )
}

type CustomSelectMenuContextValue = {
  openingValue: string
  listId: string
  requestCloseRef: React.RefObject<() => void | null>
  listRef: React.RefObject<HTMLDivElement | null>
  // Highlighting
  highlightedValue: string
  setHighlightedValue: React.Dispatch<React.SetStateAction<string>>
  // Search
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

const CustomSelectMenuContext = createContext<CustomSelectMenuContextValue | null>(null)

const useCustomSelectMenuContext = () => {
  const context = use(CustomSelectMenuContext)

  if (!context) {
    throw new Error("CustomSelectMenu components must be wrapped in <CustomSelectMenu />")
  }

  return context
}

type CustomSelectMenuProps = {
  onOpenChange: (maybeNextState?: boolean) => void
}

const CustomSelectMenu = ({ onOpenChange }: CustomSelectMenuProps) => {
  const { multiple, value, options, searchable, searchPredicateRef, listWidth } = useSelectContext()
  const requestCloseRef = useRef<() => void>(() => onOpenChange(false))
  const menuRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [highlightedValue, setHighlightedValue] = useState<string>(() => {
    const selectedValue = multiple ? value[0] : value
    return (selectedValue || getFirstValidOption(options)?.value) ?? ""
  })
  const typeahead = useMemo(() => createTypeahead(), [])
  const internalListId = useId()
  const listId = `select-list-${internalListId}`

  // Lock `value` for a given open to prevent janky change during close animation
  // MultiSelect reads its live selection instead of this per-open snapshot.
  const [openingValue] = useState<string>(() => multiple ? "" : value)

  // Trim and lowercase search value
  // A term counts only while the list has its search: one typed on a desktop is dropped when the window narrows to a
  // phone, whose list has none
  const literalSearchTerm = useMemo(() => (searchable ? searchTerm.trim().toLocaleLowerCase() : ""), [searchable, searchTerm])
  const filteredOptions = useMemo(
    () => filterOptions(options, literalSearchTerm, searchPredicateRef.current),
    [options, literalSearchTerm, searchPredicateRef],
  )
  const firstOption = useMemo(() => getFirstValidOption(filteredOptions), [filteredOptions])
  const shownValuesRef = useRef(optionValues(filteredOptions))

  // Regrettable requirement for running an effect *after* mount
  const isMountStableRef = useRef<boolean>(false)

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.defaultPrevented || evt.nativeEvent.isComposing || evt.keyCode === 229) return
    const key = evt.key
    const firstValue = multiple ? value[0] : value
    const targetValue = highlightedValue || firstOption?.value || firstValue
    const isFocusedInSearch = document.activeElement === searchInputRef.current

    const menuElement = menuRef.current

    // Should be generally impossible for menuRef.current to not exist
    // unless we've unmounted and manage to fire this handler.
    if (!menuElement) {
      return
    }

    const triggerHighlightedOption = () => {
      const selectedOption = findOptionByValue(highlightedValue, menuElement)
      selectedOption?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }))
    }

    const highlightOption = (val: string, element: Element) => {
      setHighlightedValue(val)
      element.scrollIntoView({ block: "nearest" })
    }

    const highlightSelectedOrFirstOption = () => {
      // Attempt to move highlight to selected item
      const maybeFirstValue = multiple ? value[0] : value

      if (maybeFirstValue) {
        const selectedElement = findOptionByValue(maybeFirstValue, menuElement)

        if (selectedElement) {
          highlightOption(maybeFirstValue, selectedElement)
          return
        }
      }

      // If value isn't set, or the selected node wasn't found in the DOM,
      // attempt to move focus to the first valid option.
      const firstValidOption = getFirstValidOption(options)

      if (firstValidOption) {
        const firstValidOptionElement = findOptionByValue(firstValidOption.value, menuElement)
        if (firstValidOptionElement) {
          highlightOption(firstValidOption.value, firstValidOptionElement)
        }
      }
    }

    // Commands
    switch (key) {
      case "ArrowDown": {
        evt.preventDefault()

        // If there's no highlighted value, or the highlighted value is not in the DOM
        if (!highlightedValue || !findOptionByValue(highlightedValue, menuElement)) {
          // Attempt to move highlight to selected item
          highlightSelectedOrFirstOption()

          // Short-circuit because we have no highlighted value to advance from
          return
        }

        // Otherwise, move to the next option
        const nextElement = findNextOption(highlightedValue, menuElement)
        const nextValue = nextElement?.getAttribute("data-option-id")
        if (nextElement && nextValue) {
          highlightOption(nextValue, nextElement)
        }

        return
      }
      case "ArrowUp": {
        evt.preventDefault()

        // If there's no highlighted value, or the highlighted value is not in the DOM
        if (!highlightedValue || !findOptionByValue(highlightedValue, menuElement)) {
          // Attempt to move highlight to selected item
          highlightSelectedOrFirstOption()

          // Short-circuit because we have no highlighted value to advance from
          return
        }

        const previousElement = findPreviousOption(targetValue, menuElement)
        const previousValue = previousElement?.getAttribute("data-option-id")
        if (previousElement && previousValue) {
          highlightOption(previousValue, previousElement)
        }

        return
      }
      case "Enter":
        // Prevent default enter behavior from the search input, if present
        evt.preventDefault()

        // Activate the highlighted option through its click handler
        triggerHighlightedOption()

        return
      case " ":
        // Allow spaces in search, and don't treat as enter
        // if there is a valid literalSearchTerm.
        if (literalSearchTerm && isFocusedInSearch) {
          return
        }

        // Prevent space from entering search input
        evt.preventDefault()

        // Activate the highlighted option through its click handler
        triggerHighlightedOption()

        return
      default:
        break
    }

    // If not a command, check for typeahead
    if (isTypeaheadKey(evt)) {
      // Skip typeahead logic when we're focused in the search input
      if (isFocusedInSearch) {
        return
      }

      // Extend the current typeahead and get the latest value
      const currentTypeaheadValue = typeahead(key)

      // Stop other listeners from reacting
      evt.stopPropagation()

      // Attempt to filter options based on the value, starting at the highlighted value
      const firstMatchingOption = getTypeaheadOption(
        options,
        currentTypeaheadValue,
        highlightedValue,
      )

      if (firstMatchingOption) {
        const matchedNode = findOptionByValue(firstMatchingOption.value, menuElement)

        // Only change the highlight if we found the actual node
        if (matchedNode) {
          setHighlightedValue(firstMatchingOption.value)
          // Ensure the newly highlighted option is scrolled into view
          matchedNode.scrollIntoView({ block: "nearest" })
        }
      }
    }
  }

  const store = useMemo(
    () => ({
      openingValue,
      listId,
      highlightedValue,
      setHighlightedValue,
      requestCloseRef,
      searchTerm,
      setSearchTerm,
      searchInputRef,
      listRef,
    }),
    [openingValue, listId, highlightedValue, setHighlightedValue, searchTerm, setSearchTerm],
  )

  // On mount behavior
  useEffect(() => {
    // Ensure initial highlighted option is in view
    // NOTE: Allowing for a render frame ensures content is positioned correctly before scrolling it into view.
    waitForAnimationFrame(() => {
      if (!menuRef.current) {
        return
      }

      // Ensure the highlighted option is in view
      const currentOption = findOptionByValue(highlightedValue, menuRef.current)
      // Scroll the selected item into view, and its bottom edge.
      currentOption?.scrollIntoView({ block: "center" })
    })

    // Send initial focus to the search input, or the list without one (the
    // menu container when there are no options), to capture key events
    const autoFocusTarget = searchInputRef.current || listRef.current || menuRef.current
    autoFocusTarget?.focus({ preventScroll: true })

    // Required for <StrictMode>, because we need to unset this token
    // when the hooks are re-run. It's an imperative effect that we need to manage.
    return () => {
      isMountStableRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally an onMount effect
  }, [])

  // The window crossed the phone's width while the list was open: the search came or went (a phone's list has none),
  // so its term is cleared and focus moves to what holds the keys now, the search or the list
  const wasSearchableRef = useRef(searchable)
  useLayoutEffect(() => {
    if (wasSearchableRef.current === searchable) return
    wasSearchableRef.current = searchable
    if (!searchable) setSearchTerm("")
    // The width a desktop list locked for its search would overflow a phone's 250px panel; a desktop locks it again
    if (menuRef.current) {
      menuRef.current.style.minWidth = ""
      if (searchable && listWidth === "auto") menuRef.current.style.minWidth = `${menuRef.current.offsetWidth}px`
    }
    if (menuRef.current?.contains(document.activeElement) && document.activeElement !== listRef.current) return
    ;(searchable ? searchInputRef.current : listRef.current)?.focus({ preventScroll: true })
  }, [searchable])

  // A long list has a search field: the menu keeps the width of all its options as the results narrow.
  useLayoutEffect(() => {
    if (searchable && listWidth === "auto" && menuRef.current) {
      menuRef.current.style.minWidth = `${menuRef.current.offsetWidth}px`
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally an onMount effect
  }, [])

  // On search behavior
  useLayoutEffect(() => {
    // This effect will run on mount, but we want to skip it.
    // The on mount effect is responsible for handling mount behavior,
    // but this effect is specifically responsible for handling search changes
    if (!isMountStableRef.current) {
      isMountStableRef.current = true
      return
    }

    // Impossible while mounted, list ref will exist
    if (!listRef.current) {
      return
    }

    // The same list again, as after a pick in a multiple list: nothing moves
    const nextValues = optionValues(filteredOptions)
    if (nextValues === shownValuesRef.current) {
      return
    }
    shownValuesRef.current = nextValues

    // Reset scroll position to the top
    listRef.current.scrollTop = 0

    // Highlight first item in the list
    const maybeFirstOption = getFirstValidOption(filteredOptions)
    if (maybeFirstOption) setHighlightedValue(maybeFirstOption.value)
  }, [filteredOptions])

  // The focused element (the search input, or the list without one) points
  // assistive tech at the highlighted option, when that option is rendered
  useLayoutEffect(() => {
    const target = searchInputRef.current || listRef.current
    if (!target || !menuRef.current) {
      return
    }

    // A list that gave the keys to a search that came with a wider window points at nothing itself
    if (target !== listRef.current) listRef.current?.removeAttribute("aria-activedescendant")
    const highlightedOption = highlightedValue ? findOptionByValue(highlightedValue, menuRef.current) : null
    if (highlightedOption?.id) {
      target.setAttribute("aria-activedescendant", highlightedOption.id)
    } else {
      target.removeAttribute("aria-activedescendant")
    }
    // The search coming or going moves the keys, so the pointer follows them
  }, [highlightedValue, filteredOptions, searchable])

  return (
    <CustomSelectMenuContext value={store}>
      <div
        className={s.MenuInner}
        onKeyDown={handleKeyDown}
        ref={menuRef}
        // Without search, the list takes focus (and the tab stop); the container
        // stays focusable so a click on it keeps the keys here
        tabIndex={!searchable && filteredOptions.length ? -1 : 0}
      >
        {searchable && (
          <CustomSelectSearch value={searchTerm} onChange={setSearchTerm} hasResults={!!filteredOptions.length} />
        )}
        <CustomSelectList filteredOptions={filteredOptions} />
        <CustomSelectActions />
      </div>
    </CustomSelectMenuContext>
  )
}

type CustomSelectSearchProps = {
  value: string
  onChange: (nextSearchTerm: string) => void
  /** Whether the list is rendered, for `aria-controls` */
  hasResults: boolean
}

const CustomSelectSearch = ({ value, onChange, hasResults }: CustomSelectSearchProps) => {
  const { searchPlaceholder, searchAriaLabel, searchSize } = useSelectContext()
  const { listId, searchInputRef } = useCustomSelectMenuContext()

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    onChange(evt.target.value)
  }

  return (
    <div className={s.Search}>
      <Input
        startAdornment={
          <Search
            width={16}
            height={16}
            className="fill-secondary"
            fill="var(--color-text-secondary)"
          />
        }
        ref={searchInputRef}
        size={searchSize}
        variant="ghost"
        pill
        value={value}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-autocomplete="list"
        role="combobox"
        // The list, while there is one: with no results it is not rendered
        aria-controls={hasResults ? listId : undefined}
        aria-expanded
      />
    </div>
  )
}

const isOptionGroup = <T extends Option>(
  mixedOption: T | OptionGroup<T>,
): mixedOption is OptionGroup<T> => {
  return "options" in mixedOption
}

const isOptionGroupArray = <T extends Option>(arr: Options<T>): arr is OptionGroup<T>[] => {
  return arr[0] && isOptionGroup(arr[0])
}

const optionValues = <T extends Option>(options: Options<T>) =>
  (isOptionGroupArray(options) ? options.flatMap((group) => group.options) : options)
    .map((option) => option.value)
    .join("\n")

const HARD_OPTIONS_LIMIT = 300

const CustomSelectList = <T extends Option>({
  filteredOptions,
}: {
  filteredOptions: Options<T>
}) => {
  const {
    searchEmptyMessage,
    multiple,
    searchable,
    triggerId,
    trigger,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
  } = useSelectContext()
  const { listId, listRef } = useCustomSelectMenuContext()

  if (!filteredOptions.length) {
    return typeof searchEmptyMessage === "string" ? (
      <p className={s.SearchEmpty} data-text-only>
        {searchEmptyMessage}
      </p>
    ) : (
      <div className={s.SearchEmpty}>{searchEmptyMessage}</div>
    )
  }

  // We hard limit within groups, so at this level we will only limit flat arrays. The limit asks to search for the
  // rest, so a list with no search (a phone's) shows every option, as a long iOS menu scrolls (IMG_5490).
  const isGrouped = isOptionGroupArray(filteredOptions)
  const hardLimit = searchable ? HARD_OPTIONS_LIMIT : Infinity
  const hasHardLimit = !isGrouped && filteredOptions.length > hardLimit

  const options = isGrouped
    ? filteredOptions.map((group) => <CustomSelectGroup key={group.label} {...group} />)
    : filteredOptions
        .slice(0, hardLimit)
        .map((option) => <CustomSelectOption key={option.value} {...option} />)

  return (
    <div
      id={listId}
      className={s.OptionsList}
      ref={listRef}
      role="listbox"
      // Named like the trigger: its label, or the default trigger itself
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (ariaLabel || trigger ? undefined : triggerId)}
      aria-multiselectable={multiple || undefined}
      // Without search, the list is the focused element
      tabIndex={searchable ? undefined : 0}
    >
      {options}
      {hasHardLimit && (
        <CustomSelectHardLimit numHidden={filteredOptions.length - HARD_OPTIONS_LIMIT} />
      )}
    </div>
  )
}

const DEFAULT_OPTIONS_LIMIT = {
  limit: 100,
  label: "Show all",
}

const CustomSelectGroup = <T extends Option>({
  label,
  options,
  optionsLimit = DEFAULT_OPTIONS_LIMIT,
}: OptionGroup<T>) => {
  const groupId = useId()
  const headingId = useId()
  const { searchTerm, setHighlightedValue } = useCustomSelectMenuContext()
  const { searchable } = useSelectContext()
  const [limitExpanded, setLimitExpanded] = useState<boolean>(false)

  const hasExpandableLimit = optionsLimit.limit < options.length && !searchTerm && !limitExpanded
  // The hard limit asks to search for the rest: a list with no search (a phone's) shows the whole group once expanded
  const hasHardLimit = searchable && HARD_OPTIONS_LIMIT < options.length && !hasExpandableLimit

  let maybeLimitedOptions = options
  if (hasExpandableLimit) {
    maybeLimitedOptions = options.slice(0, optionsLimit.limit)
  } else if (hasHardLimit) {
    maybeLimitedOptions = options.slice(0, HARD_OPTIONS_LIMIT)
  }

  const handleLimitExpanded = () => {
    // Expand options
    setLimitExpanded(true)

    // Set highlight to the first option from the newly expanded list
    setHighlightedValue(options[optionsLimit.limit].value)
  }

  return (
    // A group named by its heading. NOTE: The arrow keys walk every option in
    // document order (findNextOption), so they cross from group to group.
    <div role="group" aria-labelledby={headingId} className={s.OptionGroup}>
      {/* No indicator slot: the heading labels the whole section, so it starts
          at the row's content edge — above the check column, not indented to
          the option labels. Same alignment a grouped menu uses on GitHub. */}
      <div id={headingId} className={s.OptionGroupHeading}>{label}</div>
      {maybeLimitedOptions.map((limitedOptions) => (
        <CustomSelectOption key={limitedOptions.value} {...limitedOptions} />
      ))}
      {hasExpandableLimit && (
        <CustomSelectExpandableLimit
          value={`group-limit-${groupId}`}
          label={optionsLimit.label}
          onPointerUp={handleLimitExpanded}
        />
      )}
      {hasHardLimit && <CustomSelectHardLimit numHidden={options.length - HARD_OPTIONS_LIMIT} />}
    </div>
  )
}

type CustomSelectHardLimitProps = {
  numHidden: number
}

const CustomSelectHardLimit = ({ numHidden }: CustomSelectHardLimitProps) => {
  const { checkPosition } = useSelectContext()

  return (
    <div className={s.OptionHardLimitHeading}>
      {/* The note lines up with the option labels above it, so it borrows their
          indicator column. Without a column there is nothing to line up to. */}
      {checkPosition === 'start' && <div className={s.OptionIndicatorSlot} />}
      {`…and ${numHidden.toLocaleString()} more options. Use search to refine results further.`}
    </div>
  )
}

const useSelectPress = (action: () => void) => {
  const press = useMemo(() => createSelectPress(), [])
  return {
    onPointerDown: press.onPointerDown,
    onPointerCancel: press.onPointerCancel,
    onPointerUp: (event: React.PointerEvent) => { if (press.onPointerUp(event)) action() },
    onClick: (event: React.MouseEvent) => { if (press.onClick(event)) action() },
  }
}

type CustomSelectExpandableLimitProps = {
  value: string
  label: string
  onPointerUp: () => void
}

const CustomSelectExpandableLimit = ({
  value,
  label,
  onPointerUp,
}: CustomSelectExpandableLimitProps) => {
  const { checkPosition } = useSelectContext()
  const { highlightedValue, setHighlightedValue } = useCustomSelectMenuContext()
  const optionId = useId()
  const press = useSelectPress(onPointerUp)

  const isHighlighted = value === highlightedValue

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isHoverPointer(event)) return
    if (isHighlighted) {
      return
    }

    setHighlightedValue(value)
  }

  const handlePointerLeave = (event: React.PointerEvent) => {
    if (!isHoverPointer(event)) return
    setHighlightedValue((currentHighlightedValue) => {
      // If the current value is not this one, don't do anything
      // Otherwise, clear the value, removing the active highlight on the menu.
      return currentHighlightedValue !== value ? currentHighlightedValue : ""
    })
  }

  // This component acts a LOT like an Option, but has enough bespoke behavior
  // that it cannot literally be one. We copy the important parts of Option for
  // keyboard navigation, UX, etc.
  return (
    <div
      id={optionId}
      className={clsx(s.Option, s.OptionsLimit)}
      data-option-id={value}
      data-highlight={isHighlighted ? "" : undefined}
      // An expandable action, never a selected value.
      role="option"
      aria-selected={false}
      {...press}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className={clsx(s.PressableInner, s.OptionInner)}>
        {/* The row lines up with the option labels above it, so it borrows their
            indicator column. Without a column there is nothing to line up to. */}
        {checkPosition === 'start' && <div className={s.OptionIndicatorSlot} />}
        {label}
      </div>
    </div>
  )
}

const INTERNAL_DOM_SELECTION_DATA_ATTR = "data-option-id"

const CustomSelectOption = (option: Option) => {
  const {
    optionClassName,
    OptionView,
    value: propsValue,
    multiple,
    onSelectRef,
    checkPosition,
  } = useSelectContext()
  const { openingValue, requestCloseRef, highlightedValue, setHighlightedValue } =
    useCustomSelectMenuContext()
  const { value, disabled, tooltip } = option
  // Referenced by the list's aria-activedescendant while highlighted
  const optionId = useId()

  // NOTE: SingleSelect mode keeps the opening value instead of the live `propsValue`
  // to avoid selecting the item as the select closes.
  const isSelected = multiple ? propsValue.includes(value) : value === openingValue
  const isHighlighted = value === highlightedValue

  const handlePointerUp = () => {
    if (multiple) {
      // Trigger the change ref, optionally as a remove
      onSelectRef.current(option, isSelected)
    } else {
      // Trigger the change ref
      onSelectRef.current(option)
      // Request the dropdown to close
      requestCloseRef.current?.()
    }
  }

  const press = useSelectPress(handlePointerUp)

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isHoverPointer(event)) return
    if (isHighlighted) {
      return
    }

    setHighlightedValue(value)
  }

  const handlePointerLeave = (event: React.PointerEvent) => {
    if (!isHoverPointer(event)) return
    setHighlightedValue((currentHighlightedValue) => {
      // If the current value is not this one, don't do anything
      // Otherwise, clear the value, removing the active highlight on the menu.
      return currentHighlightedValue !== value ? currentHighlightedValue : ""
    })
  }

  return (
    <div
      id={optionId}
      className={clsx(s.Option, optionClassName)}
      data-highlight={isHighlighted ? "" : undefined}
      role="option"
      // The selection; the highlight is the list's aria-activedescendant
      aria-selected={isSelected}
      data-selected={isSelected ? "" : undefined}
      // Internal attribute for selecting DOM nodes
      {...{ [INTERNAL_DOM_SELECTION_DATA_ATTR]: value }}
      // Allow options to behave like a native select, when you can open and select an item in a single click
      {...(disabled ? {} : press)}
      // Pointer move allows us to prevent contention from keyboard presses and a still mouse
      // which does trigger events like onMouseEnter, creating weird battles with mouse and keyboard focus.
      onPointerMove={disabled ? undefined : handlePointerMove}
      onPointerLeave={disabled ? undefined : handlePointerLeave}
      aria-disabled={disabled}
      data-disabled={disabled ? "" : undefined}
    >
      <div className={s.PressableInner}>
        {checkPosition === 'start' && (
          <div className={s.OptionIndicatorSlot} data-position="start">
            {isSelected && <Check className={s.OptionCheck} />}
          </div>
        )}
        <div className={s.OptionLeading}>
          <div className={s.OptionInner}>
            <OptionView {...option} />
            {tooltip && (
              <Tooltip content={tooltip.content} maxWidth={tooltip.maxWidth} side="right">
                <Info className={s.OptionTooltipIcon} />
              </Tooltip>
            )}
          </div>
          {option.description && (
            <div className={clsx(s.OptionInner, s.OptionDescription)}>
              {option.description}
            </div>
          )}
          {/* An iOS menu has no tooltips: on a phone the tooltip is the row's subtitle, after the description if there
              is one (Select.module.css) */}
          {tooltip && (
            <div className={clsx(s.OptionInner, s.OptionTooltipText)}>{tooltip.content}</div>
          )}
        </div>
        {checkPosition === 'end' && (
          <div className={s.OptionIndicatorSlot} data-position="end">
            {isSelected && <Check className={s.OptionCheck} />}
          </div>
        )}
      </div>
    </div>
  )
}

const CustomSelectActions = () => {
  const { actions } = useSelectContext()

  if (actions.length === 0) {
    return null
  }

  return (
    <div className={s.ActionsContainer}>
      {actions.map((action) => (
        <CustomSelectAction key={action.id} {...action} />
      ))}
    </div>
  )
}

const CustomSelectAction = ({ id, label, Icon, className }: Action) => {
  const { onActionSelect } = useSelectContext()
  const { requestCloseRef } = useCustomSelectMenuContext()

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLDivElement>) => {
    if (evt.defaultPrevented || evt.nativeEvent.isComposing || evt.keyCode === 229) return
    const key = evt.key

    switch (key) {
      case "Tab":
        // Allow tabbing to pass propagation as normal,
        // which bubbles up to the focus trap of Radix Popover
        break
      case "Enter":
      case " ":
        evt.stopPropagation()
        evt.preventDefault()
        handlePointerUp()
        break
      default:
        evt.stopPropagation()
    }
  }

  const handlePointerUp = () => {
    // Trigger the action's through our context helper, not the method on this action (it may be a stale reference)
    onActionSelect(id)
    // Request to close the dropdown
    requestCloseRef.current?.()
  }

  const press = useSelectPress(handlePointerUp)

  return (
    <div
      className={s.Action}
      {...press}
      role="button"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className={clsx(s.ActionInner, className)}>
        {Icon && <Icon role="presentation" />}
        {label}
      </div>
    </div>
  )
}

// ============================================================
// Utilities
// ============================================================
const defaultSearchPredicate = (option: Option, searchTerm: string) =>
  option.label.toLowerCase().includes(searchTerm)

const filterOptions = <T extends Option>(
  options: Options<T>,
  searchTerm: string,
  searchIterator: SearchPredicate<T>,
): Options<T> => {
  const searchValue = searchTerm.trim().toLocaleLowerCase()

  if (!searchValue) {
    return options
  }

  const filterOption = (option: T): boolean => searchIterator(option, searchValue)

  if (isOptionGroupArray(options)) {
    return options.reduce((acc, group) => {
      const filtered = group.options.filter(filterOption)

      if (filtered.length) {
        acc.push({
          ...group,
          options: filtered,
        })
      }
      return acc
    }, [] as OptionGroup<T>[])
  } else {
    return options.reduce((acc, option) => {
      if (filterOption(option)) acc.push(option)
      return acc
    }, [] as T[])
  }
}

const getFirstValidOption = <T extends Option>(options: Options<T>): T | undefined => {
  if (!options.length) {
    return undefined
  }

  let found: T | undefined

  for (const opt of options) {
    if (isOptionGroup(opt)) {
      const firstNonDisabled = opt.options.find((i) => !i.disabled)
      if (firstNonDisabled) {
        found = firstNonDisabled
        break
      }
    } else {
      if (!opt.disabled) {
        found = opt
        break
      }
    }
  }

  return found
}

const getOptionByValue = <T extends Option>(options: Options<T>, value: string): T | undefined => {
  let found: T | undefined

  for (const opt of options) {
    if (isOptionGroup(opt)) {
      const exists = opt.options.find((i) => i.value === value)
      if (exists) {
        found = exists
        break
      }
    } else {
      if (opt.value === value) {
        found = opt
        break
      }
    }
  }

  return found
}

const getOptionsByValues = <T extends Option>(options: Options<T>, values: string[]): T[] => {
  let found: T[] = []
  const lookup = new Set(values)

  for (const opt of options) {
    if (isOptionGroup(opt)) {
      const exists = opt.options.filter((i) => lookup.has(i.value))
      found = found.concat(exists)
    } else {
      if (lookup.has(opt.value)) {
        found.push(opt)
      }
    }
  }

  return found
}

const MAX_DOM_CRAWLS = 40

const findOptionByValue = (currentValue: string, container: HTMLElement) =>
  container.querySelector(`[data-option-id="${CSS.escape(currentValue)}"]`)

const isValidOptionNode = (node: Element) => node.matches("[data-option-id]:not([data-disabled])")

// Steps from the current option to the nearest enabled one, one option row at a
// time in document order: across groups (siblings would stop at a group's
// edge), skipping disabled rows, at most MAX_DOM_CRAWLS rows away
const findAdjacentOption = (currentValue: string, container: HTMLElement, step: 1 | -1) => {
  const currentOption = findOptionByValue(currentValue, container)
  const rows = Array.from(container.querySelectorAll("[data-option-id]"))

  let index = currentOption ? rows.indexOf(currentOption) : -1
  if (index === -1) {
    return undefined
  }

  for (let maxSteps = 0; maxSteps < MAX_DOM_CRAWLS; maxSteps += 1) {
    index += step
    const nextNode = rows[index]

    if (!nextNode) {
      return undefined
    }

    if (isValidOptionNode(nextNode)) {
      return nextNode
    }
  }
}

const findNextOption = (currentValue: string, container: HTMLElement) =>
  findAdjacentOption(currentValue, container, 1)

const findPreviousOption = (currentValue: string, container: HTMLElement) =>
  findAdjacentOption(currentValue, container, -1)

const createTypeahead = () => {
  let currentValue: string = ""
  let timeoutId: ReturnType<typeof setTimeout>

  return (char: string) => {
    // Searching is case-insensitive
    char = char.toLowerCase()

    // Add the new character to the current value
    currentValue += char

    // Clear the previous timeout if there was one
    if (timeoutId) clearTimeout(timeoutId)

    // Reset the value after a brief delay
    timeoutId = setTimeout(() => {
      currentValue = ""
    }, 500)

    // When a user is typing the same value, like "llll", assume they are cycling through items starting with "l"
    // We continue to build up the string in case another letter is typed, and then release the full value.
    // For example, if the user types "ooog", it will return "o", until "g" is typed, and then return the "ooog".
    const isCycling = char.repeat(currentValue.length) === currentValue

    // Return the typeahead value
    return isCycling ? char : currentValue
  }
}

const isValidTypeaheadChar = (char: string): boolean => /^[a-zA-Z0-9]$/.test(char)

// A shortcut (Ctrl+C, Cmd+A, Alt+letter) or a key another handler took is not typeahead
const isTypeaheadKey = (evt: React.KeyboardEvent): boolean =>
  isValidTypeaheadChar(evt.key) && !evt.ctrlKey && !evt.metaKey && !evt.altKey && !evt.defaultPrevented

const getTypeaheadOption = <T extends Option>(
  options: Options<T>,
  typeaheadValue: string,
  currentHighlightValue?: string,
): T | undefined => {
  // Ensure options actually exist
  if (!options.length) {
    return undefined
  }

  let matchBeforeHighlight: T | undefined
  // If we' aren't provided a highlighted value, start from the top (e.g., act like it's found)
  let foundHighlightedValue: boolean = !currentHighlightValue

  const optionValidAndMatches = ({ disabled, label, value }: T) => {
    // Side effect of looping
    if (value === currentHighlightValue) {
      foundHighlightedValue = true
      // Don't return highlighted value
      return false
    }

    return !disabled && label.toLowerCase().startsWith(typeaheadValue)
  }

  for (const opt of options) {
    if (isOptionGroup(opt)) {
      for (const option of opt.options) {
        if (optionValidAndMatches(option)) {
          if (foundHighlightedValue) {
            // We're done after we've found an after match, in any group
            return option
          } else {
            // Keep the first found "before" match
            matchBeforeHighlight = matchBeforeHighlight || option
          }
        }
      }
    } else {
      if (optionValidAndMatches(opt)) {
        if (foundHighlightedValue) {
          // We're done after we've found an after match
          return opt
        } else {
          // Keep the first found "before" match
          matchBeforeHighlight = matchBeforeHighlight || opt
        }
      }
    }
  }

  return matchBeforeHighlight
}
