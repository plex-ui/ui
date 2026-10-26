import clsx from "clsx"
import { defineComponent, h, shallowRef, useId, type PropType } from "vue"
import { FieldError } from "../FieldError/index.js"
import { Button } from "../Button/index.js"
import { Dropdown, X } from "../Icon/index.js"
import s from "@plexui/styles/components/FloatingLabelSelect/FloatingLabelSelect.module.css"

type Listener = (event: KeyboardEvent) => void

const callListeners = (listeners: unknown, event: KeyboardEvent) => {
  const list = Array.isArray(listeners) ? listeners : [listeners]
  for (const listener of list) {
    if (typeof listener === "function") (listener as Listener)(event)
  }
}

/**
 * Port of packages/ui/src/components/FloatingLabelSelect/FloatingLabelSelect.tsx.
 * A select trigger shell: `class` goes to the root, every other attribute
 * and listener to the `role="button"` field, spread after the component's
 * own (so, as in React, a consumer `@pointerdown` replaces the built-in
 * one, while a consumer `@keydown` runs before the built-in handling).
 * `onClearClick` (`@clear-click`) and `onInteract` (`@interact`) are function
 * props, as in React: the clear button renders only when the first is set,
 * and without the second, the keys that open the field click it instead, so
 * a wrapping trigger (Select's `#trigger`) opens from the keyboard too.
 * A parent's ref resolves `$el` to the field, as React forwards its ref there.
 */
export const FloatingLabelSelect = defineComponent({
  name: "FloatingLabelSelect",
  inheritAttrs: false,
  props: {
    /** Label text for the floating label */
    label: { type: String, required: true },
    /** Whether a value is selected: floats the label and shows the default slot. @default false */
    selected: { type: Boolean, default: false },
    /** Error message to display below the field */
    errorMessage: String,
    /** Mark the field as invalid. @default false (or true if errorMessage is provided) */
    invalid: { type: Boolean, default: undefined },
    /** Disables the field visually and from interactions. @default false */
    disabled: { type: Boolean, default: false },
    /** Whether the attached list is open. @default false */
    open: { type: Boolean, default: false },
    /** Shows the clear button (when selected and enabled); called when it is clicked */
    onClearClick: Function as PropType<() => void>,
    /** Called on pointer down, ArrowDown, ArrowUp and Space on the field (`@interact`) */
    onInteract: Function as PropType<() => void>,
  },
  setup(props, { attrs, slots, expose }) {
    const generatedId = useId()
    const errorId = `floating-label-select-${generatedId}-error`
    const fieldRef = shallowRef<HTMLElement | null>(null)

    // React forwards its ref to the field: a wrapping trigger returns focus
    // to it and anchors to it, not to the root that also holds the error
    expose(Object.defineProperty({}, "$el", { enumerable: true, get: () => fieldRef.value }))

    const handlePointerDown = (evt: PointerEvent) => {
      if (evt.button === 2 || props.disabled) return
      evt.preventDefault()
      props.onInteract?.()
    }

    const handleKeyDown = (evt: KeyboardEvent) => {
      // Enter and Space on a nested control (the clear button) activate that
      // control: neither this handler nor a wrapping trigger's may take them
      if (evt.target !== evt.currentTarget && (evt.key === " " || evt.key === "Enter")) return
      callListeners(attrs.onKeydown, evt)
      // A handler that prevented the default (the caller's, or a wrapping
      // MenuTrigger's that opened its menu) cancels the built-in handling
      if (props.disabled || evt.defaultPrevented) return

      switch (evt.key) {
        case "ArrowDown":
        case "ArrowUp":
        case " ":
        case "Enter":
          // Enter activates the field only without onInteract, as it
          // would the button a wrapping trigger usually renders
          if (evt.key === "Enter" && props.onInteract) break
          evt.stopPropagation()
          evt.preventDefault()
          if (props.onInteract) {
            props.onInteract()
          } else {
            // A wrapping trigger (Select's `#trigger`, a PopoverTrigger) opens on click
            ;(evt.currentTarget as HTMLElement).click()
          }
          break
      }
    }

    const handleClearPointerDown = (evt: PointerEvent) => {
      evt.stopPropagation()
    }

    const handleClearClick = (evt: MouseEvent) => {
      evt.stopPropagation()
      evt.preventDefault()
      props.onClearClick?.()
    }

    return () => {
      const { selected, disabled, open, errorMessage } = props
      const {
        "class": className,
        "aria-describedby": ariaDescribedByAttr,
        "onKeydown": _onKeydown,
        ...restAttrs
      } = attrs

      const invalid = props.invalid ?? !!errorMessage

      const showClearButton = !!props.onClearClick && selected && !disabled

      const ariaDescribedBy =
        [ariaDescribedByAttr as string | undefined, errorMessage ? errorId : undefined].filter(Boolean).join(" ") ||
        undefined

      return h("div", { class: clsx(s.Root, className as string | undefined) }, [
        h(
          "div",
          {
            "ref": fieldRef,
            "class": clsx(s.FieldFootprint, { [s.HasValue!]: selected }),
            "role": "button",
            "tabindex": disabled ? -1 : 0,
            "data-open": open ? "" : undefined,
            "data-invalid": invalid ? "" : undefined,
            "data-disabled": disabled ? "" : undefined,
            "aria-expanded": open,
            "aria-haspopup": "listbox",
            "aria-invalid": invalid ? true : undefined,
            "aria-describedby": ariaDescribedBy,
            "aria-disabled": disabled || undefined,
            "onPointerdown": handlePointerDown,
            "onKeydown": handleKeyDown,
            ...restAttrs,
          },
          [
            h("div", { class: s.TypeableLabel }, [
              h("div", { class: s.LabelPositioner }, [h("div", { class: s.LabelText }, props.label)]),
            ]),
            h("span", { class: s.Content }, selected ? slots.default?.() : undefined),
            h("div", { class: s.IndicatorWrapper }, [
              showClearButton
                ? h(
                    Button,
                    {
                      "aria-label": "Clear selection",
                      "class": s.Clear,
                      "onPointerdown": handleClearPointerDown,
                      "onClick": handleClearClick,
                      "color": "secondary",
                      "variant": "ghost",
                      "size": "3xs",
                      "uniform": true,
                      "pill": true,
                    },
                    { default: () => [h(X)] },
                  )
                : null,
              h(Dropdown, { class: s.DropdownIcon }),
            ]),
          ],
        ),
        errorMessage ? h(FieldError, { id: errorId, class: s.ErrorMessage }, { default: () => [errorMessage] }) : null,
      ])
    }
  },
})

export type FloatingLabelSelectProps = InstanceType<typeof FloatingLabelSelect>["$props"]
