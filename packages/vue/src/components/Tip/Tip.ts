import clsx from "clsx"
import {
  computed,
  createCommentVNode,
  defineComponent,
  h,
  inject,
  markRaw,
  onBeforeUnmount,
  provide,
  ref,
  watch,
  type InjectionKey,
  type PropType,
  type Slots,
  type VNodeArrayChildren,
  type VNodeChild,
} from "vue"
import {
  PopoverAnchor as RekaPopoverAnchor,
  PopoverArrow as RekaPopoverArrow,
  PopoverContent as RekaPopoverContent,
  PopoverPortal as RekaPopoverPortal,
  PopoverRoot as RekaPopoverRoot,
  useId,
} from "reka-ui"
import s from "@plexui/styles/components/Tip/Tip.module.css"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { preventDefaultHandler } from "../../lib/helpers.js"
import { hasContent } from "../../lib/slotContent.js"
import { Button } from "../Button/index.js"
import { X } from "../Icon/index.js"
import { useDeferredPointerDownOutside } from "../Popover/deferredPointerDownOutside.js"
import { TransitionGroup } from "../Transition/index.js"
import { overlayTiming } from "../Transition/shared.js"

/** The edge of an inline tip that points at what it explains. */
export type TipArrowEdge = "top" | "bottom" | "left" | "right"

type BodyOptions = {
  title?: string
  description?: string
  onClose?: () => void
  arrowEdge?: TipArrowEdge
  className?: unknown
  titleId: string
  descriptionId: string
  role?: string
}

// The tip itself, the same DOM as React's: the symbol, the title over the description, the actions, Close
const renderBody = (options: BodyOptions, slots: Slots) => {
  const title: VNodeChild = slots.title ? slots.title() : options.title
  const description: VNodeChild = slots.description ? slots.description() : options.description
  const icon = slots.icon?.()
  const actions = slots.actions?.()
  const hasDescription = hasContent([description as VNodeArrayChildren])
  return h(
    "div",
    {
      "class": clsx(s.Tip, options.className as string),
      "role": options.role,
      "aria-labelledby": options.role ? options.titleId : undefined,
      "data-arrow-edge": options.arrowEdge,
    },
    [
      hasContent(icon) ? h("div", { class: s.Icon }, icon) : null,
      h("div", { class: s.Message }, [
        h("div", { class: s.Title, id: options.titleId }, [title]),
        hasDescription ? h("div", { class: s.Description, id: options.descriptionId }, [description]) : null,
      ]),
      hasContent(actions) ? h("div", { class: s.Actions }, actions) : null,
      options.onClose
        ? h(
            Button,
            { "type": "button", "onClick": options.onClose, "color": "secondary", "variant": "soft", "uniform": true, "pill": true, "aria-label": "Close tip", "class": s.Close },
            { default: () => [h(X)] },
          )
        : null,
    ],
  )
}

// The ids that name and describe a popover tip
const TIP_POPOVER_LABELS: InjectionKey<() => { labelledBy: string, describedBy?: string }> = Symbol("TipPopoverLabels")

// The element Reka's content renders (`as`): Reka names its content after a trigger, and a tip has none, so the
// tip's title names it (and its description describes it) here. Raw: Reka passes `as` through reactive props.
const TipPopoverElement = markRaw(
  defineComponent({
    name: "TipPopoverElement",
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const labels = inject(TIP_POPOVER_LABELS)!
      return () => {
        const rest: Record<string, unknown> = { ...attrs }
        delete rest.dir
        delete rest.forceMount
        const { labelledBy, describedBy } = labels()
        return h("div", { ...rest, "aria-labelledby": labelledBy, "aria-describedby": describedBy }, slots.default?.())
      }
    },
  }),
)

const contentProps = {
  /** The tip's title: what the feature is (or the `title` slot). */
  title: String,
  /** One or two sentences on how to use it (or the `description` slot). */
  description: String,
}

const TipComponent = defineComponent({
  name: "Tip",
  inheritAttrs: false,
  props: {
    ...contentProps,
    /** Shows the Close button; called when it is clicked. */
    onClose: Function as PropType<() => void>,
    /** Draws an arrow at this edge, pointing at what the tip explains (TipKit's annotation). */
    arrowEdge: String as PropType<TipArrowEdge>,
  },
  setup(props, { slots, attrs }) {
    const id = useId(undefined, "plexui-tip")
    return () =>
      renderBody(
        {
          ...props,
          className: attrs.class,
          titleId: `${id}-title`,
          descriptionId: `${id}-description`,
          role: "note",
        },
        slots,
      )
  },
})

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

// What Tab can reach: no focus guards, nothing hidden (checkVisibility where the browser has it)
const tabbables = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.closest("[hidden], [inert], [data-radix-focus-guard], [data-reka-focus-guard]") &&
      (typeof element.checkVisibility !== "function" || element.checkVisibility({ visibilityProperty: true })),
  )

// The first element Tab reaches after the control, outside the tip
const nextAfter = (control: HTMLElement, tip: HTMLElement) =>
  tabbables(control.ownerDocument).find(
    (element) =>
      !tip.contains(element) &&
      !control.contains(element) &&
      !!(control.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
  )

// Takes the Tab only when the focus moved
const focusInstead = (event: KeyboardEvent, element: HTMLElement | undefined) => {
  if (!element) return
  element.focus()
  if (element.ownerDocument.activeElement === element) event.preventDefault()
}

// A popover tip renders at the end of the page, but Tab reaches it as if it sat right after its control: from the
// control (or its last control) Tab moves into the tip, and Shift+Tab from what follows the control moves to the
// tip's last control. Listened for on the document, after the control's own handlers.
const tabIntoTip = (event: KeyboardEvent, control: HTMLElement, tip: HTMLElement) => {
  if (event.key !== "Tab" || event.defaultPrevented || !(event.target instanceof Node) || tip.contains(event.target)) return
  const items = tabbables(tip)
  if (event.shiftKey) {
    if (event.target === nextAfter(control, tip)) focusInstead(event, items.at(-1))
  } else if (event.target === (tabbables(control).at(-1) ?? control)) {
    focusInstead(event, items[0])
  }
}

// Shift+Tab from the tip's first control returns to the control; Tab from its last moves on to what follows it
const tabOutOfTip = (event: KeyboardEvent, control: HTMLElement, tip: HTMLElement) => {
  if (event.key !== "Tab" || event.defaultPrevented) return
  const items = tabbables(tip)
  if (event.shiftKey) {
    if (event.target === items[0]) focusInstead(event, tabbables(control).at(-1) ?? (control.tabIndex >= 0 ? control : undefined))
  } else if (event.target === items.at(-1)) {
    focusInstead(event, nextAfter(control, tip))
  }
}

/**
 * A tip anchored to a control, after TipKit's popover tip. The default slot is the control; `icon`,
 * `title`, `description` and `actions` slots fill the tip. It does not take the focus. Bind `v-model:open`.
 */
export const TipPopover = defineComponent({
  name: "TipPopover",
  inheritAttrs: false,
  props: {
    ...contentProps,
    /** Shows the tip (controlled, `v-model:open`). */
    open: { type: Boolean, default: undefined },
    /** Shows the tip at first (uncontrolled). @default false */
    defaultOpen: { type: Boolean, default: false },
    /** The side of the control the tip shows on. Turned when it does not fit. @default "bottom" */
    side: { type: String as PropType<"top" | "right" | "bottom" | "left">, default: "bottom" },
    /** The alignment against the control. @default "center" */
    align: { type: String as PropType<"start" | "center" | "end">, default: "center" },
    /** The distance from the control to the arrow's point, in pixels. @default 4 */
    sideOffset: { type: Number, default: 4 },
    /** Shows the Close button. @default true */
    closeButton: { type: Boolean, default: true },
  },
  emits: {
    /** Close, Escape or a press outside closes the tip. */
    "update:open": (open: boolean) => typeof open === "boolean",
  },
  setup(props, { slots, attrs, emit }) {
    const uncontrolledOpen = ref(props.defaultOpen)
    const open = computed(() => props.open ?? uncontrolledOpen.value)
    const setOpen = (next: boolean) => {
      if (props.open === undefined) uncontrolledOpen.value = next
      emit("update:open", next)
    }
    const anchor = ref<{ $el?: Element } | null>(null)
    const tip = ref<{ $el?: Element } | null>(null)
    const id = useId(undefined, "plexui-tip")
    const titleId = `${id}-title`
    const descriptionId = `${id}-description`
    const control = () => (anchor.value?.$el instanceof HTMLElement ? anchor.value.$el : undefined)
    const tipElement = () => (tip.value?.$el instanceof HTMLElement ? tip.value.$el : undefined)
    // A press outside closes the tip on the click that completes it, as a Popover does; a press on the control
    // does not close it. The tip never takes the focus, so focus moving elsewhere does not close it either.
    const deferred = useDeferredPointerDownOutside(() => setOpen(false))
    const { reset } = deferred
    const onPointerDownOutside = (event: CustomEvent<{ originalEvent: PointerEvent }>) => {
      const target = event.detail.originalEvent.target
      if (target instanceof Node && control()?.contains(target)) {
        reset()
        event.preventDefault()
        return
      }
      deferred.onPointerDownOutside(event)
    }
    // Tab reaches the tip as if it sat right after the control: on the document, after the control's own handlers
    const onDocumentKeydown = (event: KeyboardEvent) => {
      const element = control()
      const content = tipElement()
      if (element && content) tabIntoTip(event, element, content)
    }
    let listening: Document | undefined
    const stopListening = () => {
      listening?.removeEventListener("keydown", onDocumentKeydown)
      listening = undefined
    }
    watch(open, (isOpen) => {
      stopListening()
      if (!isOpen || typeof document === "undefined") return
      listening = control()?.ownerDocument ?? document
      listening.addEventListener("keydown", onDocumentKeydown)
    }, { immediate: true, flush: "post" })
    onBeforeUnmount(stopListening)
    const onTipKeydown = (event: KeyboardEvent) => {
      const element = control()
      const content = tipElement()
      if (element && content) tabOutOfTip(event, element, content)
    }
    provide(TIP_POPOVER_LABELS, () => ({
      labelledBy: titleId,
      describedBy: props.description || slots.description ? descriptionId : undefined,
    }))
    watch(open, (isOpen) => { if (!isOpen) reset() })
    useEscCloseStack(open, () => setOpen(false))

    return () =>
      h(
        RekaPopoverRoot,
        { "open": open.value, "onUpdate:open": setOpen, "modal": false },
        {
          default: () => [
            h(RekaPopoverAnchor, { asChild: true, ref: anchor }, { default: () => slots.default?.() }),
            h(RekaPopoverPortal, null, {
              default: () => [
                h(
                  TransitionGroup,
                  { class: s.Transition, ...overlayTiming, overlay: true },
                  {
                    default: () => [
                      open.value
                        ? h(
                            RekaPopoverContent,
                            {
                              "key": "tip",
                              "ref": tip,
                              "forceMount": true,
                              "as": TipPopoverElement,
                              "class": clsx(s.Popover, attrs.class as string),
                              "side": props.side,
                              "align": props.align,
                              "sideOffset": props.sideOffset,
                              // The arrow stays clear of the tip's corners
                              "arrowPadding": 26,
                              "collisionPadding": 16,
                              "hideWhenDetached": true,
                              "onOpenAutoFocus": preventDefaultHandler,
                              "onCloseAutoFocus": preventDefaultHandler,
                              "onEscapeKeyDown": preventDefaultHandler,
                              onPointerDownOutside,
                              "onFocusOutside": preventDefaultHandler,
                              // Before Reka's focus scope, which would wrap Tab around inside the tip
                              "onKeydownCapture": onTipKeydown,
                            },
                            {
                              default: () => [
                                renderBody(
                                  {
                                    title: props.title,
                                    description: props.description,
                                    onClose: props.closeButton ? () => setOpen(false) : undefined,
                                    titleId,
                                    descriptionId,
                                  },
                                  slots,
                                ),
                                h(RekaPopoverArrow, { asChild: true, width: 47, height: 13 }, { default: () => h("span", { class: s.Arrow }) }),
                              ],
                            },
                          )
                        : createCommentVNode(),
                    ],
                  },
                ),
              ],
            }),
          ],
        },
      )
  },
})

/** A tip inside the page, after TipKit: a title, a description, an optional symbol, actions and Close. */
// Typed explicitly so the published declaration refers to the part instead of expanding it
export const Tip: typeof TipComponent & { Popover: typeof TipPopover } = Object.assign(TipComponent, {
  Popover: TipPopover,
})

export type TipProps = InstanceType<typeof TipComponent>["$props"]
export type TipPopoverProps = InstanceType<typeof TipPopover>["$props"]
