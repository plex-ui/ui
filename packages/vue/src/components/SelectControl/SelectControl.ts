import clsx, { type ClassValue } from "clsx"
import { defineComponent, h, shallowRef, type Component, type HTMLAttributes, type PropType } from "vue"
import type { ControlSize, Variants } from "@plexui/styles/types"
import { handlePressableMouseEnter } from "../../lib/helpers.js"
import { isHoverPointer } from "../../lib/inputMode.js"
import { isNestedSelectControl } from "../../lib/selectPress.js"
import { Button } from "../Button/index.js"
import { ChevronDown, Dropdown, X } from "../Icon/index.js"
import { LoadingIndicator } from "../Indicator/index.js"
import s from "@plexui/styles/components/SelectControl/SelectControl.module.css"

// Mouse press-drag-select and touch/assistive click activation mirror React.
// Nested clear controls keep their own button semantics.

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
    /** Enter interacts too, as on a combobox button. Off by default, as Enter may be an attempt to submit a form. @default false */
    interactOnEnter: { type: Boolean, default: false },
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
    let mouseClickHandled = false

    // Act like a <button> and fire the click handler on keyboard actions
    const handleKeyDown = (evt: KeyboardEvent) => {
      // Enter and Space on a nested control (the clear button) activate that
      // control: neither this handler nor a wrapping trigger's may take them
      if (evt.target !== evt.currentTarget && (evt.key === " " || evt.key === "Enter")) {
        return
      }
      callListener(attrs.onKeydown, evt)
      if (evt.defaultPrevented || evt.isComposing || evt.keyCode === 229) return
      switch (evt.key) {
        case "Enter":
        case "ArrowDown":
        case "ArrowUp":
        case " ":
          // NOTE: "Enter" may be an attempt to submit a form
          if (evt.key === "Enter" && !props.interactOnEnter) {
            break
          }

          evt.stopPropagation()
          evt.preventDefault()

          controlRef.value?.click()
          break
        default:
          break
      }
    }

    const handlePointerDown = (evt: PointerEvent) => {
      mouseClickHandled = false
      if (isNestedSelectControl(evt)) return
      callListener(attrs.onPointerdown, evt)
      if (evt.defaultPrevented) {
        mouseClickHandled = true
        return
      }
      if (evt.button !== 0) return
      if (evt.pointerType === "pen" || !isHoverPointer(evt)) return
      evt.stopPropagation()
      mouseClickHandled = true
      if (props.onInteract) {
        evt.preventDefault()
        props.onInteract()
      } else {
        callListener(attrs.onClick, evt)
      }
    }

    const handleClick = (evt: MouseEvent) => {
      const handled = mouseClickHandled
      mouseClickHandled = false
      if (props.disabled || props.loading || evt.defaultPrevented || evt.button !== 0 || isNestedSelectControl(evt)) return
      if (handled && evt.detail !== 0) return
      evt.stopPropagation()
      if (props.onInteract) props.onInteract()
      else callListener(attrs.onClick, evt)
    }

    const handleClearClick = (evt: MouseEvent) => {
      evt.stopPropagation()
      evt.preventDefault()
      if (props.disabled || props.loading) return
      // The clear button disappears when the value becomes empty.
      controlRef.value?.focus({ preventScroll: true })
      props.onClearClick?.()
    }

    return () => {
      const {
        class: className,
        onPointerenter,
        ...restAttrs
      } = attrs as Record<string, unknown> & { onPointerenter?: Listener }
      delete restAttrs.onPointerdown
      delete restAttrs.onPointercancel
      delete restAttrs.onKeydown
      delete restAttrs.onClick
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
          "data-slot": "select-control",
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
          "onClick": handleClick,
          "onPointercancel": (evt: PointerEvent) => {
            mouseClickHandled = false
            callListener(attrs.onPointercancel, evt)
          },
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
        ? h(ChevronDown, { "data-no-autosize": "", class: clsx(s.DropdownIcon, s.DropdownIconChevron) })
        : h("span", { class: s.DropdownIcon, "aria-hidden": "true" }, [
            h(Dropdown, { "data-no-autosize": "", class: s.DropdownGlyph }),
            h("svg", { "data-no-autosize": "", class: s.MobileDropdownGlyph, width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true" }, [
              h("path", {
                d: "M9.41074 2.74408C9.73618 2.41864 10.2638 2.41864 10.5893 2.74408L14.7559 6.91074C15.0814 7.23618 15.0814 7.76382 14.7559 8.08926C14.4305 8.41469 13.9028 8.41469 13.5774 8.08926L10 4.51184L6.42259 8.08926C6.09715 8.41469 5.56951 8.41469 5.24408 8.08926C4.91864 7.76382 4.91864 7.23618 5.24408 6.91074L9.41074 2.74408ZM5.24408 11.9107C5.56951 11.5853 6.09715 11.5853 6.42259 11.9107L10 15.4882L13.5774 11.9107C13.9028 11.5853 14.4305 11.5853 14.7559 11.9107C15.0814 12.2362 15.0814 12.7638 14.7559 13.0893L10.5893 17.2559C10.2638 17.5814 9.73618 17.5814 9.41074 17.2559L5.24408 13.0893C4.91864 12.7638 4.91864 12.2362 5.24408 11.9107Z",
                fill: "currentColor",
                "fill-rule": "evenodd",
                "clip-rule": "evenodd",
              }),
            ]),
          ])
  },
})
