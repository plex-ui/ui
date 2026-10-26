import {
  cloneVNode,
  computed,
  createCommentVNode,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type ComputedRef,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
} from "vue"
import {
  DialogContent as RekaDialogContent,
  DialogDescription as RekaDialogDescription,
  DialogOverlay as RekaDialogOverlay,
  DialogPortal as RekaDialogPortal,
  DialogRoot as RekaDialogRoot,
  DialogTitle as RekaDialogTitle,
  injectDialogRootContext,
  useForwardExpose,
  useId,
} from "reka-ui"
import { useEscCloseStack } from "../../composables/useEscCloseStack.js"
import { preventDefaultHandler, toCssVariables } from "../../lib/helpers.js"
import { dismissableSurfaces, useDeferredPointerDownOutside } from "../Popover/deferredPointerDownOutside.js"
import { firstElementChild } from "../Tooltip/slot.js"
import { TransitionGroup } from "../Transition/index.js"
import s from "@plexui/styles/components/Dialog/Dialog.module.css"

// Vue port of packages/ui/src/components/Dialog/Dialog.tsx on Reka UI
// (the Vue lineage of Radix, same anatomy). Exports are flat (`Dialog`,
// `DialogTrigger`, ...) because runtime-compiled templates cannot resolve
// `Dialog.Trigger` from the `components` option.
//
// Where Reka differs from Radix (radix-ui 1.8), the port follows Radix:
// - The content is labelled and described only while a DialogTitle /
//   DialogDescription is mounted.
// - A press outside (the overlay) closes it on the click that follows
//   (../Popover/deferredPointerDownOutside.ts); the overlay is a dismiss
//   surface.
// - The portal renders once mounted, so a closed dialog server-renders
//   nothing.

type DialogContextValue = {
  open: ComputedRef<boolean>
  setOpen: (nextState: boolean) => void
  /** Mounted DialogTitle / DialogDescription parts (Radix's title and description counts) */
  titleCount: Ref<number>
  descriptionCount: Ref<number>
}

const DialogContextKey: InjectionKey<DialogContextValue> = Symbol("PlexUIDialog")

const useDialogContext = () => {
  const context = inject(DialogContextKey, null)

  if (!context) {
    throw new Error("Dialog compound components must be used inside <Dialog>")
  }

  return context
}

/** Modal dialog root. Uncontrolled by default; bind `v-model:open` to control it. */
export const Dialog = defineComponent({
  name: "Dialog",
  props: {
    open: { type: Boolean, default: undefined },
  },
  emits: {
    "update:open": (_open: boolean) => true,
  },
  setup(props, { slots, emit }) {
    const internalOpen = ref(false)
    const isOpen = computed(() => props.open ?? internalOpen.value)

    const setOpen = (nextState: boolean) => {
      emit("update:open", nextState)
      internalOpen.value = nextState
    }

    provide(DialogContextKey, { open: isOpen, setOpen, titleCount: ref(0), descriptionCount: ref(0) })

    return () =>
      h(RekaDialogRoot, { "open": isOpen.value, "onUpdate:open": setOpen }, { default: () => slots.default?.() })
  },
})

// Trigger and Close render their child with the dialog wiring merged in,
// like Reka's `asChild` parts, but run the dialog action after the child's
// own click handlers and skip it when one called preventDefault() (Radix's
// composeEventHandlers). Reka's parts run first and cannot be cancelled.
// Attributes the child sets itself win, as with Radix and Reka slots. The
// child is the first element, also through a forwarded `<slot />`.
const withDialogProps = (
  child: VNode | undefined,
  props: Record<string, unknown>,
  onClick: (event: Event) => void,
  ref?: (el: unknown) => void,
) => {
  if (!child) return null
  const own = child.props ?? {}
  const extra = Object.fromEntries(Object.entries(props).filter(([key]) => !(key in own)))
  return cloneVNode(child, { ...extra, onClick, ...(ref ? { ref } : {}) }, true)
}

export const DialogTrigger = defineComponent({
  name: "DialogTrigger",
  setup(_props, { slots }) {
    const rootContext = injectDialogRootContext()
    const { forwardRef, currentElement } = useForwardExpose()
    rootContext.contentId ||= useId(undefined, "reka-dialog-content")
    // Focus returns here when the dialog closes
    onMounted(() => {
      rootContext.triggerElement.value = currentElement.value
    })

    const onClick = (event: Event) => {
      if (!event.defaultPrevented) rootContext.onOpenToggle()
    }

    return () => {
      const open = rootContext.open.value
      return withDialogProps(
        firstElementChild(slots.default?.()),
        {
          "type": "button",
          "aria-haspopup": "dialog",
          "aria-expanded": open || false,
          "aria-controls": open ? rootContext.contentId : undefined,
          "data-state": open ? "open" : "closed",
        },
        onClick,
        forwardRef as (el: unknown) => void,
      )
    }
  },
})

const CloseIcon = () =>
  h("svg", { "class": s.CloseIcon, "viewBox": "0 0 20 20", "width": "20", "height": "20", "aria-hidden": "true" }, [
    h("path", {
      fill: "currentColor",
      d: "M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06",
    }),
  ])

/** Overlay and panel. `class` lands on the panel, like `className` in React. */
export const DialogContent = defineComponent({
  name: "DialogContent",
  inheritAttrs: false,
  props: {
    /** Panel width; numbers are pixels. @default 480 */
    width: { type: [Number, String] as PropType<number | string>, default: 480 },
    /** Renders the close button in the top corner. @default true */
    showClose: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    const { open, setOpen, titleCount, descriptionCount } = useDialogContext()
    // Radix's root makes the content id; Reka's trigger does, so a dialog
    // without one would render `id=""`
    injectDialogRootContext().contentId ||= useId(undefined, "reka-dialog-content")

    // Escape goes through the shared stack, as in React, so the dialog
    // closes before overlays opened earlier (a forced-open Tooltip)
    useEscCloseStack(open, () => {
      setOpen(false)
    })

    // Radix's modal content: a Ctrl+click (macOS right click) does not dismiss
    const outsidePress = useDeferredPointerDownOutside((originalEvent) => {
      if (!originalEvent.ctrlKey) setOpen(false)
    })
    watch(open, (isOpen) => {
      if (!isOpen) outsidePress.reset()
    })

    let overlayElement: Element | undefined
    const setOverlayRef = (instance: unknown) => {
      const el = (instance as { $el?: unknown } | null)?.$el
      const element = el instanceof Element ? el : undefined
      if (element === overlayElement) return
      if (overlayElement) dismissableSurfaces.delete(overlayElement)
      overlayElement = element
      if (element) dismissableSurfaces.add(element)
    }

    const renderDialog = () =>
      h("div", { key: "dialog" }, [
        h(RekaDialogOverlay, { class: s.Overlay, ref: setOverlayRef }),
        h(
          RekaDialogContent,
          {
            "forceMount": true,
            "class": s.Content,
            "style": toCssVariables({ "dialog-width": props.width }),
            // Radix labels and describes the content only by mounted parts
            ...(titleCount.value > 0 ? {} : { "aria-labelledby": undefined }),
            ...(descriptionCount.value > 0 ? {} : { "aria-describedby": undefined }),
            "onEscapeKeyDown": preventDefaultHandler,
            "onPointerDownOutside": outsidePress.onPointerDownOutside,
            "onFocusOutside": outsidePress.onFocusOutside,
          },
          {
            default: () => [
              h("div", { class: [s.Panel, attrs.class] }, [
                props.showClose
                  ? h(DialogClose, null, {
                      default: () => [
                        h("button", { "type": "button", "class": s.CloseButton, "aria-label": "Close dialog" }, [
                          h(CloseIcon),
                        ]),
                      ],
                    })
                  : null,
                slots.default?.(),
              ]),
            ],
          },
        ),
      ])

    return () =>
      h(RekaDialogPortal, null, {
        default: () => [
          h(
            TransitionGroup,
            { class: s.Transition, enterDuration: 250, exitDuration: 150, disableAnimations: true },
            // `open && <div>` in React: closed still renders the empty wrapper
            { default: () => [open.value ? renderDialog() : createCommentVNode()] },
          ),
        ],
      })
  },
})

export const DialogHeader = defineComponent({
  name: "DialogHeader",
  setup(_props, { slots }) {
    return () => h("div", { class: s.Header }, slots.default?.())
  },
})

export const DialogFooter = defineComponent({
  name: "DialogFooter",
  setup(_props, { slots }) {
    return () => h("div", { class: s.Footer }, slots.default?.())
  },
})

/** Counts a mounted part, as Radix's title and description counts do. */
const useMountedCount = (count: Ref<number>) => {
  onMounted(() => {
    count.value++
  })
  onBeforeUnmount(() => {
    count.value--
  })
}

export const DialogTitle = defineComponent({
  name: "DialogTitle",
  setup(_props, { slots }) {
    useMountedCount(useDialogContext().titleCount)
    return () => h(RekaDialogTitle, { class: s.Title }, { default: () => slots.default?.() })
  },
})

export const DialogDescription = defineComponent({
  name: "DialogDescription",
  setup(_props, { slots }) {
    useMountedCount(useDialogContext().descriptionCount)
    return () => h(RekaDialogDescription, { class: s.Description }, { default: () => slots.default?.() })
  },
})

export const DialogClose = defineComponent({
  name: "DialogClose",
  setup(_props, { slots }) {
    const rootContext = injectDialogRootContext()
    const onClick = (event: Event) => {
      if (!event.defaultPrevented) rootContext.onOpenChange(false)
    }
    return () => withDialogProps(firstElementChild(slots.default?.()), { type: "button" }, onClick)
  },
})

export type DialogProps = InstanceType<typeof Dialog>["$props"]

/** DialogContent props; `class` lands on the panel, like `className` in React. */
export type DialogContentProps = InstanceType<typeof DialogContent>["$props"] & { class?: HTMLAttributes["class"] }
