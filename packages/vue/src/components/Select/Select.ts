import clsx from "clsx"
import {
  computed,
  createCommentVNode,
  defineComponent,
  h,
  inject,
  markRaw,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  provide,
  ref,
  shallowRef,
  toRaw,
  useId,
  watch,
  type Component,
  type ComponentPublicInstance,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type Ref,
  type ShallowRef,
  type Slots,
  type VNode,
  type VNodeChild,
} from "vue"
import {
  PopoverAnchor as RekaPopoverAnchor,
  PopoverContent as RekaPopoverContent,
  PopoverPortal as RekaPopoverPortal,
  PopoverRoot as RekaPopoverRoot,
  injectPopoverRootContext,
  useForwardExpose,
  useId as useRekaId,
} from "reka-ui"
import type { ControlSize } from "@plexui/styles/types"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { preventDefaultHandler, toCssVariables, waitForAnimationFrame } from "../../lib/helpers.js"
import { Check, Info, Search } from "../Icon/index.js"
import { Input } from "../Input/index.js"
import { SelectControl, type DropdownIconType } from "../SelectControl/index.js"
import { Tooltip } from "../Tooltip/index.js"
import { withRadixVariableNames } from "../Tooltip/Tooltip.js"
import { composeEventHandlers, firstElementChild, mergeSlotProps } from "../Tooltip/slot.js"
import { TransitionGroup } from "../Transition/index.js"
import s from "@plexui/styles/components/Select/Select.module.css"

// Vue port of packages/ui/src/components/Select/Select.tsx on Reka UI.
//
// API mapping:
// - `value` + `update:value` (`v-model:value`): a string, or string[] with
//   `multiple`. `change` carries what React's `onChange` receives: the
//   selected option, or the selected options with `multiple`.
// - Custom views are scoped slots, with React's component props kept as a
//   fallback: `#optionView="option"` / `OptionView`, `#triggerView` /
//   `TriggerView` (receives the selected option, or `{ values, selectedAll }`
//   with `multiple`), `#trigger="{ open, onToggle }"` / `trigger`, and
//   `#searchEmptyMessage` / `searchEmptyMessage`.
// - An option's `description` and `tooltip.content` take a string, a VNode or
//   a render function (React: a ReactNode). Actions keep their `onSelect`
//   and `Icon` (a component) as in React.
//
// Reka keeps the popover state, positioning, the dismissable layer and the
// focus scope. Where Reka's popover differs from Radix's, this port follows
// Radix so the DOM and behaviour match React:
// - The trigger is Radix's: its props are merged into the trigger (default
//   or custom) after the child's own handlers, the click toggle is skipped
//   when one called preventDefault(), it carries no `id` of Reka's and keeps
//   `aria-controls` while closed.
// - Open changes from Reka (dismiss, the trigger's click) are reported only
//   when the state changes, like Radix's controlled state.
// - The content element is rendered here (Reka's `as`): Radix's custom
//   property names (`--radix-popover-*`), no `dir`, no `aria-labelledby`.
// - React handles events of portalled content at <body>, so stopping one
//   there still runs <body>'s own listeners (the Escape stack). An action's
//   Escape key does the same here (see CustomSelectAction).

export type OptionContent = string | number | VNode | (() => VNodeChild)

export type Option<T extends string = string> = {
  value: T
  label: string
  /** Disable the option */
  disabled?: boolean
  /** Displayed as secondary text below the option `label` */
  description?: OptionContent
  tooltip?: {
    content: OptionContent
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

type CallbackWithActionId = (actionId: string) => void
type SearchPredicate<T extends Option> = (option: T, searchTerm: string) => boolean

export type SelectAction = {
  /** Unique ID to identify the action with */
  id: string
  /** Label display for the action */
  label: string
  /** Icon displayed to the left of the action */
  Icon?: Component
  /** Custom class applied to the action container */
  className?: string
  /** Callback invoked when the action is pressed */
  onSelect: CallbackWithActionId
}

export type PopoverSide = "top" | "bottom"
export type PopoverAlign = "start" | "center" | "end"
export type CheckPosition = "start" | "end" | "none"

export type MultiSelectTriggerViewProps<T extends Option> = {
  values: T[]
  selectedAll: boolean
}

export type SelectTriggerRenderProps = { open: boolean; onToggle: () => void }

type ListSize = number | "auto"

const selectProps = {
  /** Options or option groups. Should be a stable reference. */
  options: { type: Array as PropType<Options<Option>>, required: true as const },
  /** Selected value; an array of values with `multiple`. Bind `v-model:value`. */
  value: { type: [String, Array] as PropType<string | string[]>, required: true as const },
  /** Determines if the select should support multiple selection. @default false */
  multiple: { type: Boolean, default: false },
  /** Disables the select visually and from interactions. @default false */
  disabled: { type: Boolean, default: false },
  /** Id of the hidden input, so the select can be targeted with `for` */
  id: String,
  /** Marks the select as a required field when using native form submission */
  required: { type: Boolean, default: undefined },
  /** Creates the ability to query the value with `[name="${name}"]` */
  name: String,
  /** Placeholder text for the select. @default "Select..." */
  placeholder: { type: String, default: "Select..." },
  /** Placeholder text while loading. @default "Loading..." */
  loadingPlaceholder: { type: String, default: "Loading..." },
  /** Displays loading indicator on top of button contents. @default false */
  loading: { type: Boolean, default: false },
  /** Style variant for the select trigger. @default "outline" */
  variant: { type: String as PropType<"soft" | "outline" | "ghost">, default: "outline" },
  /** Fully rounded pill shape for the trigger. @default false */
  pill: { type: Boolean, default: false },
  /** Size of the trigger: `3xs` 22px up to `3xl` 48px. @default "md" */
  size: { type: String as PropType<ControlSize>, default: "md" },
  /** Icon displayed in the far right of the select trigger. @default "dropdown" */
  dropdownIconType: { type: String as PropType<DropdownIconType>, default: "dropdown" },
  /** Actions to display below the options list. Memoized by length. */
  actions: Array as PropType<SelectAction[]>,
  /** Custom class applied to option containers */
  optionClassName: String,
  /** Component rendering each option (the `#optionView` slot takes precedence) */
  OptionView: [Object, Function] as PropType<Component>,
  /** Component rendering the trigger content (the `#triggerView` slot takes precedence) */
  TriggerView: [Object, Function] as PropType<Component>,
  /** Icon displayed at the start of the select trigger */
  TriggerStartIcon: [Object, Function] as PropType<Component>,
  /** Custom class applied to the select trigger */
  triggerClassName: String,
  /** Applies a negative margin using the current gutter to optically align the trigger. */
  opticallyAlign: String as PropType<"start" | "end">,
  /** Display a clear action that allows the select to be unset. @default false */
  clearable: { type: Boolean, default: false },
  /** Extends select to 100% of available width. @default true, except for the ghost variant */
  block: { type: Boolean, default: undefined },
  /** Preferred side of the trigger to render against when open. @default "bottom" */
  side: { type: String as PropType<PopoverSide>, default: "bottom" },
  /** Preferred alignment against the trigger. @default "center" when block, otherwise "start" */
  align: String as PropType<PopoverAlign>,
  /** Offset in pixels from the "start" or "end" alignment. @default 0 */
  alignOffset: Number,
  /** Collision detection of the menu. @default true */
  avoidCollisions: { type: Boolean, default: true },
  /** Width of the menu. @default "auto" */
  listWidth: [Number, String] as PropType<ListSize>,
  /** `min-width` of the menu, in pixels. @default the trigger width (300 when not block) */
  listMinWidth: [Number, String] as PropType<ListSize>,
  /** `max-width` of the menu, in pixels. @default "auto" */
  listMaxWidth: { type: [Number, String] as PropType<ListSize>, default: "auto" },
  /** Predicate used to filter searches */
  searchPredicate: Function as PropType<SearchPredicate<Option>>,
  /** Placeholder of the search input */
  searchPlaceholder: { type: String, default: "" },
  /** Accessible name of the search input, independent of the trigger label. @default "Search options" */
  searchAriaLabel: { type: String, default: "Search options" },
  /** Message displayed when search results are empty (or the `#searchEmptyMessage` slot) */
  searchEmptyMessage: { type: [String, Number, Object] as PropType<string | number | VNode>, default: "No results found." },
  /** Position of the check indicator in the option list. @default "start" */
  checkPosition: { type: String as PropType<CheckPosition>, default: "start" },
  /** Renders a custom trigger (or the `#trigger` slot), wrapped as the popover trigger */
  trigger: Function as PropType<(props: SelectTriggerRenderProps) => VNodeChild>,
  "ariaLabel": String,
  "ariaLabelledby": String,
  "ariaDescribedby": String,
  "ariaInvalid": { type: [Boolean, String] as PropType<boolean | "true" | "false" | "grammar" | "spelling">, default: undefined },
}

type SelectPropsValue = {
  readonly [K in keyof typeof selectProps]: unknown
} & {
  options: Options<Option>
  value: string | string[]
  multiple: boolean
  disabled: boolean
  id?: string
  required?: boolean
  name?: string
  placeholder: string
  loadingPlaceholder: string
  loading: boolean
  variant: "soft" | "outline" | "ghost"
  pill: boolean
  size: ControlSize
  dropdownIconType: DropdownIconType
  actions?: SelectAction[]
  optionClassName?: string
  OptionView?: Component
  TriggerView?: Component
  TriggerStartIcon?: Component
  triggerClassName?: string
  opticallyAlign?: "start" | "end"
  clearable: boolean
  block?: boolean
  side: PopoverSide
  align?: PopoverAlign
  alignOffset?: number
  avoidCollisions: boolean
  listWidth?: ListSize
  listMinWidth?: ListSize
  listMaxWidth: ListSize
  searchPredicate?: SearchPredicate<Option>
  searchPlaceholder: string
  searchAriaLabel: string
  searchEmptyMessage: string | number | VNode
  checkPosition: CheckPosition
  trigger?: (props: SelectTriggerRenderProps) => VNodeChild
  ariaLabel?: string
  ariaLabelledby?: string
  ariaDescribedby?: string
  ariaInvalid?: boolean | string
}

// ============================================================
// Contexts
// ============================================================

type SelectContextValue = {
  props: SelectPropsValue
  slots: Slots
  /**
   * Bumped on every Select update. Slots are not reactive, so the parts that
   * render one read it to follow a slot that was added, removed or replaced.
   */
  slotsVersion: Ref<number>
  triggerId: string
  /** The default trigger's element (React looks it up by `triggerId`) */
  triggerEl: ShallowRef<HTMLElement | null>
  block: ComputedRef<boolean>
  align: ComputedRef<PopoverAlign>
  alignOffset: ComputedRef<number>
  listMinWidth: ComputedRef<ListSize | undefined>
  searchable: ComputedRef<boolean>
  actions: ShallowRef<SelectAction[]>
  onSelect: (option: Option, removeOption?: boolean) => void
  onActionSelect: CallbackWithActionId
  /** The latest predicate, read without tracking (React keeps it in a ref) */
  searchPredicate: () => SearchPredicate<Option>
}

const SelectContextKey: InjectionKey<SelectContextValue> = Symbol("PlexUISelect")

const useSelectContext = () => {
  const context = inject(SelectContextKey, null)

  if (!context) {
    throw new Error("Select components must be wrapped in <Select />")
  }

  return context
}

type CustomSelectContextValue = {
  open: Ref<boolean>
  handleOpenChange: (maybeNextState?: boolean) => void
  selectContentRef: ShallowRef<HTMLElement | null>
}

const CustomSelectContextKey: InjectionKey<CustomSelectContextValue> = Symbol("PlexUICustomSelect")

// Radix decides "focus outside" on the React tree, where a Select opened next
// to another one is outside it: focus entering the second one's menu closes
// the first. Reka decides on the DOM and counts a layer later in the document
// as nested, so the first would stay open. Each Select records its logical
// parent (the Select whose menu renders it) and its content element, and
// closes when focus enters the content of a Select not nested in it.
type SelectLayer = {
  parent: SelectLayer | null
  content: ShallowRef<HTMLElement | null>
}

const SelectLayerKey: InjectionKey<SelectLayer> = Symbol("PlexUISelectLayer")

const mountedSelectLayers = new Set<SelectLayer>()

const isNestedIn = (layer: SelectLayer, ancestor: SelectLayer) => {
  for (let parent = layer.parent; parent; parent = parent.parent) {
    if (parent === ancestor) return true
  }
  return false
}

type CustomSelectMenuContextValue = {
  openingValue: string
  listId: string
  requestClose: () => void
  listRef: ShallowRef<HTMLElement | null>
  // Highlighting
  highlightedValue: Ref<string>
  // Search
  searchTerm: Ref<string>
  searchInputRef: ShallowRef<HTMLInputElement | null>
}

const CustomSelectMenuContextKey: InjectionKey<CustomSelectMenuContextValue> = Symbol("PlexUICustomSelectMenu")

const useCustomSelectMenuContext = () => {
  const context = inject(CustomSelectMenuContextKey, null)

  if (!context) {
    throw new Error("CustomSelectMenu components must be wrapped in <CustomSelectMenu />")
  }

  return context
}

const renderContent = (content: unknown): VNodeChild =>
  typeof content === "function" ? (content as () => VNodeChild)() : (content as VNodeChild)

const defaultMultiTriggerView = ({ values, selectedAll }: MultiSelectTriggerViewProps<Option>) =>
  selectedAll
    ? "All selected"
    : values.length === 0
      ? // NOTE: Zero length is impossible - an empty option with `placeholder` is always returned
        "Select..."
      : values.length === 1
        ? values[0]!.label
        : `${values.length} selected`

// ============================================================
// Select
// ============================================================

const SelectComponent = defineComponent({
  name: "Select",
  inheritAttrs: false,
  props: selectProps,
  emits: {
    "update:value": (_value: string | string[]) => true,
    "change": (_selection: Option | Option[]) => true,
  },
  setup(rawProps, { emit, slots }) {
    const props = rawProps as unknown as SelectPropsValue
    // Block default is dynamic, based on `variant`
    const block = computed(() => props.block ?? props.variant !== "ghost")
    // Align default is dynamic, based on `block`
    const align = computed<PopoverAlign>(() => props.align ?? (block.value ? "center" : "start"))
    // Flush with the trigger's edge, as the prop documents
    const alignOffset = computed(() => props.alignOffset ?? 0)
    // A menu is never narrower than the field it belongs to. Inline selects keep their 300px floor.
    const listMinWidth = computed(() => props.listMinWidth ?? (block.value ? undefined : 300))

    const change = (selection: Option | Option[]) => {
      emit("update:value", Array.isArray(selection) ? selection.map((option) => option.value) : selection.value)
      emit("change", selection)
    }

    const onSelect = (selectedOption: Option, removeOption?: boolean) => {
      const { multiple, options } = props
      const value = props.value as string[]

      if (multiple) {
        // When clearing values, the value is an empty string
        if (!selectedOption.value) {
          change([])
          return
        }

        if (removeOption) {
          const nextValues = value.filter((v) => v !== selectedOption.value)
          change(getOptionsByValues(options, nextValues))
        } else {
          change(getOptionsByValues(options, value).concat(selectedOption))
        }
      } else {
        change(selectedOption)
      }
    }

    // It should be exceedingly uncommon to change actions dynamically: like
    // React's memo, the rendered actions only follow a change of length.
    const actions = shallowRef<SelectAction[]>(props.actions ?? [])
    watch(
      () => (props.actions ?? []).length,
      () => {
        actions.value = props.actions ?? []
      },
    )
    // Action callbacks always come from the latest actions
    const onActionSelect = (actionId: string) => {
      ;(props.actions ?? []).find((a) => a.id === actionId)?.onSelect(actionId)
    }

    // Determine when custom selects should be used
    const optionsCount = computed(() => {
      const { options } = props
      return isOptionGroupArray(options)
        ? options.reduce((acc: number, group) => acc + group.options.length, 0)
        : options.length
    })

    // Locking down searchable count to a single value
    const searchable = computed(() => optionsCount.value > 15)

    const slotsVersion = ref(0)
    onBeforeUpdate(() => {
      slotsVersion.value++
    })

    provide(SelectContextKey, {
      props,
      slots,
      slotsVersion,
      triggerId: `select-trigger-${useId()}`,
      triggerEl: shallowRef(null),
      block,
      align,
      alignOffset,
      listMinWidth,
      searchable,
      actions,
      onSelect,
      onActionSelect,
      searchPredicate: () => (toRaw(rawProps) as SelectPropsValue).searchPredicate ?? defaultSearchPredicate,
    })

    return () => h(CustomSelect)
  },
})

// ============================================================
// Trigger
// ============================================================

const SelectTrigger = defineComponent({
  name: "SelectTrigger",
  inheritAttrs: false,
  props: {
    onOpenChange: Function as PropType<(maybeNextState?: boolean) => void>,
  },
  setup(ownProps, { attrs }) {
    const { props, slots, slotsVersion, triggerId, triggerEl, block, onSelect } = useSelectContext()
    const typeahead = createTypeahead()

    const setTriggerEl = (instance: unknown) => {
      triggerEl.value = ((instance as ComponentPublicInstance | null)?.$el as HTMLElement | undefined) ?? null
    }

    const handleKeyDown = (evt: KeyboardEvent) => {
      const key = evt.key
      const { multiple, value, options } = props
      const firstValue = multiple ? (value as string[])[0] : (value as string)

      // If not a command, check for typeahead
      // NOTE: Typeahead not supported in multi-select
      if (!multiple && isValidTypeaheadChar(key)) {
        const currentTypeaheadValue = typeahead(key)
        // Stop other listeners from reacting
        evt.stopPropagation()

        // Attempt to filter options based on the value
        // NOTE: We don't look at current highlighted value as a means to start the search
        const firstMatchingOption = getTypeaheadOption(options, currentTypeaheadValue, firstValue)

        if (firstMatchingOption) {
          onSelect(firstMatchingOption)
        }
      }
    }

    const handleClearClick = () => {
      onSelect({ value: "", label: "" })
      // Ensure open state is closed
      ownProps.onOpenChange?.(false)
    }

    return () => {
      void slotsVersion.value
      const { multiple, options, loading } = props
      const value = props.value
      const firstValue = multiple ? (value as string[])[0] : (value as string)
      const placeholderValue = loading ? props.loadingPlaceholder : props.placeholder
      const hasSelectedValue = multiple ? (value as string[]).length > 0 : !!value
      const isPlaceholder = loading || !hasSelectedValue

      const renderTriggerView = () => {
        let viewProps: Option | MultiSelectTriggerViewProps<Option>

        if (multiple) {
          const currentSelectedOptions = getOptionsByValues(options, value as string[])
          const flatOptions = options.flatMap((o) => ("options" in o ? o.options : o))
          viewProps = {
            values: currentSelectedOptions.length ? currentSelectedOptions : [{ value: "", label: placeholderValue }],
            selectedAll: flatOptions.length <= (value as string[]).length,
          }
        } else {
          viewProps = getOptionByValue(options, firstValue as string) || { value: "", label: placeholderValue }
        }

        if (slots.triggerView) return slots.triggerView(viewProps)
        if (props.TriggerView) return h(props.TriggerView, viewProps)
        return multiple
          ? defaultMultiTriggerView(viewProps as MultiSelectTriggerViewProps<Option>)
          : (viewProps as Option).label
      }

      return h(
        SelectControl as Component,
        {
          "ref": setTriggerEl,
          "id": triggerId,
          "aria-label": props.ariaLabel,
          "aria-labelledby": props.ariaLabelledby ? `${props.ariaLabelledby} ${triggerId}-value` : undefined,
          "aria-describedby": props.ariaDescribedby,
          "aria-invalid": props.ariaInvalid,
          "class": props.triggerClassName,
          "selected": !isPlaceholder,
          "variant": props.variant,
          "pill": props.pill,
          "block": block.value,
          "size": props.size,
          "disabled": props.disabled,
          "loading": loading,
          "StartIcon": props.TriggerStartIcon,
          "opticallyAlign": props.opticallyAlign,
          "dropdownIconType": props.dropdownIconType,
          "onClearClick": props.clearable ? handleClearClick : undefined,
          "onInteract": ownProps.onOpenChange,
          "onKeydown": handleKeyDown,
          // pass along props from the popover trigger
          ...attrs,
        },
        {
          default: () => [
            props.ariaLabelledby ? h("span", { id: `${triggerId}-value` }, [renderTriggerView()]) : renderTriggerView(),
            props.name || props.id
              ? h("input", {
                  "id": props.id,
                  "name": props.name,
                  "value": firstValue,
                  "tabindex": -1,
                  "onFocus": () => {
                    triggerEl.value?.focus()
                  },
                  // don't make this readOnly because that prevents the value from being required
                  "required": props.required,
                  "class": "sr-only w-full h-0 left-0 bottom-0 pointer-events-none",
                  "aria-hidden": "true",
                })
              : null,
          ],
        },
      )
    }
  },
})

/**
 * Radix's `Popover.Trigger asChild`: Radix's trigger props merged into the
 * child (the default trigger or a custom one), its click toggle after the
 * child's own handlers.
 */
const SelectPopoverTrigger = defineComponent({
  name: "SelectPopoverTrigger",
  setup(_props, { slots }) {
    const rootContext = injectPopoverRootContext()
    rootContext.contentId ||= useRekaId(undefined, "reka-popover-content")
    const { forwardRef, currentElement } = useForwardExpose()

    // Focus returns here on close, and pointer-downs on it are not "outside"
    watch(
      currentElement,
      (element) => {
        rootContext.triggerElement.value = element
      },
      { immediate: true, flush: "post" },
    )

    const onClick = composeEventHandlers(undefined, () => rootContext.onOpenToggle())

    return () => {
      const child = firstElementChild(slots.default?.())
      if (!child) return null

      const isOpen = rootContext.open.value
      return h(RekaPopoverAnchor, { asChild: true, ref: forwardRef }, {
        default: () =>
          mergeSlotProps(child, {
            "type": "button",
            "aria-haspopup": "dialog",
            "aria-expanded": isOpen,
            "aria-controls": rootContext.contentId,
            "data-state": isOpen ? "open" : "closed",
            onClick,
          }),
      })
    }
  },
})

// ============================================================
// Custom Select
// ============================================================

const CustomSelect = defineComponent({
  name: "CustomSelect",
  setup() {
    const { props, slots, slotsVersion, triggerEl } = useSelectContext()
    const open = ref(false)
    const selectContentRef = shallowRef<HTMLElement | null>(null)

    const handleOpenChange = (maybeNextState?: boolean) => {
      // Toggle the current state when called without a specific state
      const nextState = maybeNextState === undefined ? !open.value : maybeNextState
      open.value = nextState

      // When we're closing, manage focus back to trigger manually
      if (!nextState) {
        // Wait until the next tick to determine if another element has become focused
        setTimeout(() => {
          // In the event that the content is gone, not focusing is safer.
          if (!selectContentRef.value) {
            return
          }

          const activeElement = document.activeElement

          // Don't restore focus to the trigger if focus has moved outside of the select menu
          if (activeElement && !selectContentRef.value.contains(activeElement)) {
            return
          }

          triggerEl.value?.focus()
        })
      }
    }

    useEscCloseStack(open, () => {
      handleOpenChange(false)
    })

    provide(CustomSelectContextKey, { open, handleOpenChange, selectContentRef })

    const handleRootOpenChange = (nextState: boolean) => {
      // Radix's controlled state reports changes only
      if (nextState === open.value) return

      // Prevent opening while loading
      if (props.loading && nextState) {
        return
      }

      handleOpenChange(nextState)
    }

    const layer: SelectLayer = { parent: inject(SelectLayerKey, null), content: selectContentRef }
    provide(SelectLayerKey, layer)

    // Focus entering another Select's menu is outside this one, unless that
    // Select is nested in this one's menu (see SelectLayer)
    const handleFocusIn = (evt: FocusEvent) => {
      const target = evt.target as Node | null
      if (!open.value || !target) return
      for (const other of mountedSelectLayers) {
        if (other !== layer && other.content.value?.contains(target) && !isNestedIn(other, layer)) {
          handleRootOpenChange(false)
          return
        }
      }
    }

    let listenerDocument: Document | null = null
    onMounted(() => {
      mountedSelectLayers.add(layer)
      listenerDocument = triggerEl.value?.ownerDocument ?? document
      listenerDocument.addEventListener("focusin", handleFocusIn)
    })
    onBeforeUnmount(() => {
      mountedSelectLayers.delete(layer)
      listenerDocument?.removeEventListener("focusin", handleFocusIn)
      listenerDocument = null
    })

    const renderTrigger = () => {
      const renderProps: SelectTriggerRenderProps = {
        open: open.value,
        onToggle: () => {
          open.value = !open.value
        },
      }
      if (slots.trigger) return slots.trigger(renderProps)
      if (props.trigger) return props.trigger(renderProps)
      return h(SelectTrigger, { onOpenChange: handleOpenChange })
    }

    return () => {
      void slotsVersion.value
      return h(
        RekaPopoverRoot,
        { "open": open.value, "onUpdate:open": handleRootOpenChange, "modal": false },
        {
          default: () => [
            h(SelectPopoverTrigger, null, { default: renderTrigger }),
            // React replaces the menu's wrapper when it opens or closes (see
            // TransitionGroup), so React DOM appends the new one to <body>.
            // A Teleport keeps its place in <body>: a new one per state moves
            // the wrapper to the end the same way.
            h(RekaPopoverPortal, { key: open.value ? "open" : "closed", forceMount: true }, {
              default: () => [
                h(
                  TransitionGroup,
                  { class: s.Menu, enterDuration: 350, exitDuration: 200, disableAnimations: true },
                  { default: () => [open.value ? h(SelectPopoverContent, { key: "dropdown" }) : createCommentVNode()] },
                ),
              ],
            }),
          ],
        },
      )
    }
  },
})

// The element Reka's content renders (`as`). Raw: Reka passes `as` through
// reactive props, and Vue warns about a component made reactive.
const SelectContentElement = markRaw(
  defineComponent({
    name: "SelectContentElement",
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const { selectContentRef } = inject(CustomSelectContextKey)!
      const setContentRef = (el: unknown) => {
        selectContentRef.value = (el as HTMLElement | null) ?? null
      }

      return () => {
        const { "dir": _dir, "aria-labelledby": _labelledBy, style, ...rest } = attrs
        return h("div", { ...rest, style: withRadixVariableNames(style, "popover"), ref: setContentRef }, slots.default?.())
      }
    },
  }),
)

const SelectPopoverContent = defineComponent({
  name: "SelectPopoverContent",
  setup() {
    const { props, align, alignOffset, listMinWidth } = useSelectContext()

    return () =>
      h(
        RekaPopoverContent,
        {
          as: SelectContentElement,
          class: s.MenuList,
          side: props.side,
          sideOffset: 5,
          align: align.value,
          alignOffset: alignOffset.value,
          avoidCollisions: props.avoidCollisions,
          collisionPadding: { bottom: 30, top: 30 },
          // Prevent Reka's auto focus so we can handle our own from within <CustomSelectMenu />
          onOpenAutoFocus: preventDefaultHandler,
          onCloseAutoFocus: preventDefaultHandler,
          onEscapeKeyDown: preventDefaultHandler,
          style: toCssVariables({
            "select-list-width": props.listWidth,
            "select-list-min-width": listMinWidth.value,
            "select-list-max-width": props.listMaxWidth,
          }),
        },
        { default: () => h(CustomSelectMenu) },
      )
  },
})

/**
 * Focuses an element that mounted in this tick. Vue skips a listener for an
 * event stamped (`_vts`) no later than the moment the listener was attached
 * (a time cached for the tick), so a focus fired within the millisecond the
 * menu mounted would not reach the search Input's own focus listener once
 * Reka's capture listener has stamped it: its `data-focused` would stay
 * "false", while React's onFocus always runs. The focus events are stamped
 * one millisecond later for the listeners on their way.
 *
 * `_vts` is a private field of Vue's runtime-dom event invoker. Deferring the
 * focus instead was tried and breaks parity, because React focuses
 * synchronously in its mount effect: in the next animation frame, keys and
 * Escape pressed right after opening reach the trigger, not the menu; in a
 * 1ms timeout (a 0ms one fires within the same millisecond and is skipped
 * too), a menu opened and closed quickly takes focus after closing. Should
 * Vue drop the field, the stamp is ignored and only the search input's
 * `data-focused` is affected.
 */
const focusMounted = (element: HTMLElement) => {
  const view = element.ownerDocument.defaultView
  const stamp = (event: Event) => {
    const vueEvent = event as Event & { _vts?: number }
    if (event.target === element && !vueEvent._vts) vueEvent._vts = Date.now() + 1
  }

  view?.addEventListener("focus", stamp, { capture: true })
  view?.addEventListener("focusin", stamp, { capture: true })
  try {
    element.focus({ preventScroll: true })
  } finally {
    view?.removeEventListener("focus", stamp, { capture: true })
    view?.removeEventListener("focusin", stamp, { capture: true })
  }
}

const CustomSelectMenu = defineComponent({
  name: "CustomSelectMenu",
  setup() {
    const { props, searchable, searchPredicate } = useSelectContext()
    const { handleOpenChange } = inject(CustomSelectContextKey)!
    const menuRef = shallowRef<HTMLElement | null>(null)
    const listRef = shallowRef<HTMLElement | null>(null)
    const searchInputRef = shallowRef<HTMLInputElement | null>(null)
    const searchTerm = ref("")
    const multiple = props.multiple
    const value = props.value
    const highlightedValue = ref<string>(
      ((multiple ? (value as string[])[0] : (value as string)) || getFirstValidOption(props.options)?.value) ?? "",
    )
    const typeahead = createTypeahead()
    const listId = `select-list-${useId()}`

    // Lock `value` for a given open to prevent janky change during close animation
    // MultiSelect reads its live selection instead of this per-open snapshot.
    const openingValue = multiple ? "" : (value as string)

    // Trim and lowercase search value
    const literalSearchTerm = computed(() => searchTerm.value.trim().toLocaleLowerCase())
    const filteredOptions = computed(() => filterOptions(props.options, literalSearchTerm.value, searchPredicate()))
    const firstOption = computed(() => getFirstValidOption(filteredOptions.value))

    const requestClose = () => handleOpenChange(false)

    const handleKeyDown = (evt: KeyboardEvent) => {
      const key = evt.key
      const multiple = props.multiple
      const value = props.value
      const firstValue = multiple ? (value as string[])[0] : (value as string)
      const currentHighlightedValue = highlightedValue.value
      const targetValue = currentHighlightedValue || firstOption.value?.value || firstValue
      const isFocusedInSearch = document.activeElement === searchInputRef.value

      const menuElement = menuRef.value

      // Should be generally impossible for the menu element to not exist
      if (!menuElement) {
        return
      }

      const triggerHighlightedOption = () => {
        const pointerUpEvent = new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerType: "mouse",
        })

        // Find the current highlighted option
        const selectedOption = findOptionByValue(currentHighlightedValue, menuElement)
        selectedOption?.dispatchEvent(pointerUpEvent)
      }

      const highlightOption = (val: string, element: Element) => {
        highlightedValue.value = val
        element.scrollIntoView({ block: "nearest" })
      }

      const highlightSelectedOrFirstOption = () => {
        // Attempt to move highlight to selected item
        const maybeFirstValue = multiple ? (value as string[])[0] : (value as string)

        if (maybeFirstValue) {
          const selectedElement = findOptionByValue(maybeFirstValue, menuElement)

          if (selectedElement) {
            highlightOption(maybeFirstValue, selectedElement)
            return
          }
        }

        // If value isn't set, or the selected node wasn't found in the DOM,
        // attempt to move focus to the first valid option.
        const firstValidOption = getFirstValidOption(props.options)

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
          if (!currentHighlightedValue || !findOptionByValue(currentHighlightedValue, menuElement)) {
            highlightSelectedOrFirstOption()
            return
          }

          // Otherwise, move to the next option
          const nextElement = findNextOption(currentHighlightedValue, menuElement)
          const nextValue = nextElement?.getAttribute("data-option-id")
          if (nextElement && nextValue) {
            highlightOption(nextValue, nextElement)
          }

          return
        }
        case "ArrowUp": {
          evt.preventDefault()

          // If there's no highlighted value, or the highlighted value is not in the DOM
          if (!currentHighlightedValue || !findOptionByValue(currentHighlightedValue, menuElement)) {
            highlightSelectedOrFirstOption()
            return
          }

          const previousElement = findPreviousOption(targetValue as string, menuElement)
          const previousValue = previousElement?.getAttribute("data-option-id")
          if (previousElement && previousValue) {
            highlightOption(previousValue, previousElement)
          }

          return
        }
        case "Enter":
          // Prevent default enter behavior from the search input, if present
          evt.preventDefault()

          // Send a pointerup event into the currently highlighted option
          triggerHighlightedOption()

          return
        case " ":
          // Allow spaces in search, and don't treat as enter
          // if there is a valid literalSearchTerm.
          if (literalSearchTerm.value && isFocusedInSearch) {
            return
          }

          // Prevent space from entering search input
          evt.preventDefault()

          // Send a pointerup event into the currently highlighted option
          triggerHighlightedOption()

          return
        default:
          break
      }

      // If not a command, check for typeahead
      if (isValidTypeaheadChar(key)) {
        // Skip typeahead logic when we're focused in the search input
        if (isFocusedInSearch) {
          return
        }

        // Extend the current typeahead and get the latest value
        const currentTypeaheadValue = typeahead(key)

        // Stop other listeners from reacting
        evt.stopPropagation()

        // Attempt to filter options based on the value, starting at the highlighted value
        const firstMatchingOption = getTypeaheadOption(props.options, currentTypeaheadValue, currentHighlightedValue)

        if (firstMatchingOption) {
          const matchedNode = findOptionByValue(firstMatchingOption.value, menuElement)

          // Only change the highlight if we found the actual node
          if (matchedNode) {
            highlightedValue.value = firstMatchingOption.value
            // Ensure the newly highlighted option is scrolled into view
            matchedNode.scrollIntoView({ block: "nearest" })
          }
        }
      }
    }

    provide(CustomSelectMenuContextKey, {
      openingValue,
      listId,
      requestClose,
      listRef,
      highlightedValue,
      searchTerm,
      searchInputRef,
    })

    // On mount behavior
    onMounted(() => {
      // Like React's mount effect, the scroll target is the highlight at mount
      const initialHighlightedValue = highlightedValue.value

      // Ensure initial highlighted option is in view
      // NOTE: Allowing for a render frame ensures content is positioned correctly before scrolling it into view.
      waitForAnimationFrame(() => {
        if (!menuRef.value) {
          return
        }

        // Ensure the highlighted option is in view
        const currentOption = findOptionByValue(initialHighlightedValue, menuRef.value)
        // Scroll the selected item into view, and its bottom edge.
        currentOption?.scrollIntoView({ block: "center" })
      })

      // Send initial focus to the menu container or search input, to capture key events
      const autoFocusTarget = searchInputRef.value || menuRef.value
      if (autoFocusTarget) focusMounted(autoFocusTarget)
    })

    // On search behavior (React's layout effect on `filteredOptions`, skipped on mount)
    watch(
      filteredOptions,
      (nextFilteredOptions) => {
        // Impossible while mounted, list ref will exist
        if (!listRef.value) {
          return
        }

        // Reset scroll position to the top
        listRef.value.scrollTop = 0

        // Highlight first item in the list
        const maybeFirstOption = getFirstValidOption(nextFilteredOptions)
        if (maybeFirstOption) highlightedValue.value = maybeFirstOption.value
      },
      { flush: "post" },
    )

    return () =>
      h(
        "div",
        { id: listId, class: s.MenuInner, onKeydown: handleKeyDown, ref: menuRef, tabindex: 0 },
        [
          searchable.value
            ? h(CustomSelectSearch, {
                "value": searchTerm.value,
                "onUpdate:value": (next: string) => {
                  searchTerm.value = next
                },
              })
            : null,
          h(CustomSelectList, { filteredOptions: filteredOptions.value }),
          h(CustomSelectActions),
        ],
      )
  },
})

const CustomSelectSearch = defineComponent({
  name: "CustomSelectSearch",
  props: {
    value: { type: String, required: true },
  },
  emits: {
    "update:value": (_value: string) => true,
  },
  setup(props, { emit }) {
    const { props: selectProps } = useSelectContext()
    const { listId, searchInputRef } = useCustomSelectMenuContext()
    const searchRef = shallowRef<HTMLElement | null>(null)

    // React's `ref` on Input is its <input>. Read before the menu's mount
    // focus runs (child mounted hooks run first); an exposed component ref
    // is not populated that early.
    onMounted(() => {
      searchInputRef.value = searchRef.value?.querySelector("input") ?? null
    })
    onBeforeUnmount(() => {
      searchInputRef.value = null
    })

    return () =>
      h("div", { class: s.Search, ref: searchRef }, [
        h(
          Input,
          {
            "value": props.value,
            "placeholder": selectProps.searchPlaceholder,
            "aria-label": selectProps.searchAriaLabel,
            "onUpdate:value": (next: string) => emit("update:value", next),
            // The native attribute: it reaches the <input> whether or not
            // Input forwards its `autoComplete` prop (React's Input does)
            "autocomplete": "off",
            "autocorrect": "off",
            "spellcheck": false,
            "aria-autocomplete": "list",
            "role": "combobox",
            "aria-controls": listId,
            "aria-expanded": true,
          },
          {
            startAdornment: () =>
              h(Search, { width: 16, height: 16, class: "fill-secondary", fill: "var(--color-text-secondary)" }),
          },
        ),
      ])
  },
})

const isOptionGroup = <T extends Option>(mixedOption: T | OptionGroup<T>): mixedOption is OptionGroup<T> => {
  return "options" in mixedOption
}

const isOptionGroupArray = <T extends Option>(arr: Options<T>): arr is OptionGroup<T>[] => {
  return !!arr[0] && isOptionGroup(arr[0])
}

const HARD_OPTIONS_LIMIT = 300

const CustomSelectList = defineComponent({
  name: "CustomSelectList",
  props: {
    filteredOptions: { type: Array as PropType<Options<Option>>, required: true },
  },
  setup(props) {
    const { props: selectProps, slots, slotsVersion } = useSelectContext()
    const { listRef } = useCustomSelectMenuContext()
    const setListRef = (el: unknown) => {
      listRef.value = (el as HTMLElement | null) ?? null
    }

    return () => {
      void slotsVersion.value
      const { filteredOptions } = props

      if (!filteredOptions.length) {
        if (slots.searchEmptyMessage) {
          return h("div", { class: s.SearchEmpty }, slots.searchEmptyMessage())
        }

        const { searchEmptyMessage } = selectProps
        return typeof searchEmptyMessage === "string"
          ? h("p", { "class": s.SearchEmpty, "data-text-only": "true" }, searchEmptyMessage)
          : h("div", { class: s.SearchEmpty }, [searchEmptyMessage as VNodeChild])
      }

      // We hard limit within groups, so at this level we will only limit flat arrays
      const isGrouped = isOptionGroupArray(filteredOptions)
      const hasHardLimit = !isGrouped && filteredOptions.length > HARD_OPTIONS_LIMIT

      const options = isGrouped
        ? filteredOptions.map((group) => h(CustomSelectGroup, { key: group.label, group }))
        : (filteredOptions as Option[])
            .slice(0, HARD_OPTIONS_LIMIT)
            .map((option) => h(CustomSelectOption, { key: option.value, option }))

      return h("div", { class: s.OptionsList, ref: setListRef }, [
        ...options,
        hasHardLimit ? h(CustomSelectHardLimit, { numHidden: filteredOptions.length - HARD_OPTIONS_LIMIT }) : null,
      ])
    }
  },
})

const DEFAULT_OPTIONS_LIMIT = {
  limit: 100,
  label: "Show all",
}

const CustomSelectGroup = defineComponent({
  name: "CustomSelectGroup",
  props: {
    group: { type: Object as PropType<OptionGroup<Option>>, required: true },
  },
  setup(props) {
    const groupId = useId()
    const { searchTerm, highlightedValue } = useCustomSelectMenuContext()
    const limitExpanded = ref(false)

    return () => {
      const { label, options, optionsLimit = DEFAULT_OPTIONS_LIMIT } = props.group
      const hasExpandableLimit = optionsLimit.limit < options.length && !searchTerm.value && !limitExpanded.value
      const hasHardLimit = HARD_OPTIONS_LIMIT < options.length && !hasExpandableLimit

      let maybeLimitedOptions = options
      if (hasExpandableLimit) {
        maybeLimitedOptions = options.slice(0, optionsLimit.limit)
      } else if (hasHardLimit) {
        maybeLimitedOptions = options.slice(0, HARD_OPTIONS_LIMIT)
      }

      const handleLimitExpanded = () => {
        // Expand options
        limitExpanded.value = true

        // Set highlight to the first option from the newly expanded list
        highlightedValue.value = options[optionsLimit.limit]!.value
      }

      // NOTE: Important for crawling that groups are flat
      return [
        // No indicator slot: the heading labels the whole section
        h("div", { class: s.OptionGroupHeading }, label),
        ...maybeLimitedOptions.map((option) => h(CustomSelectOption, { key: option.value, option })),
        hasExpandableLimit
          ? h(CustomSelectExpandableLimit, {
              value: `group-limit-${groupId}`,
              label: optionsLimit.label,
              onPointerUp: handleLimitExpanded,
            })
          : null,
        hasHardLimit ? h(CustomSelectHardLimit, { numHidden: options.length - HARD_OPTIONS_LIMIT }) : null,
      ]
    }
  },
})

const CustomSelectHardLimit = defineComponent({
  name: "CustomSelectHardLimit",
  props: {
    numHidden: { type: Number, required: true },
  },
  setup(props) {
    const { props: selectProps } = useSelectContext()

    return () =>
      h("div", { class: s.OptionHardLimitHeading }, [
        // The note lines up with the option labels above it, so it borrows their indicator column.
        selectProps.checkPosition === "start" ? h("div", { class: s.OptionIndicatorSlot }) : null,
        `…and ${props.numHidden.toLocaleString()} more options. Use search to refine results further.`,
      ])
  },
})

const CustomSelectExpandableLimit = defineComponent({
  name: "CustomSelectExpandableLimit",
  props: {
    value: { type: String, required: true },
    label: { type: String, required: true },
    onPointerUp: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const { props: selectProps } = useSelectContext()
    const { highlightedValue } = useCustomSelectMenuContext()

    const handlePointerMove = () => {
      if (props.value === highlightedValue.value) {
        return
      }

      highlightedValue.value = props.value
    }

    const handlePointerLeave = () => {
      // Clear the highlight only if it is this one
      if (highlightedValue.value === props.value) {
        highlightedValue.value = ""
      }
    }

    // This component acts a LOT like an Option, but has enough bespoke behavior
    // that it cannot literally be one.
    return () => {
      const isHighlighted = props.value === highlightedValue.value

      return h(
        "div",
        {
          "class": clsx(s.Option, s.OptionsLimit),
          "data-option-id": props.value,
          "data-highlight": isHighlighted ? "" : undefined,
          "role": "option",
          "aria-selected": isHighlighted,
          "onPointerup": props.onPointerUp,
          "onPointermove": handlePointerMove,
          "onPointerleave": handlePointerLeave,
        },
        [
          h("div", { class: clsx(s.PressableInner, s.OptionInner) }, [
            // The row lines up with the option labels above it, so it borrows their indicator column.
            selectProps.checkPosition === "start" ? h("div", { class: s.OptionIndicatorSlot }) : null,
            props.label,
          ]),
        ],
      )
    }
  },
})

const INTERNAL_DOM_SELECTION_DATA_ATTR = "data-option-id"

const CustomSelectOption = defineComponent({
  name: "CustomSelectOption",
  props: {
    option: { type: Object as PropType<Option>, required: true },
  },
  setup(props) {
    const { props: selectProps, slots, slotsVersion, onSelect } = useSelectContext()
    const { openingValue, requestClose, highlightedValue } = useCustomSelectMenuContext()

    // NOTE: SingleSelect mode keeps the opening value instead of the live value
    // to avoid selecting the item as the select closes.
    const isSelected = () =>
      selectProps.multiple
        ? (selectProps.value as string[]).includes(props.option.value)
        : props.option.value === openingValue

    const handlePointerUp = () => {
      if (selectProps.multiple) {
        // Trigger the change, optionally as a remove
        onSelect(props.option, isSelected())
      } else {
        onSelect(props.option)
        // Request the dropdown to close
        requestClose()
      }
    }

    const handlePointerMove = () => {
      if (props.option.value === highlightedValue.value) {
        return
      }

      highlightedValue.value = props.option.value
    }

    const handlePointerLeave = () => {
      // Clear the highlight only if it is this one, removing the active highlight on the menu.
      if (highlightedValue.value === props.option.value) {
        highlightedValue.value = ""
      }
    }

    const renderOptionView = (option: Option): VNodeChild => {
      if (slots.optionView) return slots.optionView(option)
      if (selectProps.OptionView) return h(selectProps.OptionView, option)
      return option.label
    }

    const renderTooltip = (tooltip: NonNullable<Option["tooltip"]>) => {
      const content = tooltip.content
      return typeof content === "function"
        ? h(Tooltip, { maxWidth: tooltip.maxWidth, side: "right" }, { default: () => h(Info), content })
        : h(Tooltip, { content, maxWidth: tooltip.maxWidth, side: "right" }, { default: () => h(Info) })
    }

    return () => {
      void slotsVersion.value
      const { option } = props
      const { value, disabled, tooltip } = option
      const selected = isSelected()
      const isHighlighted = value === highlightedValue.value
      const checkPosition = selectProps.checkPosition

      return h(
        "div",
        {
          "class": clsx(s.Option, selectProps.optionClassName),
          "data-highlight": isHighlighted ? "" : undefined,
          "role": "option",
          "aria-selected": isHighlighted,
          "data-selected": selected ? "" : undefined,
          // Internal attribute for selecting DOM nodes
          [INTERNAL_DOM_SELECTION_DATA_ATTR]: value,
          // Allow options to behave like a native select, when you can open and select an item in a single click
          "onPointerup": disabled ? undefined : handlePointerUp,
          // Pointer move prevents contention between keyboard presses and a still mouse
          "onPointermove": disabled ? undefined : handlePointerMove,
          "onPointerleave": disabled ? undefined : handlePointerLeave,
          "aria-disabled": disabled,
          "data-disabled": disabled ? "" : undefined,
        },
        [
          h("div", { class: s.PressableInner }, [
            checkPosition === "start"
              ? h("div", { "class": s.OptionIndicatorSlot, "data-position": "start" }, [
                  selected ? h(Check, { class: s.OptionCheck }) : null,
                ])
              : null,
            h("div", { class: s.OptionLeading }, [
              h("div", { class: s.OptionInner }, [renderOptionView(option), tooltip ? renderTooltip(tooltip) : null]),
              // React's `description && ...`: a 0 (or NaN) renders as text
              option.description &&
                h("div", { class: clsx(s.OptionInner, s.OptionDescription) }, [renderContent(option.description)]),
            ]),
            checkPosition === "end"
              ? h("div", { "class": s.OptionIndicatorSlot, "data-position": "end" }, [
                  selected ? h(Check, { class: s.OptionCheck }) : null,
                ])
              : null,
          ]),
        ],
      )
    }
  },
})

const CustomSelectActions = defineComponent({
  name: "CustomSelectActions",
  setup() {
    const { actions } = useSelectContext()

    return () => {
      if (actions.value.length === 0) {
        return null
      }

      return h(
        "div",
        { class: s.ActionsContainer },
        actions.value.map((action) => h(CustomSelectAction, { key: action.id, action })),
      )
    }
  },
})

/**
 * React handles events of the portalled menu at <body> and stops a synthetic
 * event there: <body>'s own listeners (the Escape stack) still run, the
 * document's and window's do not. Stopping the native event here instead
 * would keep it from <body>.
 */
const stopAfterBody = (evt: Event) => {
  const body = (evt.currentTarget as Node | null)?.ownerDocument?.body
  if (!body) {
    evt.stopPropagation()
    return
  }
  body.addEventListener(
    evt.type,
    (event) => {
      if (event === evt) event.stopPropagation()
    },
    { once: true },
  )
}

const CustomSelectAction = defineComponent({
  name: "CustomSelectAction",
  props: {
    action: { type: Object as PropType<SelectAction>, required: true },
  },
  setup(props) {
    const { onActionSelect } = useSelectContext()
    const { requestClose } = useCustomSelectMenuContext()

    const handlePointerUp = () => {
      // Trigger the action through the context helper, not the method on this action (it may be a stale reference)
      onActionSelect(props.action.id)
      // Request to close the dropdown
      requestClose()
    }

    const handleKeyDown = (evt: KeyboardEvent) => {
      const key = evt.key

      switch (key) {
        case "Tab":
          // Allow tabbing to pass propagation as normal, which bubbles up to the focus scope
          break
        case "Enter":
        case " ":
          evt.stopPropagation()
          handlePointerUp()
          break
        case "Escape":
          // The menu's key handler ignores Escape; the Escape stack on <body> closes the menu
          stopAfterBody(evt)
          break
        default:
          evt.stopPropagation()
      }
    }

    return () => {
      const { label, Icon, className } = props.action
      return h("div", { class: s.Action, onPointerup: handlePointerUp, onKeydown: handleKeyDown, tabindex: 0 }, [
        h("div", { class: clsx(s.ActionInner, className) }, [Icon ? h(Icon, { role: "presentation" }) : null, label]),
      ])
    }
  },
})

// ============================================================
// Utilities
// ============================================================
const defaultSearchPredicate = (option: Option, searchTerm: string) => option.label.toLowerCase().includes(searchTerm)

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
    return (options as T[]).reduce((acc, option) => {
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

const findNextOption = (currentValue: string, container: HTMLElement) => {
  const currentOption = findOptionByValue(currentValue, container)

  let nextNode = currentOption?.nextElementSibling
  let maxSteps = 0

  while (nextNode && maxSteps < MAX_DOM_CRAWLS) {
    if (isValidOptionNode(nextNode)) {
      return nextNode
    }

    nextNode = nextNode.nextElementSibling
    maxSteps += 1
  }
}

const findPreviousOption = (currentValue: string, container: HTMLElement) => {
  const currentOption = findOptionByValue(currentValue, container)

  let nextNode = currentOption?.previousElementSibling
  let maxSteps = 0

  while (nextNode && maxSteps < MAX_DOM_CRAWLS) {
    if (isValidOptionNode(nextNode)) {
      return nextNode
    }

    nextNode = nextNode.previousElementSibling
    maxSteps += 1
  }
}

const createTypeahead = () => {
  let currentValue: string = ""
  let timeoutId: ReturnType<typeof setTimeout> | undefined

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
    const isCycling = char.repeat(currentValue.length) === currentValue

    // Return the typeahead value
    return isCycling ? char : currentValue
  }
}

const isValidTypeaheadChar = (char: string): boolean => /^[a-zA-Z0-9]$/.test(char)

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
  let matchAfterHighlight: T | undefined
  // If we aren't provided a highlighted value, start from the top (e.g., act like it's found)
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
            matchAfterHighlight = option
            // We're done after we've found an after match
            break
          } else {
            // Keep the first found "before" match
            matchBeforeHighlight = matchBeforeHighlight || option
          }
        }
      }
    } else {
      if (optionValidAndMatches(opt)) {
        if (foundHighlightedValue) {
          matchAfterHighlight = opt
          // We're done after we've found an after match
          break
        } else {
          // Keep the first found "before" match
          matchBeforeHighlight = matchBeforeHighlight || opt
        }
      }
    }
  }

  return matchAfterHighlight || matchBeforeHighlight
}

export type SelectProps = InstanceType<typeof SelectComponent>["$props"]

/**
 * Select dropdown with option groups, descriptions, search (over 15
 * options), multiple selection and actions. Bind `v-model:value`.
 */
export const Select = SelectComponent
