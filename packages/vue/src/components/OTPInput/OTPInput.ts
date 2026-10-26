import clsx from "clsx"
import { computed, defineComponent, h, nextTick, onMounted, onUpdated, ref, useId, watch, type PropType } from "vue"
import { FieldError } from "../FieldError/index.js"
import s from "@plexui/styles/components/OTPInput/OTPInput.module.css"

function sanitizeDigits(value: string, length: number): string {
  return value.replace(/\D/g, "").slice(0, length)
}

function shouldShowGap(index: number, grouping: number[]): boolean {
  let pos = 0
  for (const groupSize of grouping) {
    pos += groupSize
    if (index === pos) return true
  }
  return false
}

/**
 * Port of packages/ui/src/components/OTPInput/OTPInput.tsx. Controlled with
 * `value` (`v-model:value`); emits `update:value` and `change` when the
 * digits change and `complete` when every cell is filled.
 */
export const OTPInput = defineComponent({
  name: "OTPInput",
  inheritAttrs: false,
  props: {
    /** Number of digit cells. @default 6 */
    length: { type: Number, default: 6 },
    value: String,
    /** Group sizes, e.g. [3, 3] puts a gap after the third cell */
    grouping: Array as PropType<number[]>,
    invalid: { type: Boolean, default: false },
    errorMessage: String,
    disabled: { type: Boolean, default: false },
    autoFocus: { type: Boolean, default: false },
  },
  emits: {
    "update:value": (_value: string) => true,
    "change": (_value: string) => true,
    "complete": (_value: string) => true,
  },
  setup(props, { attrs, emit, expose }) {
    const length = computed(() => Math.max(1, Math.floor(props.length)))
    const controlledValue = computed(() => sanitizeDigits(props.value ?? "", length.value))
    const isControlled = computed(() => props.value !== undefined)

    const internalValue = ref(sanitizeDigits(props.value ?? "", length.value))
    const focusedIndex = ref(-1)

    const rootRef = ref<HTMLDivElement | null>(null)
    const inputRefs: Array<HTMLInputElement | null> = []

    expose({ root: rootRef })

    watch(
      [controlledValue, isControlled, length],
      () => {
        if (isControlled.value) {
          internalValue.value = controlledValue.value
          return
        }
        internalValue.value = sanitizeDigits(internalValue.value, length.value)
      },
    )

    const currentValue = computed(() => (isControlled.value ? controlledValue.value : internalValue.value))
    const digits = computed(() => Array.from({ length: length.value }, (_, index) => currentValue.value[index] ?? ""))

    const errorId = `otp-input-${useId()}-error`

    // Inputs mirror `digits` like React's controlled inputs, which undo any
    // typing the state did not take
    const syncInputs = () => {
      digits.value.forEach((digit, index) => {
        const input = inputRefs[index]
        if (input && input.value !== digit) input.value = digit
      })
    }
    onUpdated(syncInputs)

    // React's effect on [autoFocus, disabled]: on mount and on either change
    const runAutoFocus = () => {
      if (!props.autoFocus || props.disabled) return
      inputRefs[0]?.focus()
    }
    onMounted(runAutoFocus)
    watch([() => props.autoFocus, () => props.disabled], runAutoFocus, { flush: "post" })

    const commitValue = (nextValueRaw: string) => {
      const nextValue = sanitizeDigits(nextValueRaw, length.value)
      const previous = currentValue.value
      if (!isControlled.value) {
        internalValue.value = nextValue
      }
      if (nextValue !== previous) {
        emit("update:value", nextValue)
        emit("change", nextValue)
      }
      if (nextValue.length === length.value) {
        emit("complete", nextValue)
      }
      void nextTick(syncInputs)
      return nextValue
    }

    const focusCell = (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, length.value - 1))
      const input = inputRefs[clampedIndex]
      if (!input) return
      input.focus()
      input.setSelectionRange(1, 1)
    }

    const handleCellClick = (index: number) => {
      if (props.disabled) return
      focusCell(index)
    }

    const handlePaste = (index: number, evt: ClipboardEvent) => {
      if (props.disabled) return
      evt.preventDefault()
      const pastedDigits = sanitizeDigits(evt.clipboardData?.getData("text") ?? "", length.value)
      if (!pastedDigits) return

      const nextDigits = [...digits.value]
      let writeIndex = index

      for (const digit of pastedDigits) {
        if (writeIndex >= length.value) break
        nextDigits[writeIndex] = digit
        writeIndex += 1
      }

      const nextValue = commitValue(nextDigits.join(""))
      focusCell(Math.min(nextValue.length, length.value - 1))
    }

    const handleChange = (index: number, evt: Event) => {
      if (props.disabled) return
      const typedDigits = (evt.currentTarget as HTMLInputElement).value.replace(/\D/g, "")

      if (!typedDigits) {
        const nextDigits = [...digits.value]
        nextDigits[index] = ""
        commitValue(nextDigits.join(""))
        return
      }

      const nextDigits = [...digits.value]

      if (typedDigits.length === 1) {
        nextDigits[index] = typedDigits[0]!
        const nextValue = commitValue(nextDigits.join(""))
        if (index < length.value - 1 && nextValue.length > index) {
          focusCell(index + 1)
        }
        return
      }

      let writeIndex = index
      for (const digit of typedDigits) {
        if (writeIndex >= length.value) break
        nextDigits[writeIndex] = digit
        writeIndex += 1
      }

      const nextValue = commitValue(nextDigits.join(""))
      focusCell(Math.min(nextValue.length, length.value - 1))
    }

    const handleKeyDown = (index: number, evt: KeyboardEvent) => {
      if (props.disabled) return

      if (evt.key === "Backspace") {
        evt.preventDefault()
        const nextDigits = [...digits.value]

        if (nextDigits[index]) {
          nextDigits[index] = ""
          commitValue(nextDigits.join(""))
          return
        }

        if (index > 0) {
          nextDigits[index - 1] = ""
          commitValue(nextDigits.join(""))
          focusCell(index - 1)
        }
        return
      }

      if (evt.key === "Delete") {
        evt.preventDefault()
        const nextDigits = [...digits.value]
        nextDigits[index] = ""
        commitValue(nextDigits.join(""))
        return
      }

      if (evt.key === "ArrowLeft") {
        evt.preventDefault()
        focusCell(index - 1)
        return
      }

      if (evt.key === "ArrowRight") {
        evt.preventDefault()
        focusCell(index + 1)
      }
    }

    const handleBlur = () => {
      requestAnimationFrame(() => {
        const activeElement = document.activeElement
        const isAnyCellFocused = inputRefs.some((input) => input === activeElement)
        if (!isAnyCellFocused) {
          focusedIndex.value = -1
        }
      })
    }

    return () =>
      h("div", { ref: rootRef, class: clsx(s.Root, attrs.class as string | undefined) }, [
        h(
          "div",
          { class: s.Cells },
          Array.from({ length: length.value }, (_, index) => {
            const isGroupGap = props.grouping ? shouldShowGap(index, props.grouping) : false
            return [
              isGroupGap ? h("div", { "class": s.GroupGap, "aria-hidden": "true" }) : null,
              h(
                "div",
                {
                  "class": clsx(s.Cell, {
                    [s.CellFocused!]: focusedIndex.value === index,
                    [s.CellFilled!]: !!digits.value[index],
                  }),
                  "data-invalid": props.invalid ? "" : undefined,
                  "data-disabled": props.disabled ? "" : undefined,
                  "onClick": () => handleCellClick(index),
                },
                [
                  h("input", {
                    "ref": (element: unknown) => {
                      inputRefs[index] = element as HTMLInputElement | null
                    },
                    "type": "text",
                    "inputmode": "numeric",
                    "pattern": "[0-9]",
                    "maxlength": 1,
                    "value": digits.value[index],
                    "disabled": props.disabled,
                    "class": s.CellInput,
                    "onInput": (evt: Event) => handleChange(index, evt),
                    "onKeydown": (evt: KeyboardEvent) => handleKeyDown(index, evt),
                    "onFocus": () => (focusedIndex.value = index),
                    "onBlur": handleBlur,
                    "onPaste": (evt: ClipboardEvent) => handlePaste(index, evt),
                    "aria-label": `Digit ${index + 1}`,
                    "aria-invalid": props.invalid ? true : undefined,
                    "aria-describedby": props.errorMessage ? errorId : undefined,
                    "autocomplete": index === 0 ? "one-time-code" : "off",
                  }),
                  !digits.value[index] && focusedIndex.value !== index ? h("div", { class: s.DotPlaceholder }) : null,
                ],
              ),
            ]
          }).flat(),
        ),
        props.errorMessage
          ? h(FieldError, { id: errorId, class: s.ErrorMessage }, { default: () => props.errorMessage })
          : null,
      ])
  },
})
