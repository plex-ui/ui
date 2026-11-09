import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type PropType,
} from "vue"
import type { Sizes, Variants } from "@plexui/styles/types"
import { toCssVariables } from "../../lib/helpers.js"
import { X } from "../Icon/index.js"
import s from "@plexui/styles/components/TagInput/TagInput.module.css"

export type Tag = {
  value: string
  valid: boolean
}

const SHAKE_ANIMATION_DURATION_MS = 500

/**
 * Port of packages/ui/src/components/TagInput/TagInput.tsx. Controlled with
 * `value` (`v-model:value`), uncontrolled with `defaultValue`; every change
 * emits `update:value` and `change` with the new tag list.
 */
export const TagInput = defineComponent({
  name: "TagInput",
  // React's TagInput takes no extra attributes (Field's aria-describedby and
  // aria-invalid are ignored); the render has several roots, so drop them
  inheritAttrs: false,
  props: {
    /** The state of the tag input when it is initially rendered, used when uncontrolled */
    defaultValue: { type: Array as PropType<Tag[]>, default: () => [] },
    /** The value of the tag input, used to control the tag input */
    value: Array as PropType<Tag[]>,
    /** Allows the tag input to be targeted with `for` */
    id: String,
    /** Corresponds with Input height when rows=1. @default "xl" */
    size: { type: String as PropType<Sizes<"sm" | "md" | "lg" | "xl" | "2xl" | "3xl">>, default: "xl" },
    /** Visual style. `ghost` has no frame, for a field that its container already frames. @default "outline" */
    variant: { type: String as PropType<Variants<"outline" | "ghost">>, default: "outline" },
    /** Placeholder text for the input */
    placeholder: { type: String, default: "" },
    /** Returns whether a value is a valid tag; invalid tags are highlighted. Evaluated on creation only. */
    validator: Function as PropType<(value: string) => boolean>,
    /** The maximum number of tags allowed before the input is disabled; displays a counter below the input */
    maxTags: Number,
    /** Whether to focus this input on mount */
    autoFocus: { type: Boolean, default: false },
    /** The minimum number of rows for the tag input. @default 1 */
    rows: { type: Number, default: 1 },
    /** Controls what characters will count towards creating a new tag. @default [",", " "] */
    delimiters: { type: Array as PropType<string[]>, default: () => [",", " "] },
    /** Disables the tag input visually and from interactions */
    disabled: { type: Boolean, default: undefined },
    /** Fully-rounded container and chips, matching `Input pill` */
    pill: { type: Boolean, default: false },
  },
  emits: {
    "update:value": (tags: Tag[]) => { void tags; return true },
    "change": (tags: Tag[]) => { void tags; return true },
  },
  setup(props, { emit }) {
    // Shallow, like React state: emitted lists hold the caller's tag objects, not proxies
    const internalTags = shallowRef<Tag[]>(props.defaultValue)
    const value = computed(() => props.value ?? internalTags.value)
    const isControlled = computed(() => props.value !== undefined)
    const tags = computed(() => new Map(value.value.map((tag) => [tag.value, tag])))

    const currentInput = ref("")
    const focused = ref(props.autoFocus)
    const selectedTag = ref<string | null>(null)
    const duplicateTags = ref(new Set<string>())

    const inputRef = ref<HTMLInputElement | null>(null)
    const containerRef = ref<HTMLDivElement | null>(null)
    let pendingRemovalFocus: { tag: string; source: HTMLElement } | null = null

    const showInput = computed(() => !props.maxTags || tags.value.size < props.maxTags)
    // A ghost has no frame: the hint stays after the first tag to show where to type.
    const placeholderText = computed(() =>
      tags.value.size === 0 || props.variant === "ghost" ? props.placeholder : undefined,
    )

    // Handle focusing the correct part of the tag input
    watch(
      [focused, selectedTag, showInput],
      () => {
        if (!focused.value || !containerRef.value) {
          return
        }
        const defaultFocusEl = inputRef.value ?? containerRef.value
        if (selectedTag.value === null) {
          defaultFocusEl.focus()
        } else {
          const selectedTagElement = containerRef.value.querySelector(
            `[data-tag="${CSS.escape(selectedTag.value)}"]`,
          ) as HTMLElement | null
          if (selectedTagElement) {
            selectedTagElement.focus()
          } else {
            defaultFocusEl.focus()
          }
        }
      },
      { flush: "post" },
    )

    // Restore only after the controlled/uncontrolled list actually removes the
    // focused chip, without stealing focus from another control.
    watch(tags, () => {
      const pending = pendingRemovalFocus
      if (!pending || tags.value.has(pending.tag)) return
      pendingRemovalFocus = null
      const doc = pending.source.ownerDocument
      if (doc.activeElement !== doc.body && !pending.source.contains(doc.activeElement)) return
      ;(inputRef.value ?? containerRef.value)?.focus({ preventScroll: true })
    }, { flush: "post" })

    // A touch drag need not blur or emit mousedown. Cancel restoration only.
    let stopTrackingRemovalPointer: (() => void) | undefined
    onMounted(() => {
      const doc = containerRef.value?.ownerDocument
      if (!doc) return
      const cancelAfterPointer = (event: Event) => {
        if (pendingRemovalFocus && event.target instanceof Node && !pendingRemovalFocus.source.contains(event.target)) {
          pendingRemovalFocus = null
        }
      }
      doc.addEventListener("pointerdown", cancelAfterPointer, true)
      stopTrackingRemovalPointer = () => doc.removeEventListener("pointerdown", cancelAfterPointer, true)
    })
    onBeforeUnmount(() => stopTrackingRemovalPointer?.())

    // The field takes the width of its text (or hint) from the hidden copy beside it, in CSS (see the React source)

    const setTags = (newTags: Tag[]) => {
      emit("update:value", newTags)
      emit("change", newTags)
      if (!isControlled.value) {
        internalTags.value = newTags
      }
    }

    // Adds every value in one update: a paste of "a,b" must not compute
    // each addition from the same stale `tags` snapshot.
    const addTags = (tagValues: string[]) => {
      const next = new Map(tags.value)
      let changed = false
      for (const tagValue of tagValues) {
        if (props.maxTags && next.size >= props.maxTags) {
          break
        }
        const trimmed = tagValue.trim()
        if (!trimmed) {
          continue
        }
        if (next.has(trimmed)) {
          duplicateTags.value = new Set(duplicateTags.value).add(trimmed)
          setTimeout(() => {
            const remaining = new Set(duplicateTags.value)
            remaining.delete(trimmed)
            duplicateTags.value = remaining
          }, SHAKE_ANIMATION_DURATION_MS)
          continue
        }
        const validTag = props.validator?.(trimmed) ?? true
        next.set(trimmed, { value: trimmed, valid: validTag })
        changed = true
      }
      if (!changed) {
        return
      }
      setTags(Array.from(next.values()))
    }

    const addTag = (tagValue: string) => addTags([tagValue])

    const removeTag = (tag: string) => {
      if (props.disabled) {
        return
      }
      const source = containerRef.value?.querySelector<HTMLElement>(`[data-tag="${CSS.escape(tag)}"]`)
      if (source?.contains(source.ownerDocument.activeElement)) pendingRemovalFocus = { tag, source }
      const next = new Map(tags.value)
      next.delete(tag)
      setTags(Array.from(next.values()))
    }

    const selectPreviousTag = () => {
      if (tags.value.size === 0) {
        return
      }
      const tagList = Array.from(tags.value.keys())
      if (selectedTag.value === null) {
        selectedTag.value = tagList[tagList.length - 1]!
      } else {
        const prevIndex = tagList.indexOf(selectedTag.value)
        selectedTag.value = tagList[Math.max(0, prevIndex - 1)]!
      }
    }

    const selectNextTag = () => {
      if (selectedTag.value === null) {
        return
      }
      const tagList = Array.from(tags.value.keys())
      const index = tagList.indexOf(selectedTag.value) + 1
      selectedTag.value = index < tagList.length ? tagList[index]! : null
    }

    const isEmptyStartingSelection = () => {
      const input = inputRef.value
      if (!input) {
        return true
      }
      return input.selectionStart === 0 && input.selectionEnd === 0
    }

    const handleContainerBlur = () => {
      pendingRemovalFocus = null
      focused.value = false
      selectedTag.value = null
      // A disabled tag input keeps the pending text instead of committing it
      if (currentInput.value && !props.disabled) {
        addTag(currentInput.value)
        currentInput.value = ""
      }
    }

    const handleContainerKeyDown = (e: KeyboardEvent) => {
      // IME candidate navigation belongs to the input, including Safari's 229 key.
      if (e.isComposing || e.keyCode === 229) return
      // A tag can keep focus while the input turns disabled: no selecting or removing then
      if (props.disabled) {
        return
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (isEmptyStartingSelection()) {
          e.preventDefault()
          selectPreviousTag()
        }
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (selectedTag.value !== null) {
          e.preventDefault()
          selectNextTag()
        }
      } else if (e.key === "Backspace") {
        if (selectedTag.value !== null) {
          removeTag(selectedTag.value)
        } else if (isEmptyStartingSelection()) {
          selectPreviousTag()
        }
      }
    }

    const handleInputKeyDown = (e: KeyboardEvent) => {
      // Confirming an IME candidate must not commit or clear the pre-edit buffer.
      if (e.isComposing || e.keyCode === 229) return
      if (e.key === "Enter" || props.delimiters.includes(e.key)) {
        e.preventDefault()
        if (currentInput.value) {
          addTag(currentInput.value)
          currentInput.value = ""
        }
      } else if (e.key === "Tab") {
        if (currentInput.value) {
          e.preventDefault()
          addTag(currentInput.value)
          currentInput.value = ""
        }
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("Text") ?? ""
      let parts = [text]

      // Split by all delimiters
      for (const delimiter of props.delimiters) {
        const newParts: string[] = []
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

    const handleContainerMouseDown = (e: MouseEvent) => {
      // All clicks in the container focus the container
      focused.value = true

      // If the click is on a tag pill, the tag's click handler focuses it
      if (e.target && e.target instanceof Element && e.target.closest("[data-tag]")) {
        return
      }

      // Since we know we didn't click a tag, clear any selected tag
      selectedTag.value = null

      // If this click is outside of the input, prevent it from "stealing" focus from the input
      const input = inputRef.value
      if (e.target && e.target instanceof Element && input && !input.contains(e.target)) {
        e.preventDefault()

        const { left, right, top, bottom } = input.getBoundingClientRect()
        const { clientX, clientY } = e

        // If this is the first click, clear the selection. Otherwise, select the input contents
        if (e.detail === 1) {
          if (clientY < top || clientX < left) {
            // "Before" the input: top/left
            input.setSelectionRange(0, 0)
          } else if (clientY > bottom || clientX > right) {
            // "After" the input: bottom/right
            const length = input.value.length
            input.setSelectionRange(length, length)
          }
        } else {
          input.select()
        }
      }
    }

    const handleFocus = (e: FocusEvent) => {
      // If the focus is on a tag pill, the click handler for the tag handles it
      if (e.target && e.target instanceof Element && e.target.closest("[data-tag]")) {
        return
      }
      focused.value = true
      selectedTag.value = null
    }

    const handleBlur = (e: FocusEvent) => {
      // If there is no related target, don't remove focus (clicks inside the container)
      if (!e.relatedTarget || !(e.relatedTarget instanceof Node)) {
        return
      }
      // Don't clear focus if focus is only moved elsewhere within the container
      if (containerRef.value && containerRef.value.contains(e.relatedTarget)) {
        // If we just tabbed into the input, clear the selected tag
        if (inputRef.value && inputRef.value.contains(e.relatedTarget)) {
          selectedTag.value = null
        }
        return
      }
      handleContainerBlur()
    }

    // usehooks-ts' useOnClickOutside: mousedown outside the container
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const container = containerRef.value
      if (!container || !(e.target instanceof Node) || container.contains(e.target)) return
      handleContainerBlur()
    }
    onMounted(() => document.addEventListener("mousedown", handleDocumentMouseDown))
    onBeforeUnmount(() => {
      document.removeEventListener("mousedown", handleDocumentMouseDown)
    })

    // Focus on mount when requested, like React's initial `focused` state
    onMounted(() => {
      if (focused.value) void nextTick(() => (inputRef.value ?? containerRef.value)?.focus())
    })

    return () => [
      h(
        "div",
        {
          "class": s.Container,
          "ref": containerRef,
          "onKeydown": handleContainerKeyDown,
          "onMousedown": handleContainerMouseDown,
          "onFocusin": handleFocus,
          "onFocusout": handleBlur,
          "data-size": props.size,
          "data-variant": props.variant,
          "data-focused": focused.value ? "" : undefined,
          "data-empty": tags.value.size === 0 ? "" : undefined,
          "data-pill": props.pill ? "" : undefined,
          // At maxTags the input is gone, so the container becomes the tab stop;
          // arrow keys and Backspace then select and remove tags from here
          "tabindex": showInput.value || props.disabled ? -1 : 0,
          "style": toCssVariables({ "min-rows": String(props.rows) }),
          "data-disabled": props.disabled ? "" : undefined,
        },
        [
          h("div", { class: s.TagInput }, [
            ...Array.from(tags.value.values()).map((tag) =>
              h(
                "div",
                {
                  "key": tag.value,
                  "class": s.Tag,
                  "tabindex": -1,
                  "onClick": () => (selectedTag.value = tag.value),
                  "data-tag": tag.value,
                  "data-invalid": !tag.valid ? "" : undefined,
                  "data-duplicate": duplicateTags.value.has(tag.value) ? "" : undefined,
                },
                [
                  h("span", { class: "overflow-hidden text-ellipsis", title: tag.value }, [
                    h("span", { class: s.TagValue }, tag.value),
                  ]),
                  h(
                    "button",
                    {
                      "type": "button", "class": s.TagRemove, "disabled": props.disabled,
                      "onClick": (event: MouseEvent) => { event.stopPropagation(); removeTag(tag.value) },
                      "aria-label": `Remove ${tag.value}`,
                    },
                    [h(X)],
                  ),
                ],
              ),
            ),
            showInput.value
              ? h("div", { class: s.InputContainer }, [
                  // A hidden copy of the text gives the field its width
                  h("span", { class: s.InputMeasure, "aria-hidden": "true" }, currentInput.value || placeholderText.value || ""),
                  h("div", { class: s.InputWrapper }, [
                    h("input", {
                      id: props.id,
                      class: s.Input,
                      ref: inputRef,
                      value: currentInput.value,
                      onInput: (e: Event) => (currentInput.value = (e.target as HTMLInputElement).value),
                      onPaste: handlePaste,
                      onKeydown: handleInputKeyDown,
                      placeholder: placeholderText.value,
                      disabled: props.disabled,
                    }),
                  ]),
                ])
              : null,
          ]),
        ],
      ),
      // 0 means no limit, as for the input above: no counter
      props.maxTags
        ? h("div", { class: s.Limit }, [String(tags.value.size), h("span", { class: "mx-px" }, "/"), String(props.maxTags)])
        : null,
    ]
  },
})

export type TagInputProps = InstanceType<typeof TagInput>["$props"]
