import clsx, { type ClassValue } from "clsx"
import { defineComponent, h, shallowRef, type Component, type HTMLAttributes, type PropType } from "vue"
import type { ControlSize, Variants } from "@plexui/styles/types"
import { handlePressableMouseEnter } from "../../lib/helpers.js"
import { Button } from "../Button/index.js"
import { ChevronDown, Dropdown, X } from "../Icon/index.js"
import { LoadingIndicator } from "../Indicator/index.js"
import s from "@plexui/styles/components/SelectControl/SelectControl.module.css"

// Vue port of packages/ui/src/components/SelectControl/SelectControl.tsx.
// - The control is a <span role="button"> that rebuilds <button> semantics,
//   as in React. Every attribute that is not a prop lands on it after the
//   control's own attributes (React spreads its rest props last), and an
//   `onClick` listener is dropped: the control opens on pointer down, like a
//   native select.
// - `onClearClick` and `onInteract` are function props (`@clear-click`,
//   `@interact` in templates): the first one's presence adds the clear
//   button, the second one's changes what pointer down and the keyboard do.
// - `@pointerdown`, `@keydown` and `@pointerenter` listeners are called the
//   way React calls `onPointerDown`, `onKeyDown` and `onPointerEnter`: only
//   while the control is interactive, `@keydown` only for keys the control
//   does not handle, and `@pointerdown` (plus `@click`) only without
//   `onInteract`. This is how a parent trigger (MenuTrigger, PopoverTrigger)
//   opens its content from the control.

export type DropdownIconType = "chevronDown" | "dropdown" | "none"

type Listener = ((...args: never[]) => unknown) | Listener[] | null | undefined

/** Calls a listener attribute, which Vue may hold as an array of handlers. */
const callListener = (listener: unknown, ...args: unknown[]) => {
  if (Array.isArray(listener)) {
    for (const handler of listener) callListener(handler, ...args)
  } else if (typeof listener === "function") {
    ;(listener as (...params: unknown[]) => unknown)(...args)
  }
}

const SelectControlComponent = defineComponent({
  name: "SelectControl",
  inheritAttrs: false,
  props: {
    /** Style variant for the control. @default "outline" */
    variant: { type: String as PropType<Variants<"soft" | "outline" | "ghost">>, default: "outline" },
    /** Determines if the control should be a fully rounded pill shape. @default false */
    pill: { type: Boolean, default: false },
    /** Extends the control to 100% of available width. */
    block: { type: Boolean, default: undefined },
    /** Applies a negative margin using the current gutter to optically align the control with surrounding content. */
    opticallyAlign: String as PropType<"start" | "end">,
    /** Disables the control visually and from interactions. @default false */
    disabled: { type: Boolean, default: undefined },
    /** Visually indicates that the control is in an invalid state. @default false */
    invalid: { type: Boolean, default: undefined },
    /** Indicates that the control is selected. An unselected state will display placeholder styles. @default false */
    selected: { type: Boolean, default: false },
    /** Displays a clear action that allows the select to be unset; called when it is pressed (`@clear-click`). */
    onClearClick: Function as PropType<() => void>,
    /** Primary handler for when the control is selected with pointer or keyboard events (`@interact`). */
    onInteract: Function as PropType<() => void>,
    /** Size and spacing of the control: `3xs` 22px up to `3xl` 48px. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    /** Displays a loading indicator in place of the dropdown icon and clear action. @default false */
    loading: { type: Boolean, default: undefined },
    /** Icon displayed in the far right of the control. @default "dropdown" */
    dropdownIconType: { type: String as PropType<DropdownIconType>, default: "dropdown" },
    /** Icon displayed at the start of the control */
    StartIcon: [Object, Function] as PropType<Component>,
  },
  setup(props, { slots, attrs }) {
    const controlRef = shallowRef<HTMLSpanElement | null>(null)

    // Act like a <button> and fire the click handler on keyboard actions
    const handleKeyDown = (evt: KeyboardEvent) => {
      // Enter and Space on a nested control (the clear button) activate that
      // control: neither this handler nor a wrapping trigger's may take them
      if (evt.target !== evt.currentTarget && (evt.key === " " || evt.key === "Enter")) {
        return
      }
      switch (evt.key) {
        // NOTE: "Enter" does not open selects, as it may be an attempt to submit a form
        case "ArrowDown":
        case "ArrowUp":
        case " ":
          evt.stopPropagation()
          evt.preventDefault()

          if (props.onInteract) {
            props.onInteract()
          } else {
            // Otherwise, send a synthetic trigger event to the parent trigger
            controlRef.value?.dispatchEvent(
              new PointerEvent("pointerdown", {
                bubbles: true,
                cancelable: true,
                pointerType: "mouse", // mimic mouse interaction
              }),
            )
          }
          break
        case "Enter":
          // NOTE: "Enter" does not open selects, as it may be an attempt to submit a form
          break
        default:
          // Allow all other key presses through
          callListener(attrs.onKeydown, evt)
      }
    }

    const handlePointerDown = (evt: PointerEvent) => {
      // Don't trigger on right clicks
      if (evt.button === 2) {
        return
      }

      // Prevent focus from entering the click target of the select
      // so that focus correctly moves into the menu.
      evt.stopPropagation()

      if (props.onInteract) {
        evt.preventDefault()
        props.onInteract()
      } else {
        // NOTE: cannot preventDefault() here, for the parent trigger
        callListener(attrs.onPointerdown, evt)
        // A parent trigger may also pass `onClick` (React's <Popover.Trigger> does).
        // This component opens on pointer down, so call it here, assuming that
        // `onPointerdown` is not going to be responsible for opening.
        callListener(attrs.onClick, evt)
      }
    }

    const handleClearClick = (evt: MouseEvent) => {
      evt.stopPropagation()
      evt.preventDefault()
      props.onClearClick?.()
    }

    return () => {
      const {
        class: className,
        onPointerdown: _onPointerdown,
        onKeydown: _onKeydown,
        onPointerenter,
        onClick: _onClick,
        ...restAttrs
      } = attrs as Record<string, unknown> & { onPointerenter?: Listener }
      const { disabled, loading, selected, pill, dropdownIconType, StartIcon } = props
      const clearable = !!props.onClearClick
      const showClearAction = clearable && selected && !loading && !disabled
      const hasDropdownIcon = dropdownIconType && dropdownIconType !== "none" && !loading
      const hasAnyTertiaryIndicator = showClearAction || loading || hasDropdownIcon
      const isInteractive = !loading && !disabled

      // Intentionally not using <button> and rebuilding the semantics
      return h(
        "span",
        {
          "ref": controlRef,
          "class": clsx(s.SelectControl, className as ClassValue),
          // Recreate <button> semantics
          "role": "button",
          "tabindex": disabled ? -1 : 0,
          "onPointerenter": (evt: PointerEvent) => {
            handlePressableMouseEnter(evt)
            callListener(onPointerenter, evt)
          },
          "onPointerdown": isInteractive ? handlePointerDown : undefined,
          "onKeydown": isInteractive ? handleKeyDown : undefined,
          "data-variant": props.variant,
          "data-block": props.block ? "" : undefined,
          "data-pill": pill ? "" : undefined,
          "data-size": props.size,
          "data-optically-align": props.opticallyAlign,
          "aria-busy": loading ? "true" : undefined,
          "data-selected": selected,
          "data-loading": loading ? "" : undefined,
          "data-invalid": props.invalid ? "" : undefined,
          "data-disabled": disabled ? "" : undefined,
          "aria-disabled": disabled,
          ...restAttrs,
        },
        [
          StartIcon ? h(StartIcon, { class: s.StartIcon }) : null,
          h("span", { class: s.TriggerText }, slots.default?.()),
          hasAnyTertiaryIndicator
            ? h("div", { class: s.IndicatorWrapper }, [
                showClearAction
                  ? h(
                      Button,
                      {
                        "aria-label": "Clear current value",
                        "class": s.Clear,
                        // Prevent pointerdown on the trigger from being captured
                        "onPointerdown": (evt: PointerEvent) => evt.stopPropagation(),
                        "onClick": handleClearClick,
                        "color": "secondary",
                        "variant": hasDropdownIcon ? "ghost" : "solid",
                        // Mostly custom sizing through variables
                        "size": "3xs",
                        "uniform": true,
                        "pill": pill,
                        "data-only-child": !hasDropdownIcon ? "" : undefined,
                      },
                      { default: () => [h(X)] },
                    )
                  : null,
                loading ? h(LoadingIndicator, { class: s.LoadingIndicator }) : null,
                // Using raw SVG canvases (opposed to fixed icon canvases) led to less pixelation.
                hasDropdownIcon ? h(DropdownIcon, { iconType: dropdownIconType }) : null,
              ])
            : null,
        ],
      )
    }
  },
})

type SelectControlOwnProps = InstanceType<typeof SelectControlComponent>["$props"]

/** SelectControl props plus the <span> attributes that fall through to it, as in React. */
export type SelectControlProps = SelectControlOwnProps & Omit<HTMLAttributes, keyof SelectControlOwnProps>

/**
 * The trigger of a select: placeholder styles, start icon, clear action,
 * loading and dropdown indicators. Pair it with any floating UI (MenuTrigger,
 * PopoverTrigger); the default slot is the control's content.
 */
export const SelectControl = SelectControlComponent as typeof SelectControlComponent & {
  new (): { $props: SelectControlProps }
}

export const DropdownIcon = defineComponent({
  name: "DropdownIcon",
  props: {
    iconType: { type: String as PropType<Exclude<DropdownIconType, "none">>, required: true },
  },
  setup(props) {
    return () =>
      props.iconType === "chevronDown"
        ? h(ChevronDown, { class: clsx(s.DropdownIcon, s.DropdownIconChevron) })
        : h(Dropdown, { class: s.DropdownIcon })
  },
})
