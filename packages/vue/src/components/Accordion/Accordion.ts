import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  toRef,
  watch,
  withCtx,
  type InjectionKey,
  type PropType,
} from "vue"
import {
  AccordionHeader as RekaAccordionHeader,
  AccordionItem as RekaAccordionItem,
  AccordionRoot as RekaAccordionRoot,
  Presence,
  injectAccordionItemContext,
  injectCollapsibleRootContext,
  useDirection,
  useId,
} from "reka-ui"
import { ChevronDownMd } from "../Icon/index.js"
import s from "@plexui/styles/components/Accordion/Accordion.module.css"

// Vue port of packages/ui/src/components/Accordion/Accordion.tsx. React
// builds on Radix Accordion; this builds on Reka UI's (same anatomy) and
// renders the same DOM. Exports are flat (`Accordion`, `AccordionItem`,
// `AccordionTrigger`, `AccordionContent`) because runtime-compiled templates
// cannot resolve `Accordion.Item` from the `components` option.
//
// Reka's root, item and header parts are used as they are. The trigger,
// the content panel and the value state follow Radix where Reka differs:
// - value: single mode emits "" (not undefined) when the open item closes,
//   and only emits real changes. `value` + `update:value` mirror React's
//   `value` / `onValueChange` (`v-model:value`).
// - trigger: `aria-disabled` marks the open item of a non-collapsible
//   single accordion (Reka marks disabled items), and a `click` listener
//   that calls preventDefault() cancels the toggle (composeEventHandlers).
// - keyboard: Radix's roving focus on the root: Home/End go to the first and
//   last *enabled* trigger, arrows across the orientation are swallowed, and
//   the root's own `keydown` listener runs first and can cancel it.
// - content: Radix's CollapsibleContent (hidden-but-mounted when closed,
//   mount animation suppressed, exit animation kept via Presence) with the
//   `--radix-accordion-content-height` variable the shared CSS animates.

type AccordionType = "single" | "multiple"
type AccordionValue = string | string[]
type Orientation = "vertical" | "horizontal"

type AccordionContextValue = {
  orientation: () => Orientation
  /** Whether the open item may close (always true in multiple mode) */
  collapsible: () => boolean
  onItemOpen: (value: string) => void
  onItemClose: (value: string) => void
  /** Trigger buttons, for keyboard navigation (Radix's collection) */
  triggers: Set<HTMLButtonElement>
}

const AccordionContextKey: InjectionKey<AccordionContextValue> = Symbol("PlexUIAccordion")

const useAccordionContext = () => {
  const context = inject(AccordionContextKey, null)
  if (!context) {
    throw new Error("Accordion parts must be used inside <Accordion>")
  }
  return context
}

const ACCORDION_KEYS = ["Home", "End", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]

// Calls a listener from `attrs` (a function or an array of them)
const invoke = (handler: unknown, event: Event) => {
  for (const fn of ([] as unknown[]).concat(handler ?? [])) {
    if (typeof fn === "function") fn(event)
  }
}

const getState = (open: boolean) => (open ? "open" : "closed")

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export const Accordion = defineComponent({
  name: "Accordion",
  inheritAttrs: false,
  props: {
    /** Whether one item or many can be open at a time */
    type: { type: String as PropType<AccordionType>, required: true },
    /** Controlled open item(s) (`v-model:value`): a string for `single`, an array for `multiple` */
    value: { type: [String, Array] as PropType<AccordionValue>, default: undefined },
    /** Open item(s) when uncontrolled */
    defaultValue: { type: [String, Array] as PropType<AccordionValue>, default: undefined },
    /** When `type="single"`, allow closing the open item. @default false */
    collapsible: { type: Boolean, default: false },
    /** Disable every item. @default false */
    disabled: { type: Boolean, default: undefined },
    /** Reading direction, for horizontal arrow keys. @default "ltr" */
    dir: String as PropType<"ltr" | "rtl">,
    /** Layout axis. @default "vertical" */
    orientation: { type: String as PropType<Orientation>, default: "vertical" },
  },
  emits: {
    "update:value": (_value: AccordionValue) => true,
  },
  setup(props, { attrs, slots, emit }) {
    const isMultiple = () => props.type === "multiple"
    const internalValue = ref<AccordionValue>(props.defaultValue ?? (isMultiple() ? [] : ""))
    const controlledValue = () => props.value
    const currentValue = computed(() => controlledValue() ?? internalValue.value)
    // React swaps the single and multiple implementations when `type`
    // changes: the accordion remounts from `defaultValue` (see the `key` below)
    watch(
      () => props.type,
      () => {
        internalValue.value = props.defaultValue ?? (isMultiple() ? [] : "")
      },
    )

    // Radix's useControllableState: report only real changes
    const setValue = (next: AccordionValue) => {
      const previous = currentValue.value
      if (controlledValue() === undefined) internalValue.value = next
      if (next !== previous) {
        emit("update:value", next)
      }
    }

    const asArray = (value: AccordionValue | undefined) => (Array.isArray(value) ? value : [])

    const triggers = new Set<HTMLButtonElement>()
    provide(AccordionContextKey, {
      orientation: () => props.orientation,
      collapsible: () => isMultiple() || props.collapsible,
      onItemOpen: (itemValue) => setValue(isMultiple() ? [...asArray(currentValue.value), itemValue] : itemValue),
      onItemClose: (itemValue) => {
        if (isMultiple()) setValue(asArray(currentValue.value).filter((value) => value !== itemValue))
        else if (props.collapsible) setValue("")
      },
      triggers,
    })

    const direction = useDirection(toRef(props, "dir"))

    // Radix's AccordionImpl key handling, on the root like in React
    const handleKeyDown = (event: KeyboardEvent) => {
      invoke(attrs.onKeydown, event)
      if (event.defaultPrevented) return
      if (!ACCORDION_KEYS.includes(event.key)) return
      const target = event.target as HTMLElement
      const triggerCollection = Array.from(triggers)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .filter((trigger) => !trigger.disabled)
      const triggerIndex = triggerCollection.findIndex((trigger) => trigger === target)
      const triggerCount = triggerCollection.length

      if (triggerIndex === -1) return

      // Prevents page scroll while user is navigating
      event.preventDefault()

      let nextIndex = triggerIndex
      const homeIndex = 0
      const endIndex = triggerCount - 1
      const isDirectionLTR = direction.value === "ltr"
      const { orientation } = props

      const moveNext = () => {
        nextIndex = triggerIndex + 1
        if (nextIndex > endIndex) {
          nextIndex = homeIndex
        }
      }

      const movePrev = () => {
        nextIndex = triggerIndex - 1
        if (nextIndex < homeIndex) {
          nextIndex = endIndex
        }
      }

      switch (event.key) {
        case "Home":
          nextIndex = homeIndex
          break
        case "End":
          nextIndex = endIndex
          break
        case "ArrowRight":
          if (orientation === "horizontal") {
            if (isDirectionLTR) {
              moveNext()
            } else {
              movePrev()
            }
          }
          break
        case "ArrowDown":
          if (orientation === "vertical") {
            moveNext()
          }
          break
        case "ArrowLeft":
          if (orientation === "horizontal") {
            if (isDirectionLTR) {
              movePrev()
            } else {
              moveNext()
            }
          }
          break
        case "ArrowUp":
          if (orientation === "vertical") {
            movePrev()
          }
          break
      }

      const clampedIndex = nextIndex % triggerCount
      triggerCollection[clampedIndex]?.focus()
    }

    return () => {
      const { class: className, onKeydown: _onKeydown, ...restAttrs } = attrs
      const value = currentValue.value
      return h(
        RekaAccordionRoot,
        {
          ...restAttrs,
          "key": props.type,
          "class": [s.Root, className],
          "type": props.type,
          // Reka reads the open item(s) from here; `null` is "none open" in
          // single mode (an empty string would open an item whose value is "")
          "modelValue": (isMultiple() ? asArray(value) : value || null) as AccordionValue,
          "collapsible": props.collapsible,
          "disabled": props.disabled,
          "dir": props.dir,
          "orientation": props.orientation,
          "data-orientation": props.orientation,
          // A disabled root drops the root's own keydown listener too, as in Radix
          "onKeydown": props.disabled ? undefined : handleKeyDown,
        },
        { default: () => slots.default?.() },
      )
    }
  },
})

/* ------------------------------------------------------------------ */
/*  Item                                                               */
/* ------------------------------------------------------------------ */

export const AccordionItem = defineComponent({
  name: "AccordionItem",
  props: {
    /** Unique identifier used by the root's `value` / `default-value` */
    value: { type: String, required: true },
    /** Disable this item. @default false */
    disabled: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    const context = useAccordionContext()
    // Other attributes (and `class`) fall through to the item <div>
    return () =>
      h(
        RekaAccordionItem,
        {
          "value": props.value,
          "disabled": props.disabled,
          "class": s.Item,
          // Reka reads the orientation once; keep it reactive
          "data-orientation": context.orientation(),
        },
        { default: () => slots.default?.() },
      )
  },
})

/* ------------------------------------------------------------------ */
/*  Trigger                                                            */
/* ------------------------------------------------------------------ */

/** The item's <h3> header and <button>. Attributes and listeners go to the button. */
export const AccordionTrigger = defineComponent({
  name: "AccordionTrigger",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const context = useAccordionContext()
    const itemContext = injectAccordionItemContext()
    const collapsibleContext = injectCollapsibleRootContext()
    // Set before the first render so aria-controls / aria-labelledby always
    // point at each other, like Radix's ids from the item
    itemContext.triggerId ||= useId(undefined, "reka-accordion-trigger")
    collapsibleContext.contentId ||= useId(undefined, "reka-collapsible-content")

    const buttonRef = ref<HTMLButtonElement | null>(null)
    onMounted(() => {
      if (buttonRef.value) context.triggers.add(buttonRef.value)
    })
    onBeforeUnmount(() => {
      if (buttonRef.value) context.triggers.delete(buttonRef.value)
    })

    const handleClick = (event: MouseEvent) => {
      // A disabled <button> never dispatches click in the browser, nor in React
      if (itemContext.disabled.value) return
      invoke(attrs.onClick, event)
      if (event.defaultPrevented) return
      const value = itemContext.value.value
      if (itemContext.open.value) context.onItemClose(value)
      else context.onItemOpen(value)
    }

    return () => {
      const { class: className, onClick: _onClick, ...restAttrs } = attrs
      const open = itemContext.open.value
      const disabled = itemContext.disabled.value
      return h(
        RekaAccordionHeader,
        { "class": s.Header, "data-orientation": context.orientation() },
        {
          default: () => [
            h(
              "button",
              {
                "type": "button",
                "aria-controls": collapsibleContext.contentId,
                "aria-expanded": open || false,
                "data-state": getState(open),
                "data-disabled": disabled ? "" : undefined,
                "disabled": disabled,
                "aria-disabled": (open && !context.collapsible()) || undefined,
                "data-orientation": context.orientation(),
                "id": itemContext.triggerId,
                ...restAttrs,
                "class": [s.Trigger, className],
                "ref": buttonRef,
                "onClick": handleClick,
              },
              [slots.default?.(), h(ChevronDownMd, { "class": s.Chevron, "aria-hidden": true })],
            ),
          ],
        },
      )
    }
  },
})

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

// Radix's CollapsibleContentImpl: measures the panel for the height
// variables, keeps it mounted (hidden, empty) while closed, and suppresses
// the open animation of an item that mounts open.
const AccordionContentImpl = defineComponent({
  name: "AccordionContentImpl",
  inheritAttrs: false,
  props: {
    present: { type: Boolean, required: true },
  },
  setup(props, { attrs, slots }) {
    const context = useAccordionContext()
    const itemContext = injectAccordionItemContext()
    const collapsibleContext = injectCollapsibleRootContext()

    const node = ref<HTMLDivElement | null>(null)
    const isPresent = ref(props.present)
    // Plain values, read on render like Radix's refs
    let height = 0
    let width = 0
    const isOpen = () => itemContext.open.value || isPresent.value
    let isMountAnimationPrevented = isOpen()
    let originalStyles: { transitionDuration: string; animationName: string } | undefined

    let frame: number | undefined
    onMounted(() => {
      frame = requestAnimationFrame(() => (isMountAnimationPrevented = false))
    })
    onBeforeUnmount(() => {
      if (frame !== undefined) cancelAnimationFrame(frame)
    })

    const measure = () => {
      const element = node.value
      if (!element) return
      originalStyles = originalStyles || {
        transitionDuration: element.style.transitionDuration,
        animationName: element.style.animationName,
      }
      // block any animations/transitions so the element renders at its full dimensions
      element.style.transitionDuration = "0s"
      element.style.animationName = "none"

      // get width and height from full dimensions
      const rect = element.getBoundingClientRect()
      height = rect.height
      width = rect.width

      // kick off any animations/transitions that were originally set up if it isn't the initial mount
      if (!isMountAnimationPrevented) {
        element.style.transitionDuration = originalStyles.transitionDuration
        element.style.animationName = originalStyles.animationName
      }

      isPresent.value = props.present
    }
    onMounted(measure)
    watch(() => [itemContext.open.value, props.present], measure, { flush: "post" })

    return () => {
      const { class: className, style, ...restAttrs } = attrs
      const open = itemContext.open.value
      const showContent = isOpen()
      return h(
        "div",
        {
          "data-state": getState(open),
          "data-disabled": itemContext.disabled.value ? "" : undefined,
          "id": collapsibleContext.contentId,
          "hidden": !showContent,
          "role": "region",
          "aria-labelledby": itemContext.triggerId,
          "data-orientation": context.orientation(),
          ...restAttrs,
          "class": [s.Content, className],
          "ref": node,
          "style": [
            {
              "--radix-collapsible-content-height": height ? `${height}px` : undefined,
              "--radix-collapsible-content-width": width ? `${width}px` : undefined,
              "--radix-accordion-content-height": "var(--radix-collapsible-content-height)",
              "--radix-accordion-content-width": "var(--radix-collapsible-content-width)",
            },
            style,
          ],
        },
        showContent ? [h("div", { class: s.ContentInner }, slots.default?.())] : undefined,
      )
    }
  },
})

/** The collapsible panel. Attributes go to the panel <div>. */
export const AccordionContent = defineComponent({
  name: "AccordionContent",
  inheritAttrs: false,
  props: {
    /** Keep the panel mounted and visible while closed (for custom CSS or JS animations) */
    forceMount: { type: Boolean, default: undefined },
  },
  setup(props, { attrs, slots }) {
    const itemContext = injectAccordionItemContext()
    const collapsibleContext = injectCollapsibleRootContext()
    collapsibleContext.contentId ||= useId(undefined, "reka-collapsible-content")
    itemContext.triggerId ||= useId(undefined, "reka-accordion-trigger")

    return () =>
      h(
        Presence,
        { present: !!props.forceMount || itemContext.open.value, forceMount: true },
        {
          // Presence calls its slot once during setup; withCtx marks it as a
          // render slot (returning an array, like compiled slots) so Vue does
          // not warn about that call
          default: withCtx(({ present }: { present: boolean }) => [
            h(AccordionContentImpl, { ...attrs, present }, { default: () => slots.default?.() }),
          ]),
        },
      )
  },
})
